"""
Force-Align Wordstamps — Cog model for Replicate.

Word-level forced alignment using Whisper medium + stable-ts.
Based on cureau/force-align-wordstamps with a fix for the refine crash
on short/empty audio segments (RuntimeError: tensor [1, 2, 0]).
Refinement uses Whisper's own token probability re-computation.

Supports section-chunked alignment: when the caller provides section
boundaries (from Essentia's song-structure detection), each section is
aligned independently against its own audio window. This prevents the
aligner from confusing repeated phrases across chorus/verse repetitions.

Deploy:
  cog login
  cog push r8.im/diaquas/force-align
"""

import json
import os
import sys
import tempfile

# Prevent OpenMP / TBB / BLAS thread-pool deadlocks in container environments.
# Must be set BEFORE importing torch (C++ backend initializes threads on import).
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("NUMBA_NUM_THREADS", "1")
# Force numba to use workqueue backend — the bundled TBB (12050) is older than
# the version numba requires (>= 12060), so TBB gets disabled at runtime.
os.environ.setdefault("NUMBA_THREADING_LAYER", "workqueue")

import stable_whisper  # noqa: E402
import torch  # noqa: E402
import torchaudio  # noqa: E402
from cog import BasePredictor, Input, Path  # noqa: E402


class Predictor(BasePredictor):
    def setup(self):
        """Load models on cold start — Whisper + Silero VAD."""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = stable_whisper.load_model("medium", device=self.device)

        # Pre-load Silero VAD from the cached copy baked into the image.
        # Without this, the first predict() with vad=True triggers a
        # torch.hub.load() download from GitHub which can crash the worker.
        torch.hub.load("snakers4/silero-vad", "silero_vad", trust_repo=True)

    def predict(
        self,
        audio_file: Path = Input(description="Audio file (.wav, .mp3, etc.)"),
        transcript: str = Input(description="Plain text lyrics/transcript to align"),
        sections: str = Input(
            description=(
                "Optional JSON array of section boundaries for chunked alignment. "
                'Each entry: {"start": seconds, "end": seconds, "text": "lyrics for this section"}. '
                "When provided, each section is aligned independently against its audio window."
            ),
            default="",
        ),
        show_probabilities: bool = Input(
            description="Include per-word confidence scores",
            default=True,
        ),
    ) -> str:
        """Align transcript words to audio and return word-level timestamps."""
        parsed_sections = self._parse_sections(sections)

        if parsed_sections:
            return self._align_chunked(
                str(audio_file), parsed_sections, show_probabilities
            )
        else:
            return self._align_full(
                str(audio_file), transcript, show_probabilities
            )

    def _align_full(self, audio_path, transcript, show_probs):
        """Original full-file alignment (fallback when no sections provided)."""
        try:
            result = self.model.align(
                audio_path,
                transcript,
                language="en",
                vad=True,
            )
        except Exception as e:
            print(f"Align failed: {e}", file=sys.stderr)
            return json.dumps({"wordstamps": [], "error": str(e)})

        result = self._refine(audio_path, result)
        return json.dumps({"wordstamps": self._extract_words(result, show_probs)})

    def _align_chunked(self, audio_path, sections, show_probs):
        """Align each section independently against its audio window.

        This is the key fix for repeated-phrase confusion: by slicing the
        audio to each section's time range and aligning only that section's
        lyrics, the model can never jump to a different repetition.

        Section timestamps are added back as offsets to produce a seamless
        word-level timeline across the full song.
        """
        # Load full audio once
        waveform, sr = torchaudio.load(audio_path)
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        all_wordstamps = []
        errors = []

        for i, section in enumerate(sections):
            text = section["text"].strip()
            if not text:
                continue

            start_s = section["start"]
            end_s = section["end"]
            start_sample = int(start_s * sr)
            end_sample = min(int(end_s * sr), waveform.shape[1])

            if end_sample <= start_sample:
                continue

            # Slice audio for this section
            chunk = waveform[:, start_sample:end_sample]

            # Write to temp file for stable-ts (expects a file path)
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                chunk_path = f.name
                torchaudio.save(chunk_path, chunk, sr)

            try:
                result = self.model.align(
                    chunk_path,
                    text,
                    language="en",
                    vad=True,
                )
                result = self._refine(chunk_path, result)
                words = self._extract_words(result, show_probs)

                # Offset all timestamps by the section start time
                for w in words:
                    w["start"] = round(w["start"] + start_s, 4)
                    w["end"] = round(w["end"] + start_s, 4)

                all_wordstamps.extend(words)

            except Exception as e:
                print(
                    f"Section {i} align failed ({start_s:.1f}-{end_s:.1f}s): {e}",
                    file=sys.stderr,
                )
                errors.append(f"section {i}: {e}")
            finally:
                try:
                    os.unlink(chunk_path)
                except OSError:
                    pass

        result = {"wordstamps": all_wordstamps}
        if errors:
            result["section_errors"] = errors
        return json.dumps(result)

    def _refine(self, audio_path, result):
        """Refine timestamps using Whisper's own token probabilities.

        stable-ts refine() iteratively mutes audio portions and re-computes
        token probabilities to find the most precise start/end boundaries.
        Uses the same Whisper model loaded in setup().
        """
        try:
            return self.model.refine(audio_path, result)
        except (RuntimeError, Exception) as e:
            print(
                f"Refine step failed (using unrefined results): {e}",
                file=sys.stderr,
            )
            return result

    @staticmethod
    def _extract_words(result, show_probs):
        """Extract word-level timestamps from a stable-ts result."""
        wordstamps = []
        for segment in result.segments:
            for word in segment.words:
                entry = {
                    "word": word.word.strip(),
                    "start": round(word.start, 4),
                    "end": round(word.end, 4),
                }
                if show_probs and hasattr(word, "probability"):
                    entry["probability"] = round(word.probability, 4)
                wordstamps.append(entry)
        return wordstamps

    @staticmethod
    def _parse_sections(sections_json):
        """Parse the sections JSON input, returning a list or None."""
        if not sections_json or not sections_json.strip():
            return None

        try:
            sections = json.loads(sections_json)
        except (json.JSONDecodeError, TypeError):
            print(f"Invalid sections JSON: {sections_json[:200]}", file=sys.stderr)
            return None

        if not isinstance(sections, list) or len(sections) == 0:
            return None

        # Validate structure
        valid = []
        for s in sections:
            if (
                isinstance(s, dict)
                and "start" in s
                and "end" in s
                and "text" in s
                and isinstance(s["text"], str)
                and s["text"].strip()
            ):
                valid.append(s)

        return valid if valid else None
