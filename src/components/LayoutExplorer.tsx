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

// Hotspot data for the layout — 7 zones matching the display mockup
const hotspots: Hotspot[] = [
  {
    id: "house-outline",
    label: "House Outline",
    icon: "🏠",
    x: 44,
    y: 22,
    items: [],
  },
  {
    id: "spinners",
    label: "Spinners",
    icon: "🌀",
    x: 63,
    y: 25,
    items: [],
  },
  {
    id: "matrix",
    label: "Matrix",
    icon: "📺",
    x: 57,
    y: 42,
    items: [],
  },
  {
    id: "left-yard",
    label: "Left Yard",
    icon: "🪦",
    x: 15,
    y: 55,
    items: [],
  },
  {
    id: "house-props",
    label: "House Props",
    icon: "🕷️",
    x: 78,
    y: 44,
    items: [],
  },
  {
    id: "center-yard",
    label: "Center Yard",
    icon: "🌈",
    x: 44,
    y: 70,
    items: [],
  },
  {
    id: "right-yard",
    label: "Right Yard",
    icon: "🎄",
    x: 86,
    y: 72,
    items: [],
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
