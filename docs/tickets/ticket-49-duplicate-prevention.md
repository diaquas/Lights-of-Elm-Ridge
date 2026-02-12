# Ticket 49: Auto-Match Duplicate Prevention & Optimal Assignment

## 🎯 Objective
Prevent the same destination model/group from being auto-matched to multiple source items, and implement optimal assignment that maximizes overall match quality.

## 📋 The Problem

### Current Behavior (Broken)
```
Source Models:          Best Match:         Result:
─────────────────────────────────────────────────────
GE Fuzion Spinner  →    Spinner A (92%)  →  ✓ Matched
GE Rosa Spinner    →    Spinner A (89%)  →  ✓ Matched  ← DUPLICATE!
My Big Spinner     →    Spinner A (85%)  →  ✓ Matched  ← DUPLICATE!
```

All three source spinners get matched to the same destination "Spinner A" - this is wrong!

### Desired Behavior
```
Source Models:          Candidates:              Final Match:
─────────────────────────────────────────────────────────────────
GE Fuzion Spinner  →    Spinner A (92%)      →  Spinner A (92%) ✓
                        Spinner B (78%)
                        Spinner C (71%)

GE Rosa Spinner    →    Spinner A (89%)  ✗ TAKEN
                        Spinner B (82%)      →  Spinner B (82%) ✓
                        Spinner C (75%)

My Big Spinner     →    Spinner A (85%)  ✗ TAKEN
                        Spinner B (80%)  ✗ TAKEN
                        Spinner C (79%)      →  Spinner C (79%) ✓
```

## 🔧 Algorithm: Hungarian Method (Optimal Assignment)

### Why Not Simple Greedy?

**Greedy approach** (assign best match first, mark as taken):
```
1. GE Fuzion → Spinner A (92%)  ✓
2. GE Rosa → Spinner B (82%)    ✓  (A taken)
3. My Big → Spinner C (79%)     ✓  (A, B taken)

Total score: 92 + 82 + 79 = 253
```

**But what if:**
```
GE Fuzion:  Spinner A (92%), Spinner B (91%), Spinner C (90%)
GE Rosa:    Spinner A (89%), Spinner B (60%), Spinner C (55%)
My Big:     Spinner A (85%), Spinner B (58%), Spinner C (52%)
```

**Greedy gives:**
```
GE Fuzion → Spinner A (92%)
GE Rosa → Spinner B (60%)   ← Bad match!
My Big → Spinner C (52%)    ← Bad match!

Total: 92 + 60 + 52 = 204
```

**Optimal gives:**
```
GE Fuzion → Spinner B (91%)  ← Sacrifice 1% here
GE Rosa → Spinner A (89%)    ← To get much better match here
My Big → Spinner C (52%)

Total: 91 + 89 + 52 = 232  (28 points better!)
```

### Implementation: Modified Hungarian Algorithm

