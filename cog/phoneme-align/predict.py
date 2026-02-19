"""
Phoneme-Align — Cog model for Replicate.

Unified CTC forced alignment using torchaudio + wav2vec2.
Returns word-level AND phoneme-level timestamps derived directly
from the audio signal — no Whisper, no heuristic distribution.

Three alignment modes (selected automatically by input):
  1. line_timestamps provided → per-line CTC alignment (BEST for singing)
     Constrains alignment to short audio windows from LRCLIB synced lines.
     Prevents cross-section confusion on repetitive lyrics.
  2. word_timestamps provided → phoneme-only within word boundaries (legacy)
  3. Neither → full-file CTC alignment (fallback)

Deploy:
  cog login
  cog push r8.im/diaquas/phoneme-align
"""

import json
import os
import sys
import tempfile

# Prevent OpenMP / TBB / BLAS thread-pool deadlocks in container environments.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import torch  # noqa: E402
import torchaudio  # noqa: E402
from cog import BasePredictor, Input, Path  # noqa: E402

# CMU Pronouncing Dictionary — maps lowercase words to ARPAbet.
CMU_DICT_URL = (
    "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict"
)


def _load_cmu_dict():
    """Load CMU dictionary from bundled file or download."""
    import urllib.request

    cmu_path = "/tmp/cmudict.dict"  # noqa: S108 — temp path in container
    if not os.path.exists(cmu_path):
        urllib.request.urlretrieve(CMU_DICT_URL, cmu_path)

    cmu = {}
    with open(cmu_path, encoding="latin-1") as f:
        for line in f:
            if line.startswith(";;;"):
                continue
            parts = line.strip().split(None, 1)
            if len(parts) == 2:
                word = parts[0].lower()
                # Skip variant pronunciations (e.g., "CLOSE(2)")
                if "(" in word:
                    continue
                phonemes = parts[1].strip().split()
                cmu[word] = phonemes
    return cmu


# Simple grapheme-to-phoneme fallback for words not in CMU dict.
G2P_RULES = {
    "tion": ["SH", "AH", "N"],
    "sion": ["ZH", "AH", "N"],
    "ight": ["AY", "T"],
    "ough": ["AO"],
    "ous": ["AH", "S"],
    "ing": ["IH", "NG"],
    "ck": ["K"],
    "sh": ["SH"],
    "ch": ["CH"],
    "th": ["TH"],
    "ph": ["F"],
    "wh": ["W"],
    "wr": ["R"],
    "kn": ["N"],
    "ng": ["NG"],
    "qu": ["K", "W"],
    "ee": ["IY"],
    "oo": ["UW"],
    "ea": ["IY"],
    "ou": ["AW"],
    "ow": ["OW"],
    "ai": ["EY"],
    "ay": ["EY"],
    "oi": ["OY"],
    "oy": ["OY"],
    "au": ["AO"],
    "aw": ["AO"],
}

G2P_SINGLE = {
    "a": ["AE"],
    "b": ["B"],
    "c": ["K"],
    "d": ["D"],
    "e": ["EH"],
    "f": ["F"],
    "g": ["G"],
    "h": ["HH"],
    "i": ["IH"],
    "j": ["JH"],
    "k": ["K"],
    "l": ["L"],
    "m": ["M"],
    "n": ["N"],
    "o": ["AA"],
    "p": ["P"],
    "q": ["K"],
    "r": ["R"],
    "s": ["S"],
    "t": ["T"],
    "u": ["AH"],
    "v": ["V"],
    "w": ["W"],
    "x": ["K", "S"],
    "y": ["Y"],
    "z": ["Z"],
}


def grapheme_to_phoneme(word):
    """Simple rule-based G2P fallback."""
    word = word.lower().strip()
    if len(word) > 2 and word.endswith("e") and word[-2] not in "aeiou":
        word = word[:-1]

    phonemes = []
    i = 0
    while i < len(word):
        matched = False
        for length in (4, 3, 2):
            chunk = word[i : i + length]
            if chunk in G2P_RULES:
                phonemes.extend(G2P_RULES[chunk])
                i += length
                matched = True
                break
        if not matched:
            ch = word[i]
            if ch in G2P_SINGLE:
                phonemes.extend(G2P_SINGLE[ch])
            i += 1
    return phonemes if phonemes else ["AH"]


