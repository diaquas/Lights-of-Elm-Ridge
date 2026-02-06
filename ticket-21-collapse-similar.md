# Ticket 21: Collapse Similar Items (Accordion Groups)

## 🎯 Objective
Automatically group items with the same prefix into collapsible accordion sections, making long lists more manageable.

## 📋 Problem Statement
From UX walkthrough:
- "I think there's a world where we can collapse when name is exactly the same, and the only difference is a number at the end"
- "Star 1, Star 2, Star 3, Star 4 - typically you're going to want to map all of those stars at once"
- "Maybe collapsing those into like our version of a group that's just for the UX to accordion down"
- "That way you can quickly see you have 8 mini pumpkins and 6 stars"

## 🔧 Implementation

### 1. Group Items by Family
```tsx
interface ItemFamily {
  prefix: string;
  items: MappingItem[];
  mappedCount: number;
  skippedCount: number;
}

function groupItemsByFamily(items: MappingItem[]): ItemFamily[] {
  const families = new Map<string, ItemFamily>();
  
  for (const item of items) {
    const prefix = extractFamilyPrefix(item.name);
    
    if (!families.has(prefix)) {
      families.set(prefix, {
        prefix,
        items: [],
        mappedCount: 0,
        skippedCount: 0,
      });
    }
    
    const family = families.get(prefix)!;
    family.items.push(item);
    if (item.status === 'mapped') family.mappedCount++;
    if (item.status === 'skipped') family.skippedCount++;
  }
  
  // Sort families alphabetically, then items within each family
  return Array.from(families.values())
    .sort((a, b) => a.prefix.localeCompare(b.prefix))
    .map(family => ({
      ...family,
      items: naturalSort(family.items),
    }));
}

function extractFamilyPrefix(name: string): string {
  // "Mini Pumpkin 8" → "Mini Pumpkin"
  // "Arch 1" → "Arch"
  // "S - Big Y" → "S - Big Y" (no number, stays as-is)
  const match = name.match(/^(.+?)\s*\d+\s*$/);
  return match ? match[1].trim() : name;
}
```

### 2. Accordion Component
```tsx
interface CollapsibleItemListProps {
  items: MappingItem[];
  selectedItem: string | null;
  onSelect: (item: string) => void;
}

function CollapsibleItemList({ items, selectedItem, onSelect }: Props) {
  const families = useMemo(() => groupItemsByFamily(items), [items]);
  
  // Auto-expand family containing selected item
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(() => {
    if (!selectedItem) return new Set();
    const family = families.find(f => 
      f.items.some(i => i.name === selectedItem)
    );
    return family ? new Set([family.prefix]) : new Set();
  });
  
  const toggleFamily = (prefix: string) => {
    setExpandedFamilies(prev => {
      const next = new Set(prev);
      if (next.has(prefix)) {
        next.delete(prefix);
      } else {
        next.add(prefix);
      }
      return next;
    });
  };
  
  return (
    <div className="space-y-1">
      {families.map(family => (
        <FamilyAccordion
          key={family.prefix}
          family={family}
          isExpanded={expandedFamilies.has(family.prefix)}
          onToggle={() => toggleFamily(family.prefix)}
          selectedItem={selectedItem}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
```

