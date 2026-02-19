"""
Force-Align Wordstamps — Cog model for Replicate.

Word-level forced alignment using Whisper medium + stable-ts.
Based on cureau/force-align-wordstamps with a fix for the refine crash
on short/empty audio segments (RuntimeError: tensor [1, 2, 0]).
Refinement uses Whisper's own token probability re-computation.

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
        self.model = stable_whisper.load_model("medium", device=self.device)

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
        adjust_by_silence: bool = Input(
            description=(
                "Trim word boundaries to silence edges using Silero VAD. "
                "Lightweight post-pass — no extra Whisper inference. "
                "Recommended for tighter boundaries without the cost of refine()."
            ),
            default=True,
        ),
        refine: bool = Input(
            description=(
                "Run stable-ts refine() after alignment to tighten word boundaries. "
                "Adds thousands of Whisper forward passes — significantly slower on T4. "
                "Leave off unless you need sub-100ms precision."
            ),
            default=False,
        ),
    ) -> str:
        """Align transcript words to audio and return word-level timestamps."""
        audio_path = str(audio_file)

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

        silence_adjusted = False
        if adjust_by_silence:
            result, silence_adjusted = self._adjust_by_silence(audio_path, result)

        refined = False
        if refine:
            result, refined = self._refine(audio_path, result)

        return json.dumps({
            "wordstamps": self._extract_words(result, show_probabilities),
            "silence_adjusted": silence_adjusted,
            "refined": refined,
        })

    def _adjust_by_silence(self, audio_path, result):
        """Trim word boundaries to silence edges.

        Much cheaper than refine() — no Whisper forward passes. Walks each
        word boundary and snaps it to the nearest silence/speech transition.
        Returns (result, adjusted: bool).
        """
        try:
            # vad=False uses quantization-based silence detection — no Silero
            # inference, no GPU memory. The align() call already used vad=True
            # for speech detection; this post-pass just needs silence edges.
            result.adjust_by_silence(audio_path, vad=False)
            return result, True
        except Exception as e:
            print(
                f"adjust_by_silence failed (using raw boundaries): {e}",
                file=sys.stderr,
            )
            return result, False

    def _refine(self, audio_path, result):
        """Refine timestamps using Whisper's own token probabilities.

        stable-ts refine() iteratively mutes audio portions and re-computes
        token probabilities to find the most precise start/end boundaries.
        Uses the same Whisper model loaded in setup().

        Returns (result, refined: bool) so callers can surface whether
        refinement actually ran or silently fell back.
        """
        try:
            return self.model.refine(audio_path, result), True
        except (RuntimeError, Exception) as e:
            print(
                f"Refine step failed (using unrefined results): {e}",
                file=sys.stderr,
            )
            return result, False

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
