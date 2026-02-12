# Ticket 48: Persistent Animated Progress Tracker

## 🎯 Objective
Create a persistent dual-metric progress tracker that:
1. Animates UP from the Auto-Match cards into the header
2. Stays visible throughout ALL mapping phases (Groups, Models, Submodel Groups)
3. Updates in real-time as user makes mappings
4. Expands on hover to show detailed metrics
5. Animates back DOWN to the Review screen at the end

## 📋 The Vision

### Current Problem
- Progress metrics shown on Auto-Match screen, then hidden
- User loses sight of their goal during mapping
- "Effects Coverage" bar in header is too small and unclear
- No continuity between phases

### Solution
Persistent, interactive progress tracker that follows user through entire journey.

## 📐 User Experience Flow

### Phase 1: Auto-Match Review (Starting Point)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Mod:IQ  Lights of Elm Ridge (Halloween) → Your Layout              [Export] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ✓Upload ─ ⚡Auto-Matches ─ Groups ─ Models ─ Submodel Groups ─ Review      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    ✓ 96 Items Auto-Matched                                  │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │      YOUR DISPLAY           │  │      SEQUENCE EFFECTS       │          │
│  │          17%                │  │          41%                │  ←───┐   │
│  │  ████░░░░░░░░░░░░░░░░░░░   │  │  ████████░░░░░░░░░░░░░░░   │      │   │
│  │  36 of 211 models active    │  │  2,009 of 4,852 effects    │      │   │
│  └─────────────────────────────┘  └─────────────────────────────┘      │   │
│                                                                         │   │
│  [Continue to Groups →]                                                 │   │
│                                                                         │   │
└─────────────────────────────────────────────────────────────────────────┘   │
                                                                              │
                                                            These cards will  │
                                                            ANIMATE UP ───────┘
```

### Phase 2: Animation to Header

When user clicks "Continue to Groups":

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Mod:IQ  Lights of Elm Ridge...  ┌──────────────────────────────┐   [Export] │
│                                 │ 🏠 17%  ████░░░  36/211      │            │
│                                 │ 🎬 41%  ████████░  2.0K/4.9K │            │
│                                 └──────────────────────────────┘            │
├─────────────────────────────────────────────────────────────────────────────┤
│ ✓Upload ─ ✓Auto-Matches ─ ⚡Groups ─ Models ─ Submodel Groups ─ Review     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         GROUPS PHASE                                        │
│                                                                             │
```

### Phase 3: Collapsed State (During Mapping)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 ┌──────────────────────────────┐            │
│ Mod:IQ  Lights of Elm Ridge... │ 🏠 24% ████░░░ │ 🎬 58% ████████░│ [Export]│
│                                 └──────────────────────────────┘            │
├─────────────────────────────────────────────────────────────────────────────┤
│ ✓Upload ─ ✓Auto-Matches ─ ✓Groups ─ ⚡Models ─ Submodel Groups ─ Review    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 4: Hover Expansion

