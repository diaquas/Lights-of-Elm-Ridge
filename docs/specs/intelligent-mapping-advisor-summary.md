# Intelligent Mapping Advisor - Feature Suite Summary

## 🎯 Vision

Transform ModIQ from a **mapping tool** into a **sequence optimization advisor** that helps users get the best possible visual experience from any sequence on THEIR specific display.

| Before | After |
|--------|-------|
| "Get all my models mapped" | "Make this sequence look AMAZING on my display" |
| Success = 100% mapped | Success = Best visual experience |
| Blind to effect quality | Effect-aware recommendations |
| User does all the work | AI guides optimal choices |

---

## 📊 Data Foundation

This feature suite is built on **validated data from 17 real sequences**:

- **60,490 effects analyzed**
- **840 unique models**
- **48 effect types catalogued**
- **Sources**: LOER, VLS, Halloween Horror Lights, and other vendors

### Key Data Insights Discovered:

| Finding | Impact |
|---------|--------|
| "On" effect is 21% of everything | Don't count it as valuable |
| Shockwave + Ripple = 25% | Universal, work on any prop |
| Faces effect → 76% on singing props | Strong matching signal |
| Text effect → 87% on matrices | Very strong matching signal |
| Video effect → 71% on matrices | High-value indicator |
| 6+ effect types = signature model | Complexity indicator |

---

## 🗺️ Feature Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  UPLOAD                                                                     │
│    │                                                                        │
│    ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PROCESSING                                          [Ticket 43]    │   │
│  │  • Parse effects from .xsq                                          │   │
│  │  • Categorize effects (signature, circular, linear, etc.)           │   │
│  │  • Calculate complexity scores                                       │   │
│  │  • Identify signature effects                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│    │                                                                        │
│    ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AUTO-MATCH                                          [Ticket 46]    │   │
│  │  • Effect-based matching rules                                       │   │
│  │  • Faces → singing prop (+20% bonus)                                │   │
│  │  • Text/Video → matrix (+20-25% bonus)                              │   │
│  │  • Pinwheel → spinner (+12% bonus)                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│    │                                                                        │
│    ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AUTO-MATCH REVIEW                                   [Ticket 42]    │   │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │   │
│  │  │  YOUR DISPLAY  87%  │  │  EFFECTS       48%  │                   │   │
│  │  │  44/51 models       │  │  7,840/16,420       │                   │   │
│  │  └─────────────────────┘  └─────────────────────┘                   │   │
│  │  Dual metrics: Display coverage + Effects coverage                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│    │                                                                        │
│    ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  GROUPS / MODELS / SUBMODEL GROUPS                   [Ticket 44]    │   │
│  │                                                                      │   │
│  │  Effect-Aware Suggestions:                                           │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │ ⭐ PERFECT FOR SPINNERS                              92%   │     │   │
│  │  │ GE Overlord                                                │     │   │
│  │  │ 🌀 47 Spirals │ 🎆 12 Pinwheel │ ✨ 8 Kaleidoscope        │     │   │
│  │  │ "Signature circular effects designed for spinners"         │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │ ⚠️ EFFECT MISMATCH                                   87%   │     │   │
│  │  │ GE Fuzion                                                  │     │   │
│  │  │ 🌊 62 Wave │ 🏃 34 Chase                                   │     │   │
│  │  │ "These linear effects are better for arches"               │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│    │                                                                        │
│    ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  POST-MAPPING OPTIMIZATION                           [Ticket 45]    │   │
│  │                                                                      │   │
│  │  💎 HIDDEN GEM: "Matrix B" has Video effect mapped to Test Matrix  │   │
│  │     → Suggest swap to Main Matrix                                    │   │
│  │                                                                      │   │
│  │  🔄 MISMATCH: Spinner getting Wave effects                          │   │
│  │     → Suggest better sequence model with Spiral effects              │   │
│  │                                                                      │   │
│  │  📊 DIVERSITY: 73% of display is Rainbow Wave                       │   │
│  │     → Suggest more variety                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│    │                                                                        │
│    ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  REVIEW                                         [Tickets 39, 40]    │   │
│  │                                                                      │   │
│  │  User-centric metrics:                                               │   │
│  │  • YOUR DISPLAY COVERAGE: 94% (not sequence coverage)               │   │
│  │  • EFFECTS: 97% of visual effects will show                         │   │
│  │  • Informational notices (not scary warnings)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│    │                                                                        │
│    ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FINAL CHECK                                         [Ticket 47]    │   │
│  │                                                                      │   │
│  │  "You might be missing something better"                             │   │
│  │                                                                      │   │
│  │  Analyzes UNMAPPED sequence models:                                  │   │
│  │  • Finds valuable effects going to waste                             │   │
│  │  • Compares to current mappings                                      │   │
│  │  • Suggests switches for better visual impact                        │   │
│  │                                                                      │   │
│  │  💎 POTENTIAL UPGRADE                                                │   │
│  │  Your "Main Matrix" → "Matrix A" (basic effects)                    │   │
│  │  UNMAPPED: "Matrix B" has Video, Morph, Faces! 🎬✨🎭               │   │
│  │  [Switch to Matrix B]                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│    │                                                                        │
│    ▼                                                                        │
│  EXPORT                                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Ticket Index

