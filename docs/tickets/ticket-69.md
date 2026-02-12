# Ticket 69 — Remove Auto-Match Phase, Integrate Into Subsequent Phases

---

## The Change

Eliminate the Auto-Match review as a standalone stepper phase. Auto-matching still runs on the backend — results are pre-applied into Groups & Models and Submodels phases with visual indicators.

### Stepper Before:
```
Upload → Auto-Matches → Groups & Models → Submodels → Finalize → Review
```

### Stepper After:
```
Upload → Groups & Models → Submodels → Finalize → Review
```

One fewer pill. The loading screen ("Mod:IQ is working...") still runs the matching engine — it just lands directly on Groups & Models when done.

---

## Loading Screen Update

Replace the Handshake icon on the "Matches Found" card with the Lucide `Link2` icon. Same size and color styling as the other two cards.

```
import { Link2 } from "lucide-react"
```

After processing completes, transition directly to Groups & Models (skip the auto-match review screen entirely).

---

## Auto-Match Summary Banner

When Groups & Models loads, show a dismissible banner at the top (above the search/filter row):

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🔗 56 auto-matches applied  ·  24 strong  ·  32 to review             │
│  Items marked with 🔗 were auto-matched — review or override anytime    │
│                                                    [Accept All Strong (24)]  │
└──────────────────────────────────────────────────────────────────────────┘
```

- 🔗 = Lucide Link2 icon (green, 16px)
- Shows total auto-matches, split into strong (≥75% confidence) and review (<75%)
- **[Accept All Strong]** button — locks in all high-confidence matches in one click, banner updates to reflect
- Banner is dismissible (✕ in top right) — once dismissed it doesn't come back
- If zero auto-matches found, don't show the banner

---

## Inline Auto-Match Badge

Every auto-matched item in the Groups & Models list gets a small green Link2 icon badge:

```
🔗 All - Arches - GRP  (8)  ·  88 fx  ·  → VLS GROUP - ARCHES    ✕
```

- Green Link2 icon (14px) to the left of the item name
- Indicates "this mapping was auto-matched, not manually set by you"
- Badge disappears if the user manually remaps or removes the mapping (it's no longer an auto-match)
- Badge persists if the user accepts the auto-match (it was confirmed but originated from auto-matching)

---

## Needs Review vs Strong Match — As Filter, Not Sections

Instead of reimplementing hard-coded sections (Ticket 67 specified sections but this supersedes that), expose the strong/review split as a **status filter option**:

Status dropdown gains two new options:

```
Status: [All ▾]
  All
  Unmapped
  Auto-Matched: Strong (≥75%)
  Auto-Matched: Needs Review (<75%)
  Mapped (manual)
```

This lets users filter to just the questionable auto-matches without a permanent section split.

---

## Auto-Match Indicators in Submodels Phase

Same treatment applies to the Submodels phase:

- Auto-matched submodels get the green Link2 badge
- Same banner at top of Submodels if there are submodel-level auto-matches:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🔗 88 submodel auto-matches applied  ·  45 strong  ·  43 to review    │
│                                                    [Accept All Strong (45)]  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Auto-Match Indicators in Finalize Phase

In the Finalize grid, auto-matched items are visually indistinguishable from manually mapped items — and that's correct. By Finalize, the origin of the mapping doesn't matter. No Link2 badges needed here.

---

## What Gets Removed

- Auto-Matches stepper pill
- Auto-Match review screen (entire component)
- "Optimized Assignments" banner and detail view
- "Uncheck to map manually" tip text
- Coverage Preview accordion (coverage is always visible in the header bars)
- The separate Needs Review / Strong Match sections (replaced by filter options)

---

## What Stays

- Auto-match algorithm on the backend — runs exactly as before during the loading phase
- Match confidence scores — still shown on each item
- The loading screen with its three cards (Your Models / Matches Found / Sequence Models) — still the transition between Upload and the first mapping phase
- All match data — just presented in context within Groups & Models and Submodels rather than on a standalone review screen
