import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Recommended Gear | Lights of Elm Ridge',
  description: 'The gear, props, and supplies used in the Lights of Elm Ridge display. Direct links to controllers, pixels, spinners, and more.',
};

// Vendor information with colors for badges
const vendors = {
  holidayCoro: { name: 'Holiday Coro', url: 'https://www.holidaycoro.com', color: 'bg-red-500/20 text-red-400' },
  gilbertEng: { name: 'Gilbert Engineering', url: 'https://gilbertengineeringusa.com', color: 'bg-blue-500/20 text-blue-400' },
  boscoyo: { name: 'Boscoyo Studio', url: 'https://boscoyostudio.com', color: 'bg-purple-500/20 text-purple-400' },
  efl: { name: 'EFL Designs', url: 'https://efl-designs.com', color: 'bg-green-500/20 text-green-400' },
  wiredWatts: { name: 'Wired Watts', url: 'https://www.wiredwatts.com', color: 'bg-yellow-500/20 text-yellow-400' },
  experienceLights: { name: 'Experience Lights', url: 'https://experiencelights.com', color: 'bg-pink-500/20 text-pink-400' },
  amazon: { name: 'Amazon', url: 'https://www.amazon.com', color: 'bg-orange-500/20 text-orange-400' },
  aliexpress: { name: 'AliExpress', url: 'https://www.aliexpress.us', color: 'bg-amber-500/20 text-amber-400' },
  homeDepot: { name: 'Home Depot', url: 'https://www.homedepot.com', color: 'bg-orange-600/20 text-orange-400' },
};

type VendorKey = keyof typeof vendors;

interface Product {
  name: string;
  vendor: VendorKey;
  note?: string;
  url?: string;
  qty?: number | string;
  pixels?: number;
  highlight?: boolean;
}

interface Category {
  name: string;
  icon: string;
  description: string;
  products: Product[];
}

