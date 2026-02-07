# Ticket 31: Matching Algorithm Improvements & Tuning

## 🎯 Objective
Review and improve the matching algorithm to increase both quantity AND quality of matches. Current approach may be leaving matches on the table or not weighting factors optimally.

## 📋 Current State Analysis

### Current Confidence Thresholds (Scattered/Inconsistent)
From reviewing our tickets, we have conflicting thresholds:
- Auto-match acceptance: **70%** (Ticket 23)
- High confidence: **90%+** (Ticket 23, 26)
- Medium confidence: **70-89%** (Ticket 23)
- Original proposal: **85%+** for auto-accept
- Implementation tickets: **40-69%** medium, **<40%** low
- Export suggestions: **70%** minimum

**Problem: These don't align.** We need ONE consistent system.

### Current Matching Factors
From `semantic-synonyms.ts`:
```typescript
// Current weighting (line 300)
const combinedScore = (exactScore * 0.7) + (synonymBoost * 0.3);
```

This ONLY considers:
1. **Exact token match** (70% weight)
2. **Synonym match** (30% weight)

**What's MISSING from scoring:**
- Pixel count similarity
- Model type match
- Structural position
- Group membership
- Number suffix matching (Mini Tree 1 → Mini Tree 1)
- Submodel count similarity

## 💡 Proposed Improvements

### 1. Unified Confidence Tiers

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER          │  RANGE      │  BEHAVIOR                       │
├─────────────────────────────────────────────────────────────────┤
│  🟢 Excellent  │  95-100%    │  Auto-accept, don't show        │
│  🟢 High       │  85-94%     │  Auto-accept, show in green     │
│  🟡 Good       │  70-84%     │  Auto-accept, show in yellow    │
│  🟠 Maybe      │  50-69%     │  Suggest but don't auto-accept  │
│  🔴 Low        │  <50%       │  Don't suggest                  │
└─────────────────────────────────────────────────────────────────┘

Auto-Match Threshold: 70% (unchanged)
Yellow Review: 70-84%
Green Auto-Accept: 85%+
```

### 2. Multi-Factor Scoring Algorithm

```typescript
interface MatchScore {
  // Component scores (0-1 each)
  nameScore: number;        // Semantic + exact matching
  typeScore: number;        // Same model type?
  sizeScore: number;        // Pixel count similarity
  structureScore: number;   // Submodel count, group membership
  numberScore: number;      // Instance number matching
  
  // Final weighted score
  totalScore: number;
  confidence: number;       // 0-100%
}

