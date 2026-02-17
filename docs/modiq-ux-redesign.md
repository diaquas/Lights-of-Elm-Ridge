# Mod:IQ UX Redesign — Design Analysis & Recommendations

> **Status:** Design proposal
> **Date:** 2026-02-16
> **Scope:** Full Mod:IQ mapping workflow (Phases 1–4 + chrome)

---

## 1. Current State Audit

### What the screen shows (Phase 1: Groups & Models)

The current layout is a two-column mapping interface:

- **Top chrome:** 5-step phase stepper (pills with connectors) + a dual-metric status summary bar (Models Mapped % + Effects Covered %)
- **Left panel:** Source model list with search, sort dropdown, status filter pills, view mode pills, auto-match banner, and CSS grid rows (checkbox | fx | chevron | badge | name | fraction | destination | actions)
- **Right panel:** Suggestion list for the selected source item
- **Bottom bar:** Back / Undo / Focus View / Continue button

### Core problems identified

| # | Problem | Severity |
|---|---------|----------|
| 1 | **Color overload** — 7 semantic colors (green, amber, red, blue, purple, teal, gray) compete simultaneously on a single screen | High |
| 2 | **"Checkboxes" that aren't checkboxes** — the StatusCheck column uses checkbox-shaped elements with 7 visual states, but most aren't clickable. Users expect checkboxes = selection | High |
| 3 | **Filter bar complexity** — 5 stacked control rows (search, sort, status pills, view mode pills, auto-match banner) before any content appears | High |
| 4 | **Information density per row** — up to 8 grid columns (checkbox, fx, chevron, type badge, name, fraction, dest pill, actions) makes rows feel like spreadsheet cells | Medium |
| 5 | **Phase stepper + status bar consume ~120px** of vertical space for always-visible navigation | Medium |
| 6 | **Two competing progress metrics** (model coverage vs effect coverage) dilute focus — users don't know which to optimize | Medium |
| 7 | **Right panel is passive** — shows suggestions but requires the user to figure out *what to do* with them | Medium |
| 8 | **Wasted width** — the layout doesn't scale well on wide screens (panels have fixed max widths) | Low |
| 9 | **Interaction model is selection-first** — must click source, then look right, then act. No inline quick-actions | Low |

---

## 2. Design Principles for the Redesign

1. **One primary metric.** Model coverage is the goal; effects coverage is supplementary context.
2. **Reduce to 3 semantic colors.** Green (done/strong), amber (needs attention), neutral (unmapped/pending). Remove red, blue, purple, and teal as status colors.
3. **No fake checkboxes.** Replace the StatusCheck column with a left-border color stripe — always visible, never mistaken for an interactive control.
4. **Progressive disclosure.** Move sort, view mode, and advanced filters behind a single toolbar — visible only when needed.
5. **Inline actions.** Let users approve/map without leaving the row they're looking at.
6. **Compact chrome.** Stepper and progress should occupy a single 48px row max.

---

## 3. Proposed Layout

### 3A. Header / Chrome (single 48px row)

