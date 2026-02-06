# ModIQ Spinner Submodel Database

## Overview

This document provides the prop family database and semantic matching rules derived from parsing **1,276 xmodel files** from three major vendors:

| Vendor | Total Models | Spinners | Models with Submodels |
|--------|-------------|----------|----------------------|
| Gilbert Engineering | 1,001 | 263 | 732 |
| Holiday Coro | 224 | 10 | 115 |
| EFL Designs | 51 | 12 | 40 |
| **Total** | **1,276** | **285** | **887** |

---

## Spinner Submodel Rosetta Stone

### Core Principle
Source sequences often use generic, descriptive names ("S - Big Hearts", "S - Rings") while destination models use vendor-specific naming ("GE SpinReel Max Flowers GRP", "PPD Wreath Petals"). The Rosetta Stone maps these semantically equivalent patterns.

### Semantic Categories

#### 1. FLORALS (Hearts ≈ Flowers ≈ Petals ≈ Leaves)
**Description:** Decorative circular patterns - ALL are interchangeable for effect mapping

**Equivalent Names:**
- Flower, Flowers
- Petal, Petals  
- Heart, Hearts, Big Hearts
- Leaf, Leaves, Cascading Leaf
- Floral, Star (in decorative context)

**Source Sequence Examples:**
- "S - Big Hearts"
- "S - Cascading Leaf"
- "S - Hearts"
- "S - Petals"

**Destination Examples:**
- Gilbert Engineering: "GE Spin Reel Max 36/Flower"
- "GE SpinReel Max Flowers GRP"
- "PPD Wreath Petals"

---

#### 2. RINGS (Rings ≈ Circles ≈ Balls)
**Description:** Concentric circular patterns - ALL are interchangeable

**Equivalent Names:**
- Ring, Rings, Ring All, All Rings
- Circle, Circles, Inner Circle, Outer Circle
- Ball, Balls, Outer Ball
- Orb, Round

**Source Sequence Examples:**
- "S - Rings"
- "S - Cascading Circles"
- "S - Circles"

**Destination Examples:**
- Gilbert Engineering: "GE Spin Reel Max 36/Inner Circle", "Outer Ball 1"
- Holiday Coro: "1116-2/Ring 1"
- "GE Grand Illusion Rings GRP"

---

#### 3. SPOKES (Spokes ≈ Arms ≈ Rays ≈ Lines)
**Description:** Radial emanating patterns - ALL are interchangeable

**Equivalent Names:**
- Spoke, Spokes, Spoke All, All Spokes
- Arm, Arms
- Ray, Rays
- Line, Lines
- Leg, Legs
- Beam

**Source Sequence Examples:**
- "S - Spokes"
- "S - Arms"
- "S - Rays"

**Destination Examples:**
- Gilbert Engineering: "StarBurst xTreme/Spoke 1", "GE Easter Cross/Arm 1"
- EFL Designs: "BabyFlakeNBL/Spokes"

---

#### 4. SPIRALS (Spirals ≈ Swirls ≈ Twists)
**Description:** Spiral/swirl patterns - ALL are interchangeable

**Equivalent Names:**
- Spiral, Spirals, Spiral All
- Swirl, Swirls
- Twist, Vortex

**Source Sequence Examples:**
- "S - Spiral"
- "Tree - Spiral 8"

**Destination Examples:**
- Gilbert Engineering: "Sun/Spiral - Left", "GE_Decorated_Spiral_Tree_600/Spiral"
- EFL Designs: "Smiley_Wreath/Spiral"
- "PPD Wreath Spiral All"

---

#### 5. RIBBONS/SCALLOPS (Ribbons ≈ Scallops ≈ Arcs ≈ Waves)
**Description:** Curved border patterns - ALL are interchangeable

**Equivalent Names:**
- Ribbon, Ribbons
- Scallop, Scallops
- Arc, Arcs, Arch
- Wave, Waves, Curve

**Source Sequence Examples:**
- "S - Ribbons"
- "S - Scallops"

**Destination Examples:**
- Gilbert Engineering: "GE SpinReel Max 36/Ribbon 1", "GE SpinReel Max 36/Scallop 1"

---

#### 6. TRIANGLES/GEOMETRIC
**Description:** Triangular and geometric elements

