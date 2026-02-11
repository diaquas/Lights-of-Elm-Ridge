# Ticket 56 — Rethinking the End Game: New "Finalize" Phase + Review Overhaul

## The Problem

The current Review phase tries to be two things at once — a final working checklist AND a metrics dashboard — and does neither well. The actual work of fixing, rematching, and filling gaps is scattered across the mapping phases or buried in an export-time modal. Users finish the mapping steps feeling "done" but then hit a wall of metrics that don't help them take action. Key pain points:

1. **No clear picture of "what will my display actually look like?"** — the review shows sequence coverage stats but doesn't give users a working view of both sides (source sequence → my display)
2. **Undoing bad matches is buried** — you have to go back into the mapping phases to unmatch/rematch. There's no central place to see all your decisions and fix them.
3. **Double-mapping (many-to-one) isn't discoverable** — mapping the same source to multiple destinations is powerful but there's no obvious way to do it
4. **The coverage boost is at export time** — too late. Users should see and act on display coverage gaps before they hit Export, not in a surprise modal.
5. **Review is read-only in practice** — the Details table has a remove button, but there's no way to remap, duplicate, or reassign from there

## The Proposal: Add a "Finalize" Phase

Insert a new **Finalize** phase between Submodels and Review in the stepper:

```
Upload → Auto-Matches → Groups → Models → Submodels → FINALIZE → Review
```

**Finalize** is the interactive working checklist — where you audit, fix, and optimize.
**Review** becomes purely metrics, celebration, and export.

This separation is clean: Finalize = "make it right," Review = "see the results and ship it."

---

## Finalize Phase — The Working Checklist

### Layout: Dual-Pane View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FINALIZE — Audit & Optimize                                               │
│  Sequence coverage: 22/22 ✓   ·   Display coverage: 75% (15/20 groups)    │
├──────────────────────────────┬──────────────────────────────────────────────┤
│                              │                                              │
│   SOURCE SEQUENCE            │   MY DISPLAY                                │
│   (what the sequence has)    │   (what my layout needs)                    │
│                              │                                              │
│   Every source layer with    │   Every group/model in my layout            │
│   its destination(s)         │   with its source assignment(s)             │
│                              │                                              │
└──────────────────────────────┴──────────────────────────────────────────────┘
```

Two side-by-side panels that answer two different questions:

### Left Panel — Source Sequence View
"Where is each source layer going?"

```
▾ MAPPED SOURCES (22)
  ┌───────────────────────────────────────────┐
  │ GRP - ALL SPINNERS                        │
  │   → All Spinners (my layout)         [×]  │
  │   + Add another destination                │
  ├───────────────────────────────────────────┤
  │ GRP - ALL ARCHES                          │
  │   → All Arches (my layout)           [×]  │
  │   + Add another destination                │
  ├───────────────────────────────────────────┤
  │ GRP - MEGA TREE                           │
  │   → Mega Tree (my layout)            [×]  │
  │   → Mini Trees (my layout)           [×]  │  ← many-to-one!
  │   + Add another destination                │
  └───────────────────────────────────────────┘

▸ SKIPPED SOURCES (3)
  ...
```

Key interactions:
- **[×] Remove** — unmaps that destination from the source. Item goes back to unmapped on the right panel.
- **"+ Add another destination"** — opens a picker showing unmapped groups/models from the user's layout. This is how many-to-one mapping becomes discoverable and easy. User clicks a source, clicks "+ Add another destination," picks a group from their layout, done.
- **Click on a source** — highlights its destination(s) on the right panel (visual cross-reference)

### Right Panel — My Display View
"What's happening with each part of my display?"

```
▾ RECEIVING EFFECTS (15 groups)
  ┌───────────────────────────────────────────┐
  │ All Spinners                              │
  │   ← GRP - ALL SPINNERS              [×]  │
  │   Change source ▾                         │
  ├───────────────────────────────────────────┤
  │ Mega Tree                                 │
  │   ← GRP - MEGA TREE                 [×]  │
  │   Change source ▾                         │
  └───────────────────────────────────────────┘

▾ DARK — NO EFFECTS (5 groups)               ← this is the gap
  ┌───────────────────────────────────────────┐
  │ ⚠ All Pumpkins  (3 models)               │
  │   No source assigned                      │
  │   💡 Suggested: GRP - ALL TOMBSTONES (82% match)  [Accept]  │
  ├───────────────────────────────────────────┤
  │ ⚠ All Trees  (2 models)                  │
  │   No source assigned                      │
  │   💡 Suggested: GRP - ALL ARCHES (74% match)  [Accept]      │
  │   Or: Choose a source ▾                   │
  └───────────────────────────────────────────┘
