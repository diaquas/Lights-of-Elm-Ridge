import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Show | Light of Elm Ridge',
  description: 'Watch real footage from our RGB pixel light show. Live performances from our actual display.',
};

// YouTube playlist IDs
const playlists = {
  live2025: 'PLNrebbWMDXn0o1Bipyk5pbxTbG0gYxyqF',
  live2024: 'PLNrebbWMDXn25mqAx7N1M4XUun46lTaXy',
};

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
            Real performances from our actual display — pixels on props, not just screens.
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

        {/* Live Show Footage */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🏠</span>
            <div>
              <h2 className="text-2xl font-bold">Live Show Footage</h2>
              <p className="text-foreground/60">Watch our display in action — real shows, real pixels, real neighbors wondering what&apos;s going on</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 2025 Season */}
            <div className="bg-surface rounded-xl overflow-hidden border border-border">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-lg">2025 Season</h3>
                <p className="text-foreground/50 text-sm">Latest shows and updates</p>
              </div>
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/videoseries?list=${playlists.live2025}`}
                  title="Live Shows 2025 Playlist"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="p-4">
                <a
                  href={`https://www.youtube.com/playlist?list=${playlists.live2025}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-secondary text-sm font-medium transition-colors"
                >
                  View full playlist →
                </a>
              </div>
            </div>

            {/* 2024 Season */}
            <div className="bg-surface rounded-xl overflow-hidden border border-border">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-lg">2024 Season</h3>
                <p className="text-foreground/50 text-sm">Last year&apos;s highlights</p>
              </div>
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/videoseries?list=${playlists.live2024}`}
                  title="Live Shows 2024 Playlist"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="p-4">
                <a
                  href={`https://www.youtube.com/playlist?list=${playlists.live2024}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-secondary text-sm font-medium transition-colors"
                >
                  View full playlist →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Behind the Scenes */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🎥</span>
            <div>
              <h2 className="text-2xl font-bold">Behind the Scenes</h2>
              <p className="text-foreground/60">Setup timelapses, tutorials, and all the nerdy details you didn&apos;t know you needed</p>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-8 border border-border text-center">
            <span className="text-6xl block mb-4">🔧</span>
            <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
            <p className="text-foreground/60 max-w-md mx-auto">
              Behind-the-scenes content, setup tutorials, and how-to guides are in the works.
              Subscribe to get notified when they drop.
            </p>
            <a
              href="/behind-the-scenes"
              className="inline-flex items-center gap-2 mt-6 text-accent hover:text-accent-secondary transition-colors"
            >
              Learn more about what&apos;s coming →
            </a>
          </div>
        </section>

        {/* Subscribe CTA */}
        <div className="bg-gradient-to-r from-red-500/10 via-surface to-red-500/10 rounded-xl p-8 border border-border text-center mb-16">
          <div className="text-5xl mb-4">📺</div>
          <h2 className="text-2xl font-bold mb-3">Don&apos;t Miss a Show</h2>
          <p className="text-foreground/60 mb-6 max-w-xl mx-auto">
            Subscribe to our YouTube channel for new live show footage
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
