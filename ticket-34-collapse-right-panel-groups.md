# Ticket 34: Collapse Repeated Items on Right Panel + Bulk Skip

## 🎯 Objective
1. Collapse repeated sequence items (like "Pixel Stake 1-76") into expandable groups on the right panel
2. Add skip/X button to collapsed groups for bulk skipping

## 📋 Problem Statement

### Issue 1: Right Panel Flooded with Repeated Items
From screenshot - "Pixel Stake" appears 76+ times:
```
Pixel Stake 35
Pixel Stake 47
Pixel Stake 48
Pixel Stake 49
Pixel Stake 50
Pixel Stake 51
... 70 more!
```

This is:
- Impossible to scan
- Takes forever to scroll
- Buries useful items
- Same problem we solved on left panel (Ticket 21) but worse

### Issue 2: No Way to Bulk Skip
If user doesn't have any Pixel Stakes and doesn't want to map to them:
- Currently must expand → skip each one individually
- Or ignore them and scroll past every time
- Need bulk skip on collapsed groups

## 📐 Visual Design

### Before (76 Individual Rows)
```
ALL MODELS (242)

  Fan L                          CUSTOM  335px  IN USE
  Fan R                          CUSTOM  335px  IN USE
  Front Door                     LINE    95px
  Pixel Stake 35                 LINE    12px
  Pixel Stake 47                 LINE    12px
  Pixel Stake 48                 LINE    12px
  Pixel Stake 49                 LINE    12px
  Pixel Stake 50                 LINE    12px
  Pixel Stake 51                 LINE    12px
  Pixel Stake 52                 LINE    12px
  Pixel Stake 53                 LINE    12px   IN USE
  ... 67 more Pixel Stakes ...
  Window Left                    LINE    50px
```

### After (Collapsed Groups)
```
ALL MODELS (242)

  Fan L                          CUSTOM  335px  IN USE
  Fan R                          CUSTOM  335px  IN USE
  Front Door                     LINE    95px

▶ Pixel Stake (76)              LINE    12px   1 IN USE   [✕]
                                                           ↑
                                                    Skip ALL 76

  Window Left                    LINE    50px
  
▶ Tree - Spiral (12)            CUSTOM  100px  3 IN USE   [✕]
  
▶ Wreath (8)                    CUSTOM  200px  0 IN USE   [✕]
```

### Expanded Group
```
▼ Pixel Stake (76)              LINE    12px   1 IN USE   [✕]
  ┌────────────────────────────────────────────────────────┐
  │  Pixel Stake 1              LINE  12px                 │
  │  Pixel Stake 2              LINE  12px                 │
  │  Pixel Stake 3              LINE  12px                 │
  │  ...                                                   │
  │  Pixel Stake 53             LINE  12px   IN USE        │
  │  ...                                                   │
  │  Pixel Stake 76             LINE  12px                 │
  └────────────────────────────────────────────────────────┘
```

## 🔧 Implementation

### 1. Group Items by Family

```typescript
interface ItemFamily {
  baseName: string;           // "Pixel Stake"
  members: SequenceItem[];    // All 76 Pixel Stakes
  inUseCount: number;         // How many already mapped
  pixelCount: number;         // Typical pixel count
  modelType: string;          // "LINE"
}

function groupByFamily(items: SequenceItem[]): ItemFamily[] {
  const families = new Map<string, SequenceItem[]>();
  
  for (const item of items) {
    const baseName = extractBaseName(item.name);
    
    if (!families.has(baseName)) {
      families.set(baseName, []);
    }
    families.get(baseName)!.push(item);
  }
  
  // Convert to array, sort by size (largest families first? or alphabetical?)
  return Array.from(families.entries())
    .map(([baseName, members]) => ({
      baseName,
      members: members.sort((a, b) => naturalSort(a.name, b.name)),
      inUseCount: members.filter(m => m.inUse).length,
      pixelCount: members[0]?.pixelCount || 0,
      modelType: members[0]?.modelType || 'Unknown',
    }))
    .sort((a, b) => a.baseName.localeCompare(b.baseName));
}

function extractBaseName(name: string): string {
  // Remove trailing numbers and whitespace
  // "Pixel Stake 35" → "Pixel Stake"
  // "Tree - Spiral 8" → "Tree - Spiral"
  return name.replace(/\s*\d+\s*$/, '').trim();
}
```

### 2. Collapsible Family Component

