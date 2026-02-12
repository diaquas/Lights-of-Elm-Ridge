# Ticket 17: Auto-Advance After Match

## 🎯 Objective
Automatically select the next unmapped item after user completes a match, reducing clicks and speeding up the workflow.

## 📋 Problem Statement
From UX walkthrough:
- "If I map 7, it should automatically select MiniPumpkin 6 for me"
- "It's kind of interesting you have to click to the next one to get the suggestions over here"
- "I don't think, like, I think we can just skip to it"

## 🔧 Implementation

### 1. Auto-Advance Logic
```tsx
function handleMatch(userItem: string, sequenceItem: string) {
  // 1. Record the mapping
  addMapping(userItem, sequenceItem);
  
  // 2. Find next unmapped item
  const currentIndex = items.findIndex(i => i.name === userItem);
  const nextUnmapped = findNextUnmapped(items, currentIndex);
  
  // 3. Auto-select it (with slight delay for visual feedback)
  if (nextUnmapped) {
    setTimeout(() => {
      setSelectedItem(nextUnmapped.name);
    }, 300); // Brief pause to show "matched" state
  } else {
    // All done! Show completion state or advance to next phase
    handlePhaseComplete();
  }
}

function findNextUnmapped(
  items: MappingItem[], 
  startIndex: number
): MappingItem | null {
  // First, look forward from current position
  for (let i = startIndex + 1; i < items.length; i++) {
    if (items[i].status === 'unmapped') return items[i];
  }
  
  // Then wrap around to beginning
  for (let i = 0; i < startIndex; i++) {
    if (items[i].status === 'unmapped') return items[i];
  }
  
  return null; // All mapped!
}
```

### 2. Visual Feedback Before Advance
```tsx
function MappingCard({ item, onMatch }: Props) {
  const [justMatched, setJustMatched] = useState(false);
  
  const handleMatchClick = (sequenceItem: string) => {
    setJustMatched(true);
    onMatch(item.name, sequenceItem);
    // Parent will auto-advance after delay
  };
  
  return (
    <Card className={cn(
      "transition-all duration-300",
      justMatched && "bg-green-50 border-green-500"
    )}>
      {justMatched ? (
        <div className="flex items-center justify-center p-4">
          <Check className="h-6 w-6 text-green-500 mr-2" />
          <span>Matched!</span>
        </div>
      ) : (
        <NormalCardContent onMatch={handleMatchClick} />
      )}
    </Card>
  );
}
```

### 3. Skip Also Auto-Advances
```tsx
function handleSkip(userItem: string) {
  // 1. Mark as skipped
  markSkipped(userItem);
  
  // 2. Find and select next unmapped
  const nextUnmapped = findNextUnmapped(items, currentIndex);
  if (nextUnmapped) {
    setTimeout(() => {
      setSelectedItem(nextUnmapped.name);
    }, 200); // Shorter delay for skip
  }
}
```

### 4. User Preference (Optional)
```tsx
// Some users might prefer manual control
const [autoAdvance, setAutoAdvance] = useState(true);

<SettingsToggle
  label="Auto-advance after match"
  checked={autoAdvance}
  onChange={setAutoAdvance}
/>

// In match handler
if (autoAdvance) {
  setTimeout(() => setSelectedItem(nextUnmapped.name), 300);
}
```

## 📐 Visual Flow

```
Step 1: User matches "Mini Pumpkin 8"
┌─────────────────────┐    ┌─────────────────────┐
│ ● Mini Pumpkin 8    │ → │ Mini Tree 8         │
│   Mini Pumpkin 7    │    │                     │
│   Mini Pumpkin 6    │    │                     │
└─────────────────────┘    └─────────────────────┘

Step 2: Brief "Matched!" feedback (300ms)
┌─────────────────────┐    ┌─────────────────────┐
│ ✓ Mini Pumpkin 8    │    │   ✓ Matched!        │
│   Mini Pumpkin 7    │    │                     │
│   Mini Pumpkin 6    │    │                     │
└─────────────────────┘    └─────────────────────┘

Step 3: Auto-advance to next unmapped
┌─────────────────────┐    ┌─────────────────────┐
│ ✓ Mini Pumpkin 8    │    │ Suggestions for     │
│ ● Mini Pumpkin 7    │ ←  │ Mini Pumpkin 7:     │
│   Mini Pumpkin 6    │    │ ⭐ Mini Tree 7      │
└─────────────────────┘    └─────────────────────┘
```

## 🔧 Smart Advancement

### Prefer Same "Family"
```tsx
function findNextUnmapped(
  items: MappingItem[], 
  currentItem: MappingItem
): MappingItem | null {
  // Extract the "family" prefix (e.g., "Mini Pumpkin" from "Mini Pumpkin 8")
  const family = extractFamily(currentItem.name);
  
  // First, try to find next in same family
  const sameFamily = items.filter(i => 
    i.status === 'unmapped' && 
    extractFamily(i.name) === family
  );
  
  if (sameFamily.length > 0) {
    // Sort by number and return first
    return naturalSort(sameFamily)[0];
  }
  
  // Otherwise, just get next unmapped
  return items.find(i => i.status === 'unmapped') || null;
}

function extractFamily(name: string): string {
  // "Mini Pumpkin 8" → "Mini Pumpkin"
  // "Arch 1" → "Arch"
  return name.replace(/\s*\d+\s*$/, '').trim();
}
```

### All Done Detection
```tsx
function handlePhaseComplete() {
  const unmappedCount = items.filter(i => i.status === 'unmapped').length;
  const skippedCount = items.filter(i => i.status === 'skipped').length;
  
  if (unmappedCount === 0) {
    // Show completion celebration
    showToast({
      title: "Phase Complete! 🎉",
      description: `Mapped ${mappedCount} items. ${skippedCount} skipped.`,
      action: <Button onClick={goToNextPhase}>Continue</Button>
    });
  }
}
```

## ✅ Acceptance Criteria

- [ ] After match, next unmapped item auto-selected (300ms delay)
- [ ] After skip, next unmapped item auto-selected (200ms delay)
- [ ] Visual feedback shown during transition ("Matched!")
- [ ] Prefers next item in same "family" when possible
- [ ] Wraps around if at end of list
- [ ] Shows completion state when all items done
- [ ] Works in all phases (Groups, Models, High Density)
- [ ] Optional: User can disable auto-advance in settings

## 🧪 Test Cases

1. **Basic advance**: Match item, verify next unmapped selected
2. **Skip advance**: Skip item, verify next unmapped selected
3. **Family preference**: Match "Arch 3", verify "Arch 4" selected (not "Bat 1")
4. **Wrap around**: Match last item, verify first unmapped selected
5. **All complete**: Match final item, verify completion state shown
6. **Mixed states**: Some mapped, some skipped, verify correct next item

## 🏷️ Labels
- Priority: **MEDIUM-HIGH**
- Type: UX Improvement
- Phase: All mapping phases
- Effort: Low-Medium (2 hours)
