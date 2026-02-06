# Ticket: Confidence Visualization & Match Reasoning

## Priority: P1

## Summary

Implement a unified confidence visualization system with detailed match reasoning tooltips. Users should understand WHY a match was suggested, not just the score.

---

## Current State

- Confidence shown as flat percentage
- No explanation of how confidence was calculated
- Users don't know why 75% is different from 45%
- No visual distinction between confidence tiers

## Target State

- Color-coded confidence badges (green/amber/red)
- Hover tooltip shows reasoning breakdown
- Score components visible (type +35%, name +20%, etc.)
- "Why not higher?" explanation for medium/low matches

---

## Technical Implementation

### 1. Confidence Badge Component

```typescript
// components/ConfidenceBadge.tsx

import { useState } from 'react';
import { MatchReasoning } from '@/types/matching';
import { ReasoningTooltip } from './ReasoningTooltip';

interface ConfidenceBadgeProps {
  confidence: number;
  reasoning?: MatchReasoning;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function ConfidenceBadge({ 
  confidence, 
  reasoning,
  size = 'md',
  showTooltip = true 
}: ConfidenceBadgeProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  const tier = getConfidenceTier(confidence);
  const percentage = Math.round(confidence * 100);
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };
  
  const tierClasses = {
    high: 'bg-green-500/15 text-green-400 border-green-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    low: 'bg-red-500/15 text-red-400 border-red-500/30',
    none: 'bg-zinc-700/50 text-zinc-400 border-zinc-600'
  };
  
  return (
    <div className="relative inline-block">
      <div
        className={`
          inline-flex items-center gap-1.5 rounded-full border font-semibold
          ${sizeClasses[size]}
          ${tierClasses[tier]}
          ${showTooltip && reasoning ? 'cursor-help' : ''}
        `}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        {/* Tier Icon */}
        {tier === 'high' && (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
        {tier === 'medium' && (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
        {tier === 'low' && (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
        
        <span>{percentage}%</span>
      </div>
      
      {/* Reasoning Tooltip */}
      {showTooltip && reasoning && isTooltipVisible && (
        <ReasoningTooltip reasoning={reasoning} confidence={confidence} />
      )}
    </div>
  );
}

function getConfidenceTier(confidence: number): 'high' | 'medium' | 'low' | 'none' {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.50) return 'medium';
  if (confidence > 0) return 'low';
  return 'none';
}
```

### 2. Match Reasoning Types

```typescript
// types/matching.ts

export interface MatchReasoning {
  components: ReasoningComponent[];
  whyNotHigher?: string[];
  summary: string;
}

export interface ReasoningComponent {
  factor: string;
  description: string;
  score: number;
  maxScore: number;
  icon?: string;
}

// Example reasoning:
// {
//   components: [
//     { factor: 'Type Match', description: 'Both are SUBMODEL_GRP', score: 0.35, maxScore: 0.35, icon: '🎯' },
//     { factor: 'Semantic Category', description: 'Both are "scallops"', score: 0.30, maxScore: 0.35, icon: '🏷️' },
//     { factor: 'Name Similarity', description: '1 common word: "ribbons"', score: 0.10, maxScore: 0.20, icon: '📝' },
//   ],
//   whyNotHigher: ['Different vendor naming conventions', 'No exact name match'],
//   summary: 'Strong semantic match with minor naming differences'
// }
```

### 3. Reasoning Tooltip Component

