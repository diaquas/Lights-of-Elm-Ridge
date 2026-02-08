# Ticket 36: Enhanced "IN USE" Indicator with Mapping Details & Inline De-map

## 🎯 Objective
Replace the simple "IN USE" badge with:
1. A count showing HOW MANY items it's mapped to
2. Hover tooltip showing WHICH items it's mapped to
3. Ability to de-map directly from the tooltip (inline correction)

## 📋 Problem Statement
Current "IN USE" badge tells you something is mapped, but:
- Doesn't tell you how many things use it
- Doesn't tell you WHAT is using it
- If you find a better match, you have to go back, find the original, de-map it, then re-map

**User story**: "I blasted through auto-map, thought it was good, then found something better. I want to fix it right here without hunting."

## 📐 Visual Design

### Current (Minimal Info)
```
┌─────────────────────────────────────────────────────────────────┐
│  Matrix-2                              MATRIX   800px   IN USE  │
└─────────────────────────────────────────────────────────────────┘
```

### Target (Rich Info + Actions)

#### Default State (Count Badge)
```
┌─────────────────────────────────────────────────────────────────┐
│  Matrix-2                              MATRIX   800px   [2]     │
└─────────────────────────────────────────────────────────────────┘
                                                           ↑
                                                    "2 items use this"
```

#### Hover State (Tooltip with Details)
```
┌─────────────────────────────────────────────────────────────────┐
│  Matrix-2                              MATRIX   800px   [2]     │
└─────────────────────────────────────────────────────────────────┘
                                                           │
                                           ┌───────────────▼───────────────┐
                                           │  MAPPED TO:                   │
                                           │                               │
                                           │  Main Matrix          [✕]    │
                                           │  Backup Display       [✕]    │
                                           │                               │
                                           │  ─────────────────────────── │
                                           │  Use for current selection?   │
                                           │  [Map to "Spider 6"]          │
                                           └───────────────────────────────┘
```

#### Single Mapping (Simpler Tooltip)
```
┌─────────────────────────────────────────────────────────────────┐
│  Wreath R                              CUSTOM   200px   [1]     │
└─────────────────────────────────────────────────────────────────┘
                                                           │
                                           ┌───────────────▼───────────────┐
                                           │  MAPPED TO:                   │
                                           │                               │
                                           │  Spinner - Fuzion     [✕]    │
                                           │                               │
                                           │  ─────────────────────────── │
                                           │  [Map to "Spider 6" instead]  │
                                           └───────────────────────────────┘
```

## 🔧 Implementation

### Solution: Popover Instead of Tooltip

The key insight: **Tooltips are for info, Popovers are for actions.**

Since we need clickable actions, we should use a **Popover** (stays open until dismissed) rather than a **Tooltip** (disappears on mouse leave).

```tsx
// ❌ WRONG - Tooltip disappears before you can click
<Tooltip>
  <TooltipTrigger><Badge>[2]</Badge></TooltipTrigger>
  <TooltipContent>
    <Button>De-map</Button>  {/* Can't click this! */}
  </TooltipContent>
</Tooltip>

// ✅ CORRECT - Popover stays open for interaction
<Popover>
  <PopoverTrigger><Badge>[2]</Badge></PopoverTrigger>
  <PopoverContent>
    <Button>De-map</Button>  {/* Clickable! */}
  </PopoverContent>
</Popover>
```

### 1. Usage Badge with Popover

```tsx
interface UsageInfo {
  count: number;
  mappedTo: MappingReference[];
}

interface MappingReference {
  itemName: string;
  itemType: 'model' | 'group' | 'submodel_group';
  effectCount: number;
}

function UsageBadge({ usage }: { usage: UsageInfo }) {
  if (usage.count === 0) return null;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "min-w-[28px] justify-center font-medium",
        usage.count === 1 && "bg-orange-500/10 text-orange-400 border-orange-500/30",
        usage.count >= 2 && "bg-red-500/10 text-red-400 border-red-500/30"
      )}
    >
      {usage.count}
    </Badge>
  );
}
```

### 2. Popover with Mapping Details (Clickable!)

```tsx
function UsagePopover({ 
  usage, 
  sequenceItemName,
  currentSelection,
  onDeMap,
  onReMap
}: UsagePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        >
          <UsageBadge usage={usage} />
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        side="left" 
        align="start"
        className="w-72 p-0"
        onInteractOutside={() => setIsOpen(false)}
      >
        <div className="p-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Mapped To ({usage.count})
          </h4>
          
          {/* List of items using this sequence item */}
          <div className="space-y-1">
            {usage.mappedTo.map(ref => (
              <div 
                key={ref.itemName}
                className="flex items-center justify-between p-2 rounded bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm truncate block">
                    {ref.itemName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ref.effectCount} effects
                  </span>
                </div>
                
                {/* De-map button - ALWAYS VISIBLE since popover stays open */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeMap(ref.itemName, sequenceItemName);
                    // Close popover if no more mappings
                    if (usage.count <= 1) {
                      setIsOpen(false);
                    }
                  }}
                  title={`Remove mapping from ${ref.itemName}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Re-map action (if something is selected on left) */}
        {currentSelection && (
          <>
            <Separator />
            <div className="p-3">
              <Button
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onReMap(currentSelection, sequenceItemName);
                  setIsOpen(false);
                }}
              >
                Map to "{currentSelection}" instead
              </Button>
            </div>
          </>
        )}
        
        {/* Close button for clarity */}
        <Separator />
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setIsOpen(false)}
          >
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Alternative: Hover-to-Open, Click-to-Pin

