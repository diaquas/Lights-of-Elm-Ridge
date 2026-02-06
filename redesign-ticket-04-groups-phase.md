# Ticket: Groups Phase

## Priority: P1

## Summary

Implement Phase 2 of the mapping wizard for matching model groups (MODEL_GRP type). This handles collections of independent models like "All Arches" or "14 All Window Frames".

---

## Current State

- Groups mixed in with all other items
- No distinction between MODEL_GRP and SUBMODEL_GRP
- Users can't easily see group membership

## Target State

- Phase 2 shows only MODEL_GRP items (not SUBMODEL_GRP)
- Group membership is expandable/collapsible
- Suggestions come from source groups with similar member counts
- Cascade preview shows what models will be affected

---

## Technical Implementation

### 1. Groups Phase Component

```typescript
// components/phases/GroupsPhase.tsx

import { useState } from 'react';
import { useMappingPhase } from '@/context/MappingPhaseContext';
import { useMappings } from '@/context/MappingsContext';
import { GroupCard } from '../GroupCard';
import { GroupDetailPanel } from '../GroupDetailPanel';
import { PhaseEmptyState } from '../PhaseEmptyState';
import { BulkActionBar } from '../BulkActionBar';

export function GroupsPhase() {
  const { phaseItems, goToNextPhase, phaseProgress } = useMappingPhase();
  const { mappings, acceptMatch } = useMappings();
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Separate mapped and unmapped
  const unmappedGroups = phaseItems.filter(item => !mappings.has(item.id));
  const mappedGroups = phaseItems.filter(item => mappings.has(item.id));
  
  // Selected group for detail panel
  const selectedGroup = phaseItems.find(g => g.id === selectedGroupId);
  
  // No groups to map
  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon="📁"
        title="No Model Groups Found"
        description="No model groups detected in your destination layout. Continue to individual models."
        action={{
          label: "Continue to Models",
          onClick: goToNextPhase
        }}
      />
    );
  }
  
  // All groups mapped
  if (unmappedGroups.length === 0) {
    return (
      <PhaseEmptyState
        icon="✅"
        title="All Groups Mapped!"
        description={`${mappedGroups.length} model groups have been matched.`}
        action={{
          label: "Continue to Models",
          onClick: goToNextPhase
        }}
      />
    );
  }
  
  return (
    <div className="flex h-full">
      {/* Left: Group List */}
      <div className="w-1/2 flex flex-col border-r border-zinc-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="text-2xl">📁</span>
                Model Groups
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {unmappedGroups.length} groups need matching • {mappedGroups.length} already mapped
              </p>
            </div>
          </div>
        </div>
        
        {/* Group List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {unmappedGroups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                isSelected={selectedGroupId === group.id}
                isChecked={selectedIds.has(group.id)}
                onClick={() => setSelectedGroupId(group.id)}
                onCheck={() => {
                  const newSelected = new Set(selectedIds);
                  if (newSelected.has(group.id)) {
                    newSelected.delete(group.id);
                  } else {
                    newSelected.add(group.id);
                  }
                  setSelectedIds(newSelected);
                }}
                onAccept={(sourceId) => {
                  acceptMatch(group.id, sourceId);
                  // Auto-select next unmapped group
                  const nextUnmapped = unmappedGroups.find(g => g.id !== group.id && !mappings.has(g.id));
                  setSelectedGroupId(nextUnmapped?.id || null);
                }}
              />
            ))}
          </div>
          
          {/* Already Mapped Section */}
          {mappedGroups.length > 0 && (
            <details className="mt-6">
              <summary className="text-sm text-zinc-500 cursor-pointer hover:text-zinc-400">
                {mappedGroups.length} groups already mapped
              </summary>
              <div className="mt-3 space-y-2 opacity-60">
                {mappedGroups.map(group => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isSelected={false}
                    isMapped={true}
                    mapping={mappings.get(group.id)}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
      
      {/* Right: Detail Panel */}
      <div className="w-1/2 flex flex-col bg-zinc-900/50">
        {selectedGroup ? (
          <GroupDetailPanel
            group={selectedGroup}
            onAccept={(sourceId) => {
              acceptMatch(selectedGroup.id, sourceId);
              const nextUnmapped = unmappedGroups.find(g => g.id !== selectedGroup.id);
              setSelectedGroupId(nextUnmapped?.id || null);
            }}
            onSkip={() => {
              const nextUnmapped = unmappedGroups.find(g => g.id !== selectedGroup.id);
              setSelectedGroupId(nextUnmapped?.id || null);
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            <div className="text-center">
              <div className="text-4xl mb-4">👈</div>
              <p>Select a group to see suggestions</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={unmappedGroups.length}
          onSelectAll={() => {
            if (selectedIds.size === unmappedGroups.length) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(unmappedGroups.map(g => g.id)));
            }
          }}
          onAcceptSelected={() => {
            // Accept best match for each selected
            unmappedGroups
              .filter(g => selectedIds.has(g.id) && g.bestMatch)
              .forEach(g => acceptMatch(g.id, g.bestMatch!.id));
            setSelectedIds(new Set());
          }}
          onClearSelection={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
```

