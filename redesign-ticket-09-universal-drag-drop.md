# Ticket: Universal Drag-Drop & Search Across All Phases

## Priority: P0 (Quick Follow-up)

## Summary

Drag-and-drop and full source search must be available on ALL mapping phases, not just Groups. Users should always have the option to manually map any item to any available source.

---

## Requirement

Every phase that shows mappable items needs:
1. **Draggable sources** in the right panel
2. **Droppable destinations** in the left panel  
3. **Search all sources** functionality
4. **Click-to-accept** on any source (not just suggestions)

---

## Phases Affected

| Phase | Has Drag-Drop? | Needs It? |
|-------|---------------|-----------|
| Upload | N/A | N/A |
| Auto-Matches | ❌ No | ✅ Yes - for manual overrides |
| Groups | ❌ No | ✅ Yes |
| Models | ❌ No | ✅ Yes |
| Spinners | ❌ No | ✅ Yes |
| Review | N/A | N/A (editing only) |

---

## Implementation Pattern

Create a reusable `MappingDndContext` wrapper that all phases use:

```tsx
// components/MappingDndContext.tsx

import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { useMappings } from '@/context/MappingsContext';

interface MappingDndContextProps {
  children: React.ReactNode;
  onMappingComplete?: (destId: string, sourceId: string) => void;
}

export function MappingDndContext({ children, onMappingComplete }: MappingDndContextProps) {
  const { acceptMatch, sourcePatterns } = useMappings();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const activeItem = activeId 
    ? sourcePatterns.find(s => s.id === activeId) 
    : null;
  
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={(e) => {
        if (e.over && e.active.id !== e.over.id) {
          acceptMatch(e.over.id as string, e.active.id as string);
          onMappingComplete?.(e.over.id as string, e.active.id as string);
        }
        setActiveId(null);
      }}
      onDragCancel={() => setActiveId(null)}
    >
      {children}
      
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
        {activeItem && <DragPreview item={activeItem} />}
      </DragOverlay>
    </DndContext>
  );
}
```

---

## Reusable Source Panel Component

Create ONE source panel component used by all phases:

