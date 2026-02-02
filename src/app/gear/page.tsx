import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Recommended Gear | Lights of Elm Ridge',
  description: 'The gear, props, and supplies used in the Lights of Elm Ridge display. Direct links to controllers, pixels, spinners, and more.',
};

// Vendor information
const vendors = {
  holidayCoro: { name: 'Holiday Coro', url: 'https://www.holidaycoro.com' },
  gilbertEng: { name: 'Gilbert Engineering', url: 'https://gilbertengineeringusa.com' },
  boscoyo: { name: 'Boscoyo Studio', url: 'https://boscoyostudio.com' },
  efl: { name: 'EFL Designs', url: 'https://efl-designs.com' },
  wiredWatts: { name: 'Wired Watts', url: 'https://www.wiredwatts.com' },
  experienceLights: { name: 'Experience Lights', url: 'https://experiencelights.com' },
  amazon: { name: 'Amazon', url: 'https://www.amazon.com' },
  aliexpress: { name: 'AliExpress', url: 'https://www.aliexpress.us' },
  homeDepot: { name: 'Home Depot', url: 'https://www.homedepot.com' },
};

// Product categories
const gearCategories = [
  {
    name: 'Controllers & Smart Receivers',
    icon: '🎛️',
    description: 'The brains of your light show',
    products: [
      { name: 'HinksPix PRO V3', vendor: 'Holiday Coro', note: 'Main controller - 48 ports', url: 'https://www.holidaycoro.com' },
      { name: 'AlphaPix 16', vendor: 'Holiday Coro', note: 'Great for dedicated mega tree', url: 'https://www.holidaycoro.com' },
      { name: 'Smart Receiver (4-8 Port)', vendor: 'Holiday Coro', note: 'Long range differential receiver', url: 'https://www.holidaycoro.com/Ready2Run-4-8-SPI-Flex-Long-Range-SMART-Receiver-p/936.htm' },
      { name: 'AC Light Controller', vendor: 'Holiday Coro', note: '16-output AC power expansion', url: 'https://www.holidaycoro.com/16-Output-AC-Power-Long-Range-Expansion-Ready2Run-p/939.htm' },
      { name: 'Flex Expansion Board', vendor: 'Holiday Coro', note: 'Long range differential receiver', url: 'https://www.holidaycoro.com/Flex-Long-Range-Differential-Rec' },
    ],
  },
  {
    name: 'Power Supplies & Distribution',
    icon: '⚡',
    description: 'Keep your pixels bright',
    products: [
      { name: 'Mean Well LRS-350-12', vendor: 'Holiday Coro', note: '12V 350W power supply', url: 'https://www.holidaycoro.com/Meanwell-LRS-350-12-12-Volt-350-Watt-Power-Supply-p/47.htm' },
      { name: 'Fuse Blocks', vendor: 'Amazon', note: 'Distribution for multiple runs', url: 'https://www.amazon.com/dp/B07GBV2MHN' },
      { name: '5 Amp Fuses', vendor: 'Holiday Coro', note: 'Blade fuses for protection', url: 'https://www.holidaycoro.com/product-p/875.htm' },
      { name: 'PixaBoost (Null Pixel)', vendor: 'Holiday Coro', note: 'Signal amplifier for long runs', url: 'https://www.holidaycoro.com/Null-Pixel-Amplifier-F-Amp-Booster-PixaBoost-p/748.htm' },
      { name: 'Power Supply Mounting Kit', vendor: 'Holiday Coro', note: 'Dual 350W mounting plate', url: 'https://www.holidaycoro.com/Dual-350w-Power-Supply-Mounting-Kit-p/639-kit1.htm' },
    ],
  },
  {
    name: 'Pixels & LEDs',
    icon: '💡',
    description: 'The stars of the show',
    products: [
      { name: 'WS2811 Bullet Pixels (12mm)', vendor: 'AliExpress', note: 'Bulk pixels - best value', url: 'https://www.aliexpress.us/item/3256805086868911.html' },
      { name: 'Seed/Pebble Pixels', vendor: 'AliExpress', note: 'Small pixels for fence/detail work', url: 'https://www.aliexpress.us/item/3256808393187208.html' },
      { name: 'Seed Pixel Mounting Strips', vendor: 'Boscoyo', note: 'Clean mounting for seed pixels', url: 'https://boscoyostudio.com/products/the-original-mounting-strips-for-seed-pebble-pixels' },
      { name: 'P5 Matrix Panels', vendor: 'Wired Watts', note: 'Build-a-matrix kit', url: 'https://www.wiredwatts.com/build-a-matrix-kit' },
      { name: 'PixNode Net', vendor: 'Holiday Coro', note: 'Matrix mounting net', url: 'https://www.holidaycoro.com/PixNode-Net-RGB-Pixel-Node-Mount' },
    ],
  },
  {
    name: 'Spinners',
    icon: '🌀',
    description: 'Eye-catching rotating displays',
    products: [
      { name: 'GE Overlord Spinner', vendor: 'Gilbert Engineering', note: '1,529 pixels - massive display', url: 'https://gilbertengineeringusa.com/collections/vendors?q=Gilbert%20Engineering%20USA' },
      { name: 'GE Rosa Grande', vendor: 'Gilbert Engineering', note: '1,392 pixels - floral pattern', url: 'https://gilbertengineeringusa.com/collections/vendors?q=Gilbert%20Engineering%20USA' },
      { name: 'GE Fuzion Spinner', vendor: 'Gilbert Engineering', note: '996 pixels - dynamic effects', url: 'https://gilbertengineeringusa.com/products/fuzion' },
      { name: 'Click Click Boom', vendor: 'Gilbert Engineering', note: 'Compact explosive effects', url: 'https://gilbertengineeringusa.com/collections/vendors?q=Gilbert%20Engineering%20USA' },
      { name: 'Space Odyssey', vendor: 'Gilbert Engineering', note: 'Alternative spinner design', url: 'https://gilbertengineeringusa.com/products/space-odyssey' },
    ],
  },
  {
    name: 'Props - Halloween',
    icon: '🎃',
    description: 'Spooky yard decorations',
    products: [
      { name: 'Spiders', vendor: 'Holiday Coro', note: '100 pixels each', url: 'https://www.holidaycoro.com/Spider-p/4013-1.htm' },
      { name: 'Bats', vendor: 'Gilbert Engineering', note: '50 pixels each', url: 'https://gilbertengineeringusa.com/products/bat' },
      { name: 'GE Rosa Tombstones', vendor: 'Gilbert Engineering', note: '485 pixels - animated tombstones', url: 'https://gilbertengineeringusa.com/products/impression-ge-rosa-tomb' },
      { name: 'Mini Tombstones', vendor: 'EFL Designs', note: 'Smaller RIP tombstones', url: 'https://efl-designs.com/product/tombstone-rip/' },
      { name: 'Mini Pumpkins', vendor: 'Holiday Coro', note: 'Jack-o-lantern faces', url: 'https://www.holidaycoro.com' },
    ],
  },
  {
    name: 'Props - Christmas & Year-Round',
    icon: '🎄',
    description: 'Festive display elements',
    products: [
      { name: 'Spiral Trees', vendor: 'Gilbert Engineering', note: 'GE style spiral trees', url: 'https://gilbertengineeringusa.com/products/spiral-tree' },
      { name: 'Singing Tree', vendor: 'Gilbert Engineering', note: 'Animated face tree', url: 'https://gilbertengineeringusa.com/products/singing-tree-with-outline' },
      { name: 'Medium Snowflakes', vendor: 'Gilbert Engineering', note: 'Impression Flake B', url: 'https://gilbertengineeringusa.com/products/impression-flake-b' },
      { name: 'Candy Canes', vendor: 'Gilbert Engineering', note: 'Small impression canes', url: 'https://gilbertengineeringusa.com/products/impression-candy-cane' },
      { name: 'Mini Stars', vendor: 'Holiday Coro', note: 'Small pixel trees', url: 'https://www.holidaycoro.com/PixNode-Pixel-Mini-Tree-p/778.htm' },
    ],
  },
  {
    name: 'Mega Tree & Poles',
    icon: '🌲',
    description: 'Centerpiece elements',
    products: [
      { name: 'Mega Tree Topper (Steel)', vendor: 'Boscoyo', note: '46" true topper', url: 'https://boscoyostudio.com/products/steel-megatree-true-topper-46' },
      { name: 'T-Hooks for Topper', vendor: 'Gilbert Engineering', note: '64-pack for mega tree', url: 'https://gilbertengineeringusa.com/products/t-hooks-for-mega-tree-topper' },
      { name: 'Pixel Poles (NSR)', vendor: 'EFL Designs', note: 'Professional pixel poles', url: 'https://efl-designs.com/product/pixel-pole-nsr/' },
      { name: 'Pixel Pole Top/Bottom', vendor: 'Boscoyo', note: 'Topper caps for poles', url: 'https://boscoyostudio.com/products/mega-tree-topper-12-24' },
      { name: 'Peace Stakes (Pixel Forest)', vendor: 'Holiday Coro', note: 'Slim stakes for pixel forest', url: 'https://www.holidaycoro.com/Peace-Family-Slim-Pixel-Stakes-F' },
    ],
  },
  {
    name: 'Connectors & Wiring',
    icon: '🔌',
    description: 'Keep everything connected',
    products: [
      { name: 'xConnect Extensions (2-20ft)', vendor: 'Gilbert Engineering', note: 'Various lengths available', url: 'https://gilbertengineeringusa.com/products/extensions' },
      { name: 'xConnect Male Pigtails (18AWG)', vendor: 'Holiday Coro', note: 'Heavy duty connections', url: 'https://www.holidaycoro.com/EasyPlug3-Male-Pigtail-xConnect-p/723-m.htm' },
      { name: 'xConnect Female Pigtails (18AWG)', vendor: 'Holiday Coro', note: 'Heavy duty connections', url: 'https://www.holidaycoro.com/EasyPlug3-Female-Pigtail-Dangle-xConnect-p/723-f.htm' },
      { name: 'xConnect T-Splitters', vendor: 'Holiday Coro', note: 'Three-way tap connectors', url: 'https://www.holidaycoro.com/Three-Conductor-Tap-MFF-xConnect-EasyPlug3-p/730.htm' },
      { name: 'Clickits', vendor: 'Experience Lights', note: 'Super fast pixel splicing', url: 'https://experiencelights.com/clickits-super-fast-pixel-splicing/' },
      { name: '2-Wire Low Voltage Wire', vendor: 'Amazon', note: 'For power injection runs', url: 'https://www.amazon.com/gp/product/B07Y6NJDQ4' },
      { name: 'Quick Clips (2-Wire)', vendor: 'Amazon', note: 'Fast wire connections', url: 'https://www.amazon.com/dp/B07FJPMML6' },
    ],
  },
  {
    name: 'Enclosures & Mounting',
    icon: '📦',
    description: 'Protect your equipment',
    products: [
      { name: 'CG-1500 Enclosure', vendor: 'Holiday Coro', note: 'Medium controller enclosure', url: 'https://www.holidaycoro.com/product-p/554.htm' },
      { name: 'HC-2500 Enclosure', vendor: 'Holiday Coro', note: 'Large controller enclosure', url: 'https://www.holidaycoro.com/HC-2500-Holiday-Lighting-Enclosure-System-p/629.htm' },
      { name: 'Receiver Adapter Plate', vendor: 'Holiday Coro', note: 'Mount receivers in enclosures', url: 'https://www.holidaycoro.com/Flex-Expansion-Long-Range-Receivers-to-CG-1500-p/642-kit1.htm' },
      { name: 'Pixel Pipe (Pre-drilled)', vendor: 'Holiday Coro', note: 'Black mounting pipe', url: 'https://www.holidaycoro.com/PixelPipe-Pre-Drilled-Pixel-Mounting-Pipe-p/1800.htm' },
      { name: '3/4" Mounting Rings', vendor: 'Holiday Coro', note: 'Pixel mounting clips', url: 'https://www.holidaycoro.com/product-p/655.htm' },
    ],
  },
  {
    name: 'Tools & Supplies',
    icon: '🔧',
    description: 'Essential build tools',
    products: [
      { name: 'Solder Seal Connectors', vendor: 'Amazon', note: 'Waterproof heat shrink connectors', url: 'https://www.amazon.com/Connectors-Plustool-Self-Solder-Waterproof-Electrical/dp/B0B18NYX2S' },
      { name: 'Grommet Kit (1/2")', vendor: 'Amazon', note: 'With hand tool', url: 'https://www.amazon.com/Grommet-Grommets-Handheld-Manual-Leather/dp/B0D3TCD3W3' },
      { name: 'EMT Conduit (1/2")', vendor: 'Home Depot', note: 'Metal conduit for mounting', url: 'https://www.homedepot.com/p/1-2-in-x-10-ft-Electrical-Metallic-Tubing-EMT-Conduit-0550010000/202068039' },
      { name: 'PVC Pipe (3/4")', vendor: 'Home Depot', note: 'For arches and frames', url: 'https://www.homedepot.com/p/Charlotte-Pipe-3-4-in-x-10-ft-PVC' },
      { name: 'Galvanized Flange (2")', vendor: 'Home Depot', note: 'For pole mounting', url: 'https://www.homedepot.com/p/Southland-2-in-Galvanized-Malleable' },
    ],
  },
];

