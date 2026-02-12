# Ticket 11: xLights Type System Definition

## 🎯 Objective
Define a proper type system for ModIQ that accurately represents xLights entity types and their hierarchical relationships.

## 📋 Background: What We Learned from Ron Howard's Layout

After analyzing a 14,000+ line xLights layout from Ron Howard (the "GOAT of submodels"), we discovered there are **4 distinct entity types** in xLights, not 2 or 3:

### xLights Entity Types

| Type | Definition | Example | How to Detect |
|------|-----------|---------|---------------|
| **MODEL** | A physical prop/fixture | `Arch 1`, `Star 1`, `Mega Tree` | `<model name="...">` element |
| **SUBMODEL** | A named portion of a Model | `Mega Tree/Ring 1` | `<subModel name="...">` inside a `<model>`, referenced with `/` |
| **MODEL_GROUP** | A group containing Models | `Mini Trees GRP` | `<modelGroup>` where members have NO `/` |
| **SUBMODEL_GROUP** | A group containing Submodels | `GE Grand Illusion Rings GRP` | `<modelGroup>` where members HAVE `/` |
| **META_GROUP** | A group containing other Groups | `Whole House No Yard GRP` | `<modelGroup>` where members end in ` GRP` |
| **MIXED_GROUP** | A group with multiple member types | `Eaves GRP`, `All Pixels GRP` | `<modelGroup>` with combination |

### Ron Howard's Stats:
- **173 Models** (79 with submodels, 94 without)
- **4,071 Submodels**
- **305 Model Groups**:
  - 35 contain ONLY models (MODEL_GROUP)
  - 263 contain ONLY submodels (SUBMODEL_GROUP / "Spinners")
  - 3 contain ONLY other groups (META_GROUP)
  - 4 mixed content (MIXED_GROUP)

### Your "All - Spinners - Showstoppers" Example
You mentioned: *"I have 3 Showstopper Spinners in a Model Group - 'All - Spinners - Showstoppers'; however I bucket ALL submodel groups into a 'master' submodel group"*

This is a **META_GROUP** - a group containing other groups. xLights fully supports this pattern:
```
All - Spinners - Showstoppers (META_GROUP)
├── Spinner 1 Spokes GRP (SUBMODEL_GROUP)
│   ├── Spinner 1/Spoke 1
│   ├── Spinner 1/Spoke 2
│   └── ...
├── Spinner 2 Spokes GRP (SUBMODEL_GROUP)
└── Spinner 3 Spokes GRP (SUBMODEL_GROUP)
```

---

## 🔧 Implementation: Type System Definition

### File: `types/xLightsTypes.ts`

