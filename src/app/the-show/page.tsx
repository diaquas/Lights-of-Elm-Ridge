import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Show | Light of Elm Ridge',
  description: 'Watch real footage from our RGB pixel light show. See xLights mockups, live performances, and behind the scenes content.',
};

// Mockup videos - xLights sequence previews
const mockupVideos = [
  {
    id: 1,
    title: "The Dead Dance",
    artist: "A. Vex",
    youtubeId: "eyXwPMxZ7-E",
    description: "Spooky season vibes with this eerie dance sequence. Perfect for Halloween displays.",
  },
  {
    id: 2,
    title: "Abracadabra",
    artist: "Steve Miller Band",
    youtubeId: "U_h451HtYt4",
    description: "Classic rock magic brought to life in pixels. One of our most popular sequences.",
  },
  {
    id: 3,
    title: "Shadow",
    artist: "Sam Tinnesz",
    youtubeId: "GY7YOffoC_0",
    description: "Dark and moody with dynamic light effects that really pop on a matrix display.",
  },
  {
    id: 4,
    title: "Darkside",
    artist: "Neoni",
    youtubeId: "2cfsWcecOlU",
    description: "Modern electronic vibes with intense pixel movement. A crowd favorite.",
  },
];

// Live show footage - actual performances
const liveVideos = [
  {
    id: 1,
    title: "2024 Christmas Show - Full Loop",
    description: "The complete show loop from our 2024 season. Features synchronized FM audio.",
    youtubeId: null, // Placeholder - add your live video IDs
    duration: "45:00",
    category: "Full Show",
  },
  {
    id: 2,
    title: "Halloween 2024 Highlights",
    description: "Best moments from our spooky season display. Neighbors still recovering.",
    youtubeId: null,
    duration: "12:00",
    category: "Highlights",
  },
  {
    id: 3,
    title: "Opening Night 2024",
    description: "First night reactions and the full light-up moment. Pure magic.",
    youtubeId: null,
    duration: "8:00",
    category: "Special Event",
  },
];

// Behind the scenes / tutorials
const behindScenesVideos = [
  {
    id: 1,
    title: "Display Setup Timelapse",
    description: "Two weeks of work compressed into a few minutes. The back pain was real.",
    youtubeId: null,
    duration: "5:00",
    category: "Timelapse",
  },
  {
    id: 2,
    title: "xLights Sequencing Basics",
    description: "How I approach sequencing a new song from start to finish.",
    youtubeId: null,
    duration: "15:00",
    category: "Tutorial",
  },
  {
    id: 3,
    title: "Prop Building Workshop",
    description: "Building custom props on a budget. Spoiler: zip ties are your friend.",
    youtubeId: null,
    duration: "20:00",
    category: "Workshop",
  },
];

const stats = [
  { label: "Pixels", value: "15,000+" },
  { label: "Props", value: "35" },
  { label: "Channels", value: "45,000+" },
  { label: "Extension Cords", value: "Too Many" },
];

