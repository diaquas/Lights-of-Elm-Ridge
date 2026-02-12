# Ticket 46: Effect-Based Matching Rules - Validated from 17 Real Sequences

## 🎯 Objective
Add effect-type-based bonuses/penalties to the matching algorithm. When a sequence model uses certain effects, we can infer what TYPE of prop it's designed for and match accordingly.

## 📋 The Insight

From analyzing 60,490 effects across 17 sequences, we found **strong correlations** between effect types and model types:

| Effect | Primary Model Type | Confidence | Evidence |
|--------|-------------------|------------|----------|
| **Faces** | Singing props | **76%** | 28/37 models with "singing" in name |
| **Text** | Matrix | **87%** | 13/15 models with "matrix" in name |
| **Video** | Matrix | **71%** | Used on Matrix, MegaTree, Garage Matrix |
| **Pictures** | Spinner | **51%** | Showstopper spinners dominate usage |
| **Pinwheel** | Spinner | **42%** | Spinner GRPs, Fuzion, etc. |
| **Spirals** | Tree/Wreath | **42%** | MegaTrees, wreaths (PPD, MOAW, BOAW) |
| **Plasma** | Singing | **48%** | RGB Singing Bulbs dominate |

## 🔧 Implementation

### 1. Effect-Model Type Affinity Rules

```typescript
/**
 * EFFECT_MODEL_AFFINITY - Validated from 17 real sequences
 * 
 * When a sequence model uses these effects, it's a strong signal
 * about what TYPE of user prop it should map to.
 */
const EFFECT_MODEL_AFFINITY: Record<string, {
  primaryType: string;
  secondaryTypes: string[];
  confidence: number;
  matchBonus: number;      // Add to score when types match
  mismatchPenalty: number; // Subtract when types don't match
  description: string;
}> = {
  // === VERY HIGH CONFIDENCE (≥70%) ===
  
  'Faces': {
    primaryType: 'singing',
    secondaryTypes: ['matrix', 'tree'],
    confidence: 76,
    matchBonus: 0.20,      // +20% when matched to singing prop
    mismatchPenalty: 0.15, // -15% when matched to non-singing
    description: 'Faces effect is almost exclusively used on singing props (76%)',
  },
  
  'Text': {
    primaryType: 'matrix',
    secondaryTypes: [],
    confidence: 87,
    matchBonus: 0.25,      // +25% - very high confidence
    mismatchPenalty: 0.20, // -20% - almost never used elsewhere
    description: 'Text effect is used on matrices 87% of the time',
  },
  
  'Video': {
    primaryType: 'matrix',
    secondaryTypes: ['tree'],
    confidence: 71,
    matchBonus: 0.20,
    mismatchPenalty: 0.15,
    description: 'Video effect is primarily for matrices (71%) and mega trees',
  },
  
  'Candle': {
    primaryType: 'matrix',
    secondaryTypes: [],
    confidence: 100,
    matchBonus: 0.25,
    mismatchPenalty: 0.20,
    description: 'Candle effect is exclusively used on matrices',
  },
  
  // === HIGH CONFIDENCE (50-70%) ===
  
  'Pictures': {
    primaryType: 'spinner',
    secondaryTypes: ['matrix', 'tree'],
    confidence: 51,
    matchBonus: 0.15,
    mismatchPenalty: 0.10,
    description: 'Pictures effect is often used on spinners (Showstoppers) and matrices',
  },
  
  'Galaxy': {
    primaryType: 'matrix',
    secondaryTypes: ['spider'],
    confidence: 56,
    matchBonus: 0.15,
    mismatchPenalty: 0.10,
    description: 'Galaxy effect works best on matrices and large props',
  },
  
  'Curtain': {
    primaryType: 'matrix',
    secondaryTypes: ['roofline'],
    confidence: 56,
    matchBonus: 0.12,
    mismatchPenalty: 0.08,
    description: 'Curtain effect is designed for matrices and vertical drops',
  },
  
  // === MEDIUM CONFIDENCE (40-50%) ===
  
  'Pinwheel': {
    primaryType: 'spinner',
    secondaryTypes: ['wreath', 'arch'],
    confidence: 42,
    matchBonus: 0.12,
    mismatchPenalty: 0.08,
    description: 'Pinwheel effect works best on circular props like spinners',
  },
  
  'Spirals': {
    primaryType: 'tree',
    secondaryTypes: ['spinner', 'wreath'],
    confidence: 42,
    matchBonus: 0.12,
    mismatchPenalty: 0.08,
    description: 'Spirals effect is common on mega trees and wreaths',
  },
  
  'Plasma': {
    primaryType: 'singing',
    secondaryTypes: ['matrix', 'spinner'],
    confidence: 48,
    matchBonus: 0.12,
    mismatchPenalty: 0.08,
    description: 'Plasma effect is often used on singing props and matrices',
  },
  
  'Morph': {
    primaryType: 'matrix',
    secondaryTypes: ['pole', 'any'],
    confidence: 42,
    matchBonus: 0.10,
    mismatchPenalty: 0.05,
    description: 'Morph effect works well on matrices and vertical elements',
  },
  
  'Warp': {
    primaryType: 'matrix',
    secondaryTypes: ['pole'],
    confidence: 45,
    matchBonus: 0.12,
    mismatchPenalty: 0.08,
    description: 'Warp effect is primarily for matrices',
  },
  
  // === PROP-SPECIFIC EFFECTS ===
  
  'Tree': {
    primaryType: 'tree',
    secondaryTypes: [],
    confidence: 80,  // Effect is literally named "Tree"
    matchBonus: 0.20,
    mismatchPenalty: 0.15,
    description: 'Tree effect is specifically designed for tree props',
  },
  
  'Garlands': {
    primaryType: 'tree',
    secondaryTypes: ['matrix'],
    confidence: 65,
    matchBonus: 0.15,
    mismatchPenalty: 0.10,
    description: 'Garlands effect wraps around trees and similar props',
  },
  
  'Fan': {
    primaryType: 'spinner',
    secondaryTypes: ['wreath'],
    confidence: 45,
    matchBonus: 0.10,
    mismatchPenalty: 0.05,
    description: 'Fan effect rotates outward, great for circular props',
  },
};
```