**Equivalent Names:**
- Triangle, Triangles
- Wedge, Segment
- Diamond (sometimes)

**Source Sequence Examples:**
- "S - Triangles"
- "S - Diamond"

**Destination Examples:**
- Gilbert Engineering: "GE Mega Magic Wheel 48-279/Triangle 1"

---

#### 7. EFFECTS (Fireworks ≈ Cascading ≈ Burst)
**Description:** Animated effect patterns

**Equivalent Names:**
- Firework, Fireworks
- Cascade, Cascading
- Burst, Explosion
- Flash, Sparkle

**Source Sequence Examples:**
- "S - Fireworks"
- "S - Sparkle"

---

## Known Spinner Prop Families by Vendor

### Gilbert Engineering (17 families)
```
GE Spin Reel Max / GE SpinReel Max
GE Reel Max
Grand Illusion / Baby Grand Illusion
GE Rosa Grande
Rosa Wreath / GE RosaWreath
GE G-Spasm
GE Fuzion
GE Dragonfly
GE Lightspeed
GE Dazzler
GE Star Gazer
GE Ringmaster
GE Space Odyssey
GE Starlord
Mega Spin Reel Max
GE Firework Spinner
GE Magical Spinner
```

### EFL Designs (4 families)
```
Showstopper Snowflake
Smiley_Wreath
BigdaFan
BabyFlake
```

### Holiday Coro (3 families)
```
1134 Spinner Pop
Holiday Coro 24 Spinner
1116 (multiple variants)
```

### PPD (awaiting Boscoyo data)
```
PPD Wreath
```

### Boscoyo (awaiting data)
```
Mega Spider
Black Widow
```

---

## Implementation in ModIQ

### TypeScript Interfaces

```typescript
// Semantic category for spinner submodel matching
type SpinnerSemanticCategory = 
  | 'florals'      // hearts, flowers, petals, leaves
  | 'rings'        // rings, circles, balls
  | 'spokes'       // spokes, arms, rays, lines
  | 'spirals'      // spirals, swirls
  | 'scallops'     // ribbons, scallops, arcs
  | 'triangles'    // triangles, geometric
  | 'effects'      // fireworks, cascading
  | 'other';

interface SpinnerSemanticMatcher {
  category: SpinnerSemanticCategory;
  patterns: string[];  // Lowercase patterns to match
  weight: number;      // Matching weight (1.0 = exact, 0.8 = semantic)
}

const SPINNER_MATCHERS: SpinnerSemanticMatcher[] = [
  {
    category: 'florals',
    patterns: ['flower', 'petal', 'heart', 'leaf', 'floral', 'big heart', 'cascading leaf'],
    weight: 0.85
  },
  {
    category: 'rings', 
    patterns: ['ring', 'circle', 'ball', 'orb', 'inner circle', 'outer circle'],
    weight: 0.85
  },
  {
    category: 'spokes',
    patterns: ['spoke', 'arm', 'ray', 'beam', 'line', 'leg'],
    weight: 0.85
  },
  {
    category: 'spirals',
    patterns: ['spiral', 'swirl', 'twist', 'vortex'],
    weight: 0.85
  },
  {
    category: 'scallops',
    patterns: ['ribbon', 'scallop', 'arc', 'wave', 'curve', 'arch'],
    weight: 0.85
  },
  {
    category: 'triangles',
    patterns: ['triangle', 'wedge', 'segment'],
    weight: 0.85
  },
  {
    category: 'effects',
    patterns: ['firework', 'cascade', 'burst', 'explosion', 'sparkle', 'flash'],
    weight: 0.80
  }
];
```

### Matching Algorithm

