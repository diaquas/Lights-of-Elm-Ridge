# Ticket 12: Fix Scrolling & Button Placement

## 🎯 Objective
Eliminate the "scrolling nightmare" by moving the workflow stepper and action buttons to fixed positions that are always visible.

## 📋 Problem Statement
From UX walkthrough:
- "Scrolling all over the place is just a nightmare"
- "I have to scroll down to continue"
- "There's two continues, that's confusing, they both do the same thing"
- "I think you could probably put the workflow in the top instead of the bottom"

## 🔧 Implementation

### 1. Move Stepper to Top
```tsx
// Current: Stepper at bottom of page
// New: Fixed stepper header at top

<div className="sticky top-0 z-50 bg-background border-b">
  <WizardStepper 
    currentPhase={phase}
    progress={progress}
    onPhaseClick={handlePhaseNavigation}
  />
</div>
```

### 2. Single Action Button Area
```tsx
// Fixed footer with primary action only
<div className="sticky bottom-0 bg-background border-t p-4">
  <div className="flex justify-between items-center max-w-4xl mx-auto">
    <Button variant="ghost" onClick={handleBack}>
      ← Back
    </Button>
    
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {mappedCount} of {totalCount} mapped
      </span>
      <Button onClick={handleContinue}>
        Continue to {nextPhaseName} →
      </Button>
    </div>
  </div>
</div>
```

### 3. Remove Duplicate Buttons
- Remove any "Continue" buttons from within card content
- Single source of truth for navigation in sticky footer
- Skip buttons move INSIDE cards, not floating

### 4. Page Layout Structure
```tsx
<div className="flex flex-col h-screen">
  {/* Fixed Header with Stepper */}
  <header className="sticky top-0 z-50">
    <WizardStepper />
  </header>
  
  {/* Scrollable Content Area */}
  <main className="flex-1 overflow-auto p-4">
    <PhaseContent />
  </main>
  
  {/* Fixed Footer with Actions */}
  <footer className="sticky bottom-0 border-t">
    <ActionButtons />
  </footer>
</div>
```

## 📐 Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ○ Upload  ○ Auto-Match  ● Groups  ○ Models  ○ HD  ○ Review    │ ← FIXED TOP
│  ═══════════════════════●═══════════════════════════════════   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │              Scrollable Content Area                    │   │ ← SCROLLS
│  │                                                         │   │
│  │   [Left Panel]              [Right Panel]               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ← Back                    12 of 45 mapped    [Continue →]     │ ← FIXED BOTTOM
└─────────────────────────────────────────────────────────────────┘
```

## ✅ Acceptance Criteria

- [ ] Stepper is always visible at top of screen (sticky)
- [ ] Only ONE Continue button visible at any time
- [ ] Continue button always visible without scrolling
- [ ] Back button in footer (not buried in content)
- [ ] Progress count shown next to Continue button
- [ ] Skip buttons inside their respective cards, not floating
- [ ] Content area scrolls independently of header/footer
- [ ] Works on all screen sizes (responsive)

## 🧪 Test Cases

1. **Long item list**: With 100+ items, stepper stays visible, Continue stays visible
2. **Short item list**: No awkward empty space, layout adjusts
3. **Mobile view**: Buttons remain accessible, touch-friendly
4. **Phase transitions**: Smooth animation when moving between phases

## 📱 Responsive Considerations

```tsx
// Mobile: Stack buttons vertically
// Desktop: Horizontal layout

<footer className="sticky bottom-0 p-4">
  <div className="flex flex-col sm:flex-row justify-between gap-2">
    ...
  </div>
</footer>
```

## 🏷️ Labels
- Priority: **CRITICAL**
- Type: UX Fix
- Phase: All phases affected
- Effort: Medium (2-3 hours)