### 2. Group Card Component

```typescript
// components/GroupCard.tsx

interface GroupCardProps {
  group: SourceItem;
  isSelected: boolean;
  isChecked?: boolean;
  isMapped?: boolean;
  mapping?: Mapping;
  onClick?: () => void;
  onCheck?: () => void;
  onAccept?: (sourceId: string) => void;
}

export function GroupCard({
  group,
  isSelected,
  isChecked = false,
  isMapped = false,
  mapping,
  onClick,
  onCheck,
  onAccept
}: GroupCardProps) {
  return (
    <div
      className={`
        p-4 rounded-lg border transition-all duration-200 cursor-pointer
        ${isMapped 
          ? 'bg-green-500/5 border-green-500/20' 
          : isSelected 
            ? 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/20' 
            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {!isMapped && onCheck && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCheck();
            }}
            className={`
              mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
              transition-all duration-200
              ${isChecked 
                ? 'bg-blue-500 border-blue-500' 
                : 'border-zinc-600 hover:border-zinc-500'}
            `}
          >
            {isChecked && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}
        
        {/* Group Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
              GRP
            </span>
            <span className="font-medium text-white truncate">{group.name}</span>
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
            <span>{group.memberCount} members</span>
            {group.groupType && (
              <span className="text-zinc-600">• {group.groupType}</span>
            )}
          </div>
          
          {/* Best match preview (if not mapped) */}
          {!isMapped && group.bestMatch && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-zinc-500">Suggested:</span>
              <span className="text-sm text-zinc-300">{group.bestMatch.name}</span>
              <span className={`
                px-2 py-0.5 text-xs rounded-full
                ${group.bestMatch.confidence >= 0.50 
                  ? 'bg-amber-500/10 text-amber-400' 
                  : 'bg-red-500/10 text-red-400'}
              `}>
                {Math.round(group.bestMatch.confidence * 100)}%
              </span>
            </div>
          )}
          
          {/* Mapped to (if mapped) */}
          {isMapped && mapping && (
            <div className="mt-2 flex items-center gap-2 text-green-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">→ {mapping.destinationName}</span>
            </div>
          )}
        </div>
        
        {/* Quick Accept */}
        {!isMapped && group.bestMatch && onAccept && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAccept(group.bestMatch!.id);
            }}
            className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 
                       transition-colors flex-shrink-0"
            title="Accept suggested match"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
```

### 3. Group Detail Panel Component

```typescript
// components/GroupDetailPanel.tsx

import { useMemo } from 'react';
import { useSourcePatterns } from '@/context/SourcePatternsContext';

interface GroupDetailPanelProps {
  group: SourceItem;
  onAccept: (sourceId: string) => void;
  onSkip: () => void;
}

