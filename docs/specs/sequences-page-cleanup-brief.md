# Sequences Page — Bottom Section Cleanup
## Implementation Brief for Claude Code

---

## Overview

The Sequences page (`/sequences`) has three large sections below the sequence cards that need to be replaced with leaner alternatives. The goal is to reduce visual weight while keeping the useful information.

**Remove entirely:**
1. "What's Included in Each Sequence" (two-column prop list — inaccurate)
2. "What You're Getting" (three icon cards + audio note — too heavy for the content)
3. "Need Something Custom?" CTA — not needed right now

**Replace with two slim sections:**

---

## Section 1: "Built For" Prop Reference Strip

A single compact horizontal strip showing what props the sequences are designed for. This replaces the old two-column "What's Included" block.

### Data Source

Pull the actual prop list from the layout data. The accurate prop list is:

```
Matrix (70×102) · 7 Spinners · House Outline · 8 Arches · 8 Spiders · 7 Bats · 
Singing Pumpkin · 8 Mini Pumpkins · 4 Rosa Tombstones · 6 Mini Tombstones · 
Mega Tree · 8 Spiral Trees · 8 Pixel Poles · 7 Fence Panels · 4 Floods · 
2 Firework Bursts · Pixel Forest / Peace Stakes
```

### Design

Slim bar, not a card grid. Compact and scannable.

```html
<div class="props-strip">
  <div class="props-strip-header">
    <span class="props-strip-icon">🎯</span>
    <span class="props-strip-title">Built For</span>
  </div>
  <div class="props-strip-list">
    <span class="prop-tag">Matrix (70×102)</span>
    <span class="prop-tag">7 Spinners</span>
    <span class="prop-tag">House Outline</span>
    <span class="prop-tag">8 Arches</span>
    <span class="prop-tag">8 Spiders</span>
    <span class="prop-tag">7 Bats</span>
    <span class="prop-tag">Singing Pumpkin</span>
    <span class="prop-tag">8 Mini Pumpkins</span>
    <span class="prop-tag">4 Rosa Tombstones</span>
    <span class="prop-tag">6 Mini Tombstones</span>
    <span class="prop-tag">Mega Tree</span>
    <span class="prop-tag">8 Spiral Trees</span>
    <span class="prop-tag">8 Pixel Poles</span>
    <span class="prop-tag">7 Fence Panels</span>
    <span class="prop-tag">4 Floods</span>
    <span class="prop-tag">2 Firework Bursts</span>
    <span class="prop-tag">Pixel Forest</span>
  </div>
  <div class="props-strip-footer">
    Don't have all these props? Effects map well to similar setups — you might just need some light remapping.
    <a href="/the-show#display">See the full layout explorer →</a>
  </div>
</div>
```

### Styling

```css
.props-strip {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  margin-top: 32px;
}

.props-strip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.props-strip-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
}

.props-strip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.prop-tag {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 3px 10px;
  border-radius: 100px;
  white-space: nowrap;
}

.props-strip-footer {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.props-strip-footer a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
}

.props-strip-footer a:hover {
  text-decoration: underline;
}
```

---

## Section 2: Slim Info Bar

Replaces the three "What You're Getting" cards and the audio note. One compact line with all four points inline.

### Design

```html
<div class="info-bar">
  <div class="info-bar-items">
    <span class="info-bar-item">
      <span class="info-bar-check">✓</span> xLights native
    </span>
    <span class="info-bar-sep">·</span>
    <span class="info-bar-item">
      <span class="info-bar-check">✓</span> Video previews
    </span>
    <span class="info-bar-sep">·</span>
    <span class="info-bar-item">
      <span class="info-bar-check">✓</span> Maps to common layouts
    </span>
    <span class="info-bar-sep">·</span>
    <span class="info-bar-item info-bar-note">
      Audio not included — grab your own from iTunes or Amazon
    </span>
  </div>
</div>
```

### Styling

```css
.info-bar {
  margin-top: 16px;
  padding: 12px 20px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
}

.info-bar-items {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.info-bar-check {
  color: #22c55e;
  font-weight: 700;
  margin-right: 2px;
}

.info-bar-sep {
  color: var(--text-tertiary);
  opacity: 0.4;
}

.info-bar-note {
  color: var(--text-tertiary);
  font-style: italic;
}
```

---

## What to Remove

Delete everything from below the last sequence card down to the footer, specifically:

1. **"What's Included in Each Sequence"** — the two-column Standard Props / Halloween Props lists
2. **"What You're Getting"** — the three icon cards (xLights Compatible, Video Previews, Layout Flexibility)
3. **"A Note on Audio"** — the standalone paragraph (folded into the info bar now)
4. **"Need Something Custom?"** — the CTA block with link to custom services

Also remove any associated CSS for those sections that's no longer needed.

---

## Final Page Structure (bottom half)

```
... sequence cards (unchanged) ...

┌─────────────────────────────────────────────┐
│ 🎯 Built For                                │
│ [Matrix] [7 Spinners] [House Outline] ...   │
│ Don't have all these? ... See full layout → │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✓ xLights native · ✓ Video previews ·      │
│ ✓ Maps to common layouts · Audio not incl.  │
└─────────────────────────────────────────────┘

[footer]
```

---

## Design Tokens (reference)

```css
--bg: #0b0b0e
--surface: #151518
--surface-border: #27272a
--text-primary: #f4f4f5
--text-secondary: #a1a1aa
--text-tertiary: #63636e
--accent: #ef4444
--font-display: 'Syne', sans-serif
--font-body: 'DM Sans', sans-serif
--radius-md: 10px
```

---

## Notes

- Don't touch the hero, filters, or sequence cards — only the sections below the cards
- The "See the full layout explorer →" link goes to `/the-show#display` where the interactive hotspot explorer lives
- Keep the remapping reassurance ("Effects map well to similar setups") — it's useful for buyers who don't have the exact same props
