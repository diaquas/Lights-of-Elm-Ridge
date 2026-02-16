# Ticket 86 — Submodel Group Auto-Matching: Algorithm Fixes

**Priority:** P0 — Core matching quality issue producing garbage output
**Based on:** Real-world CSV export from xTreme Sequences → Lights of Elm Ridge (Christmas)
**Data:** `ModIQ_Report_All_I_Want_for_Xmasxml.csv` (1,108 rows, 904 submodel entries)

---

## Critical Problems Found

### Problem 1: Destination Submodel Groups Used Multiple Times (WORST BUG)

**90 destination submodel groups** are mapped to 2+ source submodel groups simultaneously. This means multiple source patterns are trying to light up the same physical LEDs at the same time → garbled nonsense on the actual spinner.

Examples of triple-mapped destinations:
```
Willow-01      ← Flower 1 (GI 2) + Flower 1 (GI 1) + Cone 1 (xTreme)
All Rings-01   ← Ring 09 (GI 2) + Ring 09 (GI 1) + Ring 1 (xTreme)
Oysters-03     ← Spoke 03 (GI 2) + Spoke 03 (GI 1) + Cone 3 (xTreme)
Oysters-07     ← Spoke 07 (GI 2) + Spoke 07 (GI 1) + Point 7 (xTreme)
```

**Root cause:** The many-to-one constraint isn't being enforced at the submodel level. The rule — "one source can feed many destinations, but each destination can only receive from ONE source" — applies to submodel groups just as much as it applies to models and groups. This is Ticket 73 §3 but it's not being applied to submodel groups.

**Fix:** Each destination submodel group can appear at most ONCE across ALL source→destination mappings within the same parent spinner pairing. When the algorithm wants to assign a destination that's already taken, it must skip it and try the next best alternative (or leave the source unmapped).

### Problem 2: Identical Mappings Across Both Grand Illusion Spinners

GE Grand Illusion 1 → Showstopper 1 and GE Grand Illusion 2 → Showstopper 2 produce **nearly identical** submodel group mappings. The algorithm mapped:
- Both spinners' `Flower 1` → `Willow-01`
- Both spinners' `Flower 2` → `Willow-02`
- Both spinners' `Hook CCW 01-12` → `Half Moon-01-12`
- Both spinners' `Hook CW 01-12` → `Swirl Left-01-12`
- Both spinners' `Ring 01-09` → same `All Rings-*`

