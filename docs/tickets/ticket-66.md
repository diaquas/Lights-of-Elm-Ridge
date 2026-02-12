# Ticket 66 — Finalize: Default Sort/Filter & Stable Row Behavior

---

## The Problem

When sorted by "Unmapped First," mapping an item causes it to vanish from view — it drops to the mapped section below. This is jarring, breaks context, and makes multi-mapping (adding 2–3 sources to one model) nearly impossible because the row disappears after the first assignment.

---

## Solution: Stable Sort with Visual State Changes

The grid sort order is **locked once rendered**. Mapping an item changes its visual state but does NOT reorder the list. Rows stay where they are until the user explicitly re-sorts.

### How It Works

1. Page loads → sort is applied → rows render in that order
2. User maps "Arch 3" → row stays in place, left border changes amber → green, pill appears in Mapped To column
3. User can immediately click `[+ Add]` for a second source, or move to the next row below
4. The row NEVER jumps away mid-workflow
5. If the user wants a fresh sort (e.g., to push all remaining unmapped items to the top), they click the sort dropdown and re-select — or click a "Re-sort" refresh icon next to the dropdown

### Visual Feedback (Row Stays, State Changes)

When a row gets mapped:
- Left border: amber → green (instant)
- Mapped To column: `+ Assign` → source pill appears (instant)
- Brief subtle row flash (green, 300ms fade) to confirm the action
- Row does NOT move

When a row gets unmapped (source removed):
- Left border: green → amber
- Pill disappears, `+ Assign` returns
- Row does NOT move

### Re-Sort Trigger

A small refresh icon next to the sort dropdown:

```
Sort: [Unmapped First ▾] 🔄
```

- Clicking 🔄 re-applies the current sort, shuffling rows to reflect current state
- The sort dropdown selection itself also re-sorts on change
- Keyboard shortcut: `R` to re-sort (in Focus Mode)

---

## Default Sort

**Groups alphabetical (A→Z), models alphabetical within groups.**

NOT "Unmapped First" as default. Here's why:

- Alphabetical is the most stable, predictable order — users build spatial memory of where things are
- xLights groups already provide natural chunking — "All - Arches" is always at the top, "Windows" is always at the bottom
- Unmapped items are visually obvious via amber left border — you can scan for them without needing them sorted to the top
- Users who want unmapped-first can select it from the dropdown, with the understanding that the sort is stable until re-triggered

### Default Sort Order (Hard-Coded Hierarchy)

Three fixed tiers, then user-controlled sort within:

```
TIER 1 (fixed): Ungrouped models first, then xLights Groups alphabetical
TIER 2 (fixed): Within each group — models alphabetical
TIER 3 (user sort): Applies WITHIN the above structure
```

Wait — actually, rethinking Tier 1. Ungrouped models at top feels wrong if there are only 2 of them and 30 groups. Let me reconsider:

```
TIER 1 (fixed): xLights Groups alphabetical, then Ungrouped at bottom
TIER 2 (fixed): Within each group — models alphabetical  
TIER 3 (user sort override): "Unmapped First" reorders within the above tiers
```

**The "Unmapped First" sort option reorders WITHIN groups, not across them.** So "All - Arches" stays in its alphabetical position, but unmapped arches rise to the top within that group. This is the best of both worlds — spatial stability at the group level, priority sorting at the model level.

---

## Default Filter

**All** — show everything. No filter applied by default.

The quick filter pills `[All] [Groups] [Models] [Submodels]` default to All.
The status dropdown defaults to All.

Rationale: filtering on load hides data. Users should see the full picture first, then narrow down.

---

## What Shows in the Default View

With xLights groups as the grouping source (Ticket 65), the default collapsed view shows:

```
│ ▸ All - Arches (8)         · 6 mapped · 2 unmapped                    │
│ ▸ All - Bats (7)           · 0 mapped · 7 unmapped                    │
│ ▸ All - Eaves (26)         · 5 mapped · 21 unmapped                   │
│ ▸ All - Mega Trees (5)     · 5 mapped · 0 unmapped              ✓     │
│ ▸ All - Mini Pumpkins (8)  · 0 mapped · 8 unmapped                    │
│ ▸ All - Windows (12)       · 8 mapped · 4 unmapped                    │
│ ── Ungrouped ──────────────────────────────────────────────────────    │
│   Driveway Left             · unmapped                                 │
│   Random Prop               · mapped                                   │
```

This is the entire layout at a glance — maybe 10-15 rows on screen. Users expand a group to work its children, collapse it when done, move to the next.

---

## Sort Options (Updated)

| Option | Behavior |
|---|---|
| **Name A→Z** (default) | Groups alphabetical, models alphabetical within groups |
| **Name Z→A** | Reverse of above |
| **Unmapped First** | Within each group, unmapped models sort above mapped. Groups themselves stay alphabetical. |
| **Match Confidence High→Low** | Within each group, models with highest AI suggestion confidence sort first |
| **Effect Count High→Low** | Within each group, models with highest assigned FX sort first |
| **Effect Count Low→High** | Inverse — find low-value items to ignore |

All sort options respect the group hierarchy — they reorder within groups, never break models out of their parent group.

---

## Summary

- **Rows never move on map/unmap** — sort is stable until user re-triggers
- **Default sort: alphabetical** — predictable, stable spatial memory
- **"Unmapped First" sorts within groups**, not across them
- **Default filter: All** — no hidden data on load
- **Re-sort button** (🔄) next to sort dropdown for manual refresh
- **Default view: all groups collapsed** — entire layout visible in ~10-15 rows
