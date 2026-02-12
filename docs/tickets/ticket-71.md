# Ticket 71 — Groups & Models Phase: UI Cleanup & Filter Overhaul

---

## 1. Remove Flat/Tree Toggle

Remove the Hierarchy/Flat view toggle. Tree view is the only view. The flat view wasn't working well and adds complexity. Tree with xLights-inferred hierarchy is clean enough.

---

## 2. Replace Status Summary with Filter Pills

Remove the text summary line: `108 items · 82 mapped · 26 unmapped`

Replace with filter pills in that position:

```
[All (108)]  [Mapped (82)]  [Unmapped (26)]
```

- One active at a time, default is All (but see #5 for auto-start behavior)
- Counts update live as mappings change
- These are the ONLY filter pills — remove any other filter pill rows (the old All/Groups/Models/Submodels pills)

### Filter behavior at group level:
- **Unmapped filter**: A group stays visible if ANY child inside it is unmapped. Group header shows unmapped count: `All - Arches (8) · 2 unmapped`. Fully mapped groups are hidden.
- **Mapped filter**: A group stays visible if ANY child inside it is mapped. Fully unmapped groups are hidden.
- **All**: Everything visible.

---

## 3. Remove Effects Sub-Bar

Remove the Effects Covered progress bar from within the phase content. The top-level stepper header bar (Models Mapped + Effects Covered) is sufficient. Having both is redundant and confusing.

---

## 4. Auto-Match Banner Filter Integration

Update the auto-match banner to make "strong" and "needs review" clickable filters:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🔗 32 auto-matched  ·  [44 strong]  ·  [2 needs review]               │
│                                              [Accept All Strong (44)]   │
└──────────────────────────────────────────────────────────────────────────┘
```

- **[44 strong]** is a clickable filter — click it to show only strong auto-matches (≥75% confidence)
- **[2 needs review]** is a clickable filter — click it to show only low-confidence auto-matches (<75%)
- These filters combine with the main pills: clicking "needs review" activates that filter AND the main pills dim/deactivate to show the banner filter is active
- A "Clear filter" link appears to return to the full view
- When a banner filter is active, the filter pills show: `[✕ Showing: 2 needs review]  [Clear]`

---

## 5. Auto-Start with Needs Review

When the phase loads AND there are auto-matches needing review (>0):

1. Page loads with the "needs review" filter pre-applied
2. Only the low-confidence auto-matches are visible
3. Banner is prominent: `"2 matches need your review before continuing"`
4. User reviews/accepts/rejects those 2 items
5. When all "needs review" items are resolved (mapped or dismissed), the filter **auto-clears** and the full list appears with a brief transition
6. Toast: `"All reviews complete — showing full display"`

### If zero needs review:
Skip the auto-start behavior entirely. Page loads with All filter, banner just says:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🔗 32 auto-matched (all strong)                [Accept All Strong (32)]│
└──────────────────────────────────────────────────────────────────────────┘
```

### If user wants to skip review:
A "Skip review, show all" link in the banner lets users bypass the guided start and jump straight to the full list.

---

## 6. Sort Dropdown — Keep As-Is

Sort dropdown stays in the header row next to the filter pills:

```
[All (108)]  [Mapped (82)]  [Unmapped (26)]     Sort: [Name A→Z ▾]  🔄
```

Same sort options from Ticket 68. Same stable sort behavior from Ticket 66.
