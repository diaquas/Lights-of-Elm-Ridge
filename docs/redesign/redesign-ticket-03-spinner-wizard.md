# Ticket: Spinner Submodel Mini-Wizard

## Priority: P0 (Critical for Mapping Quality)

## Summary

Implement a dedicated mini-wizard for matching spinner submodel groups (SUBMODEL_GRP type). This is the "nuanced" part of mapping that requires semantic category matching rather than simple name matching.

---

## Problem

Spinner submodel groups like "GE SpinReel Max Ribbons GRP" should match "S - Cascading Petal" because they're both in the SCALLOPS/RIBBONS semantic category. But:

1. Current algorithm matches them to irrelevant items like "Driveway Left"
2. Users don't understand why "Ribbons" should match "Petal"
3. There's no guidance through the semantic matching process

## Solution

A dedicated wizard that:
1. Detects and displays semantic categories
2. Groups destination spinners by category
3. Shows category-appropriate source matches
4. Guides user through one category at a time

---

## Technical Implementation

### 1. Spinner Phase Component

```typescript
// components/phases/SpinnersPhase.tsx

import { useState, useMemo } from 'react';
import { useMappingPhase } from '@/context/MappingPhaseContext';
import { useMappings } from '@/context/MappingsContext';
import { getSpinnerSemanticCategory, SEMANTIC_CATEGORIES } from '@/lib/spinnerCategories';
import { SpinnerCategoryStep } from '../SpinnerCategoryStep';
import { SpinnerIntroScreen } from '../SpinnerIntroScreen';
import { PhaseEmptyState } from '../PhaseEmptyState';

type SpinnerWizardStep = 'intro' | 'category' | 'complete';

export function SpinnersPhase() {
  const { phaseItems, goToNextPhase } = useMappingPhase();
  const { mappings } = useMappings();
  
  const [wizardStep, setWizardStep] = useState<SpinnerWizardStep>('intro');
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  
  // Group items by semantic category
  const categorizedItems = useMemo(() => {
    const groups: Record<string, typeof phaseItems> = {};
    
    phaseItems.forEach(item => {
      const category = getSpinnerSemanticCategory(item.name);
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    
    // Sort categories by item count (most items first)
    return Object.entries(groups)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([category, items]) => ({
        category,
        label: SEMANTIC_CATEGORIES[category]?.label || category,
        description: SEMANTIC_CATEGORIES[category]?.description || '',
        items,
        mappedCount: items.filter(i => mappings.has(i.id)).length
      }));
  }, [phaseItems, mappings]);
  
  // Calculate overall spinner progress
  const totalSpinners = phaseItems.length;
  const mappedSpinners = phaseItems.filter(i => mappings.has(i.id)).length;
  
  // No spinners to map
  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon="🎡"
        title="No Spinner Submodel Groups"
        description="No spinner submodel groups detected in your destination layout. Continue to review."
        action={{
          label: "Continue to Review",
          onClick: goToNextPhase
        }}
      />
    );
  }
  
  // Intro screen
  if (wizardStep === 'intro') {
    return (
      <SpinnerIntroScreen
        categories={categorizedItems}
        totalSpinners={totalSpinners}
        onStart={() => setWizardStep('category')}
        onSkip={goToNextPhase}
      />
    );
  }
  
  // All categories complete
  if (currentCategoryIndex >= categorizedItems.length || wizardStep === 'complete') {
    return (
      <PhaseEmptyState
        icon="✨"
        title="Spinner Matching Complete!"
        description={`${mappedSpinners} of ${totalSpinners} spinner submodel groups matched.`}
        action={{
          label: "Continue to Review",
          onClick: goToNextPhase
        }}
      />
    );
  }
  
  // Current category
  const currentCategory = categorizedItems[currentCategoryIndex];
  
  const handleCategoryComplete = () => {
    if (currentCategoryIndex < categorizedItems.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
    } else {
      setWizardStep('complete');
    }
  };
  
  const handleBack = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
    } else {
      setWizardStep('intro');
    }
  };
  
  return (
    <SpinnerCategoryStep
      category={currentCategory}
      categoryIndex={currentCategoryIndex}
      totalCategories={categorizedItems.length}
      overallProgress={{ mapped: mappedSpinners, total: totalSpinners }}
      onComplete={handleCategoryComplete}
      onBack={handleBack}
      onSkipCategory={handleCategoryComplete}
    />
  );
}
```

### 2. Spinner Intro Screen

