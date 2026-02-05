# ModIQ: Unmapped Row State & Pick-Match Popover

Addendum to the compact card spec. Addresses two issues: the confusing "mapped but NONE" limbo state and the clipped inline search.

---

## Issue 1: Unmapped Row State Rules

### The Rule

A row is either **mapped** or **unmapped**. No in-between.

**Mapped** = a source model is assigned, an arrow is shown, the row lives in a confidence section (High / Medium / Low).

**Unmapped** = no source model is assigned, the row lives in Needs Mapping, the drop zone is active.

There is no state where a source model name appears in the primary mapping position AND the row says "NONE" or lives in Needs Mapping. That state is eliminated.

### Threshold Logic

```
Score ≥ 0.85  →  Mapped, HIGH confidence section
Score ≥ 0.60  →  Mapped, MEDIUM confidence section
Score ≥ 0.40  →  Mapped, LOW confidence section
Score < 0.40  →  UNMAPPED, Needs Mapping section
```

### Unmapped Row Display

When a model scores below 0.40 (or has no viable match at all), it shows in Needs Mapping with this treatment:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ○  VERTICAL MATRIX 2                                       [▾] [⊘]   │
│     160px · Matrix                                                     │
│     💡 Eave 15 - Ellis Right (28%)                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

**What's present:**
- ○ open dot (unmapped indicator)
- Their model name (bold, prominent, white)
- Metadata line: pixel count, type
- 💡 suggestion line: best candidate name + score in amber, clearly a suggestion
- [▾] pick-match button (opens popover)
- [⊘] skip button

**What's NOT present:**
- No arrow (→)
- No source model name in the primary/mapping position
- No "NONE" badge — the absence of a mapping is communicated by the open dot, the position in "Needs Mapping," and the active drop zone
- No inline search field

**The entire row is a drop target.** Drag a source card onto it → mapped. Click anywhere in the row → opens the pick-match popover. Click [⊘] → skipped.

### No-Suggestion Variant

If ModIQ truly has no candidate (score is 0 or the model type has no equivalent in the source):

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ○  P10_VIDEO_WALL                                          [▾] [⊘]   │
│     12288px · Matrix                                                   │
│     No close matches in source layout                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

The suggestion line becomes "No close matches in source layout" in zinc-500 (muted). Skip is the most likely action here, but the user can still pick manually via [▾] or drag.

### State Transitions

```
UNMAPPED (Needs Mapping)
  │
  ├── User drags source onto row ──────→ MAPPED (goes to confidence section)
  ├── User clicks suggestion (💡) ─────→ MAPPED (LOW, since suggestion was < 0.40)
  ├── User picks from popover (▾) ─────→ MAPPED (confidence based on what they picked)
  ├── User clicks skip (⊘) ───────────→ SKIPPED (goes to Skipped section)
  │
  └── (stays unmapped until user acts)


MAPPED (any confidence section)
  │
  ├── User clicks ✕ ──────────────────→ UNMAPPED (back to Needs Mapping)
  ├── User clicks ↻ or drags new ─────→ MAPPED (different source, recalculate confidence)
  ├── User swaps with another row ────→ MAPPED (both rows update)
  │
  └── (stays mapped)


SKIPPED
  │
  ├── User clicks un-skip ────────────→ UNMAPPED (back to Needs Mapping)
  │
  └── (stays skipped, doesn't count toward total)
```

---

## Issue 2: Pick-Match Popover

### What It Replaces

The inline search field that currently renders inside the unmapped row card. That approach had two problems:
1. The dropdown results clip behind adjacent containers
2. It adds height to the card, breaking the compact layout

### The Popover

A fixed-position combobox that opens when the user clicks [▾] or clicks anywhere in an unmapped row's drop zone area. It renders above all other content via a portal (React) or `position: fixed` with calculated anchor coordinates.

### Anatomy

```
┌───────────────────────────────────────────────┐
│  🔍  Search source models...                   │  ← search input, autofocused
├───────────────────────────────────────────────┤
│  SUGGESTIONS                                   │  ← amber label
│                                                │
│  ⠿ Eave 15 - Ellis Right   72px  LINE   28%  │  ← best match
│  ⠿ Driveway Left          500px  LINE   12%  │  ← 2nd best
│  ⠿ Fence Panel 7        12635px  MATRIX   4% │  ← distant 3rd
│                                                │
├───────────────────────────────────────────────┤
│  ALL AVAILABLE                                 │  ← zinc-500 label
│                                                │
│  ⠿ Driveway Left          500px  LINE         │
│  ⠿ Tree Real 4            250px  TREE         │
│  ⠿ Tree - Spiral 8        100px  TREE         │
│  ⠿ Tree Real 3            250px  TREE         │
│  ⠿ Tree Real 2            250px  TREE         │
│  ⠿ Tree 1 - Fork Right    200px  TREE         │
│  ⠿ Fence Panel 7        12635px  MATRIX       │
│  ⠿ Fence Panel 6        12635px  MATRIX       │
│  ⠿ Fence Panel 5        12635px  MATRIX       │
│  ...                                           │
│                                                │
├───────────────────────────────────────────────┤
│  ⊘  Skip this model                           │  ← bottom action
└───────────────────────────────────────────────┘
```

### Behavior

**Opening:**
- Click [▾] on an unmapped row → popover opens anchored to that row
- Click anywhere in the unmapped row's body (not on skip) → same
- Keyboard: Tab to unmapped row, Enter → opens popover

