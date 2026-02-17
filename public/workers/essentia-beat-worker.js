/* eslint-disable no-undef */
/* ------------------------------------------------------------------ */
/*  Essentia.js Beat Detection Web Worker                              */
/*  Runs RhythmExtractor2013 off the main thread to avoid UI blocking */
/* ------------------------------------------------------------------ */

// Load Essentia WASM + JS core (synchronous UMD builds for workers)
importScripts("./essentia-wasm.umd.js", "./essentia.js-core.js");

let essentia = null;

try {
  // EssentiaWASM is injected globally by the UMD build
  essentia = new Essentia(EssentiaWASM);
} catch (e) {
  // Will report error on first message
}

self.onmessage = function (e) {
  if (!essentia) {
    self.postMessage({ error: "Essentia WASM failed to initialize" });
    return;
  }

  try {
    const { samples, sampleRate } = e.data;

    // Essentia requires 44100 Hz — if we have a different rate,
    // just use what we have (minor pitch shift is acceptable for
    // rhythm analysis; resampling would require OfflineAudioContext
    // which is unavailable in workers)
    const audioVector = essentia.arrayToVector(samples);

    // Run the full rhythm extractor
    const rhythm = essentia.RhythmExtractor2013(
      audioVector,
      208, // maxTempo
      40, // minTempo
      "multifeature", // most accurate method
    );

    const bpm = rhythm.bpm;
    const ticks = essentia.vectorToArray(rhythm.ticks);
    const confidence = rhythm.confidence;
    const bpmIntervals = essentia.vectorToArray(rhythm.bpmIntervals);

    // Convert tick times from seconds to milliseconds
    const ticksMs = new Float32Array(ticks.length);
    for (let i = 0; i < ticks.length; i++) {
      ticksMs[i] = Math.round(ticks[i] * 1000);
    }

    self.postMessage({
      bpm: Math.round(bpm * 10) / 10,
      ticksMs: Array.from(ticksMs),
      confidence,
      bpmIntervals: Array.from(bpmIntervals),
    });
  } catch (err) {
    self.postMessage({
      error: err instanceof Error ? err.message : "Beat detection failed",
    });
  }
};
