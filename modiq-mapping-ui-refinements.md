# ModIQ: Mapping Page UI Refinements

Consolidated spec covering all discussed changes. Apply on top of the compact card spec and popover spec.

---

## Unmapped Row — Final Layout (44px)

### Before (current ~70px):
```
○  Gothic-Gargoyle                                          [▾] [⊘]
   600px · Custom
   💡 Tombstone Small - 5 (38%)
```

### After (44px, single primary line):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ○  Gothic-Gargoyle        600px · Custom    💡 Tombstone Small-5 38%  × │
└──────────────────────────────────────────────────────────────────────────┘
```

### Anatomy (left to right):

```
○  Name                metadata           suggestion button         clear
│  │                   │                  │                          │
│  bold 13px white     11px zinc-500      green pill button          │
│  flex: none          right of name      💡 + name + score          │
│                      same line          click = instant map        │
│                                                                    │
│                                                         hidden until
│                                                         mapped, then
open dot                                                  show × on hover
unmapped indicator
```

### CSS:

```css
.unmapped-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  min-height: 44px;
  gap: 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}

/* Entire row is drop target */
.unmapped-row:hover {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.06);
}

.unmapped-row.drag-over {
  background: rgba(34, 197, 94, 0.05);
  border-color: rgba(34, 197, 94, 0.3);
}

/* Open dot */
.unmapped-row .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid #525252;
  background: transparent;
  flex-shrink: 0;
}

/* Model name */
.unmapped-row .model-name {
  font-size: 13px;
  font-weight: 600;
  color: #e5e5e5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

/* Metadata (pixels · type) */
.unmapped-row .model-meta {
  font-size: 11px;
  color: #525252;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Spacer pushes suggestion + actions to right */
.unmapped-row .spacer {
  flex: 1;
}

/* Suggestion button - GREEN pill */
.suggestion-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 100px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.25);
  color: #4ade80;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-btn:hover {
  background: rgba(34, 197, 94, 0.18);
  border-color: rgba(34, 197, 94, 0.4);
  color: #86efac;
}

.suggestion-btn .bulb {
  font-size: 10px;
  flex-shrink: 0;
}

.suggestion-btn .score {
  opacity: 0.7;
  font-size: 10px;
}

/* Pick dropdown trigger - replaces caret */
/* Only shows on row hover, small and subtle */
.unmapped-row .pick-trigger {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #404040;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;
}

.unmapped-row:hover .pick-trigger {
  opacity: 1;
  color: #737373;
}

.unmapped-row .pick-trigger:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #a3a3a3;
}

/* No ⊘ skip symbol visible by default */
/* Skip is available via the pick-match popover only */
/* After mapping: × clear button shows on hover */
```

### Interaction:

1. **Click the green suggestion pill** → maps instantly, row moves to High confidence
2. **Click anywhere else on the row** → opens pick-match popover
3. **Drag a source card onto the row** → maps on drop
4. **No visible caret button** — the row click handles it
5. **No visible skip/⊘ symbol** — skip is inside the popover as the bottom action

### After mapping, row moves to confidence section and becomes:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ●  Gothic-Gargoyle  →  Tombstone Small-5   600→150  CUSTOM   ✎ manual  │
└──────────────────────────────────────────────────────────────────────────┘
                                                        (× on hover only)
```

The × clear button only appears on hover over the mapped row. No persistent ↻ remap button either — clicking the row opens the popover for remapping, same as unmapped. Keeps it clean.

---

## Pick-Match Popover — Full Width

### Width: matches the unmapped row width (full left panel width minus padding)

Instead of a fixed 380px, the popover stretches to fill the left panel container width. This gives much more room for model details and future matching data.

