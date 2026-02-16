# Ticket 93 — Destructive Action Confirmation for Family Skip

**Priority:** P1 — Interaction safety
**Applies to:** ModIQ mapping workspace — family/group skip actions
**Audit item:** No confirmation before destructive "Skip all X in family" actions

---

## Current State

The "skip family" action immediately iterates and skips all models with no confirmation:

- **`UniversalSourcePanel.tsx:316-322`** — `skipFamily()` iterates through all family members and calls `skipLayer()` on each. No guard, no confirmation, no undo toast.
- **`IndividualsPhase.tsx:444-453`** — Same pattern. The button has only a `title` tooltip explaining the action.

A user who clicks "Skip all" on a family of 20 Mini Trees instantly skips all 20 with no way to undo other than manually un-skipping each one. This is especially problematic because:
1. The skip button is small and close to other actions — accidental clicks happen
2. The action is bulk — one click affects many items
3. Undo requires 20 individual un-skip actions

---

## Proposed Changes

### 1. Inline Confirmation for Family Skip (3+ members)
When a user clicks "Skip all in family" on a group with 3 or more members, replace the family row content with an inline confirmation:

```
┌──────────────────────────────────────────────────┐
│ Skip all 12 Mini Trees?                          │
│                      [Yes, skip all]    [Cancel]  │
└──────────────────────────────────────────────────┘
```

- Inline, not a modal — keeps the user in context
- Auto-dismisses after 10 seconds (reverts to normal view)
- Focus traps to the two buttons for keyboard accessibility
- Single-item and 2-item families skip immediately (low consequence)

### 2. Undo Toast After Bulk Skip
After confirming a family skip, show a toast notification:

```
┌──────────────────────────────────────────────┐
│ Skipped 12 Mini Trees          [Undo]  (8s)  │
└──────────────────────────────────────────────┘
```

- Visible for 8 seconds with a countdown indicator
- "Undo" reverses the entire family skip in one action (un-skips all members)
- Toast positioned at bottom of the mapping workspace, not blocking content
- Multiple toasts stack vertically if user skips multiple families quickly

### 3. Batch Undo Support
Currently `Ctrl+Z` undoes one action at a time. For a family skip, `Ctrl+Z` should undo the **entire family skip** as a single operation (not 20 individual un-skips). This requires:
- Grouping the skip operations into a single undo transaction
- The undo stack records "skipped family: [Mini Tree 1-20]" as one entry

---

## Files to Modify

| File | Change |
|------|--------|
| `UniversalSourcePanel.tsx` | Add inline confirmation UI before `skipFamily()` execution |
| `IndividualsPhase.tsx` | Same inline confirmation for family skip actions |
| New: `UndoToast.tsx` | Undo toast component (or add to existing toast system) |
| `useInteractiveMapping.ts` (or equivalent undo logic) | Group family skips into a single undo transaction |

---

## Acceptance Criteria

- [ ] Clicking "Skip all" on a family with 3+ members shows inline confirmation
- [ ] Confirmation has "Yes, skip all" and "Cancel" with keyboard focus
- [ ] Confirmation auto-dismisses after 10 seconds without acting
- [ ] After confirming, undo toast appears for 8 seconds with one-click undo
- [ ] Ctrl+Z undoes the entire family skip as one operation
- [ ] Families with 1-2 members skip immediately (no confirmation needed)