```typescript
interface MatchCandidate {
  sourceModel: string;
  destModel: string;
  score: number;
  reasons: string[];
}

interface AssignmentResult {
  assignments: Map<string, string>;  // source → dest
  sacrifices: SacrificeInfo[];       // Where we chose 2nd/3rd best
  unassigned: string[];              // Sources with no valid dest
}

interface SacrificeInfo {
  sourceModel: string;
  assignedTo: string;
  assignedScore: number;
  bestMatch: string;
  bestScore: number;
  bestWentTo: string;
  scoreDifference: number;
}

function computeOptimalAssignment(
  sourceModels: string[],
  destModels: string[],
  scoreMatrix: Map<string, Map<string, number>>  // source → dest → score
): AssignmentResult {
  const n = sourceModels.length;
  const m = destModels.length;
  
  // Build cost matrix (we want to MAXIMIZE score, so use negative)
  const costMatrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    costMatrix[i] = [];
    for (let j = 0; j < m; j++) {
      const score = scoreMatrix.get(sourceModels[i])?.get(destModels[j]) || 0;
      costMatrix[i][j] = -score;  // Negative because Hungarian minimizes
    }
  }
  
  // Run Hungarian algorithm
  const assignments = hungarianAlgorithm(costMatrix);
  
  // Convert to result format
  const result: AssignmentResult = {
    assignments: new Map(),
    sacrifices: [],
    unassigned: [],
  };
  
  for (let i = 0; i < n; i++) {
    const j = assignments[i];
    if (j === -1 || j >= m) {
      result.unassigned.push(sourceModels[i]);
      continue;
    }
    
    const source = sourceModels[i];
    const dest = destModels[j];
    const assignedScore = scoreMatrix.get(source)?.get(dest) || 0;
    
    result.assignments.set(source, dest);
    
    // Check if this was a sacrifice (not the best match)
    const allScores = scoreMatrix.get(source);
    if (allScores) {
      const bestDest = findBestMatch(allScores);
      if (bestDest.dest !== dest && bestDest.score > assignedScore) {
        // Find who got the best match
        const bestWentTo = findWhoGotDest(bestDest.dest, result.assignments, sourceModels, assignments, destModels);
        
        result.sacrifices.push({
          sourceModel: source,
          assignedTo: dest,
          assignedScore,
          bestMatch: bestDest.dest,
          bestScore: bestDest.score,
          bestWentTo: bestWentTo || 'unknown',
          scoreDifference: bestDest.score - assignedScore,
        });
      }
    }
  }
  
  return result;
}

function findBestMatch(scores: Map<string, number>): { dest: string; score: number } {
  let best = { dest: '', score: 0 };
  for (const [dest, score] of scores) {
    if (score > best.score) {
      best = { dest, score };
    }
  }
  return best;
}
```

### Simplified Greedy with Backtracking (Alternative)

If Hungarian is too complex, use greedy with conflict resolution:

```typescript
function greedyAssignmentWithBacktrack(
  candidates: MatchCandidate[]
): AssignmentResult {
  // Sort all candidates by score descending
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  
  const assignments = new Map<string, string>();  // source → dest
  const usedDests = new Set<string>();
  const sacrifices: SacrificeInfo[] = [];
  
  // Track best match for each source (for sacrifice detection)
  const bestMatchPerSource = new Map<string, MatchCandidate>();
  for (const c of sorted) {
    if (!bestMatchPerSource.has(c.sourceModel)) {
      bestMatchPerSource.set(c.sourceModel, c);
    }
  }
  
  // Process in score order
  for (const candidate of sorted) {
    const { sourceModel, destModel, score } = candidate;
    
    // Skip if source already assigned
    if (assignments.has(sourceModel)) continue;
    
    // Skip if dest already used
    if (usedDests.has(destModel)) continue;
    
    // Assign!
    assignments.set(sourceModel, destModel);
    usedDests.add(destModel);
    
    // Check for sacrifice
    const best = bestMatchPerSource.get(sourceModel);
    if (best && best.destModel !== destModel) {
      // Find who got the best
      let bestWentTo = '';
      for (const [src, dst] of assignments) {
        if (dst === best.destModel) {
          bestWentTo = src;
          break;
        }
      }
      
      if (bestWentTo) {
        sacrifices.push({
          sourceModel,
          assignedTo: destModel,
          assignedScore: score,
          bestMatch: best.destModel,
          bestScore: best.score,
          bestWentTo,
          scoreDifference: best.score - score,
        });
      }
    }
  }
  
  return { assignments, sacrifices, unassigned: [] };
}
```

## 📐 Visualizing Sacrifices

### Option A: Final Check Integration (Recommended)

Add sacrifice review to Ticket 47's Final Check phase:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔍 FINAL CHECK                                                             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🔄 ASSIGNMENT TRADE-OFF                                            │   │
│  │                                                                      │   │
│  │  Your "GE Rosa Spinner" was matched to "Spinner B" (82%)            │   │
│  │  instead of its best match "Spinner A" (89%)                        │   │
│  │                                                                      │   │
│  │  Why? "Spinner A" went to "GE Fuzion Spinner" (92%)                 │   │
│  │                                                                      │   │
│  │  This gave you +3% overall vs. the alternative assignment.          │   │
│  │                                                                      │   │
│  │  Current:                                                            │   │
│  │  • GE Fuzion Spinner → Spinner A (92%)                              │   │
│  │  • GE Rosa Spinner → Spinner B (82%)                                │   │
│  │                                                                      │   │
│  │  Alternative (swap):                                                 │   │
│  │  • GE Fuzion Spinner → Spinner B (78%)                              │   │
│  │  • GE Rosa Spinner → Spinner A (89%)                                │   │
│  │  Total: -3% (current is better)                                      │   │
│  │                                                                      │   │
│  │  [Keep Current ✓]                              [Swap Assignments]   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Option B: Auto-Match Review Indicator

