# Ticket 39: Progress Tracking Redesign - Effects Coverage as Primary Metric

## 🎯 Objective
Replace the confusing "X/Y mapped" counter with a motivating, user-centric progress metric that shows how much of their DISPLAY is covered by effects.

## 📋 Current Problems

### Problem 1: Wrong Metric
**Current**: "86/244 mapped" (35%)
**What it means**: 86 of 244 sequence items have been mapped
**Why it's wrong**: 
- User doesn't care about sequence items
- User cares about: "How much of MY display will light up?"
- A sequence with 244 items might only USE 50 that the user has

### Problem 2: Feels Like No Progress
- Complete Auto-Match phase → still shows low %
- Complete Groups → number barely moves
- User feels discouraged, like they're not making progress

### Problem 3: Ambiguous Direction
- Is 86/244 good or bad?
- What does "remaining" mean?
- Why is the bar so short after doing so much work?

## 💡 New Approach: Effects Coverage

### The Key Insight
**What users actually care about**: "What % of the visual effects in this sequence will show up on MY display?"

### New Primary Metric: Display Coverage
```
Instead of:  "86/244 mapped" (sequence-centric)
Show:        "78% of effects covered" (user-centric)
```

### Why Effects Coverage?
1. **User-centric**: "78% of what I'LL SEE is mapped"
2. **Weighted by importance**: 1000-effect model matters more than 10-effect model
3. **Always grows**: Every match adds to coverage
4. **Motivating**: Starts high after auto-match (the easy wins)

## 📐 New Progress Display Design

### Header Bar (Compact)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Mod:IQ    Lights of Elm Ridge (Halloween) → Your Layout                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ████████████████████████████████████░░░░░░░░░░░░  78%              │   │
│  │  Display Coverage: 12,847 of 16,420 effects                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ✓ Upload ─ ✓ Auto-Matches ─ ✓ Groups ─ ● Models ─ ○ Submodel ─ ○ Review   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase Completion Celebration
After completing each phase, show what was accomplished:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ✓ Auto-Match Complete!                                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │       Coverage: 45% → 72%                                           │   │
│  │       ████████████████████████████░░░░░░░░░░░░                      │   │
│  │                                                                      │   │
│  │       +4,420 effects covered                                        │   │
│  │       39 items auto-matched                                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                         [Continue to Groups →]                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### During Mapping (Real-time Updates)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Display Coverage                                                           │
│                                                                             │
│  ████████████████████████████████████░░░░░░░░░░░░  78%  (+2% this phase)  │
│                                                                             │
│  12,847 / 16,420 effects    │    Remaining: 3,573 effects                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Micro-Celebration on Each Match
When user maps a high-effect item:
```
┌──────────────────────────────┐
│  +847 effects! 📈            │
│  Coverage: 76% → 78%         │
└──────────────────────────────┘
       ↑ Toast/animation
```

## 🔧 Implementation

### 1. Calculate Effects Coverage

```typescript
interface EffectsCoverage {
  // Effects from mapped items (what will show on their display)
  coveredEffects: number;
  
  // Total effects in sequence (that COULD be mapped)
  totalEffects: number;
  
  // Percentage
  coveragePercent: number;
  
  // For showing progress within phase
  phaseStartCoverage: number;
  phaseGainedEffects: number;
}

function calculateEffectsCoverage(
  sequenceItems: SequenceItem[],
  mappings: Map<string, string>,
  skipState: SkipState
): EffectsCoverage {
  // Only count sequence items that have effects
  const itemsWithEffects = sequenceItems.filter(item => 
    item.effectCount > 0 && 
    !skipState.destinationSkipped.has(item.name)
  );
  
  // Total effects available
  const totalEffects = itemsWithEffects.reduce(
    (sum, item) => sum + item.effectCount, 0
  );
  
  // Effects from mapped items
  const coveredEffects = itemsWithEffects
    .filter(item => {
      // Check if this sequence item is mapped to something
      for (const [source, dest] of mappings) {
        if (dest === item.name) return true;
      }
      return false;
    })
    .reduce((sum, item) => sum + item.effectCount, 0);
  
  return {
    coveredEffects,
    totalEffects,
    coveragePercent: totalEffects > 0 
      ? Math.round((coveredEffects / totalEffects) * 100) 
      : 100,
    phaseStartCoverage: 0, // Set at phase start
    phaseGainedEffects: 0, // Calculate as delta
  };
}
```

### 2. Progress Bar Component

```tsx
function CoverageProgressBar({ coverage }: { coverage: EffectsCoverage }) {
  const phaseGain = coverage.coveragePercent - coverage.phaseStartCoverage;
  
  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Display Coverage</h3>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-primary">
            {coverage.coveragePercent}%
          </span>
          {phaseGain > 0 && (
            <Badge variant="outline" className="text-green-400 border-green-400/50">
              +{phaseGain}% this phase
            </Badge>
          )}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-4 bg-muted rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${coverage.coveragePercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      {/* Stats */}
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          {coverage.coveredEffects.toLocaleString()} effects covered
        </span>
        <span>
          {(coverage.totalEffects - coverage.coveredEffects).toLocaleString()} remaining
        </span>
      </div>
    </div>
  );
}
```

