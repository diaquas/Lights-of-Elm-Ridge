# Ticket 79 — Spinner Monogamy: One Source Per Destination HD Prop

**Depends on:** Ticket 78 (Submodel Groups step)
**Depends on:** HD Submodel Cross-Reference (`hd_submodel_crossref.json`)

---

## The Constraint

When mapping submodel groups between HD props (spinners, snowflakes, wreaths, etc.), **each destination prop receives mappings from exactly one source prop**. Never mix submodel groups from multiple sources onto a single destination.

### Why

HD props produce complex, coordinated animation patterns. A source spinner's "Cascading Arches" effect is designed to work in concert with its "Swirl Right" and "Big Petals" — they share timing, color palettes, and spatial relationships. Pulling "Cascading Arches" from Source A and "Swirl Right" from Source B onto the same destination creates garbled, incoherent light patterns. The visual result is noise, not art.

### The Rule

```
Destination Spinner ← exactly ONE Source Spinner (all submodel group mappings)
Source Spinner      → one OR MORE Destination Spinners (copies allowed)
```

Unmapped submodel groups on the destination stay empty. **Gaps are intentional** — better to have 60% of a destination's submodel groups playing coherent patterns from one source than 90% playing incoherent patterns from three sources.

---

## Algorithm: Optimal Spinner Pairing

### Step 1 — Score All Possible Pairings

For every source HD prop × destination HD prop combination, compute a **pairing score** based on:

1. **Submodel group overlap count**: How many source submodel groups have a match on the destination? Use the canonical pattern cross-reference for name matching.
2. **Average match confidence**: Mean confidence across all matched submodel groups.
3. **Coverage ratio**: What percentage of the destination's submodel groups get a match? (Higher = better — fewer gaps.)
4. **Structural similarity**: Same prop family (Showstopper ↔ Showstopper) gets a bonus. Similar dimensions/pixel count gets a minor bonus.

```
pairing_score = (overlap_count × avg_confidence × coverage_ratio) + family_bonus
```

### Step 2 — Optimal Assignment

This is the **assignment problem**: assign each destination to exactly one source, maximizing total pairing score, with the constraint that a source can serve multiple destinations.

For the typical case (2-6 HD props per side), a greedy approach works fine:

```
1. Compute all pairing scores
2. Sort destination props by "neediness" (fewest good source options first)
3. For each destination:
   a. Pick the highest-scoring unblocked source
   b. Assign it
   c. Source remains available for other destinations (copies allowed)
4. If a source is clearly the best match for 2+ destinations, assign it to both
```

For larger cases, use the Hungarian algorithm variant that allows source reuse.

### Step 3 — Submodel Group Matching Within Pairings

Once spinner pairings are established, auto-match submodel groups **only within each pair**:

```
For pairing (GE Rosa Grande → Showstopper Spinner):
  - Match "Spoke" → "Spinners - All" (name similarity + structural match)
  - Match "Ring" → "All Rings" (canonical pattern match)
  - Match "Snowflake" → "Snowflake" (exact match)
  - "Outer Ball" → no match on Showstopper → stays UNMAPPED
  - Showstopper "Bat" → no match from Rosa Grande → stays UNMAPPED
```

**Critical: Never backfill unmapped destination submodel groups from a different source.** The unmapped groups are intentional gaps.

---

## User-Facing Flow

### Pairing Review (top of Submodel Groups step)

Before diving into individual submodel group mappings, show the user the proposed spinner pairings:

```
┌─────────────────────────────────────────────────────────────────┐
│  HD Prop Pairings (auto-assigned, click to change)             │
│                                                                 │
│  SOURCE                    DEST                    SCORE       │
│  ─────────────────────     ─────────────────────   ─────       │
│  GE Rosa Grande         →  Showstopper Spinner     72%  ✎     │
│  GE Rosa Grande (copy)  →  VLS Mega Spinner        68%  ✎     │
│  GE Overlord            →  Click Click Boom        81%  ✎     │
│                                                                 │
│  ℹ 2 source props not assigned (no good destination match)     │
│  ⚠ 14 destination submodel groups unmapped (by design)         │
│                                                                 │
│  [Looks Good]  [Let Me Adjust]                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Manual Override

User clicks ✎ to reassign a destination to a different source. Dropdown shows all available sources with their pairing scores. Changing a pairing recalculates submodel group matches for that pair only.

### Per-Pairing Detail

After confirming pairings, the user drills into each pair to review/approve submodel group matches (same card UI as Ticket 78):

```
  GE Rosa Grande → Showstopper Spinner
  
  ▾ WHOLE SPINNER
    ☑  SUB  Spoke 01-48        →  Spinners - All         78%
    ☑  SUB  Ring 01-20         →  All Rings              85%
    ☐  SUB  Outer Ball 01-24   →  (unmapped)
    
  ▾ HALLOWEEN  
    ☐  SUB  Web                →  Spider Web             72%
    ☐  SUB  Web Spoke 01-12    →  (unmapped)
```

### Unmapped Indicator

Unmapped submodel groups show a subtle explanation on hover:

> "No match from GE Rosa Grande. This destination only receives mappings from its assigned source."

This prevents user confusion ("why isn't this mapped? there's a match from GE Overlord!") — the answer is: monogamy.

---

## Edge Cases

### No Source HD Props

Source sequence has no HD props with submodel groups. Submodel Groups step auto-skips entirely (per Ticket 78).

### No Destination HD Props  

Same — step auto-skips.

### 1 Source, 5 Destinations

The single source gets copied to all 5 destinations. Each destination maps independently against the same source. Some destinations will have better coverage than others depending on submodel group overlap.

### 5 Sources, 1 Destination

Algorithm picks the single best source for the destination. The other 4 sources are listed as "not assigned" with an option for the user to swap.

### User Wants to Cross-Pollinate

Power users who intentionally want to mix sources onto one destination can click ✎ and manually assign individual submodel groups from different sources. The UI allows it but doesn't encourage it — no auto-matching across pairings.

### Identical Props (Same Model Both Sides)

Source has "Showstopper Spinner", destination has "Showstopper Spinner". This is the ideal case — 100% submodel group overlap, exact name matches, pairing score is maximum. Auto-match handles it perfectly.

---

## Data Model

```typescript
interface SpinnerPairing {
  sourceModelId: string;        // e.g., "GE Rosa Grande"
  destinationModelId: string;   // e.g., "Showstopper Spinner"  
  pairingScore: number;         // 0-100
  isCopy: boolean;              // true if source is also assigned to another dest
  submodelMatches: SubmodelMatch[];
  unmappedSource: string[];     // source submodel groups with no dest match
  unmappedDest: string[];       // dest submodel groups with no source match
}

interface SubmodelMatch {
  sourceGroup: string;          // "Spoke 01"
  destGroup: string;            // "Spinners - All"
  confidence: number;           // 0-100
  matchType: "exact" | "canonical" | "structural" | "manual";
  approved: boolean;
}
```

---

## Summary

| Rule | Detail |
|---|---|
| **One source per destination** | Never mix submodel groups from multiple sources onto one destination |
| **Source reuse allowed** | A source can copy to multiple destinations |
| **Gaps are intentional** | Unmapped destination submodel groups stay empty |
| **No backfill** | Algorithm never pulls from a secondary source to fill gaps |
| **User override** | Manual reassignment available but not encouraged |
| **Auto-skip** | Step hidden if no HD props on either side |
