# Ticket: Auto-Accept Phase with Bulk Actions

## Priority: P0 (Core Feature)

## Summary

Implement the first phase of the mapping wizard where users can quickly accept all high-confidence matches (85%+) with a single click, or review them individually.

---

## Current State

- All items shown in single list regardless of confidence
- No bulk accept functionality
- User must click each item individually
- High-confidence matches buried among low-confidence ones

## Target State

- Phase 1 shows ONLY items with 85%+ confidence matches
- "Accept All" button accepts all matches in one click
- Optional: Review individual matches before accepting
- Clear visual indication of what will be mapped
- Celebration toast when phase completes

---

## Technical Implementation

### 1. Auto-Accept Phase Component

```typescript
// components/phases/AutoAcceptPhase.tsx

import { useState } from 'react';
import { useMappingPhase } from '@/context/MappingPhaseContext';
import { useMappings } from '@/context/MappingsContext';
import { MatchCard } from '../MatchCard';
import { BulkActionBar } from '../BulkActionBar';
import { PhaseEmptyState } from '../PhaseEmptyState';
import { CelebrationToast } from '../CelebrationToast';

export function AutoAcceptPhase() {
  const { phaseItems, phaseProgress, goToNextPhase } = useMappingPhase();
  const { acceptMatch, acceptMultiple } = useMappings();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Filter to only unmapped items
  const unmappedItems = phaseItems.filter(item => !item.isMapped);
  const mappedItems = phaseItems.filter(item => item.isMapped);
  
  // Handle accept all
  const handleAcceptAll = async () => {
    const toAccept = unmappedItems.map(item => ({
      sourceId: item.id,
      destinationId: item.bestMatch!.id
    }));
    
    await acceptMultiple(toAccept);
    setShowCelebration(true);
    
    // Auto-advance after celebration
    setTimeout(() => {
      setShowCelebration(false);
      goToNextPhase();
    }, 2000);
  };
  
  // Handle select all toggle
  const handleSelectAll = () => {
    if (selectedIds.size === unmappedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unmappedItems.map(item => item.id)));
    }
  };
  
  // Handle individual selection
  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  // Handle accept selected
  const handleAcceptSelected = async () => {
    const toAccept = unmappedItems
      .filter(item => selectedIds.has(item.id))
      .map(item => ({
        sourceId: item.id,
        destinationId: item.bestMatch!.id
      }));
    
    await acceptMultiple(toAccept);
    setSelectedIds(new Set());
  };
  
  // Empty state - no high-confidence matches
  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon="🎯"
        title="No High-Confidence Matches"
        description="No automatic matches were found with 85%+ confidence. Continue to the next phase to map groups manually."
        action={{
          label: "Continue to Groups",
          onClick: goToNextPhase
        }}
      />
    );
  }
  
  // All done state
  if (unmappedItems.length === 0) {
    return (
      <PhaseEmptyState
        icon="✅"
        title="All Auto-Matches Accepted!"
        description={`${mappedItems.length} high-confidence matches have been mapped.`}
        action={{
          label: "Continue to Groups",
          onClick: goToNextPhase
        }}
      />
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Phase Header */}
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              High-Confidence Matches
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {unmappedItems.length} matches ready to accept (85%+ confidence)
            </p>
          </div>
          
          {/* Accept All Button */}
          <button
            onClick={handleAcceptAll}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 
                       text-white font-semibold rounded-lg transition-all duration-200
                       shadow-lg shadow-green-600/20 hover:shadow-green-500/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M5 13l4 4L19 7" />
            </svg>
            Accept All {unmappedItems.length} Matches
          </button>
        </div>
      </div>
      
      {/* Match List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-3">
          {unmappedItems.map(item => (
            <MatchCard
              key={item.id}
              source={item}
              match={item.bestMatch!}
              isSelected={selectedIds.has(item.id)}
              onSelect={() => handleSelect(item.id)}
              onAccept={() => acceptMatch(item.id, item.bestMatch!.id)}
              onReject={() => {/* Skip this match */}}
              showCheckbox={true}
            />
          ))}
        </div>
        
        {/* Already Mapped Section (collapsed by default) */}
        {mappedItems.length > 0 && (
          <details className="mt-6">
            <summary className="text-sm text-zinc-500 cursor-pointer hover:text-zinc-400">
              {mappedItems.length} already mapped in this phase
            </summary>
            <div className="mt-3 space-y-2 opacity-60">
              {mappedItems.map(item => (
                <MatchCard
                  key={item.id}
                  source={item}
                  match={item.mapping!}
                  isAccepted={true}
                  showCheckbox={false}
                />
              ))}
            </div>
          </details>
        )}
      </div>
      
      {/* Bulk Action Bar (when items selected) */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={unmappedItems.length}
          onSelectAll={handleSelectAll}
          onAcceptSelected={handleAcceptSelected}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}
      
      {/* Celebration Toast */}
      {showCelebration && (
        <CelebrationToast
          title="Auto-Matches Complete! 🎉"
          description={`${phaseItems.length} high-confidence matches accepted`}
        />
      )}
    </div>
  );
}
```

