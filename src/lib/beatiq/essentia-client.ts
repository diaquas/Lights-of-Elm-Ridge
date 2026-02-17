/* ------------------------------------------------------------------ */
/*  Beat:IQ — Essentia.js Client                                      */
/*  Wraps the Essentia Web Worker for rhythm analysis                  */
/* ------------------------------------------------------------------ */

/** Result from the Essentia beat detection worker */
export interface EssentiaRhythmResult {
  /** Detected BPM */
  bpm: number;
  /** Beat positions in milliseconds */
  ticksMs: number[];
  /** Confidence score (higher = more confident) */
  confidence: number;
  /** Time intervals between consecutive beats in seconds */
  bpmIntervals: number[];
}

/**
 * Run Essentia.js RhythmExtractor2013 on audio samples via a Web Worker.
 *
 * Returns null if the worker fails to load or analysis errors out,
 * allowing the caller to fall back to the built-in tempo detector.
 */
export function detectBeatsWithEssentia(
  samples: Float32Array,
  sampleRate: number,
  timeoutMs: number = 30000,
): Promise<EssentiaRhythmResult | null> {
  return new Promise((resolve) => {
    // Workers are browser-only
    if (typeof Worker === "undefined") {
      resolve(null);
      return;
    }

    let worker: Worker | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (worker) worker.terminate();
    };

    try {
      worker = new Worker("/workers/essentia-beat-worker.js");
    } catch {
      resolve(null);
      return;
    }

    timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    worker.onmessage = (e: MessageEvent) => {
      cleanup();
      if (e.data.error) {
        resolve(null);
      } else {
        resolve(e.data as EssentiaRhythmResult);
      }
    };

    worker.onerror = () => {
      cleanup();
      resolve(null);
    };

    // Transfer the buffer for performance (avoids copying)
    // We need to clone first since the caller may still need the data
    const samplesCopy = new Float32Array(samples);
    worker.postMessage({ samples: samplesCopy, sampleRate }, [
      samplesCopy.buffer,
    ]);
  });
}
