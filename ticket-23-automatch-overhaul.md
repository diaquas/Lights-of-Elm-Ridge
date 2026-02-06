# Ticket 23: Auto-Match Screen Overhaul

## 🎯 Objective
Redesign the Auto-Match screen to:
1. Include ALL entity types (Groups, Models, Submodel Groups) - not just Models
2. Change from opt-IN to opt-OUT paradigm
3. Sort by lowest confidence first for fastest review
4. Allow users to un-map items they want to handle manually

## 📋 Problem Statement

### Issue 1: Missing Entity Types
Currently only showing auto-matched **Models**. Missing:
- **Model Groups** - should be auto-matched and shown
- **Submodel Groups** - should be auto-matched and shown

This likely broke when we introduced proper type separation.

### Issue 2: Wrong Mental Model
Current: "Review and ACCEPT matches" (opt-in)
Better: "Review and REJECT matches" (opt-out)

**Why opt-out is better:**
- 70%+ confidence matches are usually correct
- Users only need to review questionable ones
- Faster path to completion
- Sort lowest confidence first = review worst matches first, accept the rest

### Issue 3: Confusing Expansion Area
The "Review X accepted Matches" expandable section adds cognitive load. Just show the list directly.

## 🔧 Current vs Target State

### ❌ Current (Confusing)
```
┌─────────────────────────────────────────────────────────────────┐
│  Auto-Matched Models                                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ✓  104 Models Auto-Matched                                 ││
│  │     Average Confidence: 0%  ← BROKEN                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ▶ Review 104 accepted matches  ← HAVE TO EXPAND               │
│                                                                  │
│  [Continue to Groups →]                                          │
│                                                                  │
│  ← Missing Groups! Missing Submodel Groups!                      │
└─────────────────────────────────────────────────────────────────┘
```

### ✅ Target (Clear, Opt-Out, Coverage Focused)
```
┌─────────────────────────────────────────────────────────────────┐
│  Auto-Matched Items                                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ✓  156 Items Auto-Matched                                  ││
│  │     ├─ 12 Model Groups                                      ││
│  │     ├─ 104 Models                                           ││
│  │     └─ 40 Submodel Groups                                   ││
│  │                                                             ││
│  │  Display Coverage: 78%                                      ││
│  │  ┌─────────────────────────────────────────────────────┐   ││
│  │  │████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░│   ││
│  │  │ 142 green (91%)    │ 14 yellow (9%)  │  uncovered  │   ││
│  │  └─────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Uncheck any items you'd prefer to map manually:                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🔍 Search...                                                ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ▼ Needs Review (14 yellow matches)              [OPEN]      ││
│  │ ┌───────────────────────────────────────────────────────┐  ││
│  │ │ ☑ Arch GRP → Arches Group            72%  [Group]    ▲│  ││
│  │ │ ☑ Mini Pumpkin 3 → Mini Tree 3       74%  [Model]    ░│  ││
│  │ │ ☑ S - Outer → Odyssey Outer          75%  [HD Grp]   ░│  ││
│  │ │ ☑ Spider GRP → Spiders Group         78%  [Group]    ▼│  ││
│  │ └───────────────────────────────────────────────────────┘  ││
│  │                                                             ││
│  │ ▶ High Confidence (142 green matches)           [CLOSED]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ← Back                    156 of 156 accepted   [Continue →]   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation

### 1. Auto-Match ALL Entity Types

```typescript
interface AutoMatchResult {
  userItem: string;
  sequenceItem: string;
  confidence: number;
  type: 'MODEL_GROUP' | 'MODEL' | 'SUBMODEL' | 'SUBMODEL_GROUP';
  accepted: boolean; // Default TRUE (opt-out)
}