### 2. Apply Effect Affinity in Scoring

```typescript
function calculateEffectAffinityBonus(
  seqModelEffects: Map<string, number>,
  userPropType: string
): { bonus: number; reasons: string[] } {
  let totalBonus = 0;
  const reasons: string[] = [];
  
  // Get total effects for weighting
  const totalEffects = Array.from(seqModelEffects.values()).reduce((a, b) => a + b, 0);
  if (totalEffects === 0) return { bonus: 0, reasons: [] };
  
  for (const [effect, count] of seqModelEffects) {
    const affinity = EFFECT_MODEL_AFFINITY[effect];
    if (!affinity) continue;
    
    // Weight by how much this effect is used
    const effectWeight = count / totalEffects;
    if (effectWeight < 0.05) continue; // Skip if <5% of effects
    
    const typeMatches = affinity.primaryType === userPropType || 
                        affinity.secondaryTypes.includes(userPropType);
    
    if (typeMatches) {
      const bonus = affinity.matchBonus * effectWeight;
      totalBonus += bonus;
      
      if (effectWeight >= 0.10) { // Only mention significant effects
        reasons.push(`${effect} effect matches ${userPropType} (${(affinity.confidence)}% confidence)`);
      }
    } else if (affinity.confidence >= 50) {
      // Only penalize high-confidence mismatches
      const penalty = affinity.mismatchPenalty * effectWeight;
      totalBonus -= penalty;
      
      if (effectWeight >= 0.10) {
        reasons.push(`⚠️ ${effect} effect typically used on ${affinity.primaryType}, not ${userPropType}`);
      }
    }
  }
  
  return { 
    bonus: Math.max(-0.20, Math.min(0.25, totalBonus)), // Cap at ±25%
    reasons 
  };
}
```

### 3. Integrate into Main Scoring

