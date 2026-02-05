# ModIQ: Compact Card Spec

Target: fit 2× more items in every panel without sacrificing readability or drag-drop usability.

---

## Current vs. Target Heights

| Component | Current ~Height | Target Height | Savings |
|-----------|----------------|---------------|---------|
| Unmapped row (Needs Mapping) | ~100px | 56px | 44% smaller |
| Source model card (right panel) | ~64px | 40px | 38% smaller |
| Mapped row (expanded sections) | ~72px | 48px | 33% smaller |
| Submodel row (inside expanded) | ~48px | 32px | 33% smaller |

Visible items in a 700px viewport:

| Panel | Current | Target |
|-------|---------|--------|
| Needs Mapping (left) | ~4 items | ~8 items |
| Source Models (right) | ~8 items | ~13 items |
| Mapped rows (expanded) | ~6 items | ~10 items |

---

## Unmapped Row (Needs Mapping) — 56px

This is the most important card to compact. The entire row is a drop target.

### Current (3–4 visual layers, ~100px):
```
GROUP - ALL TOMBSTONES                              Skip
┌─────────────────────────────────────────────────────┐
│     Drop a source model here or pick match          │
└─────────────────────────────────────────────────────┘
Best match: GE Click Click Boom (28%)
```

### Target (2 lines, 56px):

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ○  GROUP - ALL TOMBSTONES          💡 GE Click Click B… 28%   [▾] [⊘]│  ← line 1: 20px
│     Group · unmapped                 ░░░░░░ drop zone ░░░░░░░         │  ← line 2: 16px
└─────────────────────────────────────────────────────────────────────────┘
   padding: 10px top/bottom = 56px total
```

### CSS Structure:

```css
.unmapped-row {
  display: grid;
  grid-template-columns: 24px 1fr auto auto;
  align-items: center;
  padding: 10px 12px;
  min-height: 56px;
  border: 1px dashed var(--zinc-700);
  border-radius: 6px;
  gap: 0 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.unmapped-row:hover,
.unmapped-row.drag-over {
  border-color: var(--green-500);
  background: rgba(34, 197, 94, 0.05);
}

.unmapped-row .model-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--zinc-100);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unmapped-row .model-meta {
  font-size: 11px;
  color: var(--zinc-500);
  grid-column: 2;
}

.unmapped-row .best-match {
  font-size: 11px;
  color: var(--amber-400);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.unmapped-row .pick-btn {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--zinc-800);
  color: var(--zinc-300);
  border: 1px solid var(--zinc-700);
  cursor: pointer;
}

.unmapped-row .skip-btn {
  font-size: 11px;
  color: var(--zinc-600);
  cursor: pointer;
  padding: 2px 6px;
}
```

### Layout detail:

```
Column 1 (24px):  ○ status dot (unmapped indicator)
Column 2 (1fr):   Line 1: model name (bold 13px)
                   Line 2: type · pixel count · zone (11px muted)
Column 3 (auto):  💡 best match name + score (11px amber, truncate)
Column 4 (auto):  [▾ pick] [⊘ skip] buttons, compact
```

**The entire row is the drop target**, not just a box inside it. Border goes from dashed zinc-700 to solid green-500 on drag-over. Background pulse on hover.

**Best match is inline**, not on its own line. Clicking the best match text applies it immediately (same as clicking a suggestion). The 💡 icon and amber color make it visually distinct without taking extra vertical space.

**[▾] pick button** opens the dropdown sorted by match score. Small, compact, right-aligned.

**[⊘] skip button** even smaller, furthest right. Muted color until hover.

---

## Source Model Card (Right Panel) — 40px

### Current (~64px):
```
┌──────────────────────┐
│ ☰ Pixel Poles GRP    │  ← line 1
│   Group              │  ← line 2
└──────────────────────┘
   + padding + margin = ~64px
```

### Target (single line with inline badge, 40px):

```
┌──────────────────────────────────────────┐
│  ⠿  Pixel Poles GRP          Group  150px│  ← single line, 14px
└──────────────────────────────────────────┘
   padding: 8px top/bottom + 4px margin = 40px
```

### CSS Structure:

```css
.source-card {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 4px;
  border-radius: 4px;
  background: var(--zinc-900);
  border: 1px solid var(--zinc-800);
  cursor: grab;
  gap: 8px;
  transition: border-color 0.15s, transform 0.1s;
}

.source-card:hover {
  border-color: var(--zinc-600);
  background: var(--zinc-850);
}

