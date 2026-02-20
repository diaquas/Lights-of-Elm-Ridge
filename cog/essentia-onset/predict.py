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
        "low_hz": 50,
        "high_hz": 80,       # Tight kick fundamental only (50-80 Hz)
        "threshold": 0.8,    # Conservative — only strong kicks
        "min_interval_ms": 250,  # Quarter notes at 120 BPM = 500ms
    },
    "snare": {
        "low_hz": 1000,
        "high_hz": 3000,     # Snare crack/attack lives 1-3 kHz
        "threshold": 0.7,    # Conservative — clear snare hits only
        "min_interval_ms": 200,  # Snares rarely < 200ms apart
    },
    "hihat": {
        "low_hz": 6000,
        "high_hz": 16000,    # Hi-hat shimmer lives above 6kHz
        "threshold": 0.65,   # Conservative — prominent hi-hats only
        "min_interval_ms": 120,  # 8th notes at 120 BPM = 250ms
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
            default=0.8,
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
        matrix, and finds peaks in a smoothed novelty curve.  Labels sections
        using per-section RMS energy and chroma similarity (repeating sections
        get the same label family) rather than position-based templates.
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

        if len(chroma_frames) < 32:
            return []

        chroma = np.array(chroma_frames)
        # Normalize rows to unit length for cosine similarity
        norms = np.linalg.norm(chroma, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        chroma = chroma / norms

        # Self-similarity matrix (cosine similarity)
        ssm = chroma @ chroma.T

        # Novelty curve: checkerboard kernel along the diagonal
        # Larger kernel (~3s context each side) captures structural changes
        kernel_size = 32
        n = ssm.shape[0]
        novelty = np.zeros(n)
        for i in range(kernel_size, n - kernel_size):
            before = ssm[i - kernel_size : i, i - kernel_size : i]
            after = ssm[i : i + kernel_size, i : i + kernel_size]
            cross = ssm[i - kernel_size : i, i : i + kernel_size]
            novelty[i] = (
                np.mean(before) + np.mean(after) - 2 * np.mean(cross)
            )

        # Smooth novelty curve to suppress noisy peaks
        smooth_len = 5
        kernel = np.ones(smooth_len) / smooth_len
        novelty = np.convolve(novelty, kernel, mode="same")

        # Normalize
        max_nov = np.max(novelty)
        if max_nov > 0:
            novelty /= max_nov

        # Adaptive threshold: mean + 0.5*std of positive novelty values
        positive = novelty[novelty > 0]
        if len(positive) > 0:
            threshold = float(np.mean(positive) + 0.5 * np.std(positive))
            threshold = max(0.2, min(threshold, 0.6))
        else:
            threshold = 0.3

        min_section_frames = int(8.0 * sr / hop)  # Minimum 8s per section
        boundary_frames = []
        for i in range(1, len(novelty) - 1):
            if (
                novelty[i] > threshold
                and novelty[i] > novelty[i - 1]
                and novelty[i] > novelty[i + 1]
            ):
                if (
                    not boundary_frames
                    or (i - boundary_frames[-1]) >= min_section_frames
                ):
                    boundary_frames.append(i)

        # Build unlabeled sections
        frame_to_sec = hop / sr
        duration_s = len(audio_data) / sr
        all_boundaries = [0] + boundary_frames + [len(novelty) - 1]

        sections = []
        for i in range(len(all_boundaries) - 1):
            start_s = all_boundaries[i] * frame_to_sec
            end_s = all_boundaries[i + 1] * frame_to_sec
            end_s = min(end_s, duration_s)
            sections.append({
                "label": "",
                "start": round(start_s, 3),
                "end": round(end_s, 3),
            })

        if not sections:
            return []
        if len(sections) == 1:
            sections[0]["label"] = "Full Song"
            return sections

        # --- Energy + chroma-similarity labeling ---
        self._label_sections(sections, chroma, audio_data, sr, hop)
        return sections

    @staticmethod
    def _label_sections(sections, chroma, audio_data, sr, hop):
        """Label sections using RMS energy and chroma similarity.

        High-energy sections → Chorus, lower-energy → Verse.
        Sections with similar chroma profiles get the same label family.
        Unique low-energy sections between choruses → Bridge.
        First/last low-energy sections → Intro/Outro.
        """
        n = len(sections)

        # Per-section RMS energy
        energies = []
        for s in sections:
            i0 = int(s["start"] * sr)
            i1 = min(int(s["end"] * sr), len(audio_data))
            seg = audio_data[i0:i1]
            energies.append(float(np.sqrt(np.mean(seg ** 2))) if len(seg) > 0 else 0.0)
        energies = np.array(energies)
        median_e = float(np.median(energies))

        # Per-section mean chroma (for finding repeating sections)
        section_chromas = []
        for s in sections:
            f0 = int(s["start"] * sr / hop)
            f1 = min(int(s["end"] * sr / hop), len(chroma))
            if f0 < f1:
                mc = np.mean(chroma[f0:f1], axis=0)
                norm = np.linalg.norm(mc)
                if norm > 0:
                    mc = mc / norm
                section_chromas.append(mc)
            else:
                section_chromas.append(np.zeros(12))

        # Group similar sections (union-find by chroma cosine similarity)
        groups = list(range(n))
        sim_threshold = 0.85
        for i in range(n):
            for j in range(i + 1, n):
                if np.dot(section_chromas[i], section_chromas[j]) >= sim_threshold:
                    old_g, new_g = groups[j], groups[i]
                    for k in range(n):
                        if groups[k] == old_g:
                            groups[k] = new_g

        # Compute mean energy per group
        unique_groups = sorted(set(groups))
        group_energy = {}
        for g in unique_groups:
            members = [i for i in range(n) if groups[i] == g]
            group_energy[g] = float(np.mean(energies[members]))

        # Assign labels
        duration_s = sections[-1]["end"]
        chorus_num = 0
        verse_num = 0
        bridge_num = 0

        for i in range(n):
            s = sections[i]
            is_high = energies[i] > median_e
            is_first = (i == 0)
            is_last = (i == n - 1)
            near_start = s["end"] < duration_s * 0.15
            near_end = s["start"] > duration_s * 0.85
            group_size = sum(1 for g in groups if g == groups[i])

            if is_first and not is_high and near_start:
                s["label"] = "Intro"
            elif is_last and not is_high and near_end:
                s["label"] = "Outro"
            elif is_high:
                chorus_num += 1
                s["label"] = f"Chorus {chorus_num}"
            elif group_size == 1 and not is_first and not is_last:
                # Unique section that doesn't repeat — likely a bridge
                bridge_num += 1
                s["label"] = "Bridge" if bridge_num == 1 else f"Bridge {bridge_num}"
            else:
                verse_num += 1
                s["label"] = f"Verse {verse_num}"

    @staticmethod
    def _bandpass(audio, low_hz, high_hz, sr=44100, order=4):
        """Apply a Butterworth bandpass filter."""
        nyq = sr / 2.0
        low = max(low_hz / nyq, 0.001)
        high = min(high_hz / nyq, 0.999)
        sos = butter(order, [low, high], btype="band", output="sos")
        return sosfiltfilt(sos, audio).astype(np.float32)
