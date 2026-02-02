#!/usr/bin/env npx tsx
/**
 * YouTube Playlist Fetcher
 *
 * Fetches video data from YouTube playlists and saves to src/data/youtube-videos.json
 * Run with: npm run fetch-youtube
 *
 * Requires: YOUTUBE_API_KEY environment variable
 *
 * Usage:
 *   npm run fetch-youtube           # Fetch and save video data
 *   npm run fetch-youtube -- --dry  # Preview without saving
 */

import * as fs from "fs";
import * as path from "path";

// Import config (we'll read it manually to avoid TS module issues)
const YOUTUBE_PLAYLISTS = {
  mockups: "PLNrebbWMDXn3a7I8I-I7fOKodoo8zdlaE",
  live2024: "PLNrebbWMDXn25mqAx7N1M4XUun46lTaXy",
  live2025: "PLNrebbWMDXn0o1Bipyk5pbxTbG0gYxyqF",
} as const;

type PlaylistType = keyof typeof YOUTUBE_PLAYLISTS;

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  thumbnailUrlHigh: string;
  publishedAt: string;
  playlistId: string;
  playlistType: PlaylistType;
}

interface YouTubeData {
  lastUpdated: string;
  mockups: YouTubeVideo[];
  live2024: YouTubeVideo[];
  live2025: YouTubeVideo[];
}

interface YouTubePlaylistItem {
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    resourceId: {
      videoId: string;
    };
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
      standard?: { url: string };
      maxres?: { url: string };
    };
  };
}

interface YouTubePlaylistResponse {
  items: YouTubePlaylistItem[];
  nextPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

const API_KEY = process.env.YOUTUBE_API_KEY;
const OUTPUT_PATH = path.join(__dirname, "../src/data/youtube-videos.json");

async function fetchPlaylistVideos(
  playlistId: string,
  playlistType: PlaylistType,
): Promise<YouTubeVideo[]> {
  const videos: YouTubeVideo[] = [];
  let nextPageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", API_KEY!);
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    console.log(`  Fetching page for ${playlistType}...`);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`YouTube API error: ${response.status} - ${error}`);
    }

    const data: YouTubePlaylistResponse = await response.json();

    for (const item of data.items) {
      // Skip deleted/private videos
      if (
        item.snippet.title === "Deleted video" ||
        item.snippet.title === "Private video"
      ) {
        continue;
      }

      const thumbnails = item.snippet.thumbnails;
      videos.push({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl:
          thumbnails.medium?.url ||
          thumbnails.default?.url ||
          `https://img.youtube.com/vi/${item.snippet.resourceId.videoId}/mqdefault.jpg`,
        thumbnailUrlHigh:
          thumbnails.maxres?.url ||
          thumbnails.high?.url ||
          thumbnails.standard?.url ||
          `https://img.youtube.com/vi/${item.snippet.resourceId.videoId}/maxresdefault.jpg`,
        publishedAt: item.snippet.publishedAt,
        playlistId,
        playlistType,
      });
    }

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return videos;
}

async function main() {
  const isDryRun = process.argv.includes("--dry");

  if (!API_KEY) {
    console.error("Error: YOUTUBE_API_KEY environment variable is required.");
    console.error("");
    console.error("To get an API key:");
    console.error("1. Go to https://console.cloud.google.com/");
    console.error("2. Create a project (or use existing)");
    console.error('3. Enable "YouTube Data API v3"');
    console.error("4. Go to APIs & Services > Credentials");
    console.error("5. Create an API key");
    console.error("");
    console.error("Then run:");
    console.error("  YOUTUBE_API_KEY=your_key npm run fetch-youtube");
    console.error("");
    console.error("Or add to .env.local:");
    console.error("  YOUTUBE_API_KEY=your_key");
    process.exit(1);
  }

  console.log("Fetching YouTube playlists...");
  console.log("");

  const data: YouTubeData = {
    lastUpdated: new Date().toISOString(),
    mockups: [],
    live2024: [],
    live2025: [],
  };

  for (const [type, playlistId] of Object.entries(YOUTUBE_PLAYLISTS) as [
    PlaylistType,
    string,
  ][]) {
    console.log(`Fetching ${type} playlist (${playlistId})...`);
    try {
      const videos = await fetchPlaylistVideos(playlistId, type);
      data[type] = videos;
      console.log(`  Found ${videos.length} videos`);
    } catch (error) {
      console.error(`  Error fetching ${type}:`, error);
      process.exit(1);
    }
  }

  console.log("");
  console.log("Summary:");
  console.log(`  Mockups: ${data.mockups.length} videos`);
  console.log(`  Live 2024: ${data.live2024.length} videos`);
  console.log(`  Live 2025: ${data.live2025.length} videos`);
  console.log("");

  if (isDryRun) {
    console.log("Dry run - not saving. Preview:");
    console.log("");
    console.log("Mockup videos:");
    for (const video of data.mockups) {
      console.log(`  - ${video.title} (${video.id})`);
    }
    console.log("");
    console.log("Live 2024 videos:");
    for (const video of data.live2024) {
      console.log(`  - ${video.title} (${video.id})`);
    }
    console.log("");
    console.log("Live 2025 videos:");
    for (const video of data.live2025) {
      console.log(`  - ${video.title} (${video.id})`);
    }
  } else {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
    console.log(`Saved to ${OUTPUT_PATH}`);
  }

  console.log("");
  console.log("Done!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
