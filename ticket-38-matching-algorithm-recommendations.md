# Ticket 38: Matching Algorithm Recommendations - Path to 65-80% Auto-Match Rate

## 📊 Current State Analysis

After reviewing `ModIQ_V5_2_Matching_Rules.xlsx`, the algorithm is already sophisticated with:
- 6 weighted scoring factors (Name 38%, Spatial 22%, Shape 13%, Type 10%, Pixels 10%, Structure 7%)
- 12 hard exclusions
- 6 matching phases
- 38 synonyms/abbreviations
- 13 equivalent bases
- 28 related types
- 27 vendor pixel hints
- 9 interchangeable classes
- 8 score modifiers

**Current: 30-50% auto-match rate**
**Target: 65-80% auto-match rate**

## 🔍 Gap Analysis: Why Are Matches Being Missed?

### Problem 1: Name Weight May Be Too Low for This Domain
**Current**: Name = 38%
**Issue**: In xLights, naming is BY FAR the strongest signal. Users name things consistently within their own layout.

**Evidence**: 
- "Arch 1" should match "Arch 1" at near 100% confidence
- But with 38% weight, even a perfect name match only contributes 0.38 to score
- If spatial/pixels differ, a perfect name match can drop below 0.85 threshold

**Recommendation**: Increase name weight for exact/near-exact matches:
```
If name_score >= 0.95:
  effective_name_weight = 0.55  # Boost name dominance for near-exact
Else:
  effective_name_weight = 0.38  # Current weight
```

### Problem 2: Spatial Factor Hurting Good Matches
**Current**: Spatial = 22%
**Issue**: Users rearrange props constantly. "Arch 1" in source might be in a different position than "Arch 1" in dest.

**Evidence**:
- Same name, different position = spatial score ~0.3-0.5
- This costs 0.22 * 0.5 = 0.11 points
- Can drop a perfect name match from 0.89 to 0.78 (high→medium)

**Recommendation**: Reduce spatial weight when name match is strong:
```
If name_score >= 0.90:
  effective_spatial_weight = 0.10  # Position matters less when name is clear
Else:
  effective_spatial_weight = 0.22  # Position helps disambiguate
```

### Problem 3: Missing Common Synonyms
**Current**: 38 synonym entries
**Gap**: Missing many common xLights naming patterns:

| Missing Synonym | Should Match |
|-----------------|--------------|
| `grp`, `gp` | group |
| `str`, `string` | strand |
| `seg`, `segment` | section |
| `el`, `elem` | element |
| `prop` | model |
| `px`, `pxl` | pixel |
| `ch` | channel |
| `blk`, `blck` | black |
| `wht` | white |
| `org` | orange |
| `grn` | green |
| `blu` | blue |
| `prp` | purple |
| `pnk` | pink |
| `gld` | gold |
| `slv` | silver |
| `brn` | brown |
| `orn` | ornament |
| `dec`, `deco` | decoration |
| `disp`, `dsply` | display |
| `ctl`, `ctrl` | controller |
| `uni`, `univ` | universe |
| `out` | outline |
| `bdr`, `brdr` | border |
| `edg` | edge |
| `frm` | frame |
| `fl`, `fld` | flood |
| `wsh` | wash |
| `stk` | stake, stick |
| `spr`, `sprl` | spiral |
| `wr`, `wth` | wreath |
| `snw` | snow |
| `flk` | flake |
| `orn` | ornament |
| `xmas`, `x-mas` | christmas |
| `hween`, `hallow` | halloween |
| `n`, `no`, `num` | number |

**Recommendation**: Add 40+ new synonym entries.

### Problem 4: Index Number Handling
**Current**: Implicit in name matching
**Issue**: "Arch 1" vs "Arch 01" vs "Arch-1" vs "Arch_1" should all match

**Recommendation**: Normalize index formats before comparison:
```typescript
function normalizeIndex(name: string): string {
  // "Arch 01" → "Arch 1"
  // "Arch-1" → "Arch 1"  
  // "Arch_1" → "Arch 1"
  return name
    .replace(/[-_](\d+)/, ' $1')  // Arch-1 → Arch 1
    .replace(/\s+0+(\d+)/, ' $1') // Arch 01 → Arch 1
}
```

### Problem 5: Missing Equivalent Bases
**Current**: 13 equivalent base entries
**Gap**: Missing common variations:

