# Ticket 97 — Batch Multi-Select for Manual Assignment

**Priority:** P1 — Power user efficiency
**Applies to:** ModIQ mapping workspace — source layer selection and assignment
**Audit item:** No batch/multi-select for manual assignment (20 identical "Mini Trees" = 20 clicks)

---

## Current State

Selection is single-item only:
- **`IndividualsPhase.tsx:82-90`** — Uses `selectedItemId: string | null` — can only select one source layer at a time
- All assignment handlers (`assignLayer`, click-to-assign, drag-and-drop) process one model at a time
- For families of identical models (e.g., 20 Mini Trees, 12 Arches), users must repeat the exact same assignment workflow 20 or 12 times

This is the most common complaint from power users with large displays. A display with 7 spinners × 50+ submodels each means hundreds of individual assignment clicks for models that auto-match didn't catch.

---

## Proposed Changes

### 1. Multi-Select State
Replace single selection with multi-select:

```typescript
// Before
const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

// After
const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
```

### 2. Selection Interactions

| Action | Behavior |
|--------|----------|
| Click | Select one, deselect all others (existing behavior) |
| Ctrl/Cmd + Click | Toggle individual item selection |
| Shift + Click | Range select — select all items between last selected and clicked item |
| Ctrl/Cmd + A | Select all visible (filtered) items in the source panel |
| Escape | Deselect all |

### 3. Selection Count Badge
When multiple items are selected, show a count badge in the left panel header:

```
Source Layers                    [12 selected]
```

### 4. Bulk Assignment UI
When 2+ items are selected and the user clicks a destination model, show a confirmation:

```
┌──────────────────────────────────────────────────┐
│ Assign 12 selected layers to "Spinner Port 3"?   │
│                          [Assign All]   [Cancel]  │
└──────────────────────────────────────────────────┘
```

This assigns all selected source layers to the same destination model.

### 5. "Match All in Family" Button
For families of identically-typed models (e.g., 20 Mini Trees on source, 20 Mini Trees on destination), add a one-click action:

```
┌───────────────────────────────────────────────┐
│ Mini Trees (20)           [Match All by Number]│
└───────────────────────────────────────────────┘
```

**"Match All by Number"** auto-distributes by numeric suffix:
- Mini Tree 1 → Mini Tree 1
- Mini Tree 2 → Mini Tree 2
- ...
- Mini Tree 20 → Mini Tree 20

When counts don't match (15 source, 20 destination), match 1:1 up to the smaller count and leave the rest unmapped.

This button appears on family group headers when:
- The family has 3+ members
- A matching family exists on the destination side (same base name or type)

### 6. Bulk Skip
When multiple items are selected, the "Skip" action applies to all:

```
[Skip 12 selected]
```

Uses the same confirmation pattern as Ticket 93 (inline confirmation for 3+ items).

---

## Files to Modify

| File | Change |
|------|--------|
| `IndividualsPhase.tsx` | Replace `selectedItemId` with `selectedItemIds: Set`; add Shift/Ctrl click handlers; render selection count badge |
| `FinalizePhase.tsx` | Same multi-select support |
| `SourceLayerRow.tsx` | Add visual multi-selected state; handle Ctrl+Click and Shift+Click |
| `UniversalSourcePanel.tsx` | Add "Match All by Number" button on family headers |
| `useInteractiveMapping.ts` (or equivalent) | Add `assignMultiple()` and `skipMultiple()` batch operations; group into single undo transaction |

---

## Acceptance Criteria

- [ ] Ctrl/Cmd+Click toggles individual selection; Shift+Click range selects
- [ ] Selection count badge shows "N selected" in panel header
- [ ] Clicking a destination with 2+ selected sources shows bulk assignment confirmation
- [ ] Bulk assignment creates a single undo transaction (one Ctrl+Z undoes all)
- [ ] "Match All by Number" button appears on families with 3+ members and a matching destination family
- [ ] "Match All by Number" distributes by numeric suffix (1→1, 2→2, etc.)
- [ ] Bulk skip applies to all selected items with confirmation for 3+
- [ ] Escape deselects all; single click without modifier deselects all and selects one
