# Ticket 51: Auto-Match Quick Filter Buttons

## 🎯 Objective
Add quick filter buttons to the Auto-Match Review screen so users can easily filter by item type (Groups, Models, Submodel Groups) while defaulting to a view that focuses attention on what needs review.

## 📋 The Problem

### Current State
- 128 auto-matched items shown in one long list
- Only organized by confidence tier (High / Needs Review)
- No way to focus on just Groups or just Models
- Overwhelming first impression

### User Needs
- "I want to review Groups first - they're most important"
- "Show me just the Models so I can focus"
- "How many of each type matched?"

## 📐 Design

### Quick Filter Bar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✓ 128 Items Auto-Matched                                                   │
│  7 Groups · 52 Models · 69 Submodel Groups                                  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐   │  │
│  │  │    All     │ │   Groups   │ │   Models   │ │ Submodel Groups  │   │  │
│  │  │    128     │ │      7     │ │     52     │ │        69        │   │  │
│  │  │ [━━━━━━━●] │ │ [━━●━━━━━] │ │ [━━━━●━━━] │ │ [━━━━━●━━━━━━━]  │   │  │
│  │  │  ◉ active  │ │            │ │            │ │                  │   │  │
│  │  └────────────┘ └────────────┘ └────────────┘ └──────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  🔍 Search matches...                                                       │
│                                                                             │
│  ▼ ⚠️ Needs Review (70)                                         70-89%     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ... filtered list ...                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ▶ ✓ High Confidence (58)                                       90%+       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Button States

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  INACTIVE                          ACTIVE (selected)                       │
│  ┌────────────┐                    ┌────────────┐                         │
│  │   Groups   │                    │   Groups   │                         │
│  │      7     │                    │      7     │                         │
│  │ ██░░░░░░░░ │                    │ ██░░░░░░░░ │                         │
│  │  (muted)   │                    │  ◉ active  │ ← ring/highlight        │
│  └────────────┘                    └────────────┘                         │
│   border-muted                      border-primary + bg-primary/10        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Mini Progress Bars in Buttons

Each button shows a mini breakdown of High (green) vs Needs Review (yellow):

```
┌────────────┐
│   Models   │
│     52     │
│ ████████░░ │  ← 80% high confidence (green), 20% needs review (yellow)
└────────────┘

┌──────────────────┐
│ Submodel Groups  │
│        69        │
│ ███░░░░░░░░░░░░░ │  ← 30% high, 70% needs review
└──────────────────┘
```

This gives users instant insight into which category needs the most attention!

## 🔧 Implementation

### 1. Filter State

```typescript
type ItemTypeFilter = 'all' | 'groups' | 'models' | 'submodelGroups';

interface FilterState {
  selectedType: ItemTypeFilter;
  counts: {
    all: { total: number; high: number; review: number };
    groups: { total: number; high: number; review: number };
    models: { total: number; high: number; review: number };
    submodelGroups: { total: number; high: number; review: number };
  };
}

function useAutoMatchFilters(matches: AutoMatch[]): FilterState {
  const counts = useMemo(() => {
    const result = {
      all: { total: 0, high: 0, review: 0 },
      groups: { total: 0, high: 0, review: 0 },
      models: { total: 0, high: 0, review: 0 },
      submodelGroups: { total: 0, high: 0, review: 0 },
    };
    
    for (const match of matches) {
      const type = match.itemType; // 'group' | 'model' | 'submodelGroup'
      const confidence = match.score >= 0.90 ? 'high' : 'review';
      
      result.all.total++;
      result.all[confidence]++;
      
      if (type === 'group') {
        result.groups.total++;
        result.groups[confidence]++;
      } else if (type === 'model') {
        result.models.total++;
        result.models[confidence]++;
      } else {
        result.submodelGroups.total++;
        result.submodelGroups[confidence]++;
      }
    }
    
    return result;
  }, [matches]);
  
  const [selectedType, setSelectedType] = useState<ItemTypeFilter>('all');
  
  return { selectedType, setSelectedType, counts };
}
```

### 2. Quick Filter Button Component

