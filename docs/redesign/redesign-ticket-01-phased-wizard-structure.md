# Ticket: Phased Wizard Structure

## Priority: P0 (Foundation - Must Be First)

## Summary

Replace the current flat two-panel mapping interface with a phased wizard that guides users through mapping in logical stages. This is the architectural foundation for the entire redesign.

---

## Current State

- Single screen shows all 40+ unmapped items in one list
- User must mentally categorize and prioritize
- No sense of progress or completion
- Overwhelming cognitive load

## Target State

- 5-phase wizard: Auto-Accept → Groups → Individuals → Spinners → Review
- User completes one phase before moving to next
- Clear progress indicator at top
- Each phase has focused, phase-specific UI

---

## Technical Implementation

### 1. Phase State Management

Create a new state machine for mapping phases:

```typescript
// types/mappingPhases.ts

export type MappingPhase = 
  | 'auto-accept'
  | 'groups' 
  | 'individuals'
  | 'spinners'
  | 'review';

export interface PhaseConfig {
  id: MappingPhase;
  label: string;
  description: string;
  filter: (item: SourceItem) => boolean;
  minConfidence?: number;
}

export const PHASE_CONFIG: PhaseConfig[] = [
  {
    id: 'auto-accept',
    label: 'Auto-Matches',
    description: 'High-confidence matches ready to accept',
    filter: (item) => item.bestMatch?.confidence >= 0.85,
    minConfidence: 0.85
  },
  {
    id: 'groups',
    label: 'Groups',
    description: 'Match model groups to source groups',
    filter: (item) => item.type === 'MODEL_GRP' && (item.bestMatch?.confidence ?? 0) < 0.85
  },
  {
    id: 'individuals',
    label: 'Models',
    description: 'Match individual models',
    filter: (item) => item.type === 'MODEL' && (item.bestMatch?.confidence ?? 0) < 0.85
  },
  {
    id: 'spinners',
    label: 'Spinners',
    description: 'Semantic matching for spinner submodel groups',
    filter: (item) => item.type === 'SUBMODEL_GRP'
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Review all mappings before export',
    filter: () => true // Shows all
  }
];
```

### 2. Phase Context Provider

```typescript
// context/MappingPhaseContext.tsx

import { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface PhaseContextValue {
  currentPhase: MappingPhase;
  setCurrentPhase: (phase: MappingPhase) => void;
  goToNextPhase: () => void;
  goToPreviousPhase: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  phaseItems: SourceItem[];
  phaseProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  overallProgress: {
    mapped: number;
    total: number;
    percentage: number;
  };
}

export const MappingPhaseContext = createContext<PhaseContextValue | null>(null);

export function MappingPhaseProvider({ children, allItems, mappings }: {
  children: ReactNode;
  allItems: SourceItem[];
  mappings: Map<string, Mapping>;
}) {
  const [currentPhase, setCurrentPhase] = useState<MappingPhase>('auto-accept');
  
  const phaseIndex = PHASE_CONFIG.findIndex(p => p.id === currentPhase);
  
  const canGoNext = phaseIndex < PHASE_CONFIG.length - 1;
  const canGoPrevious = phaseIndex > 0;
  
  const goToNextPhase = () => {
    if (canGoNext) {
      setCurrentPhase(PHASE_CONFIG[phaseIndex + 1].id);
    }
  };
  
  const goToPreviousPhase = () => {
    if (canGoPrevious) {
      setCurrentPhase(PHASE_CONFIG[phaseIndex - 1].id);
    }
  };
  
  const phaseItems = useMemo(() => {
    const config = PHASE_CONFIG.find(p => p.id === currentPhase);
    if (!config) return [];
    return allItems.filter(config.filter);
  }, [currentPhase, allItems]);
  
  const phaseProgress = useMemo(() => {
    const total = phaseItems.length;
    const completed = phaseItems.filter(item => mappings.has(item.id)).length;
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 100
    };
  }, [phaseItems, mappings]);
  
  const overallProgress = useMemo(() => {
    const total = allItems.length;
    const mapped = allItems.filter(item => mappings.has(item.id)).length;
    return {
      mapped,
      total,
      percentage: total > 0 ? Math.round((mapped / total) * 100) : 0
    };
  }, [allItems, mappings]);
  
  return (
    <MappingPhaseContext.Provider value={{
      currentPhase,
      setCurrentPhase,
      goToNextPhase,
      goToPreviousPhase,
      canGoNext,
      canGoPrevious,
      phaseItems,
      phaseProgress,
      overallProgress
    }}>
      {children}
    </MappingPhaseContext.Provider>
  );
}

export const useMappingPhase = () => {
  const context = useContext(MappingPhaseContext);
  if (!context) throw new Error('useMappingPhase must be used within MappingPhaseProvider');
  return context;
};
```

### 3. Progress Stepper Component