### Layout:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🔍 Search source models...                                              │
├──────────────────────────────────────────────────────────────────────────┤
│ SUGGESTIONS                                                              │
│                                                                          │
│  Tombstone Small - 5    150px  TOMBSTONE   38%                          │
│  Pumpkin Mini 4         100px  PUMPKIN     38%                          │
│  Eave 25 - Garage Rt     24px  SINGLE LINE 37%                          │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ ALL AVAILABLE                                                            │
│                                                                          │
│  Tree - Spiral 8        100px  TREE                                      │
│  Fence Panel 7          665px  MATRIX                                    │
│  Tree Real 3            250px  TREE                                      │
│  Tree Real 2            250px  TREE                                      │
│  Tree Real 1 - Fork Rt  200px  TREE                                      │
│  ...                                                                     │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  ⊘  Skip this model                                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Color treatment:

**SUGGESTIONS section:**
- "SUGGESTIONS" label: green (#4ade80), 10px uppercase
- Model names in suggestions: green (#4ade80), 13px, font-weight 500
- Pixel counts: green at 60% opacity
- Type badges: green tinted background (rgba(34,197,94,0.1)), green text
- Score percentages: green, bold
- Row hover: stronger green background tint

**ALL AVAILABLE section:**
- "ALL AVAILABLE" label: zinc-500, 10px uppercase
- Model names: zinc-200, 13px, normal weight
- Pixel counts: zinc-500
- Type badges: zinc-800 background, zinc-400 text (neutral)
- No score shown
- Row hover: zinc-800 background

This creates an instant visual hierarchy: green = recommended, neutral = everything else.

### CSS for green suggestion rows:

```css
.popover .suggestion-row {
  display: flex;
  align-items: center;
  padding: 7px 14px;
  gap: 10px;
  cursor: pointer;
  transition: background 0.1s;
  border-radius: 4px;
  margin: 0 4px;
}

.popover .suggestion-row:hover {
  background: rgba(34, 197, 94, 0.08);
}

.popover .suggestion-row .name {
  font-size: 13px;
  font-weight: 500;
  color: #4ade80;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.popover .suggestion-row .pixels {
  font-size: 11px;
  color: rgba(74, 222, 128, 0.6);
  flex-shrink: 0;
}

.popover .suggestion-row .type-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(34, 197, 94, 0.1);
  color: rgba(74, 222, 128, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}

.popover .suggestion-row .score {
  font-size: 12px;
  font-weight: 600;
  color: #4ade80;
  flex-shrink: 0;
  min-width: 32px;
  text-align: right;
}

/* Available rows - neutral */
.popover .available-row {
  display: flex;
  align-items: center;
  padding: 7px 14px;
  gap: 10px;
  cursor: pointer;
  transition: background 0.1s;
  border-radius: 4px;
  margin: 0 4px;
}

.popover .available-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.popover .available-row .name {
  font-size: 13px;
  font-weight: 400;
  color: #d4d4d4;
  flex: 1;
}

.popover .available-row .pixels {
  font-size: 11px;
  color: #525252;
}

.popover .available-row .type-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #1a1a1a;
  color: #525252;
  text-transform: uppercase;
}
```

### Popover positioning:

```css
.pick-popover {
  position: fixed;
  /* Width: calculated to match the left panel */
  width: calc(100% - var(--right-panel-width) - 48px);
  max-width: 720px;
  min-width: 400px;
  max-height: 420px;
  background: #141414;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.03);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Optional backdrop to dim the rest of the page */
.popover-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 999;
}
```

---

## Source Model Cards (Right Panel) — Match Row Height

Source cards should match the unmapped row height (44px) for visual rhythm:

```
┌──────────────────────────────────────────┐
│  ⠿  Tree - Spiral 8        TREE   100px │  44px
└──────────────────────────────────────────┘
```

```css
.source-card {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  height: 44px;
  gap: 8px;
  border-radius: 5px;
  background: transparent;
  border: 1px solid transparent;
  cursor: grab;
  transition: all 0.15s;
}

.source-card:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
}

.source-card:active {
  cursor: grabbing;
  transform: scale(1.01);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  z-index: 10;
}
```

### Hover tooltip on source cards:

```css
.source-card-tooltip {
  position: fixed;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 11px;
  color: #a3a3a3;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 1001;
  pointer-events: none;
  max-width: 250px;
}
```

Tooltip content:
```
Tree - Spiral 8
100px · Tree · 3 submodels
Not yet mapped
```
or if already mapped:
```
Arch-1
150px · Arch · 0 submodels
→ mapped to: DrivewayArch_L1
```

---

## Mapped Row — Clean, Hover-Reveal Actions (44px)

```css
.mapped-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  height: 44px;
  gap: 8px;
  border-radius: 5px;
  border: 1px solid transparent;
  cursor: pointer; /* click to remap via popover */
  transition: all 0.15s;
}

.mapped-row:hover {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.06);
}

/* Confidence dot */
.mapped-row .confidence-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Their model name */
.mapped-row .their-name {
  font-size: 13px;
  font-weight: 500;
  color: #d4d4d4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

/* Arrow */
.mapped-row .arrow {
  font-size: 11px;
  color: #404040;
  flex-shrink: 0;
}

/* Source model name */
.mapped-row .source-name {
  font-size: 13px;
  font-weight: 400;
  color: #737373;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

/* Pixel comparison */
.mapped-row .pixel-compare {
  font-size: 10px;
  color: #404040;
  font-family: monospace;
  flex-shrink: 0;
}

/* Type badge */
.mapped-row .type-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #1a1a1a;
  color: #404040;
  text-transform: uppercase;
  flex-shrink: 0;
}

/* Manual tag */
.mapped-row .manual-tag {
  font-size: 10px;
  color: #525252;
  display: flex;
  align-items: center;
  gap: 3px;
}

/* Clear button - only on hover */
.mapped-row .clear-btn {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #404040;
  cursor: pointer;
  font-size: 14px;
  opacity: 0;
  transition: all 0.15s;
  margin-left: auto;
}

.mapped-row:hover .clear-btn {
  opacity: 1;
}

.mapped-row .clear-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
```

---

## Right Panel — Add Collapsed Mapped Section

```
┌────────────────────────────────────┐
│  Source Models                      │
│  141 available · 73 mapped         │
│                                    │
│  [🔍 Search...]                    │
│  [All Types               ▾]      │
│                                    │
│  UNMAPPED (68)                     │
│  ┌──────────────────────────────┐  │
│  │ ⠿ Tree - Spiral 8  TREE 100 │  │
│  │ ⠿ Fence Panel 7  MATRIX 665 │  │
│  │ ⠿ Pixel2DMX    CUSTOM   1   │  │
│  │ ...                          │  │
│  └──────────────────────────────┘  │
│                                    │
│  ▸ MAPPED (73)          [expand]   │
│                                    │
└────────────────────────────────────┘
```

Expanded mapped section shows each source model with where it went:

```
│  Arch-1        → DrivewayArch_L1   │
│  Arch-2        → DrivewayArch_L2   │
│  Spinner-Overlord → My_Big_Spinner │
```

These are still draggable — dragging a mapped source card to a different unmapped row will remap it (with the confirmation step).

---

## Summary of All Changes

| Element | Change | Rationale |
|---------|--------|-----------|
| Unmapped row caret [▾] | Removed | Row click handles it |
| Unmapped row ⊘ skip | Removed from row | Available inside popover only |
| Unmapped row height | 70px → 44px | Metadata moves inline with name |
| Suggestion text | → Green pill button | More visceral, clickable, instant action |
| Suggestion color | Amber/yellow → Green | Green = go/action, avoids confusion with medium confidence amber |
| Popover width | ~1/3 panel → full panel width | Room for metadata and future matching specs |
| Popover suggestions | Neutral text → Green text/badges | Visual hierarchy: green = recommended |
| Mapped row × button | Always visible → Hover only | Reduces visual clutter |
| Mapped row ↻ button | Removed | Click row to remap via popover |
| Source card height | ~40px → 44px | Match unmapped row height for visual rhythm |
| Source card hover | Basic → Tooltip with details | Submodel count, mapping status |
| Right panel | Unmapped only → Unmapped + collapsed Mapped | Verification, remapping access |
| Row backgrounds | Solid borders → Transparent, border on hover | Cleaner default state |