### Core Effect Analysis
| Ticket | Title | Priority | Effort | Description |
|--------|-------|----------|--------|-------------|
| **43** | Effect Type Parser | HIGH | Medium | Parse effects from .xsq, categorize, calculate complexity |

### Matching Algorithm Enhancements
| Ticket | Title | Priority | Effort | Description |
|--------|-------|----------|--------|-------------|
| **46** | Effect-Based Matching Rules | HIGH | Medium | Add effect-type bonuses to auto-match (Faces→singing +20%) |

### User-Centric Metrics
| Ticket | Title | Priority | Effort | Description |
|--------|-------|----------|--------|-------------|
| **39** | Progress Tracking Redesign | HIGH | Medium | Effects coverage as primary metric throughout |
| **40** | Review Screen Redesign | HIGH | Medium | "Your Display Coverage" not "Sequence Coverage" |
| **42** | Auto-Match Dual Metrics | HIGH | Medium | Show both display AND effects coverage |

### Intelligent Suggestions
| Ticket | Title | Priority | Effort | Description |
|--------|-------|----------|--------|-------------|
| **44** | Effect-Aware Suggestions | HIGH | Medium | Show effect info when choosing mappings |
| **45** | Post-Mapping Optimization | MEDIUM-HIGH | High | Suggest swaps for hidden gems, mismatches |
| **47** | Final Check | MEDIUM-HIGH | Medium | Find valuable unmapped models before export |

### Parent Ticket
| Ticket | Title | Priority | Effort | Description |
|--------|-------|----------|--------|-------------|
| **41** | Intelligent Mapping Advisor | HIGH | - | Epic/parent ticket for all above |

---

## 🔧 Technical Components

### Data Structures

```typescript
// Core effect analysis output
interface SequenceEffectAnalysis {
  models: Map<string, ModelEffectProfile>;
  totalEffects: number;
  allEffectTypes: string[];
  effectTypeDistribution: Map<string, number>;
}

interface ModelEffectSummary {
  modelName: string;
  totalEffects: number;
  dominantCategory: EffectCategory;
  bestPropType: string;
  hasSignatureEffects: boolean;
  signatureEffects: string[];
  topEffects: Array<{ type: string; count: number; percent: number }>;
  complexityScore: number;
}
```

### Key Constants (Validated from Real Data)

