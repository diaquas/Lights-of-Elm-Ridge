import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About the Display | Lights of Elm Ridge',
  description: 'Technical specifications and hardware details for the Lights of Elm Ridge display. 35,000+ pixels, HinksPix PRO V3 controller, custom spinners, and more.',
};

// Display specifications from xLights export
const displaySpecs = {
  totalPixels: '35,000+',
  universes: '190',
  controllers: '3',
  xlightsVersion: '2024.20+',
  showComputer: 'xSchedule',
  fmTransmitter: '87.9 FM',
};

// Props list from Export Models.xlsx - actual pixel counts
const propsList = [
  { name: 'Matrix', pixels: '7,168', description: '70x102 P10 panel - videos, images, text effects' },
  { name: 'Spinners (6)', pixels: '5,792', description: 'Fuzion, Rosa Grande, Overlord, 3x Showstopper, Click Click Boom' },
  { name: 'Fence Panels (7)', pixels: '4,655', description: '665 pixels each - vertical pixel fence sections' },
  { name: 'Mega Tree', pixels: '3,000', description: '12 strings x 250 pixels - 180° display' },
  { name: 'Pixel Poles (8)', pixels: '2,400', description: '300 pixels each - driveway and yard poles' },
  { name: 'GE Rosa Tombstones (4)', pixels: '1,940', description: '485 pixels each - large animated tombstones' },
  { name: 'House Outline', pixels: '~2,000', description: '26 eave sections + 15 vertical runs' },
  { name: 'Tombstones (10)', pixels: '1,500', description: '4 large (150px) + 6 small tombstones' },
  { name: 'Trees - Real (6)', pixels: '1,200', description: 'Wrapped real trees with spiral patterns' },
  { name: 'Spiders (8)', pixels: '975', description: '100 pixels each + 175 pixel tree topper spider' },
  { name: 'Arches (8)', pixels: '800', description: '100 pixels each - entrance and yard arches' },
  { name: 'Spiral Trees (8)', pixels: '800', description: '100 pixels each - GE style spiral trees' },
  { name: 'Fireworks (2)', pixels: '720', description: '360 pixels each - exploding firework props' },
  { name: 'Windows (5)', pixels: '600', description: 'Office, Tower, Avery, Ellis, Garage outlines' },
  { name: 'Tune-To-Matrix (2)', pixels: '640', description: 'FM frequency display signs' },
  { name: 'Driveway', pixels: '500', description: 'Ground-level driveway outline' },
  { name: 'Bats (7)', pixels: '350', description: '50 pixels each - flying bat props' },
  { name: 'Pumpkin Minis (8)', pixels: '264', description: '33 pixels each - small jack-o-lanterns' },
  { name: 'Singing Pumpkin', pixels: '75', description: 'Animated mouth for lip-sync effects' },
];