```typescript
/**
 * xLights Entity Type System
 * 
 * Based on analysis of production xLights layouts including
 * Ron Howard's 14,000+ line layout with 4,071 submodels.
 */

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

/**
 * The 6 possible entity types in xLights
 */
export type XLightsEntityType = 
  | 'MODEL'           // Physical prop (Arch 1, Star 1)
  | 'SUBMODEL'        // Portion of a model (Arch 1/Inner Ring)
  | 'MODEL_GROUP'     // Group containing ONLY models
  | 'SUBMODEL_GROUP'  // Group containing ONLY submodels (your "spinners")
  | 'META_GROUP'      // Group containing ONLY other groups
  | 'MIXED_GROUP';    // Group with mixed content types

/**
 * Simplified type for UI phase filtering
 */
export type ModIQPhaseType = 
  | 'MODEL'      // Individual physical props
  | 'GROUP'      // MODEL_GROUP, META_GROUP, MIXED_GROUP (groups of "wholes")
  | 'SPINNER';   // SUBMODEL_GROUP (groups of "parts")

// =============================================================================
// ENTITY INTERFACES
// =============================================================================

export interface XLightsEntity {
  name: string;
  entityType: XLightsEntityType;
  phaseType: ModIQPhaseType;
}

export interface XLightsModel extends XLightsEntity {
  entityType: 'MODEL';
  phaseType: 'MODEL';
  hasSubmodels: boolean;
  submodels: string[];  // Just names, not full submodel objects
}

export interface XLightsSubmodel extends XLightsEntity {
  entityType: 'SUBMODEL';
  phaseType: 'MODEL';  // Submodels are mapped in the "Individual Models" phase
  parentModel: string;
  fullName: string;  // "ParentModel/SubmodelName"
}

export interface XLightsGroup extends XLightsEntity {
  entityType: 'MODEL_GROUP' | 'SUBMODEL_GROUP' | 'META_GROUP' | 'MIXED_GROUP';
  phaseType: 'GROUP' | 'SPINNER';
  members: string[];
  memberBreakdown: {
    models: string[];
    submodels: string[];  // Items with "/" in name
    groups: string[];     // Items ending in " GRP"
  };
}

// =============================================================================
// TYPE DETECTION FUNCTIONS
// =============================================================================

/**
 * Determine the entity type of a modelGroup based on its members
 */
export function detectGroupType(members: string[]): XLightsEntityType {
  let hasModels = false;
  let hasSubmodels = false;
  let hasGroups = false;
  
  for (const member of members) {
    if (member.includes('/')) {
      hasSubmodels = true;
    } else if (member.endsWith(' GRP')) {
      hasGroups = true;
    } else {
      hasModels = true;
    }
  }
  
  // Determine type based on what it contains
  if (hasSubmodels && !hasModels && !hasGroups) {
    return 'SUBMODEL_GROUP';  // Only submodels = "Spinner"
  }
  if (hasGroups && !hasModels && !hasSubmodels) {
    return 'META_GROUP';      // Only groups = Meta Group
  }
  if (hasModels && !hasSubmodels && !hasGroups) {
    return 'MODEL_GROUP';     // Only models = Model Group
  }
  return 'MIXED_GROUP';       // Combination
}

/**
 * Determine which ModIQ phase this entity belongs to
 */
export function getPhaseType(entityType: XLightsEntityType): ModIQPhaseType {
  switch (entityType) {
    case 'MODEL':
    case 'SUBMODEL':
      return 'MODEL';
    case 'SUBMODEL_GROUP':
      return 'SPINNER';
    case 'MODEL_GROUP':
    case 'META_GROUP':
    case 'MIXED_GROUP':
      return 'GROUP';
    default:
      return 'MODEL';
  }
}

/**
 * Parse a member name to extract info
 */
export function parseMemberName(memberName: string): {
  isSubmodel: boolean;
  isGroup: boolean;
  parentModel?: string;
  submodelName?: string;
} {
  if (memberName.includes('/')) {
    const [parent, child] = memberName.split('/');
    return {
      isSubmodel: true,
      isGroup: false,
      parentModel: parent,
      submodelName: child,
    };
  }
  if (memberName.endsWith(' GRP')) {
    return {
      isSubmodel: false,
      isGroup: true,
    };
  }
  return {
    isSubmodel: false,
    isGroup: false,
  };
}

/**
 * Analyze group members and return breakdown
 */
export function analyzeGroupMembers(members: string[]): {
  models: string[];
  submodels: string[];
  groups: string[];
} {
  const result = {
    models: [] as string[],
    submodels: [] as string[],
    groups: [] as string[],
  };
  
  for (const member of members) {
    const parsed = parseMemberName(member);
    if (parsed.isSubmodel) {
      result.submodels.push(member);
    } else if (parsed.isGroup) {
      result.groups.push(member);
    } else {
      result.models.push(member);
    }
  }
  
  return result;
}
```

---

## 🔧 Implementation: XML Parser Update

### File: `lib/xlightsParser.ts`

