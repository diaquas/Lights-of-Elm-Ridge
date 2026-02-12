# Ticket 22: Consistent Search & Scroll on All Mapping Screens

## 🎯 Objective
Ensure ALL split-panel mapping screens (Model Groups, Models, Submodel Groups) have consistent search bars and scroll functionality on BOTH the left and right panels.

## 📋 Problem Statement
From UX review:
- Search bar missing or inconsistent across phases
- Right-side panel consistently missing scroll bar
- Functionality was present in earlier versions but got dropped
- Users can't filter the sequence items (right side) to find matches

## 🚨 ROOT CAUSES IDENTIFIED

### Issue 1: Suggestions Box Overtakes Search
When a user item is selected, the "Suggestions" panel grows to show recommended matches, and this pushes the search bar off-screen or completely removes it from the layout.

### Issue 2: Wrong Item Types Shown
**Model Groups phase is showing ALL MODELS on the right side instead of just Model Groups.** Users mapping at the group level should see groups, not individual models. 90% of users will want to stay at the group level.

### Issue 3: Search Should Filter Both Sections
The search bar should be ABOVE both the Suggestions and All Items sections, filtering both simultaneously.

## 🔧 Requirements

### The Layout Problem & Solution

```
❌ CURRENT (Broken):
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │ Your Model Groups   │    │ Suggestions for "Arch GRP"      │ │
│  │ ┌─────────────────┐ │    │                                 │ │
│  │ │ 🔍 Search...    │ │    │ ⭐ Arches Group (98%)           │ │
│  │ └─────────────────┘ │    │    Arch Left (85%)  ← WRONG!    │ │
│  │ ● Arch GRP          │    │    Model, not group!            │ │
│  │   Mini Trees GRP    │    │                                 │ │
│  └─────────────────────┘    │  ← NO SEARCH BAR!               │ │
│                             │  ← SHOWING MODELS, NOT GROUPS!  │ │
│                             └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

✅ CORRECT - Search filters both, only shows matching types:
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │ Your Model Groups   │    │ Sequence Model Groups    (42)   │ │
│  │ ┌─────────────────┐ │    │ ┌─────────────────────────────┐ │ │
│  │ │ 🔍 Search...    │ │    │ │ 🔍 Search...               │ │ │
│  │ └─────────────────┘ │    │ └─────────────────────────────┘ │ │
│  │ ┌─────────────────┐ │    │ ┌─────────────────────────────┐ │ │
│  │ │ ● Arch GRP     ▲│ │    │ │ 💡 Suggestions:            │ │ │
│  │ │   Mini Trees   ░│ │    │ │ ⭐ Arches GRP              │ │ │
│  │ │   Pumpkins     ░│ │    │ │    Trees GRP               │ │ │
│  │ │   Spider       ░│ │    │ ├─────────────────────────────┤ │ │
│  │ │   Stars        ░│ │    │ │ All Model Groups:         ▲│ │ │
│  │ │   Window       ░│ │    │ │   Arches GRP              ░│ │ │
│  │ │   Yard         ▼│ │    │ │   Candy Canes GRP         ░│ │ │
│  │ └─────────────────┘ │    │ │   Snowflakes GRP          ░│ │ │
│  │                     │    │ │   ...                     ▼│ │ │
│  │ [Skip]              │    │ └─────────────────────────────┘ │ │
│  │                     │    │ ☐ Show individual models       │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Requirements:

1. **Search Above Both Sections** - One search filters BOTH Suggestions AND All Items
2. **Type-Matched Items** - Each phase only shows matching types:
   - Model Groups phase → Only Model Groups on right
   - Models phase → Only Models on right  
   - Submodel Groups phase → Only Submodel Groups on right
3. **Optional Detail Toggle** - "Show individual models" checkbox for power users (default OFF)

## 🔧 Requirements

### The Layout Problem

```
❌ CURRENT (Broken) - Suggestions overtakes everything:
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │ Your Items          │    │ Suggestions for "Arch GRP"      │ │
│  │ ┌─────────────────┐ │    │                                 │ │
│  │ │ 🔍 Search...    │ │    │ ⭐ Arches Group (98%)           │ │
│  │ └─────────────────┘ │    │    Arch Left (85%)              │ │
│  │ ● Arch GRP          │    │    Arch Right (82%)             │ │
│  │   Mini Trees GRP    │    │                                 │ │
│  │   Pumpkins GRP      │    │                                 │ │
│  │   ...               │    │                                 │ │
│  └─────────────────────┘    │  ← NO SEARCH BAR!               │ │
│                             │  ← NO SCROLL TO OTHER ITEMS!    │ │
│                             └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