.source-card:active {
  cursor: grabbing;
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.source-card .drag-handle {
  color: var(--zinc-600);
  font-size: 10px;
  flex-shrink: 0;
  width: 14px;
}

.source-card .model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--zinc-200);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-card .type-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--zinc-800);
  color: var(--zinc-400);
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.source-card .pixel-count {
  font-size: 11px;
  color: var(--zinc-500);
  flex-shrink: 0;
  min-width: 40px;
  text-align: right;
}

/* Mapped state */
.source-card.mapped {
  opacity: 0.4;
  cursor: default;
}

.source-card.mapped:hover {
  opacity: 0.6;
  cursor: grab; /* still draggable for remapping */
}
```

### Layout detail:

```
⠿  Model Name Here                    TYPE   150px
│   │                                    │      │
│   └─ flex:1, truncate if long         │      └─ pixel count, right-aligned
│                                        └─ tiny badge (uppercase, 10px)
└─ drag handle (dots icon, 14px wide)
```

**Single line** with type as a small inline badge (like a pill/chip). Pixel count right-aligned. Everything fits in 40px height.

**Drag handle:** Use a 6-dot grip icon (⠿) instead of ☰. Smaller, more standard for drag UIs.

---

## Mapped Row (Expanded Confidence Sections) — 48px

### Current (~72px):
```
●● DrivewayArch_L1          →  Arch-1                    ✕  ↻
   Arch · 150px · yard-left    Arch · 150px · yard-left
   ▸ No submodels
```

### Target (2 tight lines, 48px):

```
┌──────────────────────────────────────────────────────────────────┐
│ ●● DrivewayArch_L1  →  Arch-1    150px→150px  Arch   [✕] [↻]  │ ← 14px
│    yard-left → yard-left   ▸ 0 submodels                        │ ← 12px
└──────────────────────────────────────────────────────────────────┘
  padding: 8px top/bottom + 4px margin = 48px
```

### CSS Structure:

```css
.mapped-row {
  display: grid;
  grid-template-columns: 20px 1fr auto auto auto;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  background: var(--zinc-900);
  border: 1px solid transparent;
  gap: 0 6px;
  min-height: 48px;
  transition: border-color 0.15s;
}

.mapped-row:hover {
  border-color: var(--zinc-700);
}

.mapped-row .confidence-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.confidence-dot.high { background: var(--green-500); }
.confidence-dot.medium { background: var(--amber-400); }
.confidence-dot.low { background: var(--red-400); }

.mapped-row .mapping-pair {
  font-size: 13px;
  color: var(--zinc-200);
  display: flex;
  align-items: center;
  gap: 6px;
}

.mapped-row .mapping-pair .arrow {
  color: var(--zinc-600);
  font-size: 11px;
}

.mapped-row .mapping-meta {
  font-size: 11px;
  color: var(--zinc-500);
  grid-column: 2;
}

.mapped-row .pixel-match {
  font-size: 11px;
  color: var(--zinc-500);
  font-family: monospace;
}

.mapped-row .action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--zinc-600);
  cursor: pointer;
  font-size: 12px;
  background: transparent;
  border: none;
}

.mapped-row .action-btn:hover {
  color: var(--zinc-300);
  background: var(--zinc-800);
}
```

### Layout detail:

```
Line 1: ●● TheirModel → SourceModel   150→150  Arch  [✕] [↻]
Line 2:    zone → zone   ▸ N submodels
```

**Line 1** packs: confidence dot, both model names with arrow, pixel count comparison (monospace for alignment), type badge, action buttons.

**Line 2** is metadata: zone matching, submodel count (clickable to expand). Only shows if expanded.

**Action buttons** are 24×24px icon-only buttons, no text labels. ✕ = clear, ↻ = remap. Only visible on row hover to reduce visual noise.

---

## Submodel Row (Inside Expanded Parent) — 32px

```
┌──────────────────────────────────────────────────────────────┐
│     Arm_A (100px) → Arm1 (120px)            ●● auto    [↻] │
└──────────────────────────────────────────────────────────────┘
  height: 32px (8px padding + 16px content)
```

```css
.submodel-row {
  display: flex;
  align-items: center;
  padding: 4px 12px 4px 40px; /* 40px left indent = nested */
  height: 32px;
  font-size: 12px;
  color: var(--zinc-400);
  gap: 8px;
  border-bottom: 1px solid var(--zinc-800/50);
}

.submodel-row .pair {
  flex: 1;
}

