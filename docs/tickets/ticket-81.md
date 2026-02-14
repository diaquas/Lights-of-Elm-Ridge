# Ticket 81 — Rebuild Submodel Groups Phase: Mirror Groups & Models UX

**Priority:** P0 — Current implementation is non-functional
**Depends on:** Ticket 76 (Card Redesign), Ticket 77 (Status Checkboxes & Health Bars), Ticket 78 (Submodel Groups Step Design), Ticket 79 (Spinner Monogamy), Ticket 80 (Panel State Fixes)
**Reference mockup:** `submodel-groups-mockup.jsx` (companion file)

---

## The Problem

The Submodel Groups phase is broken. It doesn't follow the same card system, status checkbox patterns, detail panel behavior, or interaction model as Groups & Models. Users who just learned how Groups & Models works have to re-learn a completely different interface for what is conceptually the same task: "map source things to destination things."

**This ticket says: throw it out and rebuild it as a near-exact clone of Groups & Models**, with the only structural differences being (a) it's scoped per parent model, and (b) it has xmodel section headers as collapsible dividers.

---

## Architecture: What Stays the Same as Groups & Models

Copy these verbatim from Groups & Models — same components, same props, same behavior:

### 1. Left Panel Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  Header bar: progress stats (submodel groups mapped / total)    │
├─────────────────────────────────────────────────────────────────┤
│  Title: "Submodel Groups"                 [Continue to Finalize]│
│  Filter pills: [All (83)] [Mapped (47)] [Unmapped (36)]        │
│  Auto-match banner (if applicable)                              │
├─────────────────────────────────────────────────────────────────┤
│  Model selector (NEW — see below)                               │
├─────────────────────────────────────────────────────────────────┤
│  Section: **WHOLE SPINNER**                                     │
│    SubmodelGroupRow (same as ModelRow)                           │
│    SubmodelGroupRow                                             │
│  Section: **OUTER**                                             │
│    SubmodelGroupRow                                             │
│    SubmodelGroupRow                                             │
│  ...                                                            │
├─────────────────────────────────────────────────────────────────┤
│  Legend (same as Groups & Models)                                │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Right Panel (Detail Panel)
Identical to Groups & Models. Three states per Ticket 80:

| State | Header | Actions |
|---|---|---|
| Pending suggestion | **SUGGESTED MATCH** | [Approve] |
| Confirmed mapping | **✓ MAPPED TO** | [Change] [Unlink] |
| No mapping | **NOT MAPPED** | Click suggestion to assign |

Shows: submodel group name, pixel count, layer count, metadata. Below: suggestion list with confidence scores sorted by rank (no "BEST" badge). Browse all destination submodel groups with search.

### 3. Card/Row Components
Reuse EXACTLY the same components:

| Component | Usage in Submodel Groups |
|---|---|
| `StatusCheck` | Same 5 states: approved/green, needsReview/yellow, weak/red, unmapped/blue, covered/gray |
| `FxBadge` | Effect count for this submodel group |
| `TypeBadge` | Always shows `SUB` (teal) for submodel group rows |
| `ConfidenceBadge` | Same thresholds: ≥60% green, 40-59% yellow, <40% red |
| `DestinationPill` | `→ SOURCE SUBMODEL NAME` with confidence badge |
| `HealthBar` | On the model selector cards (not on individual submodel group rows) |
| `RowActions` | Unlink + Skip on hover, same as model rows |
| `Link2Icon` | Auto-match indicator |