```typescript
import { 
  XLightsEntityType, 
  XLightsModel, 
  XLightsSubmodel, 
  XLightsGroup,
  detectGroupType,
  getPhaseType,
  analyzeGroupMembers,
} from '@/types/xLightsTypes';

export interface ParsedXLightsFile {
  models: Map<string, XLightsModel>;
  submodels: Map<string, XLightsSubmodel>;
  groups: Map<string, XLightsGroup>;
  
  // Convenience accessors
  allEntities: Map<string, XLightsModel | XLightsSubmodel | XLightsGroup>;
  byPhaseType: {
    MODEL: (XLightsModel | XLightsSubmodel)[];
    GROUP: XLightsGroup[];
    SPINNER: XLightsGroup[];
  };
}

export function parseXLightsFile(xmlContent: string): ParsedXLightsFile {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  const result: ParsedXLightsFile = {
    models: new Map(),
    submodels: new Map(),
    groups: new Map(),
    allEntities: new Map(),
    byPhaseType: {
      MODEL: [],
      GROUP: [],
      SPINNER: [],
    },
  };
  
  // ==========================================================================
  // PARSE MODELS AND SUBMODELS
  // ==========================================================================
  const modelsSection = doc.querySelector('models');
  if (modelsSection) {
    const modelElements = modelsSection.querySelectorAll(':scope > model');
    
    for (const modelEl of modelElements) {
      const modelName = modelEl.getAttribute('name') || '';
      const submodelElements = modelEl.querySelectorAll('subModel');
      
      const submodelNames: string[] = [];
      
      // Process submodels
      for (const subEl of submodelElements) {
        const subName = subEl.getAttribute('name') || '';
        const fullName = `${modelName}/${subName}`;
        
        const submodel: XLightsSubmodel = {
          name: subName,
          entityType: 'SUBMODEL',
          phaseType: 'MODEL',
          parentModel: modelName,
          fullName,
        };
        
        result.submodels.set(fullName, submodel);
        result.allEntities.set(fullName, submodel);
        result.byPhaseType.MODEL.push(submodel);
        submodelNames.push(subName);
      }
      
      // Create model
      const model: XLightsModel = {
        name: modelName,
        entityType: 'MODEL',
        phaseType: 'MODEL',
        hasSubmodels: submodelNames.length > 0,
        submodels: submodelNames,
      };
      
      result.models.set(modelName, model);
      result.allEntities.set(modelName, model);
      result.byPhaseType.MODEL.push(model);
    }
  }
  
  // ==========================================================================
  // PARSE MODEL GROUPS
  // ==========================================================================
  const groupsSection = doc.querySelector('modelGroups');
  if (groupsSection) {
    const groupElements = groupsSection.querySelectorAll('modelGroup');
    
    for (const groupEl of groupElements) {
      const groupName = groupEl.getAttribute('name') || '';
      const membersStr = groupEl.getAttribute('models') || '';
      const members = membersStr.split(',').map(m => m.trim()).filter(m => m);
      
      const entityType = detectGroupType(members);
      const phaseType = getPhaseType(entityType);
      const memberBreakdown = analyzeGroupMembers(members);
      
      const group: XLightsGroup = {
        name: groupName,
        entityType,
        phaseType,
        members,
        memberBreakdown,
      };
      
      result.groups.set(groupName, group);
      result.allEntities.set(groupName, group);
      
      if (phaseType === 'SPINNER') {
        result.byPhaseType.SPINNER.push(group);
      } else {
        result.byPhaseType.GROUP.push(group);
      }
    }
  }
  
  return result;
}
```

---

## 🔧 Implementation: Update Phase Definitions

### File: `types/mappingPhases.ts` (updated)

```typescript
import { ModIQPhaseType } from './xLightsTypes';

export type MappingPhase = 
  | 'upload'
  | 'auto-matches'
  | 'groups'
  | 'models'
  | 'spinners'
  | 'review';

/**
 * Filter items for a specific phase based on their phaseType
 */
export function getItemsForPhase<T extends { phaseType: ModIQPhaseType }>(
  items: T[],
  phase: MappingPhase
): T[] {
  switch (phase) {
    case 'groups':
      // Only GROUP types (MODEL_GROUP, META_GROUP, MIXED_GROUP)
      return items.filter(item => item.phaseType === 'GROUP');
    
    case 'models':
      // Only MODEL types (MODEL, SUBMODEL)
      return items.filter(item => item.phaseType === 'MODEL');
    
    case 'spinners':
      // Only SPINNER types (SUBMODEL_GROUP)
      return items.filter(item => item.phaseType === 'SPINNER');
    
    default:
      return items;
  }
}

/**
 * Phase metadata for UI
 */
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
    phaseTypes: ['MODEL', 'GROUP', 'SPINNER'],
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
  spinners: {
    title: 'Spinners',
    description: 'Map submodel groups (collections of model parts)',
    phaseTypes: ['SPINNER'],
  },
  review: {
    title: 'Review',
    description: 'Review all mappings before saving',
    phaseTypes: ['MODEL', 'GROUP', 'SPINNER'],
  },
};
```

---

