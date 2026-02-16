# Mod:IQ UX/UI Overhaul — Claude Code Handoff

## Overview

This document is the complete handoff package for implementing the Mod:IQ Groups & Models UX overhaul, including the new card design system, submodel group mapping step, and HD prop matching algorithm. Everything here was designed and validated through iterative mockup refinement.

---

## Files to Upload to Claude Code

### 1. Tickets (upload ALL of these)

| File | What It Covers | Priority |
|---|---|---|
| `ticket-68.md` | Groups & Models screen improvements — combined view, hierarchy, expand/collapse | **P0 — Foundation** |
| `ticket-69.md` | Remove Auto-Match as separate phase, integrate into subsequent phases | **P0 — Foundation** |
| `ticket-70.md` | Super group detection & handling (groups with 0 direct models) | **P0 — Foundation** |
| `ticket-71.md` | Groups & Models UI cleanup — filter pills, sort logic, density | **P1** |
| `ticket-73.md` | Finalize phase critical fixes | **P1** |
| `ticket-75.md` | Separate Skip (dismiss) from Unlink (remove mapping) — two distinct actions | **P1** |
| `ticket-76.md` | Model & Group card redesign — the core visual overhaul | **P0 — Core UI** |
| `ticket-77.md` | Health bar visualization, status checkbox system, cascade mapping prompts | **P0 — Core UI** |
| `ticket-78.md` | Submodel Groups as dedicated step, scoped per model, section headers | **P0 — New Feature** |
| `ticket-79.md` | Spinner monogamy — one source per destination HD prop constraint | **P0 — Algorithm** |

**Skip these** (not relevant to this implementation pass):
- `ticket-72.md` — Monetization/Stripe (separate workstream)
- `ticket-74.md` — Saved Layout Profiles (future feature)

### 2. Interactive Mockup

| File | What It Is |
|---|---|
| `modiq-card-mockup.jsx` | **THE reference mockup.** High-fidelity React component showing the exact card layout, grid alignment, color system, status checkboxes, health bars, type badges, and all interactive states. Claude Code should match this pixel-for-pixel. |

### 3. Algorithm Data

| File | What It Is |
|---|---|
| `hd_submodel_crossref.json` | Master cross-reference of 74 HD props, 1,063 canonical patterns, and which props share which submodel group patterns. Powers the auto-matching algorithm for submodel groups. |

---

## Architecture Summary for Claude Code

### Stepper Flow (Updated)

```
Upload → Map Your Display → Map Submodel Groups → Finalize → Review
                  │                    │
                  │                    └─ Only appears if HD props
                  │                       with submodel groups exist
                  │
                  └─ Formerly "Groups & Models"
                     Now includes both Groups AND Models
                     in a unified tree view
```

### Card System — CSS Grid Layout

Every row (group card, model row, submodel row) uses CSS Grid with fixed column widths for vertical alignment:

**Group rows:**
```
gridTemplateColumns: "18px 42px 16px 42px 1fr auto minmax(50px, 100px) 50px"
                      ckbx  fx   chev badge name  dest  health          actions
```

**Model rows (indented, no chevron/badge):**
```
gridTemplateColumns: "18px 42px 1fr auto minmax(50px, 100px) 50px"
                      ckbx  fx   name dest  health(empty)     actions
```

**Key rules:**
- FX badge: always 42px wide, 4-digit max visible, 5+ digits → tooltip
- Type badge: always 42px — Purple (SUPER), Blue (GRP), Teal (SUB)
- Status checkbox: 18px, visual state varies by mapping status
- Health bar: aligned column, tooltip shows breakdown + model count
- Model count: NOT shown inline, lives in health bar tooltip
- Actions (unlink/skip): show on hover only

### Color System

| Status | Color | Hex | Usage |
|---|---|---|---|
| Mapped (≥60% or manual) | Green | `#4ade80` | Checkbox fill, confidence badge, health bar segment |
| Needs Review (40-59%) | Yellow | `#facc15` | Checkbox border, confidence badge, health bar segment |
| Weak (<40%) | Red | `#ef4444` | Checkbox border, confidence badge, health bar segment |
| Unmapped | Blue | `#60a5fa` | Checkbox border, health bar segment |
| Covered by group | Gray | `#4a4540` | Checkbox fill (dim), health bar segment |

### Type Badge Colors

| Type | Color | Hex |
|---|---|---|
| SUPER | Purple | `#a855f7` |
| GRP | Blue | `#60a5fa` |
| SUB | Teal | `#2dd4bf` |

Badge color = hierarchy type identity only. Never reflects mapping status.

### Status Checkbox System

| Status | Appearance | Clickable |
|---|---|---|
| Approved/Strong/Manual | Solid green fill, white ✓, 100% opacity | No |
| Needs Review (40-59%) | Yellow border, ghosted yellow ✓, 50% opacity | Yes → approve |
| Weak (<40%) | Red border, faint red ✓, 35% opacity | Yes → approve |
| Unmapped | Blue border, empty, 30% opacity | No |
| Covered | Gray fill, faint ✓, 25% opacity | No |

Hover on yellow/red brightens, inviting click. Green/blue/gray are non-interactive.

### Health Bar

- 4px segmented bar showing ratio of mapped/review/weak/unmapped/covered
- Only on group rows with direct models (not super groups, not model rows)
- Tooltip on hover shows: "7 models total · 5 Mapped · 2 Review (40-59%)"
- All health bars align vertically in the same grid column

### Cascade Mapping Prompt

When user approves a group-level mapping (clicks the group's status checkbox):

```
"Map 7 models inside this group to matching models in the source? [Yes, Map Models] [No thanks]"
```

Appears as a subtle green-tinted bar below the group row. Dismisses after user choice.

### Confidence Thresholds

| Range | Label | Color |
|---|---|---|
| ≥60% | Strong match | Green |
| 40-59% | Needs review | Yellow |
| <40% | Weak match | Red |

Previous thresholds (90/70) were unrealistic for matching engine output — everything appeared red.

---

## Submodel Groups Step — Key Decisions

1. **Separate step** from Groups & Models (different cognitive task: spatial mapping vs pattern mapping)
2. **Auto-skips** if no models have submodel groups on either side
3. **Scoped per model** — user picks a spinner, sees its submodel groups
4. **Section headers** (`**OUTER`, `**CENTER`, `**HALLOWEEN`) from xmodel become collapsible dividers
5. **Individual submodels** (e.g., "Cascading Arches-01") are hidden — mapping happens at group level only
6. **Same card UI** as Groups & Models (checkbox, fx, SUB badge, name, destination, health, actions)

### Spinner Monogamy (Ticket 79)

- Each destination HD prop receives mappings from exactly ONE source HD prop
- Source can map to multiple destinations (copy)
- Unmapped destination submodel groups stay empty — never backfilled from a different source
- Show pairing review at top of step before individual submodel group mapping
- Algorithm: score all source×destination combinations, optimal assignment, then match submodel groups within each pair

---

## Typography

| Use | Font |
|---|---|
| UI text, names, labels | DM Sans |
| Badges, metrics, monospace | JetBrains Mono |

---

## Icons (Lucide)

| Icon | Usage |
|---|---|
| ChevronRight / ChevronDown | Expand/collapse groups |
| Link2 | Auto-matched indicator |
| Unlink2 | Remove mapping action |
| X | Skip/dismiss action |
| Check | Status checkbox checkmark |

---

## What NOT to Change

- Upload step — untouched
- Review step — untouched (for now)
- Monetization/pricing — separate workstream (Ticket 72)
- Saved layouts — future feature (Ticket 74)
- The overall dark theme, warm-tone color palette
