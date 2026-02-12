# ModIQ V3: Many-to-One Mapping & Destination Count Indicator

**Status:** Addendum to V3 source-first layout spec.  
**Applies to:** Both panels (source layers + user models), interaction patterns, and .xmap export.

---

## The Principle

A source layer is never "used up." A user model is never "taken." Mapping is not assignment — it's linking. One source layer can link to many user models, and one user model can link to many source layers. Both are normal, both are common, neither is a warning state.

**Why this matters in xLights:**

- Source has 1 Matrix → user has 3 matrices → all 3 should get the same effects rather than leaving 2 blank
- Source has GRP - ALL SPINNERS → user has 2 separate spinner groups → both should receive the effects
- Source has a "Whole House" color wash → user maps their "Whole House" AND their "All Arches" to it for extra coverage
- Source has 6 Arches → user only has 4 arches → user maps all 4 to their closest size match, and 2 source arches get mapped to the same user arch

This is intentional effect duplication. In xLights, this results in the same effects being applied to multiple models — which is exactly what happens when you copy effects between layers. It's a feature, not a conflict.

---

## Interaction Model: Add-Only

### Dragging a User Model onto a Source Layer

Every drag creates a new link. It never moves or replaces an existing link.

```
Action: Drag "Garage Matrix" onto "Matrix-P5"
Result: Matrix-P5 now has 1 destination (Garage Matrix)

Action: Drag "Living Room Matrix" onto "Matrix-P5"  
Result: Matrix-P5 now has 2 destinations (Garage Matrix + Living Room Matrix)

Action: Drag "Garage Matrix" onto "Flood-3"
Result: Garage Matrix is now assigned to 2 source layers (Matrix-P5 + Flood-3)
        Matrix-P5 still has its 2 destinations — nothing was moved
```

**No confirmation dialogs.** No "this model is already assigned, move it?" prompts. Adding is always the action. Removing is always explicit.

### Clicking a Suggestion Pill

Same as dragging — creates a link. If the user clicks the 💡 suggestion pill on an unmapped source layer, it links the suggested user model. If that user model is already linked elsewhere, both links coexist.

### Removing a Link

Links are removed explicitly, never implicitly. Two ways to remove:

**From the left panel (source layer expanded view):**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ▾ ● Matrix-P5               ③  4800px · Matrix · 6 effects            │
│                                                                          │
│     Mapped to 3 of your models:                                          │
│     1. Garage Matrix         4800px · Matrix                         ✕   │
│     2. Living Room Matrix    3200px · Matrix                         ✕   │
│     3. Fence Matrix          6400px · Matrix                         ✕   │
│                                                       [ + Add another ]  │
│                                                                          │
│     Effects from this source will play on all 3 matrices.                │
└──────────────────────────────────────────────────────────────────────────┘
```

Click ✕ next to a specific destination → that one link is removed. The other destinations stay. If all destinations are removed, the source layer moves back to Needs Mapping.

**From the right panel (user model hover/expand):**

Hover or click the assignment indicator on a user model:

```
┌──────────────────────────────────────────┐
│  ⠿  Garage Matrix   MATRIX  4800px  ②   │
│      ├─ → Matrix-P5 (source)         ✕   │
│      └─ → Flood-3 (source)           ✕   │
└──────────────────────────────────────────┘
```

Click ✕ next to a specific assignment → that one link is removed. The model stays in the list (it's never removed). If all assignments are removed, the indicator disappears.

---

## Destination Count Indicator

A small circled number that shows how many links a source layer or user model has. Appears in both panels.

### Where It Appears

**Left panel — on mapped source layer rows:**

Shows how many of the user's models/groups are pointed at this source layer.

```
● Matrix-P5  ③  →  Garage Matrix +2       4800px · MATRIX
              ↑
              between source name and arrow
```

- No indicator when the source layer is unmapped (it's in Needs Mapping, no destinations yet)
- ① when 1 destination (the default mapped state — could optionally be hidden since 1 is implied by being in the Mapped section)
- ② ③ etc. when multiple destinations

**Right panel — on user model/group cards:**

Shows how many source layers this user model is assigned to.

```
⠿  Garage Matrix      MATRIX  4800px  ①
                                       ↑
                                       right-aligned
