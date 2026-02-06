# Ticket: Review Phase with Summary & Export

## Priority: P1

## Summary

Implement the final phase of the wizard where users review all mappings, see a summary of their work, and export the completed configuration.

---

## Target State

- Summary view showing all mappings organized by category
- Visual breakdown (pie chart or stats) of mapping sources
- Ability to undo/edit individual mappings
- Export button generates final output
- Celebration moment when complete

---

## Technical Implementation

### 1. Review Phase Component

```typescript
// components/phases/ReviewPhase.tsx

import { useState, useMemo } from 'react';
import { useMappingPhase } from '@/context/MappingPhaseContext';
import { useMappings } from '@/context/MappingsContext';
import { ReviewSummaryCard } from '../ReviewSummaryCard';
import { MappingTable } from '../MappingTable';
import { ExportButton } from '../ExportButton';
import { CelebrationOverlay } from '../CelebrationOverlay';

type ViewMode = 'summary' | 'details';

export function ReviewPhase() {
  const { overallProgress } = useMappingPhase();
  const { mappings, allItems, removeMapping, exportMappings } = useMappings();
  
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Categorize mappings
  const stats = useMemo(() => {
    const mapped = allItems.filter(item => mappings.has(item.id));
    const unmapped = allItems.filter(item => !mappings.has(item.id));
    
    const byType = {
      autoAccepted: mapped.filter(m => m.mappingSource === 'auto').length,
      groups: mapped.filter(m => m.type === 'MODEL_GRP').length,
      individuals: mapped.filter(m => m.type === 'MODEL').length,
      spinners: mapped.filter(m => m.type === 'SUBMODEL_GRP').length,
    };
    
    const byConfidence = {
      high: mapped.filter(m => (m.confidence || 0) >= 0.85).length,
      medium: mapped.filter(m => (m.confidence || 0) >= 0.50 && (m.confidence || 0) < 0.85).length,
      low: mapped.filter(m => (m.confidence || 0) < 0.50).length,
    };
    
    return {
      total: allItems.length,
      mapped: mapped.length,
      unmapped: unmapped.length,
      percentage: Math.round((mapped.length / allItems.length) * 100),
      byType,
      byConfidence,
      mappedItems: mapped,
      unmappedItems: unmapped,
    };
  }, [allItems, mappings]);
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportMappings();
      setShowCelebration(true);
    } finally {
      setIsExporting(false);
    }
  };
  
  const isComplete = stats.unmapped === 0;
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Review Mappings
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {stats.mapped} of {stats.total} layers mapped ({stats.percentage}%)
            </p>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${viewMode === 'summary' 
                  ? 'bg-zinc-700 text-white' 
                  : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              Summary
            </button>
            <button
              onClick={() => setViewMode('details')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${viewMode === 'details' 
                  ? 'bg-zinc-700 text-white' 
                  : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              Details
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'summary' ? (
          <ReviewSummaryView stats={stats} />
        ) : (
          <ReviewDetailsView 
            mappedItems={stats.mappedItems}
            unmappedItems={stats.unmappedItems}
            mappings={mappings}
            onRemoveMapping={removeMapping}
          />
        )}
      </div>
      
      {/* Export Footer */}
      <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between">
          {/* Unmapped Warning */}
          {stats.unmapped > 0 && (
            <div className="flex items-center gap-2 text-amber-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">
                {stats.unmapped} layers not mapped — they will use defaults
              </span>
            </div>
          )}
          
          {isComplete && (
            <div className="flex items-center gap-2 text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">All layers mapped!</span>
            </div>
          )}
          
          {/* Export Button */}
          <ExportButton
            onClick={handleExport}
            isLoading={isExporting}
            isComplete={isComplete}
            mappedCount={stats.mapped}
          />
        </div>
      </div>
      
      {/* Celebration Overlay */}
      {showCelebration && (
        <CelebrationOverlay
          mappedCount={stats.mapped}
          onDismiss={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
```

### 2. Summary View with Stats

```typescript
// components/ReviewSummaryView.tsx

interface ReviewSummaryViewProps {
  stats: {
    total: number;
    mapped: number;
    unmapped: number;
    percentage: number;
    byType: {
      autoAccepted: number;
      groups: number;
      individuals: number;
      spinners: number;
    };
    byConfidence: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

export function ReviewSummaryView({ stats }: ReviewSummaryViewProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Hero Stats */}
      <div className="text-center py-8">
        <div className="text-7xl font-bold text-white mb-2">
          {stats.percentage}%
        </div>
        <div className="text-xl text-zinc-400">
          {stats.mapped} of {stats.total} layers mapped
        </div>
        
        {/* Progress Ring */}
        <div className="mt-6 flex justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-zinc-800"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-green-500"
                strokeDasharray={`${stats.percentage * 3.52} 352`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">
                {stats.percentage === 100 ? '✨' : '📊'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Breakdown Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* By Type */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
            Mapping Sources
          </h3>
          <div className="space-y-3">
            <StatRow 
              label="Auto-Accepted (85%+)" 
              value={stats.byType.autoAccepted} 
              color="bg-green-500" 
            />
            <StatRow 
              label="Model Groups" 
              value={stats.byType.groups} 
              color="bg-blue-500" 
            />
            <StatRow 
              label="Individual Models" 
              value={stats.byType.individuals} 
              color="bg-purple-500" 
            />
            <StatRow 
              label="Spinner Submodels" 
              value={stats.byType.spinners} 
              color="bg-pink-500" 
            />
          </div>
        </div>
        
        {/* By Confidence */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
            Confidence Distribution
          </h3>
          <div className="space-y-3">
            <StatRow 
              label="High (85%+)" 
              value={stats.byConfidence.high} 
              color="bg-green-500" 
            />
            <StatRow 
              label="Medium (50-84%)" 
              value={stats.byConfidence.medium} 
              color="bg-amber-500" 
            />
            <StatRow 
              label="Low (<50%)" 
              value={stats.byConfidence.low} 
              color="bg-red-500" 
            />
          </div>
        </div>
      </div>
      
      {/* Unmapped Warning */}
      {stats.unmapped > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-amber-400">
                {stats.unmapped} Unmapped Layers
              </h4>
              <p className="text-sm text-zinc-400 mt-1">
                These layers will use default settings when exported. You can go back 
                to previous phases to map them, or export anyway.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm text-zinc-300">{label}</span>
      </div>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
```

