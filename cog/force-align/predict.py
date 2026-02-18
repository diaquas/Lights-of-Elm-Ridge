"""
Force-Align Wordstamps — Cog model for Replicate.

Word-level forced alignment using stable-ts + wav2vec2.
Based on cureau/force-align-wordstamps with a fix for the refine crash
on short/empty audio segments (RuntimeError: tensor [1, 2, 0]).

Deploy:
  cog login
  cog push r8.im/diaquas/force-align
"""

import json
import sys

import stable_whisper
import torch
from cog import BasePredictor, Input, Path


class Predictor(BasePredictor):
    def setup(self):
        """Load the Whisper model on cold start."""
        self.model = stable_whisper.load_model("base", device="cuda" if torch.cuda.is_available() else "cpu")

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
        # Run forced alignment
        result = self.model.align(
            str(audio_file),
            transcript,
            language="en",
        )

        # Refine timestamps for better precision — wrap in try/except
        # because stable_whisper.refine() crashes on certain audio segments
        # with RuntimeError: tensor [1, 2, 0] (empty audio slice).
        # The alignment results are already usable without refinement.
        try:
            result = self.model.refine(str(audio_file), result)
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
