# Ticket 11: xLights Type System Definition

## 🎯 Objective
Define a proper type system for ModIQ that accurately represents xLights entity types and their hierarchical relationships.

## 📝 Nomenclature Update: "Spinners" → "High Density"

The phase previously called "Spinners" should be renamed to **"High Density"** in all user-facing UI. This better reflects the growing category of props with extensive submodel structures:

- Showstopper Spinners (the original inspiration)
- Showstopper Wreaths
- Showstopper Fountains  
- Giant HD Snowflakes
- GE Road Tombstones
- Any prop with many submodel groups

**Under the hood:** The type is still `SUBMODEL_GROUP` and detection still uses the `/` character. Only the UI label changes.

## 📋 Background: Real-World Layout Analysis

After analyzing real xLights layouts, we discovered there are **4 distinct entity types** that matter:

### xLights Entity Types (Simplified)

| Type | Definition | Example | How to Detect |
|------|-----------|---------|---------------|
| **MODEL** | A physical prop/fixture | `Spinner - Showstopper 1`, `Arch 1`, `Mega Tree` | `<model name="...">` element |
| **SUBMODEL** | A named portion of a Model | `Spinner - Showstopper 1/All Rings-01` | `<subModel name="...">` inside a `<model>`, referenced with `/` |
| **MODEL_GROUP** | A group containing ONLY models | `All - Spinners - GRP` (contains 7 spinner models) | `<modelGroup>` where NO members have `/` |
| **SUBMODEL_GROUP** | A group containing submodels | `S - All Rings` (submodels from 3 spinners) | `<modelGroup>` where ANY members have `/` |

### ⚠️ Key Correction from Previous Analysis

**WRONG:** Looking for ` GRP` suffix to detect "META_GROUP"
**RIGHT:** The ` GRP` suffix is just a naming convention and means nothing for type detection

**Example from real layout:**
- `All - Spinners - GRP` → Contains: `Spinner - Showstopper 1, Spinner - Showstopper 2, Spinner - Showstopper 3, ...`
- These are **7 MODELS**, not groups. This is a **MODEL_GROUP**.

**The ONLY thing that determines group type is whether members contain `/`:**
- NO `/` in members → MODEL_GROUP
- ANY `/` in members → SUBMODEL_GROUP (High Density)

### Real Layout Examples

**MODEL_GROUP (Groups phase):**
```
All - Spinners - GRP
├── Spinner - Showstopper 1    (MODEL - no slash)
├── Spinner - Showstopper 2    (MODEL - no slash)
├── Spinner - Showstopper 3    (MODEL - no slash)
├── Spinner - Fuzion           (MODEL - no slash)
├── Spinner - Click Click Boom (MODEL - no slash)
├── Spinner - Overlord         (MODEL - no slash)
└── Spinner - Rosa Grande      (MODEL - no slash)
```

**SUBMODEL_GROUP (High Density phase):**
```
S - All Rings
├── Spinner - Showstopper 1/All Rings-01   (SUBMODEL - has slash)
├── Spinner - Showstopper 1/All Rings-02   (SUBMODEL - has slash)
├── Spinner - Showstopper 2/All Rings-01   (SUBMODEL - has slash)
├── Spinner - Showstopper 2/All Rings-02   (SUBMODEL - has slash)
├── Spinner - Showstopper 3/All Rings-01   (SUBMODEL - has slash)
└── ... (submodels from ALL 3 spinners combined)
```

## 🔧 Implementation

### File: `types/xLightsTypes.ts`

