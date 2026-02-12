# Ticket 14: Fix Counters and Confidence Display

## 🎯 Objective
Fix all broken/missing counters and statistics throughout the wizard.

## 📋 Problem Statement
From UX walkthrough:
- "How many of 205? Don't know, we never filled in that number"
- "Average confidence is 0%. That's obviously wrong. I think the average confidence here is 100"
- "0 of 50 complete, we've completed 4 or 5"
- "I don't think we mapped 43 spinners. I think we mapped 43 submodel groups"

## 🔧 Issues to Fix

### 1. Header Progress Counter
**Current:** "? of 205"
**Expected:** "47 of 205"

```tsx
// Calculate dynamically
const mappedCount = items.filter(i => i.mapping !== null).length;
const totalCount = items.length;

<ProgressHeader>
  {mappedCount} of {totalCount} mapped
</ProgressHeader>
```

### 2. Average Confidence Display
**Current:** "0%" (always)
**Expected:** Actual average of matched items

```tsx
function calculateAverageConfidence(items: MappingItem[]): number {
  const matchedItems = items.filter(i => i.mapping !== null && i.confidence);
  if (matchedItems.length === 0) return 0;
  
  const sum = matchedItems.reduce((acc, item) => acc + (item.confidence || 0), 0);
  return Math.round(sum / matchedItems.length);
}

// Display
<Stat label="Average Confidence">
  {averageConfidence}%
</Stat>
```

### 3. Phase-Specific Counters
**Current:** "0 of 50 complete" (stuck at 0)
**Expected:** Updates in real-time as user maps items

```tsx
// Track in state, update on each match
const [completedCount, setCompletedCount] = useState(0);

const handleMatch = (item: string, match: string) => {
  // ... mapping logic
  setCompletedCount(prev => prev + 1);
};
```

### 4. Review Screen Labels
**Current:** "43 Spinners mapped"
**Wrong:** User only has 6 spinners

**Expected:** "43 Submodel Groups mapped"

```tsx
// Use correct terminology
const stats = {
  models: modelMappings.length,
  groups: groupMappings.length,
  submodelGroups: submodelGroupMappings.length, // NOT "spinners"
};

<ReviewStat>
  {stats.submodelGroups} Submodel Groups mapped
</ReviewStat>
```

## 📐 Counter Locations

```
┌─────────────────────────────────────────────────────────────────┐
│  ○────○────●────○────○────○   47 of 205 mapped  ← FIX #1       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │ Groups (12)    ← OK │    │ Stats:                          │ │
│  │                     │    │ • Avg Confidence: 94% ← FIX #2  │ │
│  │ ● Arches GRP        │    │ • Matched: 8 of 12  ← FIX #3    │ │
│  │   Mini Trees GRP    │    │                                 │ │
│  │   ...               │    │                                 │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                              8 of 12 mapped    [Continue →]     │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation

### Counter State Management
```tsx
interface WizardState {
  // Per-phase counters
  autoMatches: { total: number; confirmed: number };
  groups: { total: number; mapped: number; skipped: number };
  models: { total: number; mapped: number; skipped: number };
  highDensity: { total: number; mapped: number; skipped: number };
  
  // Calculated
  get overallProgress(): number;
  get averageConfidence(): number;
}

// Update on every action
function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'MAP_ITEM':
      return {
        ...state,
        [action.phase]: {
          ...state[action.phase],
          mapped: state[action.phase].mapped + 1,
        },
      };
    case 'SKIP_ITEM':
      return {
        ...state,
        [action.phase]: {
          ...state[action.phase],
          skipped: state[action.phase].skipped + 1,
        },
      };
    // ...
  }
}
```

### Confidence Calculation
```tsx
function getConfidenceForMatch(
  userItem: string,
  sequenceItem: string,
  matchType: 'exact' | 'semantic' | 'manual'
): number {
  switch (matchType) {
    case 'exact':
      return 100;
    case 'semantic':
      // Use actual similarity score from matching algorithm
      return calculateSemanticSimilarity(userItem, sequenceItem);
    case 'manual':
      // User explicitly chose this, assume high confidence
      return 95;
    default:
      return 0;
  }
}
```

## ✅ Acceptance Criteria

- [ ] Header shows "X of Y mapped" with real numbers
- [ ] Average confidence calculates from actual match scores
- [ ] Per-phase counters update in real-time
- [ ] "0 of 50" bug fixed - starts at correct count
- [ ] Review screen says "Submodel Groups" not "Spinners"
- [ ] All percentages between 0-100 (no negatives, no >100)
- [ ] Counters persist through phase navigation (back/forward)

## 🧪 Test Cases

1. **Initial load**: Counters show correct totals
2. **After match**: Counter increments immediately
3. **After skip**: Counter increments (skipped items count as "processed")
4. **Navigation**: Go back, go forward - counters still correct
5. **Refresh**: If state persisted, counters restore correctly
6. **Edge cases**: 0 items, 1 item, all items matched

## 🏷️ Labels
- Priority: **CRITICAL**
- Type: Bug Fix
- Phase: All phases
- Effort: Medium (2-3 hours)