**Search:**
- Search input is autofocused on open
- Typing filters both Suggestions and All Available in real-time
- Filters on model name AND type (typing "tree" shows all tree models)
- Empty search shows full list

**Suggestions section:**
- Shows top 3 candidates by match score (only if score > 0)
- Each row shows: drag handle, name, pixels, type badge, score percentage
- Score percentage in amber for visual consistency with the 💡 suggestion on the unmapped row
- If no suggestions exist (all scores are 0), this section is hidden

**All Available section:**
- Shows all unmapped source models
- Sorted alphabetically by default, or by type clusters
- Each row shows: drag handle, name, pixels, type badge
- No score shown here (these aren't ranked, they're browsable)
- Already-mapped source models are excluded from this list (they don't appear at all, keeping the list clean)

**Selection:**
- Click any row → model is mapped to the target row, popover closes
- The newly mapped row animates from Needs Mapping into the appropriate confidence section
- Right panel updates (source card moves from unmapped to mapped state)
- Progress bar updates

**Closing:**
- Click outside the popover → closes, no change
- Escape key → closes, no change
- Click "Skip this model" → closes, model moves to Skipped section

**Scroll:**
- Popover has its own internal scroll if the list is long
- Max height: 400px (roughly 10 items visible)
- Scrollbar styled to match the dark theme

### CSS

```css
.pick-popover {
  position: fixed;
  width: 380px;
  max-height: 400px;
  background: var(--zinc-900);
  border: 1px solid var(--zinc-700);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(255, 255, 255, 0.05);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pick-popover .search-wrapper {
  padding: 8px;
  border-bottom: 1px solid var(--zinc-800);
  flex-shrink: 0;
}

.pick-popover .search-input {
  width: 100%;
  height: 32px;
  padding: 0 10px 0 32px;
  font-size: 13px;
  background: var(--zinc-800);
  border: 1px solid var(--zinc-700);
  border-radius: 4px;
  color: var(--zinc-200);
  outline: none;
}

.pick-popover .search-input:focus {
  border-color: var(--zinc-500);
}

.pick-popover .search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--zinc-500);
  font-size: 13px;
  pointer-events: none;
}

.pick-popover .results {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.pick-popover .section-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--zinc-500);
  padding: 8px 12px 4px;
  position: sticky;
  top: 0;
  background: var(--zinc-900);
}

.pick-popover .section-label.suggestions {
  color: var(--amber-400);
}

.pick-popover .result-row {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  gap: 8px;
  cursor: pointer;
  transition: background 0.1s;
}

.pick-popover .result-row:hover {
  background: var(--zinc-800);
}

.pick-popover .result-row .name {
  font-size: 13px;
  font-weight: 500;
  color: var(--zinc-200);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pick-popover .result-row .type-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--zinc-800);
  color: var(--zinc-400);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}

.pick-popover .result-row .pixels {
  font-size: 11px;
  color: var(--zinc-500);
  flex-shrink: 0;
  min-width: 48px;
  text-align: right;
}

.pick-popover .result-row .score {
  font-size: 11px;
  color: var(--amber-400);
  flex-shrink: 0;
  min-width: 32px;
  text-align: right;
}

.pick-popover .skip-action {
  padding: 8px 12px;
  border-top: 1px solid var(--zinc-800);
  font-size: 12px;
  color: var(--zinc-500);
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pick-popover .skip-action:hover {
  color: var(--zinc-300);
  background: var(--zinc-850);
}
```

### Positioning Logic

```javascript
function positionPopover(triggerRow, popoverEl) {
  const rect = triggerRow.getBoundingClientRect();
  const popoverHeight = popoverEl.offsetHeight;
  const viewportHeight = window.innerHeight;

  // Default: anchor below the row, left-aligned
  let top = rect.bottom + 4;
  let left = rect.left;

  // If popover would overflow bottom, flip to above
  if (top + popoverHeight > viewportHeight - 16) {
    top = rect.top - popoverHeight - 4;
  }

  // If popover would overflow right, nudge left
  const popoverWidth = 380;
  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16;
  }

  popoverEl.style.top = `${top}px`;
  popoverEl.style.left = `${left}px`;
}
```

Popover appears directly below the row that triggered it. If there's not enough room below (near bottom of viewport), it flips to above. Standard combobox positioning pattern.

### Keyboard Navigation Inside Popover

| Key | Action |
|-----|--------|
| ↓ / ↑ | Move highlight through results |
| Enter | Select highlighted result (maps it) |
| Escape | Close popover, no change |
| Type | Filters the list (search input is focused) |
| Tab | Close popover (focus moves to next unmapped row) |

### Accessibility

- Popover has `role="listbox"`, results have `role="option"`
- Search input has `role="combobox"` with `aria-expanded="true"`
- Active/highlighted result has `aria-selected="true"`
- Trigger button has `aria-haspopup="listbox"`

---

## Interaction Summary After Both Fixes

**An unmapped row now has exactly 3 ways to get mapped:**

1. **Drag** a source card from the right panel onto the row
2. **Click** the row or [▾] → popover opens → pick from list
3. **Click** the 💡 suggestion text directly → maps immediately (one click)

**And 1 way to dismiss:**

4. **Click** [⊘] skip → moves to Skipped section

No inline search field. No ambiguous "mapped but NONE" state. No clipping. Clean.