Replace the two-row stepper + status bar with a single integrated breadcrumb bar:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Upload ✓ › Groups & Models (3/12) › Submodels › Coverage › Review  │
│                                            ▓▓▓▓▓▓▓░░░  67% mapped  │
└──────────────────────────────────────────────────────────────────────┘
```

**Changes:**
- **Breadcrumb-style stepper** (text links with `›` separators) replaces the rounded pill buttons. Completed phases show ✓. Current phase is bold + highlighted. Pending phases are dimmed text.
- **Single inline progress indicator** — a small bar + percentage, right-aligned in the same row. Shows model coverage only. Effects coverage moves to a hover tooltip.
- **Phase item counts** shown inline: "Groups & Models (3/12)" means 3 unmapped out of 12 total.
- **Saves ~70px** of vertical space vs. current two-row stepper + status bar.

### 3B. Toolbar (single row, replaces 4 rows of controls)

Consolidate search, sort, status filter, and view mode into one compact toolbar:

```
┌────────────────────────────────────────────────────────────────┐
│  🔍 Search models...  │  Sort: Name ▾  │  ▣ Filter ▾  │  ≡/▦  │
└────────────────────────────────────────────────────────────────┘
```

**Changes:**
- **Search** stays as an inline input (same as today, but in the toolbar row).
- **Sort** becomes a compact dropdown trigger (shows current sort, expands on click).
- **Filter** becomes a single dropdown that combines status filter + "show all models" + "display-wide" into one popover with checkboxes. Label shows active filter count as a badge: `Filter (2)`.
- **View mode** becomes a segmented toggle (two icons: list vs. grouped) at the end of the toolbar.
- **Auto-match banner** becomes a dismissible notification *above* the toolbar (not inside the scroll area). It's contextual — shows only when there are items needing review, and disappears once resolved.

### 3C. Source List (Left Panel) — Row Redesign

Replace the 8-column CSS grid with a cleaner two-line row:

```
Current (8-col grid):
┌──┬────┬──┬────┬─────────────┬─────┬──────────────┬────┐
│☑ │42fx│ ▸│ GRP│ Arches      │ 2/3 │ → Arch Group │ ⋯  │
└──┴────┴──┴────┴─────────────┴─────┴──────────────┴────┘

