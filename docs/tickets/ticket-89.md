# Ticket 89 — Skip-to-Export Shortcut on High Auto-Match Coverage

**Priority:** P1 — Workflow efficiency
**Applies to:** ModIQ post-auto-match phase transition
**Audit item:** No "skip to export" shortcut when auto-match achieves 85%+ coverage

---

## Current State

After auto-matching completes, the wizard forces users through all phases sequentially regardless of how good the auto-match was. Relevant code:

- `FinalizePhase.tsx:140-141` — Only checks for `>= 100%` coverage to show completion state
- `ReviewPhase.tsx:61-63` — Nudges users back if `< 100%` with no early-exit path
- No threshold-based shortcut exists anywhere in the phase transition logic

For a user whose display is a close match to the source (common when both use the same vendor's spinners), auto-match may hit 90%+ coverage immediately. Forcing them through IndividualsPhase → FinalizePhase → ReviewPhase is unnecessary friction — they just want to export and go.

---

## Proposed Changes

### 1. Post-Auto-Match Coverage Check
After auto-matching completes and before entering the mapping workspace, evaluate coverage:

```typescript
const sequenceCov = computeSequenceCoverage();
const displayCov = computeDisplayCoverage();

if (sequenceCov.percent >= 85 && displayCov.percent >= 80) {
  showFastTrackBanner = true;
}
```

### 2. Fast-Track Banner
When coverage thresholds are met, show a prominent banner at the top of the first mapping phase:

```
┌─────────────────────────────────────────────────────────┐
│ ✓ Great match — 92% coverage achieved automatically     │
│                                                         │
│ [Review & Export]          [Fine-tune mappings first]   │
└─────────────────────────────────────────────────────────┘
```

- **"Review & Export"** jumps directly to ReviewPhase, skipping manual mapping
- **"Fine-tune mappings first"** dismisses the banner and enters normal workflow
- Banner is non-blocking — the mapping workspace is visible behind it

### 3. ReviewPhase Early-Export Support
When arriving at ReviewPhase via fast-track:
- Show the mapping summary as normal (so users can verify)
- Add a "Go back and fine-tune" button (in case they spot issues during review)
- Export button works exactly as it does today

### 4. Configurable Threshold
Store the threshold in a constant that can be easily adjusted:
```typescript
const FAST_TRACK_SEQUENCE_THRESHOLD = 85;
const FAST_TRACK_DISPLAY_THRESHOLD = 80;
```

The thresholds are intentionally different: sequence coverage (how much of the source is used) matters more than display coverage (how many destination models are lit up) because unmapped destination models simply stay dark, which is acceptable.

---

## Files to Modify

| File | Change |
|------|--------|
| `ModIQTool.tsx` | Add post-auto-match coverage check; add fast-track phase transition |
| `IndividualsPhase.tsx` or `FinalizePhase.tsx` | Render fast-track banner when threshold met |
| `ReviewPhase.tsx` | Support "arrived via fast-track" state with "go back" option |

---

## Acceptance Criteria

- [ ] When auto-match achieves ≥85% sequence + ≥80% display coverage, fast-track banner appears
- [ ] "Review & Export" jumps to ReviewPhase; "Fine-tune" enters normal mapping workflow
- [ ] Users can always go back to manual mapping from ReviewPhase
- [ ] Thresholds are configurable constants, not magic numbers
- [ ] Banner does not appear when coverage is below thresholds
