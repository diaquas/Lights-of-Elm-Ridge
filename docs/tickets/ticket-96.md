# Ticket 96 — List Virtualization for Large Model Sets

**Priority:** P1 — Performance
**Applies to:** ModIQ mapping workspace — source and destination model lists
**Audit item:** No list virtualization — 200+ models render all DOM nodes simultaneously

---

## Current State

All model lists render every item to the DOM with `.map()`:

- **`FinalizePhase.tsx:698-805`** — Renders all `filteredItems` using `.map()`:
  - Line 742-751: Ungrouped items via `ungrouped.map((item) => <DestItemCard ... />)`
  - Line 773-783: All model groups via `[...superGroups, ...regularGroups].flatMap(...)`
  - Line 785-794: All ungrouped items mapped directly
- **`ModIQTool.tsx:2567-2597`** — Legacy V3 layout also renders unmapped layers without virtualization
- **`IndividualsPhase.tsx`** — Both left and right panels render all items

For a typical display with 50-100 models, this is fine. But power users with 200+ models (common in large Christmas displays with many spinners) will see:
- All DOM nodes rendered simultaneously
- Linear memory growth with model count
- Frame drops during scroll on lower-end machines
- Slow initial render of the mapping workspace

There is no `react-window`, `react-virtuoso`, or `@tanstack/react-virtual` in the project's dependencies.

---

## Proposed Changes

### 1. Add Virtualization Library
Install `@tanstack/react-virtual` (lightweight, ~3KB, framework-agnostic, maintained):

```bash
npm install @tanstack/react-virtual
```

Alternatives considered:
- `react-window` — mature but less flexible with variable heights
- `react-virtuoso` — heavier (~15KB) but auto-measures row heights
- `@tanstack/react-virtual` — best balance of size, flexibility, and variable row height support

### 2. Virtualize Source Layer List (Left Panel)
Wrap the source layer list in both `IndividualsPhase` and `FinalizePhase`:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: filteredLayers.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 52, // estimated row height in px
  overscan: 10, // render 10 extra items above/below viewport
});

return (
  <div ref={parentRef} className="overflow-auto h-full">
    <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const layer = filteredLayers[virtualRow.index];
        return (
          <div
            key={layer.id}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${virtualRow.start}px)`,
              width: '100%',
            }}
          >
            <SourceLayerRow layer={layer} ... />
          </div>
        );
      })}
    </div>
  </div>
);
```

### 3. Virtualize Destination Model List (Right Panel)
Same approach for the right panel's model cards. Variable height rows (families expand/collapse) require `measureElement`:

```tsx
const virtualizer = useVirtualizer({
  count: filteredModels.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48,
  overscan: 10,
  measureElement: (el) => el.getBoundingClientRect().height,
});
```

### 4. Activation Threshold
Only enable virtualization when lists exceed 50 items. Below that, render normally to avoid unnecessary complexity:

```tsx
const useVirtualization = filteredItems.length > 50;
```

### 5. Preserve Scroll Position
When switching between phases or applying filters:
- Save `scrollTop` before transition
- Restore after render
- When auto-advancing to next unmapped layer, `scrollToIndex(nextIndex)` to keep it in view

### 6. Search/Filter Compatibility
Virtualization works on the filtered data array, not the DOM. When the user types in the search box:
- Filter the source array → `filteredLayers`
- Virtualizer re-renders with the new count
- Scroll resets to top (expected behavior when filter changes)

---

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `@tanstack/react-virtual` dependency |
| `IndividualsPhase.tsx` | Virtualize both left and right panel lists |
| `FinalizePhase.tsx` | Virtualize model list and group list |
| `ModIQTool.tsx` | Virtualize legacy V3 unmapped layers list (if still in use) |

---

## Performance Targets

| Metric | Before (200 models) | After (200 models) |
|--------|---------------------|-------------------|
| DOM nodes in list | ~200 rows × ~8 elements = 1,600 | ~30 rows × ~8 elements = 240 |
| Initial render time | ~300-500ms | ~50-100ms |
| Scroll frame rate | May drop below 30fps | Consistent 60fps |
| Memory usage | All items in DOM | Only visible + overscan |

---

## Acceptance Criteria

- [ ] `@tanstack/react-virtual` added as dependency
- [ ] Source layer list virtualized in IndividualsPhase and FinalizePhase
- [ ] Destination model list virtualized in both phases
- [ ] Virtualization only activates when list exceeds 50 items
- [ ] Scroll position preserved when auto-advancing to next unmapped layer
- [ ] Search/filter works correctly with virtualized lists
- [ ] No visual difference for lists under 50 items (renders normally)
- [ ] Verified smooth 60fps scrolling with 200+ item list
