# Ticket 35: Hide Zero-Effect Models Completely

## 🎯 Objective
Remove zero-effect models from the mapping experience entirely. They have no visual impact and shouldn't count toward any metrics or require user attention.

## 📋 Rationale

### Why Hide Completely (vs Collapsed Section)?
1. **Zero visual impact** - these models literally do nothing in this sequence
2. **ModIQ makes "master mappings" obsolete** - re-mapping takes 2-3 min now, not 2-3 hours
3. **Cleaner metrics** - 100% should mean "100% of things that matter"
4. **Less cognitive load** - users don't wonder "should I map these?"
5. **They're just noise** - only exist because they're in groups that DO have effects

### The Old Thinking vs New Thinking
```
OLD: "I should map everything so I have a master file for this vendor"
     → Made sense when mapping took 2-3 hours

NEW: "I only need to map what's used in THIS sequence"
     → ModIQ makes re-mapping trivial if vendor updates their layout
```

## 📐 Implementation

### What Changes

| Area | Before | After |
|------|--------|-------|
| Model list | Shows all models | Only models with 1+ effects |
| Group list | Shows all groups | Only groups with 1+ total effects |
| Progress counter | "25 of 74 mapped" | "25 of 25 mapped" |
| Effects coverage | Includes 0-effect in total | Only counts models with effects |
| Metrics | Diluted by 0-effect items | Pure, meaningful numbers |

### UI Treatment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Individual Models                                                          │
│  25 models need matching · 18 already mapped                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ┌───────┐                                                           │   │
│  │ │  847  │  Matrix                                               ✕   │   │
│  │ │effects│  📍 7.2k pixels  ·  Matrix                               │   │
│  │ └───────┘                                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ┌───────┐                                                           │   │
│  │ │  122  │  Spinner - Fuzion                                     ✕   │   │
│  │ │effects│  📍 996 pixels  ·  Spinner                               │   │
│  │ └───────┘                                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ... only models with effects shown ...                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ℹ️  49 models with 0 effects are not shown — they have no visual   │   │
│  │      impact in this sequence.                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Code Implementation

#### 1. Filter at Data Layer

```typescript
interface ProcessedLayout {
  // Only items with effects
  models: ModelMetadata[];
  groups: GroupMetadata[];
  submodelGroups: SubmodelGroupMetadata[];
  
  // Stats (for footnote)
  hiddenCounts: {
    models: number;
    groups: number;
    submodelGroups: number;
  };
}

function processLayoutForMapping(
  layout: ParsedLayout,
  effectCounts: Map<string, number>
): ProcessedLayout {
  // Filter to only items with effects
  const modelsWithEffects = layout.models.filter(m => 
    (effectCounts.get(m.name) || 0) > 0
  );
  
  const groupsWithEffects = layout.groups.filter(g => {
    // Group has effects if ANY member has effects
    const totalEffects = g.members.reduce(
      (sum, member) => sum + (effectCounts.get(member) || 0), 
      0
    );
    return totalEffects > 0;
  });
  
  const submodelGroupsWithEffects = layout.submodelGroups.filter(sg =>
    (effectCounts.get(sg.name) || 0) > 0
  );
  
  return {
    models: modelsWithEffects,
    groups: groupsWithEffects,
    submodelGroups: submodelGroupsWithEffects,
    
    hiddenCounts: {
      models: layout.models.length - modelsWithEffects.length,
      groups: layout.groups.length - groupsWithEffects.length,
      submodelGroups: layout.submodelGroups.length - submodelGroupsWithEffects.length,
    },
  };
}
```

#### 2. Update All Metric Calculations

```typescript
// All metrics now ONLY consider items with effects

function calculateProgress(items: ItemMetadata[]): ProgressStats {
  // items array already filtered to only those with effects
  const mapped = items.filter(i => i.status === 'mapped').length;
  const total = items.length;
  
  return {
    mapped,
    total,
    percent: total > 0 ? Math.round((mapped / total) * 100) : 100,
  };
}

function calculateEffectsCoverage(items: ItemMetadata[]): EffectsCoverage {
  // items array already filtered to only those with effects
  const mappedEffects = items
    .filter(i => i.status === 'mapped')
    .reduce((sum, i) => sum + i.effectCount, 0);
  
  const totalEffects = items.reduce((sum, i) => sum + i.effectCount, 0);
  
  return {
    mapped: mappedEffects,
    total: totalEffects,
    remaining: totalEffects - mappedEffects,
    percent: totalEffects > 0 ? Math.round((mappedEffects / totalEffects) * 100) : 100,
  };
}
```

#### 3. Footnote Component