function performAutoMatch(
  userLayout: ParsedLayout,
  sequenceLayout: ParsedLayout,
  minConfidence: number = 0.70
): AutoMatchResult[] {
  const results: AutoMatchResult[] = [];
  
  // Auto-match Model Groups
  for (const userGroup of userLayout.modelGroups) {
    const match = findBestMatch(userGroup, sequenceLayout.modelGroups);
    if (match && match.confidence >= minConfidence) {
      results.push({
        userItem: userGroup.name,
        sequenceItem: match.item.name,
        confidence: match.confidence,
        type: 'MODEL_GROUP',
        accepted: true,
      });
    }
  }
  
  // Auto-match Models
  for (const userModel of userLayout.models) {
    const match = findBestMatch(userModel, sequenceLayout.models);
    if (match && match.confidence >= minConfidence) {
      results.push({
        userItem: userModel.name,
        sequenceItem: match.item.name,
        confidence: match.confidence,
        type: 'MODEL',
        accepted: true,
      });
    }
  }
  
  // Auto-match Submodel Groups
  for (const userSubmodelGroup of userLayout.submodelGroups) {
    const match = findBestMatch(userSubmodelGroup, sequenceLayout.submodelGroups);
    if (match && match.confidence >= minConfidence) {
      results.push({
        userItem: userSubmodelGroup.name,
        sequenceItem: match.item.name,
        confidence: match.confidence,
        type: 'SUBMODEL_GROUP',
        accepted: true,
      });
    }
  }
  
  // Sort by confidence ASCENDING (lowest first for fastest review)
  return results.sort((a, b) => a.confidence - b.confidence);
}
```

### 2. Auto-Match Screen Component

```tsx
// Confidence thresholds
const GREEN_THRESHOLD = 0.90;  // 90%+ = green (high confidence)
const YELLOW_THRESHOLD = 0.70; // 70-89% = yellow (needs review)