### 3. Phase Completion Summary

```tsx
function PhaseCompletionSummary({ 
  phaseName,
  beforeCoverage,
  afterCoverage,
  itemsMapped,
  onContinue
}: PhaseCompletionProps) {
  const coverageGain = afterCoverage.coveragePercent - beforeCoverage.coveragePercent;
  const effectsGain = afterCoverage.coveredEffects - beforeCoverage.coveredEffects;
  
  return (
    <Card className="max-w-md mx-auto text-center">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <CardTitle>✓ {phaseName} Complete!</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Coverage Change */}
        <div>
          <div className="text-4xl font-bold mb-2">
            <span className="text-muted-foreground">{beforeCoverage.coveragePercent}%</span>
            <span className="mx-2">→</span>
            <span className="text-primary">{afterCoverage.coveragePercent}%</span>
          </div>
          
          {/* Animated Progress Bar */}
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-600 to-green-400"
              initial={{ width: `${beforeCoverage.coveragePercent}%` }}
              animate={{ width: `${afterCoverage.coveragePercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              +{effectsGain.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">effects covered</div>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold">{itemsMapped}</div>
            <div className="text-sm text-muted-foreground">items mapped</div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button onClick={onContinue} className="w-full" size="lg">
          Continue →
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### 4. Match Toast with Effect Count

```tsx
function useMatchToast() {
  const { toast } = useToast();
  
  return useCallback((
    sourceName: string,
    destName: string,
    effectCount: number,
    newCoveragePercent: number
  ) => {
    // Only show toast for significant matches
    if (effectCount < 50) return;
    
    toast({
      title: `+${effectCount.toLocaleString()} effects!`,
      description: `${sourceName} → ${destName}`,
      duration: 2000,
      className: "bg-green-500/10 border-green-500/20",
    });
  }, [toast]);
}
```

### 5. Compact Header Counter

```tsx
function HeaderCoverageCounter({ coverage }: { coverage: EffectsCoverage }) {
  return (
    <div className="flex items-center gap-3">
      {/* Mini progress bar */}
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-500 rounded-full transition-all duration-300"
          style={{ width: `${coverage.coveragePercent}%` }}
        />
      </div>
      
      {/* Percentage */}
      <span className="font-bold text-lg">
        {coverage.coveragePercent}%
      </span>
      
      <span className="text-sm text-muted-foreground">
        coverage
      </span>
    </div>
  );
}
```

## 📐 Progress Flow

### User Journey with New Metrics

```
1. UPLOAD COMPLETE
   Coverage: 0%
   "Let's map your display!"

2. AUTO-MATCH COMPLETE  
   Coverage: 0% → 65%
   "+10,680 effects covered!"
   "39 items auto-matched"
   [User feels: "Wow, most of the work is done!"]

3. GROUPS COMPLETE
   Coverage: 65% → 72%
   "+1,148 effects covered!"
   "20 groups mapped"
   [User feels: "Nice, even more covered"]

4. MODELS COMPLETE
   Coverage: 72% → 85%
   "+2,132 effects covered!"
   "62 models mapped"
   [User feels: "Almost there!"]

5. SUBMODEL GROUPS COMPLETE
   Coverage: 85% → 91%
   "+984 effects covered!"
   "24 submodel groups mapped"
   [User feels: "Just the details left"]

6. REVIEW & EXPORT
   Coverage: 91%
   "Your display will show 91% of this sequence's effects!"
   [User feels: "Great coverage, ready to export!"]
```

## 📊 Before vs After

### Before (Confusing)
```
86/244 mapped    [████░░░░░░░░░░░░]  35%
```
- User thinks: "I'm only 35% done? This is taking forever!"
- Reality: They've covered 78% of effects

### After (Motivating)
```
Display Coverage: 78%    [████████████████░░░░]
12,847 / 16,420 effects
```
- User thinks: "78% of my display will light up! Almost there!"
- Reality: Same progress, but framed positively

## ✅ Acceptance Criteria

### Primary Metric:
- [ ] "Display Coverage" replaces "X/Y mapped"
- [ ] Shows % of effects covered
- [ ] Shows actual effect numbers
- [ ] Updates in real-time on each match

### Progress Bar:
- [ ] Prominent, easy to read
- [ ] Animated on changes
- [ ] Shows phase gain ("+5% this phase")

### Phase Completion:
- [ ] Celebration screen after each phase
- [ ] Shows before/after coverage
- [ ] Shows effects gained
- [ ] Shows items mapped count

### Micro-celebrations:
- [ ] Toast for high-effect matches (50+ effects)
- [ ] Shows effect count gained

### Header:
- [ ] Compact coverage indicator always visible
- [ ] Mini progress bar + percentage

## 🧪 Test Cases

1. **After auto-match**: Coverage jumps to 60-70% (not 15-20%)
2. **Progress feels good**: Each phase adds visible %
3. **High-effect item**: Map 500-effect model → toast appears
4. **100% possible**: If everything mapped, shows 100%
5. **Skipped items excluded**: Skipped items don't count toward total

## 🏷️ Labels
- Priority: **HIGH**
- Type: UX Improvement
- Phase: All
- Effort: Medium (3-4 hours)
- Impact: **Major** - completely changes user perception
