"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface HotspotItem {
  name: string;
  quantity?: number;
  pixels?: string;
  vendor?: string;
  vendorUrl?: string;
}

interface Hotspot {
  id: string;
  label: string;
  icon: string;
  x: number; // percentage from left
  y: number; // percentage from top
  items: HotspotItem[];
}

// Hotspot data for the layout
const hotspots: Hotspot[] = [
  {
    id: "matrix",
    label: "Matrix",
    icon: "📺",
    x: 50,
    y: 35,
    items: [
      {
        name: "P10 LED Panel",
        quantity: 1,
        pixels: "7,168",
        vendor: "AliExpress",
      },
      { name: "70×102 Resolution", pixels: "7,168 total" },
    ],
  },
  {
    id: "mega-tree",
    label: "Mega Tree",
    icon: "🎄",
    x: 75,
    y: 50,
    items: [
      {
        name: "12 Pixel Strings",
        quantity: 12,
        pixels: "250 each",
        vendor: "Holiday Coro",
      },
      { name: "180° Display Coverage", pixels: "3,000 total" },
    ],
  },
  {
    id: "house-outline",
    label: "House Outline",
    icon: "🏠",
    x: 50,
    y: 18,
    items: [
      { name: "Eave Sections", quantity: 26, pixels: "~80 each" },
      { name: "Vertical Runs", quantity: 15, pixels: "~40 each" },
      { name: "WS2811 Bullet Nodes", pixels: "~2,000 total" },
    ],
  },
  {
    id: "spinners",
    label: "Spinners",
    icon: "🌀",
    x: 30,
    y: 45,
    items: [
      { name: "Fuzion Spinner", quantity: 1, vendor: "Holiday Coro" },
      { name: "Rosa Grande", quantity: 1, vendor: "Boscoyo Studio" },
      { name: "Overlord", quantity: 1, vendor: "Boscoyo Studio" },
      { name: "Showstopper", quantity: 3, vendor: "Holiday Coro" },
      { name: "Click Click Boom", quantity: 1, pixels: "5,792 total" },
    ],
  },
  {
    id: "fence-panels",
    label: "Fence Panels",
    icon: "🔲",
    x: 15,
    y: 55,
    items: [
      {
        name: "Pixel Fence Panel",
        quantity: 7,
        pixels: "665 each",
        vendor: "Holiday Coro",
      },
      { name: "Total Coverage", pixels: "4,655 pixels" },
    ],
  },
  {
    id: "pixel-poles",
    label: "Pixel Poles",
    icon: "📍",
    x: 85,
    y: 70,
    items: [
      {
        name: "LED Pixel Pole",
        quantity: 8,
        pixels: "300 each",
        vendor: "Holiday Coro",
      },
      { name: "Driveway & Yard", pixels: "2,400 total" },
    ],
  },
  {
    id: "tombstones",
    label: "Tombstones",
    icon: "🪦",
    x: 25,
    y: 72,
    items: [
      {
        name: "Rosa Tombstone (Large)",
        quantity: 4,
        pixels: "485 each",
        vendor: "Boscoyo Studio",
      },
      { name: "Small Tombstones", quantity: 6, pixels: "~100 each" },
      { name: "Halloween Props", pixels: "3,440 total" },
    ],
  },
  {
    id: "arches",
    label: "Arches",
    icon: "🌈",
    x: 60,
    y: 75,
    items: [
      {
        name: "Pixel Arch",
        quantity: 8,
        pixels: "100 each",
        vendor: "Holiday Coro",
      },
      { name: "Entrance & Yard", pixels: "800 total" },
    ],
  },
  {
    id: "spiders",
    label: "Spiders",
    icon: "🕷️",
    x: 42,
    y: 62,
    items: [
      {
        name: "Pixel Spider",
        quantity: 8,
        pixels: "100 each",
        vendor: "Boscoyo Studio",
      },
      { name: "Tree Topper Spider", quantity: 1, pixels: "175" },
      { name: "Halloween Props", pixels: "975 total" },
    ],
  },
  {
    id: "fireworks",
    label: "Fireworks",
    icon: "🎆",
    x: 70,
    y: 30,
    items: [
      {
        name: "Pixel Firework Prop",
        quantity: 2,
        pixels: "360 each",
        vendor: "Holiday Coro",
      },
      { name: "Explosion Effects", pixels: "720 total" },
    ],
  },
];

