# Ticket 16: Alphabetical Sort for Left Panel

## 🎯 Objective
Sort items in the left panel alphabetically so related items appear together.

## 📋 Problem Statement
From UX walkthrough:
- "Mini Pumpkin 8 floating here, and then down here you end up with Mini Pumpkin 7, 6, 5, 4, 3, 2, 1"
- "One is somewhere else, like, it's just kind of a mess"
- "There's no rhyme or reason to the left side organization"
- "These should already be stacked together"

## 🔧 Implementation

### 1. Basic Alphabetical Sort
```tsx
function sortItemsAlphabetically(items: MappingItem[]): MappingItem[] {
  return [...items].sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { 
      numeric: true,  // "Item 2" comes before "Item 10"
      sensitivity: 'base' 
    })
  );
}

// Usage
const sortedItems = sortItemsAlphabetically(userItems);
```

### 2. Natural Sort for Numbers
```tsx
// "Mini Pumpkin 1" through "Mini Pumpkin 10" in correct order
function naturalSort(items: MappingItem[]): MappingItem[] {
  return [...items].sort((a, b) => {
    // Split into text and number parts
    const regex = /(\d+)|(\D+)/g;
    const aParts = a.name.match(regex) || [];
    const bParts = b.name.match(regex) || [];
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || '';
      const bPart = bParts[i] || '';
      
      const aNum = parseInt(aPart);
      const bNum = parseInt(bPart);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum !== bNum) return aNum - bNum;
      } else {
        const cmp = aPart.localeCompare(bPart);
        if (cmp !== 0) return cmp;
      }
    }
    return 0;
  });
}
```

### 3. Sort Options (Future Enhancement)
```tsx
type SortOption = 'alphabetical' | 'status' | 'confidence';

function sortItems(items: MappingItem[], sortBy: SortOption): MappingItem[] {
  switch (sortBy) {
    case 'alphabetical':
      return naturalSort(items);
    
    case 'status':
      // Unmapped first, then mapped, then skipped
      return [...items].sort((a, b) => {
        const statusOrder = { unmapped: 0, mapped: 1, skipped: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
    
    case 'confidence':
      // Highest confidence suggestions first
      return [...items].sort((a, b) => 
        (b.topSuggestionConfidence || 0) - (a.topSuggestionConfidence || 0)
      );
    
    default:
      return items;
  }
}
```

## 📐 Before vs After

### Before (Chaotic)
```
┌─────────────────────┐
│ Your Items          │
│                     │
│ Mini Pumpkin 8      │
│ Spider 3            │
│ Arch 1              │
│ Mini Pumpkin 2      │
│ Spider 1            │
│ Arch 5              │
│ Mini Pumpkin 7      │
│ Spider 2            │
│ Mini Pumpkin 6      │
│ Arch 3              │
│ Mini Pumpkin 5      │
│ ...                 │
└─────────────────────┘
```

### After (Organized)
```
┌─────────────────────┐
│ Your Items     [↕]  │  ← Sort toggle
│                     │
│ Arch 1              │
│ Arch 2              │
│ Arch 3              │
│ Arch 4              │
│ Arch 5              │
│ Mini Pumpkin 1      │
│ Mini Pumpkin 2      │
│ Mini Pumpkin 3      │
│ Mini Pumpkin 4      │
│ Mini Pumpkin 5      │
│ Mini Pumpkin 6      │
│ Mini Pumpkin 7      │
│ Mini Pumpkin 8      │
│ Spider 1            │
│ Spider 2            │
│ Spider 3            │
│ ...                 │
└─────────────────────┘
```

## 🔧 Component Implementation

```tsx
interface ItemListProps {
  items: MappingItem[];
  selectedItem: string | null;
  onSelect: (item: string) => void;
}

function ItemList({ items, selectedItem, onSelect }: ItemListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  const sortedItems = useMemo(() => sortItems(items, sortBy), [items, sortBy]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with sort control */}
      <div className="flex justify-between items-center p-2 border-b">
        <span className="font-medium">Your Items ({items.length})</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortBy('alphabetical')}>
              A-Z (Alphabetical)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('status')}>
              By Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy('confidence')}>
              By Match Confidence
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Scrollable item list */}
      <ScrollArea className="flex-1">
        {sortedItems.map(item => (
          <ItemRow
            key={item.name}
            item={item}
            isSelected={item.name === selectedItem}
            onClick={() => onSelect(item.name)}
          />
        ))}
      </ScrollArea>
    </div>
  );
}
```

## ✅ Acceptance Criteria

- [ ] Default sort is alphabetical with natural number ordering
- [ ] "Mini Pumpkin 1" through "Mini Pumpkin 10" appear in correct order
- [ ] Related items (same prefix) appear grouped together
- [ ] Sort persists during session
- [ ] Sort dropdown available (A-Z, Status, Confidence)
- [ ] Works in all phases (Groups, Models, High Density)

## 🧪 Test Cases

1. **Natural sort**: "Item 2" before "Item 10"
2. **Case insensitive**: "arch" groups with "Arch"
3. **Mixed content**: Numbers, letters, special chars all sort reasonably
4. **Empty list**: Graceful handling
5. **Single item**: No errors
6. **Sort persistence**: Change sort, navigate away, return - sort preserved

## 🏷️ Labels
- Priority: **HIGH**
- Type: UX Improvement
- Phase: All mapping phases
- Effort: Low (1-2 hours)