| Missing | Should Equal |
|---------|--------------|
| `tree`, `trees` | (plural handling) |
| `bush`, `shrub`, `hedge` | vegetation |
| `net`, `mesh`, `netting` | net_structure |
| `rail`, `railing`, `banister` | railing |
| `pillar`, `column`, `post` | vertical_support |
| `path`, `pathway`, `walk` | walkway (already have driveway) |
| `bow`, `ribbon` | decoration_bow |
| `bell`, `bells`, `chime` | bell |
| `angel`, `angels` | angel |
| `deer`, `reindeer`, `buck` | deer |
| `sled`, `sleigh` | sleigh |
| `train`, `locomotive` | train |

**Recommendation**: Add 15+ new equivalent base entries.

### Problem 6: Pixel Factor Too Aggressive
**Current**: Pixel ratio <0.80 → score drops significantly
**Issue**: Same prop with different pixel densities (50px vs 100px) shouldn't be penalized heavily

**Evidence**: 
- 100px arch in source, 200px arch in dest (same physical prop, different resolution)
- Pixel ratio = 0.5 → pixel score ~0.2
- Costs 0.10 * 0.8 = 0.08 points

**Recommendation**: Already have Ticket 5 (Relaxed Pixel Drift), but threshold should be:
```
If name_score >= 0.80 AND type_score >= 0.5:
  pixel_score = max(pixel_score, 0.6)  # Floor at 0.6, not 0.5
```

### Problem 7: Group Matching Not Leveraged for Member Hints
**Current**: Groups matched first, then individuals
**Gap**: If "All Arches" group matches, should BOOST individual arch matching

**Recommendation**: Add "Parent Group Hint":
```
If source_model's group is matched to dest_group:
  AND dest_model is member of dest_group:
  bonus = +0.15 to score
```

### Problem 8: Confidence Threshold May Be Too High
**Current**: High = ≥0.85, Auto-accept at Phase 1
**Issue**: Many good matches land at 0.75-0.84 (medium) and require user action

**Recommendation**: Lower high-confidence threshold:
```
High: ≥0.80 (was 0.85)
Medium: ≥0.55 (was 0.60)
Low: ≥0.35 (was 0.40)
```

This alone could move 10-15% of matches from "needs confirmation" to "auto-accepted".

### Problem 9: Quantity Matching Penalty Too Harsh
**Current**: Phase 3 applies 0.7 penalty (30% reduction)
**Issue**: Cross-type matches (8 pumpkins → 7 ghosts) get capped at ~0.63 max

**Recommendation**: Reduce penalty for clear quantity matches:
```
If same INTERCHANGEABLE_CLASS AND indices align:
  penalty = 0.85 (was 0.70)
```

### Problem 10: No "Fuzzy Index" Matching
**Current**: "Arch 3" only matches "Arch 3" at high confidence
**Issue**: If user has Arches 1-5 and source has Arches 1-8, Arches 6-8 should softly prefer unmatched user arches

**Recommendation**: Add fuzzy index preference:
```
If base_name matches AND dest_index is unmatched:
  bonus = +0.10 (prefer any available arch over non-arch)
```

## 📋 Recommended Changes Summary

### Quick Wins (Est. +10-15% match rate)

| Change | Impact | Effort |
|--------|--------|--------|
| Lower high threshold to 0.80 | +5-8% | Easy |
| Add 40+ synonyms | +3-5% | Easy |
| Normalize index formats | +2-3% | Easy |
| Add 15+ equivalent bases | +2-3% | Easy |

### Medium Effort (Est. +10-15% match rate)

| Change | Impact | Effort |
|--------|--------|--------|
| Dynamic name weight boost | +3-5% | Medium |
| Reduce spatial weight when name strong | +2-4% | Medium |
| Parent group hint bonus | +2-3% | Medium |
| Reduce quantity match penalty | +2-3% | Medium |

### Larger Changes (Est. +5-10% match rate)

| Change | Impact | Effort |
|--------|--------|--------|
| Fuzzy index matching | +2-4% | Medium |
| Raise pixel floor to 0.6 | +1-2% | Easy |
| Two-pass synonym expansion | +1-2% | Medium |

## 🔧 Implementation Priority

### Phase 1: Quick Wins (1-2 hours)
1. Lower high threshold to 0.80
2. Add 40+ new synonyms
3. Add 15+ new equivalent bases
4. Normalize index formats (01→1, -1→ 1)

