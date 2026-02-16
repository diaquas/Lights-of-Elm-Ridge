# Ticket 95 — Responsive Layout & Touch Targets

**Priority:** P1 — Mobile/tablet usability
**Applies to:** ModIQ two-panel mapping workspace, interactive controls
**Audit items:** Two-panel layout doesn't collapse on mobile — both panels squeezed unreadably; touch targets (skip btn 28px, remove-link 20px) below 44px minimum

---

## Current State

### Two-Panel Layout
The mapping workspace uses a hardcoded 50/50 split:
- `IndividualsPhase.tsx:548,969` — `w-1/2` on both panels
- `FinalizePhase.tsx:557` — same pattern

On viewports narrower than ~900px, both panels are squeezed to ~450px or less. Model names truncate, buttons stack awkwardly, and the workspace becomes unusable on tablets and phones. There is no responsive breakpoint — the layout is fixed.

### Touch Targets Below Minimum
Apple's Human Interface Guidelines and WCAG 2.5.5 require 44×44px minimum touch targets. Current sizes:

| Element | Size | Location | Minimum |
|---------|------|----------|---------|
| Skip button | `w-7 h-7` (28×28px) | `SourceLayerRow.tsx:486` | 44×44px |
| Remove link | `w-5 h-5` (20×20px) | `SourceLayerRow.tsx:291` | 44×44px |
| Remove in expansion | `w-4 h-4` (16×16px) | `DraggableUserCard.tsx:182` | 44×44px |
| Drag handle | implicit, ~24px | `DraggableSourceCard.tsx` | 44×44px |
| Suggestion pill | ~32px height | `InteractiveMappingRow.tsx` | 44×44px |
| Drag cards | `min-h-[38px]` | `DraggableUserCard.tsx:98` | 44×44px |

---

## Proposed Changes

### 1. Responsive Panel Layout
Replace the fixed `w-1/2` split with a responsive layout:

```tsx
{/* Container */}
<div className="flex flex-col md:flex-row gap-4 h-full">
  {/* Left panel — full width on mobile, half on desktop */}
  <div className="w-full md:w-1/2 ...">
    {/* Source layers */}
  </div>

  {/* Right panel */}
  <div className="w-full md:w-1/2 ...">
    {/* Display models */}
  </div>
</div>
```

**Mobile (< 768px) behavior:**
- Panels stack vertically
- Add a sticky tab bar at the top: **[Sequence Layers] [Your Display]** — tapping toggles which panel is visible
- Only one panel visible at a time to maximize screen real estate
- When assigning via click-to-assign, auto-switch to the destination panel

**Tablet (768px–1024px) behavior:**
- Panels side by side but with reduced padding
- Font sizes remain at floor (12px+)
- Consider 45/55 split favoring the active panel

### 2. Touch Target Enforcement
Enforce 44×44px **minimum hit area** on all interactive elements. The visual size can remain smaller — use padding to expand the touch area:

```tsx
{/* Skip button — visual 28px, touch 44px */}
<button className="w-7 h-7 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
  <SkipIcon className="w-4 h-4" />
</button>

{/* Remove link — visual 20px, touch 44px */}
<button className="w-5 h-5 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center">
  <XIcon className="w-3 h-3" />
</button>
```

Alternatively, use negative margins to expand the touch area without affecting layout:
```css
.touch-target {
  position: relative;
}
.touch-target::after {
  content: '';
  position: absolute;
  inset: -8px; /* expands hit area by 8px in all directions */
}
```

### 3. Touch-Specific Visibility
Use `@media (hover: none)` to ensure all hover-revealed controls are visible on touch:

```css
@media (hover: none) {
  .group-hover\:opacity-100 {
    opacity: 1 !important;
  }
}
```

Or in Tailwind:
```tsx
className="opacity-0 group-hover:opacity-100 touch:opacity-100"
```

(Requires adding a `touch` variant to Tailwind config based on `@media (hover: none)`)

### 4. Card Minimum Heights
Increase interactive card minimum heights for touch:

| Element | Current | Proposed |
|---------|---------|----------|
| Drag cards | `min-h-[38px]` | `min-h-[44px]` |
| Source layer rows | ~36px | `min-h-[44px]` |
| Suggestion pills | ~32px | `min-h-[44px]` (touch) / keep 32px (desktop) |

---

## Files to Modify

| File | Change |
|------|--------|
| `IndividualsPhase.tsx` | Replace `w-1/2` with responsive `w-full md:w-1/2`; add mobile tab switcher |
| `FinalizePhase.tsx` | Same responsive layout change |
| `SourceLayerRow.tsx` | Increase skip/remove button touch areas to 44px; show on touch devices |
| `DraggableUserCard.tsx` | Increase remove button touch area; bump min-height to 44px |
| `DraggableSourceCard.tsx` | Increase drag handle touch area |
| `InteractiveMappingRow.tsx` | Increase suggestion pill touch area; show skip on touch |
| `tailwind.config.ts` | Add `touch` variant for `@media (hover: none)` |

---

## Acceptance Criteria

- [ ] Panels stack vertically on viewports < 768px with tab switcher
- [ ] Tab switcher toggles between "Sequence Layers" and "Your Display" panels
- [ ] Panels are side-by-side on viewports ≥ 768px
- [ ] All interactive elements have ≥ 44×44px touch area
- [ ] Hover-revealed controls are always visible on touch devices
- [ ] Card minimum heights are 44px on touch devices
- [ ] No horizontal scrolling on any viewport width ≥ 320px
- [ ] Test on iPad Safari and Chrome Android at minimum
