# Ticket 29: Metadata Display & Sorting on Mapping Screens

## 🎯 Objective
Add relevant metadata to mapping cards so users can prioritize high-impact items, and provide sorting options to organize by these metrics.

## 📋 Problem Statement
- Users currently see just names and match suggestions
- No way to know which items are "worth" mapping (high effect count = high value)
- Low-effect items might not be worth the time to map manually
- No sorting options to organize the work

## 💡 Relevant Metadata

### For Models/Groups (from User's Layout)

| Metadata | Why It Matters | Source |
|----------|---------------|--------|
| **Effect Count** | High count = more visual impact, prioritize these | Count effects in .xsq targeting this model |
| **Pixel/Node Count** | Larger props = more important | `parm1` or pixel count from layout XML |
| **Submodel Count** | Complex models with many submodels = important | Count of `<subModel>` elements |
| **Group Membership** | Shows what groups contain this model | `groups` attribute in layout |
| **Model Type** | Tree, Arch, Matrix, etc. | `DisplayAs` attribute |
| **Controller Connection** | Which controller/port | `Controller` attribute |

### For Sequence Items (Right Panel)

| Metadata | Why It Matters | Source |
|----------|---------------|--------|
| **Effect Count** | Shows how "active" this item is in sequence | Count effects from .xsq |
| **Pixel/Node Count** | Size comparison for matching | From sequence layout XML |
| **Timing Marks** | Does it have specific timing? | Presence in timing tracks |

### For Match Suggestions

| Metadata | Why It Matters | Source |
|----------|---------------|--------|
| **Match Confidence %** | Already showing this | Matching algorithm |
| **Pixel Count Difference** | Flag if sizes are very different | Compare both layouts |
| **Type Match** | Are they the same model type? | Compare DisplayAs |

## 📐 Updated Card Design

### Left Panel (User's Items) - Expanded View
```
┌─────────────────────────────────────────────────────────────────┐
│ ☐  All - Arches - GRP                                      [✕]  │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ 🎬 2,847 effects  │ 📍 1,200 pixels  │ 📦 4 members     │  │
│    └─────────────────────────────────────────────────────────┘  │
│    Suggested: Gothic Arch GRP (92%)                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ☐  Mini Tree 5                                              [✕]  │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │ 🎬 12 effects    │ 📍 50 pixels    │ 🌲 Tree           │  │
│    └─────────────────────────────────────────────────────────┘  │
│    Suggested: Small Tree 5 (88%)                                │
│    ⚠️ Low effect count - consider skipping                      │
└─────────────────────────────────────────────────────────────────┘
```

### Compact View Option
```
┌─────────────────────────────────────────────────────────────────┐
│ ☐  All - Arches - GRP          🎬 2,847  📍 1.2k  📦 4     [✕]  │
│    → Gothic Arch GRP (92%)                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Right Panel (Sequence Items)
```
┌─────────────────────────────────────────────────────────────────┐
│ Gothic Arch GRP                                           92%   │
│ 🎬 3,102 effects  │  📍 1,400 pixels  │  📦 5 members          │
│ ✓ Type match: Group                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Random Other Group                                        34%   │
│ 🎬 156 effects   │  📍 2,000 pixels  │  📦 12 members          │
│ ⚠️ Pixel count mismatch (1,200 vs 2,000)                       │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Sort Options

### Sort Dropdown Component
```
┌─────────────────────────────────────────────────────────────────┐
│  Model Groups                           Sort: [Effects (High) ▼] │
│  10 need matching · 8 already mapped           ☐ Hide low-value │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Filter groups...                                            │
├─────────────────────────────────────────────────────────────────┤
```

### Sort Options
```
Sort by:
├── 🎬 Effects (High → Low)     ← DEFAULT - prioritize high-impact
├── 🎬 Effects (Low → High)     
├── 📍 Pixels (High → Low)      
├── 📍 Pixels (Low → High)      
├── 🔤 Name (A → Z)             
├── 🔤 Name (Z → A)             
├── ⭐ Match Confidence (High)  
├── ⭐ Match Confidence (Low)   ← Review worst matches
└── 📊 Status (Unmapped first)  
```

### Filter/Hide Option
```
☐ Hide items with < 10 effects (23 hidden)
```

## 🔧 Implementation

### 1. Metadata Types

```typescript
interface ItemMetadata {
  // Core identity
  name: string;
  type: EntityType;
  displayType?: string; // "Tree", "Arch", "Matrix", etc.
  
  // Counts
  effectCount: number;
  pixelCount: number;
  submodelCount?: number;
  memberCount?: number; // For groups
  
  // Relationships
  parentGroups?: string[];
  childModels?: string[]; // For groups
  
  // Status
  mappingStatus: 'unmapped' | 'mapped' | 'skipped';
  suggestedMatch?: {
    name: string;
    confidence: number;
  };
}

interface SequenceItemMetadata extends ItemMetadata {
  // Comparison helpers
  pixelDifference?: number; // vs selected user item
  typeMatch?: boolean;
}
```

