"""
Phoneme-Align — Cog model for Replicate.

Unified CTC forced alignment using torchaudio + MMS (Massively
Multilingual Speech).  MMS_FA replaces wav2vec2-large-960h for
~40 % lower word-boundary error on speech benchmarks (89 ms → 53 ms)
and better robustness on singing vocals thanks to 23 k hours of
multilingual training data.

Returns word-level AND phoneme-level timestamps derived directly
from the audio signal — no Whisper, no heuristic distribution.

Alignment modes:
  1. Full-file CTC alignment (DEFAULT, best for singing)
     Aligns the entire transcript against the full audio in one pass.
     Lets CTC place word boundaries naturally without per-line
     compression artifacts.
  2. Per-line CTC alignment (opt-in via per_line_mode=True)
     Constrains CTC to LRCLIB line windows.  Can cause timing
     compression when a held note absorbs an entire window.
  3. word_timestamps provided → phoneme-only within word boundaries (legacy)

Deploy:
  cog login
  cog push r8.im/diaquas/phoneme-align
"""

import json
import os
import sys

# Prevent OpenMP / TBB / BLAS thread-pool deadlocks in container environments.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import numpy as np  # noqa: E402
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

    cmu_path = "/opt/cmudict.dict"  # Persistent path — survives tmpfs on /tmp
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


# ARPAbet → CTC character mapping (class-level constant, built once at import).
#
# MMS_FA predicts lowercase romanised characters (a-z, '), not phonemes.
# Multi-character mappings give CTC more tokens to align, which improves
# boundary accuracy — especially for diphthongs and vowels that were
# previously collapsed into single ambiguous characters.
#
# The values here are UPPERCASE by convention; they are lowercased at
# lookup time in _phonemes_to_ctc_tokens() to match the MMS label set.
#
# Principles:
#   - Diphthongs → 2 characters matching common English spellings
#     (AY→"AY" matches "bye/my", AW→"OW" matches "cow/how")
#   - Disambiguate collapsed vowels (AA/AE/AH were all "A")
#   - Consonants with good 1:1 character match stay single-char
ARPABET_TO_CHARS = {
    # Vowels — disambiguated and diphthongs expanded
    "AA": "O",      # /ɑ/ "father" — open back, closer to O acoustically
    "AE": "A",      # /æ/ "cat" — best 1:1 match for CTC "A"
    "AH": "U",      # /ʌ/ "but" — centralized vowel, U-like
    "AO": "O",      # /ɔ/ "caught" — round, O is correct
    "AW": "OW",     # /aʊ/ "cow" — diphthong needs 2 chars
    "AY": "AY",     # /aɪ/ "my/bye" — diphthong, 2 chars
    "EH": "E",      # /ɛ/ "bed" — correct 1:1
    "ER": "ER",     # /ɝ/ "bird" — 2 chars, matches spelling
    "EY": "AY",     # /eɪ/ "day" — diphthong similar to AY
    "IH": "I",      # /ɪ/ "bit" — correct 1:1
    "IY": "EE",     # /i/ "beat" — 2 chars, matches "ee" spelling
    "OW": "OE",     # /oʊ/ "go" — 2 chars, diphthong
    "OY": "OY",     # /ɔɪ/ "boy" — diphthong, 2 chars
    "UH": "U",      # /ʊ/ "could" — correct 1:1
    "UW": "OO",     # /u/ "boot" — 2 chars, matches "oo" spelling
    # Consonants — mostly 1:1 (already good matches)
    "B": "B", "CH": "CH", "D": "D", "DH": "TH",
    "F": "F", "G": "G", "HH": "H", "JH": "J", "K": "K",
    "L": "L", "M": "M", "N": "N", "NG": "NG",
    "P": "P", "R": "R", "S": "S", "SH": "SH",
    "T": "T", "TH": "TH", "V": "V",
    "W": "W", "WH": "WH", "Y": "Y", "Z": "Z", "ZH": "SH",
}

# Set of vowel phonemes for duration sanity checks.
_VOWELS = {
    "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY",
    "IH", "IY", "OW", "OY", "UH", "UW",
}


