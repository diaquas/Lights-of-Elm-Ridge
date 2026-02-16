# Ticket 91 — Interaction Mode Clarity & Visual Affordance

**Priority:** P1 — Interaction design
**Applies to:** Mapping workspace — click-to-assign mode, suggestion pills, skip button visibility
**Audit items:** Click-to-assign vs drag-and-drop mode is ambiguous; suggestion pill looks like a passive badge, not a clickable button; skip button is opacity-0 until hover — completely invisible on touch devices

---

## Current State

### Click-to-Assign vs Drag-and-Drop Ambiguity
Both interaction modes work simultaneously with no indicator of which is active. When a source card is selected, it gets `border-accent bg-accent/10` styling (`DraggableSourceCard.tsx:62-64`), but there's no label explaining what to do next. Users don't know whether to click a destination or drag the source — and there's no visual communication when the mode changes.

### Suggestion Pill Appearance
The suggestion pill in `InteractiveMappingRow.tsx:207-221` is styled with `rounded-full` + `text-[12px]` + a subtle green background. It has a click handler and hover state, but its visual design reads as a **passive status badge** (like "Matched" or "Auto"), not as the primary call-to-action. This is the #1 action users should take, but it doesn't look interactive.

### Skip Button Visibility
The skip button uses `opacity-0 group-hover:opacity-100` (`SourceLayerRow.tsx:486`, `InteractiveMappingRow.tsx:243`). This pattern:
- Works on desktop with a mouse (hover reveals it)
- **Completely fails on touch devices** — there is no hover state, so the button is permanently invisible
- Even on desktop, users don't know the button exists until they accidentally hover

---

## Proposed Changes

### 1. Suggestion Pill → Obvious Button
Transform the suggestion pill from a badge to a clear call-to-action:

**Current:** `rounded-full bg-green-500/10 text-green-400 text-[12px]` (reads as badge)

**Proposed:**
- Shape: `rounded-md` instead of `rounded-full` — rectangles read as buttons, pills read as tags
- Background: `bg-green-500/20 hover:bg-green-500/30` — stronger initial contrast
- Cursor: Add `cursor-pointer` explicitly
- Icon: Prepend a small checkmark or "+" icon to signal action
- Text: Change from just the model name to "Accept: [Model Name]" or prepend "→"
- ARIA: Add `role="button"` and `aria-label="Accept suggestion: [model name]"`

### 2. Skip Button Always Visible
Replace hover-only visibility with always-visible muted state:

**Current:** `opacity-0 group-hover:opacity-100`

**Proposed:**
```css
/* Always visible but muted */
opacity-40 hover:opacity-100

/* Touch devices — full visibility */
@media (hover: none) {
  opacity-100
}
```

This ensures:
- Desktop: button is visible but doesn't compete with the suggestion pill
- Touch: button is fully visible since hover isn't available
- No interactive elements are hidden from any device

### 3. Click-to-Assign Mode Indicator
When a source card is selected for click-to-assign, show a contextual bar at the top of the right panel:

```
┌────────────────────────────────────────────────┐
│ Click a model to assign "Mini Tree Spoke 1"    │
│                               [Cancel] (Esc)   │
└────────────────────────────────────────────────┘
```

- Appears only when a source is selected and awaiting assignment
- Disappears when assignment is made or cancelled
- Shows the selected source name so users know what they're assigning
- Escape key or Cancel button deselects

Additionally, when in click-to-assign mode:
- Destination cards should show a subtle highlight on hover indicating they're valid drop targets
- Cursor changes to a crosshair or pointer on valid targets

---

## Files to Modify

| File | Change |
|------|--------|
| `InteractiveMappingRow.tsx` | Restyle suggestion pill as button; adjust skip button opacity |
| `SourceLayerRow.tsx` | Change skip button from `opacity-0` to `opacity-40`; add touch media query |
| `DraggableSourceCard.tsx` | Enhance selected state visual feedback |
| `IndividualsPhase.tsx` / `FinalizePhase.tsx` | Add click-to-assign mode indicator bar at top of right panel |
| `DraggableUserCard.tsx` | Add hover highlight when click-to-assign mode is active |

---

## Acceptance Criteria

- [ ] Suggestion pill reads as a button — rectangular shape, stronger background, cursor pointer, prepended icon
- [ ] Skip button visible at 40% opacity by default; full opacity on hover; full opacity on touch devices
- [ ] Click-to-assign mode shows a contextual bar identifying the selected source and offering Cancel/Esc
- [ ] Destination cards show hover highlight during click-to-assign mode
- [ ] All changes work on both desktop (mouse) and touch (tablet) devices
- [ ] Suggestion pill has `role="button"` and descriptive `aria-label`
