import { describe, it, expect } from "vitest";
import {
  hannWindow,
  fft,
  computeBandEnergies,
} from "@/lib/beatiq/audio-analyzer";
import { DEFAULT_BANDS } from "@/lib/beatiq/audio-analyzer";

describe("audio-analyzer", () => {
  describe("hannWindow", () => {
    it("produces a window of the correct size", () => {
      const w = hannWindow(512);
      expect(w.length).toBe(512);
    });

    it("starts and ends near zero", () => {
      const w = hannWindow(256);
      expect(w[0]).toBeCloseTo(0, 5);
      expect(w[255]).toBeCloseTo(0, 5);
    });

    it("peaks at 1.0 in the middle", () => {
      const w = hannWindow(256);
      const mid = Math.floor(256 / 2);
      expect(w[mid]).toBeCloseTo(1.0, 2);
    });

    it("is symmetric", () => {
      const w = hannWindow(128);
      for (let i = 0; i < 64; i++) {
        expect(w[i]).toBeCloseTo(w[127 - i], 5);
      }
    });
  });

  describe("fft", () => {
    it("preserves energy for a single frequency", () => {
      const n = 64;
      const re = new Float32Array(n);
      const im = new Float32Array(n);

      // Pure cosine at bin 4
      for (let i = 0; i < n; i++) {
        re[i] = Math.cos((2 * Math.PI * 4 * i) / n);
      }

      fft(re, im);

      // Bin 4 should have the dominant energy
      const mag4 = Math.sqrt(re[4] * re[4] + im[4] * im[4]);
      const mag0 = Math.sqrt(re[0] * re[0] + im[0] * im[0]);
      expect(mag4).toBeGreaterThan(mag0);
      expect(mag4).toBeGreaterThan(1);
    });

    it("handles a DC signal", () => {
      const n = 16;
      const re = new Float32Array(n).fill(1);
      const im = new Float32Array(n);

      fft(re, im);

      // Bin 0 (DC) should have all the energy
      expect(Math.abs(re[0])).toBeCloseTo(n, 1);
      // Other bins should be near zero
      for (let i = 1; i < n; i++) {
        expect(Math.abs(re[i])).toBeLessThan(0.01);
      }
    });

    it("handles zeros", () => {
      const n = 32;
      const re = new Float32Array(n);
      const im = new Float32Array(n);

      fft(re, im);

      for (let i = 0; i < n; i++) {
        expect(re[i]).toBeCloseTo(0);
        expect(im[i]).toBeCloseTo(0);
      }
    });
  });

  describe("computeBandEnergies", () => {
    it("returns one BandEnergy per configured band", () => {
      // Create a short synthetic signal
      const sampleRate = 44100;
      const duration = 0.5; // 0.5 seconds
      const numSamples = Math.floor(sampleRate * duration);
      const samples = new Float32Array(numSamples);

      // 100Hz sine wave (should appear in the kick band)
      for (let i = 0; i < numSamples; i++) {
        samples[i] = Math.sin((2 * Math.PI * 100 * i) / sampleRate);
      }

      const config = {
        frameSize: 2048,
        hopSize: 512,
        bands: DEFAULT_BANDS,
      };

      const energies = computeBandEnergies(samples, sampleRate, config);
      expect(energies.length).toBe(DEFAULT_BANDS.length);
    });

    it("returns matching lengths for values and frameTimes", () => {
      const sampleRate = 44100;
      const samples = new Float32Array(44100); // 1 second

      const config = {
        frameSize: 2048,
        hopSize: 512,
        bands: DEFAULT_BANDS,
      };

      const energies = computeBandEnergies(samples, sampleRate, config);
      for (const e of energies) {
        expect(e.values.length).toBe(e.frameTimes.length);
        expect(e.values.length).toBeGreaterThan(0);
      }
    });

    it("returns empty arrays for input shorter than frame size", () => {
      const samples = new Float32Array(100); // very short
      const config = {
        frameSize: 2048,
        hopSize: 512,
        bands: DEFAULT_BANDS,
      };

      const energies = computeBandEnergies(samples, 44100, config);
      for (const e of energies) {
        expect(e.values.length).toBe(0);
        expect(e.frameTimes.length).toBe(0);
      }
    });

    it("detects energy in the correct frequency band", () => {
      const sampleRate = 44100;
      const duration = 1;
      const numSamples = Math.floor(sampleRate * duration);
      const samples = new Float32Array(numSamples);

      // 100Hz sine = kick band (20-150Hz)
      for (let i = 0; i < numSamples; i++) {
        samples[i] = Math.sin((2 * Math.PI * 100 * i) / sampleRate);
      }

      const config = {
        frameSize: 2048,
        hopSize: 512,
        bands: DEFAULT_BANDS,
      };

      const energies = computeBandEnergies(samples, sampleRate, config);

      // Find kick band and hihat band
      const kickEnergy = energies.find((e) => e.bandId === "kick");
      const hihatEnergy = energies.find((e) => e.bandId === "hihat");

      expect(kickEnergy).toBeDefined();
      expect(hihatEnergy).toBeDefined();

      // Kick band should have more energy than hi-hat band for a 100Hz signal
      const kickAvg =
        kickEnergy!.values.reduce((sum, v) => sum + v, 0) /
        kickEnergy!.values.length;
      const hihatAvg =
        hihatEnergy!.values.reduce((sum, v) => sum + v, 0) /
        hihatEnergy!.values.length;

      expect(kickAvg).toBeGreaterThan(hihatAvg);
    });
  });
});