```typescript
/**
 * Core xLights entity types - SIMPLIFIED
 * 
 * The "/" character is the ONLY marker that matters:
 * - If a name contains "/", it's a SUBMODEL reference
 * - If a group's members contain "/", it's a SUBMODEL_GROUP
 * - Everything else is MODEL or MODEL_GROUP
 */
export type XLightsEntityType = 
  | 'MODEL'          // Physical prop (Spinner - Showstopper 1)
  | 'SUBMODEL'       // Part of a model (Spinner - Showstopper 1/All Rings-01)
  | 'MODEL_GROUP'    // Group of models (All - Spinners - GRP)
  | 'SUBMODEL_GROUP'; // Group of submodels (S - All Rings) - "High Density"

/**
 * Simplified type for UI phase filtering
 */
export type ModIQPhaseType = 
  | 'MODEL'       // Individual physical props
  | 'GROUP'       // MODEL_GROUP (groups of whole models)
  | 'HIGH_DENSITY';  // SUBMODEL_GROUP (groups of submodels across multiple models)

/**
 * Base interface for all xLights entities
 */
export interface XLightsEntity {
  name: string;
  entityType: XLightsEntityType;
  phaseType: ModIQPhaseType;
}

/**
 * A physical model/prop
 */
export interface XLightsModel extends XLightsEntity {
  entityType: 'MODEL';
  phaseType: 'MODEL';
  submodels: XLightsSubmodel[];
}

/**
 * A submodel (part of a model)
 */
export interface XLightsSubmodel extends XLightsEntity {
  entityType: 'SUBMODEL';
  phaseType: 'MODEL';
  parentModel: string; // e.g., "Spinner - Showstopper 1"
  fullName: string;    // e.g., "Spinner - Showstopper 1/All Rings-01"
}

/**
 * A group (either of models or submodels)
 */
export interface XLightsGroup extends XLightsEntity {
  entityType: 'MODEL_GROUP' | 'SUBMODEL_GROUP';
  phaseType: 'GROUP' | 'HIGH_DENSITY';
  members: string[];
}
```

### File: `lib/xlightsTypeDetection.ts`

```typescript
import type { XLightsEntityType, ModIQPhaseType } from '@/types/xLightsTypes';

/**
 * Detect if a name references a submodel (contains "/")
 */
export function isSubmodelReference(name: string): boolean {
  return name.includes('/');
}

/**
 * Parse a submodel reference into parent and child
 * e.g., "Spinner - Showstopper 1/All Rings-01" -> { parent: "Spinner - Showstopper 1", child: "All Rings-01" }
 */
export function parseSubmodelReference(name: string): { parent: string; child: string } | null {
  if (!name.includes('/')) return null;
  const [parent, ...rest] = name.split('/');
  return { parent, child: rest.join('/') };
}

/**
 * Determine group type based on members
 * 
 * SIMPLE RULE: If ANY member contains "/", it's a SUBMODEL_GROUP
 * Otherwise, it's a MODEL_GROUP
 */
export function detectGroupType(members: string[]): 'MODEL_GROUP' | 'SUBMODEL_GROUP' {
  const hasSubmodelMembers = members.some(member => member.includes('/'));
  return hasSubmodelMembers ? 'SUBMODEL_GROUP' : 'MODEL_GROUP';
}

/**
 * Map entity type to ModIQ phase
 */
export function getPhaseType(entityType: XLightsEntityType): ModIQPhaseType {
  switch (entityType) {
    case 'MODEL':
    case 'SUBMODEL':
      return 'MODEL';
    case 'SUBMODEL_GROUP':
      return 'HIGH_DENSITY';
    case 'MODEL_GROUP':
      return 'GROUP';
    default:
      return 'MODEL';
  }
}
```

### File: `types/mappingPhases.ts`

```typescript
import type { ModIQPhaseType } from './xLightsTypes';

export type MappingPhase = 
  | 'upload'
  | 'auto-matches'
  | 'groups'
  | 'models'
  | 'high-density'  // Was 'spinners' - now covers all HD props
  | 'review';

export const PHASE_METADATA: Record<MappingPhase, {
  title: string;
  description: string;
  phaseTypes: ModIQPhaseType[];
}> = {
  upload: {
    title: 'Upload',
    description: 'Upload your xLights layout file',
    phaseTypes: [],
  },
  'auto-matches': {
    title: 'Auto-Matches',
    description: 'Review automatically matched items',
    phaseTypes: ['MODEL', 'GROUP', 'HIGH_DENSITY'],
  },
  groups: {
    title: 'Groups',
    description: 'Map model groups (collections of whole models)',
    phaseTypes: ['GROUP'],
  },
  models: {
    title: 'Individual Models',
    description: 'Map individual models and submodels',
    phaseTypes: ['MODEL'],
  },
  'high-density': {
    title: 'High Density',
    description: 'Map submodel groups for spinners, wreaths, fountains & other HD props',
    phaseTypes: ['HIGH_DENSITY'],
  },
  review: {
    title: 'Review',
    description: 'Review all mappings before saving',
    phaseTypes: ['MODEL', 'GROUP', 'HIGH_DENSITY'],
  },
};

/**
 * Filter items for a specific phase based on their phaseType
 */
export function getItemsForPhase<T extends { phaseType: ModIQPhaseType }>(
  items: T[],
  phase: MappingPhase
): T[] {
  switch (phase) {
    case 'groups':
      // Only MODEL_GROUP (groups of whole models)
      return items.filter(item => item.phaseType === 'GROUP');
    
    case 'models':
      // Only MODEL and SUBMODEL
      return items.filter(item => item.phaseType === 'MODEL');
    
    case 'high-density':
      // Only SUBMODEL_GROUP (groups of submodels - "High Density")
      return items.filter(item => item.phaseType === 'HIGH_DENSITY');
    
    default:
      return items;
  }
}
```