def _strip_stress(phoneme):
    """Remove stress digits from ARPAbet token: AA1 → AA."""
    if phoneme and phoneme[-1] in "012":
        return phoneme[:-1]
    return phoneme


class Predictor(BasePredictor):
    def setup(self):
        """Load models on cold start — wav2vec2 + CMU dictionary."""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        bundle = torchaudio.pipelines.WAV2VEC2_ASR_LARGE_960H
        self.model = bundle.get_model().to(self.device)
        self.labels = bundle.get_labels()
        self.sample_rate = bundle.sample_rate  # 16000

        self.label_to_idx = {label: i for i, label in enumerate(self.labels)}

        self.cmu_dict = _load_cmu_dict()
        print(f"Loaded CMU dictionary: {len(self.cmu_dict)} entries", file=sys.stderr)

    def predict(
        self,
        audio_file: Path = Input(description="Audio file (.wav, .mp3, etc.)"),
        transcript: str = Input(
            description="Plain text lyrics/transcript to align"
        ),
        word_timestamps: str = Input(
            description=(
                "Optional JSON array of word-level timestamps from the word "
                "aligner. Each entry: "
                '{"word": "close", "start": 1.2, "end": 1.8}. '
                "When provided, phoneme alignment runs within each word's "
                "time window for maximum precision."
            ),
            default="",
        ),
        line_timestamps: str = Input(
            description=(
                "Optional JSON array of line-level timestamps from LRCLIB "
                "synced lyrics. Each entry: "
                '{"text": "like the words of a song", "startMs": 8450}. '
                "When provided, uses per-line CTC forced alignment for both "
                "word AND phoneme boundaries — no Whisper needed."
            ),
            default="",
        ),
    ) -> str:
        """Align transcript to audio, returning word + phoneme timestamps."""
        # Load and resample audio
        waveform, sr = torchaudio.load(str(audio_file))
        if sr != self.sample_rate:
            waveform = torchaudio.functional.resample(waveform, sr, self.sample_rate)
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        line_times = self._parse_line_timestamps(line_timestamps)
        word_times = self._parse_word_timestamps(word_timestamps)

        if line_times:
            # Preferred: per-line CTC → word + phoneme alignment
            print(f"Per-line CTC alignment: {len(line_times)} lines", file=sys.stderr)
            return self._align_by_lines(waveform, line_times)
        elif word_times:
            # Legacy: phoneme alignment within pre-established word boundaries
            print(f"Word-boundary alignment: {len(word_times)} words", file=sys.stderr)
            return self._align_with_word_boundaries(waveform, word_times)
        else:
            # Fallback: full-file CTC word + phoneme alignment
            print("Full-file CTC alignment", file=sys.stderr)
            return self._align_full_ctc(waveform, transcript)

    # ── Per-line CTC alignment (preferred path) ──────────────────────

    def _align_by_lines(self, waveform, line_times):
        """Per-line CTC forced alignment for word + phoneme boundaries.

        Uses LRCLIB synced line timestamps to constrain CTC alignment to
        short audio windows. Each line is aligned independently so the
        model can't confuse repeated phrases across chorus/verse repetitions.

        One wav2vec2 forward pass on the full audio, then lightweight
        Viterbi decoding per line and per word.
        """
        audio_duration_s = waveform.shape[1] / self.sample_rate

        # Single forward pass on full audio
        with torch.inference_mode():
            full_emissions, _ = self.model(waveform.to(self.device))
            full_emissions = torch.log_softmax(full_emissions, dim=-1)
        full_emission = full_emissions[0].cpu()  # (T, C)
        total_frames = full_emission.shape[0]
        frame_duration_s = audio_duration_s / total_frames

        print(
            f"Audio: {audio_duration_s:.1f}s, {total_frames} frames, "
            f"{frame_duration_s*1000:.1f}ms/frame",
            file=sys.stderr,
        )

        results = []

        for i, line in enumerate(line_times):
            text = line["text"].strip()
            if not text:
                continue

            line_start_s = line["startMs"] / 1000

            # Line end: next line's start, or +10s, or audio end
            if i + 1 < len(line_times):
                line_end_s = line_times[i + 1]["startMs"] / 1000
            else:
                line_end_s = min(line_start_s + 10.0, audio_duration_s)

            # Pad the window so edge words aren't clipped by LRCLIB rounding
            PADDING_S = 0.5
            win_start_s = max(0, line_start_s - PADDING_S)
            win_end_s = min(audio_duration_s, line_end_s + PADDING_S)

            # Convert to frame indices
            start_frame = max(0, int(win_start_s / frame_duration_s))
            end_frame = min(total_frames, int(win_end_s / frame_duration_s))

            if end_frame <= start_frame + 2:
                continue

            # Slice emissions for this line's audio window
            line_emission = full_emission[start_frame:end_frame]
            line_frames = line_emission.shape[0]
            line_frame_dur = (win_end_s - win_start_s) / line_frames

            # CTC-align the line text to get word boundaries
            words_text = text.split()
            if not words_text:
                continue

            word_spans = self._ctc_align_words(
                line_emission, text, win_start_s, line_frame_dur
            )

            if not word_spans:
                # Fallback: distribute words evenly
                n = len(words_text)
                dur = win_end_s - win_start_s
                word_spans = [
                    (w, win_start_s + (j / n) * dur, win_start_s + ((j + 1) / n) * dur)
                    for j, w in enumerate(words_text)
                ]

            # For each word, do phoneme-level CTC alignment using pre-computed emissions
            for word_text, word_start_s, word_end_s in word_spans:
                ws_frame = max(start_frame, int(word_start_s / frame_duration_s))
                we_frame = min(end_frame, int(word_end_s / frame_duration_s))

                phonemes_arpabet = self._lookup_phonemes(word_text)

                if we_frame <= ws_frame + 1 or not phonemes_arpabet:
                    phoneme_timings = self._distribute_evenly(
                        phonemes_arpabet, word_start_s, word_end_s
                    )
                else:
                    word_emission = full_emission[ws_frame:we_frame]
                    word_frames = word_emission.shape[0]
                    word_frame_dur = (word_end_s - word_start_s) / word_frames

                    phoneme_timings = self._align_phonemes_with_emissions(
                        word_emission, phonemes_arpabet,
                        word_start_s, word_frame_dur, word_end_s
                    )

                results.append({
                    "word": word_text,
                    "start": round(word_start_s, 4),
                    "end": round(word_end_s, 4),
                    "phonemes": phoneme_timings,
                })

        print(f"Aligned {len(results)} words across {len(line_times)} lines", file=sys.stderr)
        return json.dumps({"words": results})

    def _ctc_align_words(self, emission, text, offset_s, frame_duration_s):
        """CTC-align text to emission frames and return word spans.

        Uses torchaudio.functional.forced_align with | as word boundary
        tokens. Returns list of (word_text, start_s, end_s) tuples.
        Words are made contiguous: each extends to the next word's start.
        """
        num_frames = emission.shape[0]
        duration_s = num_frames * frame_duration_s

        words = text.strip().split()
        if not words:
            return []

        # Build CTC token sequence: WORD|WORD|WORD
        ctc_text = "|".join(w.upper() for w in words)
        tokens = []
        token_chars = []
        for ch in ctc_text:
            if ch in self.label_to_idx:
                tokens.append(self.label_to_idx[ch])
                token_chars.append(ch)

        if not tokens or num_frames < len(tokens):
            return []

        try:
            token_indices = torch.tensor([tokens], dtype=torch.int32)
            aligned_tokens, scores = torchaudio.functional.forced_align(
                emission.unsqueeze(0), token_indices, blank=0
            )
            aligned_tokens = aligned_tokens[0]

            # Standard CTC decode: track first/last frame for each token position
            token_frames = {}  # token_cursor → (first_frame, last_frame)
            prev_token = 0
            token_cursor = -1
            for frame_idx, token_val in enumerate(aligned_tokens):
                tv = token_val.item()
                if tv != 0:
                    if prev_token == 0 or tv != prev_token:
                        token_cursor += 1
                    if token_cursor not in token_frames:
                        token_frames[token_cursor] = [frame_idx, frame_idx]
                    else:
                        token_frames[token_cursor][1] = frame_idx
                prev_token = tv

            # Group tokens into words by splitting at | boundaries
            word_spans = []
            token_idx = 0

            for word in words:
                word_first_frame = None
                word_last_frame = None

                for ch in word.upper():
                    if ch in self.label_to_idx:
                        if token_idx in token_frames:
                            ff, lf = token_frames[token_idx]
                            if word_first_frame is None:
                                word_first_frame = ff
                            word_last_frame = lf
                        token_idx += 1

                # Skip the | separator token
                if token_idx < len(token_chars) and token_chars[token_idx] == "|":
                    token_idx += 1

                if word_first_frame is not None:
                    ws = offset_s + word_first_frame * frame_duration_s
                    we = offset_s + (word_last_frame + 1) * frame_duration_s
                    word_spans.append((word, ws, we))

            # Make contiguous: each word extends to the next word's start,
            # last word extends to the end of the audio window
            if len(word_spans) > 1:
                contiguous = []
                for j in range(len(word_spans) - 1):
                    w, ws, _ = word_spans[j]
                    _, nws, _ = word_spans[j + 1]
                    contiguous.append((w, ws, nws))
                w, ws, _ = word_spans[-1]
                contiguous.append((w, ws, offset_s + duration_s))
                word_spans = contiguous
            elif len(word_spans) == 1:
                w, ws, _ = word_spans[0]
                word_spans = [(w, ws, offset_s + duration_s)]

            return word_spans

        except Exception as e:
            print(f"CTC word alignment failed for '{text[:50]}': {e}", file=sys.stderr)
            return []

    def _align_phonemes_with_emissions(
        self, emission, phonemes_arpabet, offset_s, frame_duration_s, word_end_s
    ):
        """CTC-align phonemes using pre-computed emissions for a word window.

        Same algorithm as _align_phonemes_in_window but skips the expensive
        wav2vec2 forward pass — uses sliced emissions from the full-audio pass.
        """
        num_frames = emission.shape[0]

        if not phonemes_arpabet or num_frames < len(phonemes_arpabet):
            return self._distribute_evenly(phonemes_arpabet, offset_s, word_end_s)

        tokens, token_to_phoneme = self._phonemes_to_ctc_tokens(phonemes_arpabet)
        if not tokens:
            return self._distribute_evenly(phonemes_arpabet, offset_s, word_end_s)

        try:
            token_indices = torch.tensor([tokens], dtype=torch.int32)
            aligned_tokens, scores = torchaudio.functional.forced_align(
                emission.unsqueeze(0), token_indices, blank=0
            )
            aligned_tokens = aligned_tokens[0]

            phoneme_boundaries = self._frames_to_phoneme_boundaries(
                aligned_tokens, token_to_phoneme, len(phonemes_arpabet),
                frame_duration_s, offset_s, word_end_s
            )

            results = []
            for i, phoneme in enumerate(phonemes_arpabet):
                clean = _strip_stress(phoneme)
                if i < len(phoneme_boundaries):
                    start_s, end_s = phoneme_boundaries[i]
                else:
                    start_s = offset_s
                    end_s = word_end_s
                results.append({
                    "phoneme": clean,
                    "start": round(start_s, 4),
                    "end": round(end_s, 4),
                })
            return results

        except Exception as e:
            print(f"CTC phoneme alignment failed: {e}", file=sys.stderr)
            return self._distribute_evenly(phonemes_arpabet, offset_s, word_end_s)

    # ── Full-file CTC alignment (no line timestamps) ─────────────────

    def _align_full_ctc(self, waveform, transcript):
        """Full-file CTC word + phoneme alignment without line boundaries.

        Runs one forward pass, aligns the entire transcript to the audio,
        then does per-word phoneme alignment using the same emissions.
        Better than Whisper (can't hallucinate) but less precise than
        per-line alignment for repetitive lyrics.
        """
        audio_duration_s = waveform.shape[1] / self.sample_rate

        with torch.inference_mode():
            full_emissions, _ = self.model(waveform.to(self.device))
            full_emissions = torch.log_softmax(full_emissions, dim=-1)
        full_emission = full_emissions[0].cpu()
        total_frames = full_emission.shape[0]
        frame_duration_s = audio_duration_s / total_frames

        # CTC-align the full transcript to get word boundaries
        word_spans = self._ctc_align_words(
            full_emission, transcript, 0.0, frame_duration_s
        )

        if not word_spans:
            return json.dumps({"words": [], "error": "CTC alignment failed"})

        # For each word, do phoneme-level CTC alignment
        results = []
        for word_text, word_start_s, word_end_s in word_spans:
            ws_frame = max(0, int(word_start_s / frame_duration_s))
            we_frame = min(total_frames, int(word_end_s / frame_duration_s))

            phonemes_arpabet = self._lookup_phonemes(word_text)

            if we_frame <= ws_frame + 1 or not phonemes_arpabet:
                phoneme_timings = self._distribute_evenly(
                    phonemes_arpabet, word_start_s, word_end_s
                )
            else:
                word_emission = full_emission[ws_frame:we_frame]
                word_frames = word_emission.shape[0]
                word_frame_dur = (word_end_s - word_start_s) / word_frames

                phoneme_timings = self._align_phonemes_with_emissions(
                    word_emission, phonemes_arpabet,
                    word_start_s, word_frame_dur, word_end_s
                )

            results.append({
                "word": word_text,
                "start": round(word_start_s, 4),
                "end": round(word_end_s, 4),
                "phonemes": phoneme_timings,
            })

        print(f"Full-file aligned {len(results)} words", file=sys.stderr)
        return json.dumps({"words": results})

    # ── Legacy: phoneme alignment within word boundaries ──────────────

    def _align_with_word_boundaries(self, waveform, word_times):
        """Align phonemes within pre-established word boundaries.

        Legacy path: word boundaries come from an external aligner (Whisper).
        Kept for backward compatibility.
        """
        results = []

        for wt in word_times:
            word_text = wt["word"]
            word_start_s = wt["start"]
            word_end_s = wt["end"]

            start_sample = int(word_start_s * self.sample_rate)
            end_sample = min(
                int(word_end_s * self.sample_rate), waveform.shape[1]
            )

            if end_sample <= start_sample:
                continue

            word_waveform = waveform[:, start_sample:end_sample]
            phonemes_arpabet = self._lookup_phonemes(word_text)

            phoneme_timings = self._align_phonemes_in_window(
                word_waveform, phonemes_arpabet, word_start_s
            )

            results.append({
                "word": word_text,
                "start": round(word_start_s, 4),
                "end": round(word_end_s, 4),
                "phonemes": phoneme_timings,
            })

        return json.dumps({"words": results})

    def _align_phonemes_in_window(self, waveform, phonemes_arpabet, offset_s):
        """CTC-align phonemes within a word's audio window (separate forward pass)."""
        duration_s = waveform.shape[1] / self.sample_rate
        word_end_s = offset_s + duration_s

        if not phonemes_arpabet or waveform.shape[1] < 400:
            return self._distribute_evenly(phonemes_arpabet, offset_s, word_end_s)

        with torch.inference_mode():
            emissions, _ = self.model(waveform.to(self.device))
            emissions = torch.log_softmax(emissions, dim=-1)

        emission = emissions[0].cpu()
        num_frames = emission.shape[0]

        if num_frames < len(phonemes_arpabet):
            return self._distribute_evenly(phonemes_arpabet, offset_s, word_end_s)

        tokens, token_to_phoneme = self._phonemes_to_ctc_tokens(phonemes_arpabet)
        if not tokens:
            return self._distribute_evenly(phonemes_arpabet, offset_s, word_end_s)

        try:
            token_indices = torch.tensor([tokens], dtype=torch.int32)
            aligned_tokens, scores = torchaudio.functional.forced_align(
                emission.unsqueeze(0), token_indices, blank=0
            )
            aligned_tokens = aligned_tokens[0]

            frame_duration_s = duration_s / num_frames
            phoneme_boundaries = self._frames_to_phoneme_boundaries(
                aligned_tokens, token_to_phoneme, len(phonemes_arpabet),
                frame_duration_s, offset_s, word_end_s
            )

            results = []
            for i, phoneme in enumerate(phonemes_arpabet):
                clean = _strip_stress(phoneme)
                if i < len(phoneme_boundaries):
                    start_s, end_s = phoneme_boundaries[i]
                else:
                    start_s = offset_s
                    end_s = word_end_s
                results.append({
                    "phoneme": clean,
                    "start": round(start_s, 4),
                    "end": round(end_s, 4),
                })
            return results

        except Exception as e:
            print(f"CTC alignment failed: {e}", file=sys.stderr)
            return self._distribute_evenly(phonemes_arpabet, offset_s, word_end_s)

    # ── Shared helpers ────────────────────────────────────────────────

    def _phonemes_to_ctc_tokens(self, phonemes_arpabet):
        """Map ARPAbet phonemes to CTC label indices."""
        arpabet_to_chars = {
            "AA": "A", "AE": "A", "AH": "A", "AO": "O", "AW": "A",
            "AY": "I", "B": "B", "CH": "C", "D": "D", "DH": "D",
            "EH": "E", "ER": "R", "EY": "A", "F": "F", "G": "G",
            "HH": "H", "IH": "I", "IY": "E", "JH": "J", "K": "K",
            "L": "L", "M": "M", "N": "N", "NG": "N", "OW": "O",
            "OY": "O", "P": "P", "R": "R", "S": "S", "SH": "S",
            "T": "T", "TH": "T", "UH": "U", "UW": "U", "V": "V",
            "W": "W", "WH": "W", "Y": "Y", "Z": "Z", "ZH": "Z",
        }

        tokens = []
        token_to_phoneme = []

        for i, phoneme in enumerate(phonemes_arpabet):
            clean = _strip_stress(phoneme)
            chars = arpabet_to_chars.get(clean, clean[0] if clean else "A")
            for ch in chars:
                if ch.upper() in self.label_to_idx:
                    tokens.append(self.label_to_idx[ch.upper()])
                    token_to_phoneme.append(i)

        return tokens, token_to_phoneme

    def _frames_to_phoneme_boundaries(
        self, aligned_tokens, token_to_phoneme, num_phonemes,
        frame_duration_s, offset_s, word_end_s
    ):
        """Convert frame-level CTC alignment to contiguous phoneme boundaries."""
        phoneme_frames = [[] for _ in range(num_phonemes)]

        prev_token = 0
        token_cursor = -1
        for frame_idx, token_val in enumerate(aligned_tokens):
            tv = token_val.item()
            if tv != 0:
                if prev_token == 0 or tv != prev_token:
                    token_cursor += 1
                if 0 <= token_cursor < len(token_to_phoneme):
                    phoneme_idx = token_to_phoneme[token_cursor]
                    if phoneme_idx < num_phonemes:
                        phoneme_frames[phoneme_idx].append(frame_idx)
            prev_token = tv

        starts = []
        for i in range(num_phonemes):
            if phoneme_frames[i]:
                starts.append(offset_s + phoneme_frames[i][0] * frame_duration_s)
            elif starts:
                starts.append(starts[-1])
            else:
                starts.append(offset_s)

        boundaries = []
        for i in range(num_phonemes):
            start_s = starts[i]
            end_s = starts[i + 1] if i + 1 < num_phonemes else word_end_s
            end_s = max(end_s, start_s + 0.005)
            if boundaries:
                start_s = max(start_s, boundaries[-1][1])
                end_s = max(end_s, start_s + 0.005)
            boundaries.append((start_s, end_s))

        return boundaries

    def _distribute_evenly(self, phonemes_arpabet, start_s, end_s):
        """Evenly distribute phonemes across a time range (last resort)."""
        if not phonemes_arpabet:
            return []

        duration = end_s - start_s
        n = len(phonemes_arpabet)
        step = duration / n

        results = []
        for i, phoneme in enumerate(phonemes_arpabet):
            clean = _strip_stress(phoneme)
            results.append({
                "phoneme": clean,
                "start": round(start_s + i * step, 4),
                "end": round(start_s + (i + 1) * step, 4),
            })
        return results

    def _lookup_phonemes(self, word):
        """Look up ARPAbet phonemes for a word."""
        clean = word.lower().strip(".,!?;:'\"()-")
        if clean in self.cmu_dict:
            return self.cmu_dict[clean]
        return grapheme_to_phoneme(clean)

    @staticmethod
    def _parse_word_timestamps(word_timestamps_json):
        """Parse word timestamps JSON input."""
        if not word_timestamps_json or not word_timestamps_json.strip():
            return None
        try:
            data = json.loads(word_timestamps_json)
        except (json.JSONDecodeError, TypeError):
            return None
        if not isinstance(data, list) or len(data) == 0:
            return None
        valid = []
        for entry in data:
            if (
                isinstance(entry, dict)
                and "word" in entry
                and "start" in entry
                and "end" in entry
            ):
                valid.append(entry)
        return valid if valid else None

    @staticmethod
    def _parse_line_timestamps(line_timestamps_json):
        """Parse line timestamps JSON input (LRCLIB synced lines)."""
        if not line_timestamps_json or not line_timestamps_json.strip():
            return None
        try:
            data = json.loads(line_timestamps_json)
        except (json.JSONDecodeError, TypeError):
            return None
        if not isinstance(data, list) or len(data) == 0:
            return None
        valid = []
        for entry in data:
            if (
                isinstance(entry, dict)
                and "text" in entry
                and "startMs" in entry
                and entry["text"].strip()
            ):
                valid.append(entry)
        return valid if valid else None
