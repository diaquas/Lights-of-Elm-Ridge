# Ticket 42: Auto-Match Review Screen - Dual Coverage Metrics

## 🎯 Objective
Show BOTH coverage metrics on the Auto-Match review screen so users understand:
1. How much of the SEQUENCE's effects will show on their display
2. How much of THEIR DISPLAY will light up

## 📋 Why Both Metrics Matter Here

This screen is where users decide: "Should I accept these 121 auto-matches?"

**They need to know:**
- "How much of this sequence am I capturing?" (effects coverage)
- "How much of my display will be active?" (display coverage)

These can be very different numbers!

### Example Scenario
- Sequence has 300 models, user has 50 models
- 45 of user's 50 models get mapped = **90% display coverage** ✓
- But those 45 only capture 40% of sequence effects = **40% effects coverage**

User might think: "Great, 90% of my display!" but miss that they're only getting 40% of the show.

## 📐 Current vs Proposed

### Current (Single Metric - Confusing)
```
Display Coverage                                    48%
┌────────────────────────────────────────────────────────┐
│████████████│█████████████│░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│   57       │     64      │            52%             │
└────────────────────────────────────────────────────────┘
57 green (23%)    64 yellow (25%)           uncovered
```

Problems:
- What does "Display Coverage 48%" mean exactly?
- Is this MY display or the sequence?
- What's the 52% uncovered - items or effects?

### Proposed (Dual Metrics - Clear)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ✓ 121 Items Auto-Matched                                                   │
│    12 Groups · 20 Models · 89 HD Groups                                     │
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  YOUR DISPLAY                   │  │  SEQUENCE EFFECTS               │  │
│  │                                 │  │                                 │  │
│  │         87%                     │  │         48%                     │  │
│  │  ████████████████████░░░        │  │  ████████████░░░░░░░░░░░░░░░░  │  │
│  │                                 │  │                                 │  │
│  │  44 of 51 models will          │  │  7,840 of 16,420 effects       │  │
│  │  receive effects                │  │  captured so far               │  │
│  │                                 │  │                                 │  │
│  │  ✓ Most of your display        │  │  ⚠️ More effects available     │  │
│  │    is already covered!          │  │    in later phases             │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  ───────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  MATCH QUALITY                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │██████████████████████│████████████████████████████│░░░░░░░░░░░░░░░░│   │
│  │   57 high (47%)      │      64 needs review (53%) │    unmapped    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  🟢 57 high confidence (90%+)                                              │
│  🟡 64 needs review (70-89%)                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📐 Detailed Design

### Two-Card Layout

```
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  🏠 YOUR DISPLAY             │  │  🎬 SEQUENCE EFFECTS         │
│                              │  │                              │
│        87%                   │  │        48%                   │
│  ████████████████░░░         │  │  ██████████░░░░░░░░░░░░░    │
│                              │  │                              │
│  44 of 51 models mapped      │  │  7,840 of 16,420 effects    │
│                              │  │                              │
│  ✓ Great! Most of your      │  │  Groups & Models phases      │
│    display is covered        │  │  will add more coverage      │
└──────────────────────────────┘  └──────────────────────────────┘
```

### Contextual Messaging

| Display % | Effects % | Message |
|-----------|-----------|---------|
| High (80%+) | High (70%+) | "🎉 Excellent coverage on both!" |
| High (80%+) | Low (<50%) | "Your display is covered, but there's more effects available" |
| Low (<60%) | High (70%+) | "Capturing lots of effects, more display coverage in next phases" |
| Low (<60%) | Low (<50%) | "This is just auto-match - more coverage coming in Groups & Models" |

### Progress Projection

Show what's expected after each phase:

```
Coverage Projection
                    Now     +Groups    +Models    +Submodels
Your Display:       87%  →    92%   →    97%   →    98%
Sequence Effects:   48%  →    62%   →    78%   →    85%
```

## 🔧 Implementation

### 1. Dual Metrics Calculation