### File: `lib/xlightsParser.ts`

```typescript
import type { 
  XLightsModel, 
  XLightsSubmodel, 
  XLightsGroup,
  XLightsEntity,
  ModIQPhaseType
} from '@/types/xLightsTypes';
import { detectGroupType, getPhaseType, parseSubmodelReference } from './xlightsTypeDetection';

export interface ParsedXLightsFile {
  models: Map<string, XLightsModel>;
  submodels: Map<string, XLightsSubmodel>;
  groups: Map<string, XLightsGroup>;
  
  // Convenience getters
  get allEntities(): XLightsEntity[];
  byPhaseType(phase: ModIQPhaseType): XLightsEntity[];
}

export function parseXLightsFile(xmlContent: string): ParsedXLightsFile {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  const models = new Map<string, XLightsModel>();
  const submodels = new Map<string, XLightsSubmodel>();
  const groups = new Map<string, XLightsGroup>();
  
  // Parse models and their submodels
  const modelElements = doc.querySelectorAll('model');
  modelElements.forEach(modelEl => {
    const name = modelEl.getAttribute('name');
    if (!name) return;
    
    const modelSubmodels: XLightsSubmodel[] = [];
    
    // Parse submodels
    const submodelElements = modelEl.querySelectorAll('subModel');
    submodelElements.forEach(subEl => {
      const subName = subEl.getAttribute('name');
      if (!subName) return;
      
      const fullName = `${name}/${subName}`;
      const submodel: XLightsSubmodel = {
        name: subName,
        fullName,
        parentModel: name,
        entityType: 'SUBMODEL',
        phaseType: 'MODEL',
      };
      
      modelSubmodels.push(submodel);
      submodels.set(fullName, submodel);
    });
    
    const model: XLightsModel = {
      name,
      entityType: 'MODEL',
      phaseType: 'MODEL',
      submodels: modelSubmodels,
    };
    
    models.set(name, model);
  });
  
  // Parse model groups
  const groupElements = doc.querySelectorAll('modelGroup');
  groupElements.forEach(groupEl => {
    const name = groupEl.getAttribute('name');
    const modelsAttr = groupEl.getAttribute('models');
    if (!name || !modelsAttr) return;
    
    const members = modelsAttr.split(',').map(m => m.trim()).filter(Boolean);
    const entityType = detectGroupType(members);
    const phaseType = getPhaseType(entityType);
    
    const group: XLightsGroup = {
      name,
      entityType,
      phaseType,
      members,
    };
    
    groups.set(name, group);
  });
  
  return {
    models,
    submodels,
    groups,
    
    get allEntities(): XLightsEntity[] {
      return [
        ...Array.from(models.values()),
        ...Array.from(submodels.values()),
        ...Array.from(groups.values()),
      ];
    },
    
    byPhaseType(phase: ModIQPhaseType): XLightsEntity[] {
      return this.allEntities.filter(e => e.phaseType === phase);
    },
  };
}
```

## 📊 Visual: Type Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        xLights Entity Type Hierarchy                         │
│                            (SIMPLIFIED)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Detection Rule                                    │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │   Does the name/member contain "/"?                                  │   │
│  │                                                                      │   │
│  │   YES → SUBMODEL or SUBMODEL_GROUP (High Density)                   │   │
│  │   NO  → MODEL or MODEL_GROUP                                        │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Entity Types                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │   MODEL               SUBMODEL            MODEL_GROUP    SUBMODEL_GROUP │
│  │   ┌─────────────┐    ┌─────────────────┐  ┌──────────┐   ┌──────────┐│   │
│  │   │Spinner -    │    │Spinner -        │  │All -     │   │S - All   ││   │
│  │   │Showstopper 1│    │Showstopper 1/   │  │Spinners -│   │Rings     ││   │
│  │   │             │    │All Rings-01     │  │GRP       │   │          ││   │
│  │   │(no slash)   │    │(has slash)      │  │(members  │   │(members  ││   │
│  │   │             │    │                 │  │have NO /)│   │HAVE /)   ││   │
│  │   └─────────────┘    └─────────────────┘  └──────────┘   └──────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ModIQ Phase Mapping                               │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │   GROUPS Phase          MODELS Phase         HIGH DENSITY Phase     │   │
│  │   ┌─────────────┐       ┌─────────────┐      ┌─────────────────┐   │   │
│  │   │ MODEL_GROUP │       │ MODEL       │      │ SUBMODEL_GROUP  │   │   │
│  │   │             │       │ SUBMODEL    │      │ (S - groups,    │   │   │
│  │   │ (groups of  │       │             │      │  spinner parts, │   │   │
│  │   │  whole      │       │ (individual │      │  HD props)      │   │   │
│  │   │  models)    │       │  props)     │      │                 │   │   │
│  │   └─────────────┘       └─────────────┘      └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🧪 Test Cases

