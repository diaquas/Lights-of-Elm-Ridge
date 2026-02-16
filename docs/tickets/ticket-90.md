# Ticket 90 — Minimum Text Size & Readability

**Priority:** P1 — Accessibility / demographic fit
**Applies to:** All ModIQ UI components
**Audit item:** Text sizes (9-11px) throughout are below readable minimum — many xLights users are older hobbyists

---

## Current State

There are 130+ instances of sub-12px text across ModIQ components. The xLights community skews toward older hobbyists who may have reduced visual acuity. WCAG recommends a minimum of 12px for body text; 9-10px is appropriate only for legal disclaimers.

### Inventory of Sub-12px Text

**9px (smallest — nearly illegible):**
- `SourceLayerRow.tsx:230` — GRP badge text
- `SourceLayerRow.tsx:312` — manual assignment tag

**10px (50+ occurrences):**
- Status text, effect counts, secondary labels across:
  - `SourceLayerRow.tsx` (multiple locations)
  - `InteractiveMappingRow.tsx`
  - `DraggableUserCard.tsx`
  - `DraggableSourceCard.tsx`
  - `FinalizePhase.tsx`
  - `IndividualsPhase.tsx`
  - `PostExportScreen.tsx`
  - `MappingProgressBar.tsx`

**10.5px:**
- `FinalizePhase.tsx:1538`

**11px (80+ occurrences):**
- Secondary text, match scores, labels, metadata across nearly every component

---

## Proposed Changes

### 1. Establish a 12px Text Floor
No text in the ModIQ workspace should be smaller than 12px. Replace all instances:

| Current | Replacement | Usage |
|---------|-------------|-------|
| `text-[9px]` | `text-xs` (12px) | Badges, tags |
| `text-[10px]` | `text-xs` (12px) | Status text, counts |
| `text-[10.5px]` | `text-xs` (12px) | Edge case |
| `text-[11px]` | `text-xs` (12px) | Secondary text, scores |

### 2. Create Semantic Text Utility Classes
Add to the Tailwind config or a shared utility file:

```css
/* ModIQ text scale — enforces readability floor */
.modiq-text-primary   { font-size: 14px; line-height: 1.4; }  /* model names, headings */
.modiq-text-secondary { font-size: 13px; line-height: 1.4; }  /* descriptions, metadata */
.modiq-text-caption   { font-size: 12px; line-height: 1.3; }  /* badges, tags, counts */
.modiq-text-label     { font-size: 12px; line-height: 1.3; font-weight: 600; } /* section labels */
```

### 3. Compensate for Size Increase
Badges and tags that increase from 9-10px to 12px will be visually larger. Compensate by:
- Reducing horizontal padding from `px-2` to `px-1.5`
- Using `font-medium` (500) instead of `font-semibold` (600) where text was previously tiny
- Keeping `leading-tight` to control line height

### 4. Specific Component Adjustments
- **Model names:** Bump from 13px to 14px for primary names in both panels
- **Match scores:** Bump from 10-11px to 12px — these are important decision data
- **Effect counts:** Bump from 10px to 12px
- **Badge text (GRP, MANUAL, etc.):** Bump from 9px to 12px with reduced padding

---

## Files to Modify

Approximately 15 component files need text-size updates:

| File | Approximate Changes |
|------|-------------------|
| `SourceLayerRow.tsx` | ~15 size declarations |
| `InteractiveMappingRow.tsx` | ~10 size declarations |
| `DraggableUserCard.tsx` | ~8 size declarations |
| `DraggableSourceCard.tsx` | ~6 size declarations |
| `FinalizePhase.tsx` | ~20 size declarations |
| `IndividualsPhase.tsx` | ~15 size declarations |
| `PostExportScreen.tsx` | ~10 size declarations |
| `MappingProgressBar.tsx` | ~5 size declarations |
| `CoverageBoostPrompt.tsx` | ~5 size declarations |
| `ReviewPhase.tsx` | ~5 size declarations |
| Other smaller components | ~30 size declarations across remaining files |

---

## Acceptance Criteria

- [ ] Zero instances of `text-[9px]`, `text-[10px]`, `text-[10.5px]`, or `text-[11px]` in any ModIQ component
- [ ] All text in the mapping workspace is ≥12px
- [ ] Model names are ≥14px
- [ ] Badge/tag text is 12px with adjusted padding to avoid bloat
- [ ] No layout breakage from size increases — verify all panels, cards, and rows still fit
- [ ] Visually verify on a 1080p screen at 100% zoom that the UI remains balanced
