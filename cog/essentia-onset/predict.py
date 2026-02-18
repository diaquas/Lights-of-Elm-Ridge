"""
Essentia Onset Detection — Cog model for Replicate.

Accepts an audio stem file (.wav) and runs Essentia's onset detection,
beat tracking, and BPM estimation. Tuned per stem type (drums, bass, other).

For drums, also runs sub-band onset detection for kick, snare, and hi-hat
using bandpass filtering + HFC onset detection.

Deploy:
  cog login
  cog push r8.im/diaquas/essentia-onset
"""

import json
import os

# Prevent OpenMP / FFTW / BLAS thread-pool deadlocks in container environments.
# Must be set BEFORE importing essentia (C++ backend initializes threads on import).
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("FFTW_NUM_THREADS", "1")
os.environ.setdefault("NUMBA_NUM_THREADS", "1")

import essentia.standard as es  # noqa: E402
import numpy as np  # noqa: E402
from cog import BasePredictor, Input, Path  # noqa: E402
from scipy.signal import butter, sosfiltfilt  # noqa: E402


class Predictor(BasePredictor):
    def setup(self):
        """Warm up Essentia on cold start."""
        pass

    def predict(
        self,
        audio: Path = Input(description="Audio stem file (.wav or .mp3)"),
        stem_type: str = Input(
            description="Type of stem for algorithm tuning",
            choices=["drums", "bass", "other"],
            default="drums",
        ),
        onset_threshold: float = Input(
            description="Onset detection sensitivity (0.0=more onsets, 1.0=fewer)",
            default=0.5,
            ge=0.0,
            le=1.0,
        ),
    ) -> str:
        # Load audio at 44100 Hz mono
        audio_data = es.MonoLoader(filename=str(audio), sampleRate=44100)()

        results = {}

        # --- Onset Detection (tuned per stem type) ---
        method_map = {
            "drums": "hfc",  # High Frequency Content — best for percussive
            "bass": "complex",  # Complex domain — better for tonal onsets
            "other": "melflux",  # Mel flux — general purpose melodic
        }
        method = method_map.get(stem_type, "complex")
        onsets = self._detect_onsets(audio_data, method, onset_threshold)
        results["onsets"] = onsets

        # --- Drum sub-bands (kick, snare, hi-hat) ---
        if stem_type == "drums":
            results["kick_onsets"] = self._band_onsets(
                audio_data, 20, 150, onset_threshold
            )
            results["snare_onsets"] = self._band_onsets(
                audio_data, 200, 2000, onset_threshold
            )
            results["hihat_onsets"] = self._band_onsets(
                audio_data, 5000, 15000, onset_threshold
            )

        # --- Beat / BPM Detection ---
        rhythm = es.RhythmExtractor2013(method="multifeature")(audio_data)
        results["bpm"] = round(float(rhythm[0]), 1)
        results["beats"] = [round(float(t), 4) for t in rhythm[1]]
        results["beat_confidence"] = round(float(rhythm[2]), 3)

        return json.dumps(results)

    def _detect_onsets(self, audio_data, method, threshold):
        """Run frame-by-frame onset detection and return onset times (seconds)."""
        od = es.OnsetDetection(method=method)
        w = es.Windowing(type="hann")
        fft = es.FFT()
        c2p = es.CartesianToPolar()

        onset_features = []
        for frame in es.FrameGenerator(audio_data, frameSize=1024, hopSize=512):
            mag, phase = c2p(fft(w(frame)))
            onset_features.append(od(mag, phase))

        onset_matrix = np.array([onset_features])
        weights = np.array([1.0])
        onsets = es.Onsets(alpha=threshold)(onset_matrix, weights)

        return [round(float(t), 4) for t in onsets]

    def _band_onsets(self, audio_data, low_hz, high_hz, threshold):
        """Detect onsets in a specific frequency band using bandpass filter."""
        filtered = self._bandpass(audio_data, low_hz, high_hz)
        return self._detect_onsets(filtered, "hfc", threshold)

    @staticmethod
    def _bandpass(audio, low_hz, high_hz, sr=44100, order=4):
        """Apply a Butterworth bandpass filter."""
        nyq = sr / 2.0
        low = max(low_hz / nyq, 0.001)
        high = min(high_hz / nyq, 0.999)
        sos = butter(order, [low, high], btype="band", output="sos")
        return sosfiltfilt(sos, audio).astype(np.float32)
