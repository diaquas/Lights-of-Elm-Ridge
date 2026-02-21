"""
Phoneme-Align-SOFA — Cog model for Replicate.

SOFA (Singing-Oriented Forced Aligner) variant of the phoneme alignment
pipeline.  Uses a UNet backbone trained specifically on singing voice data
for better boundary accuracy on held notes, melisma, and diphthongs
compared to general-purpose speech models like MMS_FA.

Returns word-level AND phoneme-level timestamps derived from SOFA's
edge-prediction + dynamic-programming decode — no CTC character mapping,
no surrogate vowel approximations.

Key advantages over MMS_FA:
  - Trained on singing data → better accuracy on held/sung vowels
  - Edge-prediction head → sub-frame boundary precision
  - Direct phoneme classification → no ARPAbet-to-character surrogates
  - Joint word+phoneme alignment in a single decode pass

Alignment modes:
  1. Full-file alignment (DEFAULT, best for singing)
     Aligns the entire transcript against the full audio in one pass.
  2. Per-line alignment (opt-in via per_line_mode=True)
     Constrains alignment to LRCLIB line windows.
  3. word_timestamps provided → phoneme-only within word boundaries (legacy)

Deploy:
  cog login
  cog push r8.im/diaquas/phoneme-align-sofa
"""

import json
import os
import sys

# Prevent thread-pool deadlocks in container environments.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

# Add SOFA to Python path so its modules are importable.
sys.path.insert(0, "/opt/SOFA")

import numpy as np  # noqa: E402
import torch  # noqa: E402
import torchaudio  # noqa: E402
from cog import BasePredictor, Input, Path  # noqa: E402
from einops import repeat  # noqa: E402

# SOFA imports — requires /opt/SOFA on sys.path.
from modules.task.forced_alignment import LitForcedAlignmentTask  # noqa: E402
from modules.utils.get_melspec import MelSpecExtractor  # noqa: E402

# ── Paths to bundled assets ─────────────────────────────────────────

SOFA_CKPT_PATH = "/opt/SOFA/tgm_en_v100.ckpt"
SOFA_DICT_PATH = "/opt/SOFA/tgm_sofa_dict.txt"
CMU_DICT_PATH = "/opt/cmudict.dict"

# ── SOFA lowercase → uppercase ARPAbet mapping ──────────────────────
#
# SOFA's tgm_en_v100 model uses lowercase ARPAbet tokens (plus extras
# like "tr", "dr", "ax", "dx").  Our output contract requires uppercase
# ARPAbet to match the MMS variant and the Preston Blair phoneme mapper.

SOFA_TO_ARPABET = {
    "aa": "AA", "ae": "AE", "ah": "AH", "ao": "AO",
    "aw": "AW", "ax": "AH", "ay": "AY",
    "b": "B", "ch": "CH", "d": "D", "dh": "DH",
    "dr": "JH", "dx": "T",
    "eh": "EH", "er": "ER", "ey": "EY",
    "f": "F", "g": "G", "hh": "HH",
    "ih": "IH", "iy": "IY", "jh": "JH",
    "k": "K", "l": "L", "m": "M", "n": "N", "ng": "NG",
    "ow": "OW", "oy": "OY",
    "p": "P", "r": "R", "s": "S", "sh": "SH",
    "t": "T", "th": "TH", "tr": "CH",
    "uh": "UH", "uw": "UW",
    "v": "V", "w": "W", "y": "Y", "z": "Z", "zh": "ZH",
}

# Set of vowel phonemes (uppercase) for duration sanity checks.
_VOWELS = {
    "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY",
    "IH", "IY", "OW", "OY", "UH", "UW",
}


# ── Dictionary loaders ──────────────────────────────────────────────

