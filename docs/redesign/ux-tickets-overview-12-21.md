# ModIQ UX Redesign Tickets (12-21)

## Overview

These tickets address UX issues identified in the February 6, 2026 video walkthrough review. They build on the existing tickets (01-11) and focus on making the wizard flow smoother, more intuitive, and less frustrating.

---

## 📊 Ticket Summary

| # | Title | Priority | Effort | Phase |
|---|-------|----------|--------|-------|
| 12 | Fix Scrolling & Button Placement | 🔴 CRITICAL | Medium | All |
| 13 | Flatten High Density Phase | 🔴 CRITICAL | Medium-High | High Density |
| 14 | Fix Counters & Confidence Display | 🔴 CRITICAL | Medium | All |
| 15 | Exclude Matched Items from Suggestions | 🟠 HIGH | Medium | All |
| 16 | Alphabetical Sort for Left Panel | 🟠 HIGH | Low | All |
| 17 | Auto-Advance After Match | 🟡 MEDIUM-HIGH | Low-Medium | All |
| 18 | Bulk Inference from User Patterns | 🟠 HIGH | High | All |
| 19 | Positive Completion Messaging | 🟡 MEDIUM | Low | All |
| 20 | Remove Unnecessary Type Labels | 🟡 MEDIUM | Low | All |
| 21 | Collapse Similar Items (Accordion) | 🟡 MEDIUM | Medium | All |

---

## 🎯 Priority Groups

### Must Fix (Blocking User Experience)

**Ticket 12: Fix Scrolling & Button Placement**
- Move stepper to top (sticky)
- Single Continue button in fixed footer
- No more scrolling to find actions

**Ticket 13: Flatten High Density Phase**
- Remove wizard-in-wizard pattern
- Same layout as Groups/Models
- No separate progress bar

**Ticket 14: Fix Counters & Confidence Display**
- "? of 205" → actual numbers
- "0% confidence" → calculated average
- "43 spinners" → "43 submodel groups"

### Should Fix (Quality Improvements)

**Ticket 15: Exclude Matched Items**
- Used items don't appear as top suggestions
- Can still search and re-use if needed
- Dynamic re-ranking

**Ticket 16: Alphabetical Sort**
- Natural sort (1, 2, 10 not 1, 10, 2)
- Related items grouped together
- Sort options dropdown

**Ticket 17: Auto-Advance**
- After match → auto-select next unmapped
- Prefer same "family" (Mini Pumpkin 1→2→3)
- Brief "Matched!" feedback

**Ticket 18: Bulk Inference**
- "You mapped Mini Pumpkin → Mini Tree"
- "Apply same pattern to 7 more?"
- Major time saver for large layouts

### Nice to Have (Polish)

**Ticket 19: Positive Messaging**
- Replace "No items found" with "🎉 All Done!"
- Celebratory completion screens
- Milestone toasts (25%, 50%, 75%)

**Ticket 20: Remove Type Labels**
- Hide SEMANTIC_SIMILARITY etc.
- Keep "How does matching work?" tooltip
- Visual confidence indicators (stars not %)

**Ticket 21: Collapse Similar Items**
- "Mini Pumpkin (8)" accordion
- Shows progress: ✓5 ○3
- Auto-expand on selection

---

## 🔗 Dependencies

```
Ticket 12 (Scrolling)
    └── Ticket 13 (Flatten HD) - needs consistent layout first

Ticket 15 (Exclude Matched)
    └── Ticket 18 (Bulk Inference) - needs used tracking

Ticket 16 (Sort)
    └── Ticket 21 (Collapse) - builds on sorted list
```

---

## 📅 Suggested Implementation Order

### Sprint 1: Critical Fixes
1. **Ticket 12** - Scrolling/buttons (foundation for everything)
2. **Ticket 14** - Counters (quick wins, high visibility)
3. **Ticket 13** - Flatten High Density (biggest UX pain point)

### Sprint 2: Core Improvements  
4. **Ticket 16** - Alphabetical sort (simple, high impact)
5. **Ticket 15** - Exclude matched items (required for bulk)
6. **Ticket 17** - Auto-advance (speed improvement)

### Sprint 3: Smart Features
7. **Ticket 18** - Bulk inference (game changer)
8. **Ticket 19** - Positive messaging (polish)
9. **Ticket 20** - Remove type labels (cleanup)

### Sprint 4: Advanced UX
10. **Ticket 21** - Collapse similar (nice to have)

---

## 📁 File Locations

All tickets saved to:
- `/home/claude/ticket-12-fix-scrolling-buttons.md`
- `/home/claude/ticket-13-flatten-high-density.md`
- `/home/claude/ticket-14-fix-counters.md`
- `/home/claude/ticket-15-exclude-matched-items.md`
- `/home/claude/ticket-16-alphabetical-sort.md`
- `/home/claude/ticket-17-auto-advance.md`
- `/home/claude/ticket-18-bulk-inference.md`
- `/home/claude/ticket-19-positive-messaging.md`
- `/home/claude/ticket-20-remove-type-labels.md`
- `/home/claude/ticket-21-collapse-similar.md`

---

## ✅ Success Metrics

After implementing these tickets:
- [ ] Zero scrolling required to find Continue button
- [ ] High Density phase indistinguishable from Groups/Models
- [ ] All counters show accurate numbers
- [ ] Matched items disappear from suggestions
- [ ] Items sorted alphabetically with natural number sort
- [ ] Auto-advance saves clicks
- [ ] Bulk matching available for families
- [ ] Completion screens feel celebratory
- [ ] No technical jargon in main UI
- [ ] Large lists manageable with accordions

---

## 📝 Notes from Video Walkthrough

**What's Working Well:**
- Review screen ("Love this screen")
- Sequence coverage display
- "Why semantic matching?" tooltip
- User's purchased sequences shown at top
- Progress indicator concept (needs numbers filled in)

**Key Quote:**
> "Great start. We just gotta really clean up some of this UX. It's still very clunky and hard to use."

---

## Related Documents

- Original UX Issues: `/mnt/user-data/outputs/modiq-ux-issues-from-walkthrough.md`
- Type System (Ticket 11): `/mnt/user-data/outputs/redesign-ticket-11-xlights-type-system.md`
- Earlier Tickets (01-10): `/mnt/user-data/outputs/redesign-tickets-overview.md`
