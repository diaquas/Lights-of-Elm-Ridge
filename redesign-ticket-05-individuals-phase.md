# Ticket: Individuals Phase with Enhanced Drag-Drop

## Priority: P1

## Summary

Implement Phase 3 for matching individual models (non-groups) with enhanced drag-and-drop feedback including magnetic snapping, visual drop zones, and satisfying animations.

---

## Target State

- Phase 3 shows only individual MODEL items (not groups)
- Traditional two-panel layout (destination left, source right)
- Enhanced drag-drop with visual feedback
- Suggestions shown inline with each destination item
- Right panel is context-aware and searchable

---

## Technical Implementation

### 1. Individuals Phase Component

```typescript
// components/phases/IndividualsPhase.tsx

import { useState, useCallback } from 'react';
import { DndContext, DragOverlay, closestCenter, DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { useMappingPhase } from '@/context/MappingPhaseContext';
import { useMappings } from '@/context/MappingsContext';
import { DestinationList } from '../DestinationList';
import { SourcePanel } from '../SourcePanel';
import { DragPreview } from '../DragPreview';
import { PhaseEmptyState } from '../PhaseEmptyState';

export function IndividualsPhase() {
  const { phaseItems, goToNextPhase } = useMappingPhase();
  const { mappings, acceptMatch, sourcePatterns } = useMappings();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredDestId, setHoveredDestId] = useState<string | null>(null);
  
  const unmappedItems = phaseItems.filter(item => !mappings.has(item.id));
  const mappedItems = phaseItems.filter(item => mappings.has(item.id));
  
  // Get the item being dragged
  const activeItem = activeId 
    ? sourcePatterns.find(s => s.id === activeId) 
    : null;
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    document.body.style.cursor = 'grabbing';
  }, []);
  
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setHoveredDestId(over?.id as string || null);
  }, []);
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      acceptMatch(over.id as string, active.id as string);
    }
    
    setActiveId(null);
    setHoveredDestId(null);
    document.body.style.cursor = '';
  }, [acceptMatch]);
  
  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setHoveredDestId(null);
    document.body.style.cursor = '';
  }, []);
  
  // Empty state
  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon="🎯"
        title="No Individual Models"
        description="All items are either groups or spinner submodels. Continue to spinners."
        action={{
          label: "Continue to Spinners",
          onClick: goToNextPhase
        }}
      />
    );
  }
  
  // All done
  if (unmappedItems.length === 0) {
    return (
      <PhaseEmptyState
        icon="✅"
        title="All Models Mapped!"
        description={`${mappedItems.length} individual models have been matched.`}
        action={{
          label: "Continue to Spinners",
          onClick: goToNextPhase
        }}
      />
    );
  }
  
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full">
        {/* Left: Destination Items */}
        <div className="w-1/2 flex flex-col border-r border-zinc-800">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              Individual Models
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {unmappedItems.length} models need matching • Drag from right or click suggestions
            </p>
          </div>
          
          <DestinationList
            items={unmappedItems}
            mappedItems={mappedItems}
            hoveredDestId={hoveredDestId}
            isDragging={!!activeId}
            onAcceptSuggestion={(destId, sourceId) => acceptMatch(destId, sourceId)}
          />
        </div>
        
        {/* Right: Source Panel */}
        <div className="w-1/2 flex flex-col bg-zinc-900/50">
          <SourcePanel
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeId={activeId}
          />
        </div>
      </div>
      
      {/* Drag Overlay */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeItem && (
          <DragPreview item={activeItem} />
        )}
      </DragOverlay>
    </DndContext>
  );
}
```

### 2. Destination List with Drop Zones

