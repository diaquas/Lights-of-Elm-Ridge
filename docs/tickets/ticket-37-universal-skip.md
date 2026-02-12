# Ticket 37: Universal Skip Functionality

## 🎯 Objective
Implement consistent skip behavior across the entire mapping interface:
1. Skip ANY item on EITHER side (source or destination)
2. Skipped items are excluded from suggestions and matching
3. Skipped items archived in collapsible section for recovery
4. Works the same way everywhere

## 📋 Current Problems

### Inconsistent Skip Behavior
- Left panel: Some phases have skip, some don't
- Right panel: No skip at all
- Skipped items: Sometimes hidden, sometimes shown
- Suggestions: Still suggest skipped items

### What Users Need
- "I don't have any Pixel Stakes, stop suggesting them"
- "I'm not going to map my Test Matrix, hide it"
- "Actually, I need that back - where did it go?"

## 📐 Universal Skip Design

### Core Principles
1. **Any item can be skipped** - left or right, any phase
2. **Skipped = invisible** - removed from suggestions, counts, matching
3. **Recoverable** - collapsed "Skipped Items" section at bottom
4. **Persisted** - skip state saved with session

### Visual Design

#### Left Panel (Source Items)
```
┌─────────────────────────────────────────────────────────────────┐
│  Individual Models                                              │
│  25 models need matching · 18 already mapped                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ┌───────┐                                               │   │
│  │ │  847  │  Matrix                                   [✕] │   │  ← Skip button
│  │ │effects│  📍 7.2k pixels  ·  Matrix                    │   │
│  │ └───────┘                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ┌───────┐                                               │   │
│  │ │  122  │  Spinner - Fuzion                         [✕] │   │
│  │ │effects│  📍 996 pixels  ·  Spinner                    │   │
│  │ └───────┘                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ... more items ...                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▶ Skipped Items (3)                            [Restore All] │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### Right Panel (Destination Items)
```
┌─────────────────────────────────────────────────────────────────┐
│  ALL MODELS (242)                                               │
│                                                                 │
│  🔍 Search...                                                   │
│                                                                 │
│  AI SUGGESTIONS (5)                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Display Panel                    MATRIX   7.5k   87%   │   │
│  │  Main Matrix                      MATRIX   7.2k   82%   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ALL MODELS                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Display Panel            MATRIX   7.5k           [✕]   │   │  ← Skip on right too!
│  │  Main Matrix              MATRIX   7.2k   [1]     [✕]   │   │
│  │  Virtual Matrix           MATRIX   36k            [✕]   │   │
│  │  Pixel Stake (76)         LINE     12px           [✕]   │   │  ← Skip entire group!
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▶ Skipped (12)                                 [Restore All] │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### Expanded Skipped Section
```
┌─────────────────────────────────────────────────────────────────┐
│ ▼ Skipped Items (3)                               [Restore All] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Test Matrix              skipped 5 min ago    [Restore] │   │
│  │  Backup Display           skipped 5 min ago    [Restore] │   │
│  │  Debug Model              skipped 2 min ago    [Restore] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation

### 1. Skip State Management

```typescript
interface SkipState {
  // Source items (user's layout)
  sourceSkipped: Set<string>;
  
  // Destination items (sequence layout)  
  destinationSkipped: Set<string>;
  
  // Timestamps for "skipped X ago"
  skipTimes: Map<string, Date>;
}

function createSkipState(): SkipState {
  return {
    sourceSkipped: new Set(),
    destinationSkipped: new Set(),
    skipTimes: new Map(),
  };
}

// Actions
function skipSourceItem(state: SkipState, itemName: string): SkipState {
  const newSourceSkipped = new Set(state.sourceSkipped);
  newSourceSkipped.add(itemName);
  
  const newSkipTimes = new Map(state.skipTimes);
  newSkipTimes.set(`source:${itemName}`, new Date());
  
  return {
    ...state,
    sourceSkipped: newSourceSkipped,
    skipTimes: newSkipTimes,
  };
}

function skipDestinationItem(state: SkipState, itemName: string): SkipState {
  const newDestSkipped = new Set(state.destinationSkipped);
  newDestSkipped.add(itemName);
  
  const newSkipTimes = new Map(state.skipTimes);
  newSkipTimes.set(`dest:${itemName}`, new Date());
  
  return {
    ...state,
    destinationSkipped: newDestSkipped,
    skipTimes: newSkipTimes,
  };
}

function restoreSourceItem(state: SkipState, itemName: string): SkipState {
  const newSourceSkipped = new Set(state.sourceSkipped);
  newSourceSkipped.delete(itemName);
  
  return {
    ...state,
    sourceSkipped: newSourceSkipped,
  };
}