Proposed (two-line card):
┌─────────────────────────────────────────────────────────┐
│ ▸  Arches                          → Arch Group  [72%] │
│    GRP · 42 fx · 150px · 2/3 mapped                    │
└─────────────────────────────────────────────────────────┘
```

**Key changes:**

- **Left border stripe replaces checkbox.** A 3px left border colored by status:
  - `green` = mapped/confirmed
  - `amber` = needs review (auto-matched, low confidence)
  - `transparent` (no border) = unmapped
  - `gray dashed` = covered by parent group
- **Line 1:** Chevron (for groups) + **Name** (primary, larger) + right-aligned destination mapping + confidence badge
- **Line 2:** Metadata chips in muted secondary text: type badge, fx count, pixel count, fraction
- **No checkbox column.** The colored left border communicates status without the checkbox affordance confusion.
- **Inline quick-accept.** For unmapped items with a top suggestion, show a ghost "→ Suggestion Name [Accept]" in the destination area on hover, so users can one-click map without opening the right panel.

**Width savings:** Removing the checkbox column (18px) and collapsing type badge + fx into the metadata line frees ~60px of horizontal space for the name column.

### 3D. Right Panel — Actionable Suggestion Panel

Restructure from a passive list to an action-oriented panel:

```
┌──────────────────────────────────────────────────┐
│  BEST MATCH                                      │
│  ┌────────────────────────────────────────────┐  │
│  │  🏠 Arch Group                      [72%]  │  │
│  │  150px · Similar name, spatial match       │  │
│  │                                            │  │
│  │  [ Accept Match ]          [ Skip Source ] │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  OTHER OPTIONS                    2 more matches │
│  ─────────────────────────────────────────────── │
│  Pixel Arches                              58%   │
│  Matrix Group                              41%   │
│                                                  │
│  ALL MODELS                         ▾ Show (24)  │
└──────────────────────────────────────────────────┘
```

**Changes:**
- **Hero "Best Match" card** — the top suggestion gets a prominent card with reasoning summary, pixel comparison, and two clear CTAs: `Accept Match` (primary) and `Skip Source` (secondary). No hunting.
- **"Other Options" section** — collapsed by default, shows 2nd/3rd ranked suggestions as simple rows.
- **"All Models" section** — collapsed by default, expands to the full model list for manual selection. This is the current behavior but pushed below the fold.
- **Drag-and-drop** still works (drag from right to left or vice versa).

### 3E. Bottom Bar — Simplified

```
┌──────────────────────────────────────────────────────────┐
│  ← Back     Undo (Ctrl+Z)              Continue →       │
└──────────────────────────────────────────────────────────┘
```

- Remove "Focus View" from the bottom bar. Focus mode can be a keyboard shortcut only (Esc) or moved to a toolbar icon.
- Keep the bar minimal: Back, Undo, Continue.

---

## 4. Color Palette Reduction

### Current (7 semantic colors)

| Color | Current uses |
|-------|-------------|
| Green | Confirmed mapping, strong confidence, high effects, completed phase, approved status |
| Amber | Needs review, medium confidence, medium effects |
| Red | Weak confidence, low effects, error states |
| Blue | Unmapped status, info, member count badge, type badge (GRP) |
| Purple | Submodels, fx count badge, super groups, type badge (SUB) |
| Teal | Destination count, covered children, type badge (SUB alternate) |
| Gray | Disabled, low emphasis, covered by group |

### Proposed (3 semantic + 1 accent)

| Color | Meaning | Usage |
|-------|---------|-------|
| **Green** | Done / confirmed | Mapped items, completed phases, strong matches (≥60%) |
| **Amber** | Attention needed | Needs review items, suggested matches (<60%), auto-match banner |
| **Neutral (gray)** | Inactive / pending | Unmapped items, disabled controls, metadata, pending phases |
| **Accent (blue)** | Interactive / selected | Selected row highlight, active phase, primary buttons, links |

**Eliminations:**
- **Red** → Remove. Items below 40% confidence get amber (review) or neutral (unmapped) treatment. Red creates unnecessary anxiety in a mapping tool where imperfect matches are normal.
- **Purple** → Remove as semantic color. Fx badges become neutral gray. Type badges use text labels without color coding (just `GRP`, `SUB`, `MODEL` in gray).
- **Teal** → Remove. Destination count and covered-children text become neutral gray with slightly different opacity.
- **Blue** → Repurpose as accent/interactive only (not status). Unmapped items get no color (neutral).

### Badge colors specifically

| Badge | Current | Proposed |
|-------|---------|----------|
| FxBadge | Purple bg + text | Neutral `bg-foreground/5 text-foreground/50` (always, regardless of count) |
| TypeBadge (GRP) | Blue bg + text | `bg-foreground/8 text-foreground/50` with text "GRP" |
| TypeBadge (SUB) | Teal bg + text | Same neutral style with text "SUB" |
| FractionBadge | Green/yellow/blue by ratio | Neutral text, green only when 100% |
| ConfidenceBadge | Green/amber/red tiers | Green (≥60%) or amber (<60%), no red tier |
| DestinationPill | Green/amber/red by confidence | Green (confirmed) or amber (suggested), no red |

---

## 5. Replacing StatusCheck (Checkboxes)

### Current behavior

The `StatusCheck` component renders an 18x18px checkbox-shaped element with 7 states:
- `approved` / `strong` / `manual` — filled green checkbox with white check
- `needsReview` — amber border, transparent bg, amber check (semi-transparent)
- `weak` — red border, transparent bg, red check (very transparent)
- `unmapped` — blue border, no check
- `covered` — gray filled, gray check

Only `needsReview` and `weak` are actually clickable (to approve). The rest are display-only.

### Problems
1. **Looks like a checkbox** (rounded rectangle with check icon) but isn't a bulk-select control
2. **7 states in 18px** — too many to distinguish at a glance
3. **Click target confusion** — users try to click unmapped/covered items expecting toggle behavior

### Proposed replacement: Left border stripe

Remove the checkbox column entirely. Instead, each row gets a **3px left border** that communicates status through color:

```css
/* Row status via left border */
.row--mapped     { border-left: 3px solid rgb(74, 222, 128); }  /* green-400 */
.row--review     { border-left: 3px solid rgb(251, 191, 36); }  /* amber-400 */
.row--unmapped   { border-left: 3px solid transparent; }
.row--covered    { border-left: 3px dashed rgba(255,255,255,0.15); }
```

**Benefits:**
- **No false affordance** — a colored border doesn't look clickable
- **4 states, not 7** — mapped, review, unmapped, covered. The "approved/strong/manual" distinction is irrelevant to the user (all three mean "done")
- **Frees 18px per row** — reclaimed for the name column
- **For approve actions** — the "Approve" button on the auto-match banner and the CurrentMappingCard handle approval; no need for per-row click targets

### What about bulk selection?

If bulk selection is needed in the future (select multiple items to skip/map), add an explicit "Select mode" toggle in the toolbar that shows actual checkboxes. Don't mix status display and selection affordances.

---

## 6. Auto-Match Banner Redesign

### Current issues
- The banner competes with the status filter pills for attention
- When in "Showing: N needs review" mode, it adds yet another filter state on top of `bannerFilter`/`statusFilter`
- "Approve All" vs "Accept All Strong" vs "Skip review, show all" — three actions is a lot for a banner

### Proposed: Notification bar above toolbar

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ 8 auto-matched  ·  6 strong  ·  2 need review              │
│                           [ Review 2 ]  [ Accept All Strong ]   │
└─────────────────────────────────────────────────────────────────┘
```

