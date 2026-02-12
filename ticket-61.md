# Ticket 61 — Finalize Phase: UI Fixes & Enhancements

---

## 1. Remove Duplicate Coverage Bars

The Display Coverage and Sequence Coverage bars below the Back/Continue nav are duplicates of the Models Mapped and Effects Covered bars in the persistent stepper header above. Remove the lower set entirely — the header bars are always visible and sufficient.

---

## 2. Model Grouping (Collapsed by Default)

Apply the same smart grouping logic from the Groups/Models mapping phases. Models with the same base name (differing only by a trailing number) roll into a single expandable group row.

```
│  ☐   │ ▸ Eaves (26)          │ 5 mapped · 21 unmapped  │        │       │ ⚠      │
```

Expanding shows individual models:

```
│  ☐   │ ▾ Eaves (26)          │ 5 mapped · 21 unmapped  │        │       │ ⚠      │
│  ☐   │   Eave 1 - Office Left│ [DMX Wireless Brace 💡▾]│  60%   │ 78    │ 💡     │
│  ☐   │   Eave 2 - Office Peak│ [DMX Wireless Brace 💡▾]│  60%   │ 78    │ 💡     │
│  ☐   │   Eave 5 - Entrance   │ [Choose a source...   ▾]│        │       │ ⚠      │
│  ...                                                                              │
```

- **Default state: collapsed** — keeps the list manageable
- Group row shows summary: count, how many mapped vs unmapped
- Group-level checkbox selects all children for batch operations
- Group-level status: ✓ if all mapped, ⚠ if any unmapped, mixed shows count
- Same visual hierarchy as Ticket 55 (bordered card for groups, indented children)

---

## 3. Smart Auto-Complete (Sequential Pattern Detection)

When a user maps a model that's part of a numbered sequence, detect the pattern and offer to auto-complete the rest.

**Trigger:** User maps `Mini Pumpkin 1` → `Boscoyo Spider 1`, and there are remaining unmapped models `Mini Pumpkin 2` through `Mini Pumpkin 8` with corresponding available sources `Boscoyo Spider 2` through `Boscoyo Spider 8`.

**UI:** Inline toast/banner appears at the top of the group or below the row:

```
┌──────────────────────────────────────────────────────────────────────┐
│  💡 Auto-complete: Map Mini Pumpkin 2–8 → Boscoyo Spider 2–8?       │
│  [Apply (7 mappings)]                              [Dismiss]        │
└──────────────────────────────────────────────────────────────────────┘
```

**Rules:**
- Detect numbered sequences on BOTH sides (source and destination)
- Numbers must be sequential (1→1, 2→2, etc.) — don't suggest if numbering doesn't line up
- Only suggest for unmapped items — skip any that are already mapped to something else
- If source count < destination count (e.g., 5 spiders but 8 pumpkins), only suggest for the 5 that match
- Show exact count of mappings that will be created
- One-click apply — all mappings created at once, coverage bar updates
- Dismiss hides the suggestion for this group (don't re-show unless user unmaps and remaps)
- This is the same sequential matching logic already in the Groups/Models phases — reuse that

---

## 4. Fix Source Tray (Bottom Dock)

The source model bar at the bottom of Card View is currently non-functional — users can see source chips but can't interact with them.

**Fix:** Make it drag-and-drop as specced in Ticket 58:

- Source chips in the tray are **draggable** — pick up a chip and drop it onto any model card (Card View) or table row (Grid View)
- On drag start: chip lifts with a subtle shadow, cursor changes to grabbing
- Valid drop targets highlight on hover (model cards/rows that can accept a source)
- On drop: mapping is created, coverage bar updates, drop target flashes green confirmation
- If drag-and-drop is not yet implemented, **hide the source tray entirely** until it works — a visible but non-functional UI element is worse than no element

Additionally, ensure the tray is:
- Searchable (search bar within the tray)
- Horizontally scrollable
- Collapsible (minimize button to reclaim vertical space)
- Showing effect count on each chip