If you want hover preview but click for actions:

```tsx
function UsageIndicator({ usage, ...props }: UsageIndicatorProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  const isOpen = isPinned || isHovering;
  
  return (
    <Popover open={isOpen} onOpenChange={setIsPinned}>
      <PopoverTrigger asChild>
        <button
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => {
            // Small delay before closing on mouse leave
            setTimeout(() => {
              if (!isPinned) setIsHovering(false);
            }, 150);
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsPinned(true);  // Pin it open on click
          }}
        >
          <UsageBadge usage={usage} />
        </button>
      </PopoverTrigger>
      
      <PopoverContent
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          if (!isPinned) setIsHovering(false);
        }}
        onInteractOutside={() => {
          setIsPinned(false);
          setIsHovering(false);
        }}
      >
        {/* Content with actions */}
        {isPinned && (
          <p className="text-xs text-muted-foreground mb-2">
            Click outside to close
          </p>
        )}
        {/* ... rest of content */}
      </PopoverContent>
    </Popover>
  );
}
```

### Recommended Approach: Simple Popover (Click to Open)

For clarity and mobile-friendliness, **click-to-open is best**:

```tsx
// Simple, clear, works everywhere
<Popover>
  <PopoverTrigger>
    <Badge className="cursor-pointer">[2]</Badge>
  </PopoverTrigger>
  <PopoverContent>
    {/* Actions are fully clickable */}
  </PopoverContent>
</Popover>
```

**Why click-to-open wins:**
1. ✅ Works on mobile (no hover)
2. ✅ Clear mental model (click = open, click outside = close)
3. ✅ No race conditions with mouse movement
4. ✅ User explicitly chose to see details
5. ✅ All buttons are clickable

### 3. Track Reverse Mappings

```typescript
// Need to track: which user items map to each sequence item
interface MappingState {
  // Forward: user item → sequence item
  forward: Map<string, string>;
  
  // Reverse: sequence item → user items (for "IN USE" display)
  reverse: Map<string, Set<string>>;
}

function createMappingState(): MappingState {
  return {
    forward: new Map(),
    reverse: new Map(),
  };
}

function addMapping(state: MappingState, userItem: string, seqItem: string): MappingState {
  // Update forward
  const newForward = new Map(state.forward);
  newForward.set(userItem, seqItem);
  
  // Update reverse
  const newReverse = new Map(state.reverse);
  if (!newReverse.has(seqItem)) {
    newReverse.set(seqItem, new Set());
  }
  newReverse.get(seqItem)!.add(userItem);
  
  return { forward: newForward, reverse: newReverse };
}

function removeMapping(state: MappingState, userItem: string): MappingState {
  const seqItem = state.forward.get(userItem);
  if (!seqItem) return state;
  
  // Update forward
  const newForward = new Map(state.forward);
  newForward.delete(userItem);
  
  // Update reverse
  const newReverse = new Map(state.reverse);
  if (newReverse.has(seqItem)) {
    const users = new Set(newReverse.get(seqItem)!);
    users.delete(userItem);
    if (users.size === 0) {
      newReverse.delete(seqItem);
    } else {
      newReverse.set(seqItem, users);
    }
  }
  
  return { forward: newForward, reverse: newReverse };
}

function getUsageInfo(
  state: MappingState, 
  seqItem: string,
  itemMetadata: Map<string, ItemMetadata>
): UsageInfo {
  const users = state.reverse.get(seqItem);
  if (!users || users.size === 0) {
    return { count: 0, mappedTo: [] };
  }
  
  const mappedTo = Array.from(users).map(userItem => {
    const meta = itemMetadata.get(userItem);
    return {
      itemName: userItem,
      itemType: meta?.type || 'model',
      effectCount: meta?.effectCount || 0,
    };
  });
  
  return {
    count: users.size,
    mappedTo,
  };
}
```

### 4. Integration in Sequence Item Row

```tsx
function SequenceItemRow({ 
  item, 
  usage,
  currentSelection,
  onSelect,
  onDeMap,
  onReMap
}: SequenceItemRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg",
        "hover:bg-muted/50 cursor-pointer transition-colors",
        usage.count > 0 && "bg-muted/20"
      )}
      onClick={() => onSelect(item.name)}
    >
      <div className="flex-1 min-w-0">
        <span className="font-medium">{item.name}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {item.modelType}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {item.pixelCount}px
        </span>
        
        {/* Usage indicator with POPOVER (not tooltip) */}
        {usage.count > 0 && (
          <UsagePopover
            usage={usage}
            sequenceItemName={item.name}
            currentSelection={currentSelection}
            onDeMap={onDeMap}
            onReMap={onReMap}
          />
        )}
      </div>
    </div>
  );
}
```

