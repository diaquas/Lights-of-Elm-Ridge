# Ticket 50: Auto-Match Review Layout - Maximize Viewport Usage

## 🎯 Objective
Expand the Auto-Match review list to use more vertical space, reducing excessive scrolling when reviewing 100+ matches.

## 📋 The Problem

### Current Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Header / Navigation                                                   60px │
├─────────────────────────────────────────────────────────────────────────────┤
│  Phase Navigation (Upload → Auto-Matches → Groups → ...)               50px │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │  Coverage Cards (Your Display / Sequence Effects)            ~120px│     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │  Match Quality Bar                                            ~40px│     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │  Optimized Assignments Banner                                 ~40px│     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  "Uncheck any items..."                                              ~30px │
│  Search box                                                          ~50px │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                                                                    │     │
│  │  MATCH LIST (only ~300px visible!)                                │     │
│  │  ════════════════════════════════════════════════                 │     │
│  │  GE Fuzion Balls GRP → PPD Wreath...          75%                 │     │
│  │  GE Fuzion Feather Even GRP → IC Tarantula... 75%                 │     │
│  │  GE Fuzion Feather Odd GRP → IC Tarantula...  75%                 │     │
│  │  GE Fuzion Flower GRP → PPD Wreath...         75%                 │     │
│  │  ... (scroll to see 120+ more items)                              │     │
│  │                                                                    │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Problem: ~390px of header content, only ~300px for the actual list!
On 1080p screen: 1080 - 390 = 690px... but list only gets ~300px (less than half!)
```

### Issues
1. **Coverage cards take too much space** - 120px for info that's now in the header
2. **Too much vertical padding/margins** between sections
3. **Match list height not maximized** - doesn't fill available space
4. **128 items with 300px viewport** = ~40px per item = only ~7 visible at a time
5. **Lots of scrolling** to review all matches

## 📐 Proposed Solution

### Option A: Collapse Summary, Maximize List

Since coverage metrics now live in the header (Ticket 48), we can collapse the inline cards:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Header + Phase Nav + Coverage Tracker (persistent)                   ~80px │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✓ 128 Items Auto-Matched                                                  │
│  7 Groups · 52 Models · 59 HD Groups                               ~50px   │
│                                                                             │
│  ┌─ Summary (collapsed by default, click to expand) ──────────────────┐    │
│  │ ▶ Match Quality: 58 high · 70 review │ 55 optimized │ +932 pts    │~35px│
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  🔍 Search matches...                                                ~40px │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  MATCH LIST (now ~550px+ on 1080p!)                                │    │
│  │  ════════════════════════════════════════════════                  │    │
│  │  ▼ ⚠️ Needs Review (70 matches)                        70-89%     │    │
│  │  ┌──────────────────────────────────────────────────────────────┐ │    │
│  │  │ ☑ GE Fuzion Balls GRP      → PPD Wreath Center...    75%    │ │    │
│  │  │ ☑ GE Fuzion Feather Even   → IC Tarantula Legs       75%    │ │    │
│  │  │ ☑ GE Fuzion Feather Odd    → IC Tarantula Legs       75%    │ │    │
│  │  │ ☑ GE Fuzion Flower GRP     → PPD Wreath Outer...     75%    │ │    │
│  │  │ ☑ GE Fuzion Triangle Lg    → ELD Starburst Spin...   75%    │ │    │
│  │  │ ☑ GE Fuzion Windmill Lg    → PPD Wreath Star...      74%    │ │    │
│  │  │ ☑ GE Fuzion Ring GRP       → IC Tarantula Body       74%    │ │    │
│  │  │ ☑ GE Fuzion Spoke GRP      → ELD Spinner Spokes      73%    │ │    │
│  │  │ ☑ GE Fuzion Star 1 GRP     → PPD Wreath Inner...     72%    │ │    │
│  │  │ ☑ GE Fuzion Star 2 GRP     → PPD Wreath Inner...     72%    │ │    │
│  │  │ ☑ All Arches GRP           → Arches All Group        71%    │ │    │
│  │  │ ☑ All Poles GRP            → Pixel Poles Group       71%    │ │    │
│  │  │ ... can see ~14 items now vs ~7 before!                      │ │    │
│  │  └──────────────────────────────────────────────────────────────┘ │    │
│  │                                                                     │    │
│  │  ▶ ✓ High Confidence (58 matches)                      90%+       │    │
│  │                                                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  [Continue to Groups →]                                              ~50px │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Gained: ~250px more for the list! (~7 items → ~14 items visible)
```

