/**
 * Lyr:IQ — .xtiming file generator
 *
 * Produces xLights-compatible timing files with 3 layers:
 *   Layer 0: Phrases (lyric lines with start/end times)
 *   Layer 1: Words (individual words aligned to audio)
 *   Layer 2: Phonemes (Preston Blair mouth positions)
 *
 * Output format matches xLights' native timing import format.
 */

import type { VocalTrack } from "./types";

/**
 * Escape XML special characters in text content.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate a single Effect element.
 */
function effectXml(label: string, startTime: number, endTime: number): string {
  return `    <Effect label="${escapeXml(label)}" starttime="${Math.round(startTime)}" endtime="${Math.round(endTime)}"/>`;
}

/**
 * Generate the complete .xtiming XML for a single vocal track.
 *
 * Structure:
 * ```xml
 * <timing name="Lyrics (Lead)" SourceVersion="2024.x">
 *   <EffectLayer>  <!-- Phrases -->
 *   <EffectLayer>  <!-- Words -->
 *   <EffectLayer>  <!-- Phonemes -->
 * </timing>
 * ```
 */
export function generateXtiming(track: VocalTrack): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<timing offset="0" name="${escapeXml(track.label)}" SourceVersion="2024.x">`,
  );

  // Layer 0: Phrases
  lines.push("  <EffectLayer>");
  for (const phrase of track.phrases) {
    lines.push(effectXml(phrase.text, phrase.startMs, phrase.endMs));
  }
  lines.push("  </EffectLayer>");

  // Layer 1: Words
  lines.push("  <EffectLayer>");
  for (const phrase of track.phrases) {
    for (const word of phrase.words) {
      lines.push(effectXml(word.text, word.startMs, word.endMs));
    }
  }
  lines.push("  </EffectLayer>");

  // Layer 2: Phonemes
  lines.push("  <EffectLayer>");
  for (const phrase of track.phrases) {
    for (const word of phrase.words) {
      for (const phoneme of word.phonemes) {
        lines.push(effectXml(phoneme.code, phoneme.startMs, phoneme.endMs));
      }
    }
  }
  lines.push("  </EffectLayer>");

  lines.push("</timing>");

  return lines.join("\n");
}

/**
 * Generate a combined .xtiming file containing multiple vocal tracks.
 * Each track gets its own <timing> block.
 *
 * Note: xLights imports each <timing> as a separate timing track,
 * which is exactly what we want for lead + background vocals.
 */
export function generateMultiTrackXtiming(tracks: VocalTrack[]): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push("<timings>");

  for (const track of tracks) {
    lines.push(
      `  <timing offset="0" name="${escapeXml(track.label)}" SourceVersion="2024.x">`,
    );

    // Phrases
    lines.push("    <EffectLayer>");
    for (const phrase of track.phrases) {
      lines.push(
        `      ${effectXml(phrase.text, phrase.startMs, phrase.endMs).trim()}`,
      );
    }
    lines.push("    </EffectLayer>");

    // Words
    lines.push("    <EffectLayer>");
    for (const phrase of track.phrases) {
      for (const word of phrase.words) {
        lines.push(
          `      ${effectXml(word.text, word.startMs, word.endMs).trim()}`,
        );
      }
    }
    lines.push("    </EffectLayer>");

    // Phonemes
    lines.push("    <EffectLayer>");
    for (const phrase of track.phrases) {
      for (const word of phrase.words) {
        for (const phoneme of word.phonemes) {
          lines.push(
            `      ${effectXml(phoneme.code, phoneme.startMs, phoneme.endMs).trim()}`,
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
 * Build a filename for the .xtiming export.
 * Format: ArtistName_SongTitle_LyrIQ.xtiming
 */
export function buildXtimingFilename(artist: string, title: string): string {
  const clean = (s: string) =>
    s
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "");

  return `${clean(artist)}_${clean(title)}_LyrIQ.xtiming`;
}

/**
 * Trigger a browser download of an .xtiming file.
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
