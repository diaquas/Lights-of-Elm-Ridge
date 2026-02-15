# Ticket 82 — Rebuild Display Coverage Phase: Mirror Groups & Models UX

**Priority:** P0 — Phase is visually inconsistent with the rest of the app
**Depends on:** Ticket 73 (Finalize Critical Fixes), Ticket 76 (Card Redesign), Ticket 77 (Status Checkboxes & Health Bars), Ticket 80 (Panel State Fixes)

---

## The Problem

The Display Coverage (Finalize) phase is missing nearly everything we built for Groups & Models and Submodel Groups:

1. **No status checkboxes** — No green/yellow/red/blue visual state on each row
2. **No FX badges** — Can't see effect counts at a glance per item
3. **No confidence badges** — Mappings shown without match quality indicators
4. **No health bars** — Groups don't show mapping progress of their children
5. **No type badges** — SUPER/GRP distinction exists but styled differently from the other phases
6. **No auto-match banner** — No summary of what was auto-matched vs manual
7. **No row actions on hover** — No unlink/skip appearing on hover
8. **"BEST" badge still present** — Should have been removed per Ticket 80
9. **Right panel uses old layout** — "SUGGESTED SOURCES" + "ALL SOURCES" instead of the three-state panel (SUGGESTED MATCH / ✓ MAPPED TO / NOT MAPPED)
10. **Destination pill styling inconsistent** — Green text with arrow but different from the DestinationPill component used elsewhere
11. **Health/progress shown only in header** — No per-group inline progress
12. **Perspective is flipped but components aren't adapted** — This phase shows YOUR display models on the left and source on the right (opposite of Groups & Models), but the components should still use the same visual system

---

## The Core Principle

**Display Coverage uses the exact same components as Groups & Models, just with the perspective flipped.** Left panel shows destination (your display), right panel shows source options. The card system, status checkboxes, health bars, badges, and detail panel states are identical.

### Perspective Flip Explained

