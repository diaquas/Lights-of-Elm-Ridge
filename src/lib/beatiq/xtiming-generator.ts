/* ------------------------------------------------------------------ */
/*  Beat:IQ — xTiming Generator                                       */
/*  Generates multi-track .xtiming XML files for xLights import       */
/* ------------------------------------------------------------------ */

import type { BeatTrack } from "./types";

const SOURCE_VERSION = "2024.x";

/**
 * Escape special XML characters in a string.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generate a single Effect XML element.
 */
function effectXml(label: string, startTime: number, endTime: number): string {
  return `      <Effect label="${escapeXml(label)}" starttime="${Math.round(startTime)}" endtime="${Math.round(endTime)}"/>`;
}

/**
 * Generate .xtiming XML for a single beat track.
 */
export function generateXtiming(track: BeatTrack): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<timing offset="0" name="${escapeXml(track.name)}" SourceVersion="${SOURCE_VERSION}">`,
  );

  lines.push("  <EffectLayer>");
  appendTrackEffects(track, lines);
  lines.push("  </EffectLayer>");

  lines.push("</timing>");
  return lines.join("\n");
}

/**
 * Generate a multi-track .xtiming XML file containing all tracks.
 * This is the primary export format for Beat:IQ — one file with
 * every instrument timing track named and ready for xLights import.
 */
export function generateMultiTrackXtiming(tracks: BeatTrack[]): string {
  const enabledTracks = tracks.filter((t) => t.enabled);
  if (enabledTracks.length === 0) return "";
  if (enabledTracks.length === 1) return generateXtiming(enabledTracks[0]);

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push("<timings>");

  for (const track of enabledTracks) {
    lines.push(
      `  <timing name="${escapeXml(track.name)}" SourceVersion="${SOURCE_VERSION}">`,
    );
    lines.push("    <EffectLayer>");
    appendTrackEffects(track, lines, "    ");
    lines.push("    </EffectLayer>");
    lines.push("  </timing>");
  }

  lines.push("</timings>");
  return lines.join("\n");
}

/**
 * Append Effect elements for a track's marks to the lines array.
 */
function appendTrackEffects(
  track: BeatTrack,
  lines: string[],
  indent: string = "",
): void {
  // Labeled marks (sections, bars, chords) get label text
  if (track.labeledMarks && track.labeledMarks.length > 0) {
    for (const mark of track.labeledMarks) {
      lines.push(
        `${indent}      <Effect label="${escapeXml(mark.label)}" starttime="${Math.round(mark.startMs)}" endtime="${Math.round(mark.endMs)}"/>`,
      );
    }
    return;
  }

  // Timing marks get empty labels with a short duration (onset markers)
  const DEFAULT_MARK_DURATION_MS = 50;
  for (const mark of track.marks) {
    lines.push(
      `${indent}      <Effect label="" starttime="${Math.round(mark.timeMs)}" endtime="${Math.round(mark.timeMs + DEFAULT_MARK_DURATION_MS)}"/>`,
    );
  }
}

/**
 * Build a filename for the .xtiming export.
 */
export function buildXtimingFilename(artist: string, title: string): string {
  const clean = (s: string) =>
    s
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "");
  return `${clean(artist)}_${clean(title)}_BeatIQ.xtiming`;
}

/**
 * Download an .xtiming file by creating a blob and triggering a download.
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