```typescript
function getSpinnerSemanticCategory(name: string): SpinnerSemanticCategory {
  const nameLower = name.toLowerCase();
  
  for (const matcher of SPINNER_MATCHERS) {
    for (const pattern of matcher.patterns) {
      if (nameLower.includes(pattern)) {
        return matcher.category;
      }
    }
  }
  
  return 'other';
}

function canMatchSpinnerSubmodelGroups(
  source: SubmodelGroup, 
  destination: SubmodelGroup
): { canMatch: boolean; confidence: number; reason: string } {
  
  // Both must be spinner submodel groups
  if (source.type !== 'SUBMODEL_GRP' || destination.type !== 'SUBMODEL_GRP') {
    return { canMatch: false, confidence: 0, reason: 'Type mismatch' };
  }
  
  const sourceCategory = getSpinnerSemanticCategory(source.name);
  const destCategory = getSpinnerSemanticCategory(destination.name);
  
  // Same category = high confidence match
  if (sourceCategory === destCategory && sourceCategory !== 'other') {
    return { 
      canMatch: true, 
      confidence: 0.85, 
      reason: `Same semantic category: ${sourceCategory}` 
    };
  }
  
  // Different categories = no match (prevents "Hearts" matching "Spokes")
  if (sourceCategory !== 'other' && destCategory !== 'other') {
    return { 
      canMatch: false, 
      confidence: 0, 
      reason: `Category mismatch: ${sourceCategory} vs ${destCategory}` 
    };
  }
  
  // Fall back to name-based matching for 'other' category
  return { canMatch: true, confidence: 0.5, reason: 'Fallback to name matching' };
}
```

---

## Source Pattern Recognition

### Common Source Naming Patterns

| Pattern | Meaning | Matches To |
|---------|---------|------------|
| `S - X` | Spinner submodel group named X | Category of X |
| `Spinner - X` | Spinner submodel group | Category of X |
| `X GRP` or `X Group` | Group of X elements | Category of X |
| `All X` or `X All` | All instances of X | Category of X |

### Extraction Regex

```typescript
const SOURCE_PATTERNS = [
  /^S\s*-\s*(.+)$/i,           // "S - Big Hearts" -> "Big Hearts"
  /^Spinner\s*-\s*(.+)$/i,     // "Spinner - Rings" -> "Rings"
  /^(.+?)\s+GRP$/i,            // "Hearts GRP" -> "Hearts"
  /^All\s+(.+)$/i,             // "All Rings" -> "Rings"
  /^(.+?)\s+All$/i             // "Rings All" -> "Rings"
];

function extractSemanticName(fullName: string): string {
  for (const pattern of SOURCE_PATTERNS) {
    const match = fullName.match(pattern);
    if (match) return match[1].trim();
  }
  return fullName;
}
```

---

## Files Generated

1. **xmodel_analysis.json** - Full parsed database of 1,276 models
2. **spinner_rosetta_stone.json** - Semantic matching rules

These files can be bundled with ModIQ or loaded at runtime for matching.

---

## Boscoyo (Added)

**64 models parsed**, **9 spinners** identified, **29 models with submodels**

### Key Boscoyo Spinner Props

| Model | Submodel Count | Key Submodels |
|-------|---------------|---------------|
| 46 MegaSpin / MegaSpinner | 17 | Spokes 1-16, Circle |
| ChromaFlake 36-1 through 36-4 | 7-9 | Hub, Points, Rings, Diamonds, Arrows |
| Snowflake-1 | 4 | Arms, Tips, Ring, Spinner |
| Spider Web / HDPE Spider Web | 14-33 | Spinner 1-8, Ring 1-4 |
| Whimsical Spinner | 25 | Ears, Eyes, Face elements |

### Boscoyo Naming Patterns

- Uses numbered spokes: "Spokes", "Spokes 2", "Spokes 3"... (not "Spoke 1", "Spoke 2")
- Spider webs use "Spinner N" for radial sections
- ChromaFlake uses geometric terms: "Diamond", "Arrow", "Point", "Hub"

### Cross-Vendor Mapping Examples

| Boscoyo | Equivalent To |
|---------|---------------|
| MegaSpin/Spokes | GE SpinReel Max/Spoke 1-14 |
| MegaSpin/Circle | GE SpinReel Max/Inner Circle, Outer Circle |
| ChromaFlake/Diamond | GE patterns with triangular elements |
| Spider Web/Spinner N | Radial web segment patterns |

---

## Updated Totals (All 4 Vendors)

| Vendor | Total Models | Spinners | With Submodels |
|--------|-------------|----------|----------------|
| Gilbert Engineering | 1,001 | 263 | 732 |
| Holiday Coro | 224 | 10 | 115 |
| EFL Designs | 51 | 12 | 40 |
| Boscoyo | 64 | 9 | 29 |
| **TOTAL** | **1,340** | **294** | **916** |