.submodel-row .status {
  font-size: 10px;
  color: var(--zinc-500);
}
```

Flat, compact, indented 40px to indicate nesting. One line per submodel.

---

## Section Headers — 36px

The collapsible section headers ("NEEDS MAPPING", "HIGH CONFIDENCE", etc.) should be slim:

```css
.section-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  height: 36px;
  cursor: pointer;
  gap: 8px;
  border-bottom: 1px solid var(--zinc-800);
}

.section-header .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.section-header .label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--zinc-400);
}

.section-header .count {
  font-size: 13px;
  font-weight: 700;
  color: var(--zinc-100);
}

.section-header .pct {
  font-size: 11px;
  color: var(--zinc-500);
}

.section-header .chevron {
  margin-left: auto;
  font-size: 12px;
  color: var(--zinc-600);
  transition: transform 0.2s;
}

.section-header.expanded .chevron {
  transform: rotate(180deg);
}
```

```
● NEEDS MAPPING    7  (7.9%)                                    ˅
```

36px. Dot + label + count + percentage + chevron. All on one line.

---

## Right Panel Header — Tighter

```css
.source-panel-header {
  padding: 12px;
}

.source-panel-header h3 {
  font-size: 15px;
  font-weight: 700;
  color: var(--zinc-100);
  margin: 0;
}

.source-panel-header .stats {
  font-size: 11px;
  color: var(--zinc-500);
  margin-top: 2px;
}
```

Keep "Source Models" heading + stats line compact. The search input and type filter below should be 32px tall inputs, not 40px.

```css
.source-search {
  height: 32px;
  font-size: 12px;
  padding: 0 10px;
  border-radius: 4px;
  background: var(--zinc-800);
  border: 1px solid var(--zinc-700);
  color: var(--zinc-200);
  width: 100%;
}

.source-type-filter {
  height: 32px;
  font-size: 12px;
}
```

---

## Progress Bar Header — Compact

The sticky top bar can tighten slightly too:

```css
.progress-header {
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 16px;
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--zinc-950);
  border-bottom: 1px solid var(--zinc-800);
}

.progress-header .title {
  font-size: 15px;
  font-weight: 700;
}

.progress-header .stat-line {
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
}

.progress-header .stat-detail {
  font-size: 11px;
  color: var(--zinc-500);
}

.progress-bar {
  height: 4px; /* down from 6-8px */
  border-radius: 2px;
  grid-column: 1 / -1;
}

.progress-header .legend {
  font-size: 10px;
  color: var(--zinc-500);
  display: flex;
  gap: 12px;
}
```

Progress bar itself: 4px height instead of 6–8px. Still clearly visible with green/amber/red/gray segments.

Total header height: ~72px (from ~90px).

---

## Spacing Summary

| Element | Spacing |
|---------|---------|
| Gap between unmapped rows | 6px |
| Gap between source cards | 4px |
| Gap between mapped rows | 4px |
| Gap between submodel rows | 0px (border-bottom divider only) |
| Section header to first item | 4px |
| Panel inner padding | 12px |
| Row inner padding | 8–10px vertical, 12px horizontal |

---

## Viewport Calculations (1080p, ~700px panel height)

### Left Panel

```
Section header (Needs Mapping):        36px
7 unmapped rows × 56px:               392px
Gap between rows × 6:                  36px
Section header (High Confidence):      36px
Section header (Medium Confidence):    36px
Section header (Skipped):             36px
                                    ──────
Total:                                572px  ← fits in 700px with room
```

All 7 unmapped items visible without scrolling. All collapsed section headers visible below. User sees the full picture at a glance.

### Right Panel

```
Header + stats:                        40px
Search input:                          36px
Type filter:                           36px
Section label (UNMAPPED):              24px
13 source cards × 40px:              520px
Gap × 12:                              48px
                                    ──────
Total:                                704px  ← tight fit, scrollable
```

~10–12 source cards visible before scrolling in the unmapped section. Plenty for most cases.

---

## Before/After Comparison

### Before (current):
- ~4 unmapped items visible
- ~8 source cards visible
- Lots of vertical whitespace inside cards
- Drop zone is a separate visual element inside the card

### After (compact):
- ~7–8 unmapped items visible (all 7 fit without scrolling in this case)
- ~12 source cards visible
- Every pixel earns its keep
- Drop zone IS the card — the entire row highlights on drag-over
- Type and pixel count are inline badges, not separate lines
- Action buttons appear on hover, not always visible
