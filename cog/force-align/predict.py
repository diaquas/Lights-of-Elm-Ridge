"""
Force-Align Wordstamps — Cog model for Replicate.

Word-level forced alignment using Whisper small + stable-ts + wav2vec2-large-xlsr.
Based on cureau/force-align-wordstamps with a fix for the refine crash
on short/empty audio segments (RuntimeError: tensor [1, 2, 0]).

Deploy:
  cog login
  cog push r8.im/diaquas/force-align
"""

import json
import os
import sys

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
from cog import BasePredictor, Input, Path  # noqa: E402


class Predictor(BasePredictor):
    def setup(self):
        """Load models on cold start — Whisper + Silero VAD."""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = stable_whisper.load_model("small", device=self.device)

        # Pre-load Silero VAD from the cached copy baked into the image.
        # Without this, the first predict() with vad=True triggers a
        # torch.hub.load() download from GitHub which can crash the worker.
        torch.hub.load("snakers4/silero-vad", "silero_vad", trust_repo=True)

    def predict(
        self,
        audio_file: Path = Input(description="Audio file (.wav, .mp3, etc.)"),
        transcript: str = Input(description="Plain text lyrics/transcript to align"),
        show_probabilities: bool = Input(
            description="Include per-word confidence scores",
            default=True,
        ),
    ) -> str:
        """Align transcript words to audio and return word-level timestamps."""
        # Run forced alignment with VAD-based silence detection.
        # vad=True uses Silero VAD to robustly detect speech vs silence,
        # which prevents crashes and bad timestamps on isolated vocal stems
        # that have long dead spaces between phrases.
        try:
            result = self.model.align(
                str(audio_file),
                transcript,
                language="en",
                vad=True,
            )
        except Exception as e:
            # align() can crash on silent/empty audio segments.
            # Return empty wordstamps so the client falls back gracefully.
            print(f"Align failed: {e}", file=sys.stderr)
            return json.dumps({"wordstamps": [], "error": str(e)})

        # Refine timestamps for better precision — wrap in try/except
        # because stable_whisper.refine() crashes on certain audio segments
        # with RuntimeError: tensor [1, 2, 0] (empty audio slice).
        # The alignment results are already usable without refinement.
        try:
            result = self.model.refine(
                str(audio_file),
                result,
                model_name="jonatasgrosman/wav2vec2-large-xlsr-53-english",
            )
        except (RuntimeError, Exception) as e:
            print(f"Refine step failed (using unrefined results): {e}", file=sys.stderr)

        # Extract word-level timestamps
        wordstamps = []
        for segment in result.segments:
            for word in segment.words:
                entry = {
                    "word": word.word.strip(),
                    "start": round(word.start, 4),
                    "end": round(word.end, 4),
                }
                if show_probabilities and hasattr(word, "probability"):
                    entry["probability"] = round(word.probability, 4)
                wordstamps.append(entry)

        return json.dumps({"wordstamps": wordstamps})