export default function LayoutExplorer() {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [cardPosition, setCardPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate card position when hotspot is clicked
  const handleHotspotClick = (hotspot: Hotspot, event: React.MouseEvent) => {
    if (activeHotspot === hotspot.id) {
      setActiveHotspot(null);
      setCardPosition(null);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const clickX = event.clientX - containerRect.left;
    const clickY = event.clientY - containerRect.top;

    // Position card to the right of the hotspot, or left if near the edge
    const cardWidth = 280;
    const cardOffset = 30;

    let x = clickX + cardOffset;
    if (x + cardWidth > containerRect.width) {
      x = clickX - cardWidth - cardOffset;
    }

    setCardPosition({ x, y: Math.max(10, clickY - 50) });
    setActiveHotspot(hotspot.id);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        activeHotspot &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(".hotspot-dot")
      ) {
        setActiveHotspot(null);
        setCardPosition(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeHotspot]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveHotspot(null);
        setCardPosition(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const activeHotspotData = hotspots.find((h) => h.id === activeHotspot);

  return (
    <div className="layout-explorer">
      {/* Header */}
      <div className="explorer-header">
        <div className="explorer-label">Interactive Layout</div>
        <h3 className="explorer-title">Explore the Display</h3>
        <p className="explorer-subtitle">
          Click any hotspot to see what&apos;s there — every prop, every pixel
          count.
        </p>
        <div className="explorer-hint">
          <span className="explorer-hint-dot" />
          Click the red dots to explore each area
        </div>
      </div>

      {/* Layout Map */}
      <div
        ref={containerRef}
        className={`layout-map ${activeHotspot ? "has-active" : ""}`}
      >
        {/* Mobile backdrop */}
        {activeHotspot && (
          <div
            className="mobile-backdrop"
            onClick={() => {
              setActiveHotspot(null);
              setCardPosition(null);
            }}
          />
        )}

        {/* Image container */}
        <div className="layout-map-frame">
          <Image
            src="/layout.jpg"
            alt="xLights Layout View - Interactive Display Map"
            width={1100}
            height={550}
            className="layout-map-img"
            priority
            unoptimized
          />
        </div>

        {/* Hotspots */}
        {hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            className={`hotspot ${activeHotspot === hotspot.id ? "active" : ""}`}
            style={{
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
            }}
            onClick={(e) => handleHotspotClick(hotspot, e)}
            aria-label={`Explore ${hotspot.label}`}
            aria-expanded={activeHotspot === hotspot.id}
          >
            <span className="hotspot-dot" />
            <span className="hotspot-label">{hotspot.label}</span>
          </button>
        ))}

        {/* Desktop Card - positioned absolutely */}
        {activeHotspotData && cardPosition && (
          <div
            ref={cardRef}
            className="hotspot-card desktop-card"
            style={{
              left: cardPosition.x,
              top: cardPosition.y,
            }}
          >
            <div className="card-header">
              <div className="card-header-left">
                <span className="card-icon">{activeHotspotData.icon}</span>
                <span className="card-title">{activeHotspotData.label}</span>
              </div>
              <span className="card-count">
                {activeHotspotData.items.length} items
              </span>
            </div>
            <div className="card-items">
              {activeHotspotData.items.map((item, index) => (
                <div key={index} className="card-item">
                  <div className="card-item-info">
                    <div className="card-item-name">{item.name}</div>
                    <div className="card-item-meta">
                      {item.quantity && (
                        <span className="card-item-qty">×{item.quantity}</span>
                      )}
                      {item.pixels && <span>{item.pixels}</span>}
                      {item.vendor && (
                        <span className="card-item-vendor">{item.vendor}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Card - fixed at bottom */}
        {activeHotspotData && (
          <div ref={cardRef} className="hotspot-card mobile-card">
            <div className="card-header">
              <div className="card-header-left">
                <span className="card-icon">{activeHotspotData.icon}</span>
                <span className="card-title">{activeHotspotData.label}</span>
              </div>
              <button
                className="card-close"
                onClick={() => {
                  setActiveHotspot(null);
                  setCardPosition(null);
                }}
                aria-label="Close"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="card-items">
              {activeHotspotData.items.map((item, index) => (
                <div key={index} className="card-item">
                  <div className="card-item-info">
                    <div className="card-item-name">{item.name}</div>
                    <div className="card-item-meta">
                      {item.quantity && (
                        <span className="card-item-qty">×{item.quantity}</span>
                      )}
                      {item.pixels && <span>{item.pixels}</span>}
                      {item.vendor && (
                        <span className="card-item-vendor">{item.vendor}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
