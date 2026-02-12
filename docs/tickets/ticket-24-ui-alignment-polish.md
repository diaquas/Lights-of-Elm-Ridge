# Ticket 24: UI/UX Alignment & Polish

## 🎯 Objective
Clean up visual inconsistencies between left and right panels, improve card layout, and make the interface feel polished and professional.

## 📋 Issues Identified (from screenshot review)

### 1. Left/Right Panel Misalignment
- Fonts and sizes don't match between panels
- Search bars not on same row
- First card on left doesn't align with first card on right
- Overall feeling of mismatched layouts

### 2. Group Member Pills Take Too Much Space
- Current: Shows all member pills inline (cluttered)
- Better: Show count, click to expand

### 3. Missing Member Count on Right Side
- Left cards show "27 members"
- Right cards don't show member count for reference

### 4. Skip/X Button Buried
- Currently at bottom of screen
- Should be on each card for quick action

### 5. Grouped Models Sort Order
- Grouped models should sort to TOP
- Then alphabetical within groups
- Then individual models alphabetically

### 6. Navigation Buried at Bottom
- Continue/Next button requires scrolling
- Should be at top of screen (per Ticket 12)

### 7. Submodel Icon Unclear
- Current icon doesn't convey hierarchy
- Need icon showing "bottom of hierarchy"

## 🔧 Implementation

### 1. Panel Alignment System

```tsx
// Shared constants for consistent sizing
const PANEL_STYLES = {
  header: {
    title: 'text-2xl font-bold',      // Same on both sides
    subtitle: 'text-sm text-muted-foreground',
    height: 'h-20',                    // Fixed header height
  },
  search: {
    wrapper: 'h-12 px-4',              // Fixed search row height
    input: 'h-10',
  },
  card: {
    padding: 'p-4',
    gap: 'gap-3',
    title: 'text-base font-medium',
    subtitle: 'text-sm text-muted-foreground',
    badge: 'text-xs',
  },
};

// Layout structure ensuring alignment
function MappingLayout({ phase, leftPanel, rightPanel }) {
  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* LEFT PANEL */}
      <div className="flex flex-col">
        {/* Fixed Header - Same height both sides */}
        <div className={cn("flex-shrink-0", PANEL_STYLES.header.height)}>
          <h2 className={PANEL_STYLES.header.title}>Model Groups</h2>
          <p className={PANEL_STYLES.header.subtitle}>
            10 groups need matching · 8 already mapped
          </p>
        </div>
        
        {/* Search Row - Same height both sides */}
        <div className={cn("flex-shrink-0", PANEL_STYLES.search.wrapper)}>
          <SearchInput className={PANEL_STYLES.search.input} />
        </div>
        
        {/* Cards - Scrollable, aligned start */}
        <ScrollArea className="flex-1">
          {leftPanel}
        </ScrollArea>
      </div>
      
      {/* RIGHT PANEL - Mirrors left structure exactly */}
      <div className="flex flex-col">
        <div className={cn("flex-shrink-0", PANEL_STYLES.header.height)}>
          {/* Right header content */}
        </div>
        
        <div className={cn("flex-shrink-0", PANEL_STYLES.search.wrapper)}>
          <SearchInput className={PANEL_STYLES.search.input} />
        </div>
        
        <ScrollArea className="flex-1">
          {rightPanel}
        </ScrollArea>
      </div>
    </div>
  );
}
```

### 2. Collapsible Member Pills

