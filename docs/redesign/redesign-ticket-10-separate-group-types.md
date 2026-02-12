# Ticket: Separate MODEL_GRP and SUBMODEL_GRP in Phases

## Priority: P0 (Quick Fix)

## Summary

SUBMODEL_GRP items (spinner submodels) are appearing in the Groups phase, but they have their own dedicated Spinners phase. This is confusing — each item type should only appear in its designated phase.

---

## Problem

Currently in Groups phase:
- ❌ Shows MODEL_GRP items (correct)
- ❌ Shows SUBMODEL_GRP items (wrong — these belong in Spinners)

Users see spinner submodel groups like "S - Big Y" mixed with regular groups like "All Arches", which is confusing because:
1. They require different matching logic (semantic vs name)
2. They have their own dedicated wizard step
3. It clutters the Groups phase unnecessarily

---

## Solution

Update the phase filters to be mutually exclusive:

```typescript
// types/mappingPhases.ts

export const PHASE_CONFIG: PhaseConfig[] = [
  {
    id: 'upload',
    label: 'Upload',
    description: 'Select source sequence to map',
    filter: () => false,
  },
  {
    id: 'auto-accept',
    label: 'Auto-Matches',
    description: 'High-confidence matches ready to accept',
    filter: (item) => item.bestMatch?.confidence >= 0.85,
    minConfidence: 0.85
  },
  {
    id: 'groups',
    label: 'Groups',
    description: 'Match model groups to source groups',
    // FIXED: Exclude SUBMODEL_GRP - they go to Spinners phase
    filter: (item) => 
      item.type === 'MODEL_GRP' && 
      item.type !== 'SUBMODEL_GRP' &&  // Explicit exclusion
      (item.bestMatch?.confidence ?? 0) < 0.85
  },
  {
    id: 'models',
    label: 'Models',
    description: 'Match individual models',
    // FIXED: Exclude both group types
    filter: (item) => 
      (item.type === 'MODEL' || !item.type) &&
      item.type !== 'MODEL_GRP' &&
      item.type !== 'SUBMODEL_GRP' &&
      (item.bestMatch?.confidence ?? 0) < 0.85
  },
  {
    id: 'spinners',
    label: 'Spinners',
    description: 'Semantic matching for spinner submodel groups',
    // ONLY SUBMODEL_GRP items
    filter: (item) => item.type === 'SUBMODEL_GRP'
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Review all mappings before export',
    filter: () => true
  }
];
```

---

## Also Update Source Panel Filters

When in Groups phase, the right panel should NOT show SUBMODEL_GRP sources:

```tsx
// In GroupsPhase.tsx

<UniversalSourcePanel
  sourceFilter={(source) => 
    // Only show MODEL_GRP sources, NOT SUBMODEL_GRP
    (source.type === 'MODEL_GRP' || source.type === 'GROUP' || source.name.includes('GRP')) &&
    source.type !== 'SUBMODEL_GRP' &&
    !source.name.startsWith('S - ') // Spinner naming convention
  }
  suggestions={selectedGroup?.suggestions || []}
  selectedDestination={selectedGroup}
/>
```

When in Spinners phase, only show SUBMODEL_GRP sources:

```tsx
// In SpinnersPhase.tsx

<UniversalSourcePanel
  sourceFilter={(source) => 
    source.type === 'SUBMODEL_GRP' || 
    source.name.startsWith('S - ') // Spinner naming convention
  }
  suggestions={semanticMatches}
  selectedDestination={currentSpinner}
/>
```

When in Models phase, exclude all groups:

```tsx
// In IndividualsPhase.tsx

<UniversalSourcePanel
  sourceFilter={(source) => 
    (source.type === 'MODEL' || !source.type) &&
    source.type !== 'MODEL_GRP' &&
    source.type !== 'SUBMODEL_GRP' &&
    !source.name.includes('GRP')
  }
  suggestions={selectedModel?.suggestions || []}
  selectedDestination={selectedModel}
/>
```

---

## Type Detection Helper

If `type` field isn't always reliable, add a helper function:

```typescript
// lib/itemTypeDetection.ts

export function getItemType(item: { name: string; type?: string }): 'MODEL' | 'MODEL_GRP' | 'SUBMODEL_GRP' {
  // Explicit type takes precedence
  if (item.type === 'SUBMODEL_GRP') return 'SUBMODEL_GRP';
  if (item.type === 'MODEL_GRP') return 'MODEL_GRP';
  if (item.type === 'MODEL') return 'MODEL';
  
  // Infer from naming conventions
  const name = item.name;
  
  // Spinner submodel patterns (SUBMODEL_GRP)
  if (name.startsWith('S - ')) return 'SUBMODEL_GRP';
  if (name.match(/^(GE|Holiday|Boscoyo|EFL).*GRP$/i)) return 'SUBMODEL_GRP';
  if (name.match(/(Spoke|Ring|Petal|Ribbon|Spiral|Swirl|Floral).*GRP/i)) return 'SUBMODEL_GRP';
  
  // Regular group patterns (MODEL_GRP)
  if (name.startsWith('All ')) return 'MODEL_GRP';
  if (name.match(/^\d+\s+All\s+/)) return 'MODEL_GRP'; // "14 All Window Frames"
  if (name.endsWith(' GRP') && !name.startsWith('S - ')) return 'MODEL_GRP';
  
  // Default to individual model
  return 'MODEL';
}

// Usage in filters:
filter: (item) => getItemType(item) === 'MODEL_GRP' && ...
```

---

## Quick Validation

After fix, verify counts in stepper:

| Phase | Should Show | Should NOT Show |
|-------|-------------|-----------------|
| Groups | "All Arches", "14 All Window Frames" | "S - Big Y", "S - Cascading Petal" |
| Models | "Arch Left", "Tree 1" | Any `*GRP` items |
| Spinners | "S - Big Y", "S - Arrows" | "All Arches", regular models |

---

## Acceptance Criteria

- [ ] Groups phase shows ONLY MODEL_GRP items
- [ ] Groups phase does NOT show SUBMODEL_GRP items  
- [ ] Groups right panel only shows MODEL_GRP sources
- [ ] Models phase shows ONLY individual MODEL items
- [ ] Models phase does NOT show any GRP items
- [ ] Spinners phase shows ONLY SUBMODEL_GRP items
- [ ] Spinners right panel only shows SUBMODEL_GRP sources
- [ ] Stepper counts are accurate for each phase
- [ ] No item appears in multiple phases (except Review which shows all)