✅ CORRECT - Suggestions is a section, not the whole panel:
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │ Your Items    (24)  │    │ Sequence Items           (156)  │ │
│  │ ┌─────────────────┐ │    │ ┌─────────────────────────────┐ │ │
│  │ │ 🔍 Search...    │ │    │ │ 🔍 Search...               │ │ │
│  │ └─────────────────┘ │    │ └─────────────────────────────┘ │ │
│  │ ┌─────────────────┐ │    │ ┌─────────────────────────────┐ │ │
│  │ │ ● Arch GRP     ▲│ │    │ │ 💡 Suggestions:            │ │ │
│  │ │   Mini Trees   ░│ │    │ │ ⭐ Arches Group (98%)      │ │ │
│  │ │   Pumpkins     ░│ │    │ │    Arch Left (85%)         │ │ │
│  │ │   Spider       ░│ │    │ ├─────────────────────────────┤ │ │
│  │ │   Stars        ░│ │    │ │ All Items:                ▲│ │ │
│  │ │   Window       ░│ │    │ │   Arches Group            ░│ │ │
│  │ │   Yard         ▼│ │    │ │   Mini Trees GRP          ░│ │ │
│  │ └─────────────────┘ │    │ │   Snowflake Group         ░│ │ │
│  │                     │    │ │   Star Cluster            ░│ │ │
│  │ [Skip]              │    │ │   ...                     ▼│ │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Every Mapping Screen Must Have:

