# Ticket 92 — Keyboard Navigation for Mapping Actions

**Priority:** P1 — Accessibility / power users
**Applies to:** ModIQ mapping workspace — all phases
**Audit item:** No keyboard shortcuts for accept/skip/undo during mapping

---

## Current State

Keyboard shortcuts **partially exist** but are fragmented and undocumented:

### What Exists
- **`useKeyboardShortcuts.ts:13-55`** — Global shortcuts:
  - `Alt+N` → next unmapped layer
  - `Alt+Enter` → accept suggestion
  - `Alt+S` → skip current layer
  - `Ctrl+Z` → undo last action
- **`PickMatchPopover.tsx:196-213`** — Popover-only shortcuts:
  - Arrow keys → navigate options
  - Enter → select highlighted option
  - Escape → close popover
- **`ModIQTool.tsx:2173-2212`** — Additional bindings:
  - `F` → focus mode
  - `Escape` → exit focus mode

### What's Missing
1. **UI documentation** — None of these shortcuts are shown anywhere in the interface
2. **Global scope** — Popover shortcuts (Arrow/Enter) only work when the popover is open; the main workspace has no Arrow key navigation
3. **Keyboard DnD** — Drag-and-drop mapping has **no keyboard alternative whatsoever**. Mouse-only. `useDragAndDrop.ts` is entirely pointer-event based
4. **Input suppression** — Shortcuts may fire when typing in the search input

---

## Proposed Changes

### 1. Simplify Global Shortcut Keys
The current `Alt+` modifier shortcuts are cumbersome. Add simpler alternatives that work when no text input is focused:

| Key | Action | Condition |
|-----|--------|-----------|
| `Tab` | Advance to next unmapped layer | No text input focused |
| `Enter` | Accept top suggestion | No text input focused |
| `S` | Skip current layer | No text input focused |
| `Ctrl+Z` / `Cmd+Z` | Undo last action | Always |
| `F` | Toggle focus mode | No text input focused |
| `Escape` | Exit focus mode / cancel selection | Always |
| `?` | Toggle shortcut legend | No text input focused |

Keep the `Alt+` variants as aliases for users who've already learned them.

### 2. Input Suppression
When a text input (search box, rename field) is focused, suppress single-key shortcuts (Tab, S, Enter, F, ?) but allow modifier shortcuts (Ctrl+Z). Detect via:

```typescript
const isInputFocused = () => {
  const el = document.activeElement;
  return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable;
};
```

### 3. Keyboard Drag-and-Drop Alternative
Add a keyboard-based assignment flow:

1. When a source layer is focused, pressing **Space** or **Enter** "picks it up" (enters assignment mode)
2. **Arrow Up/Down** navigates through destination models in the right panel
3. **Enter** "drops" — assigns the source to the highlighted destination
4. **Escape** cancels the pick-up

While in keyboard assignment mode:
- The source shows a "grabbed" visual state (pulsing border or similar)
- The currently-highlighted destination shows a drop-target highlight
- A status bar shows: "Assigning [source name] — ↑↓ to navigate, Enter to assign, Esc to cancel"

Add ARIA attributes:
- `aria-grabbed="true"` on the picked-up source
- `aria-dropeffect="move"` on valid destination targets

### 4. Shortcut Legend
(Covered in Ticket 87's keyboard shortcut bar, but the shortcut legend should update dynamically based on context: show DnD shortcuts when in assignment mode, show accept/skip when viewing suggestions.)

---

## Files to Modify

| File | Change |
|------|--------|
| `useKeyboardShortcuts.ts` | Add simplified key bindings; add input suppression; add keyboard DnD flow |
| `IndividualsPhase.tsx` / `FinalizePhase.tsx` | Track keyboard-assignment mode state; render drop-target highlights |
| `SourceLayerRow.tsx` | Add "grabbed" visual state for keyboard DnD |
| `DraggableUserCard.tsx` | Add keyboard-navigable focus state and drop-target highlight |
| `InteractiveMappingRow.tsx` | Ensure Enter key triggers suggestion acceptance |

---

## Acceptance Criteria

- [ ] Tab/Enter/S work as shortcuts when no text input is focused
- [ ] Shortcuts are suppressed when search input or rename field is focused
- [ ] Keyboard assignment mode: Space to grab, Arrow keys to navigate destinations, Enter to assign, Escape to cancel
- [ ] Grabbed source shows visual "picked up" state
- [ ] Highlighted destination shows visual "drop target" state
- [ ] `aria-grabbed` and `aria-dropeffect` attributes added for screen readers
- [ ] All existing Alt+ shortcuts continue to work as aliases
