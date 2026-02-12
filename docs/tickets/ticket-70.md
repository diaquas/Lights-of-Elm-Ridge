# Ticket 70 — Super Group Detection & Handling

---

## The Problem

xLights groups are a flat tag system, not a hierarchy. A single model can belong to 5+ groups. Some groups are logical containers for a section of the display ("All - Tombstones"), while others span the entire display ("All - Pixels") or large sections ("All - Left Yard"). Sequencers map effects at all these levels, and the super-group-level mappings carry real content (whole-display chases, blanket color washes, etc.).

Currently Mod:IQ treats all groups as peers. This makes "All - Pixels" (containing 150 models) sit alongside "All - Small Tombstones" (containing 2 models) as if they're the same thing. Users need to map both, but the workflow and context are very different.

---

## Super Group Detection Algorithm

A group is classified as a **super group** if it fully contains the members of **3 or more other groups**.

### Logic:
```
For each group G:
  contained_count = 0
  For each other group H (where H ≠ G):
    If every model in H is also in G:
      contained_count += 1
  If contained_count >= 3:
    G is a super group
```

### Why 3, not 2:
- Threshold of 2 catches too many mid-level groups. "All - Tombstones" contains "All - Small Tombstones" and "All - Large Tombstones" — that's 2, but it feels like a regular group, not a super group.
- Threshold of 3 catches the genuine display-wide or section-wide groups: "All - Pixels," "All - Left Yard," "All - Right Yard," "All - No Matrix."
- This threshold can be tuned later based on real user data.

### Additional filter — minimum model count:
To avoid edge cases, super groups must also contain **20+ models** (or 50%+ of total models, whichever is smaller). This prevents a group of 6 models that happens to subsume 3 tiny 2-model groups from being classified as "super."

### Exclusion pattern detection:
Groups following the "All - No [X]" naming pattern (exclusion groups) should still be classified as super groups if they meet the threshold — they're valid mapping targets that sequencers use.

---

## UI Treatment

### Separate Section in Groups & Models Phase

Super groups appear in their own section above regular groups:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  DISPLAY-WIDE GROUPS (4)                                                │
│  These groups span your entire display or large sections.               │
│  Mapping here applies broad effects across many models.                 │
│                                                                         │
│  🔗 All - Pixels - GRP  (165)  ·  412 fx  ·  → ALL PIXELS        ✕    │
│     All - Left Yard - GRP  (78)  ·  206 fx                        ✕    │
│     All - Right Yard - GRP  (87)  ·  198 fx                       ✕    │
│     All - No Matrix - GRP  (140)  ·  380 fx                       ✕    │
│                                                                         │
│  💡 Super groups contain models from many other groups.                 │
│     Mapping a super group adds effects that layer on top of             │
│     individual group/model mappings.                                    │
└──────────────────────────────────────────────────────────────────────────┘

── GROUPS & MODELS ──────────────────────────────────────────────────────

  All - Arches - GRP  (8)  ·  88 fx  ·  → VLS GROUP - ARCHES        ✕
  All - Bats - GRP  (7)  ·  56 fx                                    ✕
  All - Eaves - GRP  (26)  ·  → GROUP - PERM LIGHTS                  ✕
  All - Tombstones - GRP  (4)  ·  32 fx                              ✕
  ...
```

### Section Behavior:
- **Display-Wide Groups** section is collapsible, expanded by default
- Brief helper text explains what these are and how they layer
- Same row format as regular groups — effect count, mapping destination, ✕ to dismiss
- Same right-panel interaction for mapping suggestions
- Sorted alphabetically within the section

### Quick Filter Pill Addition:
Add a "Display-Wide" pill to the filter row:

```
[All (340)]  [Display-Wide (4)]  [Groups (25)]  [Models (242)]  [Submodels (88)]
```

---

## How Super Groups Interact with Regular Mappings

This is the key conceptual piece users need to understand:

**Super group mappings LAYER on top of individual mappings.** In xLights, effects stack — if "All - Pixels" has a rainbow chase and "Arch 1" has a twinkle, Arch 1 gets both. Mod:IQ should preserve this behavior.

In practice this means:
- Mapping "All - Pixels" → source "ALL PIXELS" does NOT conflict with mapping "All - Arches" → source "VLS GROUP - ARCHES"
- Both mappings are valid and both carry effects that will be applied
- The Finalize phase should show models with their complete mapping chain: direct mapping + any super group mappings that include them

### Finalize Phase — Super Group Indicator

In the Finalize grid, models that receive effects from super group mappings get a subtle indicator:

```
│ Arch 1  │ [VLS GROUP - ARCHES ✕]  +2 layers  │  │ 88 │
```

- `+2 layers` means this model also inherits effects from 2 super group mappings
- Hover/click `+2 layers` shows: "Also receiving from: All - Pixels (412 fx), All - Right Yard (198 fx)"
- This is informational — users don't need to manage these individually, but they should know the effects exist

---

## Imposed Hierarchy (Mod:IQ Display Only)

Since xLights groups are flat tags but the containment relationships are real, Mod:IQ imposes a navigational hierarchy for display purposes. This hierarchy has zero impact on the exported xmap — everything explodes back to flat groups on export.

### Hierarchy Construction Algorithm

```
1. Run super group detection (above) — classify groups as super vs regular
2. For each regular group, find its "best parent":
   - Look at all super groups that fully contain this group's members
   - Pick the SMALLEST super group that fully contains it
     (most specific parent wins)
   - If no super group fully contains it, it's a top-level group