function calculateMatchScore(
  userItem: ItemMetadata,
  seqItem: ItemMetadata
): MatchScore {
  // 1. NAME MATCHING (40% of total)
  const nameScore = calculateNameScore(userItem.name, seqItem.name);
  
  // 2. TYPE MATCHING (20% of total)
  const typeScore = calculateTypeScore(userItem, seqItem);
  
  // 3. SIZE MATCHING (15% of total)
  const sizeScore = calculateSizeScore(userItem.pixelCount, seqItem.pixelCount);
  
  // 4. STRUCTURE MATCHING (15% of total)
  const structureScore = calculateStructureScore(userItem, seqItem);
  
  // 5. NUMBER MATCHING (10% of total)
  const numberScore = calculateNumberScore(userItem.name, seqItem.name);
  
  // WEIGHTED TOTAL
  const totalScore = 
    (nameScore * 0.40) +
    (typeScore * 0.20) +
    (sizeScore * 0.15) +
    (structureScore * 0.15) +
    (numberScore * 0.10);
  
  return {
    nameScore,
    typeScore,
    sizeScore,
    structureScore,
    numberScore,
    totalScore,
    confidence: Math.round(totalScore * 100),
  };
}
```

### 3. Component Score Functions

#### 3a. Name Score (40%)
```typescript
function calculateNameScore(userName: string, seqName: string): number {
  const userTokens = tokenizeName(userName);
  const seqTokens = tokenizeName(seqName);
  
  // Exact match = 1.0
  if (userName.toLowerCase() === seqName.toLowerCase()) {
    return 1.0;
  }
  
  // Token-based matching
  let matchedTokens = 0;
  let synonymMatches = 0;
  
  for (const userToken of userTokens) {
    if (seqTokens.includes(userToken)) {
      matchedTokens++;
    } else if (hasSynonymMatch(userToken, seqTokens)) {
      synonymMatches++;
    }
  }
  
  const totalUserTokens = userTokens.length;
  const totalSeqTokens = seqTokens.length;
  
  // Exact token matches worth more than synonym matches
  const exactScore = matchedTokens / Math.max(totalUserTokens, totalSeqTokens);
  const synonymScore = (synonymMatches * 0.8) / Math.max(totalUserTokens, totalSeqTokens);
  
  // Penalize length mismatch (user has 2 tokens, seq has 5 = suspicious)
  const lengthPenalty = 1 - Math.abs(totalUserTokens - totalSeqTokens) * 0.1;
  
  return Math.min(1, (exactScore + synonymScore) * Math.max(0.5, lengthPenalty));
}
```

#### 3b. Type Score (20%)
```typescript
function calculateTypeScore(userItem: ItemMetadata, seqItem: ItemMetadata): number {
  // Same display type = 1.0
  if (userItem.displayType === seqItem.displayType) {
    return 1.0;
  }
  
  // Compatible types = 0.7
  const compatibleTypes: Record<string, string[]> = {
    'Tree': ['Custom', 'Spinner'],  // Trees can map to custom/spinner trees
    'Arch': ['Custom'],
    'Matrix': ['Custom'],
    'Star': ['Custom'],
    'Wreath': ['Custom', 'Spinner'],
    'Custom': ['Tree', 'Arch', 'Matrix', 'Star', 'Wreath'], // Custom is flexible
  };
  
  if (compatibleTypes[userItem.displayType]?.includes(seqItem.displayType)) {
    return 0.7;
  }
  
  // Entity type must match (GROUP to GROUP, MODEL to MODEL)
  if (userItem.entityType !== seqItem.entityType) {
    return 0.0; // Hard fail - can't map group to model
  }
  
  // Different but not incompatible
  return 0.3;
}
```

#### 3c. Size Score (15%)
```typescript
function calculateSizeScore(userPixels: number, seqPixels: number): number {
  if (!userPixels || !seqPixels) return 0.5; // Unknown = neutral
  
  const ratio = Math.min(userPixels, seqPixels) / Math.max(userPixels, seqPixels);
  
  // Perfect match (within 5%)
  if (ratio >= 0.95) return 1.0;
  
  // Close match (within 20%)
  if (ratio >= 0.80) return 0.9;
  
  // Reasonable match (within 50%)
  if (ratio >= 0.50) return 0.7;
  
  // Very different sizes
  if (ratio >= 0.25) return 0.4;
  
  // Wildly different (10x difference)
  return 0.1;
}
```

#### 3d. Structure Score (15%)
```typescript
function calculateStructureScore(userItem: ItemMetadata, seqItem: ItemMetadata): number {
  let score = 0.5; // Neutral start
  
  // Submodel count similarity (for models)
  if (userItem.submodelCount !== undefined && seqItem.submodelCount !== undefined) {
    if (userItem.submodelCount === seqItem.submodelCount) {
      score += 0.3;
    } else if (Math.abs(userItem.submodelCount - seqItem.submodelCount) <= 2) {
      score += 0.15;
    }
  }
  
  // Member count similarity (for groups)
  if (userItem.memberCount !== undefined && seqItem.memberCount !== undefined) {
    const memberRatio = Math.min(userItem.memberCount, seqItem.memberCount) / 
                        Math.max(userItem.memberCount, seqItem.memberCount);
    score += memberRatio * 0.2;
  }
  
  return Math.min(1, score);
}
```

#### 3e. Number Score (10%)
```typescript
function calculateNumberScore(userName: string, seqName: string): number {
  const userNum = extractTrailingNumber(userName);
  const seqNum = extractTrailingNumber(seqName);
  
  // Both have same number = strong signal
  if (userNum !== null && seqNum !== null && userNum === seqNum) {
    return 1.0;
  }
  
  // Both have numbers but different = weak signal (might be reordered)
  if (userNum !== null && seqNum !== null) {
    return 0.3;
  }
  
  // One has number, one doesn't = neutral
  if (userNum !== null || seqNum !== null) {
    return 0.5;
  }
  
  // Neither has number = neutral
  return 0.5;
}

