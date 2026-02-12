# Ticket 33: Filter Out Zero-Effect Models

## 🎯 Objective
Dramatically reduce user workload by hiding models with 0 effects from the main mapping list. These models have no visual impact in the sequence and rarely need to be mapped.

## 📋 Problem Statement
Currently showing ALL models that are associated with groups that have effects, but many individual models within those groups have 0 effects themselves:

- User sees 74 models to map
- Maybe only 25 actually have effects
- User wastes time on 49 models that don't matter
- **This is probably 50-70% of the workload!**

## 💡 Solution
Filter models by effect count:
- **Main list**: Only models with 1+ effects
- **Collapsed section**: Models with 0 effects (hidden by default)

## 📐 Visual Design

### Before (All Models Mixed Together)
```
Individual Models
74 models need matching · 60 already mapped

┌────────────────────────────────────────┐
│ Matrix                    🎬 122      │  ← Has effects ✓
│ Spider 6                  🎬 10       │  ← Has effects ✓
│ Tree - Spiral (8)                      │  ← Group, mixed?
│ Fence Panel (4)                        │  ← Group, mixed?
│ Spinner - Fuzion          🎬 5        │  ← Has effects ✓
│ Pixel Forest              🎬 3        │  ← Has effects ✓
│ Random Model 1            🎬 0        │  ← NO EFFECTS!
│ Random Model 2            🎬 0        │  ← NO EFFECTS!
│ Random Model 3            🎬 0        │  ← NO EFFECTS!
│ ... 40 more with 0 effects            │
└────────────────────────────────────────┘
```

### After (Filtered with Collapsed Section)
```
Individual Models
25 models need matching · 60 already mapped
(49 models with 0 effects hidden)

┌────────────────────────────────────────┐
│ Matrix                    🎬 122      │
│ Spider 6                  🎬 10       │
│ Spinner - Fuzion          🎬 5        │
│ Pixel Forest              🎬 3        │
│ Tree - Spiral (8)         🎬 47 total │
│ Fence Panel (4)           🎬 12 total │
│ ... only models WITH effects          │
├────────────────────────────────────────┤
│ ▶ 0 Effects (49 models)    [COLLAPSED]│  ← Hidden by default
└────────────────────────────────────────┘
```

### Expanded 0 Effects Section
```
├────────────────────────────────────────┤
│ ▼ 0 Effects (49 models)               │
│   ┌────────────────────────────────┐  │
│   │ Random Model 1        🎬 0     │  │
│   │ Random Model 2        🎬 0     │  │
│   │ Random Model 3        🎬 0     │  │
│   │ ...                            │  │
│   └────────────────────────────────┘  │
│   💡 These models have no effects in  │
│      the sequence. Map only if you    │
│      plan to add effects later.       │
└────────────────────────────────────────┘
```

## 🔧 Implementation

### 1. Filter Logic

```typescript
interface FilteredModels {
  withEffects: ModelMetadata[];
  zeroEffects: ModelMetadata[];
}

function filterModelsByEffects(models: ModelMetadata[]): FilteredModels {
  return {
    withEffects: models.filter(m => m.effectCount > 0),
    zeroEffects: models.filter(m => m.effectCount === 0),
  };
}
```

### 2. Updated Models Phase Component

```tsx
function ModelsPhase({ models, onMatch, onSkip }: ModelsPhaseProps) {
  const [showZeroEffects, setShowZeroEffects] = useState(false);
  
  const { withEffects, zeroEffects } = useMemo(
    () => filterModelsByEffects(models),
    [models]
  );
  
  // Count unmapped in each category
  const unmappedWithEffects = withEffects.filter(m => m.status === 'unmapped').length;
  const unmappedZeroEffects = zeroEffects.filter(m => m.status === 'unmapped').length;
  
  return (
    <div className="space-y-4">
      {/* Header with updated counts */}
      <div>
        <h2 className="text-2xl font-bold">Individual Models</h2>
        <p className="text-muted-foreground">
          {unmappedWithEffects} models need matching · {mappedCount} already mapped
        </p>
        {zeroEffects.length > 0 && (
          <p className="text-sm text-muted-foreground/70">
            ({zeroEffects.length} models with 0 effects hidden)
          </p>
        )}
      </div>
      
      {/* Search & Sort */}
      <div className="flex gap-2">
        <SearchInput placeholder="Filter models..." />
        <SortDropdown />
      </div>
      
      {/* Main List - Models WITH Effects */}
      <div className="space-y-2">
        {withEffects.map(model => (
          <ModelCard 
            key={model.name} 
            model={model}
            onMatch={onMatch}
            onSkip={onSkip}
          />
        ))}
      </div>
      
      {/* Zero Effects Section - Collapsed by Default */}
      {zeroEffects.length > 0 && (
        <Collapsible open={showZeroEffects} onOpenChange={setShowZeroEffects}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-3 bg-muted/30 
                          rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                {showZeroEffects ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium text-muted-foreground">
                  0 Effects ({zeroEffects.length} models)
                </span>
              </div>
              <Badge variant="outline" className="text-muted-foreground">
                {unmappedZeroEffects} unmapped
              </Badge>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="mt-2 p-4 bg-muted/20 rounded-lg space-y-2">
              {/* Info Banner */}
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  These models have no effects in the sequence. 
                  Map them only if you plan to add effects later.
                </AlertDescription>
              </Alert>
              
              {/* Zero Effect Models */}
              {zeroEffects.map(model => (
                <ModelCard 
                  key={model.name} 
                  model={model}
                  onMatch={onMatch}
                  onSkip={onSkip}
                  muted // Visually de-emphasized
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
```