function restoreDestinationItem(state: SkipState, itemName: string): SkipState {
  const newDestSkipped = new Set(state.destinationSkipped);
  newDestSkipped.delete(itemName);
  
  return {
    ...state,
    destinationSkipped: newDestSkipped,
  };
}

function restoreAllSource(state: SkipState): SkipState {
  return {
    ...state,
    sourceSkipped: new Set(),
  };
}

function restoreAllDestination(state: SkipState): SkipState {
  return {
    ...state,
    destinationSkipped: new Set(),
  };
}
```

### 2. Filter Items Based on Skip State

```typescript
// Get visible items (excluding skipped)
function getVisibleSourceItems(
  allItems: ItemMetadata[],
  skipState: SkipState
): { visible: ItemMetadata[]; skipped: ItemMetadata[] } {
  const visible = allItems.filter(item => !skipState.sourceSkipped.has(item.name));
  const skipped = allItems.filter(item => skipState.sourceSkipped.has(item.name));
  return { visible, skipped };
}

function getVisibleDestinationItems(
  allItems: ItemMetadata[],
  skipState: SkipState
): { visible: ItemMetadata[]; skipped: ItemMetadata[] } {
  const visible = allItems.filter(item => !skipState.destinationSkipped.has(item.name));
  const skipped = allItems.filter(item => skipState.destinationSkipped.has(item.name));
  return { visible, skipped };
}
```

### 3. Exclude Skipped from Suggestions

```typescript
function generateSuggestions(
  sourceItem: ItemMetadata,
  allDestItems: ItemMetadata[],
  skipState: SkipState,
  mappingState: MappingState
): Suggestion[] {
  // Filter out:
  // 1. Skipped destination items
  // 2. Already mapped items (optional - might want to show with "IN USE")
  
  const availableDestItems = allDestItems.filter(item => 
    !skipState.destinationSkipped.has(item.name)
  );
  
  // Run matching algorithm on available items only
  return availableDestItems
    .map(destItem => ({
      item: destItem,
      score: calculateMatchScore(sourceItem, destItem),
    }))
    .filter(s => s.score.confidence >= 50)
    .sort((a, b) => b.score.confidence - a.score.confidence)
    .slice(0, 5);
}
```

### 4. Exclude Skipped from Auto-Match

```typescript
function performAutoMatch(
  sourceItems: ItemMetadata[],
  destItems: ItemMetadata[],
  skipState: SkipState
): AutoMatchResult[] {
  // Only auto-match non-skipped items
  const availableSource = sourceItems.filter(
    item => !skipState.sourceSkipped.has(item.name)
  );
  
  const availableDest = destItems.filter(
    item => !skipState.destinationSkipped.has(item.name)
  );
  
  // Run auto-match on available items only
  return matchItems(availableSource, availableDest);
}
```

### 5. Skip Button Component

```tsx
function SkipButton({ 
  onSkip, 
  size = 'default',
  tooltip = 'Skip this item'
}: SkipButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size === 'small' ? 'sm' : 'default'}
          className={cn(
            "p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            size === 'small' && "h-7 w-7"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
        >
          <X className={cn("h-4 w-4", size === 'small' && "h-3.5 w-3.5")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
```

### 6. Skipped Items Section Component

```tsx
interface SkippedItemsSectionProps {
  items: ItemMetadata[];
  skipTimes: Map<string, Date>;
  onRestore: (itemName: string) => void;
  onRestoreAll: () => void;
  side: 'source' | 'destination';
}

function SkippedItemsSection({
  items,
  skipTimes,
  onRestore,
  onRestoreAll,
  side
}: SkippedItemsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (items.length === 0) return null;
  
  return (
    <div className="mt-4 border-t pt-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Skipped Items ({items.length})</span>
          </CollapsibleTrigger>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={onRestoreAll}
          >
            Restore All
          </Button>
        </div>
        
        <CollapsibleContent>
          <div className="mt-2 space-y-1">
            {items.map(item => {
              const skipTime = skipTimes.get(`${side}:${item.name}`);
              const timeAgo = skipTime 
                ? formatDistanceToNow(skipTime, { addSuffix: true })
                : '';
              
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      skipped {timeAgo}
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => onRestore(item.name)}
                  >
                    Restore
                  </Button>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

### 7. Bulk Skip for Groups

```tsx
// When skipping a collapsed group on the right panel
function handleSkipGroup(
  familyBaseName: string,
  familyMembers: string[],
  skipState: SkipState,
  setSkipState: (state: SkipState) => void
) {
  let newState = skipState;
  
  for (const member of familyMembers) {
    newState = skipDestinationItem(newState, member);
  }
  
  setSkipState(newState);
  
  toast({
    title: `Skipped ${familyMembers.length} items`,
    description: `All "${familyBaseName}" items have been skipped`,
    action: (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          // Undo all
          let undoState = skipState;
          for (const member of familyMembers) {
            undoState = restoreDestinationItem(undoState, member);
          }
          setSkipState(undoState);
        }}
      >
        Undo
      </Button>
    ),
  });
}
```

### 8. Update Metrics to Exclude Skipped

```typescript
function calculateProgress(
  items: ItemMetadata[],
  skipState: SkipState,
  side: 'source' | 'destination'
): ProgressStats {
  // Only count non-skipped items
  const skippedSet = side === 'source' 
    ? skipState.sourceSkipped 
    : skipState.destinationSkipped;
  
  const activeItems = items.filter(i => !skippedSet.has(i.name));
  const mapped = activeItems.filter(i => i.status === 'mapped').length;
  const total = activeItems.length;
  
  return {
    mapped,
    total,
    skipped: items.length - activeItems.length,
    percent: total > 0 ? Math.round((mapped / total) * 100) : 100,
  };
}
```

### 9. Persist Skip State with Session

```typescript
interface MappingSession {
  // ... existing fields ...
  
  // Add skip state
  skipState: {
    sourceSkipped: string[];
    destinationSkipped: string[];
    skipTimes: Record<string, string>; // ISO date strings
  };
}

// Serialize for storage
function serializeSkipState(state: SkipState): MappingSession['skipState'] {
  return {
    sourceSkipped: Array.from(state.sourceSkipped),
    destinationSkipped: Array.from(state.destinationSkipped),
    skipTimes: Object.fromEntries(
      Array.from(state.skipTimes.entries()).map(([k, v]) => [k, v.toISOString()])
    ),
  };
}

// Deserialize from storage
function deserializeSkipState(data: MappingSession['skipState']): SkipState {
  return {
    sourceSkipped: new Set(data.sourceSkipped),
    destinationSkipped: new Set(data.destinationSkipped),
    skipTimes: new Map(
      Object.entries(data.skipTimes).map(([k, v]) => [k, new Date(v)])
    ),
  };
}
```

## 📐 Skip Behavior Matrix

| Action | Source (Left) | Destination (Right) |
|--------|---------------|---------------------|
| Skip button visible | ✅ All items | ✅ All items |
| Skip group | ✅ Via collapsed header | ✅ Via collapsed header |
| Removed from suggestions | N/A | ✅ Yes |
| Removed from auto-match | ✅ Yes | ✅ Yes |
| Removed from counts | ✅ Yes | ✅ Yes |
| Recoverable | ✅ Skipped section | ✅ Skipped section |
| Persisted | ✅ With session | ✅ With session |

## ✅ Acceptance Criteria

### Skip Action:
- [ ] Skip button on every source item (left panel)
- [ ] Skip button on every destination item (right panel)
- [ ] Skip button on collapsed groups (both panels)
- [ ] Click skip → item immediately disappears from main list
- [ ] Toast confirms skip with Undo option

### Exclusion Behavior:
- [ ] Skipped destination items don't appear in suggestions
- [ ] Skipped source items excluded from auto-match
- [ ] Skipped destination items excluded from auto-match
- [ ] Progress counts exclude skipped items
- [ ] Effects coverage excludes skipped items

### Skipped Section:
- [ ] Collapsed by default at bottom of each panel
- [ ] Shows count: "Skipped Items (3)"
- [ ] Expand to see skipped items
- [ ] Each item shows "skipped X ago"
- [ ] Each item has "Restore" button
- [ ] "Restore All" button in header

### Restore Action:
- [ ] Restore puts item back in main list
- [ ] Item reappears in suggestions (if destination)
- [ ] Metrics update to include restored item

### Persistence:
- [ ] Skip state saved with session
- [ ] Skips preserved on page refresh
- [ ] Skips preserved on session resume

## 🧪 Test Cases

1. **Skip source item**: Click X on "Test Matrix" → disappears from left panel
2. **Skip destination item**: Click X on "Pixel Stake 35" → disappears from right panel
3. **Skip group**: Click X on "Pixel Stake (76)" → all 76 disappear
4. **Excluded from suggestions**: Skip "Matrix-2" → no longer suggested
5. **Excluded from auto-match**: Skip "Test Matrix" → not auto-matched
6. **View skipped**: Expand "Skipped Items" → see list with timestamps
7. **Restore single**: Click "Restore" → item returns to main list
8. **Restore all**: Click "Restore All" → all skipped items return
9. **Undo skip**: Skip item → click "Undo" in toast → item restored
10. **Persist**: Skip items → refresh page → skips preserved

## 🏷️ Labels
- Priority: **HIGH**
- Type: Feature
- Phase: All mapping phases
- Effort: Medium-High (4-5 hours)
