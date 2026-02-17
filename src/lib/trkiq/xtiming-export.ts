/* ------------------------------------------------------------------ */
/*  TRK:IQ — Combined .xtiming Export                                  */
/*  Merges Beat:IQ instrument tracks + Lyr:IQ vocal tracks into a     */
/*  single multi-track .xtiming file for xLights import                */
/* ------------------------------------------------------------------ */

import type { BeatTrack } from "@/lib/beatiq/types";
import type { VocalTrack } from "@/lib/lyriq/types";

const SOURCE_VERSION = "2024.x";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generate a combined multi-track .xtiming file containing both
 * instrument timing tracks (Beat:IQ) and vocal tracks (Lyr:IQ).
 *
 * This is the primary export format for TRK:IQ — one file with
 * everything you need to start sequencing in xLights.
 */
export function generateCombinedXtiming(
  beatTracks: BeatTrack[],
  vocalTracks: VocalTrack[],
): string {
  const enabledBeatTracks = beatTracks.filter((t) => t.enabled);
  const totalTracks = enabledBeatTracks.length + vocalTracks.length;

  if (totalTracks === 0) return "";

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push("<timings>");

  // Instrument timing tracks
  for (const track of enabledBeatTracks) {
    lines.push(
      `  <timing offset="0" name="${escapeXml(track.name)}" SourceVersion="${SOURCE_VERSION}">`,
    );
    lines.push("    <EffectLayer>");
    appendBeatEffects(track, lines);
    lines.push("    </EffectLayer>");
    lines.push("  </timing>");
  }

  // Vocal timing tracks (3 layers each: phrases, words, phonemes)
  for (const track of vocalTracks) {
    lines.push(
      `  <timing offset="0" name="${escapeXml(track.label)}" SourceVersion="${SOURCE_VERSION}">`,
    );

    // Layer 0: Phrases
    lines.push("    <EffectLayer>");
    for (const phrase of track.phrases) {
      lines.push(
        `      <Effect label="${escapeXml(phrase.text)}" startTime="${Math.round(phrase.startMs)}" endTime="${Math.round(phrase.endMs)}"/>`,
      );
    }
    lines.push("    </EffectLayer>");

    // Layer 1: Words
    lines.push("    <EffectLayer>");
    for (const phrase of track.phrases) {
      for (const word of phrase.words) {
        lines.push(
          `      <Effect label="${escapeXml(word.text)}" startTime="${Math.round(word.startMs)}" endTime="${Math.round(word.endMs)}"/>`,
        );
      }
    }
    lines.push("    </EffectLayer>");

    // Layer 2: Phonemes
    lines.push("    <EffectLayer>");
    for (const phrase of track.phrases) {
      for (const word of phrase.words) {
        for (const phoneme of word.phonemes) {
          lines.push(
            `      <Effect label="${escapeXml(phoneme.code)}" startTime="${Math.round(phoneme.startMs)}" endTime="${Math.round(phoneme.endMs)}"/>`,
          );
        }
      }
    }
    lines.push("    </EffectLayer>");

    lines.push("  </timing>");
  }

  lines.push("</timings>");
  return lines.join("\n");
}

/**
 * Append Beat:IQ effect elements for a track.
 */
function appendBeatEffects(track: BeatTrack, lines: string[]): void {
  const DEFAULT_DURATION = 50;

  if (track.labeledMarks && track.labeledMarks.length > 0) {
    for (const mark of track.labeledMarks) {
      lines.push(
        `      <Effect label="${escapeXml(mark.label)}" startTime="${Math.round(mark.startMs)}" endTime="${Math.round(mark.endMs)}"/>`,
      );
    }
    return;
  }

  for (const mark of track.marks) {
    lines.push(
      `      <Effect label="" startTime="${Math.round(mark.timeMs)}" endTime="${Math.round(mark.timeMs + DEFAULT_DURATION)}"/>`,
    );
  }
}

/**
 * Build a filename for the TRK:IQ export.
 */
export function buildTrkiqFilename(artist: string, title: string): string {
  const clean = (s: string) =>
    s
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "");
  return `${clean(artist)}_${clean(title)}_TrkIQ.xtiming`;
}

/**
 * Download an .xtiming file.
 * Browser-only.
 */
export function downloadXtiming(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