// Controller details from xlights_networks.xml
const controllers = [
  {
    name: 'HinksPix PRO V3',
    role: 'Main Controller',
    universes: 171,
    brightness: '70%',
    description: 'Powers house, yard props, spinners, fence, and most display elements',
  },
  {
    name: 'HolidayCoro AlphaPix 16',
    role: 'Mega Tree Controller',
    universes: 18,
    brightness: '100%',
    description: 'Dedicated controller for the 3,000 pixel mega tree',
  },
  {
    name: 'HolidayCoro AlphaPix Flex',
    role: 'AC Controller',
    universes: 1,
    brightness: '100%',
    description: 'Controls AC flood lights and special effects',
  },
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
            <div className="text-2xl font-bold text-accent">{displaySpecs.universes}</div>
            <div className="text-foreground/60 text-sm">Universes</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl font-bold text-green-400">{displaySpecs.controllers}</div>
            <div className="text-foreground/60 text-sm">Controllers</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl font-bold text-blue-400">{displaySpecs.xlightsVersion}</div>
            <div className="text-foreground/60 text-sm">xLights</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl font-bold text-yellow-400">{displaySpecs.showComputer}</div>
            <div className="text-foreground/60 text-sm">Show Player</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl font-bold text-purple-400">{displaySpecs.fmTransmitter}</div>
            <div className="text-foreground/60 text-sm">FM Station</div>
          </div>
        </div>

        {/* Controllers Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">🎛️</span>
            Controllers
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {controllers.map((controller) => (
              <div key={controller.name} className="bg-surface rounded-xl p-5 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-accent">{controller.name}</h3>
                  <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
                    {controller.universes} universes
                  </span>
                </div>
                <p className="text-sm text-foreground/60 mb-2">{controller.role}</p>
                <p className="text-sm text-foreground/70">{controller.description}</p>
                <div className="mt-3 text-xs text-foreground/50">
                  Brightness: {controller.brightness}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Props Breakdown */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">🎃</span>
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

        {/* Spinner Spotlight */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">🌀</span>
            Spinner Collection
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-surface rounded-xl p-5 border border-border">
              <h3 className="font-bold mb-2">Overlord</h3>
              <p className="text-2xl font-mono text-accent mb-2">1,529 px</p>
              <p className="text-sm text-foreground/60">Massive GE-style spinner with intricate submodels</p>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-border">
              <h3 className="font-bold mb-2">Rosa Grande</h3>
              <p className="text-2xl font-mono text-accent mb-2">1,392 px</p>
              <p className="text-sm text-foreground/60">Elegant floral pattern spinner</p>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-border">
              <h3 className="font-bold mb-2">Fuzion</h3>
              <p className="text-2xl font-mono text-accent mb-2">996 px</p>
              <p className="text-sm text-foreground/60">Dynamic effects with inner/outer rings</p>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-border">
              <h3 className="font-bold mb-2">Showstopper (x3)</h3>
              <p className="text-2xl font-mono text-accent mb-2">541 px each</p>
              <p className="text-sm text-foreground/60">Triple set of matching yard spinners</p>
            </div>
            <div className="bg-surface rounded-xl p-5 border border-border">
              <h3 className="font-bold mb-2">Click Click Boom</h3>
              <p className="text-2xl font-mono text-accent mb-2">252 px</p>
              <p className="text-sm text-foreground/60">Compact spinner with explosive effects</p>
            </div>
            <div className="bg-gradient-to-br from-accent/20 to-accent-secondary/20 rounded-xl p-5 border border-accent/30">
              <h3 className="font-bold mb-2">Total Spinners</h3>
              <p className="text-2xl font-mono gradient-text mb-2">5,792 px</p>
              <p className="text-sm text-foreground/60">6 spinners across the display</p>
            </div>
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
              <h3 className="font-bold text-lg mb-4 text-accent">Network</h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>E1.31 Protocol</strong> - Industry standard lighting control</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>190 Universes</strong> - 510 channels each</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Smart Receivers</strong> - Differential signal boosting for long runs</span>
                </li>
              </ul>
            </div>
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="font-bold text-lg mb-4 text-accent">Power Distribution</h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>5V Power Supplies</strong> - Multiple Mean Well units</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Power Injection</strong> - Every 150 pixels for brightness</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Dedicated Circuits</strong> - Multiple 20A circuits</span>
                </li>
              </ul>
            </div>
            <div className="bg-surface rounded-xl p-6 border border-border">
              <h3 className="font-bold text-lg mb-4 text-accent">Show Player</h3>
              <ul className="space-y-3 text-foreground/70">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>xSchedule</strong> - xLights native scheduler and player</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>Remote Falcon</strong> - Viewers can request songs from their phone</span>
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
                  <span><strong>WS2812B Strips</strong> - Matrix and detailed props</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span><strong>IP67 Waterproof</strong> - All outdoor-rated</span>
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
                  Full model groups and submodels for detailed effects.
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
                  FPP plays FSEQ files and manages show schedules.
                  Remote control via web interface.
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
                xLights 2024 or newer recommended
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