When user hovers over the compact tracker:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 ┌──────────────────────────────┐            │
│ Mod:IQ  Lights of Elm Ridge... │ 🏠 24% ████░░░ │ 🎬 58% ████████░│ [Export]│
│                                 └──────────────────────────────┘            │
│                                          │                                  │
│                                          ▼                                  │
│                    ┌─────────────────────────────────────────┐             │
│                    │      YOUR DISPLAY           SEQUENCE    │             │
│                    │          24%                   58%      │             │
│                    │  ████████░░░░░░░░░░░   ████████████████░│             │
│                    │  52 of 211 models      2,814 of 4,852   │             │
│                    │                                         │             │
│                    │  ┌─────────────────────────────────┐   │             │
│                    │  │ Since Auto-Match:               │   │             │
│                    │  │ +16 models │ +805 effects       │   │             │
│                    │  │ +7% display │ +17% effects      │   │             │
│                    │  └─────────────────────────────────┘   │             │
│                    │                                         │             │
│                    │  [View Details]                         │             │
│                    └─────────────────────────────────────────┘             │
├─────────────────────────────────────────────────────────────────────────────┤
```

### Phase 5: Click for Full Details Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MAPPING PROGRESS DETAILS                         [×]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YOUR DISPLAY                              SEQUENCE EFFECTS                 │
│  ┌─────────────────────────┐              ┌─────────────────────────┐      │
│  │        24%              │              │        58%              │      │
│  │  ████████░░░░░░░░░░░░░  │              │  ████████████████░░░░░  │      │
│  │  52 of 211 models       │              │  2,814 of 4,852 effects │      │
│  └─────────────────────────┘              └─────────────────────────┘      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  BREAKDOWN BY PHASE                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ Phase           │ Items │ Display │ Effects │ Gain                 │    │
│  ├────────────────────────────────────────────────────────────────────┤    │
│  │ Auto-Match      │   96  │  +17%   │  +41%   │ ████████████████     │    │
│  │ Groups          │   12  │   +4%   │  +11%   │ █████                │    │
│  │ Models          │    8  │   +3%   │   +6%   │ ███                  │    │
│  │ Submodel Groups │   --  │   --    │   --    │ (in progress)        │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  EFFECT TYPES CAPTURED                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ 💥 Shockwave     847  ████████████████████                        │    │
│  │ 💡 On            623  ███████████████                              │    │
│  │ 🏃 SingleStrand  412  ██████████                                   │    │
│  │ 🌊 Color Wash    298  ███████                                      │    │
│  │ 🌀 Pinwheel      156  ████                                         │    │
│  │ 🎬 Video          42  █  ⭐ Signature                              │    │
│  │ ✨ Morph          38  █  ⭐ Signature                              │    │
│  │ 🎭 Faces          12  ▏  ⭐ Signature                              │    │
│  │ ... 14 more effect types                                           │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ITEMS MAPPED                                                               │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ Groups:           12 of 18   ████████████░░░░░░  67%              │    │
│  │ Models:           32 of 51   ████████████████░░░░░░░  63%         │    │
│  │ Submodel Groups:  57 of 88   ████████████████████░░░░░░  65%      │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  SIGNATURE EFFECTS STATUS                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ ✅ Video (42 effects) - Mapped to Main Matrix                      │    │
│  │ ✅ Morph (38 effects) - Mapped to Main Matrix                      │    │
│  │ ✅ Faces (12 effects) - Mapped to Singing Pumpkin                  │    │
│  │ ⚠️ Shader (8 effects) - UNMAPPED                                   │    │
│  │ ⚠️ Fire (6 effects) - UNMAPPED                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 6: Animation Back to Review

When user reaches Review phase, the tracker animates back down:

```
Animation: Tracker smoothly expands from header position back into 
the full Review screen layout (bookend effect)

┌─────────────────────────────────────────────────────────────────────────────┐
│ Mod:IQ  Lights of Elm Ridge (Halloween) → Your Layout              [Export] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ✓Upload ─ ✓Auto-Matches ─ ✓Groups ─ ✓Models ─ ✓Submodel Groups ─ ⚡Review  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              REVIEW                                         │
│                                                                             │
│                         ┌──────────┐                                        │
│                         │    ↓     │  Animates down from header             │
│                         └──────────┘                                        │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │      YOUR DISPLAY           │  │      SEQUENCE EFFECTS       │          │
│  │          94%                │  │          87%                │          │
│  │  ████████████████████████░  │  │  ██████████████████████░░░  │          │
│  │  198 of 211 models active   │  │  4,221 of 4,852 effects    │          │
│  │                             │  │                             │          │
│  │  ✓ Excellent coverage!      │  │  ✓ Great effect capture!   │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
```

## 🔧 Implementation

### 1. Progress Tracker State

```typescript
interface ProgressTrackerState {
  // Display coverage
  display: {
    current: number;
    total: number;
    percent: number;
  };
  
  // Effects coverage
  effects: {
    current: number;
    total: number;
    percent: number;
  };
  
  // Phase breakdown
  phases: {
    autoMatch: { display: number; effects: number; items: number };
    groups: { display: number; effects: number; items: number };
    models: { display: number; effects: number; items: number };
    submodelGroups: { display: number; effects: number; items: number };
  };
  
  // Effect type breakdown
  effectTypes: Map<string, { count: number; captured: number }>;
  
  // Signature effects
  signatureEffects: Array<{
    type: string;
    count: number;
    isMapped: boolean;
    mappedTo?: string;
  }>;
  
