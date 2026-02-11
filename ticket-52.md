# Ticket 52 — Right Panel: Sort by Mapped Status + Collapsible Sections

Applies to all 3 mapping phases: **Groups**, **Models**, and **Submodel Groups**.

## Sorting Logic
1. **Unmapped items first**, sorted A→Z
2. **Mapped items second**, sorted A→Z

## Section Headers & Collapsibility
Split the list into two collapsible sections with a divider and small section header for each:

```
▾ UNMAPPED (12)              ← section header, default: OPEN
  ├─ All - Eaves - GRP
  ├─ All - Mini Trees - GRP
  └─ ...

─────────────────────────────  ← subtle divider line

▸ MAPPED (25)                ← section header, default: CLOSED
  ├─ All - House Outlines - GRP
  ├─ All - Pixels - GRP
  └─ ...
```

## Visual Hierarchy
These section headers must feel **higher in hierarchy** than the existing group expand/collapse carets (since groups of models can appear *inside* either section). To differentiate:

- **Section headers (Unmapped/Mapped):**
  - Uppercase or small-caps label (e.g., `UNMAPPED (12)`)
  - Slightly larger font than list items (~13–14px)
  - Muted color (`#9ca3af`) — not white, so it reads as a structural label, not content
  - Chevron icon (▾/▸) on the left for expand/collapse
  - Full-width subtle divider line (`border-bottom: 1px solid #374151`) between the two sections
  - Slight top/bottom padding (`0.75rem`) to give breathing room

- **Group carets (existing, inside sections):**
  - Keep as-is — smaller, inline, indented under the section headers
  - These are children of the Unmapped/Mapped sections

## Default State
- **Unmapped** → expanded (this is where the user needs to work)
- **Mapped** → collapsed (already done, get it out of the way)

## Count Badges
Include the count in the section header (e.g., "UNMAPPED (12)") so users can see progress at a glance without expanding.
