# Ticket 13: Flatten High Density Phase (Remove Wizard-in-Wizard)

## 🎯 Objective
Make the High Density (formerly "Spinners") phase look and feel IDENTICAL to Groups and Models phases. Eliminate the confusing sub-wizard pattern.

## 📋 Problem Statement
From UX walkthrough:
- "This wizard within a wizard is way too confusing"
- "I hit continue here, and it's going to take me to the end, to the review. That's not what I would expect"
- "There's a scroll within a scroll that is start matching or skip"
- "This is a mess. We got to clean this up"
- "A lot of wasted space on this left. Why is this not just like the models and the groups?"
- "I'm not sure why this one has its own status bar"
- "I think the workflow should be exactly the same"

## 🔧 Current vs Target State

### ❌ Current (Confusing)
```
High Density Phase
├── Landing page with "Start Matching" button (hidden in scroll)
├── Sub-wizard with own progress bar
├── Different layout than Groups/Models
├── Continue button goes to Review (unexpected)
└── "Skip this item" / "Skip this category" mess
```

### ✅ Target (Consistent)
```
High Density Phase
├── Same two-panel layout as Groups/Models
├── Same progress indicator (in main stepper)
├── Same interaction patterns
├── Continue goes to Review (expected, because it's last mapping phase)
└── Same skip behavior as other phases
```

## 🔧 Implementation

### 1. Remove Sub-Wizard Components
```tsx
// DELETE these from High Density phase:
// - SpinnerWizardLanding
// - SpinnerWizardProgress
// - SpinnerSubStepper
// - Any "Start Matching" intermediate screen
```

### 2. Use Same Layout Component
```tsx
// High Density should use EXACT same layout as Groups and Models
<MappingPhaseLayout
  phase="high-density"
  title="High Density Props"
  description="Map submodel groups for spinners, wreaths, fountains & other HD props"
  items={submodelGroups}
  onMatch={handleMatch}
  onSkip={handleSkip}
/>
```

### 3. Remove Separate Progress Bar
```tsx
// REMOVE any phase-specific progress bars
// Main stepper at top handles ALL progress visualization
```

### 4. Consistent Item Card
```tsx
// Same card component used in Groups and Models
<MappingItemCard
  item={submodelGroup}
  suggestions={suggestions}
  onMatch={handleMatch}
  onSkip={() => handleSkip(submodelGroup.name)}
  // Skip button INSIDE card, same as other phases
/>
```

## 📐 Visual Comparison

### Before (Confusing)
```
┌─────────────────────────────────────────────────────────────────┐
│  High Density Props                                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🎡 Welcome to Spinner Matching!                          │  │
│  │                                                           │  │
│  │  Type: SEMANTIC_SIMILARITY  (nobody cares)                │  │
│  │                                                           │  │
│  │  This phase helps you map...                              │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │  (scroll to find)                                   │ │  │
│  │  │                                                     │ │  │
│  │  │        [Start Matching]  [Skip All]                 │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Continue] ← Goes to Review! Not expected!                      │
└─────────────────────────────────────────────────────────────────┘
```

### After (Consistent)
```
┌─────────────────────────────────────────────────────────────────┐
│  ○ Upload  ○ Auto  ○ Groups  ○ Models  ● HD  ○ Review          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │ Your Submodel Groups│    │ Sequence Submodel Groups        │ │
│  │                     │    │                                 │ │
│  │ ● S - All Rings     │    │ ⭐ Odyssey Rings               │ │
│  │   S - Big Hearts    │    │    Fuzion Spokes               │ │
│  │   S - Fireworks     │    │    Rosa Grande Petals          │ │
│  │   S - Cascading...  │    │                                 │ │
│  │                     │    │ [Search...]                     │ │
│  │ [Skip]              │    │                                 │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ← Back                    8 of 43 mapped     [Continue →]      │
└─────────────────────────────────────────────────────────────────┘
```

## 🚫 Things to Remove

1. **Landing/Intro Screen** - Jump straight into matching
2. **Sub-progress bar** - Use main stepper only
3. **Type labels** - "SEMANTIC_SIMILARITY" etc. (keep tooltip explanation)
4. **"Start Matching" button** - Just start
5. **"Skip this category"** - Confusing, just use "Skip" per item
6. **Extra whitespace** - Match density of other phases

## ✅ Acceptance Criteria

- [ ] High Density phase looks identical to Groups phase
- [ ] High Density phase looks identical to Models phase
- [ ] No sub-wizard or landing page
- [ ] No separate progress bar
- [ ] Same two-panel layout
- [ ] Same card components
- [ ] Same skip behavior (per-item, inside card)
- [ ] Continue button goes to Review (expected since it's last)
- [ ] "Type" labels removed from UI (keep in tooltip only)

## 🧪 Test Cases

1. Navigate Groups → Models → High Density: Transition feels seamless
2. Skip behavior identical across all three phases
3. Card interactions identical across all three phases
4. Progress updates correctly in main stepper
5. No extra scrolling required to find action buttons

## 🏷️ Labels
- Priority: **CRITICAL**
- Type: UX Fix
- Phase: High Density
- Effort: Medium-High (3-4 hours)
- Dependencies: Ticket 12 (scrolling fix)
