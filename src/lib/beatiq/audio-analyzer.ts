/* ------------------------------------------------------------------ */
/*  Beat:IQ — Audio Analyzer                                          */
/*  Browser-only: decodes MP3, computes STFT, extracts band energies  */
/* ------------------------------------------------------------------ */

import type { AnalysisConfig, BandEnergy, FrequencyBand } from "./types";

/** Default frequency bands for instrument-approximation onset detection */
export const DEFAULT_BANDS: FrequencyBand[] = [
  {
    id: "kick",
    name: "Drums \u2014 Kick",
    category: "drums",
    lowHz: 50,
    highHz: 80,
    threshold: 0.55,
    minIntervalMs: 150,
  },
  {
    id: "snare",
    name: "Drums \u2014 Snare",
    category: "drums",
    lowHz: 1000,
    highHz: 3000,
    threshold: 0.45,
    minIntervalMs: 120,
  },
  {
    id: "hihat",
    name: "Drums \u2014 Hi-Hat",
    category: "drums",
    lowHz: 5000,
    highHz: 15000,
    threshold: 0.45,
    minIntervalMs: 100,
  },
  {
    id: "bass",
    name: "Bass",
    category: "melodic",
    lowHz: 60,
    highHz: 250,
    threshold: 0.45,
    minIntervalMs: 150,
  },
  {
    id: "midrange",
    name: "Melody \u2014 Mid",
    category: "melodic",
    lowHz: 250,
    highHz: 4000,
    threshold: 0.45,
    minIntervalMs: 120,
  },
];

/** Default analysis configuration */
export const DEFAULT_CONFIG: AnalysisConfig = {
  frameSize: 2048,
  hopSize: 512,
  bands: DEFAULT_BANDS,
};

/**
 * Decode an audio file to a mono Float32Array.
 * Browser-only — requires AudioContext.
 */
export async function decodeAudio(
  file: File,
): Promise<{ samples: Float32Array; sampleRate: number; durationMs: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const mono = mixToMono(audioBuffer);
    return {
      samples: mono,
      sampleRate: audioBuffer.sampleRate,
      durationMs: (audioBuffer.length / audioBuffer.sampleRate) * 1000,
    };
  } finally {
    await ctx.close();
  }
}

/**
 * Mix all channels to mono by averaging.
 */
function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }
  const length = buffer.length;
  const mono = new Float32Array(length);
  const numChannels = buffer.numberOfChannels;
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += channelData[i] / numChannels;
    }
  }
  return mono;
}

/**
 * Compute a Hann window of the given size.
 */
export function hannWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return window;
}

/**
 * In-place radix-2 Cooley-Tukey FFT.
 * Operates on interleaved [real, imag, real, imag, ...] arrays.
 */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      let tmp = re[i];
      re[i] = re[j];
      re[j] = tmp;
      tmp = im[i];
      im[i] = im[j];
      im[j] = tmp;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  // Butterfly stages
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < halfLen; k++) {
        const evenIdx = i + k;
        const oddIdx = i + k + halfLen;
        const tRe = curRe * re[oddIdx] - curIm * im[oddIdx];
        const tIm = curRe * im[oddIdx] + curIm * re[oddIdx];
        re[oddIdx] = re[evenIdx] - tRe;
        im[oddIdx] = im[evenIdx] - tIm;
        re[evenIdx] += tRe;
        im[evenIdx] += tIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
}

/**
 * Compute energy per frequency band from audio samples using STFT.
 *
 * Returns one BandEnergy per configured frequency band, where each entry
 * contains the energy values per analysis frame and the corresponding
 * frame timestamps in milliseconds.
 */
export function computeBandEnergies(
  samples: Float32Array,
  sampleRate: number,
  config: AnalysisConfig = DEFAULT_CONFIG,
): BandEnergy[] {
  const { frameSize, hopSize, bands } = config;
  const numFrames = Math.max(
    0,
    Math.floor((samples.length - frameSize) / hopSize) + 1,
  );

  if (numFrames === 0) {
    return bands.map((b) => ({
      bandId: b.id,
      values: new Float32Array(0),
      frameTimes: new Float32Array(0),
    }));
  }

  const window = hannWindow(frameSize);
  const halfSpectrum = frameSize / 2 + 1;

  // Pre-compute bin ranges for each band
  const binRanges = bands.map((band) => ({
    bandId: band.id,
    lowBin: Math.max(1, Math.floor((band.lowHz * frameSize) / sampleRate)),
    highBin: Math.min(
      halfSpectrum - 1,
      Math.ceil((band.highHz * frameSize) / sampleRate),
    ),
  }));

  // Allocate output
  const energies: BandEnergy[] = bands.map((b) => ({
    bandId: b.id,
    values: new Float32Array(numFrames),
    frameTimes: new Float32Array(numFrames),
  }));

  // Working buffers for FFT
  const re = new Float32Array(frameSize);
  const im = new Float32Array(frameSize);

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    const timeMs = ((offset + frameSize / 2) / sampleRate) * 1000;

    // Apply window and load into FFT buffers
    for (let i = 0; i < frameSize; i++) {
      re[i] = samples[offset + i] * window[i];
      im[i] = 0;
    }

    fft(re, im);

    // Compute magnitude spectrum and accumulate per-band energy
    for (let bIdx = 0; bIdx < binRanges.length; bIdx++) {
      const { lowBin, highBin } = binRanges[bIdx];
      let energy = 0;
      for (let bin = lowBin; bin <= highBin; bin++) {
        energy += re[bin] * re[bin] + im[bin] * im[bin];
      }
      const numBins = highBin - lowBin + 1;
      energies[bIdx].values[f] = numBins > 0 ? Math.sqrt(energy / numBins) : 0;
      energies[bIdx].frameTimes[f] = timeMs;
    }
  }

  return energies;
}

/**
 * Compute total spectral flux (onset strength) from audio samples.
 * Used for BPM detection.
 */
export function computeSpectralFlux(
  samples: Float32Array,
  sampleRate: number,
  frameSize: number = 2048,
  hopSize: number = 512,
): { flux: Float32Array; frameTimes: Float32Array } {
  const numFrames = Math.max(
    0,
    Math.floor((samples.length - frameSize) / hopSize) + 1,
  );

  if (numFrames === 0) {
    return { flux: new Float32Array(0), frameTimes: new Float32Array(0) };
  }

  const window = hannWindow(frameSize);
  const halfSpectrum = frameSize / 2 + 1;
  const flux = new Float32Array(numFrames);
  const frameTimes = new Float32Array(numFrames);
  const prevMag = new Float32Array(halfSpectrum);

  const re = new Float32Array(frameSize);
  const im = new Float32Array(frameSize);

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    frameTimes[f] = ((offset + frameSize / 2) / sampleRate) * 1000;

    for (let i = 0; i < frameSize; i++) {
      re[i] = samples[offset + i] * window[i];
      im[i] = 0;
    }

    fft(re, im);

    // Compute magnitude and spectral flux (half-wave rectified difference)
    let fluxVal = 0;
    for (let bin = 1; bin < halfSpectrum; bin++) {
      const mag = Math.sqrt(re[bin] * re[bin] + im[bin] * im[bin]);
      const diff = mag - prevMag[bin];
      if (diff > 0) fluxVal += diff;
      prevMag[bin] = mag;
    }
    flux[f] = fluxVal;
  }

  return { flux, frameTimes };
}
