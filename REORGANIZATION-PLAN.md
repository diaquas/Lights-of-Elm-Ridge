# Internal Monorepo Reorganization Plan

## Goal

Achieve the clean module boundaries from the multi-repo plan — without splitting repos. Same architecture, zero operational overhead.

## Current State

```
src/lib/modiq/          12 files FLAT — parsers, engine, generators, data all mixed
src/components/modiq/   43 files — already well-contained
src/hooks/              10 files — modiq-specific hooks mixed with general hooks
src/contexts/           2 files — modiq context + unrelated cart context
src/types/              3 files — shared types
src/data/               5 files — sequence metadata (non-modiq)
```

**Key problem:** `src/lib/modiq/` is a flat directory where the XML parser, matching engine, xmap generator, canonical data, and analysis tools are all siblings. This makes it unclear what's "public API" vs internal, and impossible to see the dependency flow.

## Proposed Structure

### Phase 1: Reorganize `src/lib/modiq/` into clear subdirectories

```
src/lib/modiq/
├── index.ts                          # Public barrel — re-exports from subdirectories
│
├── parsers/                          # READ xLights files (would become xlights-file-gen)
│   ├── index.ts                      # Barrel: parseRgbEffectsXml, parseXsqModels
│   ├── layout-parser.ts              # ← was parser.ts (rename for clarity)
│   └── sequence-parser.ts            # ← was xsq-parser.ts (rename for clarity)
│
├── generators/                       # WRITE output files
│   ├── index.ts                      # Barrel: generateXmap, downloadXmap, etc.
│   └── xmap-generator.ts             # ← stays (already well-named)
│
├── engine/                           # Core matching algorithm
│   ├── index.ts                      # Barrel: matchModels, suggestMatches, etc.
│   ├── matcher.ts                    # ← stays (main orchestrator)
│   ├── hungarian.ts                  # ← stays (optimal assignment)
│   ├── semantic-synonyms.ts          # ← was semanticSynonyms.ts (convention)
│   └── generate-reasoning.ts         # ← was generateReasoning.ts (convention)
│
├── analysis/                         # Effect analysis & coverage tools
│   ├── index.ts                      # Barrel: analyzeSequenceEffects, etc.
│   ├── effect-tree.ts                # ← stays
│   ├── effect-analysis.ts            # ← stays
│   └── boost-matcher.ts              # ← stays
│
└── data/                             # Static reference data
    ├── index.ts                      # Barrel: getSourceLayout, etc.
    └── source-layout.ts              # ← stays (504KB canonical layouts)
```

### Phase 2: Add TypeScript path aliases

```jsonc
// tsconfig.json — new paths
{
  "compilerOptions": {
    "paths": {
      "@modiq/parsers": ["./src/lib/modiq/parsers"],
      "@modiq/engine": ["./src/lib/modiq/engine"],
      "@modiq/generators": ["./src/lib/modiq/generators"],
      "@modiq/analysis": ["./src/lib/modiq/analysis"],
      "@modiq/data": ["./src/lib/modiq/data"]
    }
  }
}
```

### Phase 3: Organize modiq-specific hooks

```
src/hooks/
├── useInteractiveMapping.ts          # stays (core modiq state)
├── useSessionPersistence.ts          # stays (modiq sessions)
├── useModiqSessions.ts               # stays (modiq cloud sessions)
├── useMappingTelemetry.ts            # stays (modiq telemetry)
├── useBulkInference.ts               # stays (modiq auto-match)
├── useDragAndDrop.ts                 # stays (modiq DnD)
├── useProgressTracker.ts             # stays (modiq progress)
├── useItemFamilies.ts                # stays (modiq families)
├── useKeyboardShortcuts.ts           # stays (modiq shortcuts)
└── usePurchasedSequences.ts          # stays (general, not modiq-specific)
```

No move needed — 9/10 hooks are modiq-specific, so the directory is already effectively `hooks/modiq/`. Moving them would just churn imports for no benefit.

## What Changes

| Action | Files Affected | Risk |
|--------|---------------|------|
| Move `parser.ts` → `parsers/layout-parser.ts` | ~15 import sites | Low — find-and-replace |
| Move `xsq-parser.ts` → `parsers/sequence-parser.ts` | ~5 import sites | Low |
| Move `xmap-generator.ts` → `generators/xmap-generator.ts` | ~3 import sites | Low |
| Move `matcher.ts` → `engine/matcher.ts` | ~8 import sites | Low |
| Move `hungarian.ts` → `engine/hungarian.ts` | 1 import (matcher) | Trivial |
| Move `semanticSynonyms.ts` → `engine/semantic-synonyms.ts` | 1 import (matcher) | Trivial |
| Move `generateReasoning.ts` → `engine/generate-reasoning.ts` | 1 import (matcher) | Trivial |
| Move `effect-tree.ts` → `analysis/effect-tree.ts` | ~5 import sites | Low |
| Move `effect-analysis.ts` → `analysis/effect-analysis.ts` | ~3 import sites | Low |
| Move `boost-matcher.ts` → `analysis/boost-matcher.ts` | ~3 import sites | Low |
| Move `source-layout.ts` → `data/source-layout.ts` | ~4 import sites | Low |
| Update `index.ts` to re-export from subdirectories | 1 file | Trivial |
| Add 5 new barrel `index.ts` files | New files only | Zero risk |

## What Does NOT Change

- **No files outside `src/lib/modiq/` are moved** (components, hooks, contexts, types, data stay put)
- **No functionality changes** — only file locations and import paths
- **No new dependencies** — just internal reorganization
- **The public API (`@/lib/modiq`) stays identical** — the root `index.ts` re-exports everything
- **All existing import paths like `@/lib/modiq` still work** — barrel does the routing
- **Git history preserved** — using `git mv` for moves

## Why This Is Safe

1. The root `index.ts` barrel means any consumer importing from `@/lib/modiq` sees zero changes
2. Only files that import specific submodules (e.g., `@/lib/modiq/parser`) need path updates
3. Each step is independently testable — move one file at a time, update imports, verify
4. TypeScript compiler catches every missed import instantly

## Execution Order

1. Create subdirectories: `parsers/`, `generators/`, `engine/`, `analysis/`, `data/`
2. Move files one subdirectory at a time (git mv)
3. Create barrel `index.ts` in each subdirectory
4. Update the root `index.ts` to re-export from barrels
5. Find-and-replace all direct file imports
6. Verify TypeScript compilation
7. Optionally add tsconfig path aliases