```typescript
// components/ReasoningTooltip.tsx

import { MatchReasoning } from '@/types/matching';

interface ReasoningTooltipProps {
  reasoning: MatchReasoning;
  confidence: number;
}

export function ReasoningTooltip({ reasoning, confidence }: ReasoningTooltipProps) {
  const tier = confidence >= 0.85 ? 'high' : confidence >= 0.50 ? 'medium' : 'low';
  
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className={`
          px-4 py-3 border-b border-zinc-800
          ${tier === 'high' ? 'bg-green-500/10' : 
            tier === 'medium' ? 'bg-amber-500/10' : 'bg-red-500/10'}
        `}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Match Breakdown</span>
            <span className={`
              text-lg font-bold
              ${tier === 'high' ? 'text-green-400' : 
                tier === 'medium' ? 'text-amber-400' : 'text-red-400'}
            `}>
              {Math.round(confidence * 100)}%
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">{reasoning.summary}</p>
        </div>
        
        {/* Score Components */}
        <div className="px-4 py-3 space-y-3">
          {reasoning.components.map((component, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {component.icon && <span className="text-sm">{component.icon}</span>}
                  <span className="text-sm font-medium text-zinc-300">{component.factor}</span>
                </div>
                <span className="text-sm font-mono text-zinc-400">
                  +{Math.round(component.score * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Progress bar */}
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all
                      ${component.score === component.maxScore 
                        ? 'bg-green-500' 
                        : component.score > 0 
                          ? 'bg-amber-500' 
                          : 'bg-red-500'}
                    `}
                    style={{ width: `${(component.score / component.maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-600">
                  /{Math.round(component.maxScore * 100)}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{component.description}</p>
            </div>
          ))}
        </div>
        
        {/* Why Not Higher (for medium/low) */}
        {reasoning.whyNotHigher && reasoning.whyNotHigher.length > 0 && confidence < 0.85 && (
          <div className="px-4 py-3 bg-zinc-800/50 border-t border-zinc-800">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              Why not higher?
            </div>
            <ul className="space-y-1">
              {reasoning.whyNotHigher.map((reason, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-zinc-400">
                  <span className="text-zinc-600 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Arrow */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-zinc-900 border-r border-b border-zinc-700" />
      </div>
    </div>
  );
}
```

### 4. Confidence Tier Grouping Component

```typescript
// components/ConfidenceTierList.tsx

import { useMemo } from 'react';

interface ConfidenceTierListProps {
  items: Array<{ id: string; name: string; confidence: number; }>;
  renderItem: (item: any) => React.ReactNode;
}

export function ConfidenceTierList({ items, renderItem }: ConfidenceTierListProps) {
  const grouped = useMemo(() => {
    const high = items.filter(i => i.confidence >= 0.85);
    const medium = items.filter(i => i.confidence >= 0.50 && i.confidence < 0.85);
    const low = items.filter(i => i.confidence > 0 && i.confidence < 0.50);
    const none = items.filter(i => !i.confidence || i.confidence === 0);
    
    return { high, medium, low, none };
  }, [items]);
  
  return (
    <div className="space-y-6">
      {/* High Confidence */}
      {grouped.high.length > 0 && (
        <TierSection
          title="High Confidence"
          subtitle="Ready to accept"
          count={grouped.high.length}
          icon="✅"
          color="green"
          items={grouped.high}
          renderItem={renderItem}
        />
      )}
      
      {/* Medium Confidence */}
      {grouped.medium.length > 0 && (
        <TierSection
          title="Medium Confidence"
          subtitle="Review recommended"
          count={grouped.medium.length}
          icon="⚡"
          color="amber"
          items={grouped.medium}
          renderItem={renderItem}
        />
      )}
      
      {/* Low Confidence */}
      {grouped.low.length > 0 && (
        <TierSection
          title="Low Confidence"
          subtitle="Manual review needed"
          count={grouped.low.length}
          icon="⚠️"
          color="red"
          items={grouped.low}
          renderItem={renderItem}
        />
      )}
      
      {/* No Match */}
      {grouped.none.length > 0 && (
        <TierSection
          title="No Match Found"
          subtitle="Manual mapping required"
          count={grouped.none.length}
          icon="❌"
          color="zinc"
          items={grouped.none}
          renderItem={renderItem}
        />
      )}
    </div>
  );
}

function TierSection({ 
  title, 
  subtitle, 
  count, 
  icon, 
  color, 
  items, 
  renderItem 
}: {
  title: string;
  subtitle: string;
  count: number;
  icon: string;
  color: 'green' | 'amber' | 'red' | 'zinc';
  items: any[];
  renderItem: (item: any) => React.ReactNode;
}) {
  const colorClasses = {
    green: 'border-green-500/30 bg-green-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
    red: 'border-red-500/30 bg-red-500/5',
    zinc: 'border-zinc-700 bg-zinc-900/50'
  };
  
  const headerColors = {
    green: 'text-green-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    zinc: 'text-zinc-400'
  };
  
  return (
    <div className={`rounded-xl border ${colorClasses[color]}`}>
      {/* Section Header */}
      <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <h3 className={`font-semibold ${headerColors[color]}`}>{title}</h3>
            <p className="text-xs text-zinc-500">{subtitle}</p>
          </div>
        </div>
        <span className={`
          px-3 py-1 rounded-full text-sm font-semibold
          ${color === 'green' ? 'bg-green-500/20 text-green-400' :
            color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
            color === 'red' ? 'bg-red-500/20 text-red-400' :
            'bg-zinc-700 text-zinc-400'}
        `}>
          {count}
        </span>
      </div>
      
      {/* Items */}
      <div className="p-4 space-y-2">
        {items.map(item => renderItem(item))}
      </div>
    </div>
  );
}
```

### 5. Reasoning Generator Function

```typescript
// lib/generateReasoning.ts

import { MatchReasoning, ReasoningComponent } from '@/types/matching';

export function generateMatchReasoning(
  source: SourceItem,
  destination: DestinationItem,
  matchDetails: MatchDetails
): MatchReasoning {
  const components: ReasoningComponent[] = [];
  const whyNotHigher: string[] = [];
  
  // Type Match Component
  if (matchDetails.typeMatch) {
    components.push({
      factor: 'Type Match',
      description: `Both are ${source.type}`,
      score: 0.35,
      maxScore: 0.35,
      icon: '🎯'
    });
  } else {
    components.push({
      factor: 'Type Match',
      description: `Different types: ${source.type} vs ${destination.type}`,
      score: 0,
      maxScore: 0.35,
      icon: '🎯'
    });
    whyNotHigher.push('Different item types');
  }
  
  // Semantic Category Component (for spinners)
  if (matchDetails.semanticCategory) {
    const categoryScore = matchDetails.categoryMatch ? 0.30 : 0.10;
    components.push({
      factor: 'Semantic Category',
      description: matchDetails.categoryMatch 
        ? `Both are "${matchDetails.semanticCategory}"` 
        : `Different categories`,
      score: categoryScore,
      maxScore: 0.30,
      icon: '🏷️'
    });
    
    if (!matchDetails.categoryMatch) {
      whyNotHigher.push('Different semantic categories');
    }
  }
  
  // Name Similarity Component
  const nameScore = calculateNameSimilarityScore(source.name, destination.name);
  components.push({
    factor: 'Name Similarity',
    description: matchDetails.commonWords?.length 
      ? `${matchDetails.commonWords.length} common words: ${matchDetails.commonWords.join(', ')}`
      : 'No common words',
    score: nameScore,
    maxScore: 0.20,
    icon: '📝'
  });
  
  if (nameScore < 0.15) {
    whyNotHigher.push('Different naming conventions');
  }
  
  // Member Count Component (for groups)
  if (source.memberCount && destination.memberCount) {
    const ratio = Math.min(source.memberCount, destination.memberCount) / 
                  Math.max(source.memberCount, destination.memberCount);
    const memberScore = ratio * 0.15;
    
    components.push({
      factor: 'Member Count',
      description: `${source.memberCount} vs ${destination.memberCount} members`,
      score: memberScore,
      maxScore: 0.15,
      icon: '👥'
    });
    
    if (ratio < 0.8) {
      whyNotHigher.push('Different group sizes');
    }
  }
  
  // Calculate total
  const totalScore = components.reduce((sum, c) => sum + c.score, 0);
  
  // Generate summary
  let summary = '';
  if (totalScore >= 0.85) {
    summary = 'Excellent match across all factors';
  } else if (totalScore >= 0.50) {
    summary = 'Good match with some differences';
  } else {
    summary = 'Weak match — manual review recommended';
  }
  
  return {
    components,
    whyNotHigher: whyNotHigher.length > 0 ? whyNotHigher : undefined,
    summary
  };
}

function calculateNameSimilarityScore(name1: string, name2: string): number {
  const words1 = new Set(name1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const words2 = new Set(name2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const common = [...words1].filter(w => words2.has(w));
  
  if (common.length === 0) return 0;
  if (common.length >= 3) return 0.20;
  if (common.length === 2) return 0.15;
  return 0.10;
}
```

---

## Acceptance Criteria

- [ ] Confidence badges are color-coded (green ≥85%, amber 50-84%, red <50%)
- [ ] Badges show tier icon (checkmark, warning, X)
- [ ] Hovering badge shows reasoning tooltip
- [ ] Tooltip shows score breakdown by component
- [ ] Progress bars show score vs max for each component
- [ ] "Why not higher?" section appears for medium/low matches
- [ ] Reasoning is generated for all match types
- [ ] Confidence tier grouping works in list views
- [ ] Section headers show tier count

---

## Dependencies

- Used throughout all phases

## Blocks

Nothing.
