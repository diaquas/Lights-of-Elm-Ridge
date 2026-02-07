# Ticket 32: Metadata Display Improvements - Effects as Hero Metric

## 🎯 Objective
1. Make effect count THE most prominent element on every card
2. Add running effect totals showing coverage progress
3. Improve overall metadata visibility

## 📋 Key Insight
**Effects = Visual Impact**. A model with 500 effects matters 50x more than one with 10 effects. Users should instantly see which items are high-value.

## 📐 Card Design - Effects as Hero

### Current (Effects Buried)
```
┌─────────────────────────────────────────────────────────────────┐
│ Matrix                                                      ✕   │
│ ⚡ 122   📊 7.2k   Matrix                                       │  ← All same size, muted
└─────────────────────────────────────────────────────────────────┘
```

### Target (Effects as Hero)
```
┌─────────────────────────────────────────────────────────────────┐
│          ┌───────┐                                              │
│          │  122  │  Matrix                                  ✕   │
│          │effects│                                              │
│          └───────┘  📍 7.2k pixels  ·  🔲 Matrix               │
│                                                                 │
│ Suggested: Display Panel (87%)                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Alternative: Large Left Badge
```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────┐                                                     │
│ │   122   │  Matrix                                         ✕   │
│ │ effects │  📍 7.2k pixels  ·  🔲 Matrix                      │
│ │  🟢     │                                                     │
│ └─────────┘  Suggested: Display Panel (87%)                     │
└─────────────────────────────────────────────────────────────────┘
     ↑
  Color-coded by effect count
```

## 📐 Running Effect Totals

### Header Stats Bar
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Individual Models                                                          │
│  25 models need matching · 60 already mapped                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  EFFECTS COVERAGE                                                    │   │
│  │                                                                      │   │
│  │  Mapped: 12,847 effects    Remaining: 3,240 effects    Total: 16,087│   │
│  │  ████████████████████████████████░░░░░░░░░░  80%                    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Compact Version (In Stepper Area)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  < Back        ○─○─●─○─○     101 of 205 mapped                              │
│                              🎬 12,847 / 16,087 effects (80%)               │
│                                                                   [Continue]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Live Counter Animation
When user maps an item with 500 effects:
```
🎬 12,347 → 12,847 effects (+500)
           ↑
        Animates/pulses
```

## 🔧 Implementation

### 1. Effect Count Hero Badge

```tsx
function EffectBadge({ count, size = 'default' }: { count: number; size?: 'small' | 'default' | 'large' }) {
  const color = getEffectColor(count);
  const bgColor = getEffectBgColor(count);
  
  if (size === 'small') {
    return (
      <span className={cn("font-bold text-lg", color)}>
        {count.toLocaleString()}
      </span>
    );
  }
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-lg px-3 py-2 min-w-[70px]",
      bgColor
    )}>
      <span className={cn("text-2xl font-bold leading-none", color)}>
        {count.toLocaleString()}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
        effects
      </span>
    </div>
  );
}

function getEffectColor(count: number): string {
  if (count >= 500) return "text-green-400";
  if (count >= 100) return "text-green-500";
  if (count >= 50) return "text-yellow-400";
  if (count >= 10) return "text-yellow-500";
  if (count >= 1) return "text-gray-400";
  return "text-red-400";
}

