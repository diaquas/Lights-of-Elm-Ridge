# Ticket 80 — Fix Mapping Panel States, Covered-by-Group Logic & Suggestion Hierarchy

**Priority:** P0 — These are active user confusion points in production
**Depends on:** Ticket 76 (Card Redesign), Ticket 77 (Status Checkbox System)

---

## Bug 1: "Currently Mapped To" + Approve Button Contradiction

### The Problem

When a user clicks a model row (e.g., Fence Panel 1) that has an auto-match suggestion awaiting approval, the right-side detail panel shows:

```
✓ CURRENTLY MAPPED TO
  MATRIX SPINNER LEFT                    54%  [Approve]
```

This is contradictory. "Currently Mapped To" implies the mapping is confirmed and active. But the Approve button implies it's a pending suggestion that requires user action. The user doesn't know if this is done or not done.

### The Fix

The detail panel has **three distinct states** with different layouts and language:

#### State 1: Pending Suggestion (awaiting approval)

The model has an auto-match suggestion that hasn't been approved yet. Status checkbox is yellow (40-59%) or red (<40%).

```
┌──────────────────────────────────────────────────────────────┐
│  SUGGESTED MATCH                                   54%       │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  ⟳  MATRIX SPINNER LEFT                                 ││
│  │     665px · Fence · 6 layers                             ││
│  │                                          [Approve]       ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  OTHER OPTIONS                                               │
│  IC Tarantula 2 ........................ 35%                 │
│  Boscoyo Letter I-2 ................... 33%                 │
│  ...                                                         │
│                                                              │
│  BROWSE ALL (214)                                            │
│  [Search...]                                                 │
└──────────────────────────────────────────────────────────────┘
```

Key differences from current:
- Header says **"SUGGESTED MATCH"** — not "Currently Mapped To"
- Approve button is present and prominent
- Auto-match link icon (⟳) indicates this was algorithm-assigned
- Other options listed below as ranked alternatives

#### State 2: Approved / Manually Mapped

The user has approved the suggestion or manually assigned a mapping. Status checkbox is solid green.