### 3. Details View with Editable Table

```typescript
// components/ReviewDetailsView.tsx

import { useState } from 'react';

interface ReviewDetailsViewProps {
  mappedItems: SourceItem[];
  unmappedItems: SourceItem[];
  mappings: Map<string, Mapping>;
  onRemoveMapping: (destId: string) => void;
}

export function ReviewDetailsView({ 
  mappedItems, 
  unmappedItems, 
  mappings,
  onRemoveMapping 
}: ReviewDetailsViewProps) {
  const [filter, setFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [search, setSearch] = useState('');
  
  const displayItems = filter === 'mapped' 
    ? mappedItems 
    : filter === 'unmapped' 
      ? unmappedItems 
      : [...mappedItems, ...unmappedItems];
  
  const filteredItems = displayItems.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="p-6">
      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search mappings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          {(['all', 'mapped', 'unmapped'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize
                ${filter === f 
                  ? 'bg-zinc-700 text-white' 
                  : 'text-zinc-400 hover:text-zinc-300'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      
      {/* Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Destination
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Mapped To
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Confidence
              </th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredItems.map(item => {
              const mapping = mappings.get(item.id);
              const isMapped = !!mapping;
              
              return (
                <tr key={item.id} className="hover:bg-zinc-800/50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">{item.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded
                      ${item.type === 'MODEL_GRP' ? 'bg-blue-500/20 text-blue-400' :
                        item.type === 'SUBMODEL_GRP' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-zinc-700 text-zinc-400'}
                    `}>
                      {item.type || 'MODEL'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isMapped ? (
                      <span className="text-zinc-300">{mapping.sourceName}</span>
                    ) : (
                      <span className="text-zinc-600 italic">Not mapped</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isMapped && mapping.confidence && (
                      <span className={`
                        px-2 py-0.5 text-xs font-semibold rounded-full
                        ${mapping.confidence >= 0.85 ? 'bg-green-500/20 text-green-400' :
                          mapping.confidence >= 0.50 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'}
                      `}>
                        {Math.round(mapping.confidence * 100)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isMapped && (
                      <button
                        onClick={() => onRemoveMapping(item.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 
                                   rounded transition-colors"
                        title="Remove mapping"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            No items match your search
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4. Export Button Component

```typescript
// components/ExportButton.tsx

interface ExportButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isComplete: boolean;
  mappedCount: number;
}

export function ExportButton({ onClick, isLoading, isComplete, mappedCount }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-lg font-semibold
        transition-all duration-200 shadow-lg
        ${isComplete 
          ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20' 
          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'}
        ${isLoading ? 'opacity-75 cursor-wait' : ''}
      `}
    >
      {isLoading ? (
        <>
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Exporting...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export {mappedCount} Mappings
        </>
      )}
    </button>
  );
}
```

### 5. Celebration Overlay

```typescript
// components/CelebrationOverlay.tsx

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

interface CelebrationOverlayProps {
  mappedCount: number;
  onDismiss: () => void;
}

export function CelebrationOverlay({ mappedCount, onDismiss }: CelebrationOverlayProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onDismiss]);
  
  if (!isVisible) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onDismiss}
    >
      <div className="text-center animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className="text-8xl mb-6">✨</div>
        <h2 className="text-4xl font-bold text-white mb-4">
          All Layers Mapped!
        </h2>
        <p className="text-xl text-zinc-400 mb-8">
          {mappedCount} mappings exported successfully
        </p>
        <button
          onClick={onDismiss}
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white 
                     font-medium rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
```

---

## Dependencies

```bash
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```

---

## Acceptance Criteria

- [ ] Summary view shows overall completion percentage
- [ ] Progress ring animates on load
- [ ] Breakdown by mapping type (auto, groups, individuals, spinners)
- [ ] Breakdown by confidence level
- [ ] Warning shown if unmapped items exist
- [ ] Details view shows searchable/filterable table
- [ ] Can filter by all/mapped/unmapped
- [ ] Remove mapping button works
- [ ] Export button shows count
- [ ] Loading state during export
- [ ] Confetti fires on successful export
- [ ] Celebration overlay shows success message
- [ ] Auto-dismiss celebration after 3 seconds

---

## Dependencies

- Ticket 01: Phased Wizard Structure

## Blocks

Nothing - this is the final phase.
