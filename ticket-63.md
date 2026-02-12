# Ticket 63 — Finalize: Ignore/Dismiss Models + Remove Card View

---

## Remove Card View

Remove the Card View toggle and the entire Card View implementation from the Finalize phase. Grid View is now the only view mode.

- Remove the `[Cards] [Grid]` toggle
- Remove the source tray dock (bottom bar) — it was only relevant to Card View
- Keep the `[My Display] [Source Sequence]` perspective toggle (Ticket 60)
- The Finalize phase is now: grid + perspective toggle + filters/sorts

---

## Ignore/Dismiss — Row Action

Add an **✕** button on every row (individual models AND group headers):

- On individual model row: click ✕ → model moves to the Ignored section at the bottom
- On group header row: click ✕ → entire group and all children move to Ignored
- Brief undo toast appears for 5 seconds after dismissing: `"Eave 5 - Entrance Arch ignored" [Undo]`

If a model had a mapping or suggestion, ignoring it clears that mapping.

---

## Ignored Section

Collapsed section pinned to the bottom of the grid, below all active rows:

```
▸ Ignored (12 models)
```

Expanding shows dismissed models in a muted/dimmed table:

```
▾ Ignored (12 models)
├──────┬───────────────────────┬──────────────────────────────────────┬────────────┤
│      │ Eave 5 - Entrance Arch│                                      │ [Restore]  │
│      │ Eave 6 - Tower Left   │                                      │ [Restore]  │
│      │ Eave 7 - Tower Peak 1 │                                      │ [Restore]  │
│  ... │                                                                            │
└──────┴───────────────────────┴──────────────────────────────────────┴────────────┘
```

- Collapsed by default
- Muted/dimmed text styling — visually distinct from active rows
- No checkboxes, no mapped-to column, no match/FX — just name and [Restore] button
- [Restore] moves the model back to the active grid in its original position
- If a group was ignored as a whole, show it as a group row in Ignored with a single [Restore] that brings back all children

---

## Metric Bar Exclusion

Ignored models are **excluded from all coverage calculations**:

- If 150 total models, 12 ignored → denominators become 138
- Display Coverage bar: `90% (124/138)` not `(124/150)`
- Models Mapped header bar: same adjustment
- Quick filter pill counts exclude ignored: `[All (138)]`
- The Ignored section count `(12 models)` is visible but separate from the metrics

This means ignoring models **increases your coverage percentage** — which is the correct behavior. If a user has 26 eave submodels they don't care about, ignoring them shouldn't penalize their coverage score.

---

## Batch Ignore

When multiple rows are selected via checkboxes, the batch toolbar adds an Ignore option:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  12 selected    Assign all to: [— source —▾]    [Ignore Selected]  [Clear] │
└──────────────────────────────────────────────────────────────────────────┘
```