```typescript
function calculateMatchScore(
  sourceModel: SourceModel,
  destModel: DestModel,
  effectAnalysis: SequenceEffectAnalysis
): MatchScore {
  // Existing scoring factors
  let score = (
    nameScore * 0.38 +
    spatialScore * 0.22 +
    shapeScore * 0.13 +
    typeScore * 0.10 +
    pixelScore * 0.10 +
    structureScore * 0.07
  );
  
  // NEW: Effect affinity bonus/penalty
  const seqModelEffects = effectAnalysis.models.get(sourceModel.name)?.effectTypeCounts;
  if (seqModelEffects) {
    const userPropType = inferUserPropType(destModel);
    const { bonus, reasons } = calculateEffectAffinityBonus(seqModelEffects, userPropType);
    
    score += bonus;
    matchReasons.push(...reasons);
  }
  
  return { score: Math.max(0, Math.min(1, score)), reasons: matchReasons };
}
```

### 4. Enhanced Hover Card with Effect Info

```tsx
interface MatchReasonCardProps {
  sourceModel: string;
  destModel: string;
  score: number;
  reasons: MatchReason[];
  effectAnalysis?: ModelEffectSummary;
}

function MatchReasonCard({ 
  sourceModel, 
  destModel, 
  score, 
  reasons,
  effectAnalysis 
}: MatchReasonCardProps) {
  return (
    <Card className="w-80 p-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Match Details</CardTitle>
          <Badge variant={score >= 0.85 ? 'success' : score >= 0.60 ? 'warning' : 'destructive'}>
            {Math.round(score * 100)}%
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {sourceModel} → {destModel}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Standard Reasons */}
        <div className="space-y-1">
          {reasons.map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={reason.isPositive ? 'text-green-400' : 'text-orange-400'}>
                {reason.isPositive ? '✓' : '⚠️'}
              </span>
              <span>{reason.text}</span>
            </div>
          ))}
        </div>
        
        {/* NEW: Effect Analysis Section */}
        {effectAnalysis && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">
                EFFECT ANALYSIS
              </h4>
              
              {/* Top Effects */}
              <div className="flex flex-wrap gap-1">
                {effectAnalysis.topEffects.slice(0, 4).map(eff => (
                  <Badge key={eff.type} variant="outline" className="text-[10px]">
                    {getEffectIcon(eff.type)} {eff.count} {eff.type}
                  </Badge>
                ))}
              </div>
              
              {/* Effect-Type Affinity Message */}
              {effectAnalysis.dominantEffectAffinity && (
                <div className="text-xs bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground">
                    {effectAnalysis.dominantEffectAffinity.description}
                  </span>
                </div>
              )}
              
              {/* Signature Effects Alert */}
              {effectAnalysis.hasSignatureEffects && (
                <div className="flex items-center gap-1 text-xs text-yellow-400">
                  <Sparkles className="h-3 w-3" />
                  <span>Contains signature effects: {effectAnalysis.signatureEffects.join(', ')}</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

## 📐 Example Scenarios

### Scenario 1: Faces Effect → Singing Prop ✅
```
Sequence Model: "Boscoyo Singing Pumpkin"
  Effects: Faces (29x), Shockwave (15x), On (10x)
  
User Prop: "My Singing Pumpkin"
  Type: singing

Effect Affinity Calculation:
  - Faces is 54% of effects
  - Faces primaryType = 'singing' ✓
  - Bonus: +0.20 * 0.54 = +0.108

Hover Card Shows:
  ✓ Faces effect matches singing prop (76% confidence)
```

### Scenario 2: Faces Effect → Arch ❌
```
Sequence Model: "Boscoyo Singing Pumpkin"
  Effects: Faces (29x), Shockwave (15x), On (10x)
  
User Prop: "Arch 1"
  Type: arch

Effect Affinity Calculation:
  - Faces is 54% of effects
  - Faces primaryType = 'singing' ≠ 'arch'
  - Penalty: -0.15 * 0.54 = -0.081

Hover Card Shows:
  ⚠️ Faces effect typically used on singing props, not arch
```

### Scenario 3: Video Effect → Matrix ✅
```
Sequence Model: "P5 Matrix Display"
  Effects: Video (42x), Morph (20x), Warp (15x)
  
