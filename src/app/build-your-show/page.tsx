"use client";

import { useState } from "react";
import type { Metadata } from "next";
import Link from "next/link";

// Vendor information with colors for badges
const vendors = {
  holidayCoro: {
    name: "Holiday Coro",
    url: "https://www.holidaycoro.com",
    color: "vendor-red",
  },
  gilbertEng: {
    name: "Gilbert Engineering",
    url: "https://gilbertengineeringusa.com",
    color: "vendor-blue",
  },
  boscoyo: {
    name: "Boscoyo Studio",
    url: "https://boscoyostudio.com",
    color: "vendor-purple",
  },
  efl: {
    name: "EFL Designs",
    url: "https://efl-designs.com",
    color: "vendor-green",
  },
  wiredWatts: {
    name: "Wired Watts",
    url: "https://www.wiredwatts.com",
    color: "vendor-yellow",
  },
  experienceLights: {
    name: "Experience Lights",
    url: "https://experiencelights.com",
    color: "vendor-pink",
  },
  amazon: {
    name: "Amazon",
    url: "https://www.amazon.com",
    color: "vendor-orange",
  },
  aliexpress: {
    name: "AliExpress",
    url: "https://www.aliexpress.us",
    color: "vendor-amber",
  },
  homeDepot: {
    name: "Home Depot",
    url: "https://www.homedepot.com",
    color: "vendor-orange",
  },
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

// ═══════════════════════════════════════════════════════════
// TIER 1: THE CORE - Controllers, Pixels, Matrix
// ═══════════════════════════════════════════════════════════
const coreItems: Category[] = [
  {
    name: "Controllers",
    icon: "🎛️",
    description: "The brains of your light show",
    products: [
      {
        name: "HinksPix PRO V3",
        vendor: "holidayCoro",
        note: "Main controller - 48 ports, 171 universes. Powers house, yard props, spinners, and most display elements.",
        url: "https://www.holidaycoro.com",
        qty: 1,
        highlight: true,
      },
      {
        name: "AlphaPix 16",
        vendor: "holidayCoro",
        note: "Dedicated mega tree controller, 18 universes at 100% brightness.",
        url: "https://www.holidaycoro.com",
        qty: 1,
      },
      {
        name: "AlphaPix Flex",
        vendor: "holidayCoro",
        note: "AC light controller for floods and special effects, 1 universe.",
        url: "https://www.holidaycoro.com",
        qty: 1,
      },
      {
        name: "Smart Receivers",
        vendor: "holidayCoro",
        note: "Long range differential receivers for remote props.",
        url: "https://www.holidaycoro.com/Ready2Run-4-8-SPI-Flex-Long-Range-SMART-Receiver-p/936.htm",
        qty: 9,
      },
    ],
  },
  {
    name: "Pixels & LEDs",
    icon: "💡",
    description: "The stars of the show",
    products: [
      {
        name: "WS2811 Bullet Pixels (12mm)",
        vendor: "aliexpress",
        note: "Bulk pixels for most props - best value for outdoor use.",
        url: "https://www.aliexpress.us/item/3256805086868911.html",
        qty: "5000+",
        pixels: 5000,
      },
      {
        name: "Seed/Pebble Pixels",
        vendor: "aliexpress",
        note: "Small pixels for fence panels and detail work.",
        url: "https://www.aliexpress.us/item/3256808393187208.html",
        qty: "2000+",
        pixels: 2000,
      },
    ],
  },
  {
    name: "Matrix",
    icon: "📺",
    description: "Video display for animations and effects",
    products: [
      {
        name: "P5 Matrix Panels",
        vendor: "wiredWatts",
        note: "70×102 panel array - 7,168 pixels for videos, images, and text effects.",
        url: "https://www.wiredwatts.com/build-a-matrix-kit",
        qty: 4,
        pixels: 7168,
        highlight: true,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// TIER 2: PROPS & EFFECTS - The fun browsing stuff
// ═══════════════════════════════════════════════════════════
const propsCategories: { [key: string]: Product[] } = {
  Spinners: [
    {
      name: "Showstopper Spinner",
      vendor: "efl",
      url: "https://efl-designs.com/product/showstopper-spinner/",
      qty: 3,
      highlight: true,
    },
    {
      name: "GE Overlord",
      vendor: "gilbertEng",
      url: "https://gilbertengineeringusa.com/collections/vendors?q=Gilbert%20Engineering%20USA",
      qty: 1,
      pixels: 1529,
      highlight: true,
    },
    {
      name: "GE Rosa Grande",
      vendor: "gilbertEng",
      url: "https://gilbertengineeringusa.com/collections/vendors?q=Gilbert%20Engineering%20USA",
      qty: 1,
      pixels: 1392,
    },
    {
      name: "GE Fuzion",
      vendor: "gilbertEng",
      url: "https://gilbertengineeringusa.com/products/fuzion",
      qty: 1,
      pixels: 996,
    },
    {
      name: "GE Click Click Boom",
      vendor: "gilbertEng",
      url: "https://gilbertengineeringusa.com/collections/vendors?q=Gilbert%20Engineering%20USA",
      qty: 1,
    },
  ],
  Halloween: [
    {
      name: "GE Preying Spider",
      vendor: "gilbertEng",
      url: "https://gilbertengineeringusa.com/products/preying-spider",
      qty: 8,
      pixels: 350,
    },
    {
      name: "GE Bat",
      vendor: "gilbertEng",
      url: "https://gilbertengineeringusa.com/products/bat",
      qty: 7,
      pixels: 50,
    },
    {
      name: "GE Rosa Tombstones",
      vendor: "gilbertEng",
      url: "https://gilbertengineeringusa.com/products/impression-ge-rosa-tomb",
      qty: 4,
      pixels: 485,
    },
    {
      name: "Mini Tombstones",
      vendor: "efl",
      url: "https://efl-designs.com/product/tombstone-rip/",
      qty: 6,
    },
    {
      name: "Mini Pumpkins",
      vendor: "holidayCoro",
      url: "https://www.holidaycoro.com",
      qty: 8,
    },
    {
      name: "Singing Pumpkin",
      vendor: "holidayCoro",
      url: "https://www.holidaycoro.com/RGB-Singing-Pumpkin-Face-p/17rgb.htm",
      qty: 1,
    },
  ],
  Trees: [
    {
      name: "Mega Tree",
      vendor: "boscoyo",
      url: "https://boscoyostudio.com/products/steel-megatree-true-topper-46",
      qty: 1,
      pixels: 3000,
      highlight: true,
    },
    {
      name: "Spiral Trees",
      vendor: "gilbertEng",
      url: "https://gilbertengineeringusa.com/products/spiral-tree",
      qty: 8,
      pixels: 100,
    },
    {
      name: "Small Trees",
      vendor: "holidayCoro",
      url: "https://www.holidaycoro.com/PixNode-Pixel-Mini-Tree-p/778.htm",
      qty: 6,
    },
    {
      name: "Medium Trees",
      vendor: "holidayCoro",
      url: "https://www.holidaycoro.com",
      qty: 2,
    },
    {
      name: "Pixel Poles (NSR)",
      vendor: "efl",
      url: "https://efl-designs.com/product/pixel-pole-nsr/",
      qty: 8,
      pixels: 300,
    },
  ],
  Arches: [
    {
      name: "Pixel Arches",
      vendor: "holidayCoro",
      url: "https://www.holidaycoro.com",
      qty: 8,
      pixels: 100,
    },
    {
      name: "Firework Bursts",
      vendor: "gilbertEng",
      url: "https://gilbertengineeringusa.com",
      qty: 2,
      pixels: 360,
    },
    {
      name: "Fence Panels",
      vendor: "holidayCoro",
      url: "https://www.holidaycoro.com",
      qty: 7,
      pixels: 665,
    },
    {
      name: "Pixel Forest Stakes",
      vendor: "holidayCoro",
      url: "https://www.holidaycoro.com/Peace-Family-Slim-Pixel-Stakes-F",
      qty: "2 groups",
    },
    {
      name: "Floods",
      vendor: "holidayCoro",
      url: "https://www.holidaycoro.com",
      qty: 4,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// TIER 3: INFRASTRUCTURE - Reference material
// ═══════════════════════════════════════════════════════════
const infrastructureCategories: Category[] = [
  {
    name: "Power & Distribution",
    icon: "⚡",
    description: "Keep your pixels bright",
    products: [
      {
        name: "Mean Well LRS-350-12",
        vendor: "holidayCoro",
        note: "12V 350W power supply",
        url: "https://www.holidaycoro.com/Meanwell-LRS-350-12-12-Volt-350-Watt-Power-Supply-p/47.htm",
        qty: "10+",
      },
      {
        name: "Fuse Blocks",
        vendor: "amazon",
        note: "Distribution for multiple runs",
        url: "https://www.amazon.com/dp/B07GBV2MHN",
        qty: 6,
      },
      {
        name: "5 Amp Fuses",
        vendor: "holidayCoro",
        note: "Blade fuses for protection",
        url: "https://www.holidaycoro.com/product-p/875.htm",
        qty: "50+",
      },
      {
        name: "PixaBoost (Null Pixel)",
        vendor: "holidayCoro",
        note: "Signal amplifier for long runs",
        url: "https://www.holidaycoro.com/Null-Pixel-Amplifier-F-Amp-Booster-PixaBoost-p/748.htm",
        qty: 8,
      },
      {
        name: "Power Supply Mounting Kit",
        vendor: "holidayCoro",
        note: "Dual 350W mounting plate",
        url: "https://www.holidaycoro.com/Dual-350w-Power-Supply-Mounting-Kit-p/639-kit1.htm",
        qty: 4,
      },
    ],
  },
  {
    name: "Connectors & Wiring",
    icon: "🔌",
    description: "Keep everything connected",
    products: [
      {
        name: "xConnect Extensions (2-20ft)",
        vendor: "gilbertEng",
        note: "Various lengths",
        url: "https://gilbertengineeringusa.com/products/extensions",
        qty: "50+",
      },
      {
        name: "xConnect Male Pigtails",
        vendor: "holidayCoro",
        note: "18AWG heavy duty",
        url: "https://www.holidaycoro.com/EasyPlug3-Male-Pigtail-xConnect-p/723-m.htm",
        qty: "30+",
      },
      {
        name: "xConnect Female Pigtails",
        vendor: "holidayCoro",
        note: "18AWG heavy duty",
        url: "https://www.holidaycoro.com/EasyPlug3-Female-Pigtail-Dangle-xConnect-p/723-f.htm",
        qty: "30+",
      },
      {
        name: "xConnect T-Splitters",
        vendor: "holidayCoro",
        note: "Three-way tap",
        url: "https://www.holidaycoro.com/Three-Conductor-Tap-MFF-xConnect-EasyPlug3-p/730.htm",
        qty: "20+",
      },
      {
        name: "Clickits",
        vendor: "experienceLights",
        note: "Fast pixel splicing",
        url: "https://experiencelights.com/clickits-super-fast-pixel-splicing/",
        qty: "100+",
      },
      {
        name: "2-Wire Low Voltage Wire",
        vendor: "amazon",
        note: "Power injection",
        url: "https://www.amazon.com/gp/product/B07Y6NJDQ4",
        qty: "500ft+",
      },
    ],
  },
  {
    name: "Tools & Supplies",
    icon: "🔧",
    description: "Essential build tools",
    products: [
      {
        name: "Solder Seal Connectors",
        vendor: "amazon",
        note: "Waterproof connectors",
        url: "https://www.amazon.com/Connectors-Plustool-Self-Solder-Waterproof-Electrical/dp/B0B18NYX2S",
        qty: "200+",
      },
      {
        name: 'EMT Conduit (1/2")',
        vendor: "homeDepot",
        note: "Metal conduit",
        url: "https://www.homedepot.com/p/1-2-in-x-10-ft-Electrical-Metallic-Tubing-EMT-Conduit-0550010000/202068039",
        qty: "100ft+",
      },
      {
        name: 'PVC Pipe (3/4")',
        vendor: "homeDepot",
        note: "Arches and frames",
        url: "https://www.homedepot.com/p/Charlotte-Pipe-3-4-in-x-10-ft-PVC",
        qty: "60ft+",
      },
    ],
  },
  {
    name: "House Outline",
    icon: "🏠",
    description: "Roofline and architectural",
    products: [
      {
        name: "Pixel Pipe (Pre-drilled)",
        vendor: "holidayCoro",
        note: "Black mounting pipe for rooflines",
        url: "https://www.holidaycoro.com/PixelPipe-Pre-Drilled-Pixel-Mounting-Pipe-p/1800.htm",
        qty: "40ft+",
      },
      {
        name: "Window Frames",
        vendor: "holidayCoro",
        note: "Window outlines",
        url: "https://www.holidaycoro.com",
        qty: 5,
      },
    ],
  },
];

// Stats for the display
const displayStats = [
  { num: "35,000+", label: "Total Pixels" },
  { num: "80+", label: "Props" },
  { num: "7", label: "Spinners" },
  { num: "3", label: "Controllers" },
  { num: "190", label: "Universes" },
];

// ═══════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════

// Tier 1: Horizontal card for core items
function CoreCard({ product }: { product: Product }) {
  const vendor = vendors[product.vendor];

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`core-card ${product.highlight ? "highlight" : ""}`}
    >
      <div className="core-card-main">
        <h3 className="core-card-name">{product.name}</h3>
        {product.note && <p className="core-card-note">{product.note}</p>}
      </div>
      <div className="core-card-meta">
        {product.pixels && (
          <span className="core-card-pixels">
            {product.pixels.toLocaleString()} px
          </span>
        )}
        <span className={`core-card-vendor ${vendor.color}`}>
          {vendor.name}
        </span>
        {product.qty && <span className="core-card-qty">×{product.qty}</span>}
      </div>
      <span className="core-card-arrow">→</span>
    </a>
  );
}

// Tier 2: Compact prop card
function PropCard({ product }: { product: Product }) {
  const vendor = vendors[product.vendor];

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`prop-card ${product.highlight ? "highlight" : ""}`}
    >
      <div className="prop-card-name">{product.name}</div>
      <div className="prop-card-meta">
        <span className={`prop-card-vendor ${vendor.color}`}>
          {vendor.name}
        </span>
        {product.qty && <span className="prop-card-qty">×{product.qty}</span>}
        {product.pixels && (
          <span className="prop-card-pixels">{product.pixels} px</span>
        )}
      </div>
    </a>
  );
}

// Tier 3: Accordion section
function AccordionSection({ category }: { category: Category }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`infra-accordion ${isOpen ? "open" : ""}`}>
      <button
        className="infra-accordion-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="infra-accordion-icon">{category.icon}</span>
        <span className="infra-accordion-title">{category.name}</span>
        <span className="infra-accordion-count">
          {category.products.length} items
        </span>
        <span className="infra-accordion-chevron">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && (
        <div className="infra-accordion-body">
          {category.products.map((product) => {
            const vendor = vendors[product.vendor];
            return (
              <a
                key={product.name}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="infra-row"
              >
                <span className="infra-row-name">{product.name}</span>
                <span className="infra-row-note">{product.note}</span>
                <span className={`infra-row-vendor ${vendor.color}`}>
                  {vendor.name}
                </span>
                {product.qty && (
                  <span className="infra-row-qty">×{product.qty}</span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BuildYourShowPage() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const propFilters = ["All", "Spinners", "Halloween", "Trees", "Arches"];

  // Get filtered props
  const getFilteredProps = () => {
    if (activeFilter === "All") {
      return Object.entries(propsCategories).flatMap(
        ([, products]) => products,
      );
    }
    return propsCategories[activeFilter] || [];
  };

  return (
    <div className="build-page min-h-screen">
      <div className="build-content">
        {/* Header */}
        <div className="build-header">
          <h1 className="build-title font-display">
            <span className="accent-text">Build</span> Your Show
          </h1>
          <p className="build-subtitle">
            Everything powering the Lights of Elm Ridge display. Quantities
            shown are what we actually use.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="build-stats">
          {displayStats.map((stat) => (
            <div key={stat.label} className="build-stat">
              <span className="build-stat-num">{stat.num}</span>
              <span className="build-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Shopping List Teaser - NOW AT TOP */}
        <div className="build-teaser-banner">
          <span className="build-teaser-badge">Coming Soon</span>
          <div className="build-teaser-content">
            <h2 className="build-teaser-title">🛒 Shopping List Builder</h2>
            <p className="build-teaser-desc">
              Interactive tool to create a custom shopping list based on your
              experience level, budget, and display goals.
            </p>
          </div>
          <div className="build-teaser-chips">
            <span className="build-teaser-chip">Beginner packages</span>
            <span className="build-teaser-chip">Budget calculator</span>
            <span className="build-teaser-chip">Prop suggestions</span>
          </div>
        </div>

        {/* Vendor Quick Links */}
        <section className="build-vendors">
          <h2 className="build-vendors-title">Trusted Vendors</h2>
          <div className="build-vendors-list">
            {Object.values(vendors).map((vendor) => (
              <a
                key={vendor.name}
                href={vendor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="build-vendor-chip"
              >
                {vendor.name}
              </a>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            TIER 1: THE CORE
            ═══════════════════════════════════════════════════════════ */}
        <section className="tier-section tier-core">
          <div className="tier-header">
            <h2 className="tier-title">🎯 The Core</h2>
            <p className="tier-desc">
              The three things you literally cannot have a show without.
            </p>
          </div>

          {coreItems.map((category) => (
            <div key={category.name} className="core-category">
              <div className="core-category-header">
                <span className="core-category-icon">{category.icon}</span>
                <div>
                  <h3 className="core-category-title">{category.name}</h3>
                  <p className="core-category-desc">{category.description}</p>
                </div>
              </div>
              <div className="core-list">
                {category.products.map((product) => (
                  <CoreCard key={product.name} product={product} />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ═══════════════════════════════════════════════════════════
            TIER 2: PROPS & EFFECTS
            ═══════════════════════════════════════════════════════════ */}
        <section className="tier-section tier-props">
          <div className="tier-header">
            <h2 className="tier-title">✨ Props & Effects</h2>
            <p className="tier-desc">The fun stuff — browse for inspiration.</p>
          </div>

          {/* Filter chips */}
          <div className="prop-filters">
            {propFilters.map((filter) => (
              <button
                key={filter}
                className={`prop-filter-chip ${activeFilter === filter ? "active" : ""}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === "Spinners" && "🌀 "}
                {filter === "Halloween" && "🎃 "}
                {filter === "Trees" && "🌲 "}
                {filter === "Arches" && "🌈 "}
                {filter}
                {filter !== "All" && (
                  <span className="prop-filter-count">
                    ({propsCategories[filter]?.length || 0})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Props grid */}
          <div className="prop-grid">
            {getFilteredProps().map((product) => (
              <PropCard key={product.name} product={product} />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            TIER 3: INFRASTRUCTURE
            ═══════════════════════════════════════════════════════════ */}
        <section className="tier-section tier-infra">
          <div className="tier-header">
            <h2 className="tier-title">🔧 Infrastructure</h2>
            <p className="tier-desc">
              Reference material — the stuff that makes it all work.
            </p>
          </div>

          <div className="infra-accordions">
            {infrastructureCategories.map((category) => (
              <AccordionSection key={category.name} category={category} />
            ))}
          </div>
        </section>

        {/* CTAs */}
        <div className="build-cta">
          <h2 className="build-cta-title">Need Help Getting Started?</h2>
          <p className="build-cta-desc">
            Check out our display specs or browse sequences that work with
            various setups.
          </p>
          <div className="build-cta-buttons">
            <Link href="/the-show" className="btn-primary">
              View Our Setup
            </Link>
            <Link href="/sequences" className="btn-secondary">
              Browse Sequences
            </Link>
          </div>
        </div>

        {/* Back */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#ef4444] hover:text-[#ef4444]/80 font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
