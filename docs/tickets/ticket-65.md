# Ticket 65 — Unify Grouping: Use xLights Groups as Single Source of Truth

---

## The Problem

Mod:IQ currently has two competing grouping systems:

1. **xLights Groups** — defined by the sequence/layout author in xLights. These are real, intentional containers (e.g., "All - Arches" containing Arch 1–8).
2. **Mod:IQ Groups** — algorithmically detected clusters based on model name similarity. These are guesses that almost always duplicate what xLights already defines.

Having both creates confusion: two phases that feel like the same task (Groups phase vs Models phase), duplicate group headers in the Finalize grid, and a "Groups" filter that could mean either thing.

---

## The Change

Eliminate Mod:IQ's algorithmic grouping. Use xLights-defined groups as the sole grouping mechanism across all phases and the Finalize grid.

---

## Impact on Stepper Phases

### Before (current):
```
Upload → Auto-Matches → Groups → Models → Submodels → Finalize → Review
```

Groups phase = map entire xLights groups as a unit
Models phase = map individual models (with Mod:IQ's algorithmic grouping for visual hierarchy)

### After:
```
Upload → Auto-Matches → Groups & Models → Submodels → Finalize → Review
```

Merge Groups and Models into a single phase. In this phase:

- xLights groups are the expandable headers (same visual hierarchy from Ticket 55 — bordered cards, chevrons, count badges)
- Expanding a group shows its child models
- Users can map at the group level (all children inherit the mapping) OR expand and map individual models
- Ungrouped models (models not in any xLights group) appear in an "Individual Models" section below the grouped ones
- This is essentially how the Models phase already works visually — but now the group headers ARE the xLights groups, not Mod:IQ's name-match guesses

### Stepper pill update:
- Remove "Groups" pill
- Rename to: `Groups & Models` with combined count (or just `Models` if cleaner)
- One fewer step in the stepper bar — reduces perceived complexity

---

## Impact on Finalize Grid

The Finalize grid (Tickets 59, 61, 64) already uses grouped rows. This ticket changes WHERE those groups come from:

- Group headers = xLights groups (not Mod:IQ name clusters)
- Every model appears under its xLights group parent
- Models not in any xLights group appear ungrouped at the bottom
- Group headers show: name, child count, mapped/unmapped summary, expand/collapse, dismiss ✕

No visual changes needed — same grid, same pills, same interactions. Just a different (and more accurate) data source for the grouping.

---

## Impact on Quick Filter Pills

The filter pills in Finalize (Ticket 62) stay relevant but change meaning slightly:

```
[All (340)]  [Groups (98)]  [Models (242)]  [Submodels (0)]
```

- **Groups** = shows only xLights group-level rows (collapsed). Useful for "let me batch-map at the group level."
- **Models** = shows only individual models (groups expanded or hidden, flat list of models). Useful for "let me work model by model."
- **Submodels** = same as before

These become *view modes* more than type filters — "show me the group-level view" vs "show me the flat model-level view."

---

## Edge Case: Layout Models Not in Any xLights Group

A user's layout may have models that don't belong to any xLights group. These appear in an "Ungrouped" section:

```
│ ▸ All - Arches (8)        · 8/8 mapped                              │
│ ▸ All - Mega Trees (5)    · 3/5 mapped                              │
│ ▸ All - Windows (12)      · 8/12 mapped                             │
│ ── Ungrouped ──────────────────────────────────────────────────────  │
│   Driveway Left            │ + Assign                                │
│   Random Prop 1            │ + Assign                                │
```

---

## Edge Case: xLights Groups That Only Partially Match the User's Layout

A source sequence might have an xLights group "All - Arches" with Arch 1–8, but the user's layout only has Arch 1–5. The group header should reflect the user's layout count, not the source group count:

- Group header: `All - Arches (5)` — only showing the 5 that exist in the user's layout
- The 3 source arches without layout matches are visible in the Source Sequence perspective (Ticket 60), not here

---

## Cross-Type Mapping (Group ↔ Model)

Merging phases unlocks mapping across types. The source dropdown for any row — whether it's a group header or an individual model — shows ALL available sources: groups and models together.

### Dropdown Structure

```
┌──────────────────────────────────────────┐
│ Search sources...                        │
├──── 💡 Suggestions ─────────────────────┤
│ 💡 All - Arches (group, 88 fx)    72%   │
│ 💡 ARCH 1 (model, 11 fx)          68%   │
├──── Groups ─────────────────────────────┤
│    All - Arches             88 fx  Group │
│    All - Mega Trees        210 fx  Group │
│    All - Windows            96 fx  Group │
├──── Models ─────────────────────────────┤
│    ARCH 1                   11 fx        │
│    ARCH 2                   11 fx        │
│    MATRIX 1                 82 fx        │
│    MEGATREE                105 fx        │
│    ...                                   │
└──────────────────────────────────────────┘
```

- Suggestions at top (as before)
- Then source groups, labeled with "Group" tag and combined effect count
- Then source models, sorted by effect count
- Searchable — typing filters across both groups and models
- A subtle "Group" badge distinguishes groups from models in the list

### Mapping Combinations

| User's Layout (row) | Mapped To (source) | Behavior |
|---|---|---|
| Group → Group | All 8 arches inherit the source group's effects | Same as current group mapping |
| Group → Model | All 8 arches inherit that single model's effects | New — previously required mapping each model individually |
| Model → Group | Single model inherits the source group's combined effects | New — powerful for "give me everything from that group" |
| Model → Model | Direct 1:1 mapping | Same as current model mapping |

### Group-Level Mapping Override

If a user maps at the group level (e.g., "All - Arches" → "MEGATREE"), all children inherit that mapping by default. But a user can then expand the group and override individual children:

```
│ ▾ All - Arches (8)  ·  mapped to MEGATREE                                      │
│     Arch 1           │ [MEGATREE ✕]  (inherited)                                │
│     Arch 2           │ [MEGATREE ✕]  (inherited)                                │
│     Arch 3           │ [ARCH 3 ✕]    (overridden)                               │
│     ...                                                                          │
```

- "Inherited" label (muted) indicates the mapping came from the group-level assignment
- User can override any child by clicking its dropdown and selecting a different source
- Overridden children show the new source without the inherited label
- Removing the group-level mapping clears all inherited children (but preserves overrides)

---

## What This Does NOT Change

- **Auto-Match phase** — still runs the same fuzzy matching algorithm
- **Submodels phase** — still works the same (submodels within models)
- **The matching engine** — still matches at whatever granularity it needs to. This ticket is purely about visual grouping and phase structure in the UI.
- **Filters and sorts** — all still apply, just with xLights groups as the hierarchy source
