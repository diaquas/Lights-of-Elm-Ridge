"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface HotspotItem {
  name: string;
  quantity?: number;
  pixels?: string;
  productUrl?: string;
  imageUrl?: string;
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
    y: 40,
    items: [
      {
        name: "Eave Sections",
        quantity: 26,
        pixels: "1,344",
        productUrl:
          "https://www.holidaycoro.com/PixelPipe-Pre-Drilled-Pixel-Mounting-Pipe-p/1800.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/1800-2.jpg?v-cache=1757067037",
      },
      {
        name: "Vertical Drops",
        quantity: 15,
        pixels: "1,023",
        productUrl:
          "https://www.holidaycoro.com/PixelPipe-Pre-Drilled-Pixel-Mounting-Pipe-p/1800.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/1800-2.jpg?v-cache=1757067037",
      },
      {
        name: "Window Frames",
        quantity: 5,
        pixels: "494",
        productUrl:
          "https://www.holidaycoro.com/PixelPipe-Pre-Drilled-Pixel-Mounting-Pipe-p/1800.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/1800-2.jpg?v-cache=1757067037",
      },
    ],
  },
  {
    id: "spinners",
    label: "Spinners",
    icon: "🌀",
    x: 63,
    y: 30,
    items: [
      {
        name: "Showstopper",
        quantity: 3,
        pixels: "1,719",
        productUrl: "https://efl-designs.com/product/showstopper-spinner/",
        imageUrl:
          "https://efl-designs.com/wp-content/uploads/2023/01/326744987_722493346146386_6848229485906405371_n.jpg",
      },
      {
        name: "GE Overlord",
        quantity: 1,
        pixels: "1,529",
        productUrl:
          "https://gilbertengineeringusa.com/products/overlord-spinner?variant=49598850892088",
        imageUrl:
          "https://gilbertengineeringusa.com/cdn/shop/files/34cc2093-d4b4-479d-a0fb-21d831c3ddb3_83dcdc2a-3cb4-46a0-b2e3-c7c202af1ef5_800x.jpg?v=1736459323",
      },
      {
        name: "GE Rosa Grande",
        quantity: 1,
        pixels: "1,392",
        productUrl:
          "https://gilbertengineeringusa.com/products/rosa-grande?variant=47608355193144",
        imageUrl:
          "https://gilbertengineeringusa.com/cdn/shop/files/20201216_150153_800x.jpg?v=1735926870",
      },
      {
        name: "GE Fuzion",
        quantity: 1,
        pixels: "996",
        productUrl:
          "https://gilbertengineeringusa.com/products/fuzion?_pos=1&_sid=359bb3a2e&_ss=r",
        imageUrl:
          "https://gilbertengineeringusa.com/cdn/shop/files/329749913_936104667802565_3543072817965595140_n_800x.jpg?v=1735931588",
      },
      {
        name: "GE Click Click Boom",
        quantity: 1,
        pixels: "1,600",
        productUrl:
          "https://gilbertengineeringusa.com/products/click-click-boom?variant=46182064685368",
        imageUrl:
          "https://gilbertengineeringusa.com/cdn/shop/files/365397613_1012879586409729_5424481113734567639_n_800x.jpg?v=1735933919",
      },
    ],
  },
  {
    id: "matrix",
    label: "Matrix",
    icon: "📺",
    x: 62,
    y: 48,
    items: [
      {
        name: "P5 Panels",
        quantity: 56,
        pixels: "114,688",
        productUrl: "https://www.wiredwatts.com/build-a-matrix-kit",
        imageUrl: "https://www.wiredwatts.com/img/products/m/pnp5o2pk-1_m.jpg",
      },
    ],
  },
  {
    id: "left-yard",
    label: "Left Yard",
    icon: "🪦",
    x: 15,
    y: 55,
    items: [
      {
        name: "EFL Tombstones",
        quantity: 6,
        pixels: "900",
        productUrl: "https://efl-designs.com/product/tombstone-rip/",
        imageUrl:
          "https://efl-designs.com/wp-content/uploads/2022/12/RIP-Tombstone.jpg",
      },
      {
        name: "Tune-To-Matrix 2",
        quantity: 1,
        pixels: "320",
        productUrl:
          "https://www.holidaycoro.com/PixNode-Net-RGB-Pixel-Node-Mounting-Net-p/775.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/775-11T.jpg?v-cache=1559561634",
      },
      {
        name: "Singing Pumpkin",
        quantity: 1,
        pixels: "263",
        productUrl:
          "https://www.holidaycoro.com/RGB-Singing-Pumpkin-Face-p/17rgb.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/17RGB-2.jpg?v-cache=1439984350",
      },
      {
        name: "Tall Pixel Forest",
        quantity: 1,
        pixels: "600",
        productUrl:
          "https://www.holidaycoro.com/Peace-Family-Slim-Pixel-Stakes-For-Nodes-p/270.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/270-2.jpg?v-cache=1586593316",
      },
      {
        name: "Pixel Poles",
        quantity: 8,
        pixels: "2,400",
        productUrl: "https://efl-designs.com/product/pixel-pole-nsr/",
        imageUrl:
          "https://efl-designs.com/wp-content/uploads/2023/08/359670007_1222169481800702_8687716664413280471_n.jpg",
      },
      {
        name: "Bats",
        quantity: 7,
        pixels: "350",
        productUrl:
          "https://gilbertengineeringusa.com/products/bat?variant=44990975410488",
        imageUrl:
          "https://gilbertengineeringusa.com/cdn/shop/files/received_690443211876338_800x.jpg?v=1735925610",
      },
    ],
  },
  {
    id: "house-props",
    label: "House Props",
    icon: "🕷️",
    x: 78,
    y: 44,
    items: [
      {
        name: "Holiday Coro Spider",
        quantity: 8,
        pixels: "800",
        productUrl: "https://www.holidaycoro.com/Spider-p/4013-1.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/4013-1-2.jpg",
      },
      {
        name: "Fireworks",
        quantity: 2,
        pixels: "720",
        productUrl:
          "https://www.holidaycoro.com/PixelPipe-Pre-Drilled-Pixel-Mounting-Pipe-p/1800.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/1800-2.jpg?v-cache=1757067037",
      },
      {
        name: "Boscoyo Tombstones",
        quantity: 4,
        pixels: "600",
        productUrl:
          "https://boscoyostudio.com/products/megachromastone-rip-collection?_pos=5&_sid=e4b4603c8&_ss=r",
        imageUrl:
          "https://boscoyostudio.com/cdn/shop/files/megachromastones-rip-collection-boscoyo-studio-94298.jpg?v=1744813420",
      },
    ],
  },
  {
    id: "center-yard",
    label: "Center Yard",
    icon: "🎃",
    x: 44,
    y: 70,
    items: [
      {
        name: "PixNode Triple Arches",
        quantity: 8,
        pixels: "1,200",
        productUrl:
          "https://www.holidaycoro.com/PixNode-QuickArch-Kit-6ft-p/1083.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/1083-3T.jpg?v-cache=1727768975",
      },
      {
        name: "Mini Pumpkins",
        quantity: 8,
        pixels: "264",
        productUrl: "http://holidaycoro.com/Coro-Mini-Pumpkins-p/1045.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/1045-2T.jpg?v-cache=1568834508",
      },
      {
        name: "Spiral Trees",
        quantity: 8,
        pixels: "800",
        productUrl:
          "https://gilbertengineeringusa.com/products/spiral-tree?variant=32254916296806",
        imageUrl:
          "https://gilbertengineeringusa.com/cdn/shop/files/20201229_084020_400x.jpg?v=1757622668",
      },
      {
        name: "PixNode Trees",
        quantity: 8,
        pixels: "528",
        productUrl:
          "https://www.holidaycoro.com/PixNode-Pixel-Mini-Tree-p/778.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/778-2.jpg?v-cache=1648200903",
      },
    ],
  },
  {
    id: "right-yard",
    label: "Right Yard",
    icon: "🎄",
    x: 86,
    y: 72,
    items: [
      {
        name: "GE Rosa Tombs",
        quantity: 4,
        pixels: "1,940",
        productUrl:
          "https://gilbertengineeringusa.com/products/impression-ge-rosa-tomb?variant=46160268493112",
        imageUrl:
          "https://gilbertengineeringusa.com/cdn/shop/files/365474434_1012693263086395_894566427357980396_n_800x.jpg?v=1735933853",
      },
      {
        name: "Short Pixel Forest",
        quantity: 1,
        pixels: "500",
        productUrl:
          "https://www.holidaycoro.com/Peace-Family-Slim-Pixel-Stakes-For-Nodes-p/270.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/270-2.jpg?v-cache=1586593316",
      },
      {
        name: "Megatree",
        quantity: 1,
        pixels: "3,000",
        productUrl:
          "https://www.holidaycoro.com/PixNode-Extreme-Strip-for-Pixel-Nodes-p/763.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/763-2.jpg?v-cache=1570398041",
      },
      {
        name: "GE Spider",
        quantity: 1,
        pixels: "350",
        productUrl:
          "https://gilbertengineeringusa.com/products/impression-preying-spider?_pos=1&_sid=fe1f3ca8a&_ss=r",
        imageUrl:
          "https://gilbertengineeringusa.com/cdn/shop/files/20200614_175846_800x.jpg?v=1735925530",
      },
      {
        name: "Tune-To Matrix",
        quantity: 1,
        pixels: "320",
        productUrl:
          "https://www.holidaycoro.com/PixNode-Net-RGB-Pixel-Node-Mounting-Net-p/775.htm",
        imageUrl:
          "https://cdn4.volusion.store/ospkt-vnbus/v/vspfiles/photos/775-11T.jpg?v-cache=1559561634",
      },
    ],
  },
];