### Option B: Two-Column Layout (for wide screens)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Header + Phase Nav                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────┐    │
│  │  SUMMARY PANEL               │  │  MATCH LIST                      │    │
│  │                              │  │                                  │    │
│  │  ✓ 128 Items Auto-Matched   │  │  🔍 Search...                    │    │
│  │                              │  │                                  │    │
│  │  ┌────────────────────────┐ │  │  ▼ Needs Review (70)             │    │
│  │  │ Your Display     47%  │ │  │  ┌──────────────────────────────┐│    │
│  │  │ ████████░░░░░░░░░░░░░ │ │  │  │ ☑ GE Fuzion Balls...   75%  ││    │
│  │  │ 53/113 models         │ │  │  │ ☑ GE Fuzion Feather... 75%  ││    │
│  │  └────────────────────────┘ │  │  │ ☑ GE Fuzion Flower... 75%  ││    │
│  │                              │  │  │ ☑ GE Fuzion Triangle. 75%  ││    │
│  │  ┌────────────────────────┐ │  │  │ ☑ GE Fuzion Windmill. 74%  ││    │
│  │  │ Sequence Effects  51% │ │  │  │ ☑ GE Fuzion Ring...   74%  ││    │
│  │  │ █████████░░░░░░░░░░░░ │ │  │  │ ☑ GE Fuzion Spoke...  73%  ││    │
│  │  │ 2,474/4,852 effects   │ │  │  │ ☑ GE Fuzion Star 1... 72%  ││    │
│  │  └────────────────────────┘ │  │  │ ☑ GE Fuzion Star 2... 72%  ││    │
│  │                              │  │  │ ☑ All Arches GRP...  71%  ││    │
│  │  Match Quality               │  │  │ ☑ All Poles GRP...   71%  ││    │
│  │  ██████████████░░░░░░░░░░░  │  │  │ ... (full height!)          ││    │
│  │  58 high · 70 review        │  │  └──────────────────────────────┘│    │
│  │                              │  │                                  │    │
│  │  55 optimized assignments   │  │  ▶ High Confidence (58)          │    │
│  │  Net trade-off: +932 pts    │  │                                  │    │
│  │                              │  │                                  │    │
│  └──────────────────────────────┘  └──────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Option C: Compact Inline Mode (Minimal Chrome)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Header                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ✓128 Auto-Matched │ 47% display │ 51% effects │ 58▲ 70⚠ │ 🔍 Search...   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │                                                                         ││
│  │  ▼ ⚠️ Needs Review (70)                                                ││
│  │  ────────────────────────────────────────────────────────────────────  ││
│  │  ☑ GE Fuzion Balls GRP           → PPD Wreath Center Rings      75%   ││
│  │  ☑ GE Fuzion Feather Even GRP    → IC Tarantula Legs            75%   ││
│  │  ☑ GE Fuzion Feather Odd GRP     → IC Tarantula Legs            75%   ││
│  │  ☑ GE Fuzion Flower GRP          → PPD Wreath Outer Diamonds    75%   ││
│  │  ☑ GE Fuzion Triangle Lg GRP     → ELD Starburst Spinner...     75%   ││
│  │  ☑ GE Fuzion Windmill Lg Even    → PPD Wreath Star Points       74%   ││
│  │  ☑ GE Fuzion Windmill Lg Odd     → PPD Wreath Star Points       74%   ││
│  │  ☑ GE Fuzion Windmill Sm Even    → ELD Spinner Inner Ring       74%   ││
│  │  ☑ GE Fuzion Windmill Sm Odd     → ELD Spinner Outer Ring       74%   ││
│  │  ☑ GE Fuzion Ring GRP            → IC Tarantula Body            74%   ││
│  │  ☑ GE Fuzion Spoke GRP           → ELD Spinner Spokes           73%   ││
│  │  ☑ GE Fuzion Star 1 GRP          → PPD Wreath Inner Diamonds    72%   ││
│  │  ☑ GE Fuzion Star 2 GRP          → PPD Wreath Inner Diamonds    72%   ││
│  │  ☑ GE Fuzion M GRP               → IC Tarantula Hourglass       72%   ││
│  │  ☑ All Arches GRP                → Arches All Group             71%   ││
│  │  ☑ All Poles GRP                 → Pixel Poles Group All        71%   ││
│  │  ☑ All Mini Trees GRP            → Mini Trees Group             71%   ││
│  │  ☑ All Tombstones GRP            → Tombstone All Group          70%   ││
│  │  ... (~18+ items visible!)                                             ││
│  │                                                                         ││
│  └────────────────────────────────────────────────────────────────────────┘│
│  [Continue to Groups →]                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation

### 1. CSS Changes

```css
/* Remove excessive padding */
.auto-match-review {
  padding: 1rem;  /* was 2rem */
}

/* Make list container a fixed large height */
.match-list-container {
  display: flex;
  flex-direction: column;
}

.match-list {
  height: 900px;           /* Fixed 3x height! */
  min-height: 600px;       /* Minimum for smaller screens */
  overflow-y: auto;
}

/* Allow page to scroll - this is fine */
.auto-match-page {
  min-height: auto;        /* Don't force viewport fit */
  overflow: visible;       /* Allow page scroll */
}

/* Compact summary section */
.summary-section {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--muted);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

/* Tighter row spacing - 36px rows */
.match-row {
  padding: 0.375rem 0.75rem;  /* Reduced from 0.75rem 1rem */
  min-height: 36px;           /* Down from 48px */
  display: flex;
  align-items: center;
}
```

### 2. Collapsible Summary Component

```tsx
function CollapsibleSummary({ 
  matchCount,
  highCount,
  reviewCount,
  optimizedCount,
  tradeOffPoints 
}: SummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">
              {isExpanded ? '▼' : '▶'} Match Quality
            </span>
            <Badge variant="outline" className="text-green-400">
              {highCount} high
            </Badge>
            <Badge variant="outline" className="text-yellow-400">
              {reviewCount} review
            </Badge>
            {optimizedCount > 0 && (
              <span className="text-muted-foreground">
                │ {optimizedCount} optimized (+{tradeOffPoints} pts)
              </span>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isExpanded && "rotate-180"
          )} />
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="grid grid-cols-2 gap-4 p-4 border-t">
          {/* Detailed coverage cards - only shown when expanded */}
          <CoverageCard type="display" ... />
          <CoverageCard type="effects" ... />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

### 3. Dynamic Height Calculation

```tsx
function AutoMatchReview({ matches }: AutoMatchReviewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);
  
  useEffect(() => {
    function calculateHeight() {
      if (!listRef.current) return;
      
      const windowHeight = window.innerHeight;
      const listTop = listRef.current.getBoundingClientRect().top;
      const bottomPadding = 80; // Space for button + padding
      
      const availableHeight = windowHeight - listTop - bottomPadding;
      setListHeight(Math.max(300, availableHeight));
    }
    
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);
  
  return (
    <div className="flex flex-col h-full">
      {/* Compact Header */}
      <div className="flex-shrink-0">
        <h1>✓ {matches.length} Items Auto-Matched</h1>
        <CollapsibleSummary ... />
        <SearchInput ... />
      </div>
      
      {/* Match List - Fills Remaining Space */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto"
        style={{ height: listHeight }}
      >
        <MatchList matches={matches} />
      </div>
      
      {/* Footer */}
      <div className="flex-shrink-0 p-4">
        <Button>Continue to Groups →</Button>
      </div>
    </div>
  );
}
```

### 4. Compact Match Row

```tsx
function CompactMatchRow({ match, onToggle }: MatchRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded">
      <Checkbox 
        checked={match.isSelected}
        onCheckedChange={onToggle}
        className="flex-shrink-0"
      />
      
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="truncate text-sm font-medium">
          {match.sourceModel}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="truncate text-sm text-muted-foreground">
          {match.destModel}
        </span>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant="outline" className="text-xs">
          {match.type}
        </Badge>
        <Badge 
          variant={match.score >= 0.9 ? 'success' : 'warning'}
          className="text-xs w-12 justify-center"
        >
          {Math.round(match.score * 100)}%
        </Badge>
      </div>
    </div>
  );
}
```

## 📊 Space Comparison

### Before (Current)
| Element | Height |
|---------|--------|
| Header + Nav | 110px |
| Coverage Cards | 120px |
| Quality Bar | 40px |
| Optimized Banner | 40px |
| Text + Search | 80px |
| **Available for List** | **~300px** |
| Items visible (40px each) | **~7 items** |

### After (3x Taller - Recommended)
| Element | Height |
|---------|--------|
| Header + Nav (with tracker) | 80px |
| Title + Subtitle | 50px |
| Collapsed Summary | 40px |
| Search | 40px |
| **Match List** | **~900px (fixed)** |
| Items visible (36px each) | **~25 items** |
| Continue Button | 50px |

**Result: 3x+ more items visible!**

### Key Insight
The page can scroll slightly - this is fine! Users expect to scroll, and having 25 items visible at once (vs 7) dramatically speeds up review. The persistent header tracker (Ticket 48) means they never lose sight of progress.

```
┌─────────────────────────────────────────────────────────────────┐
│ VIEWPORT (1080px)                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Header + Tracker                                      80px  │ │
│ │ Title + Summary + Search                             130px  │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │                                                         │ │ │
│ │ │  MATCH LIST                                             │ │ │
│ │ │  ~25 items visible                                      │ │ │
│ │ │  (scroll within list for more)                          │ │ │
│ │ │                                                         │ │ │
│ │ │                                                   900px │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │ [Continue to Groups →]                                50px  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│ (page scrolls slightly if needed - totally fine)          ~80px │
└─────────────────────────────────────────────────────────────────┘
```

## ✅ Acceptance Criteria

### Layout:
- [ ] Match list is ~900px tall (3x current ~300px)
- [ ] Page can scroll slightly - this is acceptable
- [ ] Summary section is collapsible (collapsed by default)
- [ ] Coverage metrics in header (per Ticket 48) replace inline cards
- [ ] Reduced padding/margins throughout

### Responsiveness:
- [ ] List height is fixed at ~900px (not viewport-dependent)
- [ ] Works on 1080p, 1440p, and 4K screens
- [ ] On smaller screens, list can be slightly shorter but minimum 600px

### Compact Rows:
- [ ] Each match row is 36px (down from 48px+)
- [ ] Text truncates gracefully
- [ ] Touch targets still 44px minimum height
- [ ] ~25 items visible at once

### Performance:
- [ ] Virtualized list for 200+ items
- [ ] Smooth scrolling within list
- [ ] No layout shift on expand/collapse

## 🧪 Test Cases

1. **1080p screen**: List shows ~25 items, page scrolls slightly
2. **1440p screen**: List shows ~25 items, minimal/no page scroll
3. **128 matches**: Can review all with much less scrolling
4. **Summary expand**: Clicking expands to show full details
5. **Long model names**: Truncate with ellipsis, tooltip on hover
6. **Page scroll**: Scrolling page doesn't affect list scroll position

## 🏷️ Labels
- Priority: **HIGH** (Usability issue)
- Type: UX Improvement
- Effort: Medium (3-4 hours)
- Impact: **High** - Much faster review workflow
- Related: Ticket 48 (Persistent Progress Tracker)
