# Ticket 83 — View Mode Pills: All / Groups / Models

**Priority:** P1 — UX improvement, not blocking
**Applies to:** Groups & Models phase, Display Coverage phase, Submodel Groups phase (adapted)

---

## The Change

Add a **view mode toggle** above the existing status filter pills on all mapping phases. Three modes that change what's visible and how it's structured:

```
View: [All]  [Groups]  [Models]

Filter: [All (108)]  [Mapped (85)]  [Unmapped (23)]
```

View mode and status filter are **independent** — they compose. "Groups view + Unmapped filter" shows only unmapped groups. "Models view + Mapped filter" shows a flat list of only mapped models.

---

## View Modes

### All (default)

The current hierarchical view. Groups as expandable cards with models nested inside.

```
▾ ☑ 110 fx GRP All - Fence (7)        → VLS GROUP - ALL MATRIX 65%  ████░░
    ☑  7 fx  Fence Panel 1             → MATRIX SPINNER LEFT    54%
    ☑  7 fx  Fence Panel 2             → MATRIX SPINNER LEFT    54%
    ☐  0 fx  Fence Panel 3              + Assign
    ...
▾ ☑  93 fx GRP All - Fireworks (2)     → VLS GROUP - SPIDERS    26%  ██░░░░
    ☐ 48 fx  Firework 1                 + Assign
    ☐ 45 fx  Firework 2                 + Assign
```

- Groups have chevrons, expand/collapse
- Models indented under their parent group
- Health bars on groups
- This is the default and what exists today

### Groups

Groups only. No chevrons, no expansion, no child models visible. Clean flat list of just the groups.

```
☑ 110 fx GRP All - Fence (7)           → VLS GROUP - ALL MATRIX 65%  ████░░
☑  93 fx GRP All - Fireworks (2)       → VLS GROUP - SPIDERS    26%  ██░░░░
☑  61 fx GRP All - Bats (7)            → VLS GROUP - BATS      100%  ██████
☐   0 fx GRP All - Floods (4)           + Assign                     ░░░░░░
☐   0 fx GRP All - Trees - Real (3)     + Assign                     ░░░░░░
```

- No chevrons — rows are not expandable
- Health bars still visible (they summarize child status, which is useful even without seeing children)
- Child count still shown in parentheses after group name
- Clicking a row still opens the right detail panel for that group
- Groups that are Super Groups still show SUPER badge
- Status checkboxes reflect group-level mapping status
- **Useful for:** Quick overview of group coverage, bulk group-level mapping, seeing which groups are dark

### Models

Flat list of individual models only. No group cards, no hierarchy, no nesting.

```
☑  7 fx  Fence Panel 1                 → MATRIX SPINNER LEFT    54%
☑  7 fx  Fence Panel 2                 → MATRIX SPINNER LEFT    54%
☐  0 fx  Fence Panel 3                  + Assign
☐  0 fx  Fence Panel 4                  + Assign
☐ 48 fx  Firework 1                     + Assign
☐ 45 fx  Firework 2                     + Assign
☑  8 fx  Bat 1                          → VLS Bat 1             92%
☑  7 fx  Bat 2                          → VLS Bat 2             90%
...
```

- No group headers or group cards at all
- Every model is a top-level row (same `ModelRow` component)
- No type badges (they're all models)
- No health bars (no group context)
- Sorted alphabetically by model name (default) or by current sort selection
- Status checkboxes reflect model-level mapping status
- "Covered by group" models still show gray checkbox with "covered by group" in destination area
- **Useful for:** Finding a specific model, seeing individual model coverage, power users who think in terms of models not groups

---

## Pill Styling

View mode pills are visually distinct from status filter pills — they're a **segmented toggle** rather than colored pills:

```
┌─────────────────────────────┐
│ [All] │ [Groups] │ [Models] │     ← Segmented toggle, one active
└─────────────────────────────┘
[All (108)]  [Mapped (85)]  [Unmapped (23)]     ← Status filter pills (colored)
```

- Segmented toggle: rounded rectangle border, active segment has filled background (`COLORS.cardBg` or subtle highlight), inactive segments are transparent
- No counts on the view toggle (the status pills already have counts)
- Active segment uses white/light text, inactive uses muted text
- Compact — shouldn't take much vertical space

---

## How View Mode + Status Filter Compose

| View | Status: All | Status: Mapped | Status: Unmapped |
|---|---|---|---|
| **All** | Full tree | Tree showing only groups with mapped children, only mapped models within | Tree showing only groups with unmapped children, only unmapped models within |
| **Groups** | Flat group list | Only mapped groups | Only unmapped groups |
| **Models** | Flat model list | Only mapped models | Only unmapped models |

Status filter pill counts update based on the current view mode:
- All view: counts include groups + models
- Groups view: counts reflect only groups
- Models view: counts reflect only models

---

## Application to Each Phase

### Groups & Models Phase

View modes:
- **All**: Groups with nested models (current behavior)
- **Groups**: Just group cards, no expansion
- **Models**: Flat model list

### Display Coverage Phase

Same three modes, same behavior. The data is your display models/groups rather than source, but the view toggle works identically.

### Submodel Groups Phase

Adapted terminology:
- **All**: Spinner cards with nested submodel group rows (current behavior from Ticket 81)
- **Spinners**: Just the spinner cards, no expansion into submodel groups
- **Sub-Groups**: Flat list of all submodel groups across all spinners

The pills read `[All] [Spinners] [Sub-Groups]` instead of `[All] [Groups] [Models]`.

---

## Sort Behavior

Sorts apply uniformly across all view modes:

- **Name A→Z / Z→A**: Alphabetical on the visible item names
- **Confidence**: By match confidence score
- **Effects**: By effect count

In All view, sort applies at the group level first, then within each group. In Groups or Models view, sort applies to the flat list directly. Switching view mode preserves the current sort selection.

---

## Implementation Notes

- View mode state is a simple enum: `'all' | 'groups' | 'models'`
- The data doesn't change — just which rows are rendered and how
- In Groups view: render `GroupCard` components without `children`, set chevron hidden / `onToggle` disabled
- In Models view: flatten all models from all groups into a single array, render with `ModelRow`
- View mode persists within the session (switching between phases and back remembers the mode)
- Default is "All" on first load