  // UI state
  isExpanded: boolean;
  isModalOpen: boolean;
  position: 'inline' | 'header' | 'review';
}
```

### 2. Compact Header Component

```tsx
function CompactProgressTracker({ 
  state, 
  onHover, 
  onClick 
}: CompactTrackerProps) {
  return (
    <motion.div
      className="flex items-center gap-3 bg-card/80 backdrop-blur rounded-lg px-3 py-2 cursor-pointer"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
    >
      {/* Display Coverage */}
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4 text-muted-foreground" />
        <span className={cn(
          "text-sm font-bold",
          state.display.percent >= 80 ? "text-green-400" : "text-yellow-400"
        )}>
          {state.display.percent}%
        </span>
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className={cn(
              "h-full rounded-full",
              state.display.percent >= 80 ? "bg-green-500" : "bg-yellow-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${state.display.percent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {state.display.current}/{state.display.total}
        </span>
      </div>
      
      <div className="w-px h-4 bg-border" />
      
      {/* Effects Coverage */}
      <div className="flex items-center gap-2">
        <Clapperboard className="h-4 w-4 text-muted-foreground" />
        <span className={cn(
          "text-sm font-bold",
          state.effects.percent >= 70 ? "text-blue-400" : "text-yellow-400"
        )}>
          {state.effects.percent}%
        </span>
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className={cn(
              "h-full rounded-full",
              state.effects.percent >= 70 ? "bg-blue-500" : "bg-yellow-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${state.effects.percent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {formatNumber(state.effects.current)}/{formatNumber(state.effects.total)}
        </span>
      </div>
    </motion.div>
  );
}
```

### 3. Expanded Hover Card

```tsx
function ExpandedProgressCard({ state }: ExpandedCardProps) {
  const displayGain = state.display.percent - state.phases.autoMatch.display;
  const effectsGain = state.effects.percent - state.phases.autoMatch.effects;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="absolute top-full mt-2 right-0 w-80 bg-card border rounded-lg shadow-xl p-4 z-50"
    >
      {/* Full Progress Bars */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">YOUR DISPLAY</div>
          <div className="text-2xl font-bold text-green-400">{state.display.percent}%</div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${state.display.percent}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {state.display.current} of {state.display.total} models
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">SEQUENCE EFFECTS</div>
          <div className="text-2xl font-bold text-blue-400">{state.effects.percent}%</div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${state.effects.percent}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {state.effects.current.toLocaleString()} of {state.effects.total.toLocaleString()}
          </div>
        </div>
      </div>
      
      {/* Gains Since Auto-Match */}
      <div className="bg-muted/30 rounded-lg p-3 mb-3">
        <div className="text-xs text-muted-foreground mb-2">Since Auto-Match:</div>
        <div className="flex justify-between text-sm">
          <span className="text-green-400">+{displayGain}% display</span>
          <span className="text-blue-400">+{effectsGain}% effects</span>
        </div>
      </div>
      
      {/* Click for More */}
      <button className="w-full text-xs text-primary hover:underline text-center">
        Click for detailed breakdown →
      </button>
    </motion.div>
  );
}
```

### 4. Animation Controller

```tsx
function useProgressTrackerAnimation(currentPhase: Phase) {
  const [position, setPosition] = useState<'inline' | 'header' | 'review'>('inline');
  const controls = useAnimation();
  
  useEffect(() => {
    if (currentPhase === 'auto-match') {
      setPosition('inline');
    } else if (currentPhase === 'review') {
      // Animate from header back to inline
      controls.start({
        y: [0, 200],
        scale: [0.8, 1],
        transition: { duration: 0.5, ease: "easeOut" }
      });
      setPosition('review');
    } else {
      // Animate to header if coming from auto-match
      if (position === 'inline') {
        controls.start({
          y: [-200, 0],
          scale: [1, 0.8],
          transition: { duration: 0.5, ease: "easeOut" }
        });
      }
      setPosition('header');
    }
  }, [currentPhase]);
  
  return { position, controls };
}
```

### 5. Full Details Modal

```tsx
function ProgressDetailsModal({ 
  state, 
  isOpen, 
  onClose 
}: ProgressModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mapping Progress Details</DialogTitle>
        </DialogHeader>
        
        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-6 py-4">
          <ProgressCard 
            title="YOUR DISPLAY"
            percent={state.display.percent}
            current={state.display.current}
            total={state.display.total}
            unit="models"
            color="green"
          />
          <ProgressCard 
            title="SEQUENCE EFFECTS"
            percent={state.effects.percent}
            current={state.effects.current}
            total={state.effects.total}
            unit="effects"
            color="blue"
          />
        </div>
        
        <Separator />
        
        {/* Phase Breakdown */}
        <div className="py-4">
          <h3 className="text-sm font-medium mb-3">BREAKDOWN BY PHASE</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phase</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Display</TableHead>
                <TableHead>Effects</TableHead>
                <TableHead>Gain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <PhaseRow phase="Auto-Match" data={state.phases.autoMatch} />
              <PhaseRow phase="Groups" data={state.phases.groups} />
              <PhaseRow phase="Models" data={state.phases.models} />
              <PhaseRow phase="Submodel Groups" data={state.phases.submodelGroups} />
            </TableBody>
          </Table>
        </div>
        
        <Separator />
        
        {/* Effect Types */}
        <div className="py-4">
          <h3 className="text-sm font-medium mb-3">EFFECT TYPES CAPTURED</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Array.from(state.effectTypes.entries())
              .sort((a, b) => b[1].captured - a[1].captured)
              .map(([type, data]) => (
                <EffectTypeRow 
                  key={type}
                  type={type}
                  captured={data.captured}
                  total={data.count}
                  isSignature={SIGNATURE_EFFECTS.includes(type)}
                />
              ))
            }
          </div>
        </div>
        
        <Separator />
        
        {/* Signature Effects Status */}
        <div className="py-4">
          <h3 className="text-sm font-medium mb-3">SIGNATURE EFFECTS STATUS</h3>
          <div className="space-y-2">
            {state.signatureEffects.map(sig => (
              <div 
                key={sig.type}
                className={cn(
                  "flex items-center justify-between p-2 rounded",
                  sig.isMapped ? "bg-green-500/10" : "bg-orange-500/10"
                )}
              >
                <div className="flex items-center gap-2">
                  <span>{sig.isMapped ? '✅' : '⚠️'}</span>
                  <span className="font-medium">{sig.type}</span>
                  <span className="text-xs text-muted-foreground">
                    ({sig.count} effects)
                  </span>
                </div>
                {sig.isMapped ? (
                  <span className="text-xs text-green-400">
                    → {sig.mappedTo}
                  </span>
                ) : (
                  <span className="text-xs text-orange-400">
                    UNMAPPED
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 6. Integration with App Layout

```tsx
function AppLayout({ children, currentPhase }: AppLayoutProps) {
  const progressState = useProgressTrackerState();
  const { position, controls } = useProgressTrackerAnimation(currentPhase);
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="text-sm text-muted-foreground">
              {projectName}
            </span>
          </div>
          
          {/* Progress Tracker - Header Position */}
          {position === 'header' && (
            <div className="relative">
              <motion.div animate={controls}>
                <CompactProgressTracker
                  state={progressState}
                  onHover={setIsHovered}
                  onClick={() => setIsModalOpen(true)}
                />
              </motion.div>
              
              <AnimatePresence>
                {isHovered && (
                  <ExpandedProgressCard state={progressState} />
                )}
              </AnimatePresence>
            </div>
          )}
          
          <Button>Export</Button>
        </div>
        
        {/* Phase Navigation */}
        <PhaseNavigation currentPhase={currentPhase} />
      </header>
      
      {/* Main Content */}
      <main>
        {children}
      </main>
      
      {/* Details Modal */}
      <ProgressDetailsModal
        state={progressState}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
```

## 🎬 Animation Specifications

### Auto-Match → Header Animation
```typescript
{
  initial: { y: 0, scale: 1, opacity: 1 },
  animate: { 
    y: -200,  // Move up
    scale: 0.7,  // Shrink
    opacity: 1 
  },
  transition: { 
    duration: 0.6,
    ease: [0.4, 0, 0.2, 1]  // Material ease-out
  }
}
```

### Header → Review Animation
```typescript
{
  initial: { y: 0, scale: 0.7 },
  animate: { 
    y: 200,  // Move down
    scale: 1,  // Expand
  },
  transition: { 
    duration: 0.6,
    ease: [0.4, 0, 0.2, 1]
  }
}
```

### Real-time Progress Update
```typescript
// When a mapping is made
{
  animate: {
    scale: [1, 1.05, 1],  // Pulse effect
  },
  transition: { duration: 0.3 }
}

// Progress bar fill
{
  animate: { width: `${newPercent}%` },
  transition: { duration: 0.5, ease: "easeOut" }
}
```

## ✅ Acceptance Criteria

### Animation:
- [ ] Cards animate smoothly from Auto-Match to header
- [ ] Cards animate back from header to Review
- [ ] No jank or stuttering during transitions
- [ ] Progress bars animate when values change

### Compact State:
- [ ] Shows both metrics in compact form
- [ ] Fits in header without crowding
- [ ] Updates in real-time as user maps

### Hover Expansion:
- [ ] Expands on hover to show more detail
- [ ] Shows gains since Auto-Match
- [ ] Smooth expand/collapse animation
- [ ] Doesn't block other UI elements

### Click Modal:
- [ ] Opens detailed breakdown
- [ ] Shows phase-by-phase progress
- [ ] Shows effect type breakdown
- [ ] Shows signature effects status
- [ ] Scrollable if content is long

### Integration:
- [ ] Works on all phases (Groups, Models, Submodel Groups)
- [ ] Persists across navigation
- [ ] Removes old "Effects Coverage" bar from header

## 🧪 Test Cases

1. **Animation trigger**: Clicking "Continue to Groups" triggers upward animation
2. **Real-time update**: Making a mapping updates both percentages
3. **Hover shows detail**: Hovering expands with smooth animation
4. **Click shows modal**: Clicking opens full details
5. **Review animation**: Entering Review triggers downward animation
6. **Responsive**: Works on different screen sizes
7. **Performance**: No lag with many effects (test with 20K+)

## 🏷️ Labels
- Priority: **HIGH** (Major UX enhancement)
- Type: Feature
- Effort: High (8-10 hours)
- Impact: **Significant** - Always-visible progress motivation
- Related: Tickets 39, 40, 42