```tsx
function GroupCard({ group, isSelected, onSelect, onSkip }) {
  const [membersExpanded, setMembersExpanded] = useState(false);
  const visibleMembers = membersExpanded ? group.members : [];
  
  return (
    <Card 
      className={cn(
        "relative cursor-pointer transition-all",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={() => onSelect(group.name)}
    >
      {/* Skip/X Button - Top Right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSkip(group.name);
        }}
        className="absolute top-2 right-2 p-1 rounded hover:bg-destructive/10 text-destructive"
        title="Skip this group"
      >
        <X className="h-4 w-4" />
      </button>
      
      <CardContent className="p-4 pr-10">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary">GRP</Badge>
          <span className={PANEL_STYLES.card.title}>{group.name}</span>
        </div>
        
        {/* Member count - clickable to expand */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMembersExpanded(!membersExpanded);
          }}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <span>{group.members.length} members</span>
          {membersExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
        
        {/* Expandable member pills */}
        {membersExpanded && (
          <div className="flex flex-wrap gap-1 mt-2">
            {group.members.map(member => (
              <Badge key={member} variant="outline" className="text-xs">
                {member}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Suggestion preview */}
        {group.suggestion && (
          <div className="mt-2 text-sm">
            <span className="text-muted-foreground">Suggested: </span>
            <span>{group.suggestion.name}</span>
            <Badge variant="outline" className="ml-2">
              {group.suggestion.confidence}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 3. Right Side Cards with Member Count

```tsx
function SuggestionCard({ item, onSelect }) {
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSelect(item.name)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={PANEL_STYLES.card.title}>{item.name}</span>
              {item.confidence && (
                <Badge 
                  variant={item.confidence >= 90 ? "default" : "secondary"}
                  className="ml-2"
                >
                  {item.confidence}%
                </Badge>
              )}
            </div>
            
            {/* Member count on right side too! */}
            {item.memberCount && (
              <p className="text-sm text-muted-foreground">
                {item.memberCount} members
              </p>
            )}
          </div>
          
          <Badge variant="outline">Group</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 4. Skip Button on Each Card

```tsx
// Skip button positioned top-right of every card
<button
  onClick={(e) => {
    e.stopPropagation();
    onSkip(item.name);
  }}
  className="absolute top-2 right-2 p-1.5 rounded-full 
             hover:bg-destructive/10 text-muted-foreground 
             hover:text-destructive transition-colors"
  title="Skip this item"
>
  <X className="h-4 w-4" />
</button>

// OR use a more explicit skip icon
<button className="...">
  <SkipForward className="h-4 w-4" />
</button>
```

### 5. Grouped Models Sort to Top

```tsx
function sortItemsForDisplay(items: MappingItem[]): MappingItem[] {
  // Separate grouped vs ungrouped
  const grouped = items.filter(i => i.parentGroup);
  const ungrouped = items.filter(i => !i.parentGroup);
  
  // Sort grouped items: by group name, then by item name
  const sortedGrouped = [...grouped].sort((a, b) => {
    const groupCompare = a.parentGroup!.localeCompare(b.parentGroup!);
    if (groupCompare !== 0) return groupCompare;
    return naturalSort(a.name, b.name);
  });
  
  // Sort ungrouped items alphabetically
  const sortedUngrouped = [...ungrouped].sort((a, b) => 
    naturalSort(a.name, b.name)
  );
  
  // Grouped first, then ungrouped
  return [...sortedGrouped, ...sortedUngrouped];
}

// Visual grouping in the list
function ItemList({ items }) {
  const sorted = sortItemsForDisplay(items);
  let currentGroup = null;
  
  return (
    <div className="space-y-1">
      {sorted.map(item => {
        const showGroupHeader = item.parentGroup && item.parentGroup !== currentGroup;
        currentGroup = item.parentGroup;
        
        return (
          <React.Fragment key={item.name}>
            {showGroupHeader && (
              <div className="sticky top-0 bg-muted/80 backdrop-blur px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                📁 {item.parentGroup}
              </div>
            )}
            <ItemCard item={item} />
          </React.Fragment>
        );
      })}
    </div>
  );
}
```

### 6. Submodel Icon (Bottom of Hierarchy)

```tsx
// Options for submodel icon:

// Option A: Nested/indented icon
const SubmodelIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M12 3v6m0 0l-3-3m3 3l3-3" strokeWidth="2" strokeLinecap="round" />
    <rect x="6" y="12" width="12" height="8" rx="2" strokeWidth="2" />
  </svg>
);

// Option B: Leaf node icon (end of branch)
const SubmodelIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M9 3v12m0 0H5m4 0h4" strokeWidth="2" strokeLinecap="round" />
    <circle cx="17" cy="15" r="4" strokeWidth="2" />
  </svg>
);

// Option C: Use existing icon with modifier
import { Layers, ChevronRight } from 'lucide-react';

const SubmodelIcon = () => (
  <div className="relative">
    <Layers className="h-4 w-4" />
    <ChevronRight className="h-2 w-2 absolute -bottom-0.5 -right-0.5" />
  </div>
);

// Option D: Simple "sub" badge
<Badge variant="outline" className="text-[10px] px-1">
  SUB
</Badge>
```

## 📐 Visual Alignment Guide

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ← Back    ○─○─●─○─○─○   12 of 18 mapped                    [Continue →]   │  ← NAV AT TOP
│                                                                             │
├──────────────────────────────────┬──────────────────────────────────────────┤
│                                  │                                          │
│  Model Groups                    │  Match for: All - Eaves - GRP            │  ← SAME HEIGHT
│  10 need matching · 8 mapped     │  27 members · Scenario B                 │
│                                  │                                          │
├──────────────────────────────────┼──────────────────────────────────────────┤
│  🔍 Filter groups...             │  🔍 Search all groups...                 │  ← SAME ROW
├──────────────────────────────────┼──────────────────────────────────────────┤
│                                  │                                          │
│  ┌────────────────────────────┐  │  ┌────────────────────────────────────┐  │  ← CARDS ALIGN
│  │ GRP  All - Eaves - GRP   ✕ │  │  │ BEST  Horizontal Lines      37%   │  │
│  │ 27 members ▼               │  │  │ 12 members                        │  │  ← MEMBER COUNT
│  │ Suggested: Horiz... 37%    │  │  └────────────────────────────────────┘  │     BOTH SIDES
│  └────────────────────────────┘  │                                          │
│                                  │  ┌────────────────────────────────────┐  │
│  ┌────────────────────────────┐  │  │ All                           14%  │  │
│  │ GRP  All - Floods - GRP  ✕ │  │  │ 8 members                         │  │
│  │ 4 members ▼                │  │  └────────────────────────────────────┘  │
│  │ Suggested: FloodLights 28% │  │                                          │
│  └────────────────────────────┘  │  ┌────────────────────────────────────┐  │
│                                  │  │ All Lawn Props                14%  │  │
│                                  │  │ 15 members                        │  │
│                                  │  └────────────────────────────────────┘  │
│                                  │                                          │
└──────────────────────────────────┴──────────────────────────────────────────┘
```

## ✅ Acceptance Criteria

### Alignment:
- [ ] Left and right panels use identical fonts/sizes
- [ ] Search bars on exact same row
- [ ] First card left aligns with first card right
- [ ] Headers same height on both sides
- [ ] Consistent padding/margins

### Cards:
- [ ] Member count shown on BOTH left and right cards
- [ ] Member pills collapsed by default, click to expand
- [ ] Skip/X button on each card (top right)
- [ ] Consistent card padding and spacing

### Sorting:
- [ ] Grouped models sort to TOP of list
- [ ] Group headers sticky when scrolling
- [ ] Alphabetical within groups
- [ ] Ungrouped items alphabetical after groups

### Navigation:
- [ ] Continue/Next button at TOP (per Ticket 12)
- [ ] Back button at TOP
- [ ] Progress indicator visible without scrolling

### Icons:
- [ ] New submodel icon showing "bottom of hierarchy"
- [ ] Consistent icon sizing across all badges

## 🧪 Test Cases

1. **Alignment check**: Screenshot left and right panels, overlay - should match
2. **Member expand**: Click member count → pills expand, click again → collapse
3. **Skip button**: X visible on every card, clicking skips item
4. **Sort order**: Grouped items appear first, then ungrouped
5. **Navigation**: Continue button visible without scrolling
6. **Responsive**: Alignment holds on different screen sizes

## 🏷️ Labels
- Priority: **MEDIUM-HIGH**
- Type: UI Polish
- Phase: All mapping phases
- Effort: Medium (3-4 hours)
- Dependencies: Ticket 12 (navigation at top)