### 2. Match Card Component

```typescript
// components/MatchCard.tsx

interface MatchCardProps {
  source: SourceItem;
  match: DestinationMatch;
  isSelected?: boolean;
  isAccepted?: boolean;
  onSelect?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  showCheckbox?: boolean;
}

export function MatchCard({
  source,
  match,
  isSelected = false,
  isAccepted = false,
  onSelect,
  onAccept,
  onReject,
  showCheckbox = false
}: MatchCardProps) {
  const confidenceColor = match.confidence >= 0.85 
    ? 'text-green-400 bg-green-500/10' 
    : match.confidence >= 0.50 
      ? 'text-amber-400 bg-amber-500/10'
      : 'text-red-400 bg-red-500/10';
  
  return (
    <div 
      className={`
        flex items-center gap-4 p-4 rounded-lg border transition-all duration-200
        ${isAccepted 
          ? 'bg-green-500/5 border-green-500/20' 
          : isSelected 
            ? 'bg-blue-500/10 border-blue-500/30' 
            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}
      `}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <button
          onClick={onSelect}
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center
            transition-all duration-200
            ${isSelected 
              ? 'bg-blue-500 border-blue-500' 
              : 'border-zinc-600 hover:border-zinc-500'}
          `}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      )}
      
      {/* Source Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {source.type === 'MODEL_GRP' && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
              GRP
            </span>
          )}
          {source.type === 'SUBMODEL_GRP' && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded">
              SUB
            </span>
          )}
          <span className="font-medium text-white truncate">{source.name}</span>
        </div>
        <div className="text-sm text-zinc-500 mt-0.5">
          {source.memberCount ? `${source.memberCount} members` : source.pixelCount ? `${source.pixelCount}px` : ''}
        </div>
      </div>
      
      {/* Arrow */}
      <div className="text-zinc-600">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </div>
      
      {/* Match Info */}
      <div className="flex-1 min-w-0 text-right">
        <div className="font-medium text-white truncate">{match.name}</div>
        <div className="text-sm text-zinc-500 mt-0.5">{match.metadata}</div>
      </div>
      
      {/* Confidence Badge */}
      <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${confidenceColor}`}>
        {Math.round(match.confidence * 100)}%
      </div>
      
      {/* Actions */}
      {!isAccepted && (
        <div className="flex items-center gap-2">
          <button
            onClick={onAccept}
            className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
            title="Accept match"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={onReject}
            className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
            title="Skip this match"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Accepted indicator */}
      {isAccepted && (
        <div className="flex items-center gap-2 text-green-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Mapped</span>
        </div>
      )}
    </div>
  );
}
```

### 3. Bulk Action Bar Component

```typescript
// components/BulkActionBar.tsx

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onAcceptSelected: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onAcceptSelected,
  onClearSelection
}: BulkActionBarProps) {
  const allSelected = selectedCount === totalCount;
  
  return (
    <div className="sticky bottom-0 px-6 py-4 bg-zinc-900/95 backdrop-blur border-t border-zinc-800">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Selection Info */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-300">
            <span className="font-semibold text-white">{selectedCount}</span> of {totalCount} selected
          </span>
          <button
            onClick={onSelectAll}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClearSelection}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Clear Selection
          </button>
          <button
            onClick={onAcceptSelected}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 
                       text-white font-medium rounded-lg transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Accept Selected
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 4. Celebration Toast Component

```typescript
// components/CelebrationToast.tsx

import { useEffect, useState } from 'react';

interface CelebrationToastProps {
  title: string;
  description: string;
  duration?: number;
}

export function CelebrationToast({ title, description, duration = 2000 }: CelebrationToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="bg-zinc-900 border border-green-500/30 rounded-2xl p-8 shadow-2xl 
                      shadow-green-500/10 animate-bounce-in text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-zinc-400 mt-2">{description}</p>
      </div>
    </div>
  );
}
```

### 5. Phase Empty State Component

```typescript
// components/PhaseEmptyState.tsx

interface PhaseEmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PhaseEmptyState({ icon, title, description, action }: PhaseEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">{icon}</div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-zinc-400 mt-2">{description}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white 
                       font-medium rounded-lg transition-all duration-200"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Acceptance Criteria

- [ ] Phase 1 shows only items with 85%+ confidence
- [ ] "Accept All" button accepts all visible matches
- [ ] Individual accept/reject buttons work on each card
- [ ] Checkbox selection allows multi-select
- [ ] Bulk action bar appears when items are selected
- [ ] "Select All" / "Deselect All" toggle works
- [ ] Celebration toast appears after bulk accept
- [ ] Auto-advance to next phase after acceptance (with brief delay)
- [ ] Empty state shown when no high-confidence matches exist
- [ ] "All done" state shown when all items in phase are mapped
- [ ] Already-mapped items shown in collapsed section

---

## Dependencies

- Ticket 01: Phased Wizard Structure (provides phase context)

## Blocks

Nothing - other phases can be built in parallel.