| | Groups & Models | Display Coverage |
|---|---|---|
| Left panel rows | Source groups & models (what you're mapping FROM) | Destination groups & models (YOUR display) |
| Right panel | Pick a destination from your display | Pick a source to fill this display item |
| Question | "Where does this source thing go?" | "What fills this display thing?" |

The *components* don't change. Only the *data direction* changes. A `GroupCard` is still a `GroupCard`. A `ModelRow` is still a `ModelRow`. The `DestinationPill` just shows the source instead of the destination.

---

## Layout: Same as Groups & Models

```
┌─────────────────────────────────────────────────────────────────┐
│  Header bar: DISPLAY 130/150  ·  Effects: 83%  ·  Overall: 75% │
├─────────────────────────────────────────────────────────────────┤
│  Title: "Display Coverage"                  [Continue to Review] │
│  Filter pills: [All (152)] [Mapped (149)] [Unmapped (3)]        │
│  Search bar                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ▾ DISPLAY-WIDE GROUPS (4)                                      │
│                                                                  │
│  ☑ 41 fx  > SUPER All - House - GRP            41/41            │
│  │                    ⟳ → 02 Whole House No Y...  66%  ████████ │
│  ☑  2 fx  > SUPER All - Pixels - GRP            2/2             │
│  │                    ⟳ → 01 Whole Display  100%  ██████████    │
│  ☐  0 fx  > SUPER All - Yard Left - GRP                 8/10   │
│  │                    + Assign                     ████████░░   │
│  ☐  0 fx  > SUPER All - Yard Middle - GRP               5/16   │
│  │                    + Assign                     █████░░░░░   │
│                                                                  │
│  ▾ GROUPS & MODELS                                              │
│                                                                  │
│  ☑  7 fx  > GRP  All - Bats - GRP                       7/7    │
│  │                    ⟳ → All Bats  100%  ██████████            │
│  ☑  1 fx  > GRP  All - Eaves - GRP                      1/1    │
│  │                    ⟳ → 15 All Roofline    ██████████         │
│  ☑  7 fx  > GRP  All - Fence - GRP                      7/7    │
│  │                    ⟳ → Column Matrix L..  ████████           │
│  ☐  0 fx  > GRP  All - Floods - GRP                     0/4    │
│  │                    + Assign                   ░░░░░░░░░░     │
│  ☐  0 fx  > GRP  All - Trees - Real - GRP               0/3    │
│  │                    + Assign                   ░░░░░░░░░░     │
│  ...                                                             │
│  ☑  2 fx  > GRP  All - Fireworks - GRP                   2/2   │
│  │                    ⟳ → 06 All Icicles  ████████              │
│  ...                                                             │
│                                                                  │
│  ▾ INDIVIDUAL MODELS (expand GRP to see)                        │
│    Expanded group shows child model rows with same ModelRow     │
│    component, SUB badge optional or omit type badge for models  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  Legend: ● Mapped  ● Review  ● Weak  ● Unmapped  ● Covered     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Mapping

Every component reused from Groups & Models:

| Component | Display Coverage Usage |
|---|---|
| `GroupCard` | Each destination group (your display groups). Chevron, SUPER/GRP badge, fx count, health bar, expand/collapse. |
| `ModelRow` | Each destination model inside expanded groups. Status checkbox, fx count, source mapping pill. |
| `StatusCheck` | Same 5 states. Green = mapped with source. Yellow = needs review. Red = weak match. Blue = unmapped. Gray = covered by group. |
| `FxBadge` | **Effect count from the SOURCE mapping** (how many fx this display item will receive). 0 fx = no source assigned = needs attention. |
| `TypeBadge` | `SUPER` (purple) for display-wide groups, `GRP` (blue) for regular groups. |
| `ConfidenceBadge` | Match confidence between destination and its assigned source. |
| `DestinationPill` | Shows the **source** name: "→ 01 Whole Display 100%" or "→ All Bats 100%". Same component, just source data instead of destination. |
| `HealthBar` | On group cards. Ratio of mapped/unmapped child models within the group. |
| `RowActions` | Unlink (remove source mapping) + Skip (dismiss from workflow) on hover. |
| `Link2Icon` | Auto-match indicator for items that were auto-matched in earlier phases. |
| `SectionLabel` | "DISPLAY-WIDE GROUPS" and "GROUPS & MODELS" section dividers (same as Groups & Models phase). |

---

## Right Detail Panel — Three States (Ticket 80)

### State 1: Mapped — "✓ MAPPED TO"

```
┌──────────────────────────────────────────────────────────────┐
│  Singing Pumpkin                                              │
│  263px · Pumpkin · unmapped                                   │
│                                                               │
│  ✓ MAPPED TO                                       66%       │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  ⟳  Pimp 2                                              ││
│  │     3 effects                                            ││
│  │                                   [Change]  [Unlink]     ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  OTHER OPTIONS                                                │
│  Spider Leg Group Mini Even .............. 40%               │
│  Spider Leg Group Small .................. 40%               │
│  Spider Eyes Group Small ................. 36%               │
│  Spider Body Group Small ................. 36%               │
│                                                               │
│  ALL SOURCES (90)                                             │
│  [Search...]                                                  │
│  ▾ DISPLAY-WIDE (5)                                          │
│    SUPER  01 Whole Display ............ 112 fx               │
│    SUPER  02 Whole House No Yard ...... 54 fx                │
│    ...                                                        │
│  ▾ GROUPS (25)                                               │
│    GRP  05 All Vertical House Outlines  252 fx               │
│    GRP  06 All Icicles ................ 223 fx               │
│    ...                                                        │
└──────────────────────────────────────────────────────────────┘
```

### State 2: Suggested — "SUGGESTED MATCH"

Same as Groups & Models. Approve button present.

### State 3: Unmapped — "NOT MAPPED"

No top card. Just the ranked suggestion list + browse all sources.

### Key Difference: "BEST" Badge Removed

Per Ticket 80 — no "BEST" badge. Position hierarchy communicates rank. The top suggestion is the top card (if pending) or listed first.

---

## What's Missing from Current Implementation (Screenshot Analysis)

### Must Add:

1. **Status checkboxes** on every row — currently rows have no visual state indicator
2. **FX badges** on every row — currently fx counts are absent on left panel rows
3. **Confidence badges** on mapped items — currently just green text with arrow
4. **Health bars** on group cards — currently no inline progress per group
5. **Row actions on hover** — currently no unlink/skip on hover
6. **Auto-match banner** — currently no summary of auto-matched items
7. **Needs-review filter auto-start** — currently shows everything with no guided workflow
8. **Consistent destination pill** — currently uses different text styling than Groups & Models

### Must Fix:

9. **"BEST" badge** on right panel → remove (Ticket 80)
10. **Right panel states** → implement three states: SUGGESTED MATCH / ✓ MAPPED TO / NOT MAPPED (Ticket 80)
11. **"SUGGESTED SOURCES" + "UNMAPPED" sections** in right panel → replace with "OTHER OPTIONS" + "ALL SOURCES" (consistent naming)
12. **Mapped count format** — currently "8/10" with no color coding → add health bar + color-coded counts
13. **"unmapped" text label** next to item name → replace with blue status checkbox (visual, not text)

### Must Keep:

14. **SUPER/GRP type badges** — these exist but need to use the exact `TypeBadge` component (same width, font, colors)
15. **DISPLAY-WIDE GROUPS section** — this exists and is correct, keep the section divider
16. **Expand/collapse chevrons** — these exist, keep them
17. **Search bar** — exists, keep it
18. **Filter pills** — exist but need color coding (blue active for All, green for Mapped, amber for Unmapped)

---

## Grid Layout

Same CSS Grid as Groups & Models:

**Group rows:**
```
gridTemplateColumns: "18px 42px 16px 42px 1fr auto minmax(50px, 100px) 50px"
                      ckbx  fx   chev badge name  source-pill  health   actions
```

**Model rows (within expanded groups):**
```
gridTemplateColumns: "18px 42px 1fr auto minmax(50px, 100px) 50px"
                      ckbx  fx   name  source-pill  (empty)   actions
```

---

## Status Logic for Display Coverage

Since this phase is destination-perspective (your display), the status of each item depends on whether it has a source assigned:

| Condition | Status | Checkbox |
|---|---|---|
| Source assigned, confidence ≥60% | Mapped | Green ☑ |
| Source assigned, confidence 40-59% | Needs review | Yellow ☑ (click to approve) |
| Source assigned, confidence <40% | Weak | Red ☑ (click to approve) |
| No source assigned, but covered by group mapping | Covered | Gray ☑ |
| No source assigned, not covered | Unmapped | Blue ☐ |

"Covered by group" = the parent group has a source mapping that provides effects to this model. Same static determination as Ticket 80 — based on whether the group-level mapping exists, not affected by sibling actions.

---

## FX Badge Logic

In Groups & Models, the FX badge shows how many effects the source item HAS. In Display Coverage, the FX badge shows **how many effects this display item WILL RECEIVE** from its mapped source:

- Mapped with source → FX badge shows source's effect count (e.g., "41 fx")
- Unmapped → FX badge shows "0 fx" (dimmed, gray) — this display item gets nothing
- Covered by group → FX badge can show the group-level effect count or remain "0 fx" (since the model itself isn't directly mapped)

This makes unmapped items visually obvious: a row of "0 fx" gray badges is a signal that these display items are dark.

---

## Auto-Match Banner

Same component as Groups & Models:

```
┌──────────────────────────────────────────────────────────────────┐
│  🔗 149 display items mapped  ·  [142 strong]  ·  [7 review]    │
│                                          [Accept All Strong (142)]│
└──────────────────────────────────────────────────────────────────┘
```

The counts reflect mappings that were established in Groups & Models and Submodel Groups phases, now shown from the display perspective.

---

## Unmapped-First Default Sort

Per Ticket 73 §5, Display Coverage defaults to unmapped-first:

1. Unmapped items at top (the work to do)
2. Needs-review items next
3. Mapped items below
4. Within each group, alphabetical

The auto-start behavior from Ticket 71 applies here too: if there are unmapped or needs-review items, the filter auto-starts showing those. User resolves them, filter auto-clears.

---

## Cascade on Group-Level Source Assignment

When a user assigns a source to an unmapped group on this phase (clicks "+ Assign" and picks a source), the same cascade prompt appears:

```
┌──────────────────────────────────────────────────────────────────┐
│  Map models inside All - Floods - GRP to matching models         │
│  in the source group?                                            │
│                              [Yes, Map Models]  [No thanks]      │
└──────────────────────────────────────────────────────────────────┘
```

"Yes" runs auto-matching of child models against the source group's children.

---

## Step-by-Step Implementation

### Step 1: Replace Left Panel Row Components

Swap out the current plain-text rows for `GroupCard` and `ModelRow` components. Every row gets: status checkbox, fx badge, type badge (for groups), destination pill (showing source), health bar (for groups), row actions on hover.

### Step 2: Replace Right Detail Panel

Replace current "SUGGESTED SOURCES" / "UNMAPPED" panel with the three-state panel (Ticket 80): SUGGESTED MATCH / ✓ MAPPED TO / NOT MAPPED. Same Approve / Change / Unlink actions.

Remove "BEST" badge. Use position hierarchy.

### Step 3: Add Auto-Match Banner

Add the same auto-match summary banner at top. Pull counts from existing mapping data.

### Step 4: Update Filter Pills

Add color coding to filter pills (currently plain). Blue active for All, green for Mapped, amber for Unmapped. Same component as other phases.

### Step 5: Wire Status Checkbox Logic

Implement the same click-to-approve behavior:
- Yellow/red checkboxes are clickable → approve on click
- Green/blue/gray are non-interactive
- Same "covered by group" static determination

### Step 6: Wire Health Bars on Groups

Compute mapped/unmapped child count for each group. Display using same `HealthBar` component.

### Step 7: Wire Cascade Prompts

When assigning a source to a group or changing a group's source, show cascade prompt to map children.

### Step 8: Default Sort — Unmapped First

Groups with unmapped children sort to top. Within groups, unmapped models sort to top.

---

## Summary

| Before (current) | After (this ticket) |
|---|---|
| Plain text rows, no status indicators | Full card system with status checkboxes, fx badges, type badges |
| No health bars on groups | Health bars showing child mapping progress |
| No confidence badges | Color-coded confidence on every mapped item |
| "BEST" badge on right panel | Removed — position hierarchy only |
| "SUGGESTED SOURCES" / "UNMAPPED" panel sections | Three-state panel: SUGGESTED MATCH / ✓ MAPPED TO / NOT MAPPED |
| No auto-match banner | Same banner as Groups & Models |
| No hover actions | Unlink + Skip on hover |
| Inconsistent styling | Same components as Groups & Models — zero visual divergence |