class Predictor(BasePredictor):
    def setup(self):
        """Load models on cold start — MMS forced-alignment + CMU dictionary."""
        print("phoneme-align setup: starting", file=sys.stderr)

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"phoneme-align setup: device={self.device}", file=sys.stderr)

        try:
            bundle = torchaudio.pipelines.MMS_FA
            self.model = bundle.get_model().to(self.device)
            self.labels = bundle.get_labels()  # includes * (star) token
            self.sample_rate = bundle.sample_rate  # 16000
            self.label_to_idx = {label: i for i, label in enumerate(self.labels)}
            print(f"phoneme-align setup: MMS_FA loaded ({len(self.labels)} labels)", file=sys.stderr)
        except Exception as e:
            print(f"phoneme-align setup: FAILED loading MMS_FA: {e}", file=sys.stderr)
            raise

        try:
            self.cmu_dict = _load_cmu_dict()
            print(f"phoneme-align setup: CMU dictionary loaded ({len(self.cmu_dict)} entries)", file=sys.stderr)
        except Exception as e:
            print(f"phoneme-align setup: FAILED loading CMU dict: {e}", file=sys.stderr)
            raise

        print("phoneme-align setup: complete", file=sys.stderr)

    def predict(
        self,
        audio_file: Path = Input(description="Audio file (.wav, .mp3, etc.)"),
        transcript: str = Input(
            description=(
                "Plain text lyrics/transcript to align. Optional when "
                "line_timestamps are provided — transcript is built from "
                "line texts automatically."
            ),
            default="",
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
                "Line texts are concatenated to build the transcript for "
                "full-file CTC alignment. Set per_line_mode=True to use "
                "per-line windowed alignment instead."
            ),
            default="",
        ),
        refine_onsets: bool = Input(
            description=(
                "Post-process CTC boundaries with spectral onset detection. "
                "Searches ±35ms around each word boundary and ±18ms around "
                "each phoneme boundary, snapping to the nearest spectral "
                "onset at ~8ms resolution. Typically improves word boundary "
                "MAE from ~50ms to ~20-30ms on singing voice."
            ),
            default=True,
        ),
        per_line_mode: bool = Input(
            description=(
                "When True and line_timestamps are provided, uses per-line "
                "CTC alignment (constrains alignment to LRCLIB line windows). "
                "Default False: full-file CTC alignment produces more natural "
                "word durations and avoids compression artifacts from tight "
                "line windows."
            ),
            default=False,
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

        # Build transcript from line timestamps if not provided directly
        if not transcript.strip() and line_times:
            transcript = " ".join(lt["text"].strip() for lt in line_times)
            print(
                f"Built transcript from {len(line_times)} lines: "
                f"{len(transcript)} chars",
                file=sys.stderr,
            )

        if per_line_mode and line_times:
            # Opt-in: per-line CTC → word + phoneme alignment
            print(f"Per-line CTC alignment: {len(line_times)} lines", file=sys.stderr)
            return self._align_by_lines(waveform, line_times, refine_onsets)
        elif word_times:
            # Legacy: phoneme alignment within pre-established word boundaries
            print(f"Word-boundary alignment: {len(word_times)} words", file=sys.stderr)
            return self._align_with_word_boundaries(waveform, word_times, refine_onsets)
        elif transcript.strip():
            # Preferred: full-file CTC word + phoneme alignment
            print(f"Full-file CTC alignment: {len(transcript)} chars", file=sys.stderr)
            return self._align_full_ctc(waveform, transcript, refine_onsets)
        else:
            return json.dumps({
                "words": [],
                "error": "No transcript or line_timestamps provided",
            })

    # ── Per-line CTC alignment (preferred path) ──────────────────────

    def _align_by_lines(self, waveform, line_times, refine_onsets=True):
        """Per-line CTC forced alignment for word + phoneme boundaries.

        Uses LRCLIB synced line timestamps to constrain CTC alignment to
        short audio windows. Each line is aligned independently so the
        model can't confuse repeated phrases across chorus/verse repetitions.

        One MMS forward pass on the full audio, then lightweight
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

            # Trim leading/trailing non-speech frames.  LRCLIB line
            # timestamps can lead actual singing onset by 1-3s (karaoke
            # cue-ahead).  Without trimming, forced_align maps lyrics
            # into instrumental gaps.
            #
            # Pass the raw waveform segment so the detector can use RMS
            # energy — much more reliable on Demucs vocal stems than CTC
            # blank probability alone (bleed artifacts fool CTC thresholds).
            win_start_sample = int(win_start_s * self.sample_rate)
            win_end_sample = min(
                int(win_end_s * self.sample_rate), waveform.shape[1]
            )
            line_waveform = waveform[:, win_start_sample:win_end_sample]

            speech_start, speech_end = self._detect_speech_region(
                line_emission, waveform_segment=line_waveform
            )
            if speech_start > 0 or speech_end < line_frames:
                lead_ms = speech_start * line_frame_dur * 1000
                trail_frames = line_frames - speech_end
                trail_ms = trail_frames * line_frame_dur * 1000
                print(
                    f"  Line {i}: trimmed {speech_start} lead frames "
                    f"({lead_ms:.0f}ms) + {trail_frames} trail frames "
                    f"({trail_ms:.0f}ms) | "
                    f"'{text[:40]}' window {win_start_s:.2f}-{win_end_s:.2f}s",
                    file=sys.stderr,
                )
                trimmed_start_s = win_start_s + speech_start * line_frame_dur
                trimmed_end_s = win_start_s + speech_end * line_frame_dur
                line_emission = line_emission[speech_start:speech_end]
                line_frames = line_emission.shape[0]
                win_start_s = trimmed_start_s
                win_end_s = trimmed_end_s
                start_frame = start_frame + speech_start
                end_frame = start_frame + line_frames
                if line_frames < 2:
                    continue

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

        if results:
            results = self._enforce_vowel_duration(results)
        if refine_onsets and results:
            results = self._refine_with_onsets(waveform, results)

        return json.dumps({"words": results})

    def _ctc_align_words(self, emission, text, offset_s, frame_duration_s):
        """CTC-align text to emission frames and return word spans.

        Uses torchaudio.functional.forced_align with * (star token) as
        word separator. MMS_FA's star token absorbs inter-word silence
        and noise, producing tighter word boundaries than the old |
        separator. Returns list of (word_text, start_s, end_s) tuples.
        Natural gaps between words are preserved; only overlaps are clipped.
        """
        num_frames = emission.shape[0]
        duration_s = num_frames * frame_duration_s

        words = text.strip().split()
        if not words:
            return []

        # Build CTC token sequence: word*word*word
        # MMS_FA uses lowercase romanised labels; * is the star token
        # that absorbs silence/noise between words.
        ctc_text = "*".join(w.lower() for w in words)
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

            # Group tokens into words by splitting at * boundaries
            word_spans = []
            token_idx = 0

            for word in words:
                word_first_frame = None
                word_last_frame = None

                for ch in word.lower():
                    if ch in self.label_to_idx:
                        if token_idx in token_frames:
                            ff, lf = token_frames[token_idx]
                            if word_first_frame is None:
                                word_first_frame = ff
                            word_last_frame = lf
                        token_idx += 1

                # Skip the * (star) separator token
                if token_idx < len(token_chars) and token_chars[token_idx] == "*":
                    token_idx += 1

                if word_first_frame is not None:
                    ws = offset_s + word_first_frame * frame_duration_s
                    we = offset_s + (word_last_frame + 1) * frame_duration_s
                    word_spans.append((word, ws, we))

            # Prevent overlaps but preserve natural gaps (silence between words).
            # CTC end times already mark where each word's tokens stop —
            # extending to the next word's start erases inter-word silence.
            for j in range(len(word_spans) - 1):
                w_cur, ws_cur, we_cur = word_spans[j]
                _, ws_next, _ = word_spans[j + 1]
                if we_cur > ws_next:
                    word_spans[j] = (w_cur, ws_cur, ws_next)

            return word_spans

        except Exception as e:
            print(f"CTC word alignment failed for '{text[:50]}': {e}", file=sys.stderr)
            return []

    def _align_phonemes_with_emissions(
        self, emission, phonemes_arpabet, offset_s, frame_duration_s, word_end_s
    ):
        """CTC-align phonemes using pre-computed emissions for a word window.

        Same algorithm as _align_phonemes_in_window but skips the expensive
        MMS forward pass — uses sliced emissions from the full-audio pass.
        """
        num_frames = emission.shape[0]

        if not phonemes_arpabet:
            return self._distribute_evenly(phonemes_arpabet, offset_s, word_end_s)

        tokens, token_to_phoneme = self._phonemes_to_ctc_tokens(phonemes_arpabet)
        if not tokens or num_frames < len(tokens):
            # Need at least as many frames as CTC tokens (multi-char mappings
            # can produce more tokens than phonemes)
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

    # ── Full-file CTC alignment (preferred path) ────────────────────

    def _align_full_ctc(self, waveform, transcript, refine_onsets=True):
        """Full-file CTC word + phoneme alignment (preferred path).

        Runs one forward pass, aligns the entire transcript to the audio,
        then does per-word phoneme alignment using the same emissions.
        Lets CTC place word boundaries naturally across the full audio
        without per-line compression artifacts.
        """
        audio_duration_s = waveform.shape[1] / self.sample_rate

        with torch.inference_mode():
            full_emissions, _ = self.model(waveform.to(self.device))
            full_emissions = torch.log_softmax(full_emissions, dim=-1)
        full_emission = full_emissions[0].cpu()
        total_frames = full_emission.shape[0]
        frame_duration_s = audio_duration_s / total_frames

        print(
            f"Audio: {audio_duration_s:.1f}s, {total_frames} frames, "
            f"{frame_duration_s*1000:.1f}ms/frame",
            file=sys.stderr,
        )

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

        if results:
            results = self._enforce_vowel_duration(results)
        if refine_onsets and results:
            results = self._refine_with_onsets(waveform, results)

        return json.dumps({"words": results})

    # ── Legacy: phoneme alignment within word boundaries ──────────────

    def _align_with_word_boundaries(self, waveform, word_times, refine_onsets=True):
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

        if results:
            results = self._enforce_vowel_duration(results)
        if refine_onsets and results:
            results = self._refine_with_onsets(waveform, results)

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

        tokens, token_to_phoneme = self._phonemes_to_ctc_tokens(phonemes_arpabet)
        if not tokens or num_frames < len(tokens):
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

    # ── Duration sanity check ────────────────────────────────────────

    def _enforce_vowel_duration(self, results):
        """Post-CTC sanity check: ensure vowels get proportional duration.

        CTC character alignment systematically compresses vowels (especially
        diphthongs) because the surrogate character mappings don't produce
        strong emission probabilities during vowel sounds. This method
        detects words where consonants dominate and redistributes time
        using linguistic priors: vowels should get at least 40% of a word's
        duration in singing (they carry the pitch/melody).

        Operates in-place on results.
        """
        MIN_VOWEL_SHARE = 0.35  # Vowels must get >= 35% of word
        fixed_count = 0

        for word in results:
            phonemes = word.get("phonemes", [])
            if len(phonemes) < 2:
                continue

            word_dur = word["end"] - word["start"]
            if word_dur <= 0.01:
                continue

            # Classify phonemes and compute current vowel share
            vowel_idxs = []
            consonant_idxs = []
            for i, p in enumerate(phonemes):
                clean = _strip_stress(p["phoneme"])
                if clean in _VOWELS:
                    vowel_idxs.append(i)
                else:
                    consonant_idxs.append(i)

            if not vowel_idxs or not consonant_idxs:
                continue

            vowel_time = sum(
                phonemes[i]["end"] - phonemes[i]["start"] for i in vowel_idxs
            )
            vowel_share = vowel_time / word_dur

            if vowel_share >= MIN_VOWEL_SHARE:
                continue  # CTC got it right, skip

            # CTC compressed vowels — redistribute using duration model priors.
            # Consonant base durations (seconds):
            CONS_BASE = {
                "plosive": 0.055,   # B, P: quick pop
                "fricative": 0.070, # F, V, S, Z, SH, etc.
                "liquid": 0.065,    # L, R
                "glide": 0.060,     # W, Y
                "nasal": 0.060,     # M, N, NG
                "stop": 0.045,      # CH, D, G, K, T, etc.
            }
            PLOSIVES = {"B", "P"}
            FRICATIVES = {"F", "V", "S", "Z", "SH", "ZH", "TH", "DH", "HH"}
            LIQUIDS = {"L", "R"}
            GLIDES = {"W", "WH", "Y"}
            NASALS = {"M", "N", "NG"}

            def _cons_category(ph):
                if ph in PLOSIVES:
                    return "plosive"
                if ph in FRICATIVES:
                    return "fricative"
                if ph in LIQUIDS:
                    return "liquid"
                if ph in GLIDES:
                    return "glide"
                if ph in NASALS:
                    return "nasal"
                return "stop"

            # Assign base durations to consonants
            cons_durations = {}
            total_cons = 0.0
            for i in consonant_idxs:
                clean = _strip_stress(phonemes[i]["phoneme"])
                base = CONS_BASE[_cons_category(clean)]
                cons_durations[i] = base
                total_cons += base

            # If consonants alone exceed word, scale them down
            if total_cons >= word_dur * 0.65:
                scale = (word_dur * 0.55) / total_cons
                for i in consonant_idxs:
                    cons_durations[i] *= scale
                total_cons = sum(cons_durations[i] for i in consonant_idxs)

            # Remaining time goes to vowels
            vowel_total = word_dur - total_cons

            # First vowel (nucleus) gets 1.5x weight
            weights = []
            for j, i in enumerate(vowel_idxs):
                weights.append(1.5 if j == 0 else 1.0)
            total_weight = sum(weights)

            vowel_durations = {}
            for j, i in enumerate(vowel_idxs):
                vowel_durations[i] = vowel_total * weights[j] / total_weight

            # Rebuild contiguous phoneme timestamps
            cursor = word["start"]
            for i in range(len(phonemes)):
                if i in cons_durations:
                    dur = cons_durations[i]
                elif i in vowel_durations:
                    dur = vowel_durations[i]
                else:
                    dur = phonemes[i]["end"] - phonemes[i]["start"]
                phonemes[i]["start"] = round(cursor, 4)
                phonemes[i]["end"] = round(cursor + dur, 4)
                cursor += dur

            # Clamp last phoneme to word end
            phonemes[-1]["end"] = word["end"]
            fixed_count += 1

        if fixed_count:
            print(
                f"Duration sanity: redistributed {fixed_count} words "
                f"where CTC compressed vowels",
                file=sys.stderr,
            )

        return results

    # ── Onset refinement ─────────────────────────────────────────────

    def _refine_with_onsets(self, waveform, results):
        """Post-process CTC boundaries using spectral onset detection.

        CTC forced alignment quantizes boundaries to ~20ms frames.
        This method searches a small window around each boundary and
        snaps to the nearest spectral onset (consonant attack, energy
        transition) using librosa at ~8ms resolution.

        Three-phase approach:
          1. Refine word START boundaries → snap to spectral onsets
          2. Re-enforce word contiguity (each word ends where next starts)
          3. Refine phoneme boundaries within each word

        Typically improves word boundary MAE from ~50ms to ~20-30ms
        on isolated singing voice.
        """
        if not results:
            return results

        try:
            return self._refine_with_onsets_impl(waveform, results)
        except Exception as e:
            print(
                f"Onset refinement failed, returning CTC-only results: {e}",
                file=sys.stderr,
            )
            return results

    def _refine_with_onsets_impl(self, waveform, results):
        """Inner implementation of onset refinement (wrapped by try/except).

        Uses torch STFT for spectral flux onset detection — no librosa/numba
        dependency, float32 by default, and can run on GPU if available.
        """
        sr = self.sample_rate

        # ── Compute spectral onset envelope via torch STFT ──
        # At 16kHz, hop_length=128 → 8ms per frame (2.5× finer than CTC)
        HOP = 128
        N_FFT = 1024

        mono = waveform.squeeze(0)  # (samples,)
        window = torch.hann_window(N_FFT, device=mono.device)
        stft = torch.stft(
            mono, n_fft=N_FFT, hop_length=HOP, window=window,
            return_complex=True,
        )
        # Magnitude spectrogram: (freq_bins, frames)
        mag = stft.abs()
        # Spectral flux: positive first-order differences across time
        flux = torch.diff(mag, dim=-1)
        flux = torch.clamp(flux, min=0)
        # Median across frequency bins (robust to broadband noise)
        onset_env = flux.median(dim=0).values.cpu().numpy()
        # Free STFT intermediates immediately
        del stft, mag, flux
        total_onset_frames = len(onset_env)
        if total_onset_frames < 10:
            return results

        # Adaptive threshold: ignore peaks weaker than background noise
        onset_mean = float(np.mean(onset_env))
        onset_std = float(np.std(onset_env))
        min_peak_strength = onset_mean + 0.25 * onset_std

        def time_to_frame(t):
            return min(max(0, int(t * sr / HOP)), total_onset_frames - 1)

        def frame_to_time(f):
            return f * HOP / sr

        WORD_RADIUS_S = 0.055  # ±55ms search for word boundaries (singing has rubato)
        PHONEME_RADIUS_S = 0.025  # ±25ms search for phoneme boundaries

        # ── Phase 1: Refine word START boundaries ──
        total_delta_ms = 0.0
        refined_count = 0

        for word in results:
            original_start = word["start"]
            center = time_to_frame(original_start)
            radius = max(1, int(WORD_RADIUS_S * sr / HOP))
            lo = max(0, center - radius)
            hi = min(total_onset_frames, center + radius + 1)

            if hi - lo < 3:
                continue

            window = onset_env[lo:hi]
            peak_local = int(np.argmax(window))

            if window[peak_local] >= min_peak_strength:
                refined_start = frame_to_time(lo + peak_local)
                word["start"] = round(refined_start, 4)
                total_delta_ms += abs(refined_start - original_start) * 1000
                refined_count += 1

        # ── Phase 2: Prevent overlaps but preserve natural gaps ──
        results.sort(key=lambda w: w["start"])

        for i in range(len(results) - 1):
            if results[i]["end"] > results[i + 1]["start"]:
                results[i]["end"] = results[i + 1]["start"]

        # Ensure positive duration for every word
        for word in results:
            if word["end"] <= word["start"]:
                word["end"] = round(word["start"] + 0.05, 4)

        # ── Phase 3: Refine phoneme boundaries within each word ──
        phoneme_refined = 0

        for word in results:
            phonemes = word.get("phonemes", [])
            if not phonemes:
                continue

            word_start = word["start"]
            word_end = word["end"]

            if len(phonemes) == 1:
                phonemes[0]["start"] = word_start
                phonemes[0]["end"] = word_end
                continue

            # First phoneme always starts at word start
            phonemes[0]["start"] = word_start

            # Refine internal boundaries (between phonemes)
            for j in range(1, len(phonemes)):
                ctc_boundary = phonemes[j]["start"]
                center = time_to_frame(ctc_boundary)
                radius = max(1, int(PHONEME_RADIUS_S * sr / HOP))
                lo = max(0, center - radius)
                hi = min(total_onset_frames, center + radius + 1)

                if hi - lo < 2:
                    continue

                window = onset_env[lo:hi]
                peak_local = int(np.argmax(window))

                # Lower threshold for phoneme transitions (subtler)
                if window[peak_local] >= min_peak_strength * 0.5:
                    candidate = frame_to_time(lo + peak_local)

                    # Clamp: must be after previous phoneme + 5ms min
                    min_start = phonemes[j - 1]["start"] + 0.005
                    # Clamp: leave room for remaining phonemes (5ms each)
                    remaining = len(phonemes) - j
                    max_start = word_end - remaining * 0.005
                    candidate = max(min_start, min(candidate, max_start))

                    phonemes[j]["start"] = round(candidate, 4)
                    phoneme_refined += 1

            # Make phonemes contiguous within word
            for j in range(len(phonemes) - 1):
                phonemes[j]["end"] = phonemes[j + 1]["start"]
            phonemes[-1]["end"] = word_end

        avg_delta = total_delta_ms / refined_count if refined_count else 0
        print(
            f"Onset refinement: {refined_count}/{len(results)} word boundaries "
            f"shifted (avg {avg_delta:.1f}ms), "
            f"{phoneme_refined} phoneme boundaries refined",
            file=sys.stderr,
        )
        return results

    # ── Speech region detection ─────────────────────────────────────

    @staticmethod
    def _detect_speech_region(emission, waveform_segment=None, min_run=3):
        """Detect speech onset/offset in a line's audio window.

        LRCLIB line timestamps can lead actual singing onset by 1-3 seconds
        (karaoke cue-ahead timing).  During instrumental gaps, forced_align
        maps lyrics into the gap because it MUST assign every token to some
        frame.  This method trims non-speech frames so forced_align only
        sees frames containing vocals.

        Two detection strategies (best available is used):

          1. **Waveform energy** (preferred, when waveform_segment is given):
             Computes per-frame RMS energy with adaptive thresholding.
             Uses noise-floor-relative (4× p10) when the window has clear
             silence, or peak-relative (15% of peak) when the window is
             all singing.  Includes gap-aware onset detection to skip
             vocal tails from the previous line that bleed into the window
             start.  Much more reliable on Demucs vocal stems where bleed
             artifacts have enough spectral structure to fool CTC-only
             detection.

          2. **CTC blank probability** (fallback):
             Uses P(blank) and max P(non-blank) from the emission matrix.
             Works well on mixed audio but too conservative for processed
             vocals — residual Demucs bleed keeps P(blank) low enough to
             classify silence as speech.

        Args:
            emission: (T, C) log-softmax emission matrix for a line window.
            waveform_segment: optional (1, S) waveform tensor for the same
                window.  When provided, energy-based detection is used.
            min_run: require this many consecutive speech frames to confirm
                     onset (avoids triggering on single-frame noise).

        Returns:
            (start_frame, end_frame) tuple bounding the speech region.
            Falls back to (0, T) if no clear speech region is found.
        """
        num_frames = emission.shape[0]
        if num_frames < min_run * 2:
            return 0, num_frames

        # ── Strategy 1: Waveform RMS energy (Demucs-friendly) ─────────
        if waveform_segment is not None and waveform_segment.shape[-1] > 0:
            mono = waveform_segment.squeeze(0)  # (samples,)
            total_samples = mono.shape[0]
            samples_per_frame = total_samples / num_frames
            frame_len = int(samples_per_frame)

            if frame_len > 0 and frame_len * num_frames <= total_samples:
                usable = frame_len * num_frames
                frames = mono[:usable].reshape(num_frames, frame_len)
                rms = frames.pow(2).mean(dim=1).sqrt().numpy()
            else:
                # Fallback: compute per-frame manually
                rms = np.zeros(num_frames)
                for f in range(num_frames):
                    s = int(f * samples_per_frame)
                    e = min(int((f + 1) * samples_per_frame), total_samples)
                    seg = mono[s:e]
                    if seg.numel() > 0:
                        rms[f] = seg.pow(2).mean().sqrt().item()

            # ── Adaptive threshold ──────────────────────────────────
            # We need a threshold that works for two very different cases:
            #   A) Window has clear silence + singing → noise floor is low,
            #      4× noise floor works well.
            #   B) Window is ALL singing (no silence) → noise floor is high
            #      (e.g. p10=0.097), and 4× noise floor (0.39) can exceed
            #      the actual peak RMS (0.31).  Must use peak-relative.
            #
            # Strategy: compute both, pick the one that actually classifies
            # a meaningful portion of frames as speech.

            sorted_rms = np.sort(rms)
            p10_idx = max(1, num_frames // 10)
            p90_idx = min(num_frames - 1, num_frames * 9 // 10)
            noise_floor = float(sorted_rms[p10_idx])
            p90 = float(sorted_rms[p90_idx])
            peak_rms = float(sorted_rms[-1])

            # Candidate A: noise-floor-relative (good for windows with silence)
            thresh_noise = max(noise_floor * 4.0, 0.002)

            # Candidate B: peak-relative (good for all-singing windows)
            # 15% of peak — below the quietest consonant but above bleed
            thresh_peak = peak_rms * 0.15

            # Guard: threshold must never exceed 50% of p90 — if it does,
            # the threshold is higher than typical singing energy, which
            # means we'd classify most singing as non-speech.
            p90_cap = p90 * 0.5

            # Pick: use noise-floor threshold if it's sane (below p90 cap),
            # otherwise fall back to peak-relative threshold.
            if thresh_noise <= p90_cap:
                threshold = thresh_noise
            else:
                threshold = min(thresh_peak, p90_cap) if p90_cap > 0.002 else thresh_peak

            # Absolute minimum — don't threshold on pure digital silence
            threshold = max(threshold, 0.002)

            print(
                f"  RMS detection: noise_floor={noise_floor:.4f} p90={p90:.4f} "
                f"peak={peak_rms:.4f} | thresh_noise={thresh_noise:.4f} "
                f"thresh_peak={thresh_peak:.4f} p90_cap={p90_cap:.4f} "
                f"→ threshold={threshold:.4f}",
                file=sys.stderr,
            )

            is_speech = rms > threshold

        # ── Strategy 2: CTC blank probability (mixed-audio fallback) ──
        else:
            probs = emission.exp()  # (T, C) probabilities
            blank_prob = probs[:, 0].numpy()
            max_nonblank = probs[:, 1:].max(dim=1).values.numpy()

            BLANK_FLOOR = 0.55
            CHAR_CEIL = 0.10
            is_speech = ~(
                (blank_prob > BLANK_FLOOR) & (max_nonblank < CHAR_CEIL)
            )

        # ── Find speech boundaries (shared logic) ─────────────────────
        #
        # Gap-aware onset: LRCLIB windows often start with the tail of the
        # PREVIOUS line's singing (vocal bleed).  Instead of naively picking
        # the first speech run, look for the LAST non-speech gap in the
        # first half of the window — if we find one, the real onset is
        # after that gap, not at the very start.

        # Build list of speech runs: [(start_frame, length), ...]
        speech_runs = []
        run_start = None
        for i in range(num_frames):
            if is_speech[i]:
                if run_start is None:
                    run_start = i
            else:
                if run_start is not None:
                    speech_runs.append((run_start, i - run_start))
                    run_start = None
        if run_start is not None:
            speech_runs.append((run_start, num_frames - run_start))

        if not speech_runs:
            return 0, num_frames

        # Filter to runs of at least min_run frames
        valid_runs = [(s, l) for s, l in speech_runs if l >= min_run]
        if not valid_runs:
            return 0, num_frames

        # ── Lead trimming (gap-aware) ──────────────────────────────
        # Look for a silence gap in the first 40% of the window.
        # If found, the real onset is the first valid speech run AFTER
        # that gap — the frames before it are the previous line's tail.
        midpoint = int(num_frames * 0.4)
        start_run_idx = 0  # default: first valid run

        # Find gaps (non-speech regions) in the first 40%
        last_gap_end = None
        for i in range(1, len(speech_runs)):
            gap_start = speech_runs[i - 1][0] + speech_runs[i - 1][1]
            gap_end = speech_runs[i][0]
            if gap_start < midpoint and gap_end > gap_start:
                gap_len = gap_end - gap_start
                # A gap of at least 2 frames (~40ms) is significant
                if gap_len >= 2:
                    last_gap_end = gap_end

        if last_gap_end is not None:
            # Find the first valid run that starts at or after the gap
            for idx, (rs, rl) in enumerate(valid_runs):
                if rs >= last_gap_end:
                    start_run_idx = idx
                    break

        start = valid_runs[start_run_idx][0]

        # ── Trail trimming ─────────────────────────────────────────
        last_run = valid_runs[-1]
        end = last_run[0] + last_run[1]

        # Pad by 2 frames (~40ms) to avoid clipping consonant onsets/releases
        ONSET_PAD = 2
        start = max(0, start - ONSET_PAD)
        end = min(num_frames, end + ONSET_PAD)

        # Safety: don't trim more than 70% of the window — if we would,
        # the line timestamps are probably just wrong and trimming will
        # make things worse.
        if (end - start) < num_frames * 0.3:
            print(
                f"  RMS detection: would trim to {end - start}/{num_frames} "
                f"frames (<30%) — keeping full window",
                file=sys.stderr,
            )
            return 0, num_frames

        if start >= end:
            return 0, num_frames

        speech_pct = np.sum(is_speech) / num_frames * 100
        print(
            f"  RMS detection: trim [{start}:{end}] of {num_frames} frames "
            f"(speech {speech_pct:.0f}%)",
            file=sys.stderr,
        )
        return start, end

    # ── Shared helpers ────────────────────────────────────────────────

    def _phonemes_to_ctc_tokens(self, phonemes_arpabet):
        """Map ARPAbet phonemes to MMS CTC label indices (lowercase)."""
        tokens = []
        token_to_phoneme = []

        for i, phoneme in enumerate(phonemes_arpabet):
            clean = _strip_stress(phoneme)
            chars = ARPABET_TO_CHARS.get(clean, clean[0] if clean else "A")
            for ch in chars:
                if ch.lower() in self.label_to_idx:
                    tokens.append(self.label_to_idx[ch.lower()])
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
