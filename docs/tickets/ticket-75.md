# Ticket 75 — Separate Skip (Dismiss) from Unlink (Remove Mapping)

---

## The Problem

The ✕ button currently does two different things depending on context:
- On an unmapped item: skips/dismisses it (removes from metrics)
- On a mapped item: removes the mapping AND sometimes skips it

This is confusing. Users don't know if clicking ✕ will break their mapping or hide the item entirely. Two distinct actions need two distinct controls.

---

## Two Actions, Two Icons

### ✕ = Skip (Dismiss)
- **Meaning:** "I don't care about this item — remove it from my workflow and metrics"
- **Position:** Right edge of the row (where it is now)
- **Behavior:** Moves the item to the Ignored section (Ticket 63). Removes from coverage calculations. If the item was mapped, the mapping is also cleared.
- **Available on:** Every row, mapped or unmapped
- **Icon:** ✕ (same as current)

### 🔗‍💥 = Unlink (Remove Mapping)
- **Meaning:** "Break this mapping — I want to reassign this item, not hide it"
- **Position:** Between the source name and destination name — visually in the middle of the mapping relationship
- **Behavior:** Clears the mapping. Item stays visible in the list as unmapped. Metrics update (mapped count decreases, unmapped increases). Item does NOT move to Ignored.
- **Available on:** Only mapped rows (unmapped rows have nothing to unlink)
- **Icon:** Lucide `Unlink2` (two separated chain links with a gap — cleaner version of Unlink). Pairs with `Link2` used for auto-match badges. Rendered small (14-16px), muted until hover.
- **Import:** `import { Unlink2 } from "lucide-react"`

---

## Visual Layout

### Mapped row:
```
│ ☐  All - Arches (8) · 88 fx     [VLS GROUP - ARCHES]  🔓  ✕ │
                                                          ↑    ↑
                                                       unlink  skip
```

- The unlink icon (🔓 / broken link) sits between the source pill and the ✕
- Muted/dim by default, visible on row hover
- Tooltip on hover: "Remove mapping"
- Click: clears the mapping, row becomes unmapped, source pill disappears, `+ Assign` appears

### Unmapped row:
```
│ ☐  All - Bats (7) · 0 fx        + Assign                  ✕ │
                                                               ↑
                                                              skip
```

- No unlink icon (nothing to unlink)
- ✕ only — skips/dismisses the item

### On the source pill itself (alternative placement):
If the middle position feels too cramped, the unlink icon can live ON the source pill as a hover action:

```
│ ☐  All - Arches (8) · 88 fx     [VLS GROUP - ARCHES 🔓]   ✕ │
```

- Hover over the pill → 🔓 appears inside/beside the pill
- Click 🔓 → mapping cleared
- Click ✕ → item dismissed entirely
- This keeps the unlink action visually tied to the mapping itself

---

## Behavior in Each Phase

### Groups & Models (left panel):
- **✕** on any row: skip the group/model (remove from workflow)
- **🔓** on mapped row: unlink the mapping, item stays as unmapped
- On the right panel "Currently Mapped To" card: **[Remove Mapping]** button does the same as 🔓 (unlink only, don't skip)

### Finalize Grid:
- **✕** on any row: skip the group/model (moves to Ignored section per Ticket 63)
- **🔓** on mapped row: unlink the mapping, row stays in grid as unmapped
- On source pills in the Mapped To column: hover pill → 🔓 appears → click to unlink that specific mapping

### Auto-Match Banner:
- **✕** on auto-matched row: unlink that specific auto-match (don't dismiss the item entirely — it just goes back to unmapped for manual mapping). This is the one exception where ✕ means unlink, not skip — OR we change the auto-match row to use 🔓 instead of ✕ for consistency.

**Recommendation:** Use 🔓 on auto-match rows too. The ✕ on auto-match means "reject this match" which is really an unlink. Reserve ✕ exclusively for skip/dismiss everywhere.

---

## Tooltip & Confirmation

### Unlink (🔓):
- Tooltip: "Remove mapping"
- No confirmation needed — action is easily reversible (just reassign)
- Brief visual feedback: pill fades out, row border changes green → amber

### Skip (✕):
- Tooltip: "Skip — remove from workflow"
- If the item is mapped: show a brief confirmation tooltip "This will remove the mapping and skip this item. [Confirm] [Cancel]" — since skip is more destructive (removes from metrics AND clears mapping)
- If unmapped: no confirmation needed
- 5-second undo toast after skipping (same as Ticket 63)

---

## Summary

| Action | Icon | Position | Meaning | Result |
|---|---|---|---|---|
| Skip | ✕ | Right edge | "Don't care" | Item → Ignored section, removed from metrics |
| Unlink | 🔓 | On/near source pill | "Wrong match" | Mapping cleared, item stays as unmapped |