export function GroupDetailPanel({ group, onAccept, onSkip }: GroupDetailPanelProps) {
  const { sourcePatterns } = useSourcePatterns();
  
  // Get potential matches (other groups with similar member counts)
  const potentialMatches = useMemo(() => {
    return sourcePatterns
      .filter(s => s.type === 'GROUP' || s.name.includes('GRP') || s.name.startsWith('All '))
      .map(s => ({
        ...s,
        confidence: calculateGroupMatchConfidence(group, s)
      }))
      .filter(s => s.confidence > 0.2)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);
  }, [group, sourcePatterns]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Group Header */}
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
            MODEL_GRP
          </span>
        </div>
        <h3 className="text-xl font-semibold text-white">{group.name}</h3>
        <p className="text-sm text-zinc-400 mt-1">
          {group.memberCount} members • {group.groupType || 'Group-only'}
        </p>
      </div>
      
      {/* Members Preview */}
      {group.members && group.members.length > 0 && (
        <div className="px-6 py-4 border-b border-zinc-800">
          <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
            Group Members
          </h4>
          <div className="flex flex-wrap gap-2">
            {group.members.slice(0, 8).map((member, i) => (
              <span 
                key={i}
                className="px-2 py-1 text-xs bg-zinc-800 text-zinc-300 rounded"
              >
                {member}
              </span>
            ))}
            {group.members.length > 8 && (
              <span className="px-2 py-1 text-xs bg-zinc-800 text-zinc-500 rounded">
                +{group.members.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Suggested Matches */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Suggested Source Matches
        </h4>
        
        {potentialMatches.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <p>No good matches found for this group.</p>
            <button
              onClick={onSkip}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Skip this group
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {potentialMatches.map((match, index) => (
              <button
                key={match.id}
                onClick={() => onAccept(match.id)}
                className={`
                  w-full p-4 rounded-lg text-left transition-all duration-200
                  ${index === 0 
                    ? 'bg-green-500/10 border border-green-500/30 hover:border-green-500/50' 
                    : 'bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded">
                          BEST
                        </span>
                      )}
                      <span className="font-medium text-white">{match.name}</span>
                    </div>
                    {match.memberCount && (
                      <span className="text-sm text-zinc-500 mt-1">
                        {match.memberCount} members
                      </span>
                    )}
                  </div>
                  <span className={`
                    px-3 py-1 rounded-full text-sm font-semibold
                    ${match.confidence >= 0.50 
                      ? 'bg-amber-500/10 text-amber-400' 
                      : 'bg-red-500/10 text-red-400'}
                  `}>
                    {Math.round(match.confidence * 100)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Skip Button */}
      <div className="px-6 py-4 border-t border-zinc-800">
        <button
          onClick={onSkip}
          className="w-full py-3 text-zinc-400 hover:text-zinc-300 
                     border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
        >
          Skip This Group
        </button>
      </div>
    </div>
  );
}

function calculateGroupMatchConfidence(dest: SourceItem, source: any): number {
  let confidence = 0;
  
  // Name similarity
  const destWords = new Set(dest.name.toLowerCase().split(/\W+/));
  const sourceWords = new Set(source.name.toLowerCase().split(/\W+/));
  const commonWords = [...destWords].filter(w => sourceWords.has(w) && w.length > 2);
  confidence += Math.min(commonWords.length * 0.15, 0.45);
  
  // Member count similarity
  if (dest.memberCount && source.memberCount) {
    const ratio = Math.min(dest.memberCount, source.memberCount) / 
                  Math.max(dest.memberCount, source.memberCount);
    confidence += ratio * 0.3;
  }
  
  // Both are groups
  if (source.type === 'GROUP' || source.name.includes('GRP')) {
    confidence += 0.15;
  }
  
  return Math.min(confidence, 1);
}
```

---

## Acceptance Criteria

- [ ] Phase 2 shows only MODEL_GRP items (not SUBMODEL_GRP)
- [ ] Groups display member count
- [ ] Clicking a group shows detail panel on right
- [ ] Detail panel shows group members preview
- [ ] Suggested matches sorted by confidence
- [ ] Quick accept button on group cards
- [ ] Checkbox selection for bulk operations
- [ ] Already-mapped groups in collapsible section
- [ ] Skip button moves to next group
- [ ] Auto-advances to next unmapped group after accept

---

## Dependencies

- Ticket 01: Phased Wizard Structure

## Blocks

Nothing.