```
┌─────────────────────────────────────────────────────────────────┐
│  ○ Upload  ○ Auto  ● Groups  ○ Models  ○ HD  ○ Review          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │ Your Items    (24)  │    │ Sequence Items           (156)  │ │
│  │ ┌─────────────────┐ │    │ ┌─────────────────────────────┐ │ │
│  │ │ 🔍 Search...    │ │    │ │ 🔍 Search...               │ │ │ ← SEARCH BOTH
│  │ └─────────────────┘ │    │ └─────────────────────────────┘ │ │
│  │ ┌─────────────────┐ │    │ ┌─────────────────────────────┐ │ │
│  │ │ Arch GRP       ▲│ │    │ │ ⭐ Arches Group           ▲│ │ │
│  │ │ Mini Trees GRP ░│ │    │ │    Mini Trees GRP        ░│ │ │
│  │ │ Pumpkins GRP   ░│ │    │ │    Snowflake Group       ░│ │ │
│  │ │ Spider GRP     ░│ │    │ │    Star Cluster          ░│ │ │
│  │ │ Stars GRP      ░│ │    │ │    Window Group          ░│ │ │ ← SCROLL BOTH
│  │ │ Window GRP     ░│ │    │ │    Yard Outline          ░│ │ │
│  │ │ Yard GRP       ░│ │    │ │    ...                   ░│ │ │
│  │ │                ▼│ │    │ │                          ▼│ │ │
│  │ └─────────────────┘ │    │ └─────────────────────────────┘ │ │
│  │                     │    │                                 │ │
│  │ [Skip]              │    │                                 │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ← Back                    8 of 24 mapped     [Continue →]      │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation

### 1. Reusable SearchableList Component

```tsx
interface SearchableListProps {
  items: Array<{ name: string; [key: string]: any }>;
  selectedItem?: string;
  onSelect: (item: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  renderItem?: (item: any, isSelected: boolean) => React.ReactNode;
}

function SearchableList({
  items,
  selectedItem,
  onSelect,
  placeholder = "Search...",
  emptyMessage = "No items found",
  renderItem,
}: SearchableListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2.5"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-muted-foreground mt-1">
            Showing {filteredItems.length} of {items.length}
          </p>
        )}
      </div>
      
      {/* Scrollable List */}
      <ScrollArea className="flex-1">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredItems.map(item => (
              <div
                key={item.name}
                onClick={() => onSelect(item.name)}
                className={cn(
                  "p-2 rounded cursor-pointer hover:bg-muted",
                  selectedItem === item.name && "bg-primary/10 border border-primary"
                )}
              >
                {renderItem ? renderItem(item, selectedItem === item.name) : item.name}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
```

### 2. Fix Right Panel Layout (THE KEY FIX)

```tsx
// ✅ CORRECT - Search filters both sections, type-matched items only
function RightPanel({ 
  phase,
  selectedItem, 
  suggestions, 
  allItems,  // Already filtered to correct type by parent!
  onMatch 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTypes, setShowAllTypes] = useState(false);
  
  // Filter BOTH suggestions and items with same search
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return suggestions;
    const query = searchQuery.toLowerCase();
    return suggestions.filter(s => 
      s.name.toLowerCase().includes(query)
    );
  }, [suggestions, searchQuery]);
  
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems;
    const query = searchQuery.toLowerCase();
    return allItems.filter(item => 
      item.name.toLowerCase().includes(query)
    );
  }, [allItems, searchQuery]);
  
  const phaseLabel = PHASE_LABELS[phase]; // "Model Groups" | "Models" | "Submodel Groups"
  
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle>Sequence {phaseLabel} ({allItems.length})</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {/* SEARCH - ALWAYS VISIBLE, FILTERS EVERYTHING BELOW */}
        <div className="flex-shrink-0 p-2 border-b">
          <SearchInput 
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={`Search ${phaseLabel.toLowerCase()}...`}
          />
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-1">
              Showing {filteredSuggestions.length + filteredItems.length} results
            </p>
          )}
        </div>
        
        {/* SCROLLABLE AREA - Contains both Suggestions and All Items */}
        <ScrollArea className="flex-1">
          {/* SUGGESTIONS SECTION */}
          {selectedItem && filteredSuggestions.length > 0 && (
            <div className="border-b bg-muted/30 p-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                💡 Suggested matches for "{selectedItem}"
              </p>
              <div className="space-y-1">
                {filteredSuggestions.slice(0, 5).map(s => (
                  <SuggestionRow 
                    key={s.name} 
                    suggestion={s} 
                    onClick={() => onMatch(selectedItem, s.name)}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* ALL ITEMS SECTION */}
          <div className="p-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              All {phaseLabel} ({filteredItems.length})
            </p>
            <div className="space-y-1">
              {filteredItems.map(item => (
                <ItemRow
                  key={item.name}
                  item={item}
                  onClick={() => onMatch(selectedItem, item.name)}
                />
              ))}
              {filteredItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No {phaseLabel.toLowerCase()} match your search
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
        
        {/* OPTIONAL: Show other types toggle (for power users) */}
        {phase === 'groups' && (
          <div className="flex-shrink-0 p-2 border-t bg-muted/20">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox 
                checked={showAllTypes}
                onCheckedChange={setShowAllTypes}
              />
              <span className="text-muted-foreground">
                Show individual models (advanced)
              </span>
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const PHASE_LABELS = {
  'groups': 'Model Groups',
  'models': 'Models',
  'high-density': 'Submodel Groups',
};
```

### 3. Type-Filtered Data (Parent Component)

```tsx
// The parent component must filter items by type BEFORE passing to RightPanel

function MappingPhase({ phase, sequenceLayout }) {
  // Filter sequence items to match the current phase type
  const rightPanelItems = useMemo(() => {
    switch (phase) {
      case 'groups':
        // ONLY model groups - no individual models!
        return sequenceLayout.items.filter(item => 
          item.type === 'MODEL_GROUP'
        );
      
      case 'models':
        // ONLY models and submodels
        return sequenceLayout.items.filter(item => 
          item.type === 'MODEL' || item.type === 'SUBMODEL'
        );
      
      case 'high-density':
        // ONLY submodel groups
        return sequenceLayout.items.filter(item => 
          item.type === 'SUBMODEL_GROUP'
        );
      
      default:
        return [];
    }
  }, [phase, sequenceLayout]);
  
  return (
    <RightPanel 
      phase={phase}
      allItems={rightPanelItems}  // Already filtered!
      // ...
    />
  );
}
```

### 4. Key Layout Rules

```css
/* Suggestions section MUST have max-height */
.suggestions-section {
  flex-shrink: 0;        /* Don't shrink */
  max-height: 200px;     /* But also don't grow beyond this */
  overflow-y: auto;      /* Scroll if needed */
}

/* Search MUST be flex-shrink-0 to never disappear */
.search-section {
  flex-shrink: 0;
}

/* Item list takes ALL remaining space */
.items-section {
  flex: 1;
  overflow: hidden;
}
```

### 4. Apply to All Mapping Phases

```tsx
// MappingPhaseLayout.tsx - shared by Groups, Models, HD

interface MappingPhaseLayoutProps {
  phase: 'groups' | 'models' | 'high-density';
  userItems: MappingItem[];
  sequenceItems: SequenceItem[];
  // ...
}

function MappingPhaseLayout({ 
  phase, 
  userItems, 
  sequenceItems,
  selectedUserItem,
  onSelectUserItem,
  onMatch,
  onSkip,
}: MappingPhaseLayoutProps) {
  return (
    <div className="grid grid-cols-2 gap-4 h-[calc(100vh-200px)]">
      {/* LEFT PANEL - User's Items */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Your {PHASE_LABELS[phase]} ({userItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <SearchableList
            items={userItems}
            selectedItem={selectedUserItem}
            onSelect={onSelectUserItem}
            placeholder={`Search your ${PHASE_LABELS[phase].toLowerCase()}...`}
            renderItem={(item, isSelected) => (
              <UserItemRow item={item} isSelected={isSelected} />
            )}
          />
        </CardContent>
      </Card>
      
      {/* RIGHT PANEL - Sequence Items */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Sequence {PHASE_LABELS[phase]} ({sequenceItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <SearchableList
            items={sequenceItems}
            onSelect={(name) => onMatch(selectedUserItem, name)}
            placeholder={`Search sequence ${PHASE_LABELS[phase].toLowerCase()}...`}
            renderItem={(item, isSelected) => (
              <SequenceItemRow item={item} isSelected={isSelected} />
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

const PHASE_LABELS = {
  'groups': 'Model Groups',
  'models': 'Models',
  'high-density': 'Submodel Groups',
};
```

### 3. Ensure ScrollArea Works Correctly

```tsx
// Common issue: ScrollArea needs explicit height constraints

// ❌ WRONG - no height constraint, won't scroll
<Card>
  <ScrollArea>
    {items.map(...)}
  </ScrollArea>
</Card>

// ✅ CORRECT - flex container with overflow-hidden
<Card className="flex flex-col h-full overflow-hidden">
  <CardHeader className="flex-shrink-0">...</CardHeader>
  <CardContent className="flex-1 overflow-hidden p-0">
    <ScrollArea className="h-full">
      {items.map(...)}
    </ScrollArea>
  </CardContent>
</Card>
```

### 4. Search Behavior

| Feature | Behavior |
|---------|----------|
| Instant filter | Filter as user types (no debounce needed for <500 items) |
| Case insensitive | "ARCH" matches "Arch GRP" |
| Partial match | "pum" matches "Pumpkin" |
| Clear button | X button appears when search has text |
| Result count | "Showing 5 of 24" when filtered |
| Empty state | "No items match your search" |
| Preserved on navigate | Search clears when changing phases |

## ✅ Acceptance Criteria

### Type Filtering (CRITICAL FIX):

- [ ] **Model Groups phase**: Right side shows ONLY Model Groups (not individual models)
- [ ] **Models phase**: Right side shows ONLY Models/Submodels
- [ ] **Submodel Groups phase**: Right side shows ONLY Submodel Groups
- [ ] Optional "Show individual models" checkbox on Groups phase (default OFF)

### Search Behavior:

- [ ] Search bar is ABOVE both Suggestions and All Items sections
- [ ] One search filters BOTH Suggestions AND All Items simultaneously
- [ ] Search bar uses `flex-shrink: 0` - NEVER disappears
- [ ] Search bar visible even when suggestions are showing

### Layout Structure:

- [ ] Suggestions and All Items in single ScrollArea (both scroll together)
- [ ] Suggestions section visually distinct (background color)
- [ ] "All {Type}" section always visible below suggestions

### All Three Phases Must Have:

- [ ] **Model Groups phase**: Search on left ✓, Search on right ✓, Scroll on left ✓, Scroll on right ✓
- [ ] **Models phase**: Search on left ✓, Search on right ✓, Scroll on left ✓, Scroll on right ✓
- [ ] **Submodel Groups phase**: Search on left ✓, Search on right ✓, Scroll on left ✓, Scroll on right ✓

### Search Functionality:

- [ ] Instant filtering as user types
- [ ] Case-insensitive matching
- [ ] Partial string matching
- [ ] Clear button (X) when search has text
- [ ] "Showing X of Y" count when filtered
- [ ] "No items found" empty state
- [ ] Search clears when phase changes

### Scroll Functionality:

- [ ] Both panels scroll independently
- [ ] Scroll bar visible when content overflows
- [ ] Scroll position preserved during search
- [ ] Smooth scrolling behavior
- [ ] Works with 100+ items without lag

## 🧪 Test Cases

### Type Filtering Tests (NEW):
1. **Groups phase - correct types**: Open Groups phase, verify right side shows ONLY groups (no individual models like "Mini Tree 1")
2. **Models phase - correct types**: Open Models phase, verify right side shows ONLY models
3. **HD phase - correct types**: Open HD phase, verify right side shows ONLY submodel groups
4. **Toggle works**: In Groups phase, check "Show individual models", verify models now appear

### Search Tests:
5. **Search filters both**: Type "arch" in search, verify BOTH suggestions AND all items filter
6. **Suggestions don't hide search**: Select an item on left, verify search bar STILL visible on right
7. **Left search**: Type "arch", verify only arch items shown on left
8. **Right search**: Type "tree", verify only tree items shown on right
9. **Search WITH suggestions**: Select item, suggestions show, type in search, verify both filter

### Scroll Tests:
10. **Clear search**: Click X, verify all items return
11. **Both panels scroll**: 50+ items on each side, both scroll independently
12. **Empty search result**: Type "zzzzz", verify "No items found" message
13. **Case insensitive**: Type "PUMP", verify matches "pumpkin"
14. **Phase consistency**: Check all 3 phases have identical layout structure

## 🔍 Audit Checklist

Before marking complete, verify each screen:

### Model Groups Screen
```
□ Left panel has search input
□ Left panel scrolls with scrollbar visible
□ Right panel has search input  
□ Right panel scrolls with scrollbar visible
□ Right panel shows ONLY Model Groups (NOT individual models!)
□ "Show individual models" checkbox present (default OFF)
□ Search filters BOTH Suggestions and All Model Groups
```

### Models Screen
```
□ Left panel has search input
□ Left panel scrolls with scrollbar visible
□ Right panel has search input
□ Right panel scrolls with scrollbar visible
□ Right panel shows ONLY Models/Submodels
□ Search filters BOTH Suggestions and All Models
```

### Submodel Groups (High Density) Screen
```
□ Left panel has search input
□ Left panel scrolls with scrollbar visible
□ Right panel has search input
□ Right panel scrolls with scrollbar visible
□ Right panel shows ONLY Submodel Groups
□ Search filters BOTH Suggestions and All Submodel Groups
```

## 🏷️ Labels
- Priority: **HIGH**
- Type: Bug Fix / Regression
- Phase: Groups, Models, High Density
- Effort: Medium (3-4 hours)
- Note: This is a regression - functionality existed before and was lost