// Product categories with quantities from xLights
const gearCategories: Category[] = [
  {
    name: 'Controllers',
    icon: '🎛️',
    description: 'The brains of your light show',
    products: [
      { name: 'HinksPix PRO V3', vendor: 'holidayCoro', note: 'Main controller - 48 ports, 171 universes', url: 'https://www.holidaycoro.com', qty: 1, highlight: true },
      { name: 'AlphaPix 16', vendor: 'holidayCoro', note: 'Dedicated mega tree controller, 18 universes', url: 'https://www.holidaycoro.com', qty: 1 },
      { name: 'AlphaPix Flex', vendor: 'holidayCoro', note: 'AC light controller, 1 universe', url: 'https://www.holidaycoro.com', qty: 1 },
      { name: 'Smart Receiver (4-8 Port)', vendor: 'holidayCoro', note: 'Long range differential receiver', url: 'https://www.holidaycoro.com/Ready2Run-4-8-SPI-Flex-Long-Range-SMART-Receiver-p/936.htm', qty: 6 },
      { name: 'Flex Expansion Board', vendor: 'holidayCoro', note: 'Long range differential receiver', url: 'https://www.holidaycoro.com/Flex-Long-Range-Differential-Rec', qty: 3 },
    ],
  },
  {
    name: 'Spinners',
    icon: '🌀',
    description: 'Eye-catching rotating displays - 7 total spinners',
    products: [
      { name: 'Showstopper Spinner', vendor: 'efl', note: 'Stunning multi-ring spinner', url: 'https://efl-designs.com/product/showstopper-spinner/', qty: 3, highlight: true },
      { name: 'GE Overlord', vendor: 'gilbertEng', note: 'Massive 1,529 pixel display', url: 'https://gilbertengineeringusa.com/collections/vendors?q=Gilbert%20Engineering%20USA', qty: 1, pixels: 1529, highlight: true },
      { name: 'GE Rosa Grande', vendor: 'gilbertEng', note: 'Beautiful floral pattern', url: 'https://gilbertengineeringusa.com/collections/vendors?q=Gilbert%20Engineering%20USA', qty: 1, pixels: 1392 },
      { name: 'GE Fuzion', vendor: 'gilbertEng', note: 'Dynamic effect spinner', url: 'https://gilbertengineeringusa.com/products/fuzion', qty: 1, pixels: 996 },
      { name: 'GE Click Click Boom', vendor: 'gilbertEng', note: 'Compact explosive effects', url: 'https://gilbertengineeringusa.com/collections/vendors?q=Gilbert%20Engineering%20USA', qty: 1 },
    ],
  },
  {
    name: 'Halloween Props',
    icon: '🎃',
    description: 'Spooky yard decorations',
    products: [
      { name: 'GE Preying Spider', vendor: 'gilbertEng', note: '350+ pixels each', url: 'https://gilbertengineeringusa.com/products/preying-spider', qty: 8, pixels: 350 },
      { name: 'GE Bat', vendor: 'gilbertEng', note: '50 pixels each', url: 'https://gilbertengineeringusa.com/products/bat', qty: 7, pixels: 50 },
      { name: 'GE Rosa Tombstones', vendor: 'gilbertEng', note: '485 pixels - animated tombstones', url: 'https://gilbertengineeringusa.com/products/impression-ge-rosa-tomb', qty: 4, pixels: 485 },
      { name: 'Mini Tombstones', vendor: 'efl', note: 'RIP tombstones', url: 'https://efl-designs.com/product/tombstone-rip/', qty: 6 },
      { name: 'Mini Pumpkins', vendor: 'holidayCoro', note: 'Jack-o-lantern faces', url: 'https://www.holidaycoro.com', qty: 8 },
      { name: 'Singing Pumpkin', vendor: 'holidayCoro', note: 'Animated face prop', url: 'https://www.holidaycoro.com/RGB-Singing-Pumpkin-Face-p/17rgb.htm', qty: 1 },
    ],
  },
  {
    name: 'Trees & Poles',
    icon: '🌲',
    description: 'Centerpiece and accent elements',
    products: [
      { name: 'Mega Tree', vendor: 'boscoyo', note: 'Main centerpiece', url: 'https://boscoyostudio.com/products/steel-megatree-true-topper-46', qty: 1, highlight: true },
      { name: 'Spiral Trees', vendor: 'gilbertEng', note: 'GE style spiral trees', url: 'https://gilbertengineeringusa.com/products/spiral-tree', qty: 8 },
      { name: 'Small Trees', vendor: 'holidayCoro', note: 'Mini pixel trees', url: 'https://www.holidaycoro.com/PixNode-Pixel-Mini-Tree-p/778.htm', qty: 6 },
      { name: 'Medium Trees', vendor: 'holidayCoro', note: 'Accent trees', url: 'https://www.holidaycoro.com', qty: 2 },
      { name: 'Pixel Poles (NSR)', vendor: 'efl', note: 'Professional pixel poles', url: 'https://efl-designs.com/product/pixel-pole-nsr/', qty: 8 },
      { name: 'T-Hooks for Topper', vendor: 'gilbertEng', note: '64-pack for mega tree', url: 'https://gilbertengineeringusa.com/products/t-hooks-for-mega-tree-topper', qty: 1 },
    ],
  },
  {
    name: 'Arches & Effects',
    icon: '🌈',
    description: 'Pathway and accent lighting',
    products: [
      { name: 'Pixel Arches', vendor: 'holidayCoro', note: 'Driveway arches', url: 'https://www.holidaycoro.com', qty: 8 },
      { name: 'Firework Bursts', vendor: 'gilbertEng', note: 'Starburst effects', url: 'https://gilbertengineeringusa.com', qty: 2 },
      { name: 'Fence Panels', vendor: 'holidayCoro', note: 'Fence line lighting', url: 'https://www.holidaycoro.com', qty: 7 },
      { name: 'Pixel Forest / Peace Stakes', vendor: 'holidayCoro', note: 'Slim stakes for pixel forest', url: 'https://www.holidaycoro.com/Peace-Family-Slim-Pixel-Stakes-F', qty: '2 groups' },
      { name: 'Floods', vendor: 'holidayCoro', note: 'Wash lighting', url: 'https://www.holidaycoro.com', qty: 4 },
    ],
  },
  {
    name: 'House Outline',
    icon: '🏠',
    description: 'Roofline and architectural lighting',
    products: [
      { name: 'Eave Sections', vendor: 'holidayCoro', note: 'Roofline outline', url: 'https://www.holidaycoro.com', qty: 26 },
      { name: 'Vertical Drops', vendor: 'holidayCoro', note: 'Window/corner accents', url: 'https://www.holidaycoro.com', qty: 15 },
      { name: 'Window Frames', vendor: 'holidayCoro', note: 'Window outlines', url: 'https://www.holidaycoro.com', qty: 5 },
      { name: 'Matrix', vendor: 'wiredWatts', note: 'P5 panels for animations', url: 'https://www.wiredwatts.com/build-a-matrix-kit', qty: 1 },
    ],
  },
  {
    name: 'Power & Distribution',
    icon: '⚡',
    description: 'Keep your pixels bright',
    products: [
      { name: 'Mean Well LRS-350-12', vendor: 'holidayCoro', note: '12V 350W power supply', url: 'https://www.holidaycoro.com/Meanwell-LRS-350-12-12-Volt-350-Watt-Power-Supply-p/47.htm', qty: '10+' },
      { name: 'Fuse Blocks', vendor: 'amazon', note: 'Distribution for multiple runs', url: 'https://www.amazon.com/dp/B07GBV2MHN', qty: 6 },
      { name: '5 Amp Fuses', vendor: 'holidayCoro', note: 'Blade fuses for protection', url: 'https://www.holidaycoro.com/product-p/875.htm', qty: '50+' },
      { name: 'PixaBoost (Null Pixel)', vendor: 'holidayCoro', note: 'Signal amplifier for long runs', url: 'https://www.holidaycoro.com/Null-Pixel-Amplifier-F-Amp-Booster-PixaBoost-p/748.htm', qty: 8 },
      { name: 'Power Supply Mounting Kit', vendor: 'holidayCoro', note: 'Dual 350W mounting plate', url: 'https://www.holidaycoro.com/Dual-350w-Power-Supply-Mounting-Kit-p/639-kit1.htm', qty: 4 },
    ],
  },
  {
    name: 'Pixels & LEDs',
    icon: '💡',
    description: 'The stars of the show',
    products: [
      { name: 'WS2811 Bullet Pixels (12mm)', vendor: 'aliexpress', note: 'Bulk pixels - best value', url: 'https://www.aliexpress.us/item/3256805086868911.html', qty: '5000+' },
      { name: 'Seed/Pebble Pixels', vendor: 'aliexpress', note: 'Small pixels for fence/detail work', url: 'https://www.aliexpress.us/item/3256808393187208.html', qty: '2000+' },
      { name: 'Seed Pixel Mounting Strips', vendor: 'boscoyo', note: 'Clean mounting for seed pixels', url: 'https://boscoyostudio.com/products/the-original-mounting-strips-for-seed-pebble-pixels', qty: '20+' },
      { name: 'P5 Matrix Panels', vendor: 'wiredWatts', note: 'Build-a-matrix kit', url: 'https://www.wiredwatts.com/build-a-matrix-kit', qty: 4 },
      { name: 'PixNode Net', vendor: 'holidayCoro', note: 'Matrix mounting net', url: 'https://www.holidaycoro.com/PixNode-Net-RGB-Pixel-Node-Mount', qty: 2 },
    ],
  },
  {
    name: 'Connectors & Wiring',
    icon: '🔌',
    description: 'Keep everything connected',
    products: [
      { name: 'xConnect Extensions (2-20ft)', vendor: 'gilbertEng', note: 'Various lengths available', url: 'https://gilbertengineeringusa.com/products/extensions', qty: '50+' },
      { name: 'xConnect Male Pigtails (18AWG)', vendor: 'holidayCoro', note: 'Heavy duty connections', url: 'https://www.holidaycoro.com/EasyPlug3-Male-Pigtail-xConnect-p/723-m.htm', qty: '30+' },
      { name: 'xConnect Female Pigtails (18AWG)', vendor: 'holidayCoro', note: 'Heavy duty connections', url: 'https://www.holidaycoro.com/EasyPlug3-Female-Pigtail-Dangle-xConnect-p/723-f.htm', qty: '30+' },
      { name: 'xConnect T-Splitters', vendor: 'holidayCoro', note: 'Three-way tap connectors', url: 'https://www.holidaycoro.com/Three-Conductor-Tap-MFF-xConnect-EasyPlug3-p/730.htm', qty: '20+' },
      { name: 'Clickits', vendor: 'experienceLights', note: 'Super fast pixel splicing', url: 'https://experiencelights.com/clickits-super-fast-pixel-splicing/', qty: '100+' },
      { name: '2-Wire Low Voltage Wire', vendor: 'amazon', note: 'For power injection runs', url: 'https://www.amazon.com/gp/product/B07Y6NJDQ4', qty: '500ft+' },
    ],
  },
  {
    name: 'Enclosures & Mounting',
    icon: '📦',
    description: 'Protect your equipment',
    products: [
      { name: 'CG-1500 Enclosure', vendor: 'holidayCoro', note: 'Medium controller enclosure', url: 'https://www.holidaycoro.com/product-p/554.htm', qty: 4 },
      { name: 'HC-2500 Enclosure', vendor: 'holidayCoro', note: 'Large controller enclosure', url: 'https://www.holidaycoro.com/HC-2500-Holiday-Lighting-Enclosure-System-p/629.htm', qty: 1 },
      { name: 'Receiver Adapter Plate', vendor: 'holidayCoro', note: 'Mount receivers in enclosures', url: 'https://www.holidaycoro.com/Flex-Expansion-Long-Range-Receivers-to-CG-1500-p/642-kit1.htm', qty: 4 },
      { name: 'Pixel Pipe (Pre-drilled)', vendor: 'holidayCoro', note: 'Black mounting pipe', url: 'https://www.holidaycoro.com/PixelPipe-Pre-Drilled-Pixel-Mounting-Pipe-p/1800.htm', qty: '40ft+' },
      { name: '3/4" Mounting Rings', vendor: 'holidayCoro', note: 'Pixel mounting clips', url: 'https://www.holidaycoro.com/product-p/655.htm', qty: '200+' },
    ],
  },
  {
    name: 'Tools & Supplies',
    icon: '🔧',
    description: 'Essential build tools',
    products: [
      { name: 'Solder Seal Connectors', vendor: 'amazon', note: 'Waterproof heat shrink connectors', url: 'https://www.amazon.com/Connectors-Plustool-Self-Solder-Waterproof-Electrical/dp/B0B18NYX2S', qty: '200+' },
      { name: 'Grommet Kit (1/2")', vendor: 'amazon', note: 'With hand tool', url: 'https://www.amazon.com/Grommet-Grommets-Handheld-Manual-Leather/dp/B0D3TCD3W3', qty: 1 },
      { name: 'EMT Conduit (1/2")', vendor: 'homeDepot', note: 'Metal conduit for mounting', url: 'https://www.homedepot.com/p/1-2-in-x-10-ft-Electrical-Metallic-Tubing-EMT-Conduit-0550010000/202068039', qty: '100ft+' },
      { name: 'PVC Pipe (3/4")', vendor: 'homeDepot', note: 'For arches and frames', url: 'https://www.homedepot.com/p/Charlotte-Pipe-3-4-in-x-10-ft-PVC', qty: '60ft+' },
      { name: 'Galvanized Flange (2")', vendor: 'homeDepot', note: 'For pole mounting', url: 'https://www.homedepot.com/p/Southland-2-in-Galvanized-Malleable', qty: 8 },
    ],
  },
];