```typescript
// components/SpinnerIntroScreen.tsx

interface SpinnerIntroScreenProps {
  categories: Array<{
    category: string;
    label: string;
    items: SourceItem[];
    mappedCount: number;
  }>;
  totalSpinners: number;
  onStart: () => void;
  onSkip: () => void;
}

export function SpinnerIntroScreen({ 
  categories, 
  totalSpinners, 
  onStart, 
  onSkip 
}: SpinnerIntroScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎡</div>
          <h2 className="text-2xl font-bold text-white">Spinner Submodel Matching</h2>
          <p className="text-zinc-400 mt-2">
            We detected <span className="text-white font-semibold">{totalSpinners}</span> spinner 
            submodel groups that need semantic matching.
          </p>
        </div>
        
        {/* Category Overview */}
        <div className="bg-zinc-900 rounded-xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
            Detected Categories
          </h3>
          <div className="space-y-3">
            {categories.map(cat => (
              <div 
                key={cat.category}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCategoryIcon(cat.category)}</span>
                  <div>
                    <div className="font-medium text-white">{cat.label}</div>
                    <div className="text-sm text-zinc-500">
                      {cat.items.length} groups to match
                    </div>
                  </div>
                </div>
                {cat.mappedCount > 0 && (
                  <span className="text-sm text-green-400">
                    {cat.mappedCount} already mapped
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Explanation */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-8">
          <h3 className="text-sm font-semibold text-blue-400 mb-2">
            💡 Why Semantic Matching?
          </h3>
          <p className="text-sm text-zinc-300">
            Spinner submodels use different names across vendors, but mean the same thing. 
            "Ribbons" ≈ "Scallops" ≈ "Petals". We'll match them by category, not just name.
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onSkip}
            className="px-6 py-3 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Skip Spinners
          </button>
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 
                       text-white font-semibold rounded-lg transition-all duration-200
                       shadow-lg shadow-blue-600/20"
          >
            Start Matching
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    spokes: '🔸',
    rings: '⭕',
    florals: '🌸',
    scallops: '🌊',
    spirals: '🌀',
    triangles: '🔺',
    effects: '✨',
    other: '❓'
  };
  return icons[category] || '❓';
}
```

### 3. Spinner Category Step

