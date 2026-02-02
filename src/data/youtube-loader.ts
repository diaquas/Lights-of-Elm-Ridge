/**
 * YouTube Video Data Loader
 *
 * Loads video data from youtube-videos.json and provides
 * matching functions for sequences.
 */

import youtubeData from "./youtube-videos.json";
import {
  normalizeTitle,
  titleToSlug,
  type YouTubeVideo,
  type YouTubeData,
} from "./youtube-config";
import { sequences } from "./sequences";

// Type assertion for imported JSON
const data = youtubeData as YouTubeData;

/**
 * Get all mockup videos
 */
export function getMockupVideos(): YouTubeVideo[] {
  return data.mockups || [];
}

/**
 * Get live videos for a specific year
 */
export function getLiveVideos(year: 2024 | 2025): YouTubeVideo[] {
  return year === 2024 ? data.live2024 || [] : data.live2025 || [];
}

/**
 * Get all live videos sorted by year (newest first)
 */
export function getAllLiveVideos(): { year: number; videos: YouTubeVideo[] }[] {
  return [
    { year: 2025, videos: data.live2025 || [] },
    { year: 2024, videos: data.live2024 || [] },
  ].filter((group) => group.videos.length > 0);
}

/**
 * Get the last update timestamp
 */
export function getLastUpdated(): string | null {
  return data.lastUpdated;
}

/**
 * Find a mockup video that matches a sequence
 *
 * Matching strategy:
 * 1. Exact slug match in video title
 * 2. Normalized title match
 * 3. Artist + title combination match
 */
export function findMockupForSequence(
  sequenceSlug: string,
): YouTubeVideo | null {
  const sequence = sequences.find((s) => s.slug === sequenceSlug);
  if (!sequence) return null;

  const mockups = getMockupVideos();
  if (mockups.length === 0) return null;

  // Strategy 1: Check if video title contains the slug
  for (const video of mockups) {
    const videoSlug = titleToSlug(video.title);
    if (videoSlug.includes(sequenceSlug) || sequenceSlug.includes(videoSlug)) {
      return video;
    }
  }

  // Strategy 2: Normalize and match titles
  const normalizedSequenceTitle = normalizeTitle(sequence.title);
  for (const video of mockups) {
    const normalizedVideoTitle = normalizeTitle(video.title);
    if (
      normalizedVideoTitle.includes(normalizedSequenceTitle) ||
      normalizedSequenceTitle.includes(normalizedVideoTitle)
    ) {
      return video;
    }
  }

  // Strategy 3: Try artist + title combination
  const artistTitle = normalizeTitle(`${sequence.title} ${sequence.artist}`);
  const titleArtist = normalizeTitle(`${sequence.artist} ${sequence.title}`);
  for (const video of mockups) {
    const normalizedVideoTitle = normalizeTitle(video.title);
    if (
      normalizedVideoTitle.includes(artistTitle) ||
      artistTitle.includes(normalizedVideoTitle) ||
      normalizedVideoTitle.includes(titleArtist) ||
      titleArtist.includes(normalizedVideoTitle)
    ) {
      return video;
    }
  }

  return null;
}

/**
 * Get mockup video ID for a sequence (for embedding)
 * Returns the video ID or null if no mockup exists
 */
export function getMockupVideoId(sequenceSlug: string): string | null {
  const video = findMockupForSequence(sequenceSlug);
  return video?.id || null;
}

/**
 * Build a map of all sequences to their mockup videos
 * Useful for debugging and verifying matches
 */
export function buildSequenceMockupMap(): Map<string, YouTubeVideo | null> {
  const map = new Map<string, YouTubeVideo | null>();
  for (const sequence of sequences) {
    map.set(sequence.slug, findMockupForSequence(sequence.slug));
  }
  return map;
}

/**
 * Get unmatched mockup videos (videos that don't match any sequence)
 * Useful for identifying new sequences to add
 */
export function getUnmatchedMockups(): YouTubeVideo[] {
  const mockups = getMockupVideos();
  const matchedIds = new Set<string>();

  for (const sequence of sequences) {
    const mockup = findMockupForSequence(sequence.slug);
    if (mockup) {
      matchedIds.add(mockup.id);
    }
  }

  return mockups.filter((m) => !matchedIds.has(m.id));
}

/**
 * Get sequences without mockup videos
 */
export function getSequencesWithoutMockups(): typeof sequences {
  return sequences.filter((s) => !findMockupForSequence(s.slug));
}