- **One line, always above the toolbar** (when present)
- **Two CTAs max**: "Review N" (filters to needs-review items) and "Accept All Strong" (bulk approve)
- **Dismissible** with X. Once all review items resolved, banner auto-dismisses with a success toast.
- **No separate "banner filter" state.** Clicking "Review N" sets `statusFilter = 'auto-review'` directly — one filter system, not two.

---

## 7. Phase-Specific Recommendations

### Phase 1 (Groups & Models) & Phase 2 (Submodels)

These are essentially the same UI with different data sets. The redesign above applies to both. The only Phase 2 difference is the SUB badge in the metadata line.

**Additional Phase 2 idea:** Since submodel groups are conceptually "zooming in" on items from Phase 1, consider showing a breadcrumb-like context: "Mapped parent: Arch Group → now mapping submodels."

### Phase 3 (Display Coverage / Finalize)

The Finalize phase flips the perspective: left panel shows *destination* (user layout) models, right panel shows *source* suggestions. This is the reverse of Phases 1–2 and can be disorienting.

**Recommendations:**
- **Visual differentiation.** Change the left panel header color/icon to clearly signal "this is YOUR display, not the sequence."
- **Dest-first language.** Headers should read "Your Display Models" (left) and "Available Sources" (right).
- **Green fill animation.** As coverage approaches 100%, fill the progress bar with a smooth animation. At 100%, show a celebration state inline (no modal needed).
- **Smart skip.** If a dest model is already covered by a group mapping, dim it and show "Covered by [Group Name]" rather than requiring the user to figure out why it's grayed.

### Phase 4 (Review & Export)

The review phase is mostly fine — it's a summary/celebration screen. Minor recommendations:
- **Simplify the hero metric** to just one large number: "92% of your display is mapped."
- **Move "Coverage Boosts"** to the Finalize phase as inline suggestions, not a separate review-phase section. By review time, the user should be done mapping.
- **Export should be a single prominent button**, not buried in a section. "Download .xmap" as the primary CTA.

---

## 8. Interaction Model Improvements

### Inline quick-accept (new)

For unmapped items that have a high-confidence top suggestion:

```
┌─────────────────────────────────────────────────────────┐
│ ▸  Mega Tree                                            │
│    MODEL · 2.1k fx · 500px                              │
│                                                         │
│    💡 Best match: Mega Tree Display  [82%]  [ Map ✓ ]   │
└─────────────────────────────────────────────────────────┘
```

- Show the top suggestion inline (below metadata) with a one-click "Map" button.
- Only shown for unmapped items with ≥60% confidence top suggestion.
- Clicking "Map" immediately assigns and moves to the next unmapped item.
- This reduces the need to even look at the right panel for obvious matches.

### Keyboard navigation (enhanced)