function extractTrailingNumber(name: string): number | null {
  const match = name.match(/(\d+)\s*$/);
  return match ? parseInt(match[1]) : null;
}
```

### 4. Boosters & Penalties

```typescript
function applyBoostersAndPenalties(
  baseScore: MatchScore,
  userItem: ItemMetadata,
  seqItem: ItemMetadata,
  context: MatchingContext
): number {
  let finalScore = baseScore.totalScore;
  
  // BOOSTERS
  
  // +10% if both items are in groups with matching names
  if (userItem.parentGroup && seqItem.parentGroup) {
    const groupNameScore = calculateNameScore(userItem.parentGroup, seqItem.parentGroup);
    if (groupNameScore > 0.7) {
      finalScore += 0.10;
    }
  }
  
  // +5% if already mapped a sibling (bulk pattern detected)
  if (context.siblingMapped) {
    finalScore += 0.05;
  }
  
  // +5% if exact pixel count match
  if (userItem.pixelCount === seqItem.pixelCount && userItem.pixelCount > 0) {
    finalScore += 0.05;
  }
  
  // PENALTIES
  
  // -20% if user item is a group but seq item is a model (or vice versa)
  if (userItem.entityType !== seqItem.entityType) {
    finalScore -= 0.20;
  }
  
  // -10% if pixel counts differ by more than 3x
  if (userItem.pixelCount && seqItem.pixelCount) {
    const ratio = Math.max(userItem.pixelCount, seqItem.pixelCount) / 
                  Math.min(userItem.pixelCount, seqItem.pixelCount);
    if (ratio > 3) {
      finalScore -= 0.10;
    }
  }
  
  return Math.max(0, Math.min(1, finalScore));
}
```

### 5. Special Case Handlers

```typescript
// Handle "All - X - GRP" pattern common in LOER sequences
function handleAllGroupPattern(userName: string, seqName: string): number | null {
  const userMatch = userName.match(/^All\s*-\s*(.+?)\s*-?\s*GRP$/i);
  const seqMatch = seqName.match(/^All\s*-\s*(.+?)\s*-?\s*GRP$/i);
  
  if (userMatch && seqMatch) {
    // Compare the middle part
    const userCore = userMatch[1].toLowerCase();
    const seqCore = seqMatch[1].toLowerCase();
    
    if (userCore === seqCore) return 1.0;
    if (areSynonyms(userCore, seqCore)) return 0.9;
  }
  
  return null; // No special handling, use normal algorithm
}