```typescript
interface AutoMatchMetrics {
  // User's display coverage
  display: {
    totalModels: number;
    mappedModels: number;
    percent: number;
  };
  
  // Sequence effects coverage
  effects: {
    totalEffects: number;
    capturedEffects: number;
    percent: number;
  };
  
  // Match quality breakdown
  quality: {
    highConfidence: number;   // 90%+
    needsReview: number;      // 70-89%
    total: number;
  };
}

function calculateAutoMatchMetrics(
  userLayout: UserLayout,
  sequenceLayout: SequenceLayout,
  autoMatches: AutoMatch[],
  effectCounts: Map<string, number>
): AutoMatchMetrics {
  // User's display coverage
  const mappedUserModels = new Set<string>();
  autoMatches.forEach(match => {
    // A match might map to multiple user models (via groups)
    mappedUserModels.add(match.userItem);
  });
  
  const displayPercent = Math.round(
    (mappedUserModels.size / userLayout.models.length) * 100
  );
  
  // Sequence effects coverage
  let capturedEffects = 0;
  let totalEffects = 0;
  
  for (const seqItem of sequenceLayout.items) {
    const effects = effectCounts.get(seqItem.name) || 0;
    totalEffects += effects;
    
    if (autoMatches.some(m => m.sequenceItem === seqItem.name)) {
      capturedEffects += effects;
    }
  }
  
  const effectsPercent = Math.round((capturedEffects / totalEffects) * 100);
  
  // Quality breakdown
  const highConfidence = autoMatches.filter(m => m.confidence >= 0.90).length;
  const needsReview = autoMatches.filter(m => m.confidence >= 0.70 && m.confidence < 0.90).length;
  
  return {
    display: {
      totalModels: userLayout.models.length,
      mappedModels: mappedUserModels.size,
      percent: displayPercent,
    },
    effects: {
      totalEffects,
      capturedEffects,
      percent: effectsPercent,
    },
    quality: {
      highConfidence,
      needsReview,
      total: autoMatches.length,
    },
  };
}
```

### 2. Dual Coverage Cards Component

```tsx
function DualCoverageCards({ metrics }: { metrics: AutoMatchMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Your Display Card */}
      <Card className={cn(
        "p-6 text-center",
        metrics.display.percent >= 80 && "border-green-500/50 bg-green-500/5"
      )}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Home className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            YOUR DISPLAY
          </h3>
        </div>
        
        <div className={cn(
          "text-4xl font-bold mb-3",
          metrics.display.percent >= 80 ? "text-green-400" : "text-yellow-400"
        )}>
          {metrics.display.percent}%
        </div>
        
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
          <div 
            className={cn(
              "h-full rounded-full",
              metrics.display.percent >= 80 ? "bg-green-500" : "bg-yellow-500"
            )}
            style={{ width: `${metrics.display.percent}%` }}
          />
        </div>
        
        <p className="text-sm text-muted-foreground mb-2">
          <span className="font-medium text-foreground">
            {metrics.display.mappedModels}
          </span>
          {' of '}
          <span className="font-medium text-foreground">
            {metrics.display.totalModels}
          </span>
          {' models mapped'}
        </p>
        
        {metrics.display.percent >= 80 ? (
          <p className="text-xs text-green-400">
            ✓ Most of your display is covered!
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            More coverage in next phases
          </p>
        )}
      </Card>
      
      {/* Sequence Effects Card */}
      <Card className={cn(
        "p-6 text-center",
        metrics.effects.percent >= 70 && "border-blue-500/50 bg-blue-500/5"
      )}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clapperboard className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            SEQUENCE EFFECTS
          </h3>
        </div>
        
        <div className={cn(
          "text-4xl font-bold mb-3",
          metrics.effects.percent >= 70 ? "text-blue-400" : "text-yellow-400"
        )}>
          {metrics.effects.percent}%
        </div>
        
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
          <div 
            className={cn(
              "h-full rounded-full",
              metrics.effects.percent >= 70 ? "bg-blue-500" : "bg-yellow-500"
            )}
            style={{ width: `${metrics.effects.percent}%` }}
          />
        </div>
        
        <p className="text-sm text-muted-foreground mb-2">
          <span className="font-medium text-foreground">
            {metrics.effects.capturedEffects.toLocaleString()}
          </span>
          {' of '}
          <span className="font-medium text-foreground">
            {metrics.effects.totalEffects.toLocaleString()}
          </span>
          {' effects'}
        </p>
        
        {metrics.effects.percent >= 70 ? (
          <p className="text-xs text-blue-400">
            ✓ Capturing most effects!
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            More available in Groups & Models
          </p>
        )}
      </Card>
    </div>
  );
}
```

### 3. Match Quality Bar