```typescript
import { detectGroupType, isSubmodelReference } from '@/lib/xlightsTypeDetection';

describe('xlightsTypeDetection', () => {
  describe('isSubmodelReference', () => {
    it('returns true for submodel references', () => {
      expect(isSubmodelReference('Spinner - Showstopper 1/All Rings-01')).toBe(true);
      expect(isSubmodelReference('Mega Tree/Ring 1')).toBe(true);
    });
    
    it('returns false for model names', () => {
      expect(isSubmodelReference('Spinner - Showstopper 1')).toBe(false);
      expect(isSubmodelReference('All - Spinners - GRP')).toBe(false);
      expect(isSubmodelReference('Arch 1')).toBe(false);
    });
  });
  
  describe('detectGroupType', () => {
    it('returns MODEL_GROUP when no members have slashes', () => {
      // Real example: All - Spinners - GRP
      const members = [
        'Spinner - Showstopper 1',
        'Spinner - Showstopper 2',
        'Spinner - Showstopper 3',
        'Spinner - Fuzion',
      ];
      expect(detectGroupType(members)).toBe('MODEL_GROUP');
    });
    
    it('returns SUBMODEL_GROUP when ANY member has a slash', () => {
      // Real example: S - All Rings
      const members = [
        'Spinner - Showstopper 1/All Rings-01',
        'Spinner - Showstopper 1/All Rings-02',
        'Spinner - Showstopper 2/All Rings-01',
      ];
      expect(detectGroupType(members)).toBe('SUBMODEL_GROUP');
    });
    
    it('handles GRP suffix correctly (it is ignored)', () => {
      // The GRP suffix means NOTHING for type detection
      const modelGroupMembers = ['Tree 1', 'Tree 2', 'Some Thing GRP'];
      // Even if a member has "GRP" in name, if no slash, it's MODEL_GROUP
      expect(detectGroupType(modelGroupMembers)).toBe('MODEL_GROUP');
    });
  });
});
```

## ✅ Acceptance Criteria

- [ ] Type system correctly identifies all 4 entity types (MODEL, SUBMODEL, MODEL_GROUP, SUBMODEL_GROUP)
- [ ] Parser correctly categorizes entities from xLights XML
- [ ] Groups phase shows: MODEL_GROUP only
- [ ] Models phase shows: MODEL, SUBMODEL
- [ ] **High Density phase shows: SUBMODEL_GROUP only**
- [ ] UI stepper shows "High Density" not "Spinners"
- [ ] Detection uses ONLY the `/` character - NOT the ` GRP` suffix
- [ ] "All - Spinners - GRP" correctly identified as MODEL_GROUP (contains models, not submodels)
- [ ] "S - All Rings" correctly identified as SUBMODEL_GROUP (contains submodels from multiple models)

## 🚫 Removed from Previous Version

- **META_GROUP** - Not needed. Groups containing other groups are rare and should be treated as MODEL_GROUP for simplicity.
- **MIXED_GROUP** - Not needed. If ANY member has `/`, treat as SUBMODEL_GROUP.
- **GRP suffix detection** - This was WRONG. The suffix is just a naming convention.

## 📌 Summary

**One simple rule determines group type:**

```typescript
function detectGroupType(members: string[]): 'MODEL_GROUP' | 'SUBMODEL_GROUP' {
  return members.some(m => m.includes('/')) ? 'SUBMODEL_GROUP' : 'MODEL_GROUP';
}
```

That's it. No META_GROUP, no MIXED_GROUP, no GRP suffix checking.
