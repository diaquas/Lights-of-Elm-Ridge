"""
Essentia Onset Detection — Cog model for Replicate.

Accepts an audio stem file (.wav) and runs Essentia's onset detection,
beat tracking, BPM estimation, and song structure segmentation.
Tuned per stem type (drums, bass, guitar, piano, other).

For drums, runs sub-band onset detection for kick, snare, and hi-hat
using tight bandpass filters, per-band thresholds, and minimum-interval
deduplication to produce distinct sub-layer tracks.

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

# Drum sub-band configuration: tight frequency ranges, per-band thresholds,
# and minimum intervals to produce distinct onset tracks.
DRUM_BANDS = {
    "kick": {
        "low_hz": 20,
        "high_hz": 120,      # Kick fundamental lives 40-100 Hz
        "threshold": 0.6,    # Higher — kick is typically loudest
        "min_interval_ms": 180,  # Kicks rarely < 180ms apart
    },
    "snare": {
        "low_hz": 150,
        "high_hz": 450,      # Snare body 150-400 Hz (NOT 2kHz)
        "threshold": 0.45,   # Medium — snare varies more in level
        "min_interval_ms": 140,  # Snares rarely < 140ms apart
    },
    "hihat": {
        "low_hz": 6000,
        "high_hz": 16000,    # Hi-hat shimmer lives above 6kHz
        "threshold": 0.4,    # Lower — hi-hats are quieter
        "min_interval_ms": 80,  # Hi-hats can be fast (16th notes)
    },
}


class Predictor(BasePredictor):
    def setup(self):
        """Warm up Essentia on cold start."""
        pass

    def predict(
        self,
        audio: Path = Input(description="Audio stem file (.wav or .mp3)"),
        stem_type: str = Input(
            description="Type of stem for algorithm tuning",
            choices=["drums", "bass", "guitar", "piano", "other"],
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
            "drums": "hfc",      # High Frequency Content — best for percussive
            "bass": "complex",   # Complex domain — better for tonal onsets
            "guitar": "complex", # Complex domain — good for plucked/strummed tonal
            "piano": "complex",  # Complex domain — good for struck tonal onsets
            "other": "melflux",  # Mel flux — general purpose melodic
        }
        method = method_map.get(stem_type, "complex")
        onsets = self._detect_onsets(audio_data, method, onset_threshold)
        results["onsets"] = onsets

        # --- Drum sub-bands (kick, snare, hi-hat) ---
        if stem_type == "drums":
            for band_name, cfg in DRUM_BANDS.items():
                filtered = self._bandpass(
                    audio_data, cfg["low_hz"], cfg["high_hz"]
                )
                raw_onsets = self._detect_onsets(
                    filtered, "hfc", cfg["threshold"]
                )
                results[f"{band_name}_onsets"] = self._deduplicate(
                    raw_onsets, cfg["min_interval_ms"] / 1000.0
                )

        # --- Beat / BPM Detection ---
        rhythm = es.RhythmExtractor2013(method="multifeature")(audio_data)
        results["bpm"] = round(float(rhythm[0]), 1)
        results["beats"] = [round(float(t), 4) for t in rhythm[1]]
        results["beat_confidence"] = round(float(rhythm[2]), 3)

        # --- Song Structure Segmentation ---
        sections = self._detect_sections(audio_data)
        if sections:
            results["sections"] = sections

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

    @staticmethod
    def _deduplicate(onsets, min_interval_s):
        """Remove onsets that are closer than min_interval_s to the previous one."""
        if not onsets:
            return onsets
        result = [onsets[0]]
        for t in onsets[1:]:
            if t - result[-1] >= min_interval_s:
                result.append(t)
        return result

    def _detect_sections(self, audio_data):
        """Detect song structure boundaries using chroma novelty.

        Computes HPCP (chroma) features per frame, builds a self-similarity
        matrix, and finds peaks in the novelty curve (large timbral/harmonic
        changes). Returns section boundaries with generic labels.
        """
        sr = 44100
        hop = 4096  # ~93ms per frame — good resolution for structure

        # Compute chroma (HPCP) features per frame
        w = es.Windowing(type="blackmanharris62")
        spec = es.Spectrum()
        peaks = es.SpectralPeaks(
            sampleRate=sr, maxPeaks=60, magnitudeThreshold=0.001
        )
        hpcp = es.HPCP(size=12, sampleRate=sr)

        chroma_frames = []
        for frame in es.FrameGenerator(
            audio_data, frameSize=hop * 2, hopSize=hop
        ):
            spectrum = spec(w(frame))
            freqs, mags = peaks(spectrum)
            chroma_frames.append(hpcp(freqs, mags))

        if len(chroma_frames) < 16:
            return []

        chroma = np.array(chroma_frames)
        # Normalize rows to unit length for cosine similarity
        norms = np.linalg.norm(chroma, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        chroma = chroma / norms

        # Self-similarity matrix (cosine similarity)
        ssm = chroma @ chroma.T

        # Novelty curve: sum of checkerboard kernel along the diagonal
        kernel_size = 16  # ~1.5s context on each side
        n = ssm.shape[0]
        novelty = np.zeros(n)
        for i in range(kernel_size, n - kernel_size):
            # Compare block before vs after this point
            before = ssm[i - kernel_size : i, i - kernel_size : i]
            after = ssm[i : i + kernel_size, i : i + kernel_size]
            cross = ssm[i - kernel_size : i, i : i + kernel_size]
            novelty[i] = (
                np.mean(before) + np.mean(after) - 2 * np.mean(cross)
            )

        # Normalize novelty
        max_nov = np.max(novelty)
        if max_nov > 0:
            novelty /= max_nov

        # Find peaks above threshold (significant structural changes)
        threshold = 0.3
        min_section_frames = int(8.0 * sr / hop)  # Minimum 8s per section
        boundary_frames = []
        for i in range(1, len(novelty) - 1):
            if (
                novelty[i] > threshold
                and novelty[i] > novelty[i - 1]
                and novelty[i] > novelty[i + 1]
            ):
                # Check minimum distance from last boundary
                if (
                    not boundary_frames
                    or (i - boundary_frames[-1]) >= min_section_frames
                ):
                    boundary_frames.append(i)

        # Convert frame indices to time and build labeled sections
        frame_to_sec = hop / sr
        duration_s = len(audio_data) / sr
        sections = []

        # Always start with the beginning
        all_boundaries = [0] + boundary_frames + [len(novelty) - 1]

        section_labels = self._generate_section_labels(len(all_boundaries) - 1)

        for i in range(len(all_boundaries) - 1):
            start_s = all_boundaries[i] * frame_to_sec
            end_s = all_boundaries[i + 1] * frame_to_sec
            # Clamp to song duration
            end_s = min(end_s, duration_s)
            sections.append({
                "label": section_labels[i],
                "start": round(start_s, 3),
                "end": round(end_s, 3),
            })

        return sections

    @staticmethod
    def _generate_section_labels(count):
        """Generate generic section labels.

        Uses a repeating pattern that maps roughly to common song structures:
        Intro, Verse, Chorus, Verse, Chorus, Bridge, Chorus, Outro.
        Falls back to numbered sections if the song has an unusual structure.
        """
        if count <= 0:
            return []

        # Common song structures by section count
        templates = {
            1: ["Full Song"],
            2: ["Verse", "Chorus"],
            3: ["Intro", "Verse", "Chorus"],
            4: ["Intro", "Verse 1", "Chorus 1", "Outro"],
            5: ["Intro", "Verse 1", "Chorus 1", "Verse 2", "Chorus 2"],
            6: ["Intro", "Verse 1", "Chorus 1", "Verse 2", "Chorus 2", "Outro"],
            7: [
                "Intro", "Verse 1", "Chorus 1", "Verse 2",
                "Chorus 2", "Bridge", "Outro",
            ],
            8: [
                "Intro", "Verse 1", "Chorus 1", "Verse 2",
                "Chorus 2", "Bridge", "Chorus 3", "Outro",
            ],
            9: [
                "Intro", "Verse 1", "Pre-Chorus", "Chorus 1",
                "Verse 2", "Pre-Chorus", "Chorus 2", "Bridge", "Outro",
            ],
        }

        if count in templates:
            return templates[count]

        # Fallback: numbered sections
        return [f"Section {i + 1}" for i in range(count)]

    @staticmethod
    def _bandpass(audio, low_hz, high_hz, sr=44100, order=4):
        """Apply a Butterworth bandpass filter."""
        nyq = sr / 2.0
        low = max(low_hz / nyq, 0.001)
        high = min(high_hz / nyq, 0.999)
        sos = butter(order, [low, high], btype="band", output="sos")
        return sosfiltfilt(sos, audio).astype(np.float32)
