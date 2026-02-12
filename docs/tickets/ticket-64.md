# Ticket 64 — Finalize Grid: Row Density, Multi-Map Pills & Focus Mode

Goal: maximize visible rows on screen, eliminate unnecessary row height expansion, add a distraction-free mode.

---

## 1. Mapped To — Wider Column, Horizontal Pills

Double the width of the Mapped To column. Shrink the My Display column to compensate — model names rarely exceed 25 characters.

Mapped sources display as **inline pills**, laid out horizontally left-to-right:

```
│ Eave 1 - Office Left  │ [DMX Wireless Bracelets ✕] [Spinner 2 ✕]  [+ Add]  │ 60% │ 78 │
```

- Each pill shows the source name with an ✕ on hover (not always visible — appears on pill hover)
- Pills wrap to a second line ONLY if 3+ sources overflow the width
- `[+ Add]` link at the end for adding another source (many-to-one)
- Unmapped rows show a compact muted `+ Assign` button instead of the full "Choose a source..." placeholder — opens the inline searchable dropdown on click
- Single-mapped rows = one pill, stays single-line height

---

## 2. Row Padding Reduction

Tighten vertical padding on all rows:

- Data rows: reduce to **8px top/bottom** (from current ~16px)
- This alone should increase visible rows by ~40-50%
- Minimum row height: 36px (keeps touch targets accessible)

---

## 3. Slim Group Headers

Group header rows should be visually distinct but **shorter** than data rows:

```
│ ☐  ▸ Flake Icicle (41)  ·  41 unmapped                                    ⚠  [✕] │
```

- Height: ~28-30px (vs 36px for data rows)
- No Mapped To / Match / FX cells — just the group name, count summary, status, and dismiss ✕
- Smaller font size than data rows
- Subtle background tint to differentiate from data rows (e.g. slightly lighter than table bg)

---

## 4. Remove Status Column — Use Left Border

Replace the Status column (✓ ⚠ 💡) with a **left border color indicator** on each row:

- **Green** left border = mapped
- **Amber/yellow** left border = unmapped
- **Red pill glow** = suggested (AI suggestion waiting for action)
- 3px solid left border, same colors as existing status icons

This eliminates an entire column, freeing ~60px of horizontal space for the Mapped To area.

---

## 5. Compact Match + FX Columns

- **Match column**: only show when there's a value. Blank rows show nothing (not "—"). Right-align. Reduce column width to ~50px.
- **FX column**: same treatment. ~40px wide.
- Both columns can share a tighter combined width since they're numeric and short.

---

## 6. Focus Mode

Button in the Finalize header, right side:

```
[⛶ Focus]
```

Activates a distraction-free layout:

- **Hides**: site nav header (Lights of Elm Ridge nav bar), Mod:IQ title/breadcrumb, stepper pills, Export/Undo buttons, Back button, footer
- **Shows**: two slim coverage bars (Models Mapped + Effects Covered) at the very top, then the full grid below — that's it
- Coverage bars compress to a single-line layout:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Models: 74% (180/242) ████████████░░░░   Effects: 52% (2.5K/4.9K) ████████░░░ │
│                                                                   [Exit Focus]  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- Grid gets full viewport height minus ~40px for the slim bar
- Accept All Suggestions button and perspective toggle (My Display / Source Sequence) remain accessible in a compact toolbar row between the coverage bar and the grid
- Quick filter pills, search, sort/filter dropdowns remain in place
- `[Exit Focus]` button in the coverage bar returns to normal layout
- Keyboard shortcut: `F` to toggle focus mode (or `Esc` to exit)
- Continue to Review button accessible via the coverage bar area or a floating action button

---

## Target Column Layout (Focus Mode)

With all optimizations applied, the grid should fit roughly:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Models: 74% ██████████░░░░░   Effects: 52% ████████░░░░   [Exit Focus]         │
│ [Accept All (45)]  195 need attention     [My Display | Source Sequence]         │
│ [All(340)] [Groups(98)] [Models(242)] [Submodels(0)]                            │
│ 🔍 Search...                         Status:[All▾]  Sort:[Unmapped First▾]      │
├───┬──────────────────────┬─────────────────────────────────────────┬─────┬───┬───┤
│ ☐ │ MY DISPLAY           │ MAPPED TO                              │MATCH│ FX│   │
├───┼──────────────────────┼─────────────────────────────────────────┼─────┼───┤   │
│   │ Driveway Left        │ + Assign                               │     │   │   │
│   │▸ Flake (3) · 2/3     │                                        │     │   │   │
│   │▸ Flake Icicle (41)   │                                        │     │   │   │
│   │▸ Large Gift (2) · 1/2│                                        │     │   │   │
│   │ Matrix 1             │ [Matrix - P10 ✕]                       │     │ 82│   │
│   │ Matrix 2             │ [Matrix - P10 ✕]                       │     │ 82│   │
│   │▸ Mega Tree (5) · 5/5 │                                        │     │   │   │
│   │▸ Mini Pumpkin (8)    │                                        │     │   │   │
│   │ Spider 1             │ [Boscoyo Spider 1 ✕]  [IC Tarantula ✕] │     │198│   │
│   │▸ Window (12) · 8/12  │                                        │     │   │   │
│   │ ...                  │                                        │     │   │   │
│   │ ...                  │                                        │     │   │   │
│   │ ...                  │                                        │     │   │   │
│   │ ...                  │                                        │     │   │   │
│   │ ...                  │                                        │     │   │   │
│   │ ...                  │                                        │     │   │   │
│   │ ...                  │                                        │     │   │   │
│   │ ...                  │                                        │     │   │   │
│   │ ...                  │                                        │     │   │   │
├───┴──────────────────────┴─────────────────────────────────────────┴─────┴───┤   │
│ 340 models · 180 mapped · 45 suggested · 115 unmapped                       │   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

With groups collapsed, 340 models might condense to ~30-40 visible rows. At 36px row height with 8px padding, that's visible without scrolling on most screens in Focus Mode.