```typescript
// components/PhaseStepper.tsx

import { useMappingPhase } from '@/context/MappingPhaseContext';
import { PHASE_CONFIG, MappingPhase } from '@/types/mappingPhases';

export function PhaseStepper() {
  const { currentPhase, setCurrentPhase, overallProgress } = useMappingPhase();
  
  const currentIndex = PHASE_CONFIG.findIndex(p => p.id === currentPhase);
  
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
      {/* Phase Steps */}
      <div className="flex items-center gap-2">
        {PHASE_CONFIG.map((phase, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          
          return (
            <div key={phase.id} className="flex items-center">
              {/* Step Indicator */}
              <button
                onClick={() => setCurrentPhase(phase.id)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                  transition-all duration-200
                  ${isComplete ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : ''}
                  ${isCurrent ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/50' : ''}
                  ${isPending ? 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700' : ''}
                `}
              >
                {/* Status Icon */}
                {isComplete && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {isCurrent && (
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                )}
                {isPending && (
                  <div className="w-2 h-2 bg-zinc-600 rounded-full" />
                )}
                
                <span>{phase.label}</span>
              </button>
              
              {/* Connector Line */}
              {index < PHASE_CONFIG.length - 1 && (
                <div className={`
                  w-8 h-0.5 mx-1
                  ${index < currentIndex ? 'bg-green-500/50' : 'bg-zinc-700'}
                `} />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Overall Progress */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-zinc-400">
          {overallProgress.mapped}/{overallProgress.total} mapped
        </span>
        <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${overallProgress.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

### 4. Phase Container Component

```typescript
// components/PhaseContainer.tsx

import { useMappingPhase } from '@/context/MappingPhaseContext';
import { AutoAcceptPhase } from './phases/AutoAcceptPhase';
import { GroupsPhase } from './phases/GroupsPhase';
import { IndividualsPhase } from './phases/IndividualsPhase';
import { SpinnersPhase } from './phases/SpinnersPhase';
import { ReviewPhase } from './phases/ReviewPhase';

export function PhaseContainer() {
  const { currentPhase } = useMappingPhase();
  
  const PhaseComponent = {
    'auto-accept': AutoAcceptPhase,
    'groups': GroupsPhase,
    'individuals': IndividualsPhase,
    'spinners': SpinnersPhase,
    'review': ReviewPhase
  }[currentPhase];
  
  return (
    <div className="flex-1 overflow-hidden">
      <PhaseComponent />
    </div>
  );
}
```

### 5. Phase Navigation Footer

```typescript
// components/PhaseNavigation.tsx

import { useMappingPhase } from '@/context/MappingPhaseContext';
import { PHASE_CONFIG } from '@/types/mappingPhases';

export function PhaseNavigation() {
  const { 
    currentPhase, 
    goToNextPhase, 
    goToPreviousPhase, 
    canGoNext, 
    canGoPrevious,
    phaseProgress 
  } = useMappingPhase();
  
  const currentConfig = PHASE_CONFIG.find(p => p.id === currentPhase);
  
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-t border-zinc-800">
      {/* Back Button */}
      <button
        onClick={goToPreviousPhase}
        disabled={!canGoPrevious}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          transition-all duration-200
          ${canGoPrevious 
            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
            : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}
        `}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      
      {/* Phase Info */}
      <div className="text-center">
        <div className="text-sm text-zinc-400">
          {currentConfig?.description}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          {phaseProgress.completed} of {phaseProgress.total} complete in this phase
        </div>
      </div>
      
      {/* Next Button */}
      <button
        onClick={goToNextPhase}
        disabled={!canGoNext}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          transition-all duration-200
          ${canGoNext 
            ? 'bg-blue-600 text-white hover:bg-blue-500' 
            : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'}
        `}
      >
        {currentPhase === 'review' ? 'Export' : 'Continue'}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
```

### 6. Updated Main Layout

```typescript
// components/MappingInterface.tsx

import { MappingPhaseProvider } from '@/context/MappingPhaseContext';
import { PhaseStepper } from './PhaseStepper';
import { PhaseContainer } from './PhaseContainer';
import { PhaseNavigation } from './PhaseNavigation';

export function MappingInterface({ 
  sourceItems, 
  destinationModels,
  mappings,
  onMappingChange 
}: MappingInterfaceProps) {
  return (
    <MappingPhaseProvider allItems={sourceItems} mappings={mappings}>
      <div className="flex flex-col h-screen bg-zinc-950">
        {/* Header with title */}
        <header className="px-6 py-4 border-b border-zinc-800">
          <h1 className="text-2xl font-bold text-white">ModIQ</h1>
          <p className="text-sm text-zinc-400 mt-1">
            xlights_rgbeffects.xml → Your Layout
          </p>
        </header>
        
        {/* Phase Stepper */}
        <PhaseStepper />
        
        {/* Main Content Area */}
        <PhaseContainer />
        
        {/* Navigation Footer */}
        <PhaseNavigation />
      </div>
    </MappingPhaseProvider>
  );
}
```

---

## File Structure

```
src/
├── types/
│   └── mappingPhases.ts          # Phase types and config
├── context/
│   └── MappingPhaseContext.tsx   # Phase state management
├── components/
│   ├── MappingInterface.tsx      # Main layout
│   ├── PhaseStepper.tsx          # Progress indicator
│   ├── PhaseContainer.tsx        # Phase router
│   ├── PhaseNavigation.tsx       # Back/Next buttons
│   └── phases/
│       ├── AutoAcceptPhase.tsx   # Phase 1
│       ├── GroupsPhase.tsx       # Phase 2
│       ├── IndividualsPhase.tsx  # Phase 3
│       ├── SpinnersPhase.tsx     # Phase 4
│       └── ReviewPhase.tsx       # Phase 5
```

---

## Acceptance Criteria

- [ ] User sees 5-phase stepper at top of screen
- [ ] Clicking a phase step navigates to that phase
- [ ] Current phase is visually highlighted
- [ ] Completed phases show checkmark
- [ ] Back/Next buttons navigate between phases
- [ ] Each phase filters items appropriately
- [ ] Overall progress (X/Y mapped) updates in real-time
- [ ] Phase progress (X/Y in this phase) shows in footer

---

## Dependencies

None - this is the foundation ticket.

## Blocked By

Nothing.

## Blocks

All other redesign tickets depend on this structure.