Show sacrifices subtly on the Auto-Match review screen:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ▼ ⚠️ Needs Review (67 matches)                              70-89%        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ☑ GE Rosa Spinner  →  Spinner B                 82%  🔄            │   │
│  │   ├─ 🔄 Best match "Spinner A" (89%) assigned to GE Fuzion         │   │
│  │   └─ [Swap with GE Fuzion?]                                         │   │
│  │                                                                      │   │
│  │ ☑ GE Fuzion Spinner  →  Spinner A               92%                 │   │
│  │                                                                      │   │
│  │ ☑ My Big Spinner  →  Spinner C                  79%  🔄            │   │
│  │   ├─ 🔄 Best matches taken by GE Fuzion & GE Rosa                  │   │
│  │   └─ [View alternatives]                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Option C: Hover Tooltip Explanation

```
┌──────────────────────────────────────────────────────────────┐
│ GE Rosa Spinner → Spinner B                            82%   │
├──────────────────────────────────────────────────────────────┤
│ ℹ️ Why not "Spinner A" (89%)?                                │
│                                                              │
│ "Spinner A" was assigned to "GE Fuzion Spinner" because     │
│ it was an even better match there (92%).                     │
│                                                              │
│ This assignment gives you +3% overall match quality.         │
│                                                              │
│ [Swap anyway]                                                │
└──────────────────────────────────────────────────────────────┘
```

## 🔧 Full Implementation

### 1. Score Matrix Builder

```typescript
function buildScoreMatrix(
  sourceModels: SourceModel[],
  destModels: DestModel[],
  effectAnalysis: SequenceEffectAnalysis
): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>();
  
  for (const source of sourceModels) {
    const sourceScores = new Map<string, number>();
    
    for (const dest of destModels) {
      const score = calculateMatchScore(source, dest, effectAnalysis);
      if (score >= MINIMUM_MATCH_THRESHOLD) {
        sourceScores.set(dest.name, score);
      }
    }
    
    matrix.set(source.name, sourceScores);
  }
  
  return matrix;
}
```

### 2. Auto-Match with Optimal Assignment

```typescript
async function performAutoMatch(
  userLayout: UserLayout,
  sequenceLayout: SequenceLayout,
  effectAnalysis: SequenceEffectAnalysis
): Promise<AutoMatchResult> {
  // Build score matrix
  const scoreMatrix = buildScoreMatrix(
    sequenceLayout.models,
    userLayout.models,
    effectAnalysis
  );
  
  // Compute optimal assignment (no duplicates!)
  const assignment = computeOptimalAssignment(
    sequenceLayout.models.map(m => m.name),
    userLayout.models.map(m => m.name),
    scoreMatrix
  );
  
  // Build result
  const matches: AutoMatch[] = [];
  
  for (const [source, dest] of assignment.assignments) {
    const score = scoreMatrix.get(source)?.get(dest) || 0;
    const confidence = score >= 0.90 ? 'high' : score >= 0.70 ? 'medium' : 'low';
    
    // Find if this was a sacrifice
    const sacrifice = assignment.sacrifices.find(s => s.sourceModel === source);
    
    matches.push({
      sourceModel: source,
      destModel: dest,
      score,
      confidence,
      sacrifice: sacrifice ? {
        bestMatch: sacrifice.bestMatch,
        bestScore: sacrifice.bestScore,
        bestWentTo: sacrifice.bestWentTo,
        scoreDifference: sacrifice.scoreDifference,
      } : undefined,
    });
  }
  
  return {
    matches,
    sacrifices: assignment.sacrifices,
    unassigned: assignment.unassigned,
  };
}
```

### 3. Sacrifice Data Structure