```tsx
function HiddenItemsFootnote({ hiddenCounts }: { hiddenCounts: HiddenCounts }) {
  const parts: string[] = [];
  
  if (hiddenCounts.models > 0) {
    parts.push(`${hiddenCounts.models} model${hiddenCounts.models > 1 ? 's' : ''}`);
  }
  if (hiddenCounts.groups > 0) {
    parts.push(`${hiddenCounts.groups} group${hiddenCounts.groups > 1 ? 's' : ''}`);
  }
  if (hiddenCounts.submodelGroups > 0) {
    parts.push(`${hiddenCounts.submodelGroups} submodel group${hiddenCounts.submodelGroups > 1 ? 's' : ''}`);
  }
  
  if (parts.length === 0) return null;
  
  const itemList = parts.join(', ');
  
  return (
    <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
      <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <p>
        {itemList} with 0 effects {parts.length > 1 ? 'are' : 'is'} not shown — 
        {parts.length > 1 ? 'they have' : 'it has'} no visual impact in this sequence.
      </p>
    </div>
  );
}
```

#### 4. Update Auto-Match Logic

```typescript
function performAutoMatch(
  userLayout: ProcessedLayout,  // Already filtered!
  sequenceLayout: ProcessedLayout,  // Already filtered!
  minConfidence: number = 0.70
): AutoMatchResult[] {
  // Only matching items that have effects
  // Zero-effect items never enter the matching flow
  
  const results: AutoMatchResult[] = [];
  
  for (const userModel of userLayout.models) {
    // userLayout.models already excludes 0-effect models
    const match = findBestMatch(userModel, sequenceLayout.models);
    if (match && match.confidence >= minConfidence) {
      results.push({
        userItem: userModel.name,
        sequenceItem: match.item.name,
        confidence: match.confidence,
        type: 'MODEL',
        accepted: true,
      });
    }
  }
  
  // ... same for groups and submodelGroups
  
  return results;
}
```

### 5. Export Considerations

When generating the `.xmap` file:
- Only include mappings for items with effects
- Zero-effect items don't get exported (they'd do nothing anyway)

```typescript
function generateXmap(mappings: Mapping[]): string {
  // mappings only contains items with effects
  // No special handling needed - zero-effect items were never in the flow
  return mappings
    .map(m => `${m.source}\t${m.destination}`)
    .join('\n');
}
```

## 📊 Impact

### Before (74 models)
```
Visible: 74 models
With effects: 25
Zero effects: 49

User sees: 74 items to deal with
Progress: "18 of 74 mapped (24%)" ← Feels like barely started
```

### After (25 models)
```
Visible: 25 models (only those with effects)
Hidden: 49 (with footnote explaining)

User sees: 25 items to deal with
Progress: "18 of 25 mapped (72%)" ← Almost done!
```

**Psychological impact**: User feels successful, not overwhelmed.

## ✅ Acceptance Criteria

### Filtering:
- [ ] Models with 0 effects completely hidden from UI
- [ ] Groups with 0 total effects completely hidden
- [ ] Submodel groups with 0 effects completely hidden
- [ ] Footnote shows count of hidden items

### Metrics:
- [ ] Progress counter excludes zero-effect items
- [ ] Effects coverage excludes zero-effect items
- [ ] "X of Y mapped" only counts items with effects
- [ ] 100% means "all items with effects mapped"

### Auto-Match:
- [ ] Zero-effect items never enter auto-match
- [ ] Auto-match counts exclude zero-effect items

### Export:
- [ ] xmap file only includes items with effects
- [ ] No empty/useless mappings exported

### UX:
- [ ] Clean, focused interface
- [ ] No collapsed "0 effects" section (removed per this ticket)
- [ ] Informative footnote explains hidden items
- [ ] User never has to think about zero-effect items

## 🧪 Test Cases

1. **Filtering works**: 74 total models, 49 with 0 effects → 25 shown
2. **Footnote accurate**: Shows "49 models with 0 effects not shown"
3. **Progress accurate**: Map 18 of 25 → shows "18 of 25 (72%)"
4. **100% achievable**: Map all 25 → shows "25 of 25 (100%)" 
5. **Effects coverage**: Only counts effects from visible models
6. **Export clean**: xmap contains only items with effects
7. **Groups filtered**: Group with 0 total effects → hidden
8. **Mixed group shown**: Group with 3/10 members having effects → shown

## 🏷️ Labels
- Priority: **HIGH**
- Type: UX Improvement
- Phase: All mapping phases
- Effort: Medium (2-3 hours)
- Supersedes: Ticket 33 "collapsed section" approach
- Note: Ticket 33 can proceed with collapse approach; this ticket removes the section entirely