function AutoMatchScreen({ 
  autoMatches,
  totalSequenceItems, // Total items in sequence for coverage calc
  onToggleMatch, 
  onContinue 
}: AutoMatchScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [yellowExpanded, setYellowExpanded] = useState(true);  // Default OPEN
  const [greenExpanded, setGreenExpanded] = useState(false);   // Default CLOSED
  
  // Split matches by confidence level
  const { greenMatches, yellowMatches, stats } = useMemo(() => {
    const accepted = autoMatches.filter(m => m.accepted);
    const green = autoMatches.filter(m => m.confidence >= GREEN_THRESHOLD);
    const yellow = autoMatches.filter(m => m.confidence >= YELLOW_THRESHOLD && m.confidence < GREEN_THRESHOLD);
    
    // Sort each by confidence ASC (lowest first)
    green.sort((a, b) => a.confidence - b.confidence);
    yellow.sort((a, b) => a.confidence - b.confidence);
    
    // Display coverage = matched items / total sequence items
    const displayCoverage = Math.round((accepted.length / totalSequenceItems) * 100);
    
    return {
      greenMatches: green,
      yellowMatches: yellow,
      stats: {
        total: autoMatches.length,
        accepted: accepted.length,
        green: green.filter(m => m.accepted).length,
        yellow: yellow.filter(m => m.accepted).length,
        displayCoverage,
        modelGroups: accepted.filter(m => m.type === 'MODEL_GROUP').length,
        models: accepted.filter(m => m.type === 'MODEL').length,
        submodelGroups: accepted.filter(m => m.type === 'SUBMODEL_GROUP').length,
      },
    };
  }, [autoMatches, totalSequenceItems]);
  
  // Filter by search (applies to both sections)
  const filterBySearch = (matches: AutoMatchResult[]) => {
    if (!searchQuery.trim()) return matches;
    const query = searchQuery.toLowerCase();
    return matches.filter(m => 
      m.userItem.toLowerCase().includes(query) ||
      m.sequenceItem.toLowerCase().includes(query)
    );
  };
  
  const filteredYellow = filterBySearch(yellowMatches);
  const filteredGreen = filterBySearch(greenMatches);
  
  return (
    <div className="flex flex-col h-full">
      {/* Success Banner with Coverage Bar */}
      <Card className="mb-4 bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-green-800">
                {stats.accepted} Items Auto-Matched
              </h2>
              <p className="text-sm text-green-700">
                {stats.modelGroups} Model Groups • 
                {stats.models} Models • 
                {stats.submodelGroups} Submodel Groups
              </p>
            </div>
          </div>
          
          {/* Display Coverage Bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-green-800">
                Display Coverage
              </span>
              <span className="text-lg font-bold text-green-800">
                {stats.displayCoverage}%
              </span>
            </div>
            <CoverageBar 
              greenCount={stats.green}
              yellowCount={stats.yellow}
              total={totalSequenceItems}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Instructions */}
      <p className="text-sm text-muted-foreground mb-2">
        Uncheck any items you'd prefer to map manually.
      </p>
      
      {/* Search */}
      <div className="mb-2">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search matches..."
        />
      </div>
      
      {/* Collapsible Sections */}
      <ScrollArea className="flex-1 border rounded-md">
        {/* Yellow Section - Needs Review (DEFAULT OPEN) */}
        <Collapsible open={yellowExpanded} onOpenChange={setYellowExpanded}>
          <CollapsibleTrigger className="w-full p-3 bg-yellow-50 border-b flex items-center justify-between hover:bg-yellow-100">
            <div className="flex items-center gap-2">
              {yellowExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-medium text-yellow-800">
                ⚠️ Needs Review ({filteredYellow.length} yellow matches)
              </span>
            </div>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              70-89%
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-2 space-y-1 bg-yellow-50/30">
              {filteredYellow.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No yellow matches {searchQuery && "matching your search"}
                </p>
              ) : (
                filteredYellow.map(match => (
                  <AutoMatchRow
                    key={match.userItem}
                    match={match}
                    onToggle={() => onToggleMatch(match.userItem)}
                  />
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Green Section - High Confidence (DEFAULT CLOSED) */}
        <Collapsible open={greenExpanded} onOpenChange={setGreenExpanded}>
          <CollapsibleTrigger className="w-full p-3 bg-green-50 border-b flex items-center justify-between hover:bg-green-100">
            <div className="flex items-center gap-2">
              {greenExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-medium text-green-800">
                ✓ High Confidence ({filteredGreen.length} green matches)
              </span>
            </div>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              90%+
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-2 space-y-1 bg-green-50/30">
              {filteredGreen.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No green matches {searchQuery && "matching your search"}
                </p>
              ) : (
                filteredGreen.map(match => (
                  <AutoMatchRow
                    key={match.userItem}
                    match={match}
                    onToggle={() => onToggleMatch(match.userItem)}
                  />
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </ScrollArea>
      
      {/* Footer */}
      <div className="mt-4 flex justify-between items-center">
        <Button variant="outline">← Back</Button>
        <span className="text-sm text-muted-foreground">
          {stats.accepted} of {stats.total} accepted
        </span>
        <Button onClick={onContinue}>
          Continue to Groups →
        </Button>
      </div>
    </div>
  );
}
```

### 3. Coverage Bar Component

```tsx
interface CoverageBarProps {
  greenCount: number;
  yellowCount: number;
  total: number;
}

function CoverageBar({ greenCount, yellowCount, total }: CoverageBarProps) {
  const greenPercent = (greenCount / total) * 100;
  const yellowPercent = (yellowCount / total) * 100;
  const uncoveredPercent = 100 - greenPercent - yellowPercent;
  
  return (
    <div className="space-y-1">
      {/* Bar */}
      <div className="h-6 rounded-full overflow-hidden bg-gray-200 flex">
        {/* Green section */}
        <div 
          className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
          style={{ width: `${greenPercent}%` }}
        >
          {greenPercent > 15 && greenCount}
        </div>
        
        {/* Yellow section */}
        <div 
          className="bg-yellow-400 flex items-center justify-center text-xs text-yellow-900 font-medium"
          style={{ width: `${yellowPercent}%` }}
        >
          {yellowPercent > 10 && yellowCount}
        </div>
        
        {/* Uncovered section (gray) */}
        <div 
          className="bg-gray-300 flex items-center justify-center text-xs text-gray-600"
          style={{ width: `${uncoveredPercent}%` }}
        >
          {uncoveredPercent > 15 && `${Math.round(uncoveredPercent)}%`}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500"></span>
          {greenCount} green ({Math.round(greenPercent)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-400"></span>
          {yellowCount} yellow ({Math.round(yellowPercent)}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-300"></span>
          uncovered
        </span>
      </div>
    </div>
  );
}
```

### 4. Individual Match Row

```tsx
function AutoMatchRow({ 
  match, 
  onToggle 
}: { 
  match: AutoMatchResult; 
  onToggle: () => void;
}) {
  const confidenceColor = match.confidence >= 0.9 
    ? 'text-green-600' 
    : match.confidence >= 0.8 
      ? 'text-yellow-600' 
      : 'text-orange-600';
  
  const typeLabel = {
    'MODEL_GROUP': 'Group',
    'MODEL': 'Model',
    'SUBMODEL': 'Submodel',
    'SUBMODEL_GROUP': 'HD Group',
  }[match.type];
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-2 rounded hover:bg-muted",
        !match.accepted && "opacity-50 bg-muted/50"
      )}
    >
      <Checkbox
        checked={match.accepted}
        onCheckedChange={onToggle}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{match.userItem}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate text-muted-foreground">{match.sequenceItem}</span>
        </div>
      </div>
      
      <Badge variant="outline" className="flex-shrink-0">
        {typeLabel}
      </Badge>
      
      <span className={cn("text-sm font-medium flex-shrink-0 w-12 text-right", confidenceColor)}>
        {Math.round(match.confidence * 100)}%
      </span>
    </div>
  );
}
```

### 4. Persist Rejected Matches

```typescript
// Items the user un-checked need to appear in their respective phases
function getItemsForPhase(
  phase: 'groups' | 'models' | 'high-density',
  allItems: LayoutItem[],
  autoMatches: AutoMatchResult[]
): LayoutItem[] {
  const acceptedAutoMatches = autoMatches
    .filter(m => m.accepted)
    .map(m => m.userItem);
  
  // Return items that were NOT auto-matched OR were rejected (unchecked)
  return allItems.filter(item => !acceptedAutoMatches.includes(item.name));
}
```

## 📐 Visual Flow

```
1. User uploads layout + sequence
                ↓
2. System auto-matches at 70%+ confidence
   - Model Groups → Model Groups
   - Models → Models  
   - Submodel Groups → Submodel Groups
                ↓
3. Auto-Match Screen shows:
   - Success banner with counts by type
   - List sorted by confidence (72%, 74%, 75%... 100%)
   - All items CHECKED by default
                ↓
4. User reviews (starting from lowest confidence)
   - Unchecks anything they want to map manually
   - Most users will uncheck 0-5 items
                ↓
5. Continue to Groups
   - Only shows items NOT auto-matched
   - Or items user unchecked
```

## ✅ Acceptance Criteria

### Entity Types:
- [ ] Auto-matches Model Groups (not just Models)
- [ ] Auto-matches Models
- [ ] Auto-matches Submodel Groups
- [ ] Stats banner shows breakdown by type

### Display Coverage Bar:
- [ ] Shows "Display Coverage: X%" as primary metric
- [ ] Bar shows green section with count (90%+ confidence)
- [ ] Bar shows yellow section with count (70-89% confidence)
- [ ] Bar shows gray/uncovered section
- [ ] Legend below bar explains colors
- [ ] **This is a key metric to track** for matching logic improvements

### Collapsible Sections:
- [ ] "Needs Review" (yellow) section - **DEFAULT OPEN**
- [ ] "High Confidence" (green) section - **DEFAULT CLOSED**
- [ ] Both sections show count in header
- [ ] Click header to expand/collapse
- [ ] Search filters both sections simultaneously

### Opt-Out Paradigm:
- [ ] All matches CHECKED by default (accepted)
- [ ] User unchecks to reject/handle manually
- [ ] Unchecked items appear in their respective phase

### Sorting:
- [ ] Within each section, sorted by confidence ASCENDING
- [ ] Yellow section: 70%, 72%, 75%... 89%
- [ ] Green section: 90%, 92%, 95%... 100%

### UI:
- [ ] Success banner with green checkmark
- [ ] Stats: total, by type, display coverage
- [ ] Search bar to filter matches
- [ ] Checkbox on each row
- [ ] Confidence percentage shown
- [ ] Type badge shown (Group/Model/HD Group)
- [ ] No "average confidence" - replaced by coverage bar

## 🧪 Test Cases

### Coverage Bar:
1. **Coverage calculation**: 156 matched / 200 total = 78% coverage displayed
2. **Bar proportions**: Green section width matches green count percentage
3. **Numbers in bar**: Counts appear inside bar sections when wide enough
4. **Legend accurate**: Legend shows correct counts and percentages

### Collapsible Sections:
5. **Default state**: Yellow section OPEN, Green section CLOSED on load
6. **Toggle works**: Click header to expand/collapse
7. **Counts update**: Uncheck item → count in header decreases
8. **Search filters both**: Type query → both sections filter

### Entity Types:
9. **All types matched**: Upload layout with groups, models, submodel groups - all appear
10. **Stats accurate**: Verify counts match actual items per type

### Opt-Out Flow:
11. **Uncheck flow**: Uncheck item → appears in relevant phase
12. **All accepted**: Don't uncheck anything → subsequent phases show only non-matched items
13. **Persist unchecked**: Uncheck, navigate away, return → still unchecked

## 🏷️ Labels
- Priority: **HIGH**
- Type: Feature Enhancement / Bug Fix
- Phase: Auto-Match
- Effort: Medium-High (4-5 hours)
- Dependencies: Ticket 11 (type system)