export default function TheShowPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">The Show</span>
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            From xLights mockups to live performances — watch the pixels come alive.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface rounded-xl p-6 text-center border border-border">
              <div className="text-2xl md:text-3xl font-bold gradient-text mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-foreground/60">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Section 1: xLights Mockups */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl">💻</span>
            <div>
              <h2 className="text-2xl font-bold">xLights Mockups</h2>
              <p className="text-foreground/60">Sequence previews rendered in xLights — see what you&apos;re buying before you buy</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {mockupVideos.map((video) => (
              <div
                key={video.id}
                className="bg-surface rounded-xl overflow-hidden border border-border"
              >
                {/* YouTube Embed */}
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.youtubeId}`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="p-4">
                  <span className="text-xs text-accent font-medium">{video.artist}</span>
                  <h3 className="font-semibold mt-1">{video.title}</h3>
                  <p className="text-sm text-foreground/50 mt-2">
                    {video.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <a
              href="/sequences"
              className="inline-flex items-center gap-2 text-accent hover:text-accent-secondary transition-colors"
            >
              View all sequences →
            </a>
          </div>
        </section>

        {/* Section 2: Live Show Footage */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl">🏠</span>
            <div>
              <h2 className="text-2xl font-bold">Live Show Footage</h2>
              <p className="text-foreground/60">Real performances from our actual display — pixels on props, not just screens</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {liveVideos.map((video) => (
              <div
                key={video.id}
                className="bg-surface rounded-xl overflow-hidden border border-border card-hover group"
              >
                {/* Video placeholder or embed */}
                <div className="aspect-video bg-gradient-to-br from-accent/10 to-accent-secondary/10 relative">
                  {video.youtubeId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${video.youtubeId}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-5xl block mb-2">🎬</span>
                          <p className="text-foreground/40 text-sm">Coming soon</p>
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </div>
                    </>
                  )}
                </div>
                <div className="p-4">
                  <span className="text-xs text-accent font-medium">{video.category}</span>
                  <h3 className="font-semibold mt-1 group-hover:text-accent transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-sm text-foreground/50 mt-2">
                    {video.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-surface-light rounded-xl border border-border text-center">
            <p className="text-foreground/60">
              📹 More live footage coming as we capture the 2024-2025 season!
            </p>
          </div>
        </section>

        {/* Section 3: Behind the Scenes */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl">🎥</span>
            <div>
              <h2 className="text-2xl font-bold">Behind the Scenes</h2>
              <p className="text-foreground/60">Setup timelapses, tutorials, and all the nerdy details you didn&apos;t know you needed</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {behindScenesVideos.map((video) => (
              <div
                key={video.id}
                className="bg-surface rounded-xl overflow-hidden border border-border card-hover group"
              >
                {/* Video placeholder or embed */}
                <div className="aspect-video bg-gradient-to-br from-accent/10 to-accent-secondary/10 relative">
                  {video.youtubeId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${video.youtubeId}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-5xl block mb-2">🔧</span>
                          <p className="text-foreground/40 text-sm">Coming soon</p>
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </div>
                    </>
                  )}
                </div>
                <div className="p-4">
                  <span className="text-xs text-accent font-medium">{video.category}</span>
                  <h3 className="font-semibold mt-1 group-hover:text-accent transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-sm text-foreground/50 mt-2">
                    {video.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <a
              href="/behind-the-scenes"
              className="inline-flex items-center gap-2 text-accent hover:text-accent-secondary transition-colors"
            >
              More behind the scenes content →
            </a>
          </div>
        </section>

        {/* Subscribe CTA */}
        <div className="bg-gradient-to-r from-red-500/10 via-surface to-red-500/10 rounded-xl p-8 border border-border text-center mb-16">
          <div className="text-5xl mb-4">📺</div>
          <h2 className="text-2xl font-bold mb-3">Don&apos;t Miss a Show</h2>
          <p className="text-foreground/60 mb-6 max-w-xl mx-auto">
            Subscribe to our YouTube channel for new mockups, live show footage,
            and behind-the-scenes content as we build and grow the display.
          </p>
          <a
            href="https://www.youtube.com/channel/UCKvEDoz59mtUv2UCuJq6vuA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Subscribe on YouTube
          </a>
        </div>

        {/* Display Info */}
        <div className="bg-surface rounded-xl p-8 border border-border">
          <h2 className="text-2xl font-bold mb-6">About the Display</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3 text-accent">The Setup</h3>
              <ul className="space-y-2 text-foreground/70">
                <li>• 15,000+ individually addressable RGB pixels</li>
                <li>• 35 custom props and elements</li>
                <li>• Multiple Falcon controllers</li>
                <li>• FM transmitter for drive-by audio</li>
                <li>• Way too many zip ties</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-accent">Show Schedule</h3>
              <ul className="space-y-2 text-foreground/70">
                <li>• Halloween: Mid-October through October 31</li>
                <li>• Christmas: Thanksgiving through New Year</li>
                <li>• Show times: Dusk to 10pm nightly</li>
                <li>• Special midnight show New Year&apos;s Eve</li>
              </ul>
            </div>
          </div>
          <p className="mt-6 text-foreground/50 text-sm">
            Tune to our FM frequency for audio when you visit!
          </p>
        </div>
      </div>
    </div>
  );
}