```typescript
// Effect categories with real-world percentages
const EFFECT_CATEGORIES = {
  fill: ['On', 'Color Wash', 'Off', ...],        // 33.9%
  radial: ['Shockwave', 'Ripple'],               // 25.0%
  linear: ['SingleStrand', 'Bars', 'Wave', ...], // 16.1%
  matrix: ['Morph', 'Video', 'Pictures', ...],   // 8.3%
  circular: ['Pinwheel', 'Spirals', 'Fan', ...], // 6.4%
  signature: ['Video', 'Shader', 'Faces', ...],  // Rare but impactful
  // ... more categories
};

// Effect-to-model-type affinity (for matching bonuses)
const EFFECT_MODEL_AFFINITY = {
  'Faces': { primaryType: 'singing', confidence: 76, matchBonus: 0.20 },
  'Text': { primaryType: 'matrix', confidence: 87, matchBonus: 0.25 },
  'Video': { primaryType: 'matrix', confidence: 71, matchBonus: 0.20 },
  'Pinwheel': { primaryType: 'spinner', confidence: 42, matchBonus: 0.12 },
  // ... more rules
};

// Effect impact weights for scoring
const EFFECT_IMPACT_WEIGHTS = {
  'Video': 10, 'Shader': 10, 'Plasma': 10,      // Signature
  'Morph': 8, 'Warp': 7, 'Pictures': 9,         // Matrix special
  'Spirals': 6, 'Pinwheel': 5, 'Fan': 6,        // Circular
  'SingleStrand': 4, 'Wave': 5,                  // Linear
  'Shockwave': 3, 'Ripple': 3,                   // Radial (common)
  'On': 1, 'Color Wash': 2,                      // Fill (basic)
  // ... more weights
};
```

---

## 📈 Expected Impact

### Quantitative
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Auto-match accuracy | 30-50% | 65-80% | +35-50% |
| Effect-prop alignment | ~50% | 80%+ | +30% |
| Signature effect utilization | ~50% | 90%+ | +40% |
| User satisfaction | Unknown | Target +30% | Significant |

### Qualitative
- Users understand WHAT they're getting, not just that something matched
- Fewer "why does my spinner look weird" support questions
- Premium props get premium effects
- Hidden gems surfaced instead of wasted
- Progress feels motivating, not overwhelming

---

## 🚀 Implementation Order

### Phase 1: Foundation (Do First)
1. **Ticket 43** - Effect Parser (everything depends on this)
2. **Ticket 46** - Effect-Based Matching Rules (improves auto-match immediately)

### Phase 2: Metrics (High Impact, Low Risk)
3. **Ticket 39** - Progress Tracking Redesign
4. **Ticket 40** - Review Screen Redesign
5. **Ticket 42** - Auto-Match Dual Metrics

### Phase 3: Intelligent Suggestions (The Magic)
6. **Ticket 44** - Effect-Aware Suggestions
7. **Ticket 45** - Post-Mapping Optimization
8. **Ticket 47** - Final Check

---

## 📊 Data Files Generated

| File | Description |
|------|-------------|
| `effect-analysis-report-v2.md` | Full analysis of 17 sequences, 60K effects |
| `ticket-43-effect-parser.md` | Includes validated EFFECT_CATEGORIES |
| `ticket-44-effect-aware-suggestions.md` | Includes PROP_EFFECT_AFFINITY |
| `ticket-45-post-mapping-optimization.md` | Includes SIGNATURE_EFFECTS, isHiddenGem() |
| `ticket-46-effect-based-matching-rules.md` | Includes EFFECT_MODEL_AFFINITY |

---

## 🔮 Future Enhancements (V2/V3)

Not included in V1, but potential follow-ups:

1. **Sequence Personality Matching** - Pre-upload recommendations
2. **Effect Preview/Simulation** - Visual preview of effects
3. **Learning from User Choices** - Improve suggestions over time
4. **Multi-Sequence Comparison** - "Sequence A uses your spinners better"
5. **Effect Diversity Report** - Post-export analysis

---

## ✅ Success Criteria

The Intelligent Mapping Advisor is successful when:

1. ✅ Users see effect information during mapping decisions
2. ✅ Auto-match uses effect data to improve accuracy
3. ✅ Progress metrics focus on user's display, not sequence
4. ✅ Hidden gems are surfaced before export
5. ✅ Singing props match to Faces effects
6. ✅ Matrices match to Video/Morph effects
7. ✅ Spinners match to Pinwheel/Spiral effects
8. ✅ Users feel confident they got the best possible mapping

---

## 📝 Notes

- All effect data validated from real sequences (not theoretical)
- Categories and weights can be tuned based on user feedback
- Effect parsing adds minimal processing time (<500ms for 20K effects)
- UI components designed to be non-intrusive (suggestions, not requirements)
- Users can always ignore suggestions and map manually

---

*Document created: February 2026*
*Tickets: 39, 40, 41, 42, 43, 44, 45, 46, 47*
*Based on analysis of 17 sequences from multiple vendors*