```tsx
function MatchQualityBar({ quality }: { quality: AutoMatchMetrics['quality'] }) {
  const highPercent = Math.round((quality.highConfidence / quality.total) * 100);
  const reviewPercent = Math.round((quality.needsReview / quality.total) * 100);
  
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        MATCH QUALITY
      </h3>
      
      <div className="h-4 bg-muted rounded-full overflow-hidden flex">
        <div 
          className="bg-green-500 h-full"
          style={{ width: `${highPercent}%` }}
        />
        <div 
          className="bg-yellow-500 h-full"
          style={{ width: `${reviewPercent}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {quality.highConfidence} high confidence (90%+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          {quality.needsReview} needs review (70-89%)
        </span>
      </div>
    </div>
  );
}
```

### 4. Full Auto-Match Review Screen

```tsx
function AutoMatchReviewScreen({ 
  autoMatches,
  metrics,
  onAcceptAll,
  onContinue
}: AutoMatchReviewProps) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold">
          {autoMatches.length} Items Auto-Matched
        </h1>
        <p className="text-muted-foreground">
          {metrics.quality.highConfidence} Groups · {metrics.models} Models · {metrics.hdGroups} HD Groups
        </p>
      </div>
      
      {/* DUAL COVERAGE CARDS */}
      <DualCoverageCards metrics={metrics} />
      
      {/* Match Quality */}
      <MatchQualityBar quality={metrics.quality} />
      
      {/* Review List */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Uncheck any items you'd prefer to map manually:
        </p>
        
        <Input 
          placeholder="Search matches..." 
          className="max-w-md"
        />
        
        {/* Needs Review Section */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 text-yellow-400">
            <ChevronDown className="h-4 w-4" />
            ⚠️ Needs Review ({metrics.quality.needsReview} matches)
            <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
              70-89%
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {/* Match rows */}
          </CollapsibleContent>
        </Collapsible>
        
        {/* High Confidence Section */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-green-400">
            <ChevronRight className="h-4 w-4" />
            ✓ High Confidence ({metrics.quality.highConfidence} matches)
            <Badge variant="outline" className="text-green-400 border-green-400/50">
              90%+
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {/* Match rows */}
          </CollapsibleContent>
        </Collapsible>
      </div>
      
      {/* Actions */}
      <div className="flex justify-end">
        <Button size="lg" onClick={onContinue}>
          Continue to Groups →
        </Button>
      </div>
    </div>
  );
}
```

## 📐 Full Screen Mockup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  < Back                    62 of 253 mapped              [Continue to Groups]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    ✓ 121 Items Auto-Matched                                 │
│                  12 Groups · 20 Models · 89 HD Groups                       │
│                                                                             │
│  ┌────────────────────────────────┐ ┌────────────────────────────────┐     │
│  │      🏠 YOUR DISPLAY           │ │      🎬 SEQUENCE EFFECTS       │     │
│  │                                │ │                                │     │
│  │           87%                  │ │           48%                  │     │
│  │   ████████████████████░░░      │ │   ██████████░░░░░░░░░░░░░     │     │
│  │                                │ │                                │     │
│  │   44 of 51 models mapped       │ │   7,840 of 16,420 effects     │     │
│  │                                │ │                                │     │
│  │   ✓ Most of your display      │ │   More in Groups & Models      │     │
│  │     is covered!                │ │   phases                       │     │
│  └────────────────────────────────┘ └────────────────────────────────┘     │
│                                                                             │
│  MATCH QUALITY                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │██████████████████████████████│██████████████████████████████████████│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  🟢 57 high confidence (90%+)        🟡 64 needs review (70-89%)           │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Uncheck any items you'd prefer to map manually:                           │
│                                                                             │
│  🔍 Search matches...                                                       │
│                                                                             │
│  ▼ ⚠️ Needs Review (64 matches)                              70-89%        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ☑ GE Rosa Tomb Cross Spinner GRP  →  GE Rosa Grand Arch...  70%    │   │
│  │ ☑ GE Rosa Tomb Tombstone Lower G  →  GE Rosa Grand Arch...  70%    │   │
│  │ ☑ All - Poles - GRP               →  Pixel Poles Small GRP   71%    │   │
│  │ ☑ GE Rosa Tomb Gourds GRP         →  GE Rosa Grand Arch...  72%    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ▶ ✓ High Confidence (57 matches)                            90%+          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## ✅ Acceptance Criteria

### Dual Metrics Display:
- [ ] "Your Display" card shows % of user's models mapped
- [ ] "Sequence Effects" card shows % of effects captured
- [ ] Both cards have progress bars
- [ ] Both show actual numbers (X of Y)
- [ ] Contextual helper text under each

### Color Coding:
- [ ] Display ≥80% = green
- [ ] Display <80% = yellow
- [ ] Effects ≥70% = blue
- [ ] Effects <70% = yellow

### Match Quality:
- [ ] Horizontal bar showing high vs needs-review
- [ ] Legend with counts for each tier
- [ ] Needs Review section expanded by default
- [ ] High Confidence section collapsed by default

### Header Updates:
- [ ] Remove "62 of 253 mapped" (confusing)
- [ ] Or replace with "87% display covered"

## 🧪 Test Cases

1. **High display, low effects**: 87% display, 48% effects → both cards show correctly
2. **Low display, high effects**: 45% display, 72% effects → appropriate messaging
3. **Both high**: 92% display, 85% effects → celebration messaging
4. **Effect counts**: Shows "7,840 of 16,420 effects" accurately
5. **Model counts**: Shows "44 of 51 models" accurately

## 🏷️ Labels
- Priority: **HIGH**
- Type: UX Improvement
- Phase: Auto-Match Review
- Effort: Medium (3-4 hours)
- Related: Ticket 39, 40