### 2. Effect Count Extraction

```typescript
// Parse .xsq file to count effects per model
function extractEffectCounts(xsqContent: string): Map<string, number> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xsqContent, 'text/xml');
  const effectCounts = new Map<string, number>();
  
  // Find all Effect elements
  const effects = doc.querySelectorAll('Effect');
  
  effects.forEach(effect => {
    // Get the model/group this effect targets
    const targetElement = effect.closest('[name]');
    if (targetElement) {
      const modelName = targetElement.getAttribute('name');
      if (modelName) {
        effectCounts.set(modelName, (effectCounts.get(modelName) || 0) + 1);
      }
    }
  });
  
  return effectCounts;
}

// Alternative: Count from Element nodes in xsq
function extractEffectCountsFromElements(xsqContent: string): Map<string, number> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xsqContent, 'text/xml');
  const effectCounts = new Map<string, number>();
  
  // Each Element node represents a model's timeline
  const elements = doc.querySelectorAll('Element');
  
  elements.forEach(element => {
    const modelName = element.getAttribute('name');
    if (modelName) {
      // Count Effect children
      const effects = element.querySelectorAll('Effect');
      effectCounts.set(modelName, effects.length);
    }
  });
  
  return effectCounts;
}
```

### 3. Sort Functions

```typescript
type SortOption = 
  | 'effects-desc' 
  | 'effects-asc'
  | 'pixels-desc'
  | 'pixels-asc'
  | 'name-asc'
  | 'name-desc'
  | 'confidence-desc'
  | 'confidence-asc'
  | 'status';

function sortItems(items: ItemMetadata[], sortBy: SortOption): ItemMetadata[] {
  const sorted = [...items];
  
  switch (sortBy) {
    case 'effects-desc':
      return sorted.sort((a, b) => b.effectCount - a.effectCount);
    
    case 'effects-asc':
      return sorted.sort((a, b) => a.effectCount - b.effectCount);
    
    case 'pixels-desc':
      return sorted.sort((a, b) => b.pixelCount - a.pixelCount);
    
    case 'pixels-asc':
      return sorted.sort((a, b) => a.pixelCount - b.pixelCount);
    
    case 'name-asc':
      return sorted.sort((a, b) => naturalSort(a.name, b.name));
    
    case 'name-desc':
      return sorted.sort((a, b) => naturalSort(b.name, a.name));
    
    case 'confidence-desc':
      return sorted.sort((a, b) => 
        (b.suggestedMatch?.confidence || 0) - (a.suggestedMatch?.confidence || 0)
      );
    
    case 'confidence-asc':
      return sorted.sort((a, b) => 
        (a.suggestedMatch?.confidence || 0) - (b.suggestedMatch?.confidence || 0)
      );
    
    case 'status':
      const statusOrder = { unmapped: 0, mapped: 1, skipped: 2 };
      return sorted.sort((a, b) => 
        statusOrder[a.mappingStatus] - statusOrder[b.mappingStatus]
      );
    
    default:
      return sorted;
  }
}
```

### 4. Sort Dropdown Component

```tsx
function SortDropdown({ 
  value, 
  onChange,
  showConfidenceSort = true 
}: SortDropdownProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>By Impact</SelectLabel>
          <SelectItem value="effects-desc">
            <span className="flex items-center gap-2">
              🎬 Effects (High → Low)
            </span>
          </SelectItem>
          <SelectItem value="effects-asc">
            <span className="flex items-center gap-2">
              🎬 Effects (Low → High)
            </span>
          </SelectItem>
        </SelectGroup>
        
        <SelectGroup>
          <SelectLabel>By Size</SelectLabel>
          <SelectItem value="pixels-desc">
            <span className="flex items-center gap-2">
              📍 Pixels (High → Low)
            </span>
          </SelectItem>
          <SelectItem value="pixels-asc">
            <span className="flex items-center gap-2">
              📍 Pixels (Low → High)
            </span>
          </SelectItem>
        </SelectGroup>
        
        <SelectGroup>
          <SelectLabel>By Name</SelectLabel>
          <SelectItem value="name-asc">🔤 Name (A → Z)</SelectItem>
          <SelectItem value="name-desc">🔤 Name (Z → A)</SelectItem>
        </SelectGroup>
        
        {showConfidenceSort && (
          <SelectGroup>
            <SelectLabel>By Match</SelectLabel>
            <SelectItem value="confidence-desc">⭐ Confidence (High)</SelectItem>
            <SelectItem value="confidence-asc">⭐ Confidence (Low)</SelectItem>
          </SelectGroup>
        )}
        
        <SelectGroup>
          <SelectLabel>By Status</SelectLabel>
          <SelectItem value="status">📊 Unmapped First</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
```

