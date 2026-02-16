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

---

## Fix G: Canonical Pattern Vocabulary (from Cross-Reference Data)

The cross-reference file (`hd_submodel_crossref.json`) contains 1,063 canonical patterns across 74 props. The algorithm should use this as a **matching dictionary** — it tells us which submodel group names are semantically equivalent across different vendors/props even when the names are completely different.

### Universal Patterns (appear in 5+ props)

These are the "lingua franca" of spinner submodel groups. When the algorithm sees any of these base names, it knows what structural role they play:

```
Spoke (35 props)    Ring (34 props)      Outline (24 props)
Flower (13 props)   Star (12 props)      Diamond (11 props)
Inner Circle (10)   Ribbon (9 props)     Outer Circle (9 props)
Square (9 props)    Hook CCW/CW (7 each) Snowflake (7 props)
Arrow (7 props)     Feather (6 props)    Web (6 props)
Fireworks (6 props) Scallops (5 props)   Arrowhead (5 props)
```

### Structural Category Map

Build a category lookup from the canonical patterns. When names don't match literally, check if they're in the same structural category:

```javascript
const STRUCTURAL_CATEGORIES = {
  // Radial segments emanating from center
  radial: ["Spoke", "Spokes", "Arm", "Arms", "Point", "Cone", "Plunger",
           "Feather", "Arrow", "Arrows", "Arrowhead", "Trident"],

  // Curved/rotational elements
  curve: ["Hook CCW", "Hook CW", "Swirl", "Spiral", "Ribbon",
          "Whirliwig", "Angle Spinner", "Cascading"],

  // Ring/circular elements (concentric)
  ring: ["Ring", "Rings", "Circle", "Circles", "Oval",
         "Inner Circle", "Outer Circle", "Inner Ring", "Outer Ring",
         "Center Rings", "Outer Rings", "All Rings", "Half Moon",
         "Saucers", "Balls", "Outer Ball"],

  // Decorative/floral elements
  decorative: ["Flower", "Petal", "Petals", "Leaf", "Star", "Diamond",
               "Heart", "Snowflake", "Cascading Petal", "Cascading Leaf",
               "Cascading Arches", "Willow", "Oysters", "Trophies",
               "Wine Glass", "Chalice", "Umbrella"],

  // Outline/structural frame
  outline: ["Outline", "Cross", "Crosses", "Starburst", "Web",
            "Spider Web", "Fireworks", "Geometric Explosion", "Squiggle"],

  // Whole/aggregate groups
  aggregate: ["All", "Whole", "Full", "Complete", "Entire"],
};
```

**Matching boost:** If source base name and destination base name are in the same structural category, boost confidence by +0.15. If they're in different categories, penalty of -0.20. This prevents Ring → Willow type mismatches.

### Cross-Vendor Translation Table

The canonical patterns tell us which specific names are equivalent across vendors. Build a translation table from the cross-reference:

```javascript
// Patterns that appear together in the same canonical entry
// meaning they're the same structural concept across vendors
const TRANSLATIONS = {
  "Hook CCW": ["Half Moon", "Swirl Right", "Spiral CCW", "Curve Left"],
  "Hook CW": ["Swirl Left", "Spiral CW", "Curve Right"],
  "Flower": ["Willow", "Cascading Petal", "Petal", "Oyster"],
  "Ring": ["All Rings", "Circles", "Balls", "Saucers"],
  "Spoke": ["Spinners", "Arms", "Feathers", "Arrows"],
  "Snowflake Spoke": ["Circles (V)", "Radial Spokes"],
  "Snowflake Center": ["Center Rings", "Inner Circle"],
  "Whirliwig": ["Circles-Odd/Even", "Rotational"],
  "Web": ["Spider Web", "Net"],
  "Outline": ["Outline", "Frame", "Perimeter"],
};
```

When `Ring 03` from source doesn't find a literal `Ring 03` in destination, check the translation table: `Ring` → look for `All Rings`, `Circles`, `Balls`, `Saucers` in destination. Found `All Rings-03`? Use it.

---

## Fix H: Odd/Even Awareness

Many spinner props split their submodel groups into Odd/Even pairs for alternating animation effects. The algorithm must respect this:

```
Source: Spoke Even, Spoke Odd
Dest:   Circles-Odd (V), Circles-Even (V)

CORRECT:  Spoke Even → Circles-Even (V),  Spoke Odd → Circles-Odd (V)
WRONG:    Spoke Even → Circles-Odd (V)   (inverted parity)
```

**Rule:** If both source and destination have Odd/Even variants of the same base pattern, match Odd→Odd and Even→Even. Never cross-match parity unless no same-parity option exists.

Detection:
```javascript
function getOddEvenTag(name) {
  if (/[\s\-_](Odd|odd)/.test(name)) return 'odd';
  if (/[\s\-_](Even|even)/.test(name)) return 'even';
  // Also check for numbered patterns where odd/even is implicit
  const num = parseInt(name.match(/(\d+)$/)?.[1]);
  if (num && name.includes('-')) return num % 2 === 0 ? 'even' : 'odd';
  return null;
}
```

---

## Fix I: Section-Aware Matching

The Showstopper props have organized sections: `**WHOLE SPINNER`, `**OUTER`, `**MIDDLE`, `**CENTER`, `**HALLOWEEN`. The algorithm should use section position as a strong matching signal:

**Section hierarchy = radial position from outside to center:**
```
WHOLE SPINNER  → patterns that span the entire prop (highest priority, map first)
OUTER          → outer ring/edge elements
MIDDLE         → mid-radius elements
CENTER         → innermost elements
HALLOWEEN (or other themed) → overlay/seasonal elements (map last)
INDIVIDUAL SUB-MODELS → individual segments (lowest priority)
```