This makes sense because GI 1 and GI 2 have identical submodel structures (they're the same prop model), but **Showstopper 1 and Showstopper 2 are also the same model** — so the destinations should each have their own exclusive claim. If GI 1's `Hook CCW 01` maps to Showstopper 1's `Half Moon-01`, then GI 2's `Hook CCW 01` should map to Showstopper 2's `Half Moon-01` and NOT also to Showstopper 1's `Half Moon-01`.

**Fix:** Submodel group monogamy must be enforced **per destination spinner**. Within Showstopper 1, each destination submodel group can only be claimed by one source submodel group from GI 1. Within Showstopper 2, each destination submodel group can only be claimed by one source from GI 2. Cross-spinner collisions (GI 1 mapping to Showstopper 2's submodels) shouldn't happen at all because of spinner monogamy (Ticket 79).

### Problem 3: No Structural/Positional Matching Logic

The algorithm is matching `Ring 09` (50px) → `All Rings-01` (1px). These are completely different sizes and positions on the spinner. Matching appears to be purely name-based (both contain "Ring") with no consideration for:

1. **Position in the numbered sequence** — Ring 09 should map to something near position 9, not position 1
2. **Pixel count similarity** — 50px vs 1px is a 50:1 ratio mismatch
3. **Structural role** — "All Rings" is a group-level aggregate, not an individual ring segment

The submodel group matching priority order we defined (from Ticket 78) isn't being applied:

```
Priority 1: Exact name match (Ring 01 → Ring 01)
Priority 2: Same section + same numbered position (OUTER Ring 3 → OUTER Ring 3)
Priority 3: Same section + closest pixel count
Priority 4: Same base name + closest numbered position
Priority 5: Closest pixel count within the same structural category
```

**Fix:** Implement the priority order. When matching `Flower 6` from the source, first look for an exact `Flower 6` in the destination. If not found, look for items in the same section with similar position numbers. Then fall back to pixel count similarity. Never match a 50px item to a 1px item when a 36px alternative exists.

### Problem 4: Aggregate/Group Submodels Mapped Like Individuals

Several mappings target aggregate submodel groups:
```
Ring 07 (50px) → 35 Outer Rings (384px)    ← aggregate!
Ring 08 (50px) → 13 All Rings (541px)       ← aggregate!
```

"35 Outer Rings" and "13 All Rings" are parent/aggregate submodel groups that contain all the individual ring segments. Mapping a single 50px ring to a 384px or 541px aggregate is wrong — the aggregate should either be mapped to an equivalent aggregate on the source side, or left unmapped (covered by the individual mappings).

**Fix:** Detect aggregate submodel groups by:
- Name patterns: "All *", "* All", leading numbers like "13 All Rings", "35 Outer Rings"
- Pixel count disproportionately large compared to siblings
- Being the parent in the xmodel hierarchy

Aggregates should only match other aggregates, or be auto-skipped as "covered by children."

### Problem 5: Massive Unmapped Tail on Large Spinners

GE Grand Illusion has 50 Hook CCW and 50 Hook CW submodel groups. The destination Showstoppers only have 12 Half Moons and 12 Swirl Lefts. The algorithm maps 1-12 then leaves 13-50 UNMAPPED (38 per category, 76 total per spinner).

This is technically correct (can't map to destinations that don't exist), but the algorithm should handle this better:

**Fix:** When source has more numbered segments than destination:
1. Map 1:1 up to the destination's count (Hook CCW 01-12 → Half Moon 01-12) ✓ already doing this
2. For remaining unmapped source segments (13-50), offer a **"wrap" or "distribute" option**: map Hook CCW 13 → Half Moon 01, Hook CCW 14 → Half Moon 02, etc. cycling through the available destinations
3. Or mark them as "no destination available" with a clear explanation (not just "UNMAPPED")
4. The UI should surface this: "38 source segments have no matching destination. Distribute across existing targets?"

### Problem 6: Singing Face Submodel Mapping is Nonsensical

```
Singing Bulb 350 → Singing Bulb 1 submodels:
  Bulb (69px) → Outline (68px)          ← pixel match but wrong semantic
  Threads (38px) → Eyes Open (30px)      ← what?
  Screw Outline (39px) → Lower Mouth (24px)  ← what?
  Pupils (14px) → O (16px)              ← what?
```

The algorithm is matching by pixel count, not by semantic meaning. "Threads" should map to "Threads" or similar hair/wire structures, not to "Eyes Open." "Screw Outline" has nothing to do with "Lower Mouth."

**Fix:** For singing faces specifically, semantic name matching should take priority over pixel count. The submodel names describe facial features (Eyes, Mouth, Brow, Outline, Pupils) — these have obvious 1:1 semantic matches:
- Bulb → Outline ✓ (both are the overall shape)
- Eyes Open → Eyes Open ✓
- Eyes Closed → Eyes Closed ✓
- Pupils → Pupils (not "O")
- Eye Brow → Eye Brow (not "Narrow")
- O Mouth → O (this is actually correct but reversed)

The name matching needs to be smarter about compound names and facial feature vocabulary.

---

## Algorithm Fixes Required

### Fix A: Destination Exclusivity Constraint (CRITICAL)

```
FOR each destination spinner:
  claimed_destinations = {}
  
  FOR each source submodel group (sorted by confidence, descending):
    IF best_destination NOT IN claimed_destinations:
      assign(source → best_destination)
      claimed_destinations.add(best_destination)
    ELSE:
      try next_best_destination NOT IN claimed_destinations
      IF found: assign and claim
      ELSE: leave source UNMAPPED
```

This is the same logic as Ticket 73 §3 but enforced at the submodel level. Process highest-confidence matches first so the best matches get first pick.

### Fix B: Positional/Numbered Segment Matching

When source and destination both have numbered segments (Ring 01-20, Spoke 01-50, Hook CCW 01-50):

```
1. Extract the base name and number: "Hook CCW 03" → base="Hook CCW", num=3
2. Look for exact base name match in destination: "Hook CCW 03"
3. If not found, look for same structural category in destination
   (hooks → swirls/curves, rings → rings, spokes → spokes/arrows)
4. Match by number first: source num 3 → destination num 3
5. If destination has fewer segments, leave excess source segments unmapped
   (or offer wrap/distribute)
```

### Fix C: Aggregate Detection and Exclusion

```
is_aggregate(submodel) = (
  name matches /^(All |.*All$|\d+ All )/
  OR pixel_count > 3x median sibling pixel count
  OR is_parent_in_xmodel_hierarchy
)

IF is_aggregate(source) AND !is_aggregate(destination):
  skip — don't match individual to aggregate
IF is_aggregate(source) AND is_aggregate(destination):
  allow — aggregate to aggregate is fine
IF !is_aggregate(source) AND is_aggregate(destination):
  skip — don't match individual to aggregate
```

### Fix D: Pixel Count Ratio Guard

Never match submodel groups with extreme pixel count disparity:

```
ratio = max(source_px, dest_px) / max(min(source_px, dest_px), 1)
IF ratio > 5: reject match (50px → 1px = 50:1 ratio, way too high)
IF ratio > 3: penalize confidence heavily
IF ratio <= 2: acceptable
```

### Fix E: Semantic Name Matching for Singing Faces

For models with type "Singing Face", boost name-based matching for known facial feature terms:

```
FACIAL_FEATURES = {
  eyes: ["eyes", "eye", "pupils", "brow"],
  mouth: ["mouth", "lips", "teeth", "smile", "o mouth", "a mouth"],
  outline: ["outline", "bulb", "face", "head"],
  hair: ["threads", "hair", "wig"],
}

Match source submodel to destination submodel by:
1. Both in same feature category → strong boost
2. One in category, other not → strong penalty
3. Neither has recognizable feature name → fall back to pixel match
```

---

## Validation: What "Good" Looks Like

After these fixes, the GE Grand Illusion 2 → Showstopper 2 mapping should look like:

```
Hook CCW 01 → Half Moon-01     (1:1 numbered match)
Hook CCW 02 → Half Moon-02
...
Hook CCW 12 → Half Moon-12
Hook CCW 13-50 → UNMAPPED (no destination available)

Hook CW 01 → Swirl Left-01
...
Hook CW 12 → Swirl Left-12
Hook CW 13-50 → UNMAPPED

Ring 01 → All Rings-01         (1:1 numbered match)
Ring 02 → All Rings-02
...
Ring 12 → All Rings-12
Ring 13-20 → UNMAPPED

Flower 01 → Willow-01          (structural match, similar px)
...
Flower 12 → Willow-12
Flower 13-16 → UNMAPPED

Snowflake Center → 60 Center Rings  (semantic + size match)
Snowflake Spoke 01 → Circles (V)-01 (numbered match)
...
```

**Zero duplicate destinations. Every destination submodel group claimed by at most one source.**

---

## Summary of Issues

| # | Issue | Severity | Fix |
|---|---|---|---|
| 1 | 90 destination submodels mapped to 2+ sources | CRITICAL | Destination exclusivity constraint |
| 2 | Identical mappings across paired spinners | HIGH | Per-spinner monogamy enforcement |
| 3 | No positional/numbered matching | HIGH | Numbered segment matching |
| 4 | Aggregates mapped like individuals | MEDIUM | Aggregate detection + exclusion |
| 5 | No overflow handling for mismatched counts | MEDIUM | Wrap/distribute or clear "no dest" status |
| 6 | Semantic mismatch on singing faces | MEDIUM | Facial feature vocabulary matching |
| 7 | Pixel count ratio not guarded | MEDIUM | Ratio threshold (reject >5:1) |