```typescript
interface AutoMatch {
  sourceModel: string;
  destModel: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  
  // NEW: Sacrifice info if this wasn't the best match
  sacrifice?: {
    bestMatch: string;
    bestScore: number;
    bestWentTo: string;
    scoreDifference: number;
  };
}

interface AutoMatchResult {
  matches: AutoMatch[];
  sacrifices: SacrificeInfo[];  // All sacrifices for summary
  unassigned: string[];
}
```

### 4. Swap Function

```typescript
function swapAssignments(
  matches: AutoMatch[],
  sourceA: string,
  sourceB: string
): AutoMatch[] {
  const matchA = matches.find(m => m.sourceModel === sourceA);
  const matchB = matches.find(m => m.sourceModel === sourceB);
  
  if (!matchA || !matchB) return matches;
  
  // Swap destinations
  const newMatches = matches.map(m => {
    if (m.sourceModel === sourceA) {
      return { ...m, destModel: matchB.destModel };
    }
    if (m.sourceModel === sourceB) {
      return { ...m, destModel: matchA.destModel };
    }
    return m;
  });
  
  // Recalculate scores and sacrifice info
  return recalculateMatchInfo(newMatches);
}
```

### 5. UI Component for Sacrifice Indicator

```tsx
function SacrificeIndicator({ sacrifice }: { sacrifice: AutoMatch['sacrifice'] }) {
  if (!sacrifice) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
            🔄 2nd best
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="w-72 p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Why not "{sacrifice.bestMatch}" ({Math.round(sacrifice.bestScore * 100)}%)?
            </p>
            <p className="text-xs text-muted-foreground">
              It was assigned to "{sacrifice.bestWentTo}" because it was an even 
              better match there.
            </p>
            <p className="text-xs">
              Score difference: -{Math.round(sacrifice.scoreDifference * 100)}%
            </p>
            <Button size="sm" variant="outline" className="w-full mt-2">
              Swap with {sacrifice.bestWentTo}
            </Button>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

## 📊 Summary Statistics

Add to Auto-Match Review screen:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ASSIGNMENT SUMMARY                                                         │
│                                                                             │
│  96 items auto-matched                                                      │
│  ├─ 72 got their best match (75%)                                          │
│  ├─ 18 got their 2nd best match (19%)  🔄                                  │
│  ├─  5 got their 3rd best match (5%)   🔄                                  │
│  └─  1 got 4th+ best match (1%)        🔄                                  │
│                                                                             │
│  Overall score: 94.2% (vs 91.8% with naive assignment)                     │
│                                                                             │
│  [View assignment trade-offs]                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## ✅ Acceptance Criteria

### Core Algorithm:
- [ ] No destination model appears in more than one auto-match
- [ ] Algorithm maximizes total match quality (not just individual)
- [ ] Handles edge cases (more sources than dests, etc.)
- [ ] Performance: <2 seconds for 500 source × 500 dest

### Sacrifice Tracking:
- [ ] Track when a model gets 2nd/3rd/etc. best match
- [ ] Record why (which source got the better match)
- [ ] Calculate score difference

### Visualization:
- [ ] Indicator on matches that aren't best match (🔄 badge)
- [ ] Tooltip explains why
- [ ] Easy swap action available
- [ ] Summary stats in review

### Final Check Integration:
- [ ] Show significant sacrifices (>5% score difference)
- [ ] Allow swap with explanation of trade-off
- [ ] Show overall impact of swap

## 🧪 Test Cases

1. **No conflicts**: 3 sources, 3 dests, no overlapping best matches → all get best
2. **Simple conflict**: 2 sources want same dest → higher score wins, other gets 2nd best
3. **Chain conflict**: A wants X, B wants X, C wants Y, but B's 2nd is Y → optimal assignment
4. **All want same**: 5 sources all want Dest A → only 1 gets it, others cascade
5. **More sources than dests**: 10 sources, 5 dests → 5 assigned, 5 unassigned
6. **Swap action**: Swapping two assignments updates both correctly
7. **Score calculation**: Verify greedy vs optimal gives different (better) results

## 🏷️ Labels
- Priority: **HIGH** (Bug fix - duplicates are broken behavior)
- Type: Bug Fix + Enhancement
- Effort: High (6-8 hours)
- Impact: **Critical** - Prevents invalid mappings
- Related: Ticket 38 (Matching Algorithm)
