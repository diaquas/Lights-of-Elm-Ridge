import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About the Display',
  description: 'Technical specifications and hardware details for the Lights of Elm Ridge display. Learn about our pixel count, controllers, xLights setup, and more.',
};

// Display specifications
const displaySpecs = {
  totalPixels: '15,000+',
  controllers: 'Falcon F48',
  xlightsVersion: '2024.x',
  showComputer: 'Raspberry Pi 4',
  powerSupply: '350A @ 5V',
  fmTransmitter: '87.9 FM',
};

const propsList = [
  { name: 'Mega Tree', pixels: '2,500', description: '16 strings of 156 pixels each, 12ft tall' },
  { name: 'Matrix', pixels: '2,048', description: '32x64 P10 panel display for videos and effects' },
  { name: 'Arches', pixels: '1,200', description: '8 arches with 150 pixels each' },
  { name: 'Mini Trees', pixels: '1,600', description: '8 spiral trees, 200 pixels each' },
  { name: 'Roof Line', pixels: '1,500', description: 'C9 style pixels outlining the roofline' },
  { name: 'Window Frames', pixels: '800', description: 'Pixel outlines on 4 front windows' },
  { name: 'Candy Canes', pixels: '600', description: '12 candy canes along the driveway' },
  { name: 'Snowflakes', pixels: '480', description: '8 large pixel snowflakes' },
  { name: 'Singing Faces', pixels: '400', description: '2 singing pumpkins / snowmen' },
  { name: 'Misc Props', pixels: '3,872+', description: 'Stars, wreaths, ground stakes, and more' },
];

export default function DisplayPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">About the Display</span>
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            The technical details behind the Lights of Elm Ridge show.
            Everything you need to know about our setup.
          </p>
        </div>

        {/* Hero Image */}
        <div className="relative aspect-video rounded-xl overflow-hidden border border-border mb-12">
          <Image
            src="/layout.jpg"
            alt="Lights of Elm Ridge xLights Layout"
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-6 left-6">
            <span className="px-3 py-1 bg-accent/90 text-white rounded-full text-sm font-medium">
              xLights Layout View
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl font-bold gradient-text">{displaySpecs.totalPixels}</div>
            <div className="text-foreground/60 text-sm">Total Pixels</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl font-bold text-accent">{displaySpecs.controllers}</div>
            <div className="text-foreground/60 text-sm">Controller</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl font-bold text-green-400">{displaySpecs.xlightsVersion}</div>
            <div className="text-foreground/60 text-sm">xLights Version</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl font-bold text-blue-400">{displaySpecs.showComputer}</div>
            <div className="text-foreground/60 text-sm">Show Player</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl font-bold text-yellow-400">{displaySpecs.powerSupply}</div>
            <div className="text-foreground/60 text-sm">Power</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl font-bold text-purple-400">{displaySpecs.fmTransmitter}</div>
            <div className="text-foreground/60 text-sm">FM Station</div>
          </div>
        </div>

        {/* Props Breakdown */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">🎄</span>
            Props & Pixel Counts
          </h2>
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-light">
                <tr>
                  <th className="text-left p-4 font-semibold">Prop</th>
                  <th className="text-left p-4 font-semibold">Pixels</th>
                  <th className="text-left p-4 font-semibold hidden md:table-cell">Details</th>
                </tr>
              </thead>
              <tbody>
                {propsList.map((prop, index) => (
                  <tr key={prop.name} className={index % 2 === 0 ? 'bg-surface' : 'bg-surface-light/50'}>
                    <td className="p-4 font-medium">{prop.name}</td>
                    <td className="p-4 text-accent font-mono">{prop.pixels}</td>
                    <td className="p-4 text-foreground/60 hidden md:table-cell">{prop.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Hardware Details */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            Hardware Setup
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="font-bold text-lg mb-4 text-accent">Controllers</h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Falcon F48</strong> - Main controller handling all pixel outputs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Differential Receivers</strong> - Extended runs to distant props</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Ethernet Network</strong> - E1.31 protocol over Cat6</span>
                </li>
              </ul>
            </div>
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="font-bold text-lg mb-4 text-accent">Power Distribution</h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Mean Well LRS-350-5</strong> - Multiple 5V power supplies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Power Injection</strong> - Every 150 pixels for consistent brightness</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Dedicated Circuits</strong> - 4 x 20A circuits for the display</span>
                </li>
              </ul>
            </div>
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="font-bold text-lg mb-4 text-accent">Show Player</h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Raspberry Pi 4</strong> - Running Falcon Player (FPP)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Scheduled Playlists</strong> - Automated show times</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>FM Transmitter</strong> - Tune to 87.9 FM for audio</span>
                </li>
              </ul>
            </div>
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="font-bold text-lg mb-4 text-accent">Pixels</h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>WS2811 Bullet Nodes</strong> - 12mm for most props</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>WS2812B Strips</strong> - 60 LEDs/m for matrix and detailed props</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>IP67 Waterproof</strong> - All outdoor-rated connections</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Software */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">💻</span>
            Software & Sequencing
          </h2>
          <div className="bg-surface rounded-xl p-6 border border-border">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-bold text-lg mb-3">xLights</h3>
                <p className="text-foreground/70 text-sm mb-2">
                  All sequences are created in xLights {displaySpecs.xlightsVersion}.
                  The layout file is optimized for our specific prop setup.
                </p>
                <a
                  href="https://xlights.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent text-sm hover:underline inline-flex items-center gap-1"
                >
                  xlights.org
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-3">Falcon Player</h3>
                <p className="text-foreground/70 text-sm mb-2">
                  FPP runs on our Raspberry Pi, playing FSEQ files and
                  managing show schedules automatically.
                </p>
                <a
                  href="https://falconchristmas.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent text-sm hover:underline inline-flex items-center gap-1"
                >
                  falconchristmas.com
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-3">Remapping</h3>
                <p className="text-foreground/70 text-sm mb-2">
                  Our sequences can be remapped to your layout using xLights&apos;
                  built-in mapping tools. Custom remapping available on request.
                </p>
                <Link
                  href="/sequences"
                  className="text-accent text-sm hover:underline inline-flex items-center gap-1"
                >
                  Browse sequences
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Compatibility Notice */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-accent/10 via-surface to-accent-secondary/10 rounded-xl p-6 border border-border">
            <h2 className="text-xl font-bold mb-4">Can I Run These Sequences?</h2>
            <p className="text-foreground/70 mb-4">
              Our sequences are designed for matrix-capable displays but can be remapped to work with
              most xLights setups. Key requirements:
            </p>
            <ul className="grid md:grid-cols-2 gap-3 text-foreground/70">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                xLights 2023 or newer recommended
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Matrix support for full effects (optional)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                E1.31 or DDP capable controller
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Basic remapping knowledge helpful
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Light Up Your Display?</h2>
          <p className="text-foreground/60 mb-6 max-w-lg mx-auto">
            Check out our sequence collection and find something perfect for your show.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sequences"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-xl transition-colors"
            >
              Browse Sequences
            </Link>
            <Link
              href="/the-show"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-surface-light border border-border text-foreground font-semibold rounded-xl transition-colors"
            >
              Watch the Show
            </Link>
          </div>
        </section>

        {/* Back */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