**Matching rule:** When the source prop has NO sections but the destination does, use the submodel group's **pixel count relative to siblings** to infer which section it belongs to:
- Largest pixel counts → WHOLE SPINNER tier
- Large pixel counts → OUTER tier
- Medium → MIDDLE tier
- Small → CENTER tier

This prevents a 50px Ring from matching a 384px Outer Rings aggregate — the Ring is CENTER tier, Outer Rings is OUTER tier.

When BOTH props have sections, match section-to-section first, then within-section by name/number/pixel.

---

## Fix J: Count-Ratio Matching for Numbered Sequences

When matching numbered sequences (Hook CCW 01-50 → Half Moon 01-12), the algorithm should:

1. **Calculate the count ratio:** source has 50, dest has 12 → ratio 4.17:1
2. **Map 1:1 up to the smaller count:** Hook CCW 01→Half Moon-01, ..., 12→12
3. **For the overflow (13-50), offer two strategies:**
   - **Leave unmapped** (default) — user can manually distribute
   - **Modular wrap** — 13→01, 14→02, ..., 24→12, 25→01, etc. (user opt-in)
   - Show in UI: "38 segments without matching destinations — [Leave unmapped] [Distribute evenly]"
4. **Never map overflow segments to random unrelated destinations** — this is what's happening now (Spoke 03→Oysters-03, Spoke 07→Oysters-07) where the algorithm grabs whatever it can find

The count ratio also helps with confidence scoring: a 4:1 ratio means the mapping is inherently lossy, so max confidence should cap at MEDIUM even for good name matches.

---

## Fix K: Spinner Structural Fingerprinting

Use the cross-reference to build a **structural fingerprint** for each spinner. This helps spinner monogamy (Ticket 79) pair better spinners together.

A spinner's fingerprint = the set of canonical pattern categories it contains + their counts:

```javascript
fingerprint("Grand Illusion 1") = {
  curve: 100,      // Hook CCW (50) + Hook CW (50)
  ring: 21,        // Ring (20) + Ring All (1)
  decorative: 16,  // Flower (16)
  radial: 54,      // Spoke (50+)
  composite: 20,   // Snowflake variations
  outline: 18,     // Web (18)
}

fingerprint("Showstopper Spinner") = {
  curve: 44,        // Half Moon (12) + Swirl L (12) + Swirl R (12) + Inner Swirl (8)
  ring: 30,         // All Rings (17) + Outer Rings + Center Rings + Circles
  decorative: 50,   // Willow + Petals + Cascading + Oysters + Hearts + ...
  radial: 30,       // Spinners-All + Arrows + Feathers + ...
  composite: 5,     // Snowflake + Starburst + Fireworks
  outline: 5,       // Outline + Crosses + Squiggle
}
```

**Cosine similarity of fingerprints** gives a much better spinner pairing score than name matching alone. Two spinners with similar category distributions are structurally compatible even if they have completely different names.

---

## Fix L: "All" / Aggregate Group Hierarchy

The cross-reference reveals that many props have both individual segments AND aggregate groups:

```
Grand Illusion 1:
  Ring 01, Ring 02, ... Ring 20    (individual)
  Ring All                          (aggregate of all 20)

Showstopper Spinner:
  All Rings-01, All Rings-02, ... All Rings-17   (individual)
  13 All Rings                                     (aggregate of all 17)
  35 Outer Rings                                   (aggregate of outer subset)
```

**Rules for aggregate handling:**
1. **Never map an individual to an aggregate** (Ring 07 → 13 All Rings is WRONG)
2. **Map aggregate to aggregate** if both sides have them (Ring All → 13 All Rings)
3. **If source has aggregate but dest doesn't:** leave aggregate unmapped (covered by children)
4. **If dest has aggregate but source doesn't:** leave dest aggregate unmapped (children will fill it)
5. **Detect aggregates by:**
   - Name contains "All" (Ring All, 13 All Rings, All Rings)
   - Pixel count > 3× median sibling count
   - Name starts with a number that matches total count (e.g., "13 All Rings" in a group with 17 individual rings → the "13" is a group number, not position)
   - Pattern: `{number} {base name}` where number > count of individual items

---

## Revised Processing Order for Submodel Auto-Match

Putting all fixes together, the algorithm should process in this order:

```
1. SECTION MATCHING (Fix I)
   Map section headers if both sides have them
   Use section position to bucket submodel groups

2. AGGREGATE MATCHING (Fix L)
   Identify aggregates on both sides
   Map aggregate ↔ aggregate, exclude from individual matching pool

3. ODD/EVEN PAIRS (Fix H)
   Identify Odd/Even pairs
   Lock Odd→Odd, Even→Even — these are paired first

4. EXACT NAME MATCHING
   Direct name match (Ring 01 → Ring 01, Outline → Outline)
   Highest confidence, processed first

5. CANONICAL PATTERN TRANSLATION (Fix G)
   Use cross-reference vocabulary: Hook CCW → Half Moon
   Boost for same structural category

6. NUMBERED SEQUENCE MATCHING (Fix J)
   Match numbered segments 1:1 up to the smaller count
   Leave overflow unmapped (or offer wrap)

7. PIXEL-RATIO-CONSTRAINED FALLBACK (Fix D from original)
   For remaining unmatched, use pixel similarity
   Reject >5:1 ratio mismatches

8. DESTINATION EXCLUSIVITY SWEEP (Fix A from original)
   Process all matches highest-confidence-first
   Each destination claimed only once
   Losers try next-best or go unmapped
```

This order ensures the best matches get claimed first, structural intelligence guides ambiguous cases, and no destination is ever double-booked.