```typescript
// components/SpinnerCategoryStep.tsx

import { useState, useMemo } from 'react';
import { useMappings } from '@/context/MappingsContext';
import { getSemanticMatches } from '@/lib/spinnerMatching';

interface SpinnerCategoryStepProps {
  category: {
    category: string;
    label: string;
    description: string;
    items: SourceItem[];
    mappedCount: number;
  };
  categoryIndex: number;
  totalCategories: number;
  overallProgress: { mapped: number; total: number };
  onComplete: () => void;
  onBack: () => void;
  onSkipCategory: () => void;
}

export function SpinnerCategoryStep({
  category,
  categoryIndex,
  totalCategories,
  overallProgress,
  onComplete,
  onBack,
  onSkipCategory
}: SpinnerCategoryStepProps) {
  const { mappings, acceptMatch, sourcePatterns } = useMappings();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  
  // Filter to unmapped items only
  const unmappedItems = category.items.filter(item => !mappings.has(item.id));
  
  // All done with this category
  if (unmappedItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-white">
            {category.label} Complete!
          </h3>
          <p className="text-zinc-400 mt-2">
            All {category.items.length} items in this category are mapped.
          </p>
          <button
            onClick={onComplete}
            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white 
                       font-medium rounded-lg transition-all duration-200"
          >
            Continue to Next Category
          </button>
        </div>
      </div>
    );
  }
  
  const currentItem = unmappedItems[currentItemIndex] || unmappedItems[0];
  
  // Get semantic matches for current item
  const semanticMatches = useMemo(() => {
    return getSemanticMatches(currentItem, sourcePatterns, category.category);
  }, [currentItem, sourcePatterns, category.category]);
  
  const handleAcceptMatch = (sourceId: string) => {
    acceptMatch(currentItem.id, sourceId);
    
    // Move to next item or complete
    if (currentItemIndex < unmappedItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      onComplete();
    }
  };
  
  const handleSkipItem = () => {
    if (currentItemIndex < unmappedItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      onComplete();
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Category Header */}
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getCategoryIcon(category.category)}</span>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Matching: {category.label}
              </h2>
              <p className="text-sm text-zinc-400">
                {category.description}
              </p>
            </div>
          </div>
          
          {/* Category Progress */}
          <div className="text-right">
            <div className="text-sm text-zinc-400">
              Category {categoryIndex + 1} of {totalCategories}
            </div>
            <div className="text-sm text-zinc-500">
              {category.items.length - unmappedItems.length} of {category.items.length} matched
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ 
                width: `${((category.items.length - unmappedItems.length) / category.items.length) * 100}%` 
              }}
            />
          </div>
          <span className="text-sm text-zinc-400">
            {unmappedItems.length} remaining
          </span>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Current Item */}
        <div className="w-1/2 p-6 border-r border-zinc-800 flex flex-col">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
            Destination (Your Layout)
          </h3>
          
          <div className="bg-zinc-900 rounded-xl p-6 flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded">
                SUBMODEL_GRP
              </span>
              <span className="text-xs text-zinc-500">
                Detected: {category.label}
              </span>
            </div>
            
            <h4 className="text-xl font-semibold text-white mb-2">
              {currentItem.name}
            </h4>
            
            {currentItem.memberCount && (
              <p className="text-sm text-zinc-400">
                {currentItem.memberCount} members
              </p>
            )}
            
            {/* Item metadata */}
            {currentItem.metadata && (
              <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                  Metadata
                </div>
                <div className="text-sm text-zinc-300">
                  {currentItem.metadata}
                </div>
              </div>
            )}
          </div>
          
          {/* Skip button */}
          <button
            onClick={handleSkipItem}
            className="mt-4 w-full py-3 text-zinc-400 hover:text-zinc-300 
                       border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
          >
            Skip This Item
          </button>
        </div>
        
        {/* Right: Semantic Matches */}
        <div className="w-1/2 p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">
            Best Semantic Matches (Source Patterns)
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {semanticMatches.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                No semantic matches found for this category.
                <br />
                <button 
                  onClick={handleSkipItem}
                  className="mt-4 text-blue-400 hover:text-blue-300"
                >
                  Skip or manually match later
                </button>
              </div>
            ) : (
              semanticMatches.map((match, index) => (
                <button
                  key={match.id}
                  onClick={() => handleAcceptMatch(match.id)}
                  className={`
                    w-full p-4 rounded-xl text-left transition-all duration-200
                    ${index === 0 
                      ? 'bg-green-500/10 border-2 border-green-500/30 hover:border-green-500/50' 
                      : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded">
                          BEST MATCH
                        </span>
                      )}
                      <span className="font-medium text-white">{match.name}</span>
                    </div>
                    <span className={`
                      px-3 py-1 rounded-full text-sm font-semibold
                      ${match.confidence >= 0.75 ? 'bg-green-500/10 text-green-400' :
                        match.confidence >= 0.50 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'}
                    `}>
                      {Math.round(match.confidence * 100)}%
                    </span>
                  </div>
                  
                  {/* Match reasoning */}
                  <div className="text-sm text-zinc-400">
                    {match.reason}
                  </div>
                  
                  {/* Click to accept hint */}
                  <div className="mt-3 text-xs text-zinc-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    Click to accept this match
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Footer Navigation */}
      <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        <div className="text-sm text-zinc-500">
          Overall: {overallProgress.mapped}/{overallProgress.total} spinners matched
        </div>
        
        <button
          onClick={onSkipCategory}
          className="px-4 py-2 text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          Skip Entire Category →
        </button>
      </div>
    </div>
  );
}
```

### 4. Semantic Categories Configuration

```typescript
// lib/spinnerCategories.ts

export const SEMANTIC_CATEGORIES: Record<string, {
  label: string;
  description: string;
  patterns: string[];
}> = {
  spokes: {
    label: 'Spokes / Arms',
    description: 'Radial lines extending from center',
    patterns: ['spoke', 'arm', 'ray', 'beam', 'line', 'leg', 'arrow']
  },
  rings: {
    label: 'Rings / Circles',
    description: 'Circular or ring-shaped elements',
    patterns: ['ring', 'circle', 'ball', 'orb', 'inner', 'outer', 'dot']
  },
  florals: {
    label: 'Florals / Petals',
    description: 'Flower-like or petal patterns',
    patterns: ['flower', 'petal', 'heart', 'leaf', 'angel', 'star', 'floral']
  },
  scallops: {
    label: 'Scallops / Ribbons',
    description: 'Wave or ribbon patterns',
    patterns: ['ribbon', 'scallop', 'arc', 'wave', 'curve', 'cascading']
  },
  spirals: {
    label: 'Spirals / Swirls',
    description: 'Spiral or rotating patterns',
    patterns: ['spiral', 'swirl', 'twist', 'vortex', 'whirliwig', 'hook']
  },
  triangles: {
    label: 'Triangles / Wedges',
    description: 'Angular or wedge-shaped segments',
    patterns: ['triangle', 'wedge', 'trident', 'arrow', 'point', 'diamond']
  },
  effects: {
    label: 'Effects / Bursts',
    description: 'Dynamic or explosion-like patterns',
    patterns: ['firework', 'cascade', 'burst', 'explosion', 'sparkle', 'snowflake']
  }
};