3. Build the tree:
   - Super groups are top-level containers
   - Regular groups nest under their best parent
   - Models nest under their most specific group
   - Each model appears ONCE — under its most specific regular group
```

### Example from a real layout:

```
DISPLAY-WIDE GROUPS
├─ All - Pixels - GRP (165 models, 412 fx)
│   ├─ All - Left Yard - GRP (78 models, 206 fx)
│   │   ├─ All - Tombstones - GRP (4)
│   │   │   ├─ All - Small Tombstones - GRP (2)
│   │   │   │   ├─ Tombstone - Small 1
│   │   │   │   └─ Tombstone - Small 2
│   │   │   ├─ Tombstone - Large 1
│   │   │   └─ Tombstone - Large 2
│   │   ├─ All - Spiders - GRP (6)
│   │   └─ ...
│   ├─ All - Right Yard - GRP (87 models, 198 fx)
│   │   ├─ All - Arches - GRP (8)
│   │   └─ ...
│   └─ (models not in any sub-group)
├─ All - No Matrix - GRP (140 models, 380 fx)
└─ All - No Tree - GRP (135 models, 350 fx)

GROUPS & MODELS (not inside any super group)
├─ (any groups that aren't contained by a super group)
└─ Ungrouped individual models
```

### Key Rule: Each Model Appears Once

A model is placed under its **most specific group** — the smallest group it belongs to. "Tombstone - Small 1" belongs to All-Pixels, All-Left Yard, All-Tombstones, and All-Small Tombstones. It appears ONLY under All-Small Tombstones. The parent chain is navigational context, not duplication.

## View Toggle: Hierarchy vs Flat

Add a view toggle to the Groups & Models phase header, next to the perspective/filter controls:

```
View:  [🌳 Hierarchy]  [☰ Flat]
```

### Hierarchy View (default for layouts with detected super groups)
- Imposed tree structure as described above
- Super groups as top-level containers, regular groups nested within, models at leaf level
- Each model appears once under its most specific group
- Drill down by expanding levels
- Best for: understanding relationships, navigating large layouts, mapping at multiple group levels

### Flat View (default for layouts with no detected super groups)
- All groups listed alphabetically as peers — no nesting
- Super groups, regular groups, and ungrouped models in one flat list
- Super groups get a "Display-Wide" badge but no special section or nesting
- Expanding any group shows its direct member models (may duplicate models across groups)
- Best for: fast mapping, users who already know their layout, small-to-medium layouts

### Behavior:
- Both views operate on the same mapping data — switching preserves all state
- If no super groups are detected, Flat is the default and Hierarchy is still available (it just won't have super group containers — regular groups become the top level)
- User's last-used view preference is saved
- The same toggle appears in the Finalize grid as well — Hierarchy shows the imposed tree, Flat shows all groups/models as a flat grid

### Duplication Handling in Flat View
In Flat view, expanding "All - Pixels" shows 165 models and expanding "All - Arches" shows 8 of those same models. This is intentional — Flat view trades "each model once" for "see exactly what's in each group." 

To prevent confusion:
- Models that appear under multiple expanded groups get a subtle "also in: All - Pixels, All - Left Yard" breadcrumb in muted text
- Mapping a model in one location maps it everywhere — the state is shared, only the display is duplicated
- Collapsed groups show their mapping status regardless of whether children are duplicated elsewhere

### Handling Overlapping Super Groups

"All - No Matrix" and "All - No Tree" overlap with "All - Pixels" — they share most models but exclude different subsets. These exclusion groups can't nest cleanly inside "All - Pixels" because they're not strict subsets.

**Solution:** Overlapping super groups are **peers at the top level**, not nested inside each other. The hierarchy only nests when group A is a strict subset of group B. Overlapping groups (where neither is a full subset of the other) stay as siblings.

```
DISPLAY-WIDE GROUPS (peers, not nested)
├─ All - Pixels - GRP (165)
├─ All - No Matrix - GRP (140)    ← overlaps with All-Pixels but isn't a subset
├─ All - No Tree - GRP (135)      ← same
```

Each regular group nests under the most specific super group that fully contains it. If a regular group is fully contained by multiple super groups, pick the smallest one.

### "Where is Tombstone - Small 1?"

Since models appear once, users might wonder where a specific model is. The search bar solves this — search "Tombstone" and the result shows the model with its breadcrumb path:

```
Tombstone - Small 1
└─ All - Small Tombstones → All - Tombstones → All - Left Yard → All - Pixels
```

Clicking the search result scrolls to and highlights the model in its tree position, expanding parent groups as needed.

---

## Edge Cases

**Layout with no super groups:** If no groups meet the threshold, the Display-Wide section simply doesn't appear. No empty state needed.

**Layout with many super groups (10+):** Some power users have lots of exclusion/inclusion groups. The section is collapsible, and the filter pill helps. If it feels noisy, we can add a secondary collapse within the section later.

**A model in 10+ groups:** This is normal in xLights. The super group classification only affects how GROUPS are displayed, not models. A model doesn't appear 10 times — it appears once under its most specific regular group, and the super group mappings layer on top.

**Source sequence also has super groups:** The same detection logic applies to the source sequence's groups. The right-panel suggestion list should show source super groups and regular groups, with super groups labeled.