```tsx
interface FamilyRowProps {
  family: ItemFamily;
  onSelectItem: (name: string) => void;
  onSkipFamily: (names: string[]) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function FamilyRow({ 
  family, 
  onSelectItem, 
  onSkipFamily,
  isExpanded,
  onToggleExpand 
}: FamilyRowProps) {
  const availableMembers = family.members.filter(m => !m.inUse);
  
  // Single item? Don't collapse
  if (family.members.length === 1) {
    return (
      <SingleItemRow 
        item={family.members[0]} 
        onSelect={onSelectItem}
      />
    );
  }
  
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Collapsed Header */}
      <div 
        className="flex items-center justify-between p-3 hover:bg-muted/50 
                   cursor-pointer transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          
          <span className="font-medium">{family.baseName}</span>
          <Badge variant="secondary">
            {family.members.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Type & Size */}
          <span className="text-xs text-muted-foreground">
            {family.modelType}
          </span>
          <span className="text-xs text-muted-foreground">
            {family.pixelCount}px
          </span>
          
          {/* In Use Count */}
          {family.inUseCount > 0 && (
            <Badge variant="outline" className="text-orange-400 border-orange-400/50">
              {family.inUseCount} IN USE
            </Badge>
          )}
          
          {/* Skip All Button */}
          {availableMembers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-destructive 
                       hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                onSkipFamily(availableMembers.map(m => m.name));
              }}
              title={`Skip all ${availableMembers.length} ${family.baseName} items`}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Expanded Members */}
      {isExpanded && (
        <div className="border-t bg-muted/20">
          <div className="max-h-[300px] overflow-y-auto">
            {family.members.map(item => (
              <div
                key={item.name}
                className={cn(
                  "flex items-center justify-between px-4 py-2 pl-10",
                  "hover:bg-muted/50 cursor-pointer",
                  item.inUse && "opacity-50"
                )}
                onClick={() => !item.inUse && onSelectItem(item.name)}
              >
                <span className={cn(item.inUse && "line-through")}>
                  {item.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {item.pixelCount}px
                  </span>
                  {item.inUse && (
                    <Badge variant="outline" className="text-xs text-orange-400">
                      IN USE
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3. Right Panel with Grouped Items

```tsx
function RightPanelSequenceItems({ 
  items, 
  onSelectItem,
  onSkipItems,
  searchQuery 
}: RightPanelProps) {
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  
  // Group items by family
  const families = useMemo(() => groupByFamily(items), [items]);
  
  // Filter by search
  const filteredFamilies = useMemo(() => {
    if (!searchQuery.trim()) return families;
    
    const query = searchQuery.toLowerCase();
    return families.filter(f => 
      f.baseName.toLowerCase().includes(query) ||
      f.members.some(m => m.name.toLowerCase().includes(query))
    );
  }, [families, searchQuery]);
  
  const toggleExpand = (baseName: string) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev);
      if (next.has(baseName)) {
        next.delete(baseName);
      } else {
        next.add(baseName);
      }
      return next;
    });
  };
  
  // Stats
  const totalItems = items.length;
  const familyCount = families.length;
  const largestFamily = Math.max(...families.map(f => f.members.length));
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <div className="flex justify-between items-center">
          <span className="font-medium">ALL MODELS ({totalItems})</span>
          <span className="text-xs text-muted-foreground">
            {familyCount} groups
          </span>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredFamilies.map(family => (
            <FamilyRow
              key={family.baseName}
              family={family}
              isExpanded={expandedFamilies.has(family.baseName)}
              onToggleExpand={() => toggleExpand(family.baseName)}
              onSelectItem={onSelectItem}
              onSkipFamily={onSkipItems}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

### 4. Skip Confirmation for Large Groups

```tsx
function useSkipFamily(onSkip: (names: string[]) => void) {
  return useCallback((names: string[]) => {
    // Small groups: skip immediately
    if (names.length <= 5) {
      onSkip(names);
      return;
    }
    
    // Large groups: confirm
    const confirmed = window.confirm(
      `Skip all ${names.length} items? This will mark them as "not needed" for this mapping.`
    );
    
    if (confirmed) {
      onSkip(names);
    }
  }, [onSkip]);
}
```

### 5. Visual Indicators for Collapsed Groups

```tsx
// Show progress within collapsed group
function FamilyProgressIndicator({ family }: { family: ItemFamily }) {
  const total = family.members.length;
  const inUse = family.inUseCount;
  const percent = Math.round((inUse / total) * 100);
  
  if (inUse === 0) return null;
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-orange-400 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {inUse}/{total}
      </span>
    </div>
  );
}
```

## 📐 Before/After Comparison

### Before
```
Scrolling through 242 items:
- Fan L
- Fan R  
- Front Door
- Pixel Stake 35
- Pixel Stake 47
- Pixel Stake 48
- ... 73 more Pixel Stakes to scroll past ...
- Window Left
- ... more items buried below ...

Time to find "Window Left": 30+ seconds of scrolling
```

### After
```
Scrolling through ~40 collapsed groups:
- Fan L
- Fan R
- Front Door
▶ Pixel Stake (76)                    [✕]
- Window Left
▶ Tree - Spiral (12)                  [✕]
▶ Wreath (8)                          [✕]

Time to find "Window Left": 2 seconds
```

## ✅ Acceptance Criteria

### Grouping:
- [ ] Items with same base name grouped together
- [ ] Single items NOT collapsed (no "Pixel Stake (1)")
- [ ] Groups show count badge
- [ ] Groups show model type and pixel count
- [ ] Groups show "X IN USE" count

### Expand/Collapse:
- [ ] Click header to expand
- [ ] Expanded view shows all members
- [ ] Max height with scroll for large groups
- [ ] Members show individual details

### Skip Button:
- [ ] X button on each collapsed group
- [ ] Skips ALL available (non-in-use) items in group
- [ ] Confirmation for groups > 5 items
- [ ] Button disabled if all items in use

### Search:
- [ ] Search filters groups by base name
- [ ] Search also matches individual member names
- [ ] Matching group auto-expands? (optional)

### Performance:
- [ ] Handles 500+ items smoothly
- [ ] Grouping calculation is memoized

## 🧪 Test Cases

1. **Grouping works**: 76 Pixel Stakes → 1 collapsed row
2. **Single items not grouped**: "Fan L" appears as single row
3. **In use count**: 3 of 12 "Tree - Spiral" in use → shows "3 IN USE"
4. **Expand**: Click → shows all 76 Pixel Stakes
5. **Skip group**: Click X → all 76 skipped (with confirmation)
6. **Partial in use**: 1 in use → X skips the other 75
7. **Search**: Type "Pixel" → shows Pixel Stake group
8. **Scroll performance**: 300+ items grouped into ~50 → smooth scrolling

## 🏷️ Labels
- Priority: **HIGH**
- Type: UX Improvement
- Phase: All mapping phases (right panel)
- Effort: Medium (3-4 hours)
- Related: Ticket 21 (left panel collapse)