### 3. Family Accordion Item
```tsx
function FamilyAccordion({ 
  family, 
  isExpanded, 
  onToggle, 
  selectedItem, 
  onSelect 
}: FamilyAccordionProps) {
  const hasSelection = family.items.some(i => i.name === selectedItem);
  const allMapped = family.items.every(i => i.status !== 'unmapped');
  
  // Single item families don't need accordion
  if (family.items.length === 1) {
    return (
      <ItemRow
        item={family.items[0]}
        isSelected={family.items[0].name === selectedItem}
        onClick={() => onSelect(family.items[0].name)}
      />
    );
  }
  
  return (
    <div className={cn(
      "border rounded-md",
      hasSelection && "ring-2 ring-primary",
      allMapped && "opacity-60"
    )}>
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 hover:bg-muted"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium">{family.prefix}</span>
          <Badge variant="secondary">
            {family.items.length}
          </Badge>
        </div>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {family.mappedCount > 0 && (
            <span className="text-green-600">
              ✓{family.mappedCount}
            </span>
          )}
          {family.skippedCount > 0 && (
            <span className="text-gray-400">
              ⊘{family.skippedCount}
            </span>
          )}
          {family.items.length - family.mappedCount - family.skippedCount > 0 && (
            <span>
              ○{family.items.length - family.mappedCount - family.skippedCount}
            </span>
          )}
        </div>
      </button>
      
      {/* Accordion Content */}
      {isExpanded && (
        <div className="border-t">
          {family.items.map(item => (
            <ItemRow
              key={item.name}
              item={item}
              isSelected={item.name === selectedItem}
              onClick={() => onSelect(item.name)}
              indented
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

## 📐 Visual Design

### Collapsed View
```
┌─────────────────────────────────────┐
│ Your Items                     [↕]  │
├─────────────────────────────────────┤
│ ▶ Arch                    (8)  ✓5○3 │
│ ▶ Mini Pumpkin            (8)  ○8   │
│ ▶ Spider                  (6)  ✓2○4 │
│ ▶ Star                    (4)  ○4   │
│   Window - Avery          (1)  ○1   │
│   Window - Ellis          (1)  ○1   │
│   Window - Garage         (1)  ○1   │
└─────────────────────────────────────┘

Legend: ✓=mapped, ⊘=skipped, ○=unmapped
```

### Expanded View
```
┌─────────────────────────────────────┐
│ Your Items                     [↕]  │
├─────────────────────────────────────┤
│ ▶ Arch                    (8)  ✓5○3 │
│ ▼ Mini Pumpkin            (8)  ○8   │
│ ├─────────────────────────────────┤ │
│ │   Mini Pumpkin 1              ○ │ │
│ │   Mini Pumpkin 2              ○ │ │
│ │ ● Mini Pumpkin 3              ○ │ │  ← Selected
│ │   Mini Pumpkin 4              ○ │ │
│ │   Mini Pumpkin 5              ○ │ │
│ │   Mini Pumpkin 6              ○ │ │
│ │   Mini Pumpkin 7              ○ │ │
│ │   Mini Pumpkin 8              ○ │ │
│ └─────────────────────────────────┘ │
│ ▶ Spider                  (6)  ✓2○4 │
│ ▶ Star                    (4)  ○4   │
└─────────────────────────────────────┘
```

## 🔧 Smart Behaviors

### Auto-Expand on Selection
```tsx
useEffect(() => {
  if (selectedItem) {
    const family = families.find(f => 
      f.items.some(i => i.name === selectedItem)
    );
    if (family && !expandedFamilies.has(family.prefix)) {
      setExpandedFamilies(prev => new Set([...prev, family.prefix]));
    }
  }
}, [selectedItem]);
```

### Expand All / Collapse All
```tsx
<div className="flex gap-2">
  <Button variant="ghost" size="sm" onClick={expandAll}>
    Expand All
  </Button>
  <Button variant="ghost" size="sm" onClick={collapseAll}>
    Collapse All
  </Button>
</div>
```

### Single Items (No Accordion)
```tsx
// Items without numbered siblings don't get accordion treatment
// "Window - Avery" appears as regular item, not collapsed
if (family.items.length === 1) {
  return <ItemRow item={family.items[0]} />;
}
```

## ✅ Acceptance Criteria

- [ ] Items with same prefix + different numbers grouped together
- [ ] Accordion shows count and progress (✓2 ○5 ⊘1)
- [ ] Click header to expand/collapse
- [ ] Auto-expands when selecting item inside
- [ ] Single items don't get accordion treatment
- [ ] Alphabetical sort within families
- [ ] Expand All / Collapse All buttons
- [ ] Works in Groups, Models, and High Density phases

## 🧪 Test Cases

1. **Basic grouping**: Mini Pumpkin 1-8 grouped under "Mini Pumpkin"
2. **Single item**: "Window - Avery" not in accordion
3. **Mixed status**: Family shows correct counts for mapped/skipped/unmapped
4. **Auto-expand**: Select "Mini Pumpkin 5", accordion expands
5. **Expand all**: All accordions open
6. **Collapse all**: All accordions close
7. **Sort**: Items within family sorted 1, 2, 3... 10, 11 (natural sort)

## 🏷️ Labels
- Priority: **MEDIUM**
- Type: UX Enhancement
- Phase: All mapping phases
- Effort: Medium (3-4 hours)
- Note: V2 feature - nice to have, not blocking
