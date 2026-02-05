# ModIQ: Status Bar Refinement

---

## Current Problems

1. **Dot key is too small and too far right** — easy to miss entirely
2. **Colored bar has no labels** — you see colors but need the key to decode them
3. **Stat line shows a different breakdown** than the bar — bar shows confidence (high/med/low), stat line shows actions (auto/manual/skipped/remaining)
4. **Three disconnected elements** telling the same story separately

## Solution: Integrated Segmented Bar

Merge the key directly into the bar. Each colored segment has its count right below it. Kill the separate dot legend. Rework the stat line into something more useful.

### Layout:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ModIQ   Lights of Elm Ridge (Halloween) → Your Layout       [Export ↓]     │
│                                                                              │
│  73/97 mapped                                                                │
│                                                                              │
│  ┌────────────────────────────┬──────────────────────┬─────────┬──────────┐  │
│  │         HIGH               │       MEDIUM         │   LOW   │ UNMAPPED │  │
│  └────────────────────────────┴──────────────────────┴─────────┴──────────┘  │
│     10                           27                     36        24         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### The Bar Itself

Each segment is proportionally sized AND labeled:

```css
.progress-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
}

.progress-segment {
  height: 100%;
  transition: width 0.4s ease;
}

.segment-high    { background: #22c55e; }
.segment-medium  { background: #eab308; }
.segment-low     { background: #ef4444; }
.segment-unmapped { background: #333333; }
```

### Labels Below Each Segment

Directly under each segment, centered to the segment's width:

```
  ██████████████████████   ███████████████   ██████   ████████████
     10 high                 27 med           36 low    24 unmapped
```

```css
.segment-labels {
  display: flex;
  width: 100%;
  margin-top: 6px;
}

.segment-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 11px;
  color: #737373;
  transition: width 0.4s ease;
  /* width matches corresponding bar segment */
}

.segment-label .count {
  font-weight: 700;
  font-size: 13px;
}

.segment-label.high .count    { color: #4ade80; }
.segment-label.medium .count  { color: #facc15; }
.segment-label.low .count     { color: #f87171; }
.segment-label.unmapped .count { color: #737373; }

.segment-label .label-text {
  font-size: 10px;
  color: #525252;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

### When segments are too narrow for text

If a segment is very small (say < 8% of total), the label shifts outside with an overflow treatment:

```css
/* For very narrow segments, show just the count */
.segment-label.narrow .label-text {
  display: none;
}

/* For zero-width segments, hide entirely */
.segment-label.empty {
  display: none;
}
```

This handles the case where you have 0 low confidence and 2 unmapped — the low segment disappears and the unmapped segment is tiny but still shows "2".

---

## Headline Stat

Keep the big number but simplify:

```
73/97 mapped
```

That's it. `73` in large bold white, `/97` in zinc-500, `mapped` in zinc-500. This is the single most important number on the page. Everything else is detail.

```css
.headline-stat {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-bottom: 10px;
}

.headline-stat .mapped-count {
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -1px;
  line-height: 1;
}

.headline-stat .total-count {
  font-size: 18px;
  font-weight: 600;
  color: #525252;
  letter-spacing: -0.5px;
}

