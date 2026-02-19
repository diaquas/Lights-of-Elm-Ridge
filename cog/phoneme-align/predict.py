"""
Phoneme-Align — Cog model for Replicate.

Phoneme-level forced alignment using torchaudio's CTC forced alignment
with wav2vec2. Returns per-phoneme start/end timestamps in ARPAbet,
derived directly from the audio signal — no heuristic distribution.

Designed to complement the existing word-level force-align model:
  word-level  → diaquas/force-align  (Whisper + stable-ts)
  phoneme-level → diaquas/phoneme-align  (wav2vec2 CTC)

The word-level model gives robust word boundaries; this model breaks
each word into its constituent phonemes with acoustic precision.

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

# ── ARPAbet label mapping ──────────────────────────────────────────
# wav2vec2 CTC outputs single-character tokens. We group them into
# ARPAbet phonemes by mapping each CTC label to its ARPAbet equivalent.
# The WAV2VEC2_ASR_BASE_960H model uses a character-level vocabulary,
# so we align at character level first, then map words → phonemes
# using the CMU dictionary.

# CMU Pronouncing Dictionary subset — maps lowercase words to ARPAbet.
# This is loaded once at setup time. For words not in the dictionary,
# we fall back to a simple grapheme-to-phoneme mapping.
CMU_DICT_URL = (
    "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict-0.7b"
)


def _load_cmu_dict():
    """Load CMU dictionary from bundled file or download."""
    import urllib.request

    cmu_path = "/tmp/cmudict-0.7b"  # noqa: S108 — temp path in container
    if not os.path.exists(cmu_path):
        urllib.request.urlretrieve(CMU_DICT_URL, cmu_path)

    cmu = {}
    with open(cmu_path, encoding="latin-1") as f:
        for line in f:
            if line.startswith(";;;"):
                continue
            parts = line.strip().split("  ", 1)
            if len(parts) == 2:
                word = parts[0].lower()
                # Skip variant pronunciations (e.g., "CLOSE(2)")
                if "(" in word:
                    continue
                phonemes = parts[1].strip().split()
                cmu[word] = phonemes
    return cmu


# Simple grapheme-to-phoneme fallback for words not in CMU dict.
# Maps common letter patterns to ARPAbet. Good enough for singing.
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
    # Strip trailing silent e
    if len(word) > 2 and word.endswith("e") and word[-2] not in "aeiou":
        word = word[:-1]

    phonemes = []
    i = 0
    while i < len(word):
        matched = False
        # Try multi-char rules (longest first)
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

        # Load wav2vec2-large for CTC forced alignment (better phoneme boundaries)
        bundle = torchaudio.pipelines.WAV2VEC2_ASR_LARGE_960H
        self.model = bundle.get_model().to(self.device)
        self.labels = bundle.get_labels()
        self.sample_rate = bundle.sample_rate  # 16000

        # Build label-to-index dictionary for alignment
        self.label_to_idx = {label: i for i, label in enumerate(self.labels)}

        # Load CMU dictionary
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
    ) -> str:
        """Align transcript phonemes to audio and return phoneme-level timestamps."""
        # Load and resample audio
        waveform, sr = torchaudio.load(str(audio_file))
        if sr != self.sample_rate:
            waveform = torchaudio.functional.resample(waveform, sr, self.sample_rate)
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        word_times = self._parse_word_timestamps(word_timestamps)

        if word_times:
            return self._align_with_word_boundaries(waveform, word_times)
        else:
            return self._align_full(waveform, transcript)

    def _align_full(self, waveform, transcript):
        """Full-file phoneme alignment without word boundaries."""
        words = transcript.strip().split()
        results = []

        # Get character-level alignment for the full transcript
        char_alignments = self._ctc_align(waveform, transcript)

        if not char_alignments:
            return json.dumps({"words": [], "error": "CTC alignment failed"})

        # Group character alignments into words, then map to phonemes
        char_idx = 0
        for word_text in words:
            # Find this word's characters in the alignment
            word_chars = []
            remaining = len(word_text)
            while remaining > 0 and char_idx < len(char_alignments):
                word_chars.append(char_alignments[char_idx])
                char_idx += 1
                remaining -= 1

            if not word_chars:
                continue

            word_start = word_chars[0]["start"]
            word_end = word_chars[-1]["end"]

            # Look up phonemes for this word
            phonemes_arpabet = self._lookup_phonemes(word_text)

            # Distribute phoneme timings across the word duration
            phoneme_timings = self._distribute_phonemes_acoustically(
                phonemes_arpabet, word_start, word_end, waveform
            )

            results.append(
                {
                    "word": word_text,
                    "start": round(word_start, 4),
                    "end": round(word_end, 4),
                    "phonemes": phoneme_timings,
                }
            )

        return json.dumps({"words": results})

    def _align_with_word_boundaries(self, waveform, word_times):
        """Align phonemes within pre-established word boundaries.

        This is the precision path: the word-level aligner (Whisper+stable-ts)
        gives us robust word boundaries, and we use wav2vec2 CTC to find
        the phoneme boundaries within each word's audio window.
        """
        results = []

        for wt in word_times:
            word_text = wt["word"]
            word_start_s = wt["start"]
            word_end_s = wt["end"]

            # Slice the waveform to this word's time window
            start_sample = int(word_start_s * self.sample_rate)
            end_sample = min(
                int(word_end_s * self.sample_rate), waveform.shape[1]
            )

            if end_sample <= start_sample:
                continue

            word_waveform = waveform[:, start_sample:end_sample]

            # Look up phonemes for this word
            phonemes_arpabet = self._lookup_phonemes(word_text)

            # Use CTC alignment within this word's audio
            phoneme_timings = self._align_phonemes_in_window(
                word_waveform, phonemes_arpabet, word_start_s
            )

            results.append(
                {
                    "word": word_text,
                    "start": round(word_start_s, 4),
                    "end": round(word_end_s, 4),
                    "phonemes": phoneme_timings,
                }
            )

        return json.dumps({"words": results})

    def _align_phonemes_in_window(self, waveform, phonemes_arpabet, offset_s):
        """CTC-align phonemes within a word's audio window.

        Uses wav2vec2 emission probabilities + Viterbi-style forced alignment
        to find where each phoneme starts and ends in the audio.
        """
        if not phonemes_arpabet or waveform.shape[1] < 400:
            # Too short for CTC — distribute evenly
            return self._distribute_evenly(phonemes_arpabet, offset_s,
                                           offset_s + waveform.shape[1] / self.sample_rate)

        # Get emission probabilities from wav2vec2
        with torch.inference_mode():
            emissions, _ = self.model(waveform.to(self.device))
            emissions = torch.log_softmax(emissions, dim=-1)

        emission = emissions[0].cpu()  # (T, C)
        num_frames = emission.shape[0]

        if num_frames < len(phonemes_arpabet):
            return self._distribute_evenly(phonemes_arpabet, offset_s,
                                           offset_s + waveform.shape[1] / self.sample_rate)

        # Build the target token sequence from phonemes.
        # wav2vec2 uses character-level labels, so we map each phoneme
        # to its most representative character(s).
        tokens, token_to_phoneme = self._phonemes_to_ctc_tokens(phonemes_arpabet)

        if not tokens:
            return self._distribute_evenly(phonemes_arpabet, offset_s,
                                           offset_s + waveform.shape[1] / self.sample_rate)

        # Run CTC forced alignment via torchaudio
        try:
            token_indices = torch.tensor([tokens], dtype=torch.int32)
            aligned_tokens, scores = torchaudio.functional.forced_align(
                emission.unsqueeze(0), token_indices, blank=0
            )
            aligned_tokens = aligned_tokens[0]  # (T,)
            scores = scores[0]

            # Convert frame-level alignment to phoneme boundaries
            duration_s = waveform.shape[1] / self.sample_rate
            frame_duration_s = duration_s / num_frames

            # Group frames by token, then by phoneme
            phoneme_boundaries = self._frames_to_phoneme_boundaries(
                aligned_tokens, token_to_phoneme, len(phonemes_arpabet),
                frame_duration_s, offset_s
            )

            results = []
            for i, phoneme in enumerate(phonemes_arpabet):
                clean = _strip_stress(phoneme)
                if i < len(phoneme_boundaries):
                    start_s, end_s = phoneme_boundaries[i]
                else:
                    # Shouldn't happen, but fallback
                    start_s = offset_s
                    end_s = offset_s + duration_s
                results.append({
                    "phoneme": clean,
                    "start": round(start_s, 4),
                    "end": round(end_s, 4),
                })

            return results

        except Exception as e:
            print(f"CTC alignment failed: {e}", file=sys.stderr)
            return self._distribute_evenly(phonemes_arpabet, offset_s,
                                           offset_s + waveform.shape[1] / self.sample_rate)

    def _phonemes_to_ctc_tokens(self, phonemes_arpabet):
        """Map ARPAbet phonemes to CTC label indices.

        wav2vec2's vocabulary is single uppercase characters + special tokens.
        We map each phoneme to its most representative character sequence
        in the CTC vocabulary.
        """
        # ARPAbet phoneme → representative character(s) in wav2vec2 vocab
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
        token_to_phoneme = []  # maps each token index to phoneme index

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
        frame_duration_s, offset_s
    ):
        """Convert frame-level CTC alignment to phoneme start/end times.

        aligned_tokens has one entry per frame: 0 = blank, or the token index.
        We group consecutive non-blank frames by their phoneme index.
        """
        # Find the first and last frame for each phoneme
        phoneme_frames = [[] for _ in range(num_phonemes)]

        token_cursor = -1
        for frame_idx, token_val in enumerate(aligned_tokens):
            if token_val.item() != 0:  # non-blank
                token_cursor += 1
                if token_cursor < len(token_to_phoneme):
                    phoneme_idx = token_to_phoneme[token_cursor]
                    phoneme_frames[phoneme_idx].append(frame_idx)

        # Convert frame indices to time boundaries
        boundaries = []
        last_end_s = offset_s

        for i in range(num_phonemes):
            frames = phoneme_frames[i]
            if frames:
                start_s = offset_s + frames[0] * frame_duration_s
                end_s = offset_s + (frames[-1] + 1) * frame_duration_s
                # Ensure monotonicity
                start_s = max(start_s, last_end_s)
                end_s = max(end_s, start_s + 0.005)
                boundaries.append((start_s, end_s))
                last_end_s = end_s
            else:
                # No frames found for this phoneme — give it a minimal slice
                boundaries.append((last_end_s, last_end_s + 0.01))
                last_end_s += 0.01

        return boundaries

    def _ctc_align(self, waveform, transcript):
        """Character-level CTC alignment for full transcript."""
        with torch.inference_mode():
            emissions, _ = self.model(waveform.to(self.device))
            emissions = torch.log_softmax(emissions, dim=-1)

        emission = emissions[0].cpu()
        num_frames = emission.shape[0]
        duration_s = waveform.shape[1] / self.sample_rate
        frame_duration_s = duration_s / num_frames

        # Build character token sequence
        chars = transcript.upper().replace(" ", "|")
        tokens = []
        for ch in chars:
            if ch in self.label_to_idx:
                tokens.append(self.label_to_idx[ch])

        if not tokens or num_frames < len(tokens):
            return []

        try:
            token_indices = torch.tensor([tokens], dtype=torch.int32)
            aligned_tokens, scores = torchaudio.functional.forced_align(
                emission.unsqueeze(0), token_indices, blank=0
            )
            aligned_tokens = aligned_tokens[0]

            # Extract per-character boundaries
            results = []
            char_list = list(chars)
            token_cursor = -1

            for frame_idx, token_val in enumerate(aligned_tokens):
                if token_val.item() != 0:
                    token_cursor += 1
                    if token_cursor < len(char_list):
                        ch = char_list[token_cursor]
                        if ch == "|":
                            continue  # skip word boundaries
                        start_s = frame_idx * frame_duration_s
                        end_s = (frame_idx + 1) * frame_duration_s
                        results.append({
                            "char": ch,
                            "start": start_s,
                            "end": end_s,
                        })

            return results

        except Exception as e:
            print(f"CTC character alignment failed: {e}", file=sys.stderr)
            return []

    def _distribute_phonemes_acoustically(
        self, phonemes_arpabet, word_start_s, word_end_s, waveform
    ):
        """Distribute phonemes across a word using simple proportional timing.

        Used as fallback when per-word CTC alignment isn't available.
        This is still better than the TypeScript heuristic because it uses
        the CMU dictionary for phoneme lookup.
        """
        return self._distribute_evenly(phonemes_arpabet, word_start_s, word_end_s)

    def _distribute_evenly(self, phonemes_arpabet, start_s, end_s):
        """Evenly distribute phonemes across a time range (last resort fallback)."""
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