```tsx
// components/UniversalSourcePanel.tsx

interface UniversalSourcePanelProps {
  /** Filter sources shown (e.g., only groups, only spinners) */
  sourceFilter?: (source: SourcePattern) => boolean;
  /** Suggested matches to highlight at top */
  suggestions?: SuggestedMatch[];
  /** Called when user clicks a source (not drag) */
  onSourceClick?: (sourceId: string) => void;
  /** Currently selected destination (for context) */
  selectedDestination?: SourceItem | null;
}

export function UniversalSourcePanel({
  sourceFilter,
  suggestions = [],
  onSourceClick,
  selectedDestination
}: UniversalSourcePanelProps) {
  const { sourcePatterns } = useSourcePatterns();
  const { usedSourceIds } = useMappings();
  const [searchQuery, setSearchQuery] = useState('');
  
  // All available (unmapped) sources
  const availableSources = sourcePatterns
    .filter(s => !usedSourceIds.has(s.id))
    .filter(sourceFilter || (() => true));
  
  // Filter by search
  const filteredSources = searchQuery
    ? availableSources.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableSources;
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
          {selectedDestination ? `Match for: ${selectedDestination.name}` : 'Available Sources'}
        </h3>
      </div>
      
      {/* Suggestions (if any) */}
      {suggestions.length > 0 && (
        <div className="flex-shrink-0 px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            ✨ AI Suggestions
          </h4>
          <div className="space-y-2">
            {suggestions.map((match, i) => (
              <DraggableSuggestion
                key={match.id}
                match={match}
                isBest={i === 0}
                onClick={() => onSourceClick?.(match.id)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Search */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-zinc-800">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search all sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 text-sm"
          />
        </div>
        <div className="text-xs text-zinc-600 mt-2">
          {filteredSources.length} available • Drag to map or click to select
        </div>
      </div>
      
      {/* All Sources (scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        <div className="space-y-1">
          {filteredSources.map(source => (
            <DraggableSourceItem
              key={source.id}
              source={source}
              onClick={() => onSourceClick?.(source.id)}
            />
          ))}
          
          {filteredSources.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              {searchQuery ? 'No matches found' : 'All sources have been mapped'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Usage in Each Phase

### Auto-Matches Phase
```tsx
export function AutoAcceptPhase() {
  return (
    <MappingDndContext>
      <div className="flex h-full">
        {/* Left: Auto-match cards (droppable for overrides) */}
        <div className="w-1/2 ...">
          {autoMatchItems.map(item => (
            <DroppableMatchCard key={item.id} item={item} />
          ))}
        </div>
        
        {/* Right: All sources for manual override */}
        <UniversalSourcePanel
          suggestions={[]} // No suggestions - these are auto-matches
          onSourceClick={(sourceId) => {/* handle click */}}
        />
      </div>
    </MappingDndContext>
  );
}
```

### Groups Phase
```tsx
export function GroupsPhase() {
  return (
    <MappingDndContext>
      <div className="flex h-full">
        <div className="w-1/2 ...">
          {groups.map(group => (
            <DroppableGroupCard key={group.id} group={group} />
          ))}
        </div>
        
        <UniversalSourcePanel
          sourceFilter={(s) => s.type === 'GROUP' || s.name.includes('GRP')}
          suggestions={selectedGroup?.suggestions || []}
          selectedDestination={selectedGroup}
          onSourceClick={(sourceId) => acceptMatch(selectedGroup.id, sourceId)}
        />
      </div>
    </MappingDndContext>
  );
}
```

### Models Phase
```tsx
export function IndividualsPhase() {
  return (
    <MappingDndContext>
      <div className="flex h-full">
        <div className="w-1/2 ...">
          {models.map(model => (
            <DroppableModelCard key={model.id} model={model} />
          ))}
        </div>
        
        <UniversalSourcePanel
          sourceFilter={(s) => s.type === 'MODEL' || !s.type}
          suggestions={selectedModel?.suggestions || []}
          selectedDestination={selectedModel}
          onSourceClick={(sourceId) => acceptMatch(selectedModel.id, sourceId)}
        />
      </div>
    </MappingDndContext>
  );
}
```

### Spinners Phase
```tsx
export function SpinnersPhase() {
  // Even in the category wizard, allow manual override
  return (
    <MappingDndContext>
      <div className="flex h-full">
        <div className="w-1/2 ...">
          {/* Current spinner item */}
          <DroppableSpinnerCard spinner={currentSpinner} />
        </div>
        
        <UniversalSourcePanel
          sourceFilter={(s) => s.type === 'SUBMODEL_GRP' || s.name.startsWith('S - ')}
          suggestions={semanticMatches}
          selectedDestination={currentSpinner}
          onSourceClick={(sourceId) => acceptMatch(currentSpinner.id, sourceId)}
        />
      </div>
    </MappingDndContext>
  );
}
```

---

## Key Principle

> **Every mapping screen = Left panel (droppable destinations) + Right panel (draggable sources with search)**

The right panel should ALWAYS show:
1. AI suggestions at top (context-aware)
2. Search input
3. Full scrollable list of ALL available sources

Users can:
- **Drag** any source → drop on any destination
- **Click** any source → maps to currently selected destination
- **Search** to find any source by name

---

## Acceptance Criteria

- [ ] `MappingDndContext` wrapper created and used by all phases
- [ ] `UniversalSourcePanel` component created with search + suggestions + full list
- [ ] Auto-Matches phase has drag-drop for manual overrides
- [ ] Groups phase has drag-drop + search
- [ ] Models phase has drag-drop + search  
- [ ] Spinners phase has drag-drop + search (even within category wizard)
- [ ] All phases show "X available • Drag to map or click to select" hint
- [ ] Dragging shows consistent preview across all phases
