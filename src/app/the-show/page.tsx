import type { Metadata } from "next";
import { getAllLiveVideos } from "@/data/youtube-loader";
import { YOUTUBE_PLAYLISTS } from "@/data/youtube-config";
import { songlist, getSongsByCategory } from "@/data/songlist";
import TheShowTabs from "@/components/TheShowTabs";
import BackToTop from "@/components/BackToTop";

export const metadata: Metadata = {
  title: "The Show | Lights of Elm Ridge",
  description:
    "Watch real footage from our RGB pixel light show, browse the full playlist, and explore the technical specs behind 35,000+ pixels.",
};

// Display specifications
const displayStats = {
  totalPixels: "35k+",
  controllers: "3",
  fmStation: "87.9",
};

export default function TheShowPage() {
  // Get video data
  const liveVideoGroups = getAllLiveVideos();

  // Transform video groups for the component
  const videoGroups = liveVideoGroups.map((group) => ({
    year: group.year,
    videos: group.videos,
    playlistId:
      group.year === 2025
        ? YOUTUBE_PLAYLISTS.live2025
        : YOUTUBE_PLAYLISTS.live2024,
  }));

  // Get song data
  const halloweenSongs = getSongsByCategory("Halloween");
  const christmasSongs = getSongsByCategory("Christmas");

  // Get vendor data
  const vendors = [
    {
      name: "Visionary Sequences",
      url: "https://visionarylightshows.com/",
      count: songlist.filter((s) => s.vendor === "Visionary Sequences").length,
    },
    {
      name: "Pixel Sequence Pros",
      url: "https://www.pixelsequencepros.com/",
      count: songlist.filter((s) => s.vendor === "Pixel Sequence Pros").length,
    },
    {
      name: "Showstopper Sequences",
      url: "https://www.showstoppersequences.com/",
      count: songlist.filter((s) => s.vendor === "Showstopper Sequences")
        .length,
    },
    {
      name: "Pixel Pro Displays",
      url: "https://pixelprodisplays.com/",
      count: songlist.filter((s) => s.vendor === "Pixel Pro Displays").length,
    },
    {
      name: "Paul Irwin",
      url: "https://xlightsseq.com/creators/paul-irwin.74/",
      count: songlist.filter((s) => s.vendor === "Paul Irwin").length,
    },
  ].filter((v) => v.count > 0);

  return (
    <div className="show-page min-h-screen">
      <div className="show-content">
        {/* Page Header */}
        <header className="show-header">
          <div className="show-header-top seq-anim-in seq-delay-1">
            <div className="show-title-group">
              <h1 className="show-title font-display">
                <span className="accent-text">The</span> Show
              </h1>
              <p className="show-subtitle">
                Real performances, full playlist, and the tech behind the
                pixels.
              </p>
            </div>
          </div>
        </header>

        {/* Tabbed Content */}
        <TheShowTabs
          videoGroups={videoGroups}
          halloweenSongs={halloweenSongs}
          christmasSongs={christmasSongs}
          vendors={vendors}
          displayStats={displayStats}
        />
      </div>

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