```

**No artificial cap on suggestions.** The old export-time modal was compact and implicitly limited how many suggestions you'd show. In Finalize, there's no such constraint — show **every** unmapped group/model that has a suggestion scoring ≥ 70% match. If 15 groups are dark and 12 of them have viable suggestions, show all 12. The panel scrolls, the collapsible sections keep it manageable, and the user can accept/skip each one individually. The whole point of moving this into a full phase is to give it room to breathe.

Key interactions:
- **[×] Remove** — unmaps, item moves to "Dark" section
- **"Change source"** — dropdown to reassign to a different source layer without unmap/remap dance
- **"Accept" on suggestions** — one-click many-to-one assignment (this replaces the export-time coverage boost modal)
- **"Choose a source"** — manual picker for items with no good suggestion
- **Click on a display item** — highlights its source(s) on the left panel

### Coverage Bars (Persistent Header)
Both metrics live at the top of Finalize, always visible:

```
Sequence coverage: ████████████████████  22/22 (100%)  ✓
Display coverage:  ███████████████░░░░░  15/20 (75%)   ← updates live as you work
```

Display coverage updates in real-time as users accept suggestions, add destinations, or remove mappings. Watching it climb to 100% is satisfying and motivating.

---

## Actions Available in Finalize

All in one place, no need to go back to earlier phases:

| Action | How | Where |
|---|---|---|
| **Unmap** a destination | Click [×] on either panel | Both panels |
| **Remap** to a different source | "Change source ▾" dropdown | Right panel |
| **Double-map** (many-to-one) | "+ Add another destination" | Left panel |
| **Accept a coverage suggestion** | Click [Accept] on suggestion | Right panel, "Dark" section |
| **Manually assign** an unmapped item | "Choose a source ▾" | Right panel, "Dark" section |
| **Skip** a source entirely | Move to Skipped section | Left panel |

---

## What Happens to the Coverage Boost?

The export-time coverage boost modal (**from modiq-export-coverage-boost.md**) is **replaced** by the Finalize phase's right panel "Dark — No Effects" section. All of its functionality moves here:

- Display coverage metric → persistent header in Finalize
- Suggested many-to-one matches → inline suggestions on unmapped items
- Group-to-group matching logic → same algorithm, surfaced earlier
- Spinner/submodel matching → same logic, shown inline

**Benefits of moving it earlier:**
- Users see gaps before they're about to export (less jarring)
- They can iterate — accept a suggestion, see coverage climb, try another
- No surprise modal at the finish line
- The Finalize phase gives context (both panels) that a modal can't

**What stays at export time:** If the user skips Finalize entirely (clicks through to Review fast), we can still show a lightweight prompt: "Display coverage is 75% — go back to Finalize to fill gaps?" But it's a nudge, not the primary workflow.

---

## Review Phase — Streamlined to Metrics + Export

With Finalize handling the interactive work, Review becomes a clean summary:

### What stays:
- Hero completion percentage + progress ring
- Breakdown by mapping type (auto, groups, individuals, submodels)
- Breakdown by confidence level
- Sequence coverage + display coverage final numbers
- Export button
- Celebration/confetti on export

### What moves to Finalize:
- The Details table with remove buttons → Finalize panels
- Any interactive editing → Finalize
- Coverage boost suggestions → Finalize

### What's new in Review:
- **Mapping changelog** — a compact summary of what was added/changed in Finalize (e.g., "3 groups added via coverage suggestions, 1 remapped, 2 skipped"). Gives the user confidence they know what changed before exporting.
- **Side-by-side summary counts:**
  ```
  Source Sequence          My Display
  ──────────────          ──────────
  22 layers mapped        15/20 groups active
  3 skipped               5 groups dark
  4 many-to-one links     100% display coverage ✓
  ```

---

## Stepper Bar Update

The stepper adds one new pill:

```
✓ Upload — ✓ Auto-Matches (117) — ✓ Groups (9) — ✓ Models (53) — ✓ Submodels (83) — ◉ Finalize — Review
```

Finalize gets a unique icon (checklist or audit icon) to differentiate it from the mapping phases. It should feel like a capstone step, not another mapping round.

---

## Edge Cases

### User has 100% display coverage already
Finalize right panel has no "Dark" section — just "Receiving Effects" with everything green. Users can still remap/double-map if they want, but there's no urgency. A banner: "All groups in your display are receiving effects. You're good to go, or fine-tune below."

### User skips Finalize
They can click through to Review without making changes. Review still shows the final numbers. At export, if display coverage < 100%, a gentle nudge: "Display coverage is X% — go back to Finalize?" Not a blocker.

### Very large layouts (200+ models)
Both panels need the search bar + the Ticket 52/55 collapsible section pattern to stay manageable. Finalize panels should support search and filtering by status (mapped/unmapped/suggested).

### Conflicting many-to-one
A user maps Source A → Destination 1, then also maps Source B → Destination 1. That's fine — a destination can receive from multiple sources. But Finalize should flag this visually on the right panel: "Receiving from: Source A, Source B" so the user knows effects are stacking.

---

## Implementation Priority

1. **Finalize phase scaffold** — new step in stepper, dual-pane layout, basic source/display views
2. **Right panel "Dark" section with suggestions** — migrate coverage boost logic here
3. **Left panel "+ Add another destination"** — many-to-one from the source side
4. **Cross-highlighting** — click left highlights right, click right highlights left
5. **Live coverage bar** — real-time updates as user makes changes
6. **Review phase cleanup** — strip interactive elements, add changelog summary
7. **Export nudge** — lightweight fallback if user skips Finalize with low display coverage