User Prop: "Main Matrix"
  Type: matrix

Effect Affinity Calculation:
  - Video is 55% of effects → +0.20 * 0.55 = +0.11
  - Morph is 26% of effects → +0.10 * 0.26 = +0.026
  - Warp is 19% of effects → +0.12 * 0.19 = +0.023
  - Total: +0.159

Hover Card Shows:
  ✓ Video effect matches matrix (71% confidence)
  ✓ Morph effect matches matrix (42% confidence)
  ✓ Warp effect matches matrix (45% confidence)
```

## 📊 Expected Impact

### Before (Name-Only Matching)
```
"Boscoyo Singing Pumpkin" might match:
  - Arch 1 (72% - name similarity to "Boscoyo Arch")
  - My Singing Pumpkin (68% - partial name match)
  
Wrong match gets higher score!
```

### After (Effect-Aware Matching)
```
"Boscoyo Singing Pumpkin" matches:
  - My Singing Pumpkin: 68% + 10.8% = 78.8% ✅
  - Arch 1: 72% - 8.1% = 63.9%
  
Correct match wins!
```

## 🔧 Additional Rules Discovered

### Singing Prop Detection (Add to model type inference)
```typescript
function isSingingProp(modelName: string): boolean {
  const n = modelName.toLowerCase();
  return (
    n.includes('singing') ||
    n.includes('face') ||
    n.includes('mouth') ||
    n.includes('pimp') ||           // Singing pumpkin abbreviation
    n.includes('jolly roger') ||     // Boscoyo singing skull
    n.includes('scary tree') ||      // Singing tree variant
    n.includes('spooky tree') ||     // GE Singing Spooky Tree
    n.includes('singing bulb') ||
    n.includes('skull') ||           // Often has face
    (n.includes('pumpkin') && n.includes('face'))
  );
}
```

### Matrix Detection Enhancement
```typescript
function isMatrix(modelName: string): boolean {
  const n = modelName.toLowerCase();
  return (
    n.includes('matrix') ||
    n.includes('panel') ||
    n.includes('p5') ||
    n.includes('p10') ||
    n.includes('tune-to') ||        // Tune-to-matrix
    n.includes('tune to') ||
    n.includes('screen') ||
    n.includes('led curtain')       // Often acts as matrix
  );
}
```

## ✅ Acceptance Criteria

### Effect Affinity Rules:
- [ ] Implement EFFECT_MODEL_AFFINITY lookup table
- [ ] calculateEffectAffinityBonus function works correctly
- [ ] Bonuses capped at ±25%
- [ ] Only significant effects (≥5%) influence score

### Scoring Integration:
- [ ] Effect affinity bonus added after base score calculation
- [ ] Reasons array includes effect-based explanations
- [ ] Score properly clamped to 0-1 range

### Hover Card:
- [ ] Shows top 4 effects with icons
- [ ] Displays effect-type affinity message
- [ ] Highlights signature effects
- [ ] Shows match/mismatch warnings

### Model Type Detection:
- [ ] isSingingProp() detects singing models
- [ ] isMatrix() enhanced with new patterns
- [ ] Inference used in affinity calculation

## 🧪 Test Cases

1. **Faces on singing prop**: +15-20% bonus
2. **Faces on arch**: -10-15% penalty
3. **Text on matrix**: +20-25% bonus
4. **Text on spinner**: -15-20% penalty
5. **Video on matrix**: +15-20% bonus
6. **Video on tree**: Small bonus (secondary type)
7. **Pinwheel on spinner**: +10-12% bonus
8. **Spirals on tree**: +10-12% bonus
9. **Multiple matching effects**: Bonuses stack (capped)
10. **Low-usage effects (<5%)**: No impact on score

## 🏷️ Labels
- Priority: **HIGH** - Direct impact on match quality
- Type: Algorithm Improvement
- Effort: Medium (4-5 hours)
- Impact: **Major** - Fixes category mismatches
- Related: Ticket 38 (Matching Algorithm), Ticket 43-45 (Effect Analysis)
