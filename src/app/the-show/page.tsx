import type { Metadata } from "next";
import { getAllLiveVideos } from "@/data/youtube-loader";
import { YOUTUBE_PLAYLISTS } from "@/data/youtube-config";
import {
  songlist,
  getSongsByCategory,
  getStats,
  getNewSongs,
} from "@/data/songlist";
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
  universes: "190",
  controllers: "3",
  fmStation: "87.9",
};

// Props list
const propsList = [
  {
    name: "Matrix",
    pixels: "7,168",
    description: "70×102 P10 panel — videos, images, text effects",
  },
  {
    name: "Spinners (6)",
    pixels: "5,792",
    description:
      "Fuzion, Rosa Grande, Overlord, 3× Showstopper, Click Click Boom",
  },
  {
    name: "Fence Panels (7)",
    pixels: "4,655",
    description: "665 pixels each — vertical pixel fence sections",
  },
  {
    name: "Mega Tree",
    pixels: "3,000",
    description: "12 strings × 250 pixels — 180° display",
  },
  {
    name: "Pixel Poles (8)",
    pixels: "2,400",
    description: "300 pixels each — driveway and yard poles",
  },
  {
    name: "Rosa Tombstones (4)",
    pixels: "1,940",
    description: "485 pixels each — large animated tombstones",
  },
  {
    name: "House Outline",
    pixels: "~2,000",
    description: "26 eave sections + 15 vertical runs",
  },
  {
    name: "Tombstones (10)",
    pixels: "1,500",
    description: "4 large (150px) + 6 small tombstones",
  },
  {
    name: "Trees (6)",
    pixels: "1,200",
    description: "Wrapped real trees with spiral patterns",
  },
  {
    name: "Spiders (8)",
    pixels: "975",
    description: "100 px each + 175 px tree topper spider",
  },
  {
    name: "Arches (8)",
    pixels: "800",
    description: "100 pixels each — entrance and yard arches",
  },
  {
    name: "Spiral Trees (8)",
    pixels: "800",
    description: "100 pixels each — GE style spiral trees",
  },
  {
    name: "Fireworks (2)",
    pixels: "720",
    description: "360 pixels each — exploding firework props",
  },
];

// Controller details
const controllers = [
  {
    name: "HinksPix PRO V3",
    role: "Main Controller",
    universes: 171,
    description:
      "Powers house, yard props, spinners, fence, and most display elements. Brightness at 70%.",
  },
  {
    name: "AlphaPix 16",
    role: "Mega Tree",
    universes: 18,
    description:
      "Dedicated controller for the 3,000 pixel mega tree at 100% brightness.",
  },
  {
    name: "AlphaPix Flex",
    role: "AC Controller",
    universes: 1,
    description:
      "Controls AC flood lights and special effects at 100% brightness.",
  },
];

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
  const newFor2026 = getNewSongs(2026);
  const stats = getStats();

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
              <h1 className="show-title font-display">The Show</h1>
              <p className="show-subtitle">
                Real performances, full playlist, and the tech behind the
                pixels.
              </p>
            </div>
            <div className="show-stat-pills">
              <span className="show-stat-pill">
                <span className="show-stat-pill-num">35k+</span> pixels
              </span>
              <span className="show-stat-pill">
                <span className="show-stat-pill-num">{stats.totalSongs}</span>{" "}
                songs
              </span>
              <span className="show-stat-pill">
                <span className="show-stat-pill-num">190</span> universes
              </span>
            </div>
          </div>
        </header>

        {/* Tabbed Content */}
        <TheShowTabs
          videoGroups={videoGroups}
          halloweenSongs={halloweenSongs}
          christmasSongs={christmasSongs}
          newFor2026={newFor2026}
          vendors={vendors}
          displayStats={displayStats}
          propsList={propsList}
          controllers={controllers}
        />
      </div>

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}