export function getSpinnerSemanticCategory(name: string): string {
  const nameLower = name.toLowerCase()
    .replace(/^s\s*-\s*/, '')
    .replace(/^ge\s+/i, '')
    .replace(/spinreel\s*max\s*/i, '')
    .replace(/grand\s*illusion\s*/i, '')
    .replace(/\s*grp$/i, '')
    .trim();
  
  for (const [category, config] of Object.entries(SEMANTIC_CATEGORIES)) {
    for (const pattern of config.patterns) {
      if (nameLower.includes(pattern)) {
        return category;
      }
    }
  }
  
  return 'other';
}
```

### 5. Semantic Matching Function

```typescript
// lib/spinnerMatching.ts

import { getSpinnerSemanticCategory, SEMANTIC_CATEGORIES } from './spinnerCategories';

interface SemanticMatch {
  id: string;
  name: string;
  confidence: number;
  reason: string;
}

export function getSemanticMatches(
  destinationItem: SourceItem,
  sourcePatterns: SourcePattern[],
  targetCategory: string
): SemanticMatch[] {
  const matches: SemanticMatch[] = [];
  
  // Only consider source items that are also submodel groups
  const candidateSources = sourcePatterns.filter(s => 
    s.type === 'SUBMODEL_GRP' || s.name.startsWith('S - ')
  );
  
  for (const source of candidateSources) {
    const sourceCategory = getSpinnerSemanticCategory(source.name);
    
    let confidence = 0;
    let reasons: string[] = [];
    
    // Same semantic category = big boost
    if (sourceCategory === targetCategory && targetCategory !== 'other') {
      confidence += 0.45;
      reasons.push(`Same category: ${SEMANTIC_CATEGORIES[targetCategory]?.label}`);
    }
    
    // Both are submodel groups
    if (source.type === 'SUBMODEL_GRP') {
      confidence += 0.15;
      reasons.push('Both submodel groups');
    }
    
    // Name similarity bonus
    const destWords = new Set(destinationItem.name.toLowerCase().split(/\W+/));
    const sourceWords = new Set(source.name.toLowerCase().split(/\W+/));
    const commonWords = [...destWords].filter(w => sourceWords.has(w) && w.length > 2);
    if (commonWords.length > 0) {
      confidence += Math.min(commonWords.length * 0.1, 0.2);
      reasons.push(`Name overlap: ${commonWords.join(', ')}`);
    }
    
    // Only include if above minimum threshold
    if (confidence >= 0.25) {
      matches.push({
        id: source.id,
        name: source.name,
        confidence: Math.min(confidence, 1),
        reason: reasons.join(' • ')
      });
    }
  }
  
  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}
```

---

## File Structure

```
src/
├── lib/
│   ├── spinnerCategories.ts      # Category definitions
│   └── spinnerMatching.ts        # Semantic matching logic
├── components/
│   └── phases/
│       └── SpinnersPhase.tsx     # Main phase component
│   ├── SpinnerIntroScreen.tsx    # Welcome/overview screen
│   └── SpinnerCategoryStep.tsx   # Per-category matching UI
```

---

## Acceptance Criteria

- [ ] Spinner phase detects SUBMODEL_GRP items
- [ ] Items are grouped by semantic category
- [ ] Intro screen shows category overview
- [ ] Category-by-category wizard flows correctly
- [ ] Best semantic matches shown with confidence
- [ ] Match reasoning is displayed
- [ ] Accept/skip buttons work correctly
- [ ] Progress bar shows category completion
- [ ] Skip entire category option available
- [ ] "All done" state for completed categories
- [ ] Back navigation works within wizard

---

## Dependencies

- Ticket 01: Phased Wizard Structure
- Uses semantic categories from `spinner_rosetta_stone.json`

## Blocks

Nothing.

---

## Testing Notes

Test with these specific cases:
- "GE SpinReel Max Ribbons GRP" should show "S - Cascading Petal" as top match
- "GE SpinReel Max Spokes All GRP" should show "S - Arrows" as top match
- "GE Grand Illusion Whirliwig GRP" should show "S - Swirl and a Circle" as top match
- Items in "other" category should show fallback matching behavior