def _load_sofa_dict():
    """Load SOFA dictionary (tab-separated: word<TAB>ph1 ph2 ph3)."""
    d = {}
    with open(SOFA_DICT_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or line.startswith(";;;"):
                continue
            parts = line.split("\t", 1)
            if len(parts) != 2:
                continue
            word = parts[0].strip().lower()
            # Skip variant pronunciations like "close(2)"
            if "(" in word:
                continue
            phonemes = parts[1].strip().split()
            if phonemes:
                d[word] = phonemes
    return d


def _load_cmu_dict():
    """Load CMU Pronouncing Dictionary as G2P fallback."""
    import urllib.request

    if not os.path.exists(CMU_DICT_PATH):
        urllib.request.urlretrieve(
            "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict",
            CMU_DICT_PATH,
        )
    cmu = {}
    with open(CMU_DICT_PATH, encoding="latin-1") as f:
        for line in f:
            if line.startswith(";;;"):
                continue
            parts = line.strip().split(None, 1)
            if len(parts) == 2:
                word = parts[0].lower()
                if "(" in word:
                    continue
                phonemes = parts[1].strip().split()
                cmu[word] = phonemes
    return cmu


# ── Simple rule-based G2P fallback ──────────────────────────────────

G2P_RULES = {
    "tion": ["sh", "ah", "n"], "sion": ["zh", "ah", "n"],
    "ight": ["ay", "t"], "ough": ["ao"], "ous": ["ah", "s"],
    "ing": ["ih", "ng"], "ck": ["k"], "sh": ["sh"], "ch": ["ch"],
    "th": ["th"], "ph": ["f"], "wh": ["w"], "wr": ["r"],
    "kn": ["n"], "ng": ["ng"], "qu": ["k", "w"],
    "ee": ["iy"], "oo": ["uw"], "ea": ["iy"], "ou": ["aw"],
    "ow": ["ow"], "ai": ["ey"], "ay": ["ey"], "oi": ["oy"],
    "oy": ["oy"], "au": ["ao"], "aw": ["ao"],
}

G2P_SINGLE = {
    "a": ["ae"], "b": ["b"], "c": ["k"], "d": ["d"], "e": ["eh"],
    "f": ["f"], "g": ["g"], "h": ["hh"], "i": ["ih"], "j": ["jh"],
    "k": ["k"], "l": ["l"], "m": ["m"], "n": ["n"], "o": ["aa"],
    "p": ["p"], "q": ["k"], "r": ["r"], "s": ["s"], "t": ["t"],
    "u": ["ah"], "v": ["v"], "w": ["w"], "x": ["k", "s"],
    "y": ["y"], "z": ["z"],
}


def _grapheme_to_phoneme(word):
    """Simple rule-based G2P fallback producing lowercase SOFA phonemes."""
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
    return phonemes if phonemes else ["ah"]


def _strip_stress(phoneme):
    """Remove stress digits from ARPAbet token: AA1 → AA."""
    if phoneme and phoneme[-1] in "012":
        return phoneme[:-1]
    return phoneme


# ── Predictor ───────────────────────────────────────────────────────

class Predictor(BasePredictor):
    def setup(self):
        """Load SOFA model, mel extractor, and dictionaries on cold start."""
        print("phoneme-align-sofa setup: starting", file=sys.stderr)

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"phoneme-align-sofa setup: device={self.device}", file=sys.stderr)

        # Load SOFA model from checkpoint.
        try:
            self.model = LitForcedAlignmentTask.load_from_checkpoint(
                SOFA_CKPT_PATH, strict=False
            )
            self.model.set_inference_mode("force")
            self.model.eval()
            self.model.to(self.device)
            self.melspec_config = self.model.melspec_config
            self.sample_rate = self.melspec_config["sample_rate"]
            self.vocab = self.model.vocab
            print(
                f"phoneme-align-sofa setup: SOFA model loaded "
                f"(sr={self.sample_rate}, vocab={self.vocab.get('<vocab_size>', '?')})",
                file=sys.stderr,
            )
        except Exception as e:
            print(f"phoneme-align-sofa setup: FAILED loading model: {e}", file=sys.stderr)
            raise

        # Initialize mel spectrogram extractor (same one SOFA uses internally).
        try:
            self.get_melspec = MelSpecExtractor(**self.melspec_config)
            print("phoneme-align-sofa setup: mel extractor ready", file=sys.stderr)
        except Exception as e:
            print(f"phoneme-align-sofa setup: FAILED mel extractor: {e}", file=sys.stderr)
            raise

        # Load dictionaries.
        try:
            self.sofa_dict = _load_sofa_dict()
            print(
                f"phoneme-align-sofa setup: SOFA dictionary loaded "
                f"({len(self.sofa_dict)} entries)",
                file=sys.stderr,
            )
        except Exception as e:
            print(f"phoneme-align-sofa setup: FAILED SOFA dict: {e}", file=sys.stderr)
            self.sofa_dict = {}

        try:
            self.cmu_dict = _load_cmu_dict()
            print(
                f"phoneme-align-sofa setup: CMU dictionary loaded "
                f"({len(self.cmu_dict)} entries)",
                file=sys.stderr,
            )
        except Exception as e:
            print(f"phoneme-align-sofa setup: FAILED CMU dict: {e}", file=sys.stderr)
            self.cmu_dict = {}

        print("phoneme-align-sofa setup: complete", file=sys.stderr)

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
                "full-file alignment. Set per_line_mode=True to use "
                "per-line windowed alignment instead."
            ),
            default="",
        ),
        refine_onsets: bool = Input(
            description=(
                "Post-process boundaries with spectral onset detection. "
                "Searches ±55ms around each word boundary and ±25ms around "
                "each phoneme boundary, snapping to the nearest spectral "
                "onset at ~8ms resolution."
            ),
            default=True,
        ),
        per_line_mode: bool = Input(
            description=(
                "When True and line_timestamps are provided, uses per-line "
                "alignment (constrains alignment to LRCLIB line windows). "
                "Default False: full-file alignment produces more natural "
                "word durations."
            ),
            default=False,
        ),
    ) -> str:
        """Align transcript to audio, returning word + phoneme timestamps."""
        # Load and resample audio to SOFA's expected sample rate.
        waveform, sr = torchaudio.load(str(audio_file))
        if sr != self.sample_rate:
            waveform = torchaudio.functional.resample(waveform, sr, self.sample_rate)
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        line_times = self._parse_line_timestamps(line_timestamps)
        word_times = self._parse_word_timestamps(word_timestamps)

        # Build transcript from line timestamps if not provided directly.
        if not transcript.strip() and line_times:
            transcript = " ".join(lt["text"].strip() for lt in line_times)
            print(
                f"Built transcript from {len(line_times)} lines: "
                f"{len(transcript)} chars",
                file=sys.stderr,
            )

        if per_line_mode and line_times:
            print(f"Per-line SOFA alignment: {len(line_times)} lines", file=sys.stderr)
            return self._align_by_lines(waveform, line_times, refine_onsets)
        elif word_times:
            print(f"Word-boundary alignment: {len(word_times)} words", file=sys.stderr)
            return self._align_with_word_boundaries(waveform, word_times, refine_onsets)
        elif transcript.strip():
            print(f"Full-file SOFA alignment: {len(transcript)} chars", file=sys.stderr)
            return self._align_full(waveform, transcript, refine_onsets)
        else:
            return json.dumps({
                "words": [],
                "error": "No transcript or line_timestamps provided",
            })

    # ── Full-file SOFA alignment (preferred path) ───────────────────

    def _align_full(self, waveform, transcript, refine_onsets=True):
        """Full-file SOFA alignment — single pass over the entire audio."""
        mono = waveform.squeeze(0).to(self.device)
        wav_length = mono.shape[0] / self.sample_rate

        words = transcript.strip().split()
        if not words:
            return json.dumps({"words": [], "error": "Empty transcript"})

        ph_seq, word_seq, ph_idx_to_word_idx = self._build_phoneme_sequence(words)

        if len(ph_seq) < 2:
            return json.dumps({"words": [], "error": "No valid phonemes found"})

        # Validate phonemes against model vocab.
        ph_seq, ph_idx_to_word_idx = self._filter_vocab(ph_seq, ph_idx_to_word_idx)

        melspec = self._prepare_melspec(mono)

        print(
            f"Audio: {wav_length:.1f}s | {len(words)} words | "
            f"{len(ph_seq)} phoneme tokens (incl. SP)",
            file=sys.stderr,
        )

        with torch.inference_mode():
            (
                ph_seq_pred, ph_intervals_pred,
                word_seq_pred, word_intervals_pred,
                confidence, _, _,
            ) = self.model._infer_once(
                melspec, wav_length, ph_seq, word_seq, ph_idx_to_word_idx,
            )

        results = self._sofa_to_json(
            word_seq_pred, word_intervals_pred, ph_seq_pred, ph_intervals_pred
        )

        print(
            f"Full-file aligned {len(results)} words (confidence={confidence:.3f})",
            file=sys.stderr,
        )

        if results:
            results = self._enforce_vowel_duration(results)
        if refine_onsets and results:
            results = self._refine_with_onsets(waveform, results)

        return json.dumps({"words": results})

    # ── Per-line SOFA alignment ─────────────────────────────────────

    def _align_by_lines(self, waveform, line_times, refine_onsets=True):
        """Per-line SOFA alignment using LRCLIB line windows."""
        audio_duration_s = waveform.shape[1] / self.sample_rate
        results = []

        for i, line in enumerate(line_times):
            text = line["text"].strip()
            if not text:
                continue

            line_start_s = line["startMs"] / 1000

            # Line end: next line's start, or +10s, or audio end.
            if i + 1 < len(line_times):
                line_end_s = line_times[i + 1]["startMs"] / 1000
            else:
                line_end_s = min(line_start_s + 10.0, audio_duration_s)

            # Pad window so edge words aren't clipped.
            PADDING_S = 0.5
            win_start_s = max(0, line_start_s - PADDING_S)
            win_end_s = min(audio_duration_s, line_end_s + PADDING_S)

            # Extract audio segment.
            start_sample = int(win_start_s * self.sample_rate)
            end_sample = min(int(win_end_s * self.sample_rate), waveform.shape[1])
            if end_sample <= start_sample + self.sample_rate // 10:
                continue
            segment = waveform[:, start_sample:end_sample]

            words = text.split()
            if not words:
                continue

            ph_seq, word_seq, ph_idx_to_word_idx = self._build_phoneme_sequence(words)
            if len(ph_seq) < 2:
                continue

            ph_seq, ph_idx_to_word_idx = self._filter_vocab(ph_seq, ph_idx_to_word_idx)

            mono = segment.squeeze(0).to(self.device)
            seg_length = mono.shape[0] / self.sample_rate

            try:
                melspec = self._prepare_melspec(mono)

                with torch.inference_mode():
                    (
                        ph_seq_pred, ph_intervals_pred,
                        word_seq_pred, word_intervals_pred,
                        confidence, _, _,
                    ) = self.model._infer_once(
                        melspec, seg_length, ph_seq, word_seq, ph_idx_to_word_idx,
                    )

                # Offset intervals to absolute time.
                if len(ph_intervals_pred) > 0:
                    ph_intervals_pred = ph_intervals_pred + win_start_s
                if len(word_intervals_pred) > 0:
                    word_intervals_pred = word_intervals_pred + win_start_s

                line_results = self._sofa_to_json(
                    word_seq_pred, word_intervals_pred,
                    ph_seq_pred, ph_intervals_pred,
                )
                results.extend(line_results)

            except Exception as e:
                print(
                    f"  Line {i} alignment failed: {e} — "
                    f"falling back to even distribution",
                    file=sys.stderr,
                )
                # Fallback: distribute words evenly across the line window.
                n = len(words)
                dur = win_end_s - win_start_s
                for j, w in enumerate(words):
                    ws = win_start_s + (j / n) * dur
                    we = win_start_s + ((j + 1) / n) * dur
                    phonemes = self._lookup_phonemes_sofa(w)
                    results.append({
                        "word": w,
                        "start": round(ws, 4),
                        "end": round(we, 4),
                        "phonemes": self._distribute_evenly(phonemes, ws, we),
                    })

        print(f"Aligned {len(results)} words across {len(line_times)} lines", file=sys.stderr)

        if results:
            results = self._enforce_vowel_duration(results)
        if refine_onsets and results:
            results = self._refine_with_onsets(waveform, results)

        return json.dumps({"words": results})

    # ── Legacy: phoneme alignment within word boundaries ────────────

    def _align_with_word_boundaries(self, waveform, word_times, refine_onsets=True):
        """Align phonemes within pre-established word boundaries."""
        results = []

        for wt in word_times:
            word_text = wt["word"]
            word_start_s = wt["start"]
            word_end_s = wt["end"]

            start_sample = int(word_start_s * self.sample_rate)
            end_sample = min(int(word_end_s * self.sample_rate), waveform.shape[1])

            if end_sample <= start_sample + self.sample_rate // 20:
                phonemes = self._lookup_phonemes_sofa(word_text)
                results.append({
                    "word": word_text,
                    "start": round(word_start_s, 4),
                    "end": round(word_end_s, 4),
                    "phonemes": self._distribute_evenly(
                        phonemes, word_start_s, word_end_s
                    ),
                })
                continue

            segment = waveform[:, start_sample:end_sample]
            mono = segment.squeeze(0).to(self.device)
            seg_length = mono.shape[0] / self.sample_rate

            phonemes_sofa = self._lookup_phonemes_sofa(word_text)
            if not phonemes_sofa:
                results.append({
                    "word": word_text,
                    "start": round(word_start_s, 4),
                    "end": round(word_end_s, 4),
                    "phonemes": [],
                })
                continue

            # Build phoneme sequence for just this word (SP word SP).
            ph_seq = ["SP"] + phonemes_sofa + ["SP"]
            word_seq = [word_text]
            ph_idx_to_word_idx = np.array(
                [-1] + [0] * len(phonemes_sofa) + [-1]
            )
            ph_seq, ph_idx_to_word_idx = self._filter_vocab(ph_seq, ph_idx_to_word_idx)

            try:
                melspec = self._prepare_melspec(mono)

                with torch.inference_mode():
                    (
                        ph_seq_pred, ph_intervals_pred,
                        _, _,
                        confidence, _, _,
                    ) = self.model._infer_once(
                        melspec, seg_length, ph_seq, word_seq, ph_idx_to_word_idx,
                    )

                # Offset to absolute time and build phoneme list.
                phoneme_timings = []
                for j in range(len(ph_seq_pred)):
                    ph = str(ph_seq_pred[j])
                    arpabet = SOFA_TO_ARPABET.get(ph, ph.upper())
                    ph_start = float(ph_intervals_pred[j][0]) + word_start_s
                    ph_end = float(ph_intervals_pred[j][1]) + word_start_s
                    phoneme_timings.append({
                        "phoneme": arpabet,
                        "start": round(ph_start, 4),
                        "end": round(min(ph_end, word_end_s), 4),
                    })

                results.append({
                    "word": word_text,
                    "start": round(word_start_s, 4),
                    "end": round(word_end_s, 4),
                    "phonemes": phoneme_timings,
                })

            except Exception as e:
                print(f"Word alignment failed for '{word_text}': {e}", file=sys.stderr)
                results.append({
                    "word": word_text,
                    "start": round(word_start_s, 4),
                    "end": round(word_end_s, 4),
                    "phonemes": self._distribute_evenly(
                        phonemes_sofa, word_start_s, word_end_s
                    ),
                })

        if results:
            results = self._enforce_vowel_duration(results)
        if refine_onsets and results:
            results = self._refine_with_onsets(waveform, results)

        return json.dumps({"words": results})

    # ── Mel spectrogram preparation ─────────────────────────────────

    def _prepare_melspec(self, waveform_1d):
        """Compute, normalize, and upsample mel spectrogram for SOFA.

        Args:
            waveform_1d: 1-D tensor (samples,) on self.device.

        Returns:
            (1, n_mels, T*scale_factor) tensor ready for model.forward().
        """
        melspec = self.get_melspec(waveform_1d).detach().unsqueeze(0)
        melspec = (melspec - melspec.mean()) / (melspec.std() + 1e-6)
        melspec = repeat(
            melspec, "B C T -> B C (T N)", N=self.melspec_config["scale_factor"]
        )
        return melspec

    # ── Phoneme sequence construction ───────────────────────────────

    def _build_phoneme_sequence(self, words):
        """Build SOFA phoneme sequence with SP markers and word mapping.

        SOFA expects: SP ph1 ph2 ... SP ph3 ph4 ... SP
        with a parallel array mapping each phoneme index back to its
        source word index.

        Returns:
            (ph_seq, word_seq, ph_idx_to_word_idx)
        """
        ph_seq = ["SP"]
        word_seq = []
        ph_idx_to_word_idx = [-1]  # SP → no word

        for word in words:
            phonemes = self._lookup_phonemes_sofa(word)
            if not phonemes:
                continue
            word_seq.append(word)
            word_idx = len(word_seq) - 1
            for ph in phonemes:
                ph_seq.append(ph)
                ph_idx_to_word_idx.append(word_idx)
            ph_seq.append("SP")
            ph_idx_to_word_idx.append(-1)

        return ph_seq, word_seq, np.array(ph_idx_to_word_idx)

    def _lookup_phonemes_sofa(self, word):
        """Look up SOFA-format (lowercase) phonemes for a word.

        Lookup order:
          1. SOFA dictionary (tgm_sofa_dict.txt)
          2. CMU dictionary → convert to lowercase, strip stress
          3. Rule-based G2P fallback
        """
        clean = word.lower().strip(".,!?;:'\"()-")
        if not clean:
            return []

        # 1. SOFA dictionary (already lowercase).
        if clean in self.sofa_dict:
            return list(self.sofa_dict[clean])

        # 2. CMU dictionary → strip stress, lowercase.
        if clean in self.cmu_dict:
            return [_strip_stress(ph).lower() for ph in self.cmu_dict[clean]]

        # 3. Rule-based G2P fallback (produces lowercase).
        return _grapheme_to_phoneme(clean)

    def _filter_vocab(self, ph_seq, ph_idx_to_word_idx):
        """Remove phonemes not in the SOFA model's vocabulary."""
        filtered_ph = []
        filtered_idx = []
        skipped = set()

        for ph, idx in zip(ph_seq, ph_idx_to_word_idx):
            if ph in self.vocab:
                filtered_ph.append(ph)
                filtered_idx.append(idx)
            else:
                skipped.add(ph)

        if skipped:
            print(
                f"Filtered {len(skipped)} unknown phonemes from vocab: {skipped}",
                file=sys.stderr,
            )

        return filtered_ph, np.array(filtered_idx)

    # ── SOFA output → JSON conversion ───────────────────────────────

    def _sofa_to_json(self, word_seq, word_intervals, ph_seq, ph_intervals):
        """Convert SOFA's parallel arrays to our word+phoneme JSON format.

        SOFA returns phonemes in order, contiguous within each word.
        Word intervals are the union of their constituent phonemes.
        """
        if len(word_seq) == 0:
            return []

        results = []
        ph_cursor = 0

        for i in range(len(word_seq)):
            word_start = float(word_intervals[i][0])
            word_end = float(word_intervals[i][1])

            phonemes = []
            while ph_cursor < len(ph_seq):
                ph_start = float(ph_intervals[ph_cursor][0])
                # Phoneme belongs to this word if it starts before word end.
                if ph_start >= word_end + 0.001:
                    break

                ph = str(ph_seq[ph_cursor])
                ph_end = float(ph_intervals[ph_cursor][1])
                arpabet = SOFA_TO_ARPABET.get(ph, ph.upper())

                phonemes.append({
                    "phoneme": arpabet,
                    "start": round(ph_start, 4),
                    "end": round(min(ph_end, word_end), 4),
                })
                ph_cursor += 1

            results.append({
                "word": str(word_seq[i]),
                "start": round(word_start, 4),
                "end": round(word_end, 4),
                "phonemes": phonemes,
            })

        return results

    # ── Duration sanity check ───────────────────────────────────────

    def _enforce_vowel_duration(self, results):
        """Ensure vowels get proportional duration in singing.

        SOFA is better than CTC at vowel placement, but can still
        compress vowels on fast passages. This redistributes time
        using linguistic priors when vowels get < 35% of word duration.
        """
        MIN_VOWEL_SHARE = 0.35
        fixed_count = 0

        for word in results:
            phonemes = word.get("phonemes", [])
            if len(phonemes) < 2:
                continue

            word_dur = word["end"] - word["start"]
            if word_dur <= 0.01:
                continue

            vowel_idxs = []
            consonant_idxs = []
            for idx, p in enumerate(phonemes):
                if p["phoneme"] in _VOWELS:
                    vowel_idxs.append(idx)
                else:
                    consonant_idxs.append(idx)

            if not vowel_idxs or not consonant_idxs:
                continue

            vowel_time = sum(
                phonemes[idx]["end"] - phonemes[idx]["start"] for idx in vowel_idxs
            )
            vowel_share = vowel_time / word_dur

            if vowel_share >= MIN_VOWEL_SHARE:
                continue

            # Consonant base durations (seconds).
            CONS_BASE = {
                "plosive": 0.055, "fricative": 0.070, "liquid": 0.065,
                "glide": 0.060, "nasal": 0.060, "stop": 0.045,
            }
            PLOSIVES = {"B", "P"}
            FRICATIVES = {"F", "V", "S", "Z", "SH", "ZH", "TH", "DH", "HH"}
            LIQUIDS = {"L", "R"}
            GLIDES = {"W", "WH", "Y"}
            NASALS = {"M", "N", "NG"}

            def _cons_category(ph):
                if ph in PLOSIVES: return "plosive"
                if ph in FRICATIVES: return "fricative"
                if ph in LIQUIDS: return "liquid"
                if ph in GLIDES: return "glide"
                if ph in NASALS: return "nasal"
                return "stop"

            cons_durations = {}
            total_cons = 0.0
            for idx in consonant_idxs:
                base = CONS_BASE[_cons_category(phonemes[idx]["phoneme"])]
                cons_durations[idx] = base
                total_cons += base

            if total_cons >= word_dur * 0.65:
                scale = (word_dur * 0.55) / total_cons
                for idx in consonant_idxs:
                    cons_durations[idx] *= scale
                total_cons = sum(cons_durations[idx] for idx in consonant_idxs)

            vowel_total = word_dur - total_cons
            weights = [1.5 if j == 0 else 1.0 for j in range(len(vowel_idxs))]
            total_weight = sum(weights)

            vowel_durations = {}
            for j, idx in enumerate(vowel_idxs):
                vowel_durations[idx] = vowel_total * weights[j] / total_weight

            cursor = word["start"]
            for idx in range(len(phonemes)):
                if idx in cons_durations:
                    dur = cons_durations[idx]
                elif idx in vowel_durations:
                    dur = vowel_durations[idx]
                else:
                    dur = phonemes[idx]["end"] - phonemes[idx]["start"]
                phonemes[idx]["start"] = round(cursor, 4)
                phonemes[idx]["end"] = round(cursor + dur, 4)
                cursor += dur

            phonemes[-1]["end"] = word["end"]
            fixed_count += 1

        if fixed_count:
            print(
                f"Duration sanity: redistributed {fixed_count} words "
                f"where vowels were compressed",
                file=sys.stderr,
            )

        return results

    # ── Onset refinement ────────────────────────────────────────────

    def _refine_with_onsets(self, waveform, results):
        """Post-process boundaries using spectral onset detection.

        Searches ±55ms around word boundaries and ±25ms around phoneme
        boundaries, snapping to the nearest spectral onset at ~8ms
        resolution via torch STFT spectral flux.
        """
        if not results:
            return results

        try:
            return self._refine_with_onsets_impl(waveform, results)
        except Exception as e:
            print(
                f"Onset refinement failed, returning raw results: {e}",
                file=sys.stderr,
            )
            return results

    def _refine_with_onsets_impl(self, waveform, results):
        """Inner implementation of onset refinement."""
        sr = self.sample_rate

        HOP = max(1, sr // 2000)  # ~8ms frames at any sample rate
        N_FFT = min(2048, sr // 4) * 2  # reasonable FFT size

        mono = waveform.squeeze(0)
        window = torch.hann_window(N_FFT, device=mono.device)
        stft = torch.stft(
            mono, n_fft=N_FFT, hop_length=HOP, window=window,
            return_complex=True,
        )
        mag = stft.abs()
        flux = torch.diff(mag, dim=-1)
        flux = torch.clamp(flux, min=0)
        onset_env = flux.median(dim=0).values.cpu().numpy()
        del stft, mag, flux
        total_onset_frames = len(onset_env)
        if total_onset_frames < 10:
            return results

        onset_mean = float(np.mean(onset_env))
        onset_std = float(np.std(onset_env))
        min_peak_strength = onset_mean + 0.25 * onset_std

        def time_to_frame(t):
            return min(max(0, int(t * sr / HOP)), total_onset_frames - 1)

        def frame_to_time(f):
            return f * HOP / sr

        WORD_RADIUS_S = 0.055
        PHONEME_RADIUS_S = 0.025

        # Phase 1: Refine word START boundaries.
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

            win = onset_env[lo:hi]
            peak_local = int(np.argmax(win))

            if win[peak_local] >= min_peak_strength:
                refined_start = frame_to_time(lo + peak_local)
                word["start"] = round(refined_start, 4)
                total_delta_ms += abs(refined_start - original_start) * 1000
                refined_count += 1

        # Phase 2: Prevent overlaps but preserve natural gaps.
        results.sort(key=lambda w: w["start"])

        for i in range(len(results) - 1):
            if results[i]["end"] > results[i + 1]["start"]:
                results[i]["end"] = results[i + 1]["start"]

        for word in results:
            if word["end"] <= word["start"]:
                word["end"] = round(word["start"] + 0.05, 4)

        # Phase 3: Refine phoneme boundaries within each word.
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

            phonemes[0]["start"] = word_start

            for j in range(1, len(phonemes)):
                ctc_boundary = phonemes[j]["start"]
                center = time_to_frame(ctc_boundary)
                radius = max(1, int(PHONEME_RADIUS_S * sr / HOP))
                lo = max(0, center - radius)
                hi = min(total_onset_frames, center + radius + 1)

                if hi - lo < 2:
                    continue

                win = onset_env[lo:hi]
                peak_local = int(np.argmax(win))

                if win[peak_local] >= min_peak_strength * 0.5:
                    candidate = frame_to_time(lo + peak_local)
                    min_start = phonemes[j - 1]["start"] + 0.005
                    remaining = len(phonemes) - j
                    max_start = word_end - remaining * 0.005
                    candidate = max(min_start, min(candidate, max_start))
                    phonemes[j]["start"] = round(candidate, 4)
                    phoneme_refined += 1

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

    # ── Shared helpers ──────────────────────────────────────────────

    def _distribute_evenly(self, phonemes_sofa, start_s, end_s):
        """Evenly distribute phonemes across a time range (last resort)."""
        if not phonemes_sofa:
            return []

        duration = end_s - start_s
        n = len(phonemes_sofa)
        step = duration / n

        result = []
        for i, ph in enumerate(phonemes_sofa):
            arpabet = SOFA_TO_ARPABET.get(ph, ph.upper())
            result.append({
                "phoneme": arpabet,
                "start": round(start_s + i * step, 4),
                "end": round(start_s + (i + 1) * step, 4),
            })
        return result

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