function ItemCard({ item }: { item: HotspotItem }) {
  const content = (
    <>
      <div className="card-item-thumb">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy" />
        ) : (
          <span className="card-item-thumb-placeholder">📦</span>
        )}
      </div>
      <div className="card-item-info">
        <div className="card-item-name">{item.name}</div>
        <div className="card-item-meta">
          {item.quantity && (
            <span className="card-item-qty">x{item.quantity}</span>
          )}
          {item.pixels && <span>{item.pixels} px</span>}
        </div>
      </div>
      {item.productUrl && (
        <span className="card-item-arrow">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      )}
    </>
  );

  if (item.productUrl) {
    return (
      <a
        href={item.productUrl}
        className="card-item"
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return <div className="card-item">{content}</div>;
}

function HotspotCardContent({ hotspot }: { hotspot: Hotspot }) {
  return (
    <>
      <div className="card-header">
        <div className="card-header-left">
          <span className="card-icon">{hotspot.icon}</span>
          <span className="card-title">{hotspot.label}</span>
        </div>
        <span className="card-count">
          {hotspot.items.length} {hotspot.items.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="card-items">
        {hotspot.items.map((item, index) => (
          <ItemCard key={index} item={item} />
        ))}
      </div>
    </>
  );
}

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
    const cardWidth = 300;
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
            <HotspotCardContent hotspot={activeHotspotData} />
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
                <ItemCard key={index} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