function getEffectBgColor(count: number): string {
  if (count >= 100) return "bg-green-500/10 border border-green-500/20";
  if (count >= 50) return "bg-yellow-500/10 border border-yellow-500/20";
  if (count >= 10) return "bg-gray-500/10 border border-gray-500/20";
  return "bg-red-500/10 border border-red-500/20";
}
```

### 2. Updated Model Card

```tsx
function ModelCard({ model, isSelected, onSelect, onSkip }: ModelCardProps) {
  return (
    <Card 
      className={cn(
        "relative cursor-pointer transition-all",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={() => onSelect(model.name)}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* EFFECT COUNT - HERO POSITION */}
          <EffectBadge count={model.effectCount} />
          
          {/* Rest of card content */}
          <div className="flex-1 min-w-0">
            {/* Name + Skip Button */}
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-base truncate pr-2">
                {model.name}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSkip(model.name);
                }}
                className="p-1 rounded hover:bg-destructive/20 
                           text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Secondary Metadata */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <CircleDot className="h-3.5 w-3.5" />
                {formatPixels(model.pixelCount)}
              </span>
              <span>·</span>
              <Badge variant="outline" className="text-xs">
                {model.displayType}
              </Badge>
            </div>
            
            {/* Suggestion */}
            {model.suggestion && (
              <div className="text-sm">
                <span className="text-muted-foreground">Suggested: </span>
                <span className="font-medium">{model.suggestion.name}</span>
                <Badge 
                  variant={model.suggestion.confidence >= 70 ? "default" : "secondary"}
                  className="ml-2"
                >
                  {model.suggestion.confidence}%
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Effects Coverage Tracker

```tsx
interface EffectsCoverage {
  mapped: number;
  remaining: number;
  total: number;
  percent: number;
}

function useEffectsCoverage(items: ItemMetadata[]): EffectsCoverage {
  return useMemo(() => {
    const mapped = items
      .filter(i => i.status === 'mapped')
      .reduce((sum, i) => sum + i.effectCount, 0);
    
    const remaining = items
      .filter(i => i.status === 'unmapped')
      .reduce((sum, i) => sum + i.effectCount, 0);
    
    const total = mapped + remaining;
    const percent = total > 0 ? Math.round((mapped / total) * 100) : 0;
    
    return { mapped, remaining, total, percent };
  }, [items]);
}
```

### 4. Effects Coverage Bar Component

```tsx
function EffectsCoverageBar({ coverage }: { coverage: EffectsCoverage }) {
  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Clapperboard className="h-4 w-4" />
          Effects Coverage
        </h3>
        <span className="text-2xl font-bold text-primary">
          {coverage.percent}%
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
        <motion.div 
          className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${coverage.percent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      {/* Stats */}
      <div className="flex justify-between text-sm">
        <span className="text-green-400">
          ✓ {coverage.mapped.toLocaleString()} mapped
        </span>
        <span className="text-muted-foreground">
          {coverage.remaining.toLocaleString()} remaining
        </span>
        <span className="text-muted-foreground">
          {coverage.total.toLocaleString()} total
        </span>
      </div>
    </div>
  );
}
```

### 5. Compact Header Counter

```tsx
function EffectsCounter({ coverage }: { coverage: EffectsCoverage }) {
  const [prevMapped, setPrevMapped] = useState(coverage.mapped);
  const [justAdded, setJustAdded] = useState<number | null>(null);
  
  // Animate when mapped count increases
  useEffect(() => {
    if (coverage.mapped > prevMapped) {
      const diff = coverage.mapped - prevMapped;
      setJustAdded(diff);
      setTimeout(() => setJustAdded(null), 2000);
    }
    setPrevMapped(coverage.mapped);
  }, [coverage.mapped, prevMapped]);
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <Clapperboard className="h-4 w-4 text-muted-foreground" />
      <motion.span 
        className="font-medium"
        animate={justAdded ? { scale: [1, 1.1, 1] } : {}}
      >
        {coverage.mapped.toLocaleString()}
      </motion.span>
      <span className="text-muted-foreground">/</span>
      <span className="text-muted-foreground">
        {coverage.total.toLocaleString()} effects
      </span>
      <span className="text-muted-foreground">
        ({coverage.percent}%)
      </span>
      
      {/* Animated +X indicator */}
      <AnimatePresence>
        {justAdded && (
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-green-400 font-medium"
          >
            +{justAdded.toLocaleString()}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 6. Integration in Phase Header

```tsx
function PhaseHeader({ 
  title, 
  subtitle, 
  items,
  effectsCoverage 
}: PhaseHeaderProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        
        {/* Compact effects counter for header */}
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">
            {effectsCoverage.percent}%
          </div>
          <div className="text-sm text-muted-foreground">
            effects covered
          </div>
        </div>
      </div>
      
      {/* Full coverage bar */}
      <EffectsCoverageBar coverage={effectsCoverage} />
    </div>
  );
}
```

## 📐 Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Individual Models                                           87%            │
│  25 need matching · 60 mapped                          effects covered      │
│                                                                             │
│  ┌─ EFFECTS COVERAGE ──────────────────────────────────────────────────┐   │
│  │  ████████████████████████████████████░░░░░░  12,847 / 14,772       │   │
│  │  ✓ 12,847 mapped          1,925 remaining                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ ┌───────┐                                                          │    │
│  │ │  847  │  Matrix                                              ✕   │    │
│  │ │effects│  📍 7.2k pixels  ·  Matrix                              │    │
│  │ │  🟢   │                                                          │    │
│  │ └───────┘  Suggested: Display Panel (87%)                          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ ┌───────┐                                                          │    │
│  │ │  122  │  Spinner - Fuzion                                    ✕   │    │
│  │ │effects│  📍 996 pixels  ·  Spinner                              │    │
│  │ │  🟢   │                                                          │    │
│  │ └───────┘  Suggested: Wreath R (32%)                               │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ ┌───────┐                                                          │    │
│  │ │   3   │  Pixel Forest                                        ✕   │    │
│  │ │effects│  📍 5 pixels  ·  Cube                                   │    │
│  │ │  🔴   │                                                          │    │
│  │ └───────┘  Suggested: Pixel Stake 52 (40%)                         │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## ✅ Acceptance Criteria

### Effect Count Display:
- [ ] Effect count is largest/most prominent element on card
- [ ] Color-coded badge (green/yellow/gray/red)
- [ ] Shows "effects" label under number
- [ ] Visible at a glance without reading

### Effects Coverage Tracker:
- [ ] Shows total effects in all items
- [ ] Shows effects in mapped items
- [ ] Shows effects in remaining items
- [ ] Progress bar with percentage
- [ ] Updates in real-time when item mapped

### Animation:
- [ ] Counter animates when effects added
- [ ] "+500" indicator appears briefly
- [ ] Progress bar animates smoothly

### Placement:
- [ ] Coverage bar in phase header
- [ ] Compact counter in stepper/navigation area
- [ ] Effect badge on every model card

## 🧪 Test Cases

1. **Hero badge visible**: Effect count is first thing eye sees on card
2. **Color coding**: 500 effects = green, 10 effects = yellow, 0 = red
3. **Coverage updates**: Map 500-effect item → counter goes from 12,347 to 12,847
4. **Animation**: "+500" appears and fades after mapping
5. **Percentage accurate**: 12,847 / 14,772 = 87%
6. **Zero effects**: Shows red badge, low priority visual

## 🏷️ Labels
- Priority: **HIGH**
- Type: UI Enhancement
- Phase: All mapping phases
- Effort: Medium (3-4 hours)