- **↑/↓** — Navigate source items
- **Enter** — Accept top suggestion for selected item
- **S** — Skip selected item
- **→** — Focus right panel (suggestions)
- **←** — Focus left panel (source list)
- **?** — Show keyboard shortcut overlay

### Drag improvements

- Larger drag handles (the entire row can initiate drag, not just a specific zone)
- Drop target highlights should be more prominent (full row highlight, not just border change)
- Show a "drop preview" tooltip: "Map Arches → Arch Group"

---

## 9. Wide-Screen Layout Option

For screens ≥1800px wide, consider a three-column layout:

```
┌─────────────────┬────────────────────────┬─────────────────┐
│  SOURCE LIST    │   MAPPING DETAIL       │  DEST MODELS    │
│  (sequence)     │   (selected item)      │  (your display) │
│                 │                        │                 │
│  ▸ Arches       │   Arches               │   Arch Group    │
│    Mega Tree    │   GRP · 42 fx · 150px  │   Mega Tree     │
│    Matrix       │                        │   Matrix Left   │
│    Spinner 1    │   Top match: Arch Grp  │   Matrix Right  │
│    ...          │   [Accept] [Skip]      │   Spinner       │
│                 │                        │   ...           │
│                 │   Scoring breakdown:   │                 │
│                 │   Name: 0.18/0.20      │                 │
│                 │   Spatial: 0.15/0.20   │                 │
│                 │   ...                  │                 │
└─────────────────┴────────────────────────┴─────────────────┘
```

**Benefits:**
- Source and destination lists are always visible simultaneously
- The center panel provides rich detail for the selected mapping
- Reduces the "select → look right → act" ping-pong to "select → see everything → act"
- Works naturally with drag-and-drop between columns 1 and 3

**Degradation:** On narrower screens (≤1400px), collapse to the current two-column layout with the center detail merged into the right panel.

---

## 10. Implementation Priority

### Phase A — Quick wins (visual polish, no structural changes)

1. **Replace StatusCheck with left-border stripes** — modify `StatusCheck` to render as a border style on the parent row instead of a checkbox element
2. **Reduce color palette** — update `MetadataBadges.tsx`, `ConfidenceBadge.tsx`, `panelStyles.ts` to use 3-color scheme
3. **Remove red confidence tier** — merge "low" (red) into "medium" (amber) in `getConfidenceTier()`
4. **Neutralize FxBadge/TypeBadge colors** — remove purple/blue/teal, use neutral gray

### Phase B — Toolbar consolidation

5. **Merge filter controls into single toolbar row** — combine search + sort + filter dropdown + view toggle
6. **Unify banner filter with status filter** — remove `bannerFilter` state; auto-match banner sets `statusFilter` directly
7. **Compact the phase stepper** — replace pills with breadcrumb text + inline progress bar

### Phase C — Row layout redesign

8. **Two-line card rows** — replace 8-column CSS grid with a Name + Metadata layout
9. **Inline quick-accept** — show top suggestion + one-click Map button on unmapped rows
10. **Hero "Best Match" in right panel** — restructure UniversalSourcePanel to lead with a prominent top-suggestion card

### Phase D — Advanced

11. **Three-column wide-screen layout** — responsive breakpoint at 1800px
12. **Enhanced keyboard navigation** — arrow keys, Enter to accept, S to skip
13. **Phase 3 visual differentiation** — dest-first language, coverage fill animation

---

## 11. Mockup Summary (ASCII)

### Before (current):