.headline-stat .label {
  font-size: 13px;
  color: #525252;
  margin-left: 6px;
}
```

### No separate stat line

Remove "73 auto · 0 manual · 0 skipped · 24 remaining" entirely. That information is now:
- **Auto vs manual** — tracked in telemetry, visible in the ✎ manual tag on individual rows
- **Skipped** — visible in the collapsed SKIPPED section header count
- **Remaining** — IS the unmapped segment count in the bar

The bar + labels tell the full story. The stat line was redundant.

---

## Full Status Bar HTML Structure

```html
<div class="status-bar">
  <!-- Row 1: Title + Export -->
  <div class="status-bar-top">
    <div class="title">
      <span class="modiq-mark">ModIQ</span>
      <span class="context">Lights of Elm Ridge (Halloween) → Your Layout</span>
    </div>
    <button class="export-btn">Export (24 unmapped)</button>
  </div>

  <!-- Row 2: Headline stat -->
  <div class="headline-stat">
    <span class="mapped-count">73</span>
    <span class="total-count">/97</span>
    <span class="label">mapped</span>
  </div>

  <!-- Row 3: Segmented bar -->
  <div class="progress-bar">
    <div class="progress-segment segment-high" style="width: 10.3%"></div>
    <div class="progress-segment segment-medium" style="width: 27.8%"></div>
    <div class="progress-segment segment-low" style="width: 37.1%"></div>
    <div class="progress-segment segment-unmapped" style="width: 24.7%"></div>
  </div>

  <!-- Row 4: Segment labels (widths match bar) -->
  <div class="segment-labels">
    <div class="segment-label high" style="width: 10.3%">
      <span class="count">10</span>
      <span class="label-text">high</span>
    </div>
    <div class="segment-label medium" style="width: 27.8%">
      <span class="count">27</span>
      <span class="label-text">med</span>
    </div>
    <div class="segment-label low" style="width: 37.1%">
      <span class="count">36</span>
      <span class="label-text">low</span>
    </div>
    <div class="segment-label unmapped" style="width: 24.7%">
      <span class="count">24</span>
      <span class="label-text">unmapped</span>
    </div>
  </div>
</div>
```

---

## Full Status Bar CSS

```css
.status-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #0a0a0a;
  border-bottom: 1px solid #1a1a1a;
  padding: 14px 20px 16px;
}

.status-bar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.status-bar-top .modiq-mark {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -1px;
}

.status-bar-top .context {
  font-size: 13px;
  color: #525252;
  margin-left: 12px;
}

.export-btn {
  padding: 6px 16px;
  border-radius: 8px;
  border: 1px solid #ef4444;
  background: transparent;
  color: #ef4444;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.export-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* At 100% mapped, export becomes solid green */
.export-btn.complete {
  border-color: #22c55e;
  background: #22c55e;
  color: #fff;
}
```

---

## Animation: Bar Segments Animate on Load and on Change

```css
.progress-segment {
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.segment-label {
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s ease;
}

/* Initial load: segments grow from left */
@keyframes barGrow {
  from { transform: scaleX(0); transform-origin: left; }
  to { transform: scaleX(1); transform-origin: left; }
}

.progress-bar {
  animation: barGrow 0.6s ease-out 0.2s both;
}
```

When a user maps an unmapped model:
1. Unmapped segment shrinks
2. Appropriate confidence segment grows
3. Counts animate (crossfade numbers)
4. Headline stat increments: 73 → 74

---

## Type Badge Consistency

Per your note: the type badge in unmapped rows must match the type badge in the popover. Same component, same styles:

```css
.type-badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1.3;
}

/* Neutral (default - used in mapped rows, available list) */
.type-badge {
  background: #1a1a1a;
  color: #525252;
  border: 1px solid #262626;
}

/* Green (used in suggestion rows in popover) */
.type-badge.suggestion {
  background: rgba(34, 197, 94, 0.08);
  color: rgba(74, 222, 128, 0.7);
  border: 1px solid rgba(34, 197, 94, 0.15);
}
```

Use this exact same `.type-badge` component everywhere: unmapped rows, mapped rows, source cards, popover suggestion rows, popover available rows. One component, consistent rendering. The only variant is `.suggestion` for green-tinted badges inside the popover suggestions section.

---

## Before → After Summary

### Before:
```
ModIQ  Lights of Elm Ridge (Halloween) → Your Layout              Export
73/97 mapped (75.3%)                                    ● 10 ● 27 ● 36
████████████████████████████████████████████████████████████░░░░░░░░░░░
73 auto · 0 manual · 0 skipped · 24 remaining
```
- Dot key tiny, far right, disconnected
- Stat line redundant, different axis than bar
- Three elements telling one story

### After:
```
ModIQ  Lights of Elm Ridge (Halloween) → Your Layout              Export
73/97 mapped
████████████████████   █████████████████████   █████████   ████████████
   10 high                27 med                36 low      24 unmapped
```
- Labels ARE the key — directly under their segments
- One integrated visualization
- No redundant stat line
- Proportions, colors, and counts all visible at a glance