export default function GearPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Recommended Gear</span>
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            The actual products used in the Lights of Elm Ridge display.
            Direct links to help you build your own show.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-surface rounded-xl p-4 border border-border mb-8 text-center">
          <p className="text-sm text-foreground/60">
            These are products we personally use and recommend. Links are provided for convenience -
            we are not affiliated with these vendors.
          </p>
        </div>

        {/* Vendor Quick Links */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">Trusted Vendors</h2>
          <div className="flex flex-wrap gap-3">
            {Object.values(vendors).map((vendor) => (
              <a
                key={vendor.name}
                href={vendor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-surface hover:bg-surface-light border border-border rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                {vendor.name}
                <svg className="w-3 h-3 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </section>

        {/* Product Categories */}
        {gearCategories.map((category) => (
          <section key={category.name} className="mb-10">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
              <span className="text-3xl">{category.icon}</span>
              {category.name}
            </h2>
            <p className="text-foreground/60 mb-4">{category.description}</p>

            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              <div className="divide-y divide-border">
                {category.products.map((product) => (
                  <div
                    key={product.name}
                    className="p-4 hover:bg-surface-light/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-foreground/60">
                        <span className="text-accent">{product.vendor}</span>
                        {product.note && <span> &middot; {product.note}</span>}
                      </div>
                    </div>
                    {product.url && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent/80 font-medium whitespace-nowrap"
                      >
                        View Product
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Coming Soon - Shopping List Wizard */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-accent/10 via-surface to-accent-secondary/10 rounded-xl p-6 border border-accent/30">
            <div className="flex items-start gap-4">
              <span className="text-4xl">🛒</span>
              <div>
                <h2 className="text-xl font-bold mb-2">Shopping List Builder - Coming Soon</h2>
                <p className="text-foreground/70 mb-3">
                  We&apos;re building an interactive tool to help you create a custom shopping list
                  based on your experience level, budget, and display goals. Answer a few questions
                  and get personalized product recommendations with quantities.
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-foreground/50">
                  <span className="px-2 py-1 bg-surface rounded">Beginner packages</span>
                  <span className="px-2 py-1 bg-surface rounded">Budget calculator</span>
                  <span className="px-2 py-1 bg-surface rounded">Prop suggestions</span>
                  <span className="px-2 py-1 bg-surface rounded">Quantity estimator</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTAs */}
        <section className="text-center">
          <h2 className="text-2xl font-bold mb-4">Need Help Getting Started?</h2>
          <p className="text-foreground/60 mb-6 max-w-lg mx-auto">
            Check out our display specs or browse sequences that work with various setups.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/display"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent/80 text-white font-semibold rounded-xl transition-colors"
            >
              View Our Setup
            </Link>
            <Link
              href="/sequences"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface hover:bg-surface-light border border-border text-foreground font-semibold rounded-xl transition-colors"
            >
              Browse Sequences
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
