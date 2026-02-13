# Ticket 73 — Finalize Phase: Critical Fixes

---

## 1. Smart "Unmapped" Logic — Group Coverage Overrides Individual Status

Stop showing individual models as "unmapped" when their parent group already has effects or when all source models are accounted for.

### Rules:
**Individual models inside a group show as "unmapped" ONLY if:**
- A) The parent group has NO effects mapped to it, AND
- B) There are still source-side models that haven't been mapped anywhere

**Once either condition is satisfied, individual "unmapped" indicators go away:**
- If the group has effects mapped → all children are covered by the group-level mapping. Don't nag about individual models.
- If all source models are mapped somewhere → there's nothing left to assign. Showing "26 unmapped eaves" when every source model is already spoken for is meaningless noise.

### Implementation:
- Track source model allocation: when all source models have at least one destination, set a flag `all_sources_allocated = true`
- For each group, check if it has a group-level mapping with effects > 0
- If either condition is true for a model's context, suppress the unmapped indicator on individual models within that group
- The coverage bars should also respect this — models covered by group-level mappings count as "covered" in the Display Coverage metric
- The Unmapped filter pill count should decrease accordingly

---

## 2. Group-Level Mappings Visible and Editable in Finalize

Groups MUST appear as first-class rows in the Finalize grid — not just as collapsible containers for models.

### What's missing:
- Can't see which groups have effects vs which are dark
- Can't assign a source to a group on the Finalize screen
- Can't see how many groups are unmapped at a glance

### Fix:
Each group row in the Finalize grid is fully interactive:

```
│ ▸ All - Arches - GRP (8)  ·  88 fx   │ [VLS GROUP - ARCHES ✕]          │ 88  │ ✓  │
│ ▸ All - Bats - GRP (7)    ·  0 fx    │ + Assign                         │     │ ⚠  │
│ ▸ All - Eaves - GRP (26)  ·  0 fx    │ + Assign                         │     │ ⚠  │
```

- Groups with no effects mapped show `+ Assign` and amber status — these are the "dark" groups
- Groups with effects mapped show the source pill and green status
- Click `+ Assign` → same inline searchable dropdown as models, showing source groups and models
- The primary workflow on Finalize is: **find dark groups, give them a source**
- Group-level effect count shows the sum from the group's own mapping (not the sum of children's mappings)

---

## 3. One-to-One Mapping: One Source per Destination

The destination side (user's display) can only receive from ONE source. Remove multi-source-to-single-destination everywhere.

### Rule:
- **One source → many destinations**: ALLOWED (same source can feed multiple display models)
- **Many sources → one destination**: NOT ALLOWED (each display model/group gets exactly one source)

### Fixes needed:
- Remove `[+ Add Another Source]` from all mapping UIs
- Remove multi-pill display in the Mapped To column (no stacking of multiple sources on one row)
- Auto-match algorithm must not assign multiple sources to a single destination
- If the auto-match engine previously created multi-source mappings (as seen with Office Left, Office Peak having several mapped elements), fix the algorithm to only keep the highest-confidence single match per destination
- The right panel for mapped items shows current mapping + Swap/Remove — no "Add Another" option
- In the source direction, the grid still allows one source to appear as the mapping for multiple destinations (this is fine and expected)

### What happened with the phantom multi-mappings:
The auto-match algorithm appears to have assigned multiple sources to individual destination models (Office Left showing several mapped sources). This should not happen. The auto-match algorithm must enforce one-to-one on the destination side:
- Each destination model gets at most 1 source
- If multiple sources are strong matches for the same destination, pick the highest confidence match
- The losing sources remain available for other destinations

---

## 4. Auto-Match Visibility — All Matches Must Show in Groups & Models

Some auto-matches are not appearing on the Groups & Models screen — possibly only matches above a certain threshold are being displayed there, while lower-confidence matches (or matches made by the optimization engine) only appear later in Finalize.

### Fix:
- ALL auto-matches, regardless of confidence level, must be visible in the Groups & Models phase
- Every match the algorithm makes should have the green Link2 badge on the Groups & Models screen
- If a group was auto-matched, it shows as mapped with the Link2 badge
- If individual models within a group were auto-matched, those show when the group is expanded
- No matches should "appear for the first time" in Finalize — that's confusing and makes users distrust the tool

---

## 5. Finalize Default View — Unmapped Groups at Top

Update the Finalize default sort to surface the actual work:

### Default sort order:
1. **Unmapped groups first** (these are the "dark" groups that need attention — the whole point of Finalize)
2. **Mapped groups** (for review/verification)
3. Within each section, alphabetical by name

This is a departure from Ticket 66's "always alphabetical" default — for Finalize specifically, unmapped-first is the right default because the entire purpose of this screen is to finish mapping the dark items. The stable sort rules still apply (rows don't move on status change, re-sort button to refresh).

### Finalize should feel like a checklist:
```
── NEEDS MAPPING (6 groups) ────────────────────────────────────────

  ⚠  All - Bats - GRP (7)       ·  0 fx    │ + Assign               │
  ⚠  All - Eaves - GRP (26)     ·  0 fx    │ + Assign               │
  ⚠  All - Fence - GRP (7)      ·  0 fx    │ + Assign               │
  ⚠  All - Mini Pumpkins (8)    ·  0 fx    │ + Assign               │
  ⚠  All - Mini Trees (8)       ·  0 fx    │ + Assign               │
  ⚠  All - Spinners (6)         ·  0 fx    │ + Assign               │

── MAPPED (19 groups) ──────────────────────────────────────────────

  ✓  All - Arches - GRP (8)     ·  88 fx   │ [VLS GROUP - ARCHES ✕] │
  ✓  All - House Outlines (46)  ·  83 fx   │ [VLS GROUP - HOUSE ✕]  │
  ✓  All - Pixels (148)         · 139 fx   │ [ALL WITH ARCHES ✕]    │
  ...
```

Users land here, see 6 groups to fix, work top to bottom, done. That's the workflow.