```
┌─ Stepper Pills ──────────────────────────────────────────────────────┐
│  [Upload ✓] ── [Groups & Models] ── [Submodels] ── [Coverage] ── [Review] │
├─ Progress Bar ───────────────────────────────────────────────────────┤
│  Models Mapped: ▓▓▓▓▓▓░░ 67%  │  Effects Covered: ▓▓▓▓░░░░ 52%    │
├──────────────────────────────────┬───────────────────────────────────┤
│  🔍 Search...                    │                                   │
│  Sort: Name ▾                    │                                   │
│  [All] [Unmapped] [Strong] ...   │   Suggestions for "Arches"       │
│  [All] [Groups] [Models]         │                                   │
│  ⚡ 8 auto-matched, 2 review     │   Arch Group          72%        │
│ ──────────────────────────────── │   Pixel Arches        58%        │
│ ☑ 42fx ▸ GRP Arches 2/3 →Arch   │   Matrix Group        41%        │
│ ☑ 2.1k  Mega Tree    →Mega Tree │   ...                            │
│ ☐ 150   Matrix                   │                                   │
│ ☑ 89    Spinner 1     →Spinner   │   ── All Models ──               │
│ ...                              │   Arch Group                      │
│                                  │   Mega Tree                       │
│                                  │   ...                             │
├──────────────────────────────────┴───────────────────────────────────┤
│  ← Back     Undo     Focus View              Continue to Submodels → │
└──────────────────────────────────────────────────────────────────────┘
```

### After (proposed):

```
┌─ Breadcrumb + Progress ──────────────────────────────────────────────┐
│  Upload ✓ › Groups & Models (3/12) › Submodels › Coverage › Review   ▓▓▓▓▓░░ 67% │
├──────────────────────────────────────────────────────────────────────┤
│  ⚡ 6 strong auto-matched · 2 need review    [Review 2] [Accept All] │  ← banner
├──────────────────────────────────────────────────────────────────────┤
│  🔍 Search...    Sort: Name ▾    Filter ▾    ≡                       │  ← one row
├──────────────────────────────────┬───────────────────────────────────┤
│                                  │                                   │
│ ▸ Arches                →Arch Grp│   BEST MATCH                      │
│   GRP · 42fx · 150px · 2/3      │   ┌─────────────────────────────┐ │
│ ──────────────────────────────── │   │ Arch Group           [72%] │ │
│   Mega Tree        →Mega Tree    │   │ 150px · Name+spatial match │ │
│   MODEL · 2.1k fx · 500px       │   │ [  Accept Match  ] [ Skip ]│ │
│ ──────────────────────────────── │   └─────────────────────────────┘ │
│   Matrix                         │                                   │
│   MODEL · 150 fx · 200px        │   OTHER OPTIONS            2 more │
│   💡 Matrix Left [82%]  [Map ✓]  │   Pixel Arches              58%  │
│ ──────────────────────────────── │   Matrix Group              41%  │
│   Spinner 1         →Spinner     │                                   │
│   MODEL · 89 fx · 100px        │   ALL MODELS              ▾ (24)  │
│                                  │                                   │
├──────────────────────────────────┴───────────────────────────────────┤
│  ← Back     Undo (Ctrl+Z)                            Continue →      │
└──────────────────────────────────────────────────────────────────────┘
```

**Key differences visible:**
- ~70px saved in header area (one row vs. two rows of stepper + progress)
- One toolbar row vs. four control rows
- Left-border color stripes instead of checkboxes (implied in the rendering)
- Two-line rows with metadata on second line
- Inline quick-accept on the "Matrix" row (`💡 Matrix Left [82%] [Map ✓]`)
- Right panel leads with a hero "Best Match" card instead of a flat list
- Cleaner bottom bar (no Focus View button)

---

## 12. Open Questions

1. **Bulk selection** — Do we ever need multi-select in the source list? If so, how is it triggered (toolbar toggle, shift-click)?
2. **Effects coverage** — Is it a primary metric users care about, or purely informational? This determines if it stays in the header or becomes a tooltip.
3. **Drag direction** — Do users drag from left to right, right to left, or both? Worth tracking analytics to decide which direction to optimize.
4. **Coach marks** — The current `CoachMarkOverlay` presumably teaches the current layout. Any redesign needs updated onboarding.
5. **Phase skip** — Can users skip Phase 2 (Submodels) if they have no spinners/wreaths? Currently the phase shows an empty state — consider auto-advancing instead.