### 3. Apply to Groups Phase Too

Same logic applies - groups with 0 total effects across all members should be collapsed:

```typescript
function filterGroupsByEffects(groups: GroupMetadata[]): FilteredGroups {
  return {
    withEffects: groups.filter(g => g.totalEffectCount > 0),
    zeroEffects: groups.filter(g => g.totalEffectCount === 0),
  };
}
```

### 4. Update Progress Calculation

Don't count zero-effect items against completion unless user explicitly maps them:

```typescript
function calculateProgress(items: ItemMetadata[]): ProgressStats {
  const withEffects = items.filter(i => i.effectCount > 0);
  const zeroEffects = items.filter(i => i.effectCount === 0);
  
  const mappedWithEffects = withEffects.filter(i => i.status === 'mapped').length;
  const mappedZeroEffects = zeroEffects.filter(i => i.status === 'mapped').length;
  
  return {
    // Primary progress = only items with effects
    primaryTotal: withEffects.length,
    primaryMapped: mappedWithEffects,
    primaryPercent: Math.round((mappedWithEffects / withEffects.length) * 100),
    
    // Secondary = zero effect items (bonus)
    secondaryTotal: zeroEffects.length,
    secondaryMapped: mappedZeroEffects,
    
    // Display string
    displayText: `${mappedWithEffects} of ${withEffects.length} mapped`,
  };
}
```

### 5. Optional: Auto-Skip Zero Effects

```tsx
// Bulk action to skip all zero-effect models
function SkipZeroEffectsButton({ zeroEffects, onBulkSkip }: Props) {
  if (zeroEffects.length === 0) return null;
  
  const unmapped = zeroEffects.filter(m => m.status === 'unmapped');
  if (unmapped.length === 0) return null;
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => onBulkSkip(unmapped.map(m => m.name))}
    >
      Skip all {unmapped.length} zero-effect models
    </Button>
  );
}
```

## 📊 Expected Impact

### Before
| Metric | Count |
|--------|-------|
| Models shown | 74 |
| User decisions needed | 74 |
| Time to complete | ~15-20 min |

### After
| Metric | Count |
|--------|-------|
| Models shown (main) | ~25 |
| Models hidden (0 effects) | ~49 |
| User decisions needed | ~25 |
| Time to complete | **~5-7 min** |

**Estimated 60-70% reduction in workload!**

## ✅ Acceptance Criteria

### Filtering:
- [ ] Models with 0 effects moved to collapsed section
- [ ] Collapsed section hidden by default
- [ ] Click to expand and see zero-effect models
- [ ] Explanatory text in collapsed section

### Counts:
- [ ] Header shows count of models WITH effects
- [ ] Parenthetical note shows hidden count
- [ ] Progress bar only counts models with effects
- [ ] Zero-effect section shows its own unmapped count

### Apply to All Phases:
- [ ] Models phase: filter individual models
- [ ] Groups phase: filter groups with 0 total effects
- [ ] Submodel Groups: filter by effect count

### Optional Actions:
- [ ] "Skip all zero-effect models" bulk action
- [ ] Zero-effect models can still be mapped if expanded

## 🧪 Test Cases

1. **Main list filtered**: 74 models, 49 with 0 effects → main list shows 25
2. **Collapsed section**: Section shows "(49 models)" in header
3. **Expand section**: Click → shows all 49 zero-effect models
4. **Progress accurate**: 25 with effects, 20 mapped → "20 of 25 mapped"
5. **Bulk skip**: Click "Skip all" → 49 models marked as skipped
6. **Can still map**: Expand, click zero-effect model → can map it
7. **Groups too**: Groups with 0 total effects also collapsed

## 🏷️ Labels
- Priority: **HIGH**
- Type: UX Improvement
- Phase: Models, Groups, Submodel Groups
- Effort: Medium (2-3 hours)
- Impact: **60-70% workload reduction**
