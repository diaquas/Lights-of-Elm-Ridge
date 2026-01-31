import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Show | Light of Elm Ridge',
  description: 'Watch real footage from our RGB pixel light show. See how xLights sequences look on an actual display.',
};

// Placeholder video data
const showVideos = [
  {
    id: 1,
    title: "2024 Christmas Show - Full Loop",
    description: "The complete 45-minute show loop from our 2024 season. Grab some hot cocoa and enjoy.",
    duration: "45:23",
    year: 2024,
    category: "Full Show",
    views: "2.4K",
    youtubeId: "placeholder",
  },
  {
    id: 2,
    title: "Carol of the Bells - Live",
    description: "TSO classic doing what it does best. Watch those pixels MOVE.",
    duration: "3:24",
    year: 2024,
    category: "Individual Song",
    views: "1.8K",
    youtubeId: "placeholder",
  },
  {
    id: 3,
    title: "Wizards in Winter - Live",
    description: "Our most requested sequence. The moving heads really shine on this one (pun absolutely intended).",
    duration: "3:08",
    year: 2024,
    category: "Individual Song",
    views: "3.1K",
    youtubeId: "placeholder",
  },
  {
    id: 4,
    title: "Halloween 2024 Highlights",
    description: "Spooky season compilation. Some say the neighbors still haven't recovered.",
    duration: "12:45",
    year: 2024,
    category: "Highlights",
    views: "987",
    youtubeId: "placeholder",
  },
  {
    id: 5,
    title: "New Year's Countdown 2024",
    description: "Ball drop, firework effects, and lots of happy people in the cold. Good times.",
    duration: "4:32",
    year: 2024,
    category: "Special Event",
    views: "1.2K",
    youtubeId: "placeholder",
  },
  {
    id: 6,
    title: "Display Setup Timelapse",
    description: "Two weeks of work compressed into 3 minutes. The back pain was real.",
    duration: "3:15",
    year: 2024,
    category: "Behind the Scenes",
    views: "756",
    youtubeId: "placeholder",
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
            <span className="gradient-text">The Real Show</span>
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Mockups are great, but nothing beats seeing sequences on an actual house
            with actual pixels doing actual light show things.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface rounded-xl p-6 text-center border border-border">
              <div className="text-2xl md:text-3xl font-bold gradient-text mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-foreground/60">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Featured Video */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">⭐</span>
            Featured: 2024 Christmas Show
          </h2>
          <div className="bg-surface rounded-xl overflow-hidden border border-border">
            {/* Video placeholder */}
            <div className="aspect-video bg-gradient-to-br from-accent/20 via-surface to-accent-secondary/20 flex items-center justify-center relative group">
              <div className="text-center">
                <span className="text-8xl block mb-4">🏠</span>
                <p className="text-foreground/60">Video coming soon!</p>
                <p className="text-foreground/40 text-sm mt-2">
                  (YouTube embed will go here)
                </p>
              </div>
              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                  <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">2024 Christmas Show - Full Loop</h3>
              <p className="text-foreground/60 mb-4">
                The complete 45-minute show loop from our 2024 season. Features 18 songs,
                synchronized to FM radio broadcast. Warning: May cause excessive holiday cheer.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-foreground/50">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  45:23
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  2.4K views
                </span>
                <span>Christmas 2024</span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">All Videos</h2>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {["All", "Full Show", "Individual Song", "Highlights", "Special Event"].map((filter) => (
              <button
                key={filter}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === "All"
                    ? "bg-accent text-white"
                    : "bg-surface hover:bg-surface-light text-foreground/70"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {showVideos.map((video) => (
              <div
                key={video.id}
                className="bg-surface rounded-xl overflow-hidden border border-border card-hover group"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-accent/10 to-accent-secondary/10 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl">
                      {video.category === 'Behind the Scenes' ? '🎬' :
                       video.category === 'Full Show' ? '🏠' :
                       video.category === 'Special Event' ? '🎆' : '🎵'}
                    </span>
                  </div>
                  {/* Duration badge */}
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </div>
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <span className="text-xs text-accent font-medium">{video.category}</span>
                  <h3 className="font-semibold mt-1 group-hover:text-accent transition-colors">
                    {video.title}
                  </h3>
                  <p className="text-sm text-foreground/50 mt-2 line-clamp-2">
                    {video.description}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-foreground/40">
                    <span>{video.views} views</span>
                    <span>{video.year}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscribe CTA */}
        <div className="bg-gradient-to-r from-red-500/10 via-surface to-red-500/10 rounded-xl p-8 border border-border text-center">
          <div className="text-5xl mb-4">📺</div>
          <h2 className="text-2xl font-bold mb-3">Don&apos;t Miss a Show</h2>
          <p className="text-foreground/60 mb-6 max-w-xl mx-auto">
            Subscribe to our YouTube channel for new videos, behind-the-scenes content,
            and front-row seats to every light show season.
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Subscribe on YouTube
          </a>
        </div>

        {/* Display Info */}
        <div className="mt-16 bg-surface rounded-xl p-8 border border-border">
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
              <h3 className="font-semibold mb-3 text-accent">Show Schedule (2024)</h3>
              <ul className="space-y-2 text-foreground/70">
                <li>• Halloween: Oct 15 - Nov 1</li>
                <li>• Christmas: Nov 28 - Jan 1</li>
                <li>• Show times: Dusk to 10pm nightly</li>
                <li>• Special midnight show New Year&apos;s Eve</li>
              </ul>
            </div>
          </div>
          <p className="mt-6 text-foreground/50 text-sm">
            Located in [Your City] - tune to 101.1 FM for audio when you visit!
          </p>
        </div>
      </div>
    </div>
  );
}