### 5. De-map and Re-map Handlers

```tsx
function useMappingActions(
  mappingState: MappingState,
  setMappingState: (state: MappingState) => void
) {
  const handleDeMap = useCallback((userItem: string, seqItem: string) => {
    // Remove the mapping
    const newState = removeMapping(mappingState, userItem);
    setMappingState(newState);
    
    // Show toast
    toast({
      title: "Mapping removed",
      description: `${userItem} is no longer mapped to ${seqItem}`,
      action: (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            // Undo
            setMappingState(addMapping(newState, userItem, seqItem));
          }}
        >
          Undo
        </Button>
      ),
    });
  }, [mappingState, setMappingState]);
  
  const handleReMap = useCallback((userItem: string, newSeqItem: string) => {
    // This will:
    // 1. Remove old mapping (if any)
    // 2. Add new mapping
    let newState = removeMapping(mappingState, userItem);
    newState = addMapping(newState, userItem, newSeqItem);
    setMappingState(newState);
    
    toast({
      title: "Mapping updated",
      description: `${userItem} → ${newSeqItem}`,
    });
  }, [mappingState, setMappingState]);
  
  return { handleDeMap, handleReMap };
}
```

## 📐 Visual States

### Badge States

| Count | Badge | Color | Meaning |
|-------|-------|-------|---------|
| 0 | (none) | - | Available |
| 1 | `[1]` | Orange | Used once |
| 2+ | `[2]` | Red | Used multiple times (unusual) |

### Popover Content (Click to Open)

```
        Click [2] badge
              │
              ▼
┌─────────────────────────────────────────┐
│  MAPPED TO (2)                          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Main Matrix              [✕]    │   │  ← X always visible
│  │ 847 effects                     │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Backup Display           [✕]    │   │
│  │ 122 effects                     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ───────────────────────────────────── │
│                                         │
│  [Map to "Spider 6" instead]            │  ← If left item selected
│                                         │
│  ───────────────────────────────────── │
│  [Close]                                │
│                                         │
└─────────────────────────────────────────┘
        Click outside or Close to dismiss
```

### Interaction Flow

```
1. User sees [2] badge on "Matrix-2"
2. User clicks [2] → Popover opens
3. User sees "Main Matrix" and "Backup Display" are mapped here
4. User clicks [✕] next to "Main Matrix" → Mapping removed
5. Badge updates to [1]
6. User clicks "Map to Spider 6 instead" → New mapping created
7. Popover closes automatically
```

## ✅ Acceptance Criteria

### Usage Badge:
- [ ] Shows count instead of "IN USE"
- [ ] Color coded (orange for 1, red for 2+)
- [ ] Hidden when count is 0
- [ ] Clickable (cursor: pointer)

### Popover (NOT Tooltip):
- [ ] Opens on click (not hover)
- [ ] Stays open until dismissed
- [ ] Shows list of items mapped to this sequence item
- [ ] Shows effect count for each mapped item
- [ ] Each item has visible X button to de-map
- [ ] Has explicit Close button
- [ ] Closes on click outside

### De-map Action:
- [ ] Click X removes mapping immediately
- [ ] Toast confirms removal with Undo option
- [ ] Usage count updates instantly
- [ ] Left panel item becomes "unmapped" again
- [ ] Popover closes if count drops to 0

### Re-map Action:
- [ ] If left item is selected, shows "Map to X instead" button
- [ ] Click re-maps: removes from old, adds to new
- [ ] Works in one click (no back-and-forth)
- [ ] Popover closes after re-map

### Mobile/Touch:
- [ ] Works on touch devices (click-based, no hover)
- [ ] Popover positioned correctly on small screens

### State Management:
- [ ] Reverse mapping tracked (seq item → user items)
- [ ] Updates propagate to all views
- [ ] Undo works correctly

## 🧪 Test Cases

1. **Single mapping**: Map Matrix → Matrix-2 → shows `[1]`
2. **Double mapping**: Map two items to same seq item → shows `[2]`
3. **Hover shows details**: Hover `[2]` → tooltip shows both items
4. **De-map works**: Click X on "Main Matrix" → mapping removed, count drops to `[1]`
5. **Re-map works**: Select "Spider 6", hover `[1]`, click "Map instead" → Spider 6 now maps there
6. **Undo works**: De-map, click Undo → mapping restored
7. **Updates propagate**: De-map from right → left panel shows item as unmapped

## 🏷️ Labels
- Priority: **MEDIUM-HIGH**
- Type: UX Enhancement
- Phase: All mapping phases
- Effort: Medium (3-4 hours)