```tsx
interface QuickFilterButtonProps {
  label: string;
  count: number;
  highCount: number;
  reviewCount: number;
  isActive: boolean;
  onClick: () => void;
}

function QuickFilterButton({
  label,
  count,
  highCount,
  reviewCount,
  isActive,
  onClick,
}: QuickFilterButtonProps) {
  const highPercent = count > 0 ? (highCount / count) * 100 : 0;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center px-4 py-2 rounded-lg border transition-all",
        "hover:bg-muted/50",
        isActive 
          ? "border-primary bg-primary/10 ring-2 ring-primary/30" 
          : "border-muted bg-card"
      )}
    >
      <span className={cn(
        "text-sm font-medium",
        isActive ? "text-primary" : "text-foreground"
      )}>
        {label}
      </span>
      
      <span className={cn(
        "text-2xl font-bold",
        isActive ? "text-primary" : "text-foreground"
      )}>
        {count}
      </span>
      
      {/* Mini progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
        <div 
          className="h-full bg-gradient-to-r from-green-500 to-green-500"
          style={{ 
            width: `${highPercent}%`,
            backgroundImage: `linear-gradient(to right, 
              #22c55e 0%, 
              #22c55e ${highPercent}%, 
              #eab308 ${highPercent}%, 
              #eab308 100%)`
          }}
        />
      </div>
      
      {/* Tooltip on hover showing breakdown */}
      <span className="sr-only">
        {highCount} high confidence, {reviewCount} needs review
      </span>
    </button>
  );
}
```

### 3. Filter Bar Component

```tsx
function QuickFilterBar({ 
  counts, 
  selectedType, 
  onSelectType 
}: QuickFilterBarProps) {
  return (
    <div className="flex gap-2 p-2 bg-muted/30 rounded-xl">
      <QuickFilterButton
        label="All"
        count={counts.all.total}
        highCount={counts.all.high}
        reviewCount={counts.all.review}
        isActive={selectedType === 'all'}
        onClick={() => onSelectType('all')}
      />
      
      <QuickFilterButton
        label="Groups"
        count={counts.groups.total}
        highCount={counts.groups.high}
        reviewCount={counts.groups.review}
        isActive={selectedType === 'groups'}
        onClick={() => onSelectType('groups')}
      />
      
      <QuickFilterButton
        label="Models"
        count={counts.models.total}
        highCount={counts.models.high}
        reviewCount={counts.models.review}
        isActive={selectedType === 'models'}
        onClick={() => onSelectType('models')}
      />
      
      <QuickFilterButton
        label="Submodel Groups"
        count={counts.submodelGroups.total}
        highCount={counts.submodelGroups.high}
        reviewCount={counts.submodelGroups.review}
        isActive={selectedType === 'submodelGroups'}
        onClick={() => onSelectType('submodelGroups')}
      />
    </div>
  );
}
```

### 4. Filter the Match List

```tsx
function AutoMatchReview({ matches }: AutoMatchReviewProps) {
  const { selectedType, setSelectedType, counts } = useAutoMatchFilters(matches);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter matches
  const filteredMatches = useMemo(() => {
    let result = matches;
    
    // Type filter
    if (selectedType !== 'all') {
      const typeMap = {
        groups: 'group',
        models: 'model',
        submodelGroups: 'submodelGroup',
      };
      result = result.filter(m => m.itemType === typeMap[selectedType]);
    }
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.sourceModel.toLowerCase().includes(q) ||
        m.destModel.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [matches, selectedType, searchQuery]);
  
  // Split by confidence
  const highConfidence = filteredMatches.filter(m => m.score >= 0.90);
  const needsReview = filteredMatches.filter(m => m.score < 0.90);
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">✓ {matches.length} Items Auto-Matched</h1>
        <p className="text-muted-foreground">
          {counts.groups.total} Groups · {counts.models.total} Models · {counts.submodelGroups.total} Submodel Groups
        </p>
      </div>
      
      {/* Quick Filters */}
      <QuickFilterBar
        counts={counts}
        selectedType={selectedType}
        onSelectType={setSelectedType}
      />
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search matches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Match List */}
      <div className="h-[900px] overflow-y-auto space-y-2">
        {/* Needs Review - Expanded by default */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-yellow-500/10 rounded-lg">
            <span className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              Needs Review ({needsReview.length})
            </span>
            <Badge variant="outline" className="text-yellow-400">70-89%</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {needsReview.map(match => (
              <MatchRow key={match.id} match={match} />
            ))}
          </CollapsibleContent>
        </Collapsible>
        
        {/* High Confidence - Collapsed by default */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-green-500/10 rounded-lg">
            <span className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-4 w-4" />
              High Confidence ({highConfidence.length})
            </span>
            <Badge variant="outline" className="text-green-400">90%+</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {highConfidence.map(match => (
              <MatchRow key={match.id} match={match} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
```

### 5. Update Counts When Filtering

```tsx
// When a filter is active, update the section headers to reflect filtered counts
<CollapsibleTrigger>
  <span>
    Needs Review ({needsReview.length})
    {selectedType !== 'all' && (
      <span className="text-muted-foreground ml-1">
        of {counts.all.review} total
      </span>
    )}
  </span>
</CollapsibleTrigger>
```

## 📐 Full Layout with Filters

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Header + Persistent Progress Tracker                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    ✓ 128 Items Auto-Matched                                 │
│              7 Groups · 52 Models · 69 Submodel Groups                      │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐        │  │
│  │ │   All    │ │  Groups  │ │  Models  │ │  Submodel Groups  │        │  │
│  │ │   128    │ │    7     │ │    52    │ │        69         │        │  │
│  │ │ ████████ │ │ ██████░░ │ │ █████░░░ │ │ ███░░░░░░░░░░░░░  │        │  │
│  │ │  ◉       │ │          │ │          │ │                   │        │  │
│  │ └──────────┘ └──────────┘ └──────────┘ └───────────────────┘        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  🔍 Search matches...                                                       │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  ▼ ⚠️ Needs Review (70)                              70-89%        │    │
│  │  ┌───────────────────────────────────────────────────────────────┐ │    │
│  │  │ ☑ GE Fuzion Balls GRP      → PPD Wreath Center...       75%  │ │    │
│  │  │ ☑ GE Fuzion Feather Even   → IC Tarantula Legs          75%  │ │    │
│  │  │ ☑ GE Fuzion Feather Odd    → IC Tarantula Legs          75%  │ │    │
│  │  │ ☑ GE Fuzion Flower GRP     → PPD Wreath Outer...        75%  │ │    │
│  │  │ ... (expanded by default)                                     │ │    │
│  │  └───────────────────────────────────────────────────────────────┘ │    │
│  │                                                                     │    │
│  │  ▶ ✓ High Confidence (58)                            90%+         │    │
│  │    (collapsed by default)                                          │    │
│  │                                                                     │    │
│  │                                                         ~900px     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  [Continue to Groups →]                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 Default Behavior

| Setting | Default | Rationale |
|---------|---------|-----------|
| **Type Filter** | All | No confusion about "where's the rest?" |
| **Needs Review** | Expanded | Focus attention on what matters |
| **High Confidence** | Collapsed | They're fine, don't need attention |
| **Search** | Empty | Ready for use if needed |

### Why "All" as Default

1. **No surprise** - User sees everything they expected
2. **Mini progress bars** show which types need attention at a glance
3. **Natural discovery** - "Oh, I can filter by Groups!"
4. **Subtitle shows breakdown** - "7 Groups · 52 Models · 69 Submodel Groups"

### Alternative: "Smart Default"

If there are ≤10 Groups, could default to Groups since:
- Quick to review
- Highest impact decisions
- Sets context for Models phase

```typescript
const defaultFilter = counts.groups.total <= 10 ? 'groups' : 'all';
```

## ✅ Acceptance Criteria

### Filter Buttons:
- [ ] Four buttons: All, Groups, Models, Submodel Groups
- [ ] Each shows count of items
- [ ] Each shows mini progress bar (high vs review)
- [ ] Active button has distinct style (ring, background)
- [ ] Clicking filters the list immediately

### Defaults:
- [ ] "All" selected by default
- [ ] "Needs Review" section expanded
- [ ] "High Confidence" section collapsed

### Filtering:
- [ ] Filter applies to both confidence sections
- [ ] Section counts update to reflect filter
- [ ] Search works within filtered results
- [ ] Empty state if filter + search yields 0 results

### Visual:
- [ ] Buttons are easy to tap/click
- [ ] Mini progress bars show green/yellow split
- [ ] Active state is clearly visible
- [ ] Responsive on mobile (stack or scroll)

## 🧪 Test Cases

1. **Default state**: All selected, Needs Review expanded, High Confidence collapsed
2. **Click Groups**: List filters to show only groups
3. **Click Models while Groups active**: Switches to Models filter
4. **Click All**: Clears filter, shows everything
5. **Search + Filter**: Both filters apply (intersection)
6. **Mini bars accurate**: Reflect actual high/review split per type
7. **Counts update**: Section headers show filtered counts

## 🏷️ Labels
- Priority: **MEDIUM-HIGH**
- Type: UX Enhancement
- Effort: Medium (3-4 hours)
- Impact: Faster review, less overwhelming
- Related: Ticket 50 (Layout), Ticket 48 (Progress Tracker)
