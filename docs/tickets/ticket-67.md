# Ticket 67 — Auto-Match Review Screen Overhaul

---

## 1. Show Metadata on Each Row

Same inline metadata pattern as other mapping phases. Each match row currently shows:

```
✅  All - Arches - GRP    →    10 All Arches   Group   🟢 100%
```

Should show:

```
All - Arches - GRP  ·  8 models  →  10 All Arches  ·  Group  ·  88 fx  ·  100%    ✕
```

- Source name (left) with child count for groups
- Arrow separator
- Matched destination name (right) with type badge, effect count, match confidence
- All on one line, separated by middle dots
- Same compact single-row height as other phases

---

## 2. Replace Checkmarks with ✕ to Unmap

Currently: green checkmark toggles match on/off. This is the only screen that uses checkmarks — every other phase uses ✕ to dismiss/unmap.

Change to:
- Remove all green checkmarks
- Add ✕ button on the right side of each row (same position and style as other phases)
- Clicking ✕ unmaps that auto-match — item moves to the manual mapping phases
- Remove the "Uncheck to map manually" tip text — the ✕ is self-explanatory

---

## 3. Wider Container

The match list container is too narrow — content is cramped with large margins on both sides.

- Extend the container to match the full content width used in other phases
- Content should stretch close to the left and right edges of the main content area
- Same padding/margins as the Groups & Models and Finalize phases
- The "104 Items Auto-Matched" header and summary stats can stay centered, but the list below should go full width

---

## 4. Reimplement Needs Review / Strong Match Sections

Bring back the two-section split:

```
▾ NEEDS REVIEW (80)
  Matches below 75% confidence — verify these are correct

  All - Eaves - GRP  ·  26 models  →  15 All Roofline  ·  Group  ·  74%    ✕
  All - Trees - GRP  ·  5 models   →  09 All Mega Trees ·  Group  ·  77%    ✕
  Firework 1  ·  360ch  →  Fan L  ·  37%  ·  7 fx                           ✕
  ...

▾ STRONG MATCH (24)
  Matches at 75%+ confidence — likely correct

  All - Arches - GRP  ·  8 models  →  10 All Arches  ·  Group  ·  100%     ✕
  All - Poles - GRP  ·  6 models   →  12 All Pixel Poles ·  Group ·  100%   ✕
  All - Tombstones - GRP  ·  4     →  All Tombstones  ·  Group  ·  100%    ✕
  ...
```

- **Needs Review** = matches below 75% confidence. Expanded by default. These need human eyes.
- **Strong Match** = matches at 75%+ confidence. Expanded by default but could be collapsed since they're likely fine.
- Alphabetical sort within each section
- Section headers show count and a brief description of what the section means
- Threshold (75%) can be adjusted later — pick whatever the data suggests is the right cut

---

## 5. Remove Optimized Assignments UI

The "37 optimized assignments · Net trade-off: 458 pts" banner and its expandable detail are confusing to users. 

- Remove the optimized assignments banner entirely
- Continue applying the optimization logic on the backend — it still matters for match quality
- Users don't need to know that the algorithm swapped assignments for a better global fit

---

## 6. Additional Improvements

### Coverage Preview — Promote to Visible
The "Coverage Preview 89% display · 48% effects" is currently in a collapsed accordion. This is valuable info — show it inline in the header area, not hidden:

```
104 Items Auto-Matched
10 Groups · 37 Models · 57 Submodels · 24 strong · 80 review
Coverage Preview: 89% display · 48% effects
```

### Quick Filter Pills — Keep as-is
The `[All] [Groups] [Models] [HD Groups]` pills are good. Rename "HD Groups" to "Submodels" for consistency with the rest of the stepper if that's what they represent.

### Accept All / Reject Section Actions
Add section-level action buttons:

```
▾ STRONG MATCH (24)                              [Accept All Strong Matches]
```

- "Accept All Strong Matches" keeps all 24 and collapses the section with a ✓
- This gives users a fast path: glance at strong matches, accept them all, focus energy on the Needs Review section
- Individual ✕ still available for one-off removals

### Stable Sort
Apply the same stable sort behavior from Ticket 66 — removing a match (clicking ✕) doesn't reorder the list. The row either disappears (removed from auto-matches) or dims in place.