## 📊 Visual: Type Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        xLights Entity Type Hierarchy                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         XML Structure                                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │   <models>                        <modelGroups>                     │   │
│  │   ├── <model name="Arch 1">       ├── <modelGroup name="Stars GRP"  │   │
│  │   │   ├── <subModel "Inner"/>     │       models="Star 1,Star 2"/>  │   │
│  │   │   └── <subModel "Outer"/>     │                                 │   │
│  │   └── <model name="Mega Tree">    ├── <modelGroup name="Rings GRP"  │   │
│  │       ├── <subModel "Ring 1"/>    │       models="Mega Tree/Ring 1, │   │
│  │       ├── <subModel "Ring 2"/>    │              Mega Tree/Ring 2"/>│   │
│  │       └── ...                     │                                 │   │
│  │                                   └── <modelGroup name="All House"  │   │
│  │                                           models="Stars GRP,        │   │
│  │                                                  Rings GRP"/>       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Entity Types                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │   MODEL          SUBMODEL           MODEL_GROUP    SUBMODEL_GROUP   │   │
│  │   ┌───────┐      ┌───────────┐      ┌──────────┐   ┌──────────────┐ │   │
│  │   │Arch 1 │      │Arch 1/    │      │Stars GRP │   │Rings GRP     │ │   │
│  │   │Star 1 │      │  Inner    │      │(Star 1,  │   │(Mega Tree/   │ │   │
│  │   │Mega   │      │Mega Tree/ │      │ Star 2)  │   │  Ring 1,     │ │   │
│  │   │ Tree  │      │  Ring 1   │      └──────────┘   │  Ring 2)     │ │   │
│  │   └───────┘      └───────────┘                     └──────────────┘ │   │
│  │                                                                      │   │
│  │   META_GROUP                 MIXED_GROUP                            │   │
│  │   ┌────────────────┐         ┌────────────────────┐                 │   │
│  │   │All House GRP   │         │Eaves GRP           │                 │   │
│  │   │(Stars GRP,     │         │(Roof 1,            │                 │   │
│  │   │ Rings GRP)     │         │ Ice 1/Eave Upper)  │                 │   │
│  │   └────────────────┘         └────────────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ModIQ Phase Mapping                               │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │   GROUPS Phase          MODELS Phase         SPINNERS Phase         │   │
│  │   ┌─────────────┐       ┌─────────────┐      ┌─────────────┐       │   │
│  │   │ MODEL_GROUP │       │ MODEL       │      │ SUBMODEL_   │       │   │
│  │   │ META_GROUP  │       │ SUBMODEL    │      │   GROUP     │       │   │
│  │   │ MIXED_GROUP │       └─────────────┘      │ ("spinners")│       │   │
│  │   └─────────────┘                            └─────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Test Cases

```typescript
// Test group type detection
describe('detectGroupType', () => {
  it('detects MODEL_GROUP (models only)', () => {
    expect(detectGroupType(['Star 1', 'Star 2', 'Star 3'])).toBe('MODEL_GROUP');
    expect(detectGroupType(['Arch 1', 'Mini Tree 1'])).toBe('MODEL_GROUP');
  });
  
  it('detects SUBMODEL_GROUP (submodels only - spinners)', () => {
    expect(detectGroupType([
      'Mega Tree/Ring 1', 
      'Mega Tree/Ring 2'
    ])).toBe('SUBMODEL_GROUP');
    
    expect(detectGroupType([
      'GE Spinner 1/Spoke 1',
      'GE Spinner 1/Spoke 2',
      'GE Spinner 2/Spoke 1',
    ])).toBe('SUBMODEL_GROUP');
  });
  
  it('detects META_GROUP (groups only)', () => {
    expect(detectGroupType([
      'Stars GRP',
      'Arches GRP',
      'Trees GRP'
    ])).toBe('META_GROUP');
  });
  
  it('detects MIXED_GROUP (combination)', () => {
    expect(detectGroupType([
      'Roof 1',           // model
      'Ice 1/Eave Upper', // submodel
    ])).toBe('MIXED_GROUP');
    
    expect(detectGroupType([
      'Star 1',      // model
      'Stars GRP',   // group
    ])).toBe('MIXED_GROUP');
  });
});
```

---

## ✅ Acceptance Criteria

- [ ] Type system correctly identifies all 6 entity types
- [ ] Parser correctly categorizes entities from xLights XML
- [ ] Groups phase shows: MODEL_GROUP, META_GROUP, MIXED_GROUP
- [ ] Models phase shows: MODEL, SUBMODEL
- [ ] Spinners phase shows: SUBMODEL_GROUP only
- [ ] No confusion between "S - " prefix items and actual submodel groups
- [ ] Nested groups (groups containing groups) handled correctly

---

## 📝 Notes

**Key Insight:** The "/" character is the definitive marker for submodels. Any name containing "/" is a submodel reference. This is how xLights itself identifies them.

**Your Showstopper Spinners Example:**
- "All - Spinners - Showstoppers" = META_GROUP (contains other GRPs)
- Each individual spinner group = SUBMODEL_GROUP (contains "/" members)

This matches the exact pattern we see in Ron Howard's layout where groups like `GE SpinArchy Elite Wiggly All GRP` contain other groups like `GE SpinArchy Wiggly CCW GRP`.
