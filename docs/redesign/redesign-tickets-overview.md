# ModIQ Redesign: Implementation Tickets Overview

## Summary

This is the master index for the ModIQ mapping interface redesign. The goal is to transform a C+ "everything at once" interface into an A+ "smoothest mapping screen on the planet" using progressive disclosure, phased wizards, and enhanced visual feedback.

---

## Tickets Overview

| # | Ticket | Priority | Dependencies | Est. Effort |
|---|--------|----------|--------------|-------------|
| 01 | [Phased Wizard Structure](redesign-ticket-01-phased-wizard-structure.md) | P0 | None | 2-3 days |
| 02 | [Auto-Accept Phase](redesign-ticket-02-auto-accept-phase.md) | P0 | Ticket 01 | 2 days |
| 03 | [Spinner Submodel Wizard](redesign-ticket-03-spinner-wizard.md) | P0 | Ticket 01 | 3-4 days |
| 04 | [Groups Phase](redesign-ticket-04-groups-phase.md) | P1 | Ticket 01 | 2 days |
| 05 | [Individuals Phase + Drag-Drop](redesign-ticket-05-individuals-phase.md) | P1 | Ticket 01 | 3 days |
| 06 | [Review Phase + Export](redesign-ticket-06-review-phase.md) | P1 | Ticket 01 | 2 days |
| 07 | [Confidence Visualization](redesign-ticket-07-confidence-visualization.md) | P1 | None | 2 days |

**Total Estimated Effort: 16-18 days**

---

## Implementation Order

### Week 1: Foundation
1. **Ticket 01: Phased Wizard Structure** — This is the architectural foundation. Must be done first.
2. **Ticket 07: Confidence Visualization** — Can be built in parallel, used by all phases.

### Week 2: Core Phases
3. **Ticket 02: Auto-Accept Phase** — Simplest phase, validates wizard structure works.
4. **Ticket 04: Groups Phase** — Medium complexity, builds on foundation.

### Week 3: Complex Features
5. **Ticket 05: Individuals Phase** — Includes drag-drop, most traditional UI.
6. **Ticket 03: Spinner Wizard** — Most complex, requires semantic matching.

### Week 4: Polish
7. **Ticket 06: Review Phase** — Ties everything together, adds export.

---

## Key Design Principles

### 1. Progressive Disclosure
- Don't show everything at once
- Break the 40+ item list into digestible phases
- Each phase focuses on one thing

### 2. Confidence-Driven UI
- High confidence (85%+) = Green = "Accept All"
- Medium confidence (50-84%) = Amber = "Review"
- Low confidence (<50%) = Red = "Manual"

### 3. Semantic Matching for Spinners
- Use the rosetta stone categories: spokes, rings, florals, scallops, spirals, triangles, effects
- Match by meaning, not just name
- Show reasoning: "Both are 'scallops' category"

### 4. Satisfying Interactions
- Magnetic snap on drag-drop
- Drop zones that pulse and glow
- Success toasts and confetti
- Progress that feels real

### 5. User Mental Model
Users think in steps:
1. "What's already done?" → Auto-accept
2. "Let me handle big chunks" → Groups
3. "Let me match individuals" → Models
4. "Help with tricky stuff" → Spinner wizard
5. "Am I finished?" → Review

---

## Technical Dependencies

### Required Packages
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```

### File Structure
```
src/
├── types/
│   ├── mappingPhases.ts
│   └── matching.ts
├── lib/
│   ├── spinnerCategories.ts
│   ├── spinnerMatching.ts
│   └── generateReasoning.ts
├── context/
│   ├── MappingPhaseContext.tsx
│   ├── MappingsContext.tsx
│   └── SourcePatternsContext.tsx
├── components/
│   ├── MappingInterface.tsx
│   ├── PhaseStepper.tsx
│   ├── PhaseContainer.tsx
│   ├── PhaseNavigation.tsx
│   ├── PhaseEmptyState.tsx
│   ├── BulkActionBar.tsx
│   ├── MatchCard.tsx
│   ├── GroupCard.tsx
│   ├── GroupDetailPanel.tsx
│   ├── DestinationList.tsx
│   ├── SourcePanel.tsx
│   ├── DragPreview.tsx
│   ├── ConfidenceBadge.tsx
│   ├── ReasoningTooltip.tsx
│   ├── ConfidenceTierList.tsx
│   ├── CelebrationToast.tsx
│   ├── CelebrationOverlay.tsx
│   ├── MappingSuccessToast.tsx
│   ├── ExportButton.tsx
│   ├── SpinnerIntroScreen.tsx
│   ├── SpinnerCategoryStep.tsx
│   ├── ReviewSummaryView.tsx
│   └── ReviewDetailsView.tsx
│   └── phases/
│       ├── AutoAcceptPhase.tsx
│       ├── GroupsPhase.tsx
│       ├── IndividualsPhase.tsx
│       ├── SpinnersPhase.tsx
│       └── ReviewPhase.tsx
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to complete 100 layers | ~15 min | <5 min |
| Manual drag-drop actions | ~80% | <20% |
| Users completing all mapping | Unknown | 95% |
| User satisfaction | C+ | A+ |

---

## Related Documentation

- [UX Redesign Proposal](modiq-ux-redesign-proposal.md) — Full research and rationale
- [Spinner Database](modiq-spinner-database.md) — Semantic categories and matching
- [Rosetta Stone JSON](spinner_rosetta_stone.json) — Machine-readable categories

---

## How to Use with Claude Code

Feed these tickets to Claude Code one at a time:

```bash
# Start with the foundation
claude "Implement ticket 01 from redesign-ticket-01-phased-wizard-structure.md"

# Then build phases
claude "Implement ticket 02 from redesign-ticket-02-auto-accept-phase.md"
# etc...
```

Each ticket is self-contained with:
- Problem statement
- Technical implementation (copy-paste ready code)
- File structure
- Acceptance criteria
- Dependencies

---

## Questions?

These tickets are designed to be implementable in isolation. If Claude Code needs clarification:
1. Reference the related ticket for context
2. Check the UX redesign proposal for rationale
3. Use the spinner database for semantic matching logic

Good luck building the smoothest mapping screen on the planet! 🚀