// Handle numbered series (Mini Tree 1, Mini Tree 2, etc.)
function handleNumberedSeries(
  userItems: ItemMetadata[],
  seqItems: ItemMetadata[]
): Map<string, string> {
  const bulkMatches = new Map<string, string>();
  
  // Find families with numbers
  const userFamilies = groupByFamily(userItems);
  const seqFamilies = groupByFamily(seqItems);
  
  for (const [userFamily, userMembers] of userFamilies) {
    // Find matching sequence family
    const seqFamily = findMatchingFamily(userFamily, seqFamilies);
    if (!seqFamily) continue;
    
    const seqMembers = seqFamilies.get(seqFamily)!;
    
    // Match by number
    for (const userMember of userMembers) {
      const userNum = extractTrailingNumber(userMember.name);
      if (userNum === null) continue;
      
      const seqMatch = seqMembers.find(s => 
        extractTrailingNumber(s.name) === userNum
      );
      
      if (seqMatch) {
        bulkMatches.set(userMember.name, seqMatch.name);
      }
    }
  }
  
  return bulkMatches;
}
```

## 📊 Recommended Weight Distribution

### Current vs Proposed

| Factor | Current Weight | Proposed Weight | Rationale |
|--------|---------------|-----------------|-----------|
| Name (exact) | 70% | 40% | Still important but not everything |
| Name (synonym) | 30% | (included in 40%) | Merged with name |
| Type Match | 0% | 20% | **NEW** - Critical for quality |
| Size Match | 0% | 15% | **NEW** - Catches bad matches |
| Structure | 0% | 15% | **NEW** - Submodels, members |
| Number Match | 0% | 10% | **NEW** - Series matching |

### Why These Weights?

**Name (40%)**: Still the primary signal, but relying too heavily on name alone causes issues when people use different naming conventions.

**Type (20%)**: A tree should match a tree. Currently we might suggest matching a "Mini Tree" model to a "Mini" group just because names overlap.

**Size (15%)**: If user has a 50-pixel prop and we suggest a 500-pixel match, that's probably wrong. This catches those.

**Structure (15%)**: If user's group has 4 members and seq group has 40 members, probably not a match. Submodel count matters for spinners.

**Number (10%)**: "Arch 3" should prefer "Arch 3" over "Arch 7". Small weight but breaks ties well.

## 📈 Expected Impact

### Before (Name-Only Matching)
```
"Mini Pumpkin 8" matches:
1. Mini Tree 8 (82%) ← WRONG TYPE
2. Pumpkin Large (78%) ← WRONG SIZE
3. Mini Pumpkin Group (75%) ← WRONG ENTITY TYPE
4. Mini Pumpkin 8 (72%) ← CORRECT but ranked 4th!
```

### After (Multi-Factor Matching)
```
"Mini Pumpkin 8" matches:
1. Mini Pumpkin 8 (94%) ← Correct! Name + Type + Number
2. Mini Pumpkin 5 (81%) ← Same family, different number
3. Small Pumpkin 8 (76%) ← Synonym + number match
4. Mini Tree 8 (52%) ← Name partial, type mismatch penalty
```

## 🔧 Implementation Steps

1. **Add metadata extraction** - Get pixel counts, types, submodel counts from XML
2. **Implement component score functions** - Each factor as separate function
3. **Update main matching function** - Use new weighted algorithm
4. **Add boosters/penalties** - Context-aware adjustments
5. **Update UI thresholds** - Use consistent tier system
6. **Add debugging/logging** - Show score breakdown for tuning
7. **A/B test** - Compare old vs new on real layouts

## 🧪 Test Cases

### Should Match High (85%+)
- "Mini Tree 1" ↔ "Mini Tree 1" (exact match)
- "Arch Left" ↔ "Arches Left" (plural synonym)
- "Yard Outline" ↔ "Lawn Border" (double synonym)
- "All - Floods - GRP" ↔ "All - Floods - GRP" (exact)

### Should Match Medium (70-84%)
- "Mini Tree 1" ↔ "Mini Tree 5" (same family, diff number)
- "Big Star" ↔ "Large Star" (size synonym)
- "House Center" ↔ "Home Center" (house/home synonym)

### Should Match Low (50-69%)
- "Mini Tree" ↔ "Small Tree" (synonym only, no number)
- "Arch 1" ↔ "Arc 1" (partial name match)

### Should NOT Match (<50%)
- "Mini Tree 1" ↔ "Mini Tree Group" (model vs group!)
- "50 pixel star" ↔ "500 pixel star" (10x size diff)
- "Spider" ↔ "Spinner" (similar letters, different things!)

## ✅ Acceptance Criteria

- [ ] Unified confidence tiers across all UI
- [ ] Multi-factor scoring implemented
- [ ] Type matching prevents group↔model mismatches
- [ ] Size matching flags 3x+ differences
- [ ] Number matching prioritizes same instance
- [ ] Score breakdown visible in debug mode
- [ ] Existing high-confidence matches still work
- [ ] Edge cases (All-X-GRP pattern) handled

## 🏷️ Labels
- Priority: **HIGH**
- Type: Algorithm Improvement
- Phase: Core Matching
- Effort: High (6-8 hours)
- Dependencies: Ticket 29 (metadata extraction)
