# Ticket 60 — Bidirectional Perspective Switching (Both Views)

Add a **My Display / Source Sequence** perspective toggle to both Card View and Grid View in the Finalize phase. Same mapping data, two directions.

---

## The Problem

Ticket 58 (Card View) and Ticket 59 (Grid View) only show the display-first perspective: "what's happening to my models?" This catches dark models but creates blind spots:

- Source models with high effect counts that nobody's using (wasted content)
- Source models mapped to 5+ destinations (potential batch-assign accidents)
- Sources that were skipped or forgotten entirely

Users need to audit from both directions to fully understand what they're exporting.

---

## Perspective Toggle

Add a tab set inside each view mode. This sits below the Card/Grid toggle and above the content:

```
View:  [🎯 Card View]  [📊 Grid View]

Perspective:   My Display  |  Source Sequence
```

- **My Display** (default) — "What's happening to each part of my display?"
- **Source Sequence** — "Where is each piece of the sequence going?"
- Both perspectives read/write the same mapping state
- Switching perspective preserves all state instantly
- The persistent coverage bars in the Finalize header always show both metrics (Display Coverage + Sequence Coverage) regardless of active perspective

---

## Grid View — Source Sequence Perspective

Left column = source models. Right = destination assignment(s).

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Search sources...               Sort: [Unmapped First ▾]   Filter: [All ▾]      │
├──────┬───────────────────────┬──────────────────────────┬───────┬────────┬────────┤
│  ☐   │ SOURCE MODEL          │ SENDING TO (DISPLAY)     │ FX    │ DEST#  │ STATUS │
├──────┼───────────────────────┼──────────────────────────┼───────┼────────┼────────┤
│  ☐   │ ARCH 1                │ Arch 2                   │ 11    │ 1      │ ✓      │
│      │                       │ All - Poles - GRP        │       │        │ ✓ +1   │
│      │                       │ [+ Add destination]      │       │        │        │
│  ☐   │ ARCH 2                │ Arch 1                   │ 11    │ 1      │ ✓      │
│  ☐   │ FRONT DOOR WEB 1      │ Window - Avery           │ 1     │ 2      │ ✓      │
│      │                       │ Driveway Left            │       │        │ ✓ +1   │
│  ☐   │ IC TARANTULA 1        │ [— Select destination —▾]│ 198   │ 0      │ ⚠      │
│  ☐   │ MEGATREE              │ Mega Tree                │ 105   │ 1      │ ✓      │
│  ...                                                                              │
├──────┴───────────────────────┴──────────────────────────┴───────┴────────┴────────┤
│  46 sources · 42 mapped · 4 unused                        Sequence Coverage: 100% │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Source Grid Columns

| Column | Content |
|---|---|
| **☐** | Checkbox for multi-select |
| **Source Model** | Model/group name from source sequence |
| **Sending To** | Current destination(s) from user's layout. Shows all destinations with [+ Add destination] for many-to-one. Unmapped sources show a searchable dropdown of display models. |
| **FX** | Effect count — high counts unmapped = wasted content |
| **Dest#** | Number of destinations. 0 = unmapped. 3+ = heavily shared. |
| **Status** | ✓ mapped (1+ destinations) · ⚠ unmapped · Skipped |

### Source Grid Sort Options
- **Unmapped First** (default)
- Effect count high→low (surfaces high-value unmapped sources)
- Name A→Z
- Destination count high→low

### Source Grid Filter Options
- All
- Unmapped only
- Mapped only
- Many-to-one only (2+ destinations)

### Source Grid Interactions
- **[+ Add destination]** — searchable inline dropdown of display models (same component as Ticket 59)
- **[×]** on any destination — removes that link
- **Multi-select + batch assign** — select sources, assign all to same destination
- Unmapped sources with high FX counts get an amber/warning row highlight

---

## Card View — Source Sequence Perspective

Reuses Ticket 58's card layout but flipped: source models as the main cards, display models in the tray.

### Main Area
Source models displayed as cards, grouped and sorted:

```
▾ NEEDS DESTINATIONS (4 sources)

  ┌─────────────────────────────────────────────────────────┐
  │  IC TARANTULA 1                           198 effects   │
  │  ⚠ Not sending to any display model                    │
  │  💡 Suggested: Spider 1 (76%)  [Accept]                 │
  │                                                         │
  │              ┌─ or drag a display model here ─┐         │
  │              └────────────────────────────────-┘         │
  └─────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │  ICE PRINCESS SNOWFLAKE                    53 effects   │
  │  ⚠ Not sending to any display model                    │
  │              ┌─ drag a display model here ─────┐        │
  │              └─────────────────────────────────-┘        │
  └─────────────────────────────────────────────────────────┘

▸ SENDING TO 1 DESTINATION (38 sources)     ← collapsed
▸ SENDING TO 2+ DESTINATIONS (4 sources)    ← collapsed, review for over-mapping
```

### Bottom Tray (Flipped)
Instead of source chips (Ticket 58), show **display model chips** — user's layout models as draggable items:

```
┌──────────────────────────────────────────────────────────────────────┐
│  DISPLAY TRAY                                            [collapse] │
│  Search display models...                                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐     │
│  │ Arch 3  │ │ Bat 3   │ │Driveway │ │ Eave 2  │ │ Eave 3   │ ... │
│  │ ⚠ dark  │ │ ⚠ dark  │ │ ⚠ dark  │ │ ⚠ dark  │ │ ⚠ dark   │     │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

- Dark (unmapped) display models shown first with ⚠ indicator
- Already-mapped display models available too (for many-to-one — adding a second source)
- Drag a display model chip onto a source card to create the mapping

---

## Workflow

The natural audit flow across both perspectives:

1. **My Display perspective** — fix dark models, accept suggestions, batch-assign groups → get Display Coverage up
2. **Source Sequence perspective** — scan for unused high-FX sources, add destinations for underutilized content → maximize the value of what the sequence offers
3. Both coverage bars at 100% → Continue to Review

---

## Footer Per Perspective

Each perspective shows its own relevant summary in the table/card footer:

- **My Display:** `150 models · 89 mapped · 27 suggested · 34 unmapped — Display Coverage: 59%`
- **Source Sequence:** `46 sources · 42 mapped · 4 unused — Sequence Coverage: 100%`
