/* ------------------------------------------------------------------ */
/*  TRK:IQ — iTunes Album Art Fetcher                                 */
/*  Fetches album artwork via the iTunes Search API.                  */
/* ------------------------------------------------------------------ */

const ITUNES_SEARCH_URL = "https://itunes.apple.com/search";

/**
 * Fetch album artwork URL from iTunes Search API.
 * Returns the highest resolution artwork URL available, or null.
 */
export async function fetchAlbumArt(
  artist: string,
  title: string,
): Promise<string | null> {
  try {
    const query = `${artist} ${title}`.trim();
    if (!query) return null;

    const params = new URLSearchParams({
      term: query,
      media: "music",
      entity: "song",
      limit: "1",
    });

    const response = await fetch(`${ITUNES_SEARCH_URL}?${params}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;

    // Get the artwork URL and upscale to 600x600
    const artworkUrl: string = data.results[0].artworkUrl100;
    if (!artworkUrl) return null;

    return artworkUrl.replace("100x100bb", "600x600bb");
  } catch {
    return null;
  }
}
