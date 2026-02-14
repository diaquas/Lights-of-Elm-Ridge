# Ticket 76 — Model & Group Card Redesign

---

## Goal

These cards are the core interaction surface of Mod:IQ. Every pixel needs to earn its place. Strip to essentials, differentiate collapsed vs focus mode, and make the mapped/unmapped state instantly scannable.

---

## Remove from All Cards

- **Model type** (`Fence`, `Pumpkin`, etc.) — redundant when you're inside the group header that already says "All - Fence"
- **Plus sign** on effect count — no negatives exist, just show `7 fx`
- **Pixel count** (`665px`) — move to focus mode only (see below)
- **Star/favorite** — is this being used? If not, remove entirely. If yes, move to row hover action.

---

## Standard View Cards (Collapsed — Default)

Maximum density. One line per model. Group headers slightly taller.

### Group Header Row:
```
> GRP  All - Fence (7)  ·  110 fx  ·  5 mapped     🔗→ VLS GROUP - ALL MATRIX  65%  🔓 ✕
```

- Chevron (expand/collapse)
- GRP badge (color-coded by mapping status: green = mapped, amber = unmapped)
- Group name + count
- Sum effect count for the group
- Mapped count summary (or "7 unmapped" in amber if none mapped)
- Right side: destination name + confidence + unlink + skip
- If unmapped: right side shows `+ Assign` instead of destination

### Model Row (inside expanded group):
```
  7 fx  Fence Panel 1           🔗→ MATRIX SPINNER LEFT  54%  🔓 ✕
```

That's it. Five elements:

| Element | Purpose | Position |
|---|---|---|
| Effect count | Is this source worth it? | Left, compact badge |
| Model name | Which model? | Left of center |
| Auto-match badge (🔗) | Tool did this vs manual | Before destination, only if auto-matched |
| Destination + confidence | What's it mapped to and how sure? | Right-aligned |
| Unlink + Skip | Actions | Far right |

If unmapped:
```
  0 fx  Fence Panel 4                                        + Assign  ✕
```

If covered by group:
```
  0 fx  Fence Panel 4                                    covered by group
```
Muted/dimmed text, no actions — the group mapping handles it.

### Row Height Target:
- Group headers: **32px**
- Model rows: **28px**
- Compared to current ~48-56px, this roughly doubles visible density

---

## Focus Mode Cards (Expanded — More Detail)

In Focus Mode (Ticket 64), we have more vertical space to work with since the nav/header is hidden. Show slightly more metadata without adding a second line.

### Group Header Row (Focus):
```
> GRP  All - Fence (7)  ·  110 fx  ·  4,655px  ·  5 mapped  ·  2 covered     🔗→ VLS GROUP - ALL MATRIX  65%  🔓 ✕
```

Additions vs standard:
- **Total pixel count** for the group (sum of children)
- **Covered count** — how many children are covered by the group-level mapping

### Model Row (Focus):
```
  7 fx  Fence Panel 1  ·  665px           🔗→ MATRIX SPINNER LEFT  54%  🔓 ✕
```

Additions vs standard:
- **Pixel count** — visible in focus mode since there's room

### Row Height Target (Focus):
- Group headers: **36px**
- Model rows: **32px**
- Slightly more breathing room than standard, still much tighter than current

---

## Color System for Instant Scanning

Left border color on every row (from Ticket 64) replaces the need to read status text:

| State | Left Border | GRP Badge Color | Visual Feel |
|---|---|---|---|
| Mapped (manual) | Green | Green | Done, solid |
| Mapped (auto-match) | Green | Green + 🔗 | Done, tool-assisted |
| Unmapped | Amber | Amber | Needs attention |
| Covered by group | Dim gray | — | Handled, ignore |
| Skipped/Ignored | — | — | Not visible (in Ignored section) |

### Confidence Color on Percentage Badge:
- **90-100%**: Green badge — strong match
- **70-89%**: Yellow/amber badge — decent, worth reviewing
- **Below 70%**: Red/orange badge — needs review

---

## "Covered by Group" State

When a group has effects mapped, its child models that don't have individual mappings show as "covered":

```
  7 fx  Fence Panel 1           🔗→ MATRIX SPINNER LEFT  54%  🔓 ✕
  7 fx  Fence Panel 2           🔗→ MATRIX SPINNER LEFT  54%  🔓 ✕
  0 fx  Fence Panel 4                                    covered by group
  0 fx  Fence Panel 5                                    covered by group
```

- Muted/dimmed text (50% opacity)
- No actions (no unlink, no skip — the group handles them)
- "covered by group" in italic muted text, right-aligned
- These rows don't count as "unmapped" in metrics (per Ticket 73)
- Clicking a covered row opens the right panel showing the group-level mapping and offering to override with an individual mapping if desired

---

## Destination Text Behavior

### Mapped destination (right side):
- Truncate long names with ellipsis: `→ VLS GROUP - ALL MAT...`
- Full name on hover tooltip
- Confidence badge is always visible (color-coded)

### Unmapped (right side):
- Show `+ Assign` as a muted, clickable link
- On hover: link brightens, cursor becomes pointer
- On click: opens right panel with suggestions

---

## Summary: What Changed

| Element | Before | After (Standard) | After (Focus) |
|---|---|---|---|
| Model type | Shown | Removed | Removed |
| Pixel count | Shown | Removed | Shown |
| Plus sign on FX | `+7 fx` | `7 fx` | `7 fx` |
| Star/favorite | Shown | Removed (or hover) | Removed (or hover) |
| Row height (model) | ~48-56px | 28px | 32px |
| Row height (group) | ~48-56px | 32px | 36px |
| Lines per card | 2-3 | 1 | 1 |
