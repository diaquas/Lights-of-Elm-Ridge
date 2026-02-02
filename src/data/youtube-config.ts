/**
 * YouTube Playlist Configuration
 *
 * These playlists are automatically synced at build time.
 * Add your YouTube API key to .env.local as YOUTUBE_API_KEY
 */

export const YOUTUBE_PLAYLISTS = {
  // xLights mockup videos - matched to sequence detail pages
  mockups: "PLNrebbWMDXn3a7I8I-I7fOKodoo8zdlaE",

  // Live show footage by year - displayed on The Show page
  live2024: "PLNrebbWMDXn25mqAx7N1M4XUun46lTaXy",
  live2025: "PLNrebbWMDXn0o1Bipyk5pbxTbG0gYxyqF",
} as const;

export const YOUTUBE_CHANNEL_ID = "UCKvEDoz59mtUv2UCuJq6vuA";

export type PlaylistType = keyof typeof YOUTUBE_PLAYLISTS;

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  thumbnailUrlHigh: string;
  publishedAt: string;
  playlistId: string;
  playlistType: PlaylistType;
}

export interface YouTubeData {
  lastUpdated: string | null;
  mockups: YouTubeVideo[];
  live2024: YouTubeVideo[];
  live2025: YouTubeVideo[];
}

/**
 * Normalizes a song title for matching.
 * Removes common suffixes, special characters, and normalizes spacing.
 */
export function normalizeTitle(title: string): string {
  return (
    title
      .toLowerCase()
      // Remove common suffixes
      .replace(
        /\s*[-–—]\s*(xlights|mockup|mock up|preview|demo|test|sequence|light show|lights?|display).*$/i,
        "",
      )
      .replace(/\s*\(xlights.*?\)/gi, "")
      .replace(/\s*\[xlights.*?\]/gi, "")
      .replace(/\s*\|.*$/i, "")
      // Remove year indicators
      .replace(/\s*\(?20\d{2}\)?/g, "")
      // Remove "by" artist attribution
      .replace(/\s+by\s+.+$/i, "")
      // Normalize special characters
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/&/g, "and")
      // Remove extra whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Creates a slug from a title for matching.
 */
export function titleToSlug(title: string): string {
  return normalizeTitle(title)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
