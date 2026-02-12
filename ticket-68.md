# Ticket 68 — Groups & Models Mapping Screen Improvements

---

## 1. Already-Mapped Items — Interactive, Not Dead

Currently: clicking an already-mapped group/model does nothing. Cursor is a standard pointer. Confusing — it looks interactive but isn't.

Fix:
- **Hover cursor**: pointer/hand on ALL items, mapped or not
- **Click behavior for mapped items**: opens the right destination panel showing the current mapping with options to change it (see #2 below)
- Mapped items should feel just as interactive as unmapped items — the only difference is they already have an assignment

---

## 2. Right Panel for Mapped Items

When clicking an already-mapped group/model, the right destination panel shows:

**Current Mapping (prominent):**
```
┌──────────────────────────────────────────────────────────┐
│  ✓ CURRENTLY MAPPED TO                                   │
│                                                          │
│  VLS GROUP - ARCHES                                      │
│  Group  ·  88 fx  ·  100%                                │
│                                                          │
│  [Swap Source]                         [Remove Mapping]  │
└──────────────────────────────────────────────────────────┘
```

- Current match displayed in larger/bolder text with green accent — unmistakably "this is your mapping"
- **[Remove Mapping]** button — clears the mapping, item goes back to unmapped
- **[Swap Source]** button — reveals the standard suggestion list below so user can pick a different match
- **[+ Add Another Source]** link below — for many-to-one mapping (same model receives from 2+ sources)

Below the current mapping, show the standard suggestion list (dimmed/secondary) so users can compare alternatives without removing the current mapping first.

---

## 3. Fix: Pixel Count, Not Channel Count

Rows currently show `665ch · Fence`. Should show pixel count as it was before:

```
7 fx  Fence Panel 1  ·  665px  ·  Fence
```

Change `ch` back to `px` everywhere in the mapping phases.

---

## 4. Effect Count on Group Headers

Group headers are missing the effect count badge. Add it back:

```
GRP  All - Fence - GRP  (7)  ·  48 fx  ·  → VLS GROUP - ALL MATRIX    ✕
```

The effect count at the group level should be the sum of effects across all child models in that group.

---

## 5. Remove Plus Sign from Effect Count

Change `+7 fx` to `7 fx` everywhere. There are no negative effect counts — the plus sign adds no information and adds visual noise.

---

## 6. Right-Align Destination Name

The green destination text (e.g., "→ VLS GROUP - ARCHES") is currently left-aligned inline with the source metadata. Move it to right-aligned, near the ✕ button:

```
GRP  All - Arches - GRP  (8)  ·  88 fx           → VLS GROUP - ARCHES    ✕
```

- Destination name right-aligned with a few pixels of breathing room before the ✕
- Creates a clean two-column visual: source info on left, destination on right
- Consistent with the Finalize grid layout (My Display left, Mapped To right)

---

## 7. Unlock Sort — User-Controlled

Currently hard-locked to alphabetical. Unlock the sort dropdown with these options:

- **Name A→Z** (default)
- **Name Z→A**
- **Effects High→Low** — prioritize high-content items
- **Effects Low→High**
- **Unmapped First** — unmapped items sort above mapped within groups (stable sort per Ticket 66)
- **Match Confidence High→Low** — best suggestions first

Sort applies within the stable group hierarchy (groups stay in position, children sort within).

---

## 8. Destination Panel Sort — Linked by Default

The right destination panel gets its own sort dropdown with the same options.

**Default behavior:** destination panel sort matches whatever the source panel sort is set to.

**Override behavior:** user can change the destination sort independently. Changing destination sort does NOT change source sort. But changing source sort DOES update destination sort (one-directional link).

- Source sort change → destination sort follows
- Destination sort change → source sort stays

If the user has manually changed the destination sort, the link is broken — source changes no longer propagate until the user resets.

---

## 9. Additional Recommendations

### Expand/Collapse All
Add utility links above the list:

```
[Expand All]  [Collapse All]
```

Useful when a user wants to see all individual models at once or collapse everything back to group-level view.

### Group-Level Quick Actions
When hovering on a group header, show inline actions beyond just ✕:

```
GRP  All - Fence - GRP  (7)  ·  48 fx  ·  → ALL MATRIX   [Map Children]  ✕
```

- **[Map Children]** — expands the group and enters a sequential mapping mode where clicking a suggestion maps the next unmapped child automatically (top-to-bottom). Fast path for "I want to map these 7 fence panels one by one quickly."

### Empty State for Right Panel
Current: "Select a group or model to see suggestions" with a chevron icon. This is fine but could be more helpful:

```
Select a group or model to see mapping suggestions

💡 Tip: Already-mapped items can be clicked to 
   review, swap, or add additional sources
```

Reinforces that mapped items are clickable — addresses the confusion from issue #1.
