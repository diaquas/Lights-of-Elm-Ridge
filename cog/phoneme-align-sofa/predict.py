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

# ── VAD-based chunking constants ─────────────────────────────────
#
# SOFA's tgm_en_v100 checkpoint degrades noticeably on inputs longer
# than ~45 s (confidence drops, boundary drift on held notes).
# When audio exceeds _CHUNK_THRESHOLD_S we split at silence
# boundaries so each chunk stays ≤ _MAX_CHUNK_S.

_CHUNK_THRESHOLD_S = 45.0   # trigger chunking above this duration
_MAX_CHUNK_S = 20.0          # target maximum chunk length (T4 16 GB OOMs above ~25 s)
_MIN_SILENCE_S = 0.25        # minimum gap to consider as split point
_CHUNK_PADDING_S = 0.5       # audio padding on each side of chunk


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
            return self._align_full(waveform, transcript, refine_onsets, line_times)
        else:
            return json.dumps({
                "words": [],
                "error": "No transcript or line_timestamps provided",
            })

    # ── Full-file SOFA alignment (preferred path) ───────────────────

    def _align_full(self, waveform, transcript, refine_onsets=True, line_times=None):
        """Full-file SOFA alignment — with automatic chunking for long audio.

        For audio ≤ _CHUNK_THRESHOLD_S: single-pass alignment (original path).
        For longer audio: VAD-based chunking → per-chunk alignment → stitch.
        When line_times are available, word distribution uses known line
        positions instead of the voiced-duration heuristic.
        """
        mono_cpu = waveform.squeeze(0)
        wav_length = mono_cpu.shape[0] / self.sample_rate

        words = transcript.strip().split()
        if not words:
            return json.dumps({"words": [], "error": "Empty transcript"})

        # Long audio → chunked path.
        if wav_length > _CHUNK_THRESHOLD_S:
            return self._align_full_chunked(
                waveform, words, wav_length, refine_onsets, line_times,
            )

        # ── Short audio: single-pass (original behaviour) ─────────
        mono = mono_cpu.to(self.device)

        ph_seq, word_seq, ph_idx_to_word_idx = self._build_phoneme_sequence(words)

        if len(ph_seq) < 2:
            return json.dumps({"words": [], "error": "No valid phonemes found"})

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

    # ── VAD-based chunked alignment ────────────────────────────────

    def _align_full_chunked(self, waveform, words, wav_length, refine_onsets, line_times=None):
        """Chunked SOFA alignment for audio exceeding _CHUNK_THRESHOLD_S.

        Pipeline:
          1. Detect silence regions via RMS energy envelope
          2. Build chunks:
             a. Line-aware (preferred): group consecutive LRCLIB lines
                into ≤ _MAX_CHUNK_S spans, splitting only at line
                boundaries.  Words come directly from line texts —
                no fabricated word positions.
             b. Silence-based (fallback): split at silence centres,
                distribute words proportionally by voiced duration.
          3. Run SOFA independently on each chunk
          4. Offset timestamps to absolute time and stitch results
        """
        mono_cpu = waveform.squeeze(0)

        silences = self._detect_silences(mono_cpu)

        if line_times:
            line_chunks = self._build_line_aware_chunks(
                line_times, wav_length, silences,
            )
            chunks = [{"start": c["start"], "end": c["end"]} for c in line_chunks]
            word_groups = [c["words"] for c in line_chunks]
            dist_mode = "line-aware"
        else:
            chunks = self._build_chunks(wav_length, silences)
            word_groups = self._distribute_words_to_chunks(words, chunks, silences)
            dist_mode = "voiced-duration (no line timestamps)"

        total_words = sum(len(g) for g in word_groups)
        print(
            f"Chunked alignment: {wav_length:.1f}s → {len(chunks)} chunks "
            f"({len(silences)} silence gaps detected), {total_words} words, "
            f"distribution={dist_mode}",
            file=sys.stderr,
        )

        all_results = []

        for i, (chunk, chunk_words) in enumerate(zip(chunks, word_groups)):
            if not chunk_words:
                print(
                    f"  Chunk {i + 1}/{len(chunks)}: skipped (no words)",
                    file=sys.stderr,
                )
                continue

            # Extract segment with padding so edge words aren't clipped.
            seg_start = max(0.0, chunk["start"] - _CHUNK_PADDING_S)
            seg_end = min(wav_length, chunk["end"] + _CHUNK_PADDING_S)
            start_sample = int(seg_start * self.sample_rate)
            end_sample = min(
                int(seg_end * self.sample_rate), mono_cpu.shape[0],
            )

            if end_sample <= start_sample + self.sample_rate // 10:
                continue

            segment = mono_cpu[start_sample:end_sample].to(self.device)
            seg_length = segment.shape[0] / self.sample_rate

            ph_seq, word_seq, ph_idx_to_word_idx = (
                self._build_phoneme_sequence(chunk_words)
            )
            if len(ph_seq) < 2:
                continue
            ph_seq, ph_idx_to_word_idx = self._filter_vocab(
                ph_seq, ph_idx_to_word_idx,
            )

            try:
                melspec = self._prepare_melspec(segment)

                with torch.inference_mode():
                    (
                        ph_seq_pred, ph_intervals_pred,
                        word_seq_pred, word_intervals_pred,
                        confidence, _, _,
                    ) = self.model._infer_once(
                        melspec, seg_length,
                        ph_seq, word_seq, ph_idx_to_word_idx,
                    )

                # Free GPU memory before next chunk.
                del segment, melspec
                if self.device == "cuda":
                    torch.cuda.empty_cache()

                # Offset intervals to absolute time.
                if len(ph_intervals_pred) > 0:
                    ph_intervals_pred = ph_intervals_pred + seg_start
                if len(word_intervals_pred) > 0:
                    word_intervals_pred = word_intervals_pred + seg_start

                chunk_results = self._sofa_to_json(
                    word_seq_pred, word_intervals_pred,
                    ph_seq_pred, ph_intervals_pred,
                )
                all_results.extend(chunk_results)

                print(
                    f"  Chunk {i + 1}/{len(chunks)}: {len(chunk_words)} words, "
                    f"{chunk['end'] - chunk['start']:.1f}s "
                    f"(padded {seg_length:.1f}s), "
                    f"confidence={confidence:.3f}",
                    file=sys.stderr,
                )

            except Exception as e:
                # Ensure GPU memory is freed even on failure.
                segment = None
                if self.device == "cuda":
                    torch.cuda.empty_cache()

                print(
                    f"  Chunk {i + 1}/{len(chunks)} failed: {e} — "
                    f"falling back to even distribution",
                    file=sys.stderr,
                )
                chunk_dur = chunk["end"] - chunk["start"]
                n = len(chunk_words)
                for j, w in enumerate(chunk_words):
                    ws = chunk["start"] + (j / n) * chunk_dur
                    we = chunk["start"] + ((j + 1) / n) * chunk_dur
                    phonemes = self._lookup_phonemes_sofa(w)
                    all_results.append({
                        "word": w,
                        "start": round(ws, 4),
                        "end": round(we, 4),
                        "phonemes": self._distribute_evenly(
                            phonemes, ws, we,
                        ),
                    })

        print(
            f"Chunked alignment complete: {len(all_results)} words total",
            file=sys.stderr,
        )

        if all_results:
            all_results = self._enforce_vowel_duration(all_results)
        if refine_onsets and all_results:
            all_results = self._refine_with_onsets(waveform, all_results)

        return json.dumps({"words": all_results})

    # ── Silence detection ──────────────────────────────────────────

    def _detect_silences(self, waveform_1d):
        """Detect silence regions via RMS energy envelope.

        Uses vectorised frame extraction (torch.unfold) for speed.
        Returns a list of dicts with start/end/center/duration for each
        silence gap ≥ _MIN_SILENCE_S.
        """
        sr = self.sample_rate
        frame_size = int(0.025 * sr)   # 25 ms frames
        hop = int(0.010 * sr)          # 10 ms hop

        wav = waveform_1d.float()
        if wav.device.type != "cpu":
            wav = wav.cpu()

        # Vectorised RMS: unfold into (n_frames, frame_size), then RMS.
        frames = wav.unfold(0, frame_size, hop)
        energies = torch.sqrt(torch.mean(frames ** 2, dim=1)).numpy()

        # Adaptive threshold.  The 15th-percentile captures the noise
        # floor; 3× that catches inter-phrase dips.  Clamped to
        # [0.5 %, 2 %] of peak energy so it works across dynamics.
        noise_floor = float(np.percentile(energies, 15))
        peak = float(np.max(energies)) if len(energies) else 1.0
        threshold = np.clip(noise_floor * 3.0, peak * 0.005, peak * 0.02)

        is_silent = energies < threshold

        silences = []
        in_silence = False
        silence_start_frame = 0

        for i in range(len(is_silent)):
            if is_silent[i] and not in_silence:
                silence_start_frame = i
                in_silence = True
            elif not is_silent[i] and in_silence:
                start_s = silence_start_frame * hop / sr
                end_s = i * hop / sr
                duration = end_s - start_s
                if duration >= _MIN_SILENCE_S:
                    silences.append({
                        "start": start_s,
                        "end": end_s,
                        "center": (start_s + end_s) / 2,
                        "duration": duration,
                    })
                in_silence = False

        # Trailing silence.
        if in_silence:
            start_s = silence_start_frame * hop / sr
            end_s = waveform_1d.shape[0] / sr
            duration = end_s - start_s
            if duration >= _MIN_SILENCE_S:
                silences.append({
                    "start": start_s,
                    "end": end_s,
                    "center": (start_s + end_s) / 2,
                    "duration": duration,
                })

        return silences

    # ── Chunk construction ─────────────────────────────────────────

    def _build_chunks(self, audio_duration_s, silences):
        """Split audio into chunks ≤ _MAX_CHUNK_S at silence boundaries.

        Greedy: walk forward from 0, always picking the *latest* silence
        centre that keeps the chunk within budget.  Falls back to even
        splitting if no silences are available.
        """
        max_s = _MAX_CHUNK_S

        if not silences:
            n = max(1, int(np.ceil(audio_duration_s / max_s)))
            step = audio_duration_s / n
            return [
                {"start": round(i * step, 4), "end": round((i + 1) * step, 4)}
                for i in range(n)
            ]

        split_points = sorted(set(round(s["center"], 4) for s in silences))

        chunks = []
        chunk_start = 0.0

        while chunk_start < audio_duration_s - 0.1:
            limit = chunk_start + max_s

            if limit >= audio_duration_s:
                chunks.append({
                    "start": round(chunk_start, 4),
                    "end": round(audio_duration_s, 4),
                })
                break

            # Latest split point within budget.
            best = None
            for sp in split_points:
                if sp <= chunk_start:
                    continue
                if sp > limit:
                    break
                best = sp

            if best is not None:
                chunks.append({
                    "start": round(chunk_start, 4),
                    "end": round(best, 4),
                })
                chunk_start = best
            else:
                # No silence in range — force split at limit.
                chunks.append({
                    "start": round(chunk_start, 4),
                    "end": round(limit, 4),
                })
                chunk_start = limit

        return chunks if chunks else [{"start": 0.0, "end": audio_duration_s}]

    # ── Word distribution across chunks ────────────────────────────

    def _distribute_words_to_chunks(self, words, chunks, silences):
        """Assign words to chunks proportionally by voiced duration.

        Chunks with more silence overlap (instrumental breaks, etc.)
        receive proportionally fewer words.  Uses cumulative rounding
        so every word is assigned exactly once.
        """
        # Voiced duration per chunk = total − silence overlap.
        voiced_per_chunk = []
        for chunk in chunks:
            total = chunk["end"] - chunk["start"]
            silence_overlap = 0.0
            for s in silences:
                ov_start = max(s["start"], chunk["start"])
                ov_end = min(s["end"], chunk["end"])
                if ov_end > ov_start:
                    silence_overlap += ov_end - ov_start
            voiced_per_chunk.append(max(total - silence_overlap, 0.01))

        total_voiced = sum(voiced_per_chunk)
        if total_voiced <= 0:
            total_voiced = sum(c["end"] - c["start"] for c in chunks)

        # Cumulative proportional assignment avoids rounding drift.
        groups = []
        cursor = 0
        cum_share = 0.0

        for i, voiced in enumerate(voiced_per_chunk):
            cum_share += voiced / total_voiced
            if i == len(chunks) - 1:
                target = len(words)
            else:
                target = round(cum_share * len(words))
            n = max(0, target - cursor)
            groups.append(list(words[cursor : cursor + n]))
            cursor += n

        return groups

    # ── Line-aware chunk construction ──────────────────────────────

    def _build_line_aware_chunks(self, line_times, audio_duration_s, silences):
        """Build chunks aligned to LRCLIB line boundaries.

        Groups consecutive lines into chunks where the span from the
        first line's start to the last line's end stays ≤ _MAX_CHUNK_S.
        Each chunk carries the complete words for its lines — no
        fabricated word positions, no mid-line splits.

        Line "end" is the next line's startMs.  For the final line,
        uses the first silence gap detected after the line, falling
        back to audio_duration_s.

        Returns:
            List of dicts: {"start", "end", "words"} for each chunk.
        """
        if not line_times:
            return []

        # Pre-compute per-line bounds and words.
        line_bounds = []
        for i, lt in enumerate(line_times):
            start_s = lt["startMs"] / 1000
            words = lt["text"].strip().split()
            if not words:
                continue

            if i + 1 < len(line_times):
                end_s = line_times[i + 1]["startMs"] / 1000
            else:
                # Last line: use first silence gap after line starts.
                end_s = audio_duration_s
                for s in silences:
                    if s["start"] > start_s + 0.5:
                        end_s = s["start"]
                        break

            line_bounds.append({
                "start": start_s,
                "end": end_s,
                "words": words,
            })

        if not line_bounds:
            return []

        # Greedily group lines into chunks ≤ _MAX_CHUNK_S.
        chunks = []
        group_start = 0

        for i in range(1, len(line_bounds)):
            span = line_bounds[i]["end"] - line_bounds[group_start]["start"]
            if span > _MAX_CHUNK_S:
                # Close current group: lines group_start .. i-1.
                chunk_words = []
                for j in range(group_start, i):
                    chunk_words.extend(line_bounds[j]["words"])
                chunks.append({
                    "start": line_bounds[group_start]["start"],
                    "end": line_bounds[i - 1]["end"],
                    "words": chunk_words,
                })
                group_start = i

        # Final group.
        chunk_words = []
        for j in range(group_start, len(line_bounds)):
            chunk_words.extend(line_bounds[j]["words"])
        chunks.append({
            "start": line_bounds[group_start]["start"],
            "end": line_bounds[-1]["end"],
            "words": chunk_words,
        })

        line_dist = [len(c["words"]) for c in chunks]
        print(
            f"  Line-aware chunks: {line_dist} words across {len(chunks)} chunks "
            f"(from {len(line_bounds)} lines)",
            file=sys.stderr,
        )

        return chunks

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

                # Free GPU memory before next line.
                del mono, melspec
                if self.device == "cuda":
                    torch.cuda.empty_cache()

                line_results = self._sofa_to_json(
                    word_seq_pred, word_intervals_pred,
                    ph_seq_pred, ph_intervals_pred,
                )
                results.extend(line_results)

            except Exception as e:
                # Ensure GPU memory is freed even on failure.
                mono = None
                if self.device == "cuda":
                    torch.cuda.empty_cache()
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

                # Free GPU memory before next word.
                del mono, melspec
                if self.device == "cuda":
                    torch.cuda.empty_cache()

                # Offset to absolute time and build phoneme list.
                phoneme_timings = []
                for j in range(len(ph_seq_pred)):
                    ph = str(ph_seq_pred[j])
                    if ph == "SP":
                        continue
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
                # Ensure GPU memory is freed even on failure.
                mono = None
                if self.device == "cuda":
                    torch.cuda.empty_cache()
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
                ph_cursor += 1

                # Skip silence markers — SP is not a valid ARPAbet phoneme.
                if ph == "SP":
                    continue

                arpabet = SOFA_TO_ARPABET.get(ph, ph.upper())

                phonemes.append({
                    "phoneme": arpabet,
                    "start": round(ph_start, 4),
                    "end": round(min(ph_end, word_end), 4),
                })

            results.append({
                "word": str(word_seq[i]),
                "start": round(word_start, 4),
                "end": round(word_end, 4),
                "phonemes": phonemes,
            })

        return results

    # ── Duration sanity check ───────────────────────────────────────

    def _get_vowel_stress_pattern(self, word_text):
        """Look up CMUdict stress digits for each vowel in a word.

        Returns a list of stress levels (0=unstressed, 1=primary, 2=secondary)
        for each vowel phoneme, in order.  Falls back to a heuristic if the
        word isn't in CMUdict: first vowel gets primary stress (1), rest get
        unstressed (0).
        """
        clean = word_text.lower().strip(".,!?;:'\"()-")
        if not clean:
            return []

        # CMUdict stores stress digits on vowels: AA1, EH0, IY2, etc.
        if clean in self.cmu_dict:
            stresses = []
            for ph in self.cmu_dict[clean]:
                if ph and ph[-1] in "012":
                    stresses.append(int(ph[-1]))
            return stresses

        # SOFA dict doesn't carry stress — fall back to first-vowel heuristic.
        phonemes = self._lookup_phonemes_sofa(clean)
        vowel_count = sum(
            1 for ph in phonemes
            if SOFA_TO_ARPABET.get(ph, ph.upper()) in _VOWELS
        )
        if vowel_count == 0:
            return []
        # First vowel primary, rest unstressed.
        return [1] + [0] * (vowel_count - 1)

    # ── Stress-to-weight mapping ───────────────────────────────────
    # Primary-stress vowels carry the sung pitch and get the most time.
    # Secondary stress gets moderate weight. Unstressed vowels (schwas,
    # reduced vowels) are naturally shorter in singing.
    _STRESS_WEIGHTS = {1: 1.6, 2: 1.2, 0: 0.7}

    def _enforce_vowel_duration(self, results):
        """Ensure vowels get proportional duration in singing.

        SOFA is better than CTC at vowel placement, but can still
        compress vowels on fast passages. This redistributes time
        using CMUdict stress markers to weight vowel durations:
          - Primary stress (1) → 1.6× weight (carries the sung pitch)
          - Secondary stress (2) → 1.2× weight
          - Unstressed (0) → 0.7× weight (reduced vowels, schwas)

        Only fires when vowels get < 35% of word duration.
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

            # Use CMUdict stress markers to weight vowel durations.
            stress_pattern = self._get_vowel_stress_pattern(word.get("word", ""))
            weights = []
            for j in range(len(vowel_idxs)):
                if j < len(stress_pattern):
                    weights.append(self._STRESS_WEIGHTS.get(stress_pattern[j], 1.0))
                else:
                    # No stress info for this vowel — neutral weight.
                    weights.append(1.0)
            total_weight = sum(weights) or 1.0

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
                f"where vowels were compressed (CMUdict stress-weighted)",
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
