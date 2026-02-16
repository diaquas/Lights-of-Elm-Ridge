# Ticket 94 — ARIA Roles, Focus Trap & Keyboard Accessibility

**Priority:** P1 — Accessibility (WCAG 2.1 AA)
**Applies to:** ModIQ mapping workspace — interactive model lists, drag-and-drop, export dialog
**Audit items:** SourceLayerRow and DraggableUserCard lack ARIA roles; drag-and-drop has no keyboard alternative; export dialog has incomplete focus trap

---

## Current State

### Missing ARIA Roles
- **`SourceLayerRow.tsx`** — Renders as a plain `<div>` with click handlers. No `role`, no `aria-selected`, no `aria-expanded` for collapsible family headers.
- **`DraggableUserCard.tsx`** — Same issue. Interactive card with no semantic role.
- **`DraggableSourceCard.tsx`** — Same issue.
- **List containers** in `IndividualsPhase.tsx` and `FinalizePhase.tsx` — Scrollable lists of interactive items with no `role="listbox"` or `role="list"`.

Screen readers cannot communicate the purpose, state, or selection status of any model card.

### Incomplete Focus Trap in Export Dialog
`ExportDialog.tsx:20-28` has `role="dialog"` and `aria-modal="true"`, which is correct. However:
- **Tab escapes to the background** — no focus cycling within the dialog
- **No focus return** — when the dialog closes, focus does not return to the element that triggered it
- **No Escape key handler** — dialog can only be closed by clicking a button

### No Keyboard Drag-and-Drop
`useDragAndDrop.ts` is entirely mouse/pointer-event based. There is no keyboard path for assigning models via drag-and-drop. (Keyboard DnD interaction is covered in Ticket 92 — this ticket covers the ARIA attributes and semantic markup.)

---

## Proposed Changes

### 1. ARIA Roles on Model Cards and Lists

**List containers:**
```tsx
<div role="listbox" aria-label="Source sequence layers" aria-multiselectable="false">
  {layers.map(layer => <SourceLayerRow ... />)}
</div>
```

**Individual cards:**
```tsx
// SourceLayerRow
<div
  role="option"
  aria-selected={isSelected}
  aria-label={`${modelName}, ${effectCount} effects, ${pixelCount} pixels`}
  tabIndex={0}
>

// DraggableUserCard
<div
  role="option"
  aria-selected={isSelected}
  aria-label={`${displayName}, ${isAssigned ? 'assigned' : 'unassigned'}`}
  tabIndex={0}
>
```

**Collapsible family headers:**
```tsx
<button
  role="button"
  aria-expanded={isExpanded}
  aria-controls={`family-${familyId}-members`}
  aria-label={`${familyName}, ${memberCount} models, ${isExpanded ? 'expanded' : 'collapsed'}`}
>
```

### 2. Focus Trap for Export Dialog
Implement a lightweight focus trap (no library needed):

```typescript
function useFocusTrap(dialogRef: RefObject<HTMLElement>, isOpen: boolean) {
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const focusable = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    // Save trigger element for focus return
    const trigger = document.activeElement as HTMLElement;

    // Focus first element
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      trigger?.focus(); // Return focus on close
    };
  }, [isOpen]);
}
```

### 3. Drag-and-Drop ARIA Attributes
When keyboard DnD is implemented (Ticket 92), add these ARIA attributes:

```tsx
// Source being dragged
<div aria-grabbed={isDragging} aria-roledescription="draggable model">

// Drop targets
<div aria-dropeffect={isValidTarget ? "move" : "none"}>
```

Add a live region for DnD announcements:
```tsx
<div aria-live="assertive" className="sr-only">
  {dndAnnouncement}
  {/* e.g., "Grabbed Mini Tree 1. Use arrow keys to navigate. Press Enter to drop." */}
</div>
```

### 4. Screen-Reader-Only Status Announcements
Add `aria-live` regions for key state changes:
- "Layer assigned: Mini Tree 1 mapped to Spinner Port 3"
- "Layer skipped: Arch 5"
- "Undo: Mini Tree 1 unassigned from Spinner Port 3"

---

## Files to Modify

| File | Change |
|------|--------|
| `SourceLayerRow.tsx` | Add `role="option"`, `aria-selected`, `aria-label`, `tabIndex` |
| `DraggableUserCard.tsx` | Add `role="option"`, `aria-selected`, `aria-label`, `tabIndex` |
| `DraggableSourceCard.tsx` | Add `role="option"`, `aria-selected`, `aria-label` |
| `IndividualsPhase.tsx` | Add `role="listbox"` to list containers; add `aria-expanded` to family headers |
| `FinalizePhase.tsx` | Add `role="listbox"` to list containers |
| `ExportDialog.tsx` | Implement focus trap with Tab cycling, Escape to close, focus return |
| New: `useFocusTrap.ts` | Reusable focus trap hook |
| New: `LiveAnnouncer.tsx` | `aria-live` region for screen reader announcements |

---

## Acceptance Criteria

- [ ] All model cards have `role="option"` with `aria-selected` and descriptive `aria-label`
- [ ] List containers have `role="listbox"` with `aria-label`
- [ ] Collapsible family headers have `aria-expanded` and `aria-controls`
- [ ] Export dialog traps Tab focus — Tab cycles within dialog, cannot escape to background
- [ ] Export dialog closes on Escape key
- [ ] Focus returns to trigger element when dialog closes
- [ ] `aria-live` region announces assignment, skip, and undo actions
- [ ] All interactive elements are reachable via Tab key