// Stats for the display
const displayStats = {
  totalPixels: '35,000+',
  totalProps: '80+',
  spinners: 7,
  controllers: 3,
  universes: 190,
};

function ProductCard({ product }: { product: Product }) {
  const vendor = vendors[product.vendor];

  return (
    <div className={`bg-surface rounded-xl border transition-all duration-200 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 ${product.highlight ? 'border-accent/30 ring-1 ring-accent/20' : 'border-border'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground">{product.name}</h3>
          {product.qty && (
            <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs font-bold rounded-full whitespace-nowrap">
              ×{product.qty}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${vendor.color}`}>
            {vendor.name}
          </span>
          {product.pixels && (
            <span className="px-2 py-0.5 bg-foreground/10 text-foreground/70 text-xs rounded-full">
              {product.pixels} px
            </span>
          )}
        </div>

        {product.note && (
          <p className="text-sm text-foreground/60 mb-3">{product.note}</p>
        )}

        {product.url && (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent/80 font-medium"
          >
            View Product
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

export default function GearPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Our Gear</span>
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Everything powering the Lights of Elm Ridge display.
            Quantities shown are what we actually use.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl md:text-3xl font-bold text-accent">{displayStats.totalPixels}</div>
            <div className="text-sm text-foreground/60">Total Pixels</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl md:text-3xl font-bold text-accent">{displayStats.totalProps}</div>
            <div className="text-sm text-foreground/60">Props</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl md:text-3xl font-bold text-accent">{displayStats.spinners}</div>
            <div className="text-sm text-foreground/60">Spinners</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center">
            <div className="text-2xl md:text-3xl font-bold text-accent">{displayStats.controllers}</div>
            <div className="text-sm text-foreground/60">Controllers</div>
          </div>
          <div className="bg-surface rounded-xl p-4 border border-border text-center col-span-2 md:col-span-1">
            <div className="text-2xl md:text-3xl font-bold text-accent">{displayStats.universes}</div>
            <div className="text-sm text-foreground/60">Universes</div>
          </div>
        </div>

        {/* Vendor Quick Links */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-3 text-foreground/80">Trusted Vendors</h2>
          <div className="flex flex-wrap gap-2">
            {Object.values(vendors).map((vendor) => (
              <a
                key={vendor.name}
                href={vendor.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105 ${vendor.color} border border-transparent hover:border-current`}
              >
                {vendor.name}
              </a>
            ))}
          </div>
        </section>

        {/* Product Categories */}
        {gearCategories.map((category) => (
          <section key={category.name} className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{category.icon}</span>
              <div>
                <h2 className="text-2xl font-bold">{category.name}</h2>
                <p className="text-foreground/60 text-sm">{category.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {category.products.map((product) => (
                <ProductCard key={product.name} product={product} />
              ))}
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