```
┌──────────────────────────────────────────────────────────────┐
│  ✓ MAPPED TO                                       54%      │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  ⟳  MATRIX SPINNER LEFT                                 ││
│  │     665px · Fence · 6 layers                             ││
│  │                                   [Change]  [Unlink]     ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  OTHER OPTIONS                                               │
│  IC Tarantula 2 ........................ 35%                 │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

Key differences:
- Header says **"✓ MAPPED TO"** — confirmed, done
- No Approve button — replaced with **Change** (swap to different destination) and **Unlink** (remove mapping entirely)
- Green checkmark in header reinforces "this is settled"

#### State 3: Unmapped (no suggestion or suggestion rejected)

No mapping exists. Status checkbox is blue/empty.

```
┌──────────────────────────────────────────────────────────────┐
│  NOT MAPPED                                                  │
│                                                              │
│  AI SUGGESTIONS                                              │
│  IC Tarantula 2 ........................ 35%                 │
│  Boscoyo Letter I-2 ................... 33%                 │
│  Charlees Arch 3 ...................... 32%                 │
│  ...                                                         │
│                                                              │
│  BROWSE ALL (214)                                            │
│  [Search...]                                                 │
└──────────────────────────────────────────────────────────────┘
```

Key differences:
- Header says **"NOT MAPPED"**
- No top card — just a ranked list of suggestions the user can click to assign
- Clicking a suggestion assigns it and transitions to State 2

### Language Rules

| Panel Header | Meaning | Approve Visible | Change/Unlink Visible |
|---|---|---|---|
| **SUGGESTED MATCH** | Auto-match awaiting approval | Yes | No |
| **✓ MAPPED TO** | Confirmed mapping (approved or manual) | No | Yes |
| **NOT MAPPED** | No mapping exists | No | No |

**Never** use "Currently Mapped To" with an Approve button. These are mutually exclusive concepts.

---

## Bug 2: Sibling Approval Incorrectly Flipping Models to "Covered by Group"

### The Problem

In the Fireworks group:
1. Firework 1 has a red status checkbox (weak match, <40%) — clickable to approve
2. User clicks Firework 2's checkbox to approve its mapping
3. After approval, Firework 1 changes to "covered by group" — grayed out, non-interactive

This is wrong. Approving Firework 2 should have zero effect on Firework 1's status. Firework 1 had its own effects (7 fx) and its own pending match. It should remain in its previous state (weak/review/unmapped) and stay actionable.

### The Fix

**"Covered by group" is determined ONLY by these conditions:**

```
model.isCoveredByGroup = (
  model.fxCount === 0                           // No effects assigned to this model
  OR model.allEffectsInheritedFromGroup === true // All its effects come from group-level
)
```

**"Covered by group" is NOT affected by:**
- Approving a sibling model
- Approving the parent group
- Any action on any other model in the group

**The status is computed once** when the data loads (based on effect assignments in the source sequence) and **does not change** based on user actions in the mapping UI. The only thing that changes a model's status is direct action on that model: approving its suggestion, manually assigning it, or unlinking it.

### Implementation Check

Look for any code path where approving one model triggers a re-evaluation of sibling models' "covered by group" status. Remove it. Each model's covered status is independent and static (derived from source data, not from mapping actions).

### Edge Case: Group-Level Cascade

When a user approves a group mapping and clicks "Yes, Map Models" on the cascade prompt, child models get auto-matched individually. This does NOT set any child to "covered by group" — it sets them to their appropriate match status (strong/review/weak/unmapped) based on algorithm confidence. "Covered by group" only applies to models with 0 fx or inherited-only effects.

---

## Bug 3: Confusing "BEST" Label When Current Match Is Better

### The Problem

When viewing Firework 2's detail panel:
- Top shows: "CURRENTLY MAPPED TO: VISIONARY 300V2-2" at **40%**
- Suggestions list shows: "BEST: IC TARANTULA 2" at **35%**

The user sees a "BEST" badge on a 35% match when the current mapping is 40%. This makes no sense — "why is the best option worse than what I already have?"

The issue: "BEST" refers to "best alternative" but reads as "best overall." And the current auto-match (VISIONARY 300V2-2) was placed by the algorithm, so it IS the best match — showing it in "Currently Mapped To" while listing worse alternatives below with a "BEST" badge is contradictory.

### The Fix

**Remove the "BEST" badge entirely.** The hierarchy is structural, not labeled:

```
┌──────────────────────────────────────────────────────────────┐
│  SUGGESTED MATCH                                   40%       │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  ⟳  VISIONARY 300V2-2                                   ││
│  │     300px · Custom                                       ││
│  │                                          [Approve]       ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
│  OTHER OPTIONS                                               │
│  IC Tarantula 2 ........................ 35%                 │
│  Boscoyo 09 Letter I-2 ................ 33%                 │
│  Charlees Arch 3 ...................... 32%                 │
│  Front Door Corner Web 2 .............. 32%                 │
│                                                              │
│  BROWSE ALL (214)                                            │
│  [Search...]                                                 │
└──────────────────────────────────────────────────────────────┘
```

**Why this works:**
- The top card IS the best match — its position communicates that. No label needed.
- "Other Options" are clearly ranked alternatives (sorted by confidence descending)
- No "BEST" badge to confuse against the current suggestion
- If the user wants something different, they click an alternative or browse/search

**If the user rejects the suggestion** (clicks a different option from the list), the panel transitions to State 2 (Mapped To) with their manual choice. The rejected suggestion drops into the "Other Options" list at its natural rank position.

### Sort Order for Other Options

1. Exclude the current suggestion/mapping from the list (it's already shown above)
2. Sort remaining by confidence descending
3. Show top 5 by default with "Show more" or "Browse All" to see full list
4. Items the user has already rejected in this session can be dimmed but not hidden

---

## Summary of Changes

| Bug | Root Cause | Fix |
|---|---|---|
| "Currently Mapped To" + Approve | Conflating suggestion state with confirmed state | Three distinct panel states: SUGGESTED MATCH / ✓ MAPPED TO / NOT MAPPED |
| Sibling approval → "covered by group" | Status re-evaluation cascading to siblings | "Covered by group" is static, computed from source data only, never changed by sibling actions |
| "BEST" badge on worse match | Labeling best alternative as if it's best overall | Remove "BEST" badge, use position hierarchy instead (top card = best, list below = alternatives) |
