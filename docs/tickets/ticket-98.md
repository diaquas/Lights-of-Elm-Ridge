# Ticket 98 — Surface CoverageBoostPrompt Earlier in Workflow

**Priority:** P1 — Workflow design
**Applies to:** ModIQ CoverageBoostPrompt timing and presentation
**Audit item:** CoverageBoostPrompt only appears at export time, surprising users who thought they were done

---

## Current State

The CoverageBoostPrompt triggers **only** inside `handleExport()` (`ModIQTool.tsx:2306-2354`):

1. User clicks "Export"
2. Code checks if `unmappedLayerCount === 0` (all sources handled)
3. Computes display coverage via `computeDisplayCoverage()`
4. Checks if `unmappedUserGroups.length > 0` (display model gaps exist)
5. If boost suggestions are available (`groupSuggestions.length > 0 || spinnerSuggestions.length > 0`), shows a **full-screen modal** (`CoverageBoostPrompt.tsx:128-131` — `fixed inset-0 z-50`)

This creates a poor user experience:
- User finishes mapping, feels done, clicks "Export"
- Surprise modal appears asking them to do more work
- The modal is full-screen and jarring — it feels like a blocker, not a helpful suggestion
- The concept of "display coverage" vs "sequence coverage" shifts at this point, confusing users who were tracking one metric throughout the workflow

---

## Proposed Changes

### 1. Inline Coverage Boost Section in FinalizePhase
Move boost suggestions into the FinalizePhase as a **dedicated inline section**, visible alongside the mapping workspace. Show it when:
- All source layers are mapped or skipped (same condition as current)
- Unmapped user groups exist with available suggestions

```
┌────────────────────────────────────────────────────────────┐
│ 📊 Display Coverage: 78%                                   │
│ 5 model groups on your display don't have source content   │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ☐ Arch Group 3 (12 models) → duplicate from Arch 1  │   │
│ │ ☐ Mini Tree Row B (8 models) → duplicate from Row A  │   │
│ │ ☐ Spinner 4 → pair with Spinner 2                    │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                            │
│ Accepting these would bring coverage to 94%                │
│                      [Accept Selected]   [Skip, Continue]  │
└────────────────────────────────────────────────────────────┘
```

This section:
- Is **inline**, not a modal — visible in context alongside the mapping workspace
- Shows a live coverage percentage that updates as users check/uncheck suggestions
- Uses checkboxes for each suggestion (same interaction as current CoverageBoostPrompt)
- Has clear "Accept" and "Skip" actions

### 2. Persistent Coverage Bar
Add a coverage indicator to the top of FinalizePhase that tracks display coverage alongside sequence coverage:

```
Sequence: 100% ✓ | Display: 78% — 5 unmapped groups [Boost ↑]
```

The "Boost" link scrolls to / expands the inline boost section.

This teaches users about both coverage metrics **during** mapping, not as a surprise at export.

### 3. Non-Blocking Export Warning
If a user reaches export with < 100% display coverage and hasn't interacted with the boost section, show a **non-blocking** warning instead of the current full-screen modal:

```
┌──────────────────────────────────────────────────────────┐
│ ⚠ Exporting at 78% display coverage                      │
│ 5 model groups on your display won't have mapped content │
│                                                          │
│ [Export Anyway]     [Go Back and Boost Coverage]          │
└──────────────────────────────────────────────────────────┘
```

This is a standard confirmation dialog, not a full-screen takeover. It respects the user's intent to export while flagging the gap.

### 4. Remove Surprise Modal
Remove the full-screen CoverageBoostPrompt modal from the export path entirely. The only exception: if **new** boost suggestions become available between FinalizePhase and export (edge case — e.g., user made changes in ReviewPhase that opened new suggestions). In that case, show the non-blocking warning with a note that new suggestions are available.

### 5. Dual Coverage Metrics Throughout
The current workflow tracks "sequence coverage" (how much of the source is used) during mapping but only reveals "display coverage" (how many destination models are lit) at export time. Fix this by showing both metrics from the start of the mapping workspace:

- **MappingProgressBar** — Add display coverage as a secondary metric
- **Phase headers** — Show both: "Sequence: 95% | Display: 78%"
- This prevents the "thought I was done" surprise

---

## Files to Modify

| File | Change |
|------|--------|
| `FinalizePhase.tsx` | Add inline boost section; add persistent coverage bar with both metrics |
| `CoverageBoostPrompt.tsx` | Refactor into inline component (remove `fixed inset-0`); keep checkbox logic |
| `ModIQTool.tsx` | Remove boost modal from `handleExport()`; replace with non-blocking confirmation dialog |
| `MappingProgressBar.tsx` | Add display coverage as secondary metric |
| `ReviewPhase.tsx` | Show dual coverage metrics |

---

## Acceptance Criteria

- [ ] Boost suggestions appear inline in FinalizePhase, not as a modal at export time
- [ ] Persistent coverage bar shows both sequence and display coverage percentages
- [ ] Live coverage projection updates as users check/uncheck boost suggestions
- [ ] Export with < 100% display coverage shows a non-blocking confirmation dialog
- [ ] Full-screen CoverageBoostPrompt modal is removed from the export path
- [ ] Both coverage metrics visible from the start of the mapping workspace
- [ ] Users who had 100% display coverage never see the boost section (it doesn't appear)
- [ ] "Boost" link in coverage bar scrolls to the inline boost section
