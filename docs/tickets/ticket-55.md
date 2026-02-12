# Ticket 55 — Left Panel: Model Grouping Visual Hierarchy & Sorting

## Overview
The left-side model list in the Individual Models mapping phase needs better visual distinction between grouped models and standalone models, clearer sorting, and top-level collapsible sections.

---

## 1. Top-Level Sections (Collapsible)

Split the left panel into two collapsible sections, same pattern as Ticket 52 (Unmapped/Mapped on the right panel):

```
▾ MODEL GROUPS (14)
  ┌─────────────────────────────────┐
  │ ▸ Candy Cane (×8)              │
  ├─────────────────────────────────┤
  │ ▸ Mini Tree (×12)              │
  ├─────────────────────────────────┤
  │ ▸ Spinner (×6)                 │
  └─────────────────────────────────┘

▾ INDIVIDUAL MODELS (23)
    Mega Tree
    Star Topper
    Tune To Sign
```

- Same styling as Ticket 52 section headers: uppercase, muted color (`#9ca3af`), ~13–14px, chevron toggle
- Both default to **expanded**
- Count in header = number of groups / number of individual models

---

## 2. Model Group Cards — Make Them Pop

Currently the group expand/collapse looks too similar to individual model rows. Groups need to feel like containers.

### Recommended treatment:

- **Subtle card/box:** Light border (`1px solid #374151`) or slightly elevated background (`#1e2533` or similar — just a shade lighter than the panel bg) wrapping the entire group
- **Group header row:**
  - **Bold label** (e.g., `font-weight: 600`)
  - Slightly larger text than individual models (~15px vs ~13–14px for models)
  - Count badge on the right showing member count (e.g., `×8`) — use existing badge style
  - Chevron (▸/▾) on the left for expand/collapse
  - Consider a subtle group icon (e.g., a small grid/stack icon) to the left of the chevron to further signal "this is a group"
- **Expanded state:** Child models are indented (`padding-left: 1.25rem`) and slightly smaller/lighter text to reinforce parent-child relationship
- **Group-level actions:** Keep the existing "assign all" / "dismiss all" functionality prominent — these are the power moves. Consider making them visible on the group header row itself (small action buttons or icons on hover/always visible)
- **Border radius** on the group card: `0.5rem` to match the site's existing card style

### Visual example:
```
┌─────────────────────────────────────────┐
│ ▾  🔲  Candy Cane  (×8)     [Map All]  │  ← bold, larger, bordered card
│    ├─ Candy Cane 1          [Map] [×]   │  ← indented, normal weight
│    ├─ Candy Cane 2          [Map] [×]   │
│    ├─ Candy Cane 3          [Map] [×]   │
│    └─ ...                               │
└─────────────────────────────────────────┘
```

---

## 3. Individual Model Rows (Non-Grouped)

These should be visually simpler than group headers to reinforce the hierarchy:

- **No border/card** — just standard list rows
- Regular weight (`font-weight: 400`)
- Standard font size (~13–14px)
- Same action buttons (Map / Dismiss) on the right
- This contrast with the bordered, bold group cards is what makes the groups stand out

---

## 4. Sorting — Three-Tier Hierarchy

Sorting has three distinct levels. The top two are **fixed** and not affected by the user's sort dropdown. The sort dropdown only controls Level 3.

### Level 1 (fixed): Mapped Status
- **Unmapped items first**, mapped items second
- This is the outermost grouping — always enforced regardless of sort selection
- Same collapsible section pattern as Ticket 52 (UNMAPPED open by default, MAPPED closed)

### Level 2 (fixed): Model Groups vs. Individuals
- Within each mapped/unmapped section: **Model Groups appear first** (A→Z by group name), then **Individual Models** (sorted per Level 3)
- Group names are always sorted alphabetically — the sort dropdown does not reorder groups themselves

### Level 3 (user-controlled): Sub-item sorting
- This is what the existing sort dropdown controls
- Applies to:
  - Models **inside** an expanded group
  - Individual (non-grouped) models
- **Default sort: Effects: High → Low** (changed from current)
- All existing sort options remain available:
  - **Impact:** Effects High→Low, Effects Low→High
  - **Size:** Pixels High→Low, Pixels Low→High
  - **Name:** A→Z, Z→A
  - **Match:** Confidence High, Confidence Low
  - **Status:** Unmapped First

### Sort hierarchy visualized:
```
▾ UNMAPPED                                    ← Level 1 (fixed)
  ▾ MODEL GROUPS (6)                          ← Level 2 (fixed, alpha)
    ┌──────────────────────────────────┐
    │ ▾ Candy Cane (×8)               │       ← Level 2 (alpha)
    │    Candy Cane 3    ↑54 effects  │       ← Level 3 (sort dropdown)
    │    Candy Cane 1    ↑38 effects  │
    │    Candy Cane 7    ↑22 effects  │
    └──────────────────────────────────┘
    ┌──────────────────────────────────┐
    │ ▸ Mini Tree (×12)               │
    └──────────────────────────────────┘

  ▾ INDIVIDUAL MODELS (9)                     ← Level 2 (fixed)
      Mega Tree          ↑54 effects          ← Level 3 (sort dropdown)
      Star Topper        ↑31 effects
      Tune To Sign       ↑12 effects

▸ MAPPED                                      ← Level 1 (fixed, collapsed)
```

### Important
When a user changes the sort dropdown, **only Level 3 items re-sort**. The Unmapped/Mapped sections and Model Groups/Individual Models sections stay in their fixed positions. This prevents the user from accidentally scattering their workflow.

---

## 5. Additional Recommendations

### Collapse all / Expand all
A small utility link at the top of the panel ("Collapse All | Expand All") would be helpful for users with many groups who want to reset their view.

### Progress indicator
Consider a small progress summary at the top of the left panel (e.g., "42/67 models mapped") to give users a sense of how much work remains without scrolling.

---

## 6. Search Bar Updates

- **Placeholder text:** Change from "Filter models" → **"Search models"**
- **Clear button:** Add an `×` icon at the far right of the input that appears when there's text in the field. Clicking it clears the search and resets the list. Hide the `×` when the field is empty.
