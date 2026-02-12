# The Show Page — Display Tab Redesign
## Implementation Brief for Claude Code

---

## Overview

The Display tab on The Show page (`/the-show#display`) is being redesigned. The current static content (controller cards, props table, hardware grid) is being replaced with an interactive layout explorer component. Most of the existing Display tab content gets scrapped because the explorer now covers it better.

**The Display tab should also become the FIRST tab** (currently it's third after Watch and Playlist). Reorder tabs to: `Display · Watch · Playlist`. Update the tab switcher JS so Display is the default when no hash is present.

---

## Display Tab Structure (top to bottom)

### 1. Stat Row (KEEP — already exists, move above explorer)
The four-stat bar stays. It sets scale before users interact with the explorer.

```
35k+ Total Pixels | 190 Universes | 3 Controllers | 87.9 FM Station
```

Keep the existing CSS/HTML for this. Just make sure it sits above the explorer.

---

### 2. Interactive Layout Explorer (NEW — main feature)

This is the hero of the Display tab. It's a layout image with clickable hotspot dots that open floating product cards.

**Source files to reference:**
- `layout-explorer-v2.html` — the working prototype with all 7 hotspot dots, cards, connector lines, and JS behavior
- `controllers-collapsible-mockup.html` — the collapsible "Controllers" overlay card that sits on top of the image

**Merge these two files into the Display tab.** The explorer includes:

#### Layout Image
- Source: `layout.jpg` (the xLights layout screenshot)
- Full-width within the tab container
- `border-radius: 14px`, `border: 1px solid #27272a`
- `filter: brightness(1.1)` default, dims to `brightness(0.65)` when a hotspot is active

#### Collapsible Controllers Card (overlaid on image, top-left corner)
- Position: `top: 14px; left: 14px;`, `width: 240px`
- Frosted glass: `background: rgba(21,21,24,0.88)`, `backdrop-filter: blur(12px)`
- Collapsed state: just shows a clickable tab labeled "🎛️ Controllers" with a chevron
- Click to expand: items slide down like a window shade (max-height transition)
- Click anywhere outside: collapses back up
- Contains 4 items:
  - HinksPix PRO V3 (×1, 48 ports · 171 universes)
  - 4-Port Differential Receivers (×6, long range smart receivers)
  - Smart Receivers (×3, flex expansion boards)  
  - AlphaPix 16 (×1, mega tree · 18 universes)
- Each item is a clickable link to the vendor product page

#### 7 Hotspot Dots (positioned on image via percentage coordinates)

All dots use the same component:
- 20px red circle (`#ef4444`) with white border
- Pulsing ring animation
- Label below in a dark frosted pill (`background: rgba(0,0,0,0.72)`, `backdrop-filter: blur(4px)`, `padding: 2px 9px`, `border-radius: 4px`, `font-size: 11.5px`, `font-weight: 700`)
- Click opens a floating card, click again or click outside closes it
- Only one card open at a time
- Dashed SVG connector line from dot to card edge (desktop only)
- Mobile: cards become bottom sheets instead of floating

**Dot positions (left%, top%):**

| # | Zone | Left | Top | Card opens toward |
|---|------|------|-----|-------------------|
| 1 | Spinners | 65% | 33% | below-right |
| 2 | House Outline | 44% | 33% | below-left |
| 3 | House Props | 80% | 50% | above-left or bottom-left (check for clipping) |
| 4 | Matrix | 60% | 45% | above-left |
| 5 | Left Yard | 16% | 52% | above-right |
| 6 | Center Yard | 46% | 64% | above, centered |
| 7 | Right Yard | 90% | 65% | above-left (card must not clip right edge) |

**Card content per hotspot:**

Each card has:
- Header: icon + zone title + item count badge
- Scrollable item list (max-height: 280px)
- Each item row: emoji placeholder icon, product name, quantity badge (red), vendor name, arrow link
- Items are `<a>` tags linking to vendor product pages

Refer to `layout-explorer-v2.html` for the exact items in each zone. The content/links aren't 100% accurate yet — the user will fix those later. Just preserve what's in the prototype.

#### Explorer Header (above the image)
```
Label: "Interactive Layout" (small red uppercase)
Title: "Explore the Display" (Syne 24px 800)
Subtitle: "Click any hotspot to see exactly what's there — every prop, every vendor, every link."
Hint pill: [pulsing red dot] "Click the red dots to explore each area"
```

---

### 3. Tech Stack Section (NEW — replaces Hardware Setup grid)

Below the explorer image. A single collapsible/expandable section — NOT four separate cards.

**Title:** "⚡ Under the Hood" or "⚡ Tech Stack"

**Collapsed by default.** Click to expand. Same expand/collapse pattern as the Controllers overlay but styled as a full-width section below the image (not overlaid).

**Content when expanded — compact rows, not cards:**

```
Network     E1.31 protocol · 190 universes · 510 channels each
Power       Multiple Mean Well 5V supplies · power injection every 150px · dedicated 20A circuits  
Show Player xSchedule + Remote Falcon (viewer song requests) · FM 87.9
Pixels      WS2811 bullet nodes (12mm) + WS2812B strips · all IP67 outdoor-rated
```

Style: two-column layout per row (label left, details right). Keep it tight. This is reference info for hobbyists, not a showcase.

---

### 4. Shopping List Wizard CTA (NEW — bridge to Build Your Show)

Below the Tech Stack section. A simple call-to-action strip linking to the Build Your Show page where the Shopping List Wizard lives.

```html
<div class="display-cta">
  <div class="display-cta-text">
    <strong>Want to build something like this?</strong>
    Tell us about your space and we'll generate a custom shopping list.
  </div>
  <a href="/build-your-show" class="btn-primary">
    Try the Shopping List Wizard →
  </a>
</div>
```

Use the existing `display-cta` styling from the reference file or match it to the site's button style.

---

## What to REMOVE from the current Display tab

1. **Controllers section** (the 3 controller cards) — now in the overlay
2. **Props & Pixel Counts table** (13-row table) — now in the hotspot cards  
3. **Hardware Setup grid** (4 cards: Network, Power, Show Player, Pixels) — replaced by compact Tech Stack section
4. **Current static layout image** (`placehold.co` placeholder) — replaced by real image with hotspots
5. **Old Display CTA** ("Can I run these sequences?") — replaced by Shopping List Wizard CTA

---

## Tab Order Change

Current order: `Watch · Playlist · Display`
New order: `Display · Watch · Playlist`

Update:
1. Move the Display tab button to first position in the tab bar HTML
2. Update the JS default: when no hash is present, default to `display` instead of `watch`
3. The `validTabs` array order doesn't matter, but the visual button order in HTML does

---

## Design Tokens (reference)

```css
--bg: #0b0b0e
--surface: #151518
--surface-raised: #1c1c20
--surface-border: #27272a
--surface-hover: #222226
--text-primary: #f4f4f5
--text-secondary: #a1a1aa
--text-tertiary: #63636e
--accent: #ef4444
--font-display: 'Syne', sans-serif (600/700/800)
--font-body: 'DM Sans', sans-serif
--radius-lg: 14px
--radius-md: 10px
--radius-sm: 8px
--page-max: 1100px
```

---

## Files to Reference

All in the project directory:
- `layout-explorer-v2.html` — working explorer with all hotspots + cards + JS (has base64 image embedded)
- `controllers-collapsible-mockup.html` — collapsible controllers overlay with window-shade animation
- `the-show-reference.html` — current full Show page with all 3 tabs (the starting point to modify)
- `layout.jpg` — the actual xLights layout image

---

## Summary of Changes

1. Reorder tabs: Display first
2. Replace entire Display tab content with: stat row → explorer header → layout image with controllers overlay + 7 hotspot dots → tech stack collapsible → wizard CTA
3. Merge CSS/JS from both prototype files into the Show page
4. Remove old controller cards, props table, hardware grid, placeholder image, old CTA
5. Don't touch Watch or Playlist tabs