### 4. CSS Grid Layout
Submodel group rows use the **ModelRow grid** (no chevron, no type badge needed since they're all SUB):

Actually — keep the type badge for visual consistency with Groups & Models. Every row has the same column pattern:

```
Submodel Group Row Grid (matches MODEL_GRID but with badge):
"18px 42px 42px 1fr auto 50px"
 ckbx  fx   SUB  name  dest+conf  actions
```

This is slightly simplified from the full GROUP_GRID (no chevron, no health bar column) but keeps the same visual rhythm.

### 5. Filter Pills
```
[All (83)]  [Mapped (47)]  [Unmapped (36)]
```
Same behavior: one active at a time, counts update live. Same color coding (blue for All active, green for Mapped active, amber for Unmapped active).

### 6. Auto-Match Banner
```
┌──────────────────────────────────────────────────────────────────┐
│  🔗 47 auto-matched  ·  [38 strong]  ·  [9 needs review]       │
│                                         [Accept All Strong (38)] │
└──────────────────────────────────────────────────────────────────┘
```
Same component, same "Accept All Strong" button, same clickable filter links for strong/needs review.

### 7. Auto-Start with Needs Review
Same behavior as Groups & Models (Ticket 71 §5):
- If needs-review items exist → page loads filtered to just those
- Banner: "9 matches need your review before continuing"
- Resolving all → auto-clears filter, shows full list
- "Skip review, show all" link available

### 8. Sort Dropdown
```
Sort: [Name A→Z ▾]  🔄
```
Same options. Same stable sort behavior.

### 9. Legend
Same bottom legend bar with all 5 status colors.

---

## Architecture: What's Different from Groups & Models

### Difference 1: Model Selector Bar

Groups & Models shows a flat/tree list of all groups and models. Submodel Groups is **scoped to one parent model at a time** because each HD prop has its own set of submodel groups.

Add a **model selector bar** between the filter pills and the submodel group list:

```
┌──────────────────────────────────────────────────────────────────┐
│  SELECT MODEL                                                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ● Showstopper Spinner     83 sub-groups  ████████░░ 47/83│  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ○ Cross Spinner           13 sub-groups  ██████████ 13/13│  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ○ GE Overlord             22 sub-groups  ████░░░░░░  9/22│  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Paired source: VLS Mega Spinner (Ticket 79 pairing)            │
└──────────────────────────────────────────────────────────────────┘
```

Each model card shows:
- Radio button (one selected at a time)
- Model name
- Submodel group count
- Mini health bar (mapped/unmapped ratio)
- Mapped count / total count

Clicking a different model swaps the submodel group list below. Filter pills and auto-match banner update to reflect the selected model's submodel groups.

**Below the selector**, show the paired source model (from Ticket 79 spinner monogamy): "Paired with: VLS Mega Spinner" — click to change pairing.

### Difference 2: xmodel Section Headers as Collapsible Dividers

The xmodel file contains section markers like `**OUTER`, `**MIDDLE`, `**CENTER`, `**HALLOWEEN`. These become **collapsible section dividers** in the list (same visual pattern as `SectionLabel` from Groups & Models):

```
▾ WHOLE SPINNER (12 sub-groups)
  ☑  12 fx  SUB  01 Cascading Arches      → Cascading Arches    72%  🔗
  ☑   6 fx  SUB  02 Cascading Arches-Odd  → Cascading Arches    72%  🔗
  ☐   3 fx  SUB  03 Cascading Arches-Even → (+ Assign)
  ...

▾ OUTER (18 sub-groups)
  ☑   4 fx  SUB  33 Outer Swirl Left      → Outer Swirl Left    88%  🔗
  ☐   0 fx  SUB  34 Outer Swirl Right     → (+ Assign)
  ...

▾ HALLOWEEN (8 sub-groups)
  ☐   8 fx  SUB  71 Spider Web            → (+ Assign)
  ☑   3 fx  SUB  73 Bat                   → Bat Silhouette      65%  🔗
  ...
```

Section dividers:
- Use the same `SectionLabel` component (green uppercase text, count, horizontal rule)
- Collapsible (chevron toggle) — all expanded by default
- NOT mappable — they're organizational labels, not submodel groups
- If xmodel has no section headers, just show a flat list (no dividers needed)

### Difference 3: No Group-Level Cards (No Nesting)

Groups & Models has a two-level hierarchy: Group Card → Model Rows. Submodel Groups is **flat within each section** — just rows. No expand/collapse on individual rows. No health bars on individual rows.

The health bars live on the **model selector cards** (Difference 1 above), not on individual submodel group rows.

### Difference 4: Spinner Pairing Review (Top of Step)

Before the model selector, show the spinner pairing summary (from Ticket 79):

```
┌──────────────────────────────────────────────────────────────────┐
│  HD PROP PAIRINGS                                                │
│                                                                  │
│  Your Display              Source                  Score         │
│  ─────────────────────     ─────────────────────   ─────         │
│  Showstopper Spinner    →  VLS Mega Spinner        72%    ✎     │
│  GE Overlord            →  GE Click Click Boom     81%    ✎     │
│  Cross Spinner          →  Cross Spinner           100%   ✎     │
│                                                                  │
│  ⚠ 14 unmapped sub-groups across 3 models (gaps are normal)    │
│                                                                  │
│  [Looks Good]  [Let Me Adjust]                                   │
└──────────────────────────────────────────────────────────────────┘
```

- Shown once at the top when the step first loads
- User clicks "Looks Good" → pairing review collapses and model selector appears
- User clicks "Let Me Adjust" → ✎ buttons become active, dropdown to reassign source
- After confirmation, this section stays collapsed but expandable via a small "View Pairings" link

### Difference 5: Right Panel Scoped to Paired Source

When browsing destination options in the right panel, the list is **filtered to only show submodel groups from the paired source model** (Ticket 79). Not all 214 source models — just the submodel groups within VLS Mega Spinner (or whatever the paired source is).

```
┌──────────────────────────────────────────────────────────────┐
│  01 Cascading Arches                                         │
│  12 pixels · Submodel Group                                  │
│                                                              │
│  SUGGESTED MATCH                                   72%       │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  🔗 Cascading Arches (VLS Mega Spinner)                 ││
│  │     14 pixels · Submodel Group                          ││
│  │                                        [Approve]        ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  OTHER OPTIONS (from VLS Mega Spinner)                       │
│  Cascading Sweep ..................... 58%                   │
│  Arch Pattern ........................ 45%                   │
│  Half Moon ........................... 32%                   │
│                                                              │
│  ALL SUB-GROUPS IN VLS MEGA SPINNER (45)                     │
│  [Search...]                                                 │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

Note: "OTHER OPTIONS (from VLS Mega Spinner)" — explicitly names the paired source so the user understands why the list is limited. If user wants a different source, they go back to the pairing review.

---

## Step-by-Step Implementation Guide

### Step 1: Create the SubmodelGroupsPhase Component

Clone the `GroupsModelsPhase` component structure. Same layout shell:
- Header bar with progress stats
- Title + "Continue to Finalize" button
- Filter pills row
- Auto-match banner
- Content area (left panel + right detail panel)
- Legend

### Step 2: Build the Model Selector

New component: `ModelSelector`

```typescript
interface ModelSelectorProps {
  models: HDModel[];           // Models that have submodel groups
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  pairings: SpinnerPairing[];  // From Ticket 79
}
```

Each model card in the selector is a simple horizontal row:
- Radio button (styled as a dot)
- Model name (DM Sans, 13px, bold)
- Submodel group count (JetBrains Mono, 11px, muted)
- Mini HealthBar component (same as Groups & Models, just narrower)
- Mapped/total count (JetBrains Mono, 11px)

Active model has a subtle highlight border (same `cardBg` with brighter border).

### Step 3: Build SubmodelGroupRow

Clone `ModelRow` from Groups & Models with these adjustments:

```typescript
interface SubmodelGroupRowProps {
  name: string;               // "01 Cascading Arches"
  fxCount: number;
  destination?: string;       // Mapped source submodel group name
  confidence?: number;
  autoMatched: boolean;
  status: 'approved' | 'needsReview' | 'weak' | 'unmapped';
  onSelect: () => void;       // Open in right panel
}
```

Grid: `"18px 42px 42px 1fr auto 50px"`

Components in order:
1. `StatusCheck` — same states, same click-to-approve for yellow/red
2. `FxBadge` — effect count
3. `TypeBadge` — always `SUB` (teal)
4. Name — `DM Sans`, 12px, 500 weight
5. `DestinationPill` or "+ Assign" — right-aligned
6. `RowActions` — unlink + skip on hover

### Step 4: Build SectionDivider

Reuse `SectionLabel` from Groups & Models with added collapse toggle:

```typescript
interface SectionDividerProps {
  label: string;              // "OUTER", "HALLOWEEN", etc.
  count: number;              // Sub-groups in this section
  expanded: boolean;
  onToggle: () => void;
}
```

Visual: chevron + green uppercase text + count + horizontal rule. Click to collapse/expand.

### Step 5: Wire Up the Right Detail Panel

Reuse the same detail panel component from Groups & Models. The only difference:

**Browse list is scoped**: Instead of showing all source models/groups, show only source submodel groups from the paired source HD prop. Filter, search, and sort within that scoped list.

Panel sections:
1. Submodel group name + metadata (pixel count, section it belongs to)
2. Current mapping state (SUGGESTED MATCH / ✓ MAPPED TO / NOT MAPPED)
3. Other options from paired source (ranked by confidence)
4. "All sub-groups in [Source Name]" with search

### Step 6: Wire Up Auto-Match Data

When this phase loads, auto-match results should already be computed (they ran during the loading phase along with Groups & Models matches). The submodel group matches come from the cross-reference algorithm (Ticket 78) and respect spinner monogamy (Ticket 79).

Pre-apply auto-matches to the UI:
- Strong matches (≥60%) → green status checkbox, `Link2` badge
- Needs review (40-59%) → yellow status checkbox, `Link2` badge
- Weak (<40%) → red status checkbox, `Link2` badge
- No match → blue/unmapped status checkbox, no badge

### Step 7: Auto-Skip Logic

If NO models on either side have submodel groups:
- Skip this stepper pill entirely
- Stepper shows: Upload → Groups & Models → Finalize → Review

Check: `sourceModels.some(m => m.submodelGroups.length > 0) && destModels.some(m => m.submodelGroups.length > 0)`

If one side has submodel groups but the other doesn't → still skip (nothing to map).

### Step 8: Connect Status Checkbox Click-to-Approve

Same behavior as Groups & Models:
- Click yellow checkbox → status becomes "approved" (green). Mapping is confirmed.
- Click red checkbox → status becomes "approved" (green). Mapping is confirmed despite low confidence.
- Green/blue/gray checkboxes are not clickable.
- Approving does NOT affect any sibling submodel group's status (Ticket 80 Bug 2).

### Step 9: Progress Stats in Header Bar

```
SUBMODEL GROUPS  47/83       Display: 57% (47/83)     Effects: 42% (320/762)
          ████████░░░░
```

Counts reflect only the currently selected model's submodel groups. When switching models via the selector, stats update.

Alternatively, show aggregate across all models:
```
SUBMODEL GROUPS  69/118      3 models · 69 of 118 sub-groups mapped
```

Both approaches work — pick whichever matches the Groups & Models header pattern most closely.

---

## Interaction Flow Summary

```
1. User arrives at Submodel Groups step
2. IF no submodel groups exist → auto-skip to Finalize
3. Show Spinner Pairing Review at top
4. User confirms pairings → "Looks Good"
5. Model selector appears with first model pre-selected
6. Auto-match banner shows: "47 auto-matched · 38 strong · 9 needs review"
7. Page auto-filters to "needs review" items
8. User reviews/approves the 9 yellow/red items
9. Filter auto-clears → full list visible
10. User switches to next model via selector
11. Repeat 6-9 for each model
12. User clicks "Continue to Finalize"
```

---

## What to Delete

- The entire current Submodel Groups phase component — do not try to patch it
- Any submodel-specific card or row components that don't match the Groups & Models pattern
- Any legacy matching/suggestion UI that doesn't follow the three-state detail panel (Ticket 80)

## What to Reuse

- `StatusCheck`, `FxBadge`, `TypeBadge`, `ConfidenceBadge`, `DestinationPill`, `HealthBar`, `RowActions`, `Link2Icon`, `SectionLabel`, `IconBtn` — all from Groups & Models
- Detail panel component — same three states
- Filter pills component — same behavior
- Auto-match banner component — same behavior
- Sort dropdown — same component
- Legend — same component

The goal is maximum component reuse. If Submodel Groups looks and feels like a continuation of Groups & Models (just with a model selector at the top and section dividers), we've succeeded.