### 5. Low-Value Filter

```tsx
function LowValueFilter({ 
  threshold, 
  hiddenCount,
  enabled,
  onToggle,
  onThresholdChange 
}: LowValueFilterProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Checkbox 
        id="hide-low-value"
        checked={enabled}
        onCheckedChange={onToggle}
      />
      <label htmlFor="hide-low-value" className="text-muted-foreground">
        Hide items with &lt;
        <Input
          type="number"
          value={threshold}
          onChange={(e) => onThresholdChange(parseInt(e.target.value))}
          className="w-16 h-6 mx-1 inline-block text-center"
        />
        effects
        {hiddenCount > 0 && (
          <span className="text-muted-foreground/60">
            ({hiddenCount} hidden)
          </span>
        )}
      </label>
    </div>
  );
}
```

### 6. Metadata Badge Component

```tsx
function MetadataBadges({ item }: { item: ItemMetadata }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {/* Effect Count */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "flex items-center gap-1",
            item.effectCount > 500 && "text-green-500 font-medium",
            item.effectCount < 10 && "text-orange-500"
          )}>
            🎬 {formatNumber(item.effectCount)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {item.effectCount} effects in sequence
          {item.effectCount < 10 && " (low - consider skipping)"}
        </TooltipContent>
      </Tooltip>
      
      {/* Pixel Count */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1">
            📍 {formatNumber(item.pixelCount)}
          </span>
        </TooltipTrigger>
        <TooltipContent>{item.pixelCount} pixels</TooltipContent>
      </Tooltip>
      
      {/* Member/Submodel Count */}
      {item.memberCount !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1">
              📦 {item.memberCount}
            </span>
          </TooltipTrigger>
          <TooltipContent>{item.memberCount} members in group</TooltipContent>
        </Tooltip>
      )}
      
      {item.submodelCount !== undefined && item.submodelCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1">
              🧩 {item.submodelCount}
            </span>
          </TooltipTrigger>
          <TooltipContent>{item.submodelCount} submodels</TooltipContent>
        </Tooltip>
      )}
      
      {/* Model Type */}
      {item.displayType && (
        <Badge variant="outline" className="text-[10px]">
          {item.displayType}
        </Badge>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}
```

## 📐 Full Header Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Model Groups                                                               │
│  10 need matching · 8 already mapped                                        │
│                                                                             │
│  ┌──────────────────┐  ┌───────────────────────────────────────────────┐   │
│  │ Sort: [Effects ▼]│  │ ☐ Hide < [10] effects (23 hidden)            │   │
│  └──────────────────┘  └───────────────────────────────────────────────┘   │
│                                                                             │
│  🔍 Filter groups...                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
```

## ✅ Acceptance Criteria

### Metadata Display:
- [ ] Effect count shown on each card (user's items)
- [ ] Effect count shown on sequence items
- [ ] Pixel count shown on each card
- [ ] Member count shown for groups
- [ ] Submodel count shown for models (if applicable)
- [ ] Model type badge (Tree, Arch, Matrix, etc.)
- [ ] Low effect count warning (< 10 effects)
- [ ] Pixel count mismatch warning on suggestions

### Sorting:
- [ ] Sort dropdown in header
- [ ] Default sort: Effects (High → Low)
- [ ] Sort by effects (high/low)
- [ ] Sort by pixels (high/low)
- [ ] Sort by name (A-Z/Z-A)
- [ ] Sort by confidence (high/low)
- [ ] Sort by status (unmapped first)
- [ ] Sort persists during session
- [ ] Both panels can sort independently

### Filtering:
- [ ] "Hide items with < X effects" checkbox
- [ ] Adjustable threshold
- [ ] Shows count of hidden items
- [ ] Can still search hidden items

### Performance:
- [ ] Effect count extraction doesn't block UI
- [ ] Sorting is instant (< 100ms)
- [ ] Works with 500+ items

## 🧪 Test Cases

1. **Effect count display**: Upload xsq, verify effect counts shown
2. **Sort by effects**: Click sort, verify highest effect items at top
3. **Low value filter**: Enable filter, verify low-count items hidden
4. **Pixel mismatch**: Select item, verify warning on mismatched suggestions
5. **Search + filter**: Filter hides items, but search can find them
6. **Independent sorting**: Sort left by effects, sort right by name

## 🏷️ Labels
- Priority: **HIGH**
- Type: Feature
- Phase: All mapping phases
- Effort: High (5-6 hours)
- Dependencies: Access to .xsq file for effect counts