### Phase 2: Scoring Adjustments (2-3 hours)
5. Dynamic name weight (boost to 0.55 when name ≥0.95)
6. Reduce spatial weight when name strong
7. Raise pixel floor to 0.6
8. Reduce quantity match penalty to 0.85

### Phase 3: Advanced (3-4 hours)
9. Parent group hint bonus
10. Fuzzy index preference
11. Two-pass synonym expansion for chains

## 📊 Expected Outcome

| Current | After Phase 1 | After Phase 2 | After Phase 3 |
|---------|---------------|---------------|---------------|
| 30-50% | 45-60% | 55-70% | 65-80% |

## 🧪 Validation Approach

1. **Create test corpus**: 5-10 real user layouts + LOER sequences
2. **Baseline**: Run current algorithm, record match rate
3. **A/B test**: Each change isolated, measure impact
4. **Regression check**: Ensure no quality loss (false positives)

## 📝 New Synonyms to Add

```typescript
const NEW_SYNONYMS = [
  // Abbreviations
  ['grp', 'gp', 'group'],
  ['str', 'string', 'strand'],
  ['seg', 'segment', 'section'],
  ['el', 'elem', 'element'],
  ['px', 'pxl', 'pixel'],
  ['ch', 'chan', 'channel'],
  ['out', 'outln', 'outline'],
  ['bdr', 'brdr', 'border'],
  ['edg', 'edge'],
  ['frm', 'frame'],
  ['fl', 'fld', 'flood'],
  ['wsh', 'wash'],
  ['stk', 'stake', 'stick'],
  ['spr', 'sprl', 'spiral'],
  ['wr', 'wth', 'wreath'],
  ['snw', 'snow'],
  ['flk', 'flake'],
  ['orn', 'ornament'],
  ['dec', 'deco', 'decoration'],
  ['disp', 'dsply', 'display'],
  
  // Colors (common in names)
  ['blk', 'blck', 'black'],
  ['wht', 'white'],
  ['org', 'orange'],
  ['grn', 'green'],
  ['blu', 'blue'],
  ['prp', 'purple'],
  ['pnk', 'pink'],
  ['gld', 'gold'],
  ['slv', 'silver'],
  ['brn', 'brown'],
  ['rd', 'red'],
  ['ylw', 'yel', 'yellow'],
  
  // Holiday
  ['xmas', 'x-mas', 'christmas'],
  ['hween', 'hallow', 'halloween'],
  ['thx', 'tday', 'thanksgiving'],
  ['july4', 'jul4', 'independence'],
  
  // Misc
  ['n', 'no', 'num', 'number'],
  ['qty', 'quant', 'quantity'],
  ['adj', 'adjacent'],
  ['opp', 'opposite'],
  ['frt', 'front'],
  ['bck', 'back', 'rear'],
  ['upr', 'upper', 'top'],
  ['lwr', 'lower', 'bottom', 'btm'],
];
```

## 📝 New Equivalent Bases to Add

```typescript
const NEW_EQUIVALENT_BASES = [
  // Vegetation
  ['bush', 'shrub', 'hedge', 'hedges'],
  
  // Structures
  ['net', 'mesh', 'netting'],
  ['rail', 'railing', 'banister'],
  ['pillar', 'column', 'post'],
  ['path', 'pathway', 'walk', 'walkway'],
  
  // Decorations
  ['bow', 'ribbon'],
  ['bell', 'bells', 'chime', 'chimes'],
  ['angel', 'angels', 'cherub'],
  ['deer', 'reindeer', 'buck', 'doe'],
  ['sled', 'sleigh'],
  ['train', 'locomotive', 'engine'],
  
  // Structural
  ['peak', 'gable', 'apex'],
  ['corner', 'edge', 'angle'],
  ['beam', 'rafter', 'joist'],
];
```

## ✅ Acceptance Criteria

- [ ] High confidence threshold lowered to 0.80
- [ ] 40+ new synonyms added
- [ ] 15+ new equivalent bases added
- [ ] Index format normalization implemented
- [ ] Match rate tested on 5+ real layouts
- [ ] No increase in false positives
- [ ] Target: 65%+ auto-match rate on test corpus

## 🏷️ Labels
- Priority: **HIGH**
- Type: Algorithm Improvement
- Effort: Medium-High (spread across phases)
- Impact: **Major** - core product quality