```typescript
// components/DestinationList.tsx

import { useDroppable } from '@dnd-kit/core';

interface DestinationListProps {
  items: SourceItem[];
  mappedItems: SourceItem[];
  hoveredDestId: string | null;
  isDragging: boolean;
  onAcceptSuggestion: (destId: string, sourceId: string) => void;
}

export function DestinationList({
  items,
  mappedItems,
  hoveredDestId,
  isDragging,
  onAcceptSuggestion
}: DestinationListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="space-y-2">
        {items.map(item => (
          <DestinationDropZone
            key={item.id}
            item={item}
            isHovered={hoveredDestId === item.id}
            isDragging={isDragging}
            onAcceptSuggestion={(sourceId) => onAcceptSuggestion(item.id, sourceId)}
          />
        ))}
      </div>
      
      {/* Already Mapped */}
      {mappedItems.length > 0 && (
        <details className="mt-6">
          <summary className="text-sm text-zinc-500 cursor-pointer hover:text-zinc-400">
            {mappedItems.length} already mapped
          </summary>
          <div className="mt-3 space-y-2 opacity-60">
            {mappedItems.map(item => (
              <MappedItemCard key={item.id} item={item} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function DestinationDropZone({
  item,
  isHovered,
  isDragging,
  onAcceptSuggestion
}: {
  item: SourceItem;
  isHovered: boolean;
  isDragging: boolean;
  onAcceptSuggestion: (sourceId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: item.id,
  });
  
  return (
    <div
      ref={setNodeRef}
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200
        ${isOver || isHovered
          ? 'border-green-500 bg-green-500/10 scale-[1.02] shadow-lg shadow-green-500/20' 
          : isDragging 
            ? 'border-dashed border-zinc-600 bg-zinc-900/50' 
            : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}
      `}
    >
      {/* Drop indicator */}
      {(isOver || isHovered) && (
        <div className="absolute inset-0 rounded-lg bg-green-500/5 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center gap-2 text-green-400 font-medium">
              <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Drop here
            </div>
          </div>
        </div>
      )}
      
      {/* Item content */}
      <div className={`${(isOver || isHovered) ? 'opacity-30' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-white">{item.name}</div>
            {item.pixelCount && (
              <div className="text-sm text-zinc-500 mt-0.5">{item.pixelCount} pixels</div>
            )}
          </div>
          
          {/* Inline suggestion */}
          {item.bestMatch && !isDragging && (
            <button
              onClick={() => onAcceptSuggestion(item.bestMatch!.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 
                         hover:bg-zinc-700 transition-colors group"
            >
              <span className="text-sm text-zinc-400 group-hover:text-zinc-300">
                {item.bestMatch.name}
              </span>
              <span className={`
                text-xs px-2 py-0.5 rounded-full
                ${item.bestMatch.confidence >= 0.50 
                  ? 'bg-amber-500/20 text-amber-400' 
                  : 'bg-zinc-700 text-zinc-400'}
              `}>
                {Math.round(item.bestMatch.confidence * 100)}%
              </span>
              <svg className="w-4 h-4 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MappedItemCard({ item }: { item: SourceItem }) {
  return (
    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
      <div className="flex items-center justify-between">
        <span className="font-medium text-zinc-300">{item.name}</span>
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Mapped</span>
        </div>
      </div>
    </div>
  );
}
```

### 3. Source Panel with Draggables

```typescript
// components/SourcePanel.tsx

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useSourcePatterns } from '@/context/SourcePatternsContext';
import { useMappings } from '@/context/MappingsContext';

interface SourcePanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeId: string | null;
}

export function SourcePanel({ searchQuery, onSearchChange, activeId }: SourcePanelProps) {
  const { sourcePatterns } = useSourcePatterns();
  const { usedSourceIds } = useMappings();
  
  // Filter by search and exclude already-used
  const availablePatterns = sourcePatterns
    .filter(s => !usedSourceIds.has(s.id))
    .filter(s => s.type === 'MODEL' || !s.type) // Only individual models
    .filter(s => {
      if (!searchQuery) return true;
      return s.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  
  const usedPatterns = sourcePatterns.filter(s => usedSourceIds.has(s.id));
  
  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="px-6 py-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Source Patterns
        </h3>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search patterns..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>
        <div className="text-xs text-zinc-500 mt-2">
          {availablePatterns.length} available • {usedPatterns.length} used
        </div>
      </div>
      
      {/* Draggable List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-2">
          {availablePatterns.map(pattern => (
            <DraggableSource
              key={pattern.id}
              pattern={pattern}
              isDragging={activeId === pattern.id}
            />
          ))}
        </div>
        
        {availablePatterns.length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            {searchQuery ? 'No matches found' : 'All patterns have been used'}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableSource({ 
  pattern, 
  isDragging 
}: { 
  pattern: SourcePattern; 
  isDragging: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({
    id: pattern.id,
  });
  
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        p-3 rounded-lg border transition-all duration-200 cursor-grab active:cursor-grabbing
        ${isDragging 
          ? 'opacity-50 scale-95 border-blue-500 bg-blue-500/10' 
          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600 hover:bg-zinc-750'}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Drag handle indicator */}
          <svg className="w-4 h-4 text-zinc-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
          <span className="font-medium text-white">{pattern.name}</span>
        </div>
      </div>
    </div>
  );
}
```

### 4. Drag Preview Component

```typescript
// components/DragPreview.tsx

export function DragPreview({ item }: { item: SourcePattern }) {
  return (
    <div className="p-4 rounded-lg bg-blue-600 border-2 border-blue-400 
                    shadow-2xl shadow-blue-500/30 transform rotate-2 scale-105">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
        <span className="font-semibold text-white">{item.name}</span>
      </div>
    </div>
  );
}
```

### 5. Success Toast with Animation

```typescript
// components/MappingSuccessToast.tsx

import { useEffect, useState } from 'react';

interface MappingSuccessToastProps {
  sourceName: string;
  destName: string;
  onComplete: () => void;
}

export function MappingSuccessToast({ sourceName, destName, onComplete }: MappingSuccessToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="flex items-center gap-3 px-4 py-3 bg-green-600 rounded-lg shadow-xl">
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <div className="text-white">
          <span className="font-medium">{sourceName}</span>
          <span className="text-green-200 mx-2">→</span>
          <span className="font-medium">{destName}</span>
        </div>
      </div>
    </div>
  );
}
```

### 6. CSS Animations

```css
/* Add to global CSS or Tailwind config */

@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes bounce-in {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes magnetic-snap {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

.animate-bounce-in {
  animation: bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.animate-magnetic-snap {
  animation: magnetic-snap 0.15s ease-out;
}
```

---

## Dependencies

```json
{
  "@dnd-kit/core": "^6.0.8",
  "@dnd-kit/sortable": "^7.0.2",
  "@dnd-kit/utilities": "^3.2.1"
}
```

Install with:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Acceptance Criteria

- [ ] Phase 3 shows only individual MODEL items
- [ ] Two-panel layout: destinations left, sources right
- [ ] Source items are draggable with grab cursor
- [ ] Destination items act as drop zones
- [ ] Drop zones highlight green on hover during drag
- [ ] "Drop here" indicator appears on valid zones
- [ ] Drag preview shows lifted item with shadow
- [ ] Success toast appears after mapping
- [ ] Search filters source list
- [ ] Inline suggestions on destination items
- [ ] Click suggestion to quick-accept
- [ ] Already-mapped items in collapsible section
- [ ] Used sources removed from available list

---

## Visual Feedback States

| State | Visual |
|-------|--------|
| Default | `border-zinc-800 bg-zinc-900` |
| Dragging active | Item at 50% opacity, slight scale down |
| Drop zone (inactive) | Dashed border when any drag active |
| Drop zone (hover) | Green border, green bg glow, scale up 2% |
| Drop preview | Rotated 2°, shadow, blue accent |
| Success | Toast slides up from bottom right |

---

## Dependencies

- Ticket 01: Phased Wizard Structure

## Blocks

Nothing.