```

- No indicator when the model has never been assigned
- ① when assigned to 1 source layer
- ② ③ etc. when assigned to multiple source layers

### Visual Design

```css
.destination-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  cursor: default;
  transition: all 0.15s;
}

/* Single assignment — barely there, neutral */
.destination-count[data-count="1"] {
  background: rgba(255, 255, 255, 0.06);
  color: #525252;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Multiple assignments — teal tint, still calm */
.destination-count[data-count="2"],
.destination-count[data-count="3"] {
  background: rgba(45, 212, 191, 0.08);
  color: #5eead4;
  border: 1px solid rgba(45, 212, 191, 0.15);
}

/* 4+ assignments — slightly more prominent, still not a warning */
.destination-count[data-count="4+"] {
  background: rgba(45, 212, 191, 0.12);
  color: #5eead4;
  border: 1px solid rgba(45, 212, 191, 0.2);
}

/* Hover: reveals tooltip or inline expansion */
.destination-count:hover {
  background: rgba(45, 212, 191, 0.15);
  border-color: rgba(45, 212, 191, 0.3);
  cursor: pointer;
}
```

### Color Choice: Teal

Teal (#5eead4 / #2dd4bf range) was chosen deliberately:
- **Not green** — green means "good / confirmed / high confidence" in ModIQ's visual language
- **Not amber/red** — those mean "review / warning / low confidence"
- **Not white/gray** — that would be invisible against the dark UI
- **Teal is informational** — it's a neutral accent that says "here's a fact" without implying good or bad

### Hover Behavior

**On source layer rows (left panel):** Hovering the indicator shows a tooltip listing all destinations:

```
┌─────────────────────────────────────┐
│  3 of your models receive this:     │
│                                     │
│  • Garage Matrix       4800px       │
│  • Living Room Matrix  3200px       │
│  • Fence Matrix        6400px       │
│                                     │
│  Click to expand and edit           │
└─────────────────────────────────────┘
```

**On user model cards (right panel):** Hovering the indicator shows which source layers it's assigned to:

```
┌─────────────────────────────────────┐
│  Assigned to 2 source layers:       │
│                                     │
│  • Matrix-P5          6 effects     │
│  • Flood-3            2 effects     │
│                                     │
│  Click to expand and edit           │
└─────────────────────────────────────┘
```

### Click Behavior

**On source layer rows:** Clicking the indicator (or the row itself) expands the mapped row to show the full destination list with ✕ remove buttons and the "+ Add another" action.

**On user model cards:** Clicking the indicator expands inline below the card to show assignments with ✕ remove buttons:

```
┌──────────────────────────────────────────┐
│  ⠿  Garage Matrix   MATRIX  4800px  ②   │
│      ├─ → Matrix-P5                  ✕   │
│      └─ → Flood-3                    ✕   │
└──────────────────────────────────────────┘
```

The inline expansion pushes content below it down (no overlay, no popover). Clicking the indicator again or clicking elsewhere collapses it.

---

## Left Panel: Mapped Row with Multiple Destinations

### Compact State (Collapsed)

```
● Matrix-P5  ③  →  Garage Matrix +2       4800px · MATRIX · 6 effects
```

The "+2" indicates 2 additional destinations beyond the first one shown. The first destination shown is either the auto-suggested one or the first one the user assigned.

### Expanded State

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ▾ ● Matrix-P5               ③  4800px · Matrix · 6 effects            │
│                                                                          │
│     Mapped to 3 of your models:                                          │
│                                                                          │
│     1. Garage Matrix         4800px · Matrix                         ✕   │
│     2. Living Room Matrix    3200px · Matrix                         ✕   │
│     3. Fence Matrix          6400px · Matrix                         ✕   │
│                                                                          │
│                                                       [ + Add another ]  │
│                                                                          │
│     Effects from this source will play on all 3 matrices.                │
└──────────────────────────────────────────────────────────────────────────┘
```

**"+ Add another" button:** Opens the pick-match popover showing the user's remaining models, filtered by type compatibility. This is the fastest way to pile on destinations without going back to drag-and-drop.

**The explanatory line** ("Effects from this source will play on all 3 matrices") is natural language, not jargon. It confirms what the mapping will actually do in xLights.

### Single Destination (The Common Case)

Most source layers will have exactly 1 destination. In this case, no circled number is shown on the collapsed row — the mapping arrow and destination name are sufficient:

```
● Matrix-P5  →  Garage Matrix              4800px · MATRIX · 6 effects
```

Clean. No unnecessary indicator for the default state.

---

## Right Panel: User Model with Multiple Assignments

### In the Model List

```
│  ⠿ Garage Matrix      MATRIX  4800px  ②  │
│  ⠿ Living Room Matrix MATRIX  3200px  ①  │
│  ⠿ Fence Matrix       MATRIX  6400px  ①  │
│  ⠿ Porch Matrix       MATRIX  2400px     │  ← unassigned, no indicator
```

All four matrices remain in the list at full opacity. All four are draggable. The indicators show at a glance which have been used and how many times. The unassigned one has no indicator — it's available and has never been linked.

### Inline Expansion (on Click)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ⠿  Garage Matrix          MATRIX   4800px   ②                          │
│      ├─ → Matrix-P5 (6 effects)                                     ✕   │
│      └─ → Flood-3 (2 effects)                                       ✕   │
│                                                                          │
│  ⠿  Living Room Matrix     MATRIX   3200px   ①                          │
│      └─ → Matrix-P5 (6 effects)                                     ✕   │
│                                                                          │
│  ⠿  Fence Matrix           MATRIX   6400px   ①                          │
│      └─ → Matrix-P5 (6 effects)                                     ✕   │
│                                                                          │
│  ⠿  Porch Matrix           MATRIX   2400px                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

Each assignment shows the source layer name and its effect count, giving the user context on what they're duplicating. The ✕ removes that specific link.

---

## Impact on Progress / Status Bar

Many-to-one mapping does NOT inflate the progress count. The status bar tracks **source layer coverage**, not destination count.

```
Source: Matrix-P5 has 3 destinations → counts as 1 mapped layer
Source: GRP - ALL ARCHES has 1 destination → counts as 1 mapped layer
```

The progress bar stays honest: "18/22 sequence layers mapped" means 18 source layers have at least one destination. Whether a source layer has 1 or 5 destinations doesn't change the coverage percentage.

However, the export summary can mention the duplication:

```
Coverage: 22/22 layers — full sequence coverage
Groups mapped: 10 (resolved 32 child models)
Direct model maps: 12
Duplicated effects: 4 source layers mapped to multiple destinations
Skipped: 0
```

---

## Impact on .xmap Export

The .xmap file needs to support one-to-many relationships. In the current .xmap format (used by xLights), each line maps a source model to one destination:

```
source_model_name,destination_model_name
```

For many-to-one, the same source model appears on multiple lines:

```
Matrix-P5,Garage Matrix
Matrix-P5,Living Room Matrix
Matrix-P5,Fence Matrix
```

xLights should interpret this as "apply Matrix-P5's effects to all three destinations." Verify that xLights handles duplicate source entries correctly — if it only reads the first occurrence, we may need to generate the mapping differently (perhaps using the import dialog's multi-select feature or generating separate .xmap files per destination).

**Testing needed:** Confirm xLights' behavior when a source model appears multiple times in a .xmap file.

---

## Edge Cases

### User Drags the Same Model onto the Same Source Layer Twice

No-op. The link already exists. Maybe a brief tooltip: "Already assigned" that fades after 1 second.

### All of the User's Models of a Type Are Assigned to One Source Layer

Normal. If the user has 3 matrices and maps all 3 to Matrix-P5, that's fine. The source layer shows ③ and all 3 matrices show ①.

### User Removes the Last Destination from a Mapped Source Layer

The source layer moves back to Needs Mapping. Its destination count goes to 0, indicator disappears, and it re-enters the task list.

### A Group and Its Individual Members Are Both Assigned

The user maps their "All Tombstones" group to GRP - ALL TOMBSTONES, and also maps their individual "Tombstone 1" to the same source group. This is technically redundant (the group already covers Tombstone 1), but not harmful. ModIQ can show a subtle note: "Tombstone 1 is already covered by the All Tombstones group mapping" — but it shouldn't prevent the action.

### Many-to-Many Scenario

Source layer A → User model X and User model Y  
Source layer B → User model X and User model Z  

User model X is assigned to 2 source layers (shows ②). This is fine — model X will receive effects from both source layer A and source layer B. In xLights, this means two sets of effects layered on the same model, which is a valid (if advanced) use case.
