# GitHub Monorepo Setup — Claude Code Instructions

## Context

You are setting up the Lights of Elm Ridge monorepo. One repo, multiple packages, npm workspaces. Everything lives together so Claude Code can work across the full codebase without switching repos.

The product suite:
1. **web** — Storefront website (sequence catalog, onboarding, checkout)
2. **modiq** — Sequence-to-display mapping engine + UI
3. **xwire** — Wiring diagram generator from xLights layout files (scaffold only)
4. **xlights-file-gen** — Shared library for reading/writing xLights XML files
5. **docs** — Specs, tickets, strategy docs (not a package, just files)

---

## Repository

**Repo name:** `lightsofelmridge`
**Visibility:** Private

---

## Root Structure

```
lightsofelmridge/
├── package.json                  ← npm workspaces root
├── turbo.json                    ← build orchestration (optional, add when needed)
├── tsconfig.base.json            ← shared TypeScript config
├── .gitignore
├── .env.example
├── README.md
│
├── packages/
│   ├── xlights-file-gen/         ← shared library (everything else depends on this)
│   ├── modiq/                    ← mapping engine + UI
│   ├── web/                      ← storefront website
│   └── xwire/                    ← wiring diagram generator (scaffold)
│
└── docs/
    ├── tickets/                  ← Mod:IQ UX overhaul specs (68-87)
    ├── mockups/                  ← React/JSX mockup files
    ├── strategy/                 ← Onboarding platform, TAM, vendor model
    ├── algorithm/                ← Crossref data, matching specs, test data
    └── xwire/                    ← xWire product vision
```

---

## Root package.json

```json
{
  "name": "lightsofelmridge",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=packages/web",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces --if-present",
    "test:modiq": "npm run test --workspace=packages/modiq",
    "test:filegen": "npm run test --workspace=packages/xlights-file-gen",
    "lint": "npm run lint --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

---

## Root tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@lightsofelmridge/xlights-file-gen": ["packages/xlights-file-gen/src"],
      "@lightsofelmridge/modiq": ["packages/modiq/src"]
    }
  }
}
```

---

## Root .gitignore

```
node_modules/
dist/
build/
.next/
.env
.env.local
*.log
.DS_Store
.turbo/
coverage/
```

---

## Package: xlights-file-gen

Shared library. Every other package depends on this.

### packages/xlights-file-gen/package.json

```json
{
  "name": "@lightsofelmridge/xlights-file-gen",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
```

### packages/xlights-file-gen/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### Directory structure

```
packages/xlights-file-gen/
├── package.json
├── tsconfig.json
│
├── src/
│   ├── index.ts                      # Public API — all exports
│   │
│   ├── parsers/
│   │   ├── rgbeffects-parser.ts      # Parse xlights_rgbeffects.xml → models, groups, submodels
│   │   ├── networks-parser.ts        # Parse xlights_networks.xml → controllers, universes
│   │   ├── xmodel-parser.ts          # Parse .xmodel files → submodel definitions
│   │   └── xsq-parser.ts            # Parse .xsq sequence files → effect data
│   │
│   ├── generators/
│   │   ├── rgbeffects-generator.ts   # Structured model data → valid xlights_rgbeffects.xml
│   │   ├── networks-generator.ts     # Controller config → valid xlights_networks.xml
│   │   └── package-generator.ts      # Display package tier → both XML files + shopping list
│   │
│   ├── packages/                     # Pre-built display package definitions
│   │   ├── index.ts                  # Package registry + lookup
│   │   ├── starter.ts                # Outline + 4 canes (~1,500px, 1 controller)
│   │   ├── yard-show.ts             # + mega tree, arches, mini trees (~5,000px)
│   │   ├── full-production.ts        # + matrix, snowflakes, faces (~12,000px)
│   │   └── the-beast.ts             # + HD spinners, pixel forest, floods (~25,000px)
│   │
│   ├── models/
│   │   ├── prop-templates.ts         # Prop type → xLights model XML attributes
│   │   │                             #   { type: 'arch', displayAs: 'Arches', defaultPixels: 25 }
│   │   │                             #   { type: 'mega-tree', displayAs: 'Tree', strings: 16, pixelsPerString: 200 }
│   │   │                             #   { type: 'candy-cane', displayAs: 'Single Line', defaultPixels: 25 }
│   │   │                             #   { type: 'matrix', displayAs: 'Matrix', rows: 32, cols: 64 }
│   │   │                             #   { type: 'house-outline', displayAs: 'Poly Line', pixelsPerFoot: 10 }
│   │   │
│   │   ├── controller-db.ts          # Known controllers with specs
│   │   │                             #   { vendor: 'HinksPix', model: 'PRO V3', ports: 48,
│   │   │                             #     protocol: 'E131', maxPixelsPerPort: 1024 }
│   │   │                             #   { vendor: 'Falcon', model: 'F16V4', ports: 16, ... }
│   │   │                             #   { vendor: 'Falcon', model: 'F4V3', ports: 4, ... }
│   │   │                             #   { vendor: 'HolidayCoro', model: 'AlphaPix 16', ports: 16, ... }
│   │   │                             #   { vendor: 'HolidayCoro', model: 'AlphaPix Flex', ports: 4, ... }
│   │   │
│   │   └── universe-calculator.ts    # Pixels → channels → universes math
│   │                                 #   pixels * 3 = channels
│   │                                 #   ceil(channels / 510) = universes
│   │
│   ├── validators/
│   │   ├── rgbeffects-validator.ts   # Verify generated layout XML is well-formed
│   │   └── networks-validator.ts     # Verify generated networks XML is well-formed
│   │
│   └── types/
│       ├── models.ts                 # Model, Group, SubmodelGroup, PropTemplate
│       ├── controllers.ts            # Controller, Port, Universe, NetworkEntry
│       └── packages.ts              # DisplayPackage, PackageTier, ShoppingListItem
│
└── tests/
    ├── parsers/
    │   ├── rgbeffects-parser.test.ts
    │   ├── networks-parser.test.ts
    │   └── xmodel-parser.test.ts
    ├── generators/
    │   ├── rgbeffects-generator.test.ts
    │   ├── networks-generator.test.ts
    │   └── package-generator.test.ts   # Generate each tier → validate output XML
    └── fixtures/
        ├── xlights_rgbeffects.xml      # Real layout file (from your display)
        ├── xlights_networks.xml        # Real networks file (from your display)
        └── xmodels/
            ├── SHOWSTOPPER-SPINNER-with-Bat-Silhouette.xmodel
            ├── 46_MegaSpin.xmodel
            ├── 46_MegaSpin_2019.xmodel
            ├── Boscoyo_Spider_Web.xmodel
            ├── Boscoyo_Chromaflake_24_3_prong.xmodel
            └── Boscoyo_Star_Wreath_Topper.xmodel
```

### Public API (src/index.ts)

```typescript
// Parsers
export { parseRgbEffects } from './parsers/rgbeffects-parser';
export { parseNetworks } from './parsers/networks-parser';
export { parseXModel } from './parsers/xmodel-parser';
export { parseSequence } from './parsers/xsq-parser';

// Generators
export { generateRgbEffects } from './generators/rgbeffects-generator';
export { generateNetworks } from './generators/networks-generator';
export { generatePackage } from './generators/package-generator';

// Data
export { PROP_TEMPLATES } from './models/prop-templates';
export { CONTROLLER_DB } from './models/controller-db';
export { calculateUniverses } from './models/universe-calculator';

// Package definitions
export { PACKAGES } from './packages';

// Types
export type * from './types/models';
export type * from './types/controllers';
export type * from './types/packages';
```

---

## Package: modiq

The mapping engine and review UI.

### packages/modiq/package.json

```json
{
  "name": "@lightsofelmridge/modiq",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@lightsofelmridge/xlights-file-gen": "*"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
```

### Directory structure

```
packages/modiq/
├── package.json
├── tsconfig.json
│
├── src/
│   ├── index.ts                      # Public API
│   │
│   ├── engine/                       # Core matching algorithm
│   │   ├── matcher.ts                # Main orchestrator — runs full matching pipeline
│   │   ├── scoring.ts                # Confidence scoring (name, shape, type, pixels, structure)
│   │   ├── group-matcher.ts          # Group-level matching
│   │   ├── model-matcher.ts          # Model-level matching
│   │   ├── submodel-matcher.ts       # Submodel group matching (Ticket 86)
│   │   │                             #   Processing order:
│   │   │                             #   1. Section matching (Fix I)
│   │   │                             #   2. Aggregate matching (Fix L)
│   │   │                             #   3. Odd/even pairs (Fix H)
│   │   │                             #   4. Exact name matching
│   │   │                             #   5. Canonical pattern translation (Fix G)
│   │   │                             #   6. Numbered sequence matching (Fix J)
│   │   │                             #   7. Pixel-ratio fallback (Fix D)
│   │   │                             #   8. Destination exclusivity sweep (Fix A)
│   │   │
│   │   ├── spinner-monogamy.ts       # Spinner pairing logic (Ticket 79)
│   │   ├── structural-fingerprint.ts # Category fingerprinting for spinner pairing (Ticket 86 Fix K)
│   │   ├── constraints.ts            # Many-to-one rules, destination exclusivity
│   │   └── coverage-analyzer.ts      # Effect coverage calculation (Ticket 78)
│   │
│   ├── data/
│   │   ├── canonical-patterns.json   # 1,063 patterns across 74 props
│   │   ├── structural-categories.ts  # radial, curve, ring, decorative, outline, aggregate
│   │   ├── translations.ts           # Cross-vendor name map (Hook CCW → Half Moon, etc.)
│   │   ├── facial-features.ts        # Singing face semantic vocabulary
│   │   └── vendor-props/             # Vendor-specific prop libraries
│   │       ├── ge/                   # GE spinner definitions
│   │       ├── showstopper/          # Showstopper definitions
│   │       ├── boscoyo/              # Boscoyo coro definitions
│   │       └── index.ts
│   │
│   ├── ui/
│   │   ├── phases/
│   │   │   ├── UploadPhase.tsx
│   │   │   ├── GroupsModelsPhase.tsx  # Ticket 76
│   │   │   ├── SubmodelPhase.tsx     # Ticket 81
│   │   │   ├── CoveragePhase.tsx     # Ticket 82
│   │   │   └── ReviewPhase.tsx       # Ticket 75
│   │   │
│   │   ├── components/
│   │   │   ├── StepperBar.tsx        # Ticket 68
│   │   │   ├── ProgressStats.tsx     # Ticket 74
│   │   │   ├── MappingCard.tsx       # Ticket 69
│   │   │   ├── FractionBadge.tsx     # Ticket 84
│   │   │   ├── ConfidencePill.tsx
│   │   │   ├── SuggestionPanel.tsx   # Ticket 72
│   │   │   ├── ViewModePills.tsx     # Ticket 83
│   │   │   ├── FilterPills.tsx       # Ticket 71
│   │   │   └── AutoMatchBanner.tsx   # Ticket 70
│   │   │
│   │   └── hooks/
│   │       ├── useMappingState.ts
│   │       ├── useAutoMatch.ts
│   │       └── useExport.ts
│   │
│   └── types/
│       ├── mapping.ts                # MappingResult, Confidence, MatchReason
│       ├── layout.ts                 # Model, Group, SubmodelGroup, Spinner
│       └── sequence.ts              # Effect, TimingTrack
│
└── tests/
    ├── engine/
    │   ├── submodel-matcher.test.ts
    │   ├── destination-exclusivity.test.ts
    │   ├── spinner-monogamy.test.ts
    │   └── coverage-analyzer.test.ts
    ├── parsers/
    │   └── report-generator.test.ts
    └── fixtures/
        ├── xtreme-christmas-mapping.csv   # Real mapping data for validation
        ├── sample-source-layout.xml
        └── sample-dest-layout.xml
```

---

## Package: web

The storefront website. Consumes modiq and xlights-file-gen.

### packages/web/package.json

```json
{
  "name": "@lightsofelmridge/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@lightsofelmridge/xlights-file-gen": "*",
    "@lightsofelmridge/modiq": "*",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "stripe": "^14.0.0"
  }
}
```

### Directory structure

```
packages/web/
├── package.json
├── next.config.js
├── tsconfig.json
│
├── public/
│   ├── assets/
│   │   ├── modiq-wordmark-v3-full.png
│   │   ├── logos/
│   │   └── videos/                       # Package preview videos
│   └── fonts/
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (header, nav, footer)
│   │   ├── page.tsx                      # Home
│   │   │
│   │   ├── sequences/                    # Sequence catalog
│   │   │   ├── page.tsx                  # Browse / grid
│   │   │   └── [slug]/
│   │   │       └── page.tsx              # Product page (Ticket 85 three-card layout)
│   │   │
│   │   ├── tools/
│   │   │   ├── modiq/
│   │   │   │   └── page.tsx              # Mod:IQ embedded UI
│   │   │   └── xwire/
│   │   │       └── page.tsx              # xWire (coming soon placeholder)
│   │   │
│   │   ├── start/                        # Onboarding program
│   │   │   ├── page.tsx                  # "Start Your Show" landing
│   │   │   ├── packages/
│   │   │   │   └── page.tsx              # Starter / Yard / Full / Beast selector
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx              # Project progress tracker
│   │   │   └── download/
│   │   │       └── page.tsx              # Layout file download
│   │   │
│   │   ├── display/
│   │   │   └── page.tsx                  # "See our display"
│   │   │
│   │   └── about/
│   │       └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                           # Generic: buttons, cards, pills, badges
│   │   ├── layout/                       # Header, footer, nav
│   │   ├── sequences/                    # Sequence cards, product info cards
│   │   └── onboarding/                   # Package cards, progress tracker
│   │
│   ├── features/
│   │   ├── shop-wizard/
│   │   │   ├── PackageSelector.tsx       # Three/four tier cards (opinionated packages)
│   │   │   ├── PackageCustomizer.tsx     # Optional tweaks (house measurements, etc.)
│   │   │   ├── LayoutPreview.tsx         # Visual preview of selected package
│   │   │   ├── ShoppingList.tsx          # Vendor links + quantities + affiliate codes
│   │   │   └── FileDownload.tsx          # Calls xlights-file-gen, produces download zip
│   │   │
│   │   ├── project-dashboard/
│   │   │   ├── ProgressTracker.tsx       # Step-by-step milestone tracker
│   │   │   ├── StepCard.tsx              # Individual step with video + tool + checklist
│   │   │   └── MilestoneChecklist.tsx    # Per-prop install verification
│   │   │
│   │   └── sequence-catalog/
│   │       ├── SequenceGrid.tsx          # Product card grid with filtering
│   │       ├── ProductPage.tsx           # Three-card layout (Ticket 85)
│   │       └── ModiqBadge.tsx            # "Works With Your Display" indicator
│   │
│   ├── lib/
│   │   ├── stripe.ts                     # Payment
│   │   ├── affiliate.ts                  # Vendor link tracking + commission
│   │   ├── analytics.ts
│   │   └── auth.ts                       # User accounts (project persistence)
│   │
│   └── styles/
│       └── globals.css
│
└── tests/
```

---

## Package: xwire (scaffold only)

Stub files with interfaces and TODOs. No real implementation yet.

### packages/xwire/package.json

```json
{
  "name": "@lightsofelmridge/xwire",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@lightsofelmridge/xlights-file-gen": "*"
  }
}
```

### Directory structure

```
packages/xwire/
├── package.json
├── tsconfig.json
├── README.md                             # Product vision (copy from docs/xwire/)
│
├── src/
│   ├── index.ts                          # Stub exports
│   │
│   ├── engine/
│   │   ├── power-calculator.ts           # TODO: voltage drop, injection points, PSU sizing
│   │   ├── cable-router.ts               # TODO: optimal cable routing from controller to props
│   │   ├── port-assigner.ts              # TODO: controller port → prop assignment
│   │   └── bill-of-materials.ts          # TODO: cable lengths, connectors, fuses list
│   │
│   ├── data/
│   │   ├── wire-gauge-tables.ts          # AWG specs: max amps, voltage drop per foot
│   │   ├── pixel-power-specs.ts          # Watts per pixel by type (WS2811 12V, WS2812 5V)
│   │   └── controller-port-specs.ts      # Max amps per port by controller model
│   │
│   ├── ui/
│   │   ├── WiringDiagram.tsx             # TODO: visual diagram renderer
│   │   ├── PowerOverlay.tsx              # TODO: power injection overlay
│   │   └── CableList.tsx                 # TODO: bill of materials table
│   │
│   └── types/
│       └── wiring.ts                     # WiringPlan, CableRun, InjectionPoint, PowerSupply
│
└── tests/
```

Each stub file should contain:

```typescript
// packages/xwire/src/engine/power-calculator.ts
// TODO: Implement power calculation engine
// See docs/xwire/product-vision.md for requirements
//
// Inputs: layout file (via xlights-file-gen), pixel type, voltage
// Outputs: injection points, PSU sizing, voltage drop warnings

export function calculatePowerPlan() {
  throw new Error('Not implemented');
}
```

---

## docs/ (not a package — just files)

```
docs/
├── README.md                             # Index: what's here and where to find things
│
├── tickets/
│   ├── ticket-68-stepper-bar.md
│   ├── ticket-69-card-redesign.md
│   ├── ticket-70-auto-match-banner.md
│   ├── ticket-71-filter-pills.md
│   ├── ticket-72-suggestion-panel.md
│   ├── ticket-73-many-to-one.md
│   ├── ticket-74-coverage-stats.md
│   ├── ticket-75-export-review.md
│   ├── ticket-76-phase-two-parity.md
│   ├── ticket-77-phase-transitions.md
│   ├── ticket-78-effect-coverage.md
│   ├── ticket-79-spinner-monogamy.md
│   ├── ticket-80-coverage-boost.md
│   ├── ticket-81-submodel-groups.md
│   ├── ticket-82-display-coverage.md
│   ├── ticket-83-view-mode-pills.md
│   ├── ticket-84-fraction-badges.md
│   ├── ticket-85-storefront-cards.md
│   ├── ticket-86-submodel-algorithm.md
│   └── ticket-87-phase-header-bugs.md
│
├── mockups/
│   ├── modiq-card-mockup.jsx
│   ├── submodel-groups-mockup.jsx
│   └── sequence-product-cards.jsx
│
├── strategy/
│   ├── beginner-onboarding-platform.md
│   ├── tam-analysis.md
│   └── vendor-partnership-model.md
│
├── algorithm/
│   ├── hd-submodel-crossref.json         # 74 props, 1,063 canonical patterns
│   ├── matching-algorithm.md             # Consolidated algorithm spec
│   └── test-data/
│       └── xtreme-christmas-mapping.csv
│
└── xwire/
    └── product-vision.md
```

---

## Migration Steps

Execute in this order:

### 1. Initialize the monorepo

```bash
mkdir lightsofelmridge
cd lightsofelmridge
git init

# Create root files
# (create package.json, tsconfig.base.json, .gitignore from specs above)

# Create directory skeleton
mkdir -p packages/xlights-file-gen/src/{parsers,generators,packages,models,validators,types}
mkdir -p packages/xlights-file-gen/tests/{parsers,generators,fixtures/xmodels}
mkdir -p packages/modiq/src/{engine,data/vendor-props/{ge,showstopper,boscoyo},ui/{phases,components,hooks},types}
mkdir -p packages/modiq/tests/{engine,parsers,fixtures}
mkdir -p packages/web/src/{app,components/{ui,layout,sequences,onboarding},features/{shop-wizard,project-dashboard,sequence-catalog},lib,styles}
mkdir -p packages/web/public/assets/{logos,videos}
mkdir -p packages/xwire/src/{engine,data,ui,types}
mkdir -p packages/xwire/tests
mkdir -p docs/{tickets,mockups,strategy,algorithm/test-data,xwire}
```

### 2. Move existing files into place

Copy from whatever the current repo/file state is:

**Into `packages/xlights-file-gen/tests/fixtures/`:**
- `xlights_networks.xml` (the sample networks file)
- Any existing rgbeffects XML files
- All `.xmodel` files (SHOWSTOPPER-SPINNER, 46_MegaSpin, Boscoyo_*, ChromaFlake_*, etc.)

**Into `packages/modiq/src/data/`:**
- `hd_submodel_crossref.json` → rename to `canonical-patterns.json`

**Into `packages/modiq/tests/fixtures/`:**
- The Christmas mapping CSV (`ModIQ_Report_All_I_Want_for_Xmasxml.csv`)

**Into `packages/web/public/assets/`:**
- `modiq-wordmark-v3-full.png`

**Into `docs/`:**
- All ticket markdown files (68-87) → `docs/tickets/`
- All mockup JSX files → `docs/mockups/`
- `beginner-onboarding-platform.md` → `docs/strategy/`
- `hd_submodel_crossref.json` → `docs/algorithm/` (keep a copy here too, for reference)
- The Christmas CSV → `docs/algorithm/test-data/`

**Into `packages/modiq/src/engine/`:**
- Any existing Mod:IQ matching algorithm code

**Into `packages/web/src/`:**
- Any existing storefront/website code (reorganize into the app/ and features/ structure)

### 3. Create package.json files for each package

Create the package.json for each of the four packages as specified above. Make sure workspace references use `"*"` for sibling dependencies — npm workspaces resolves these to the local package automatically.

### 4. Install and verify

```bash
cd lightsofelmridge
npm install                    # installs all workspace dependencies
npm run test:filegen           # verify xlights-file-gen tests pass
npm run test:modiq             # verify modiq tests pass
npm run dev                    # verify web starts
```

### 5. Create stub files for scaffolded packages

For `xwire`, create each `.ts` file with a descriptive comment header and `throw new Error('Not implemented')` exports as shown above.

For `xlights-file-gen` generators and package definitions, create stub files with TODO comments describing what each function should do, its inputs, and its outputs. The parsers should be implemented first since modiq depends on them.

### 6. Initial commit

```bash
git add .
git commit -m "Monorepo setup: xlights-file-gen, modiq, web, xwire scaffold, docs"
git remote add origin git@github.com:lightsofelmridge/lightsofelmridge.git
git push -u origin main
git checkout -b dev
git push -u origin dev
```

---

## How Cross-Package Imports Work

With npm workspaces, sibling package imports just work:

```typescript
// In packages/modiq/src/engine/matcher.ts
import { parseRgbEffects, parseNetworks } from '@lightsofelmridge/xlights-file-gen';

// In packages/web/src/features/shop-wizard/FileDownload.tsx
import { generatePackage } from '@lightsofelmridge/xlights-file-gen';

// In packages/web/src/app/tools/modiq/page.tsx
import { ModiqUI } from '@lightsofelmridge/modiq';

// In packages/xwire/src/engine/power-calculator.ts
import { parseRgbEffects, CONTROLLER_DB } from '@lightsofelmridge/xlights-file-gen';
```

No npm link needed. No git submodules. npm workspaces resolves `"*"` to the local package automatically.

---

## Branch Strategy

- `main` — Production. Always deployable.
- `dev` — Integration branch. PRs merge here.
- `feature/*` — Feature branches: `feature/ticket-86-submodel-matching`, `feature/shop-wizard-v2`
- `fix/*` — Bug fixes: `fix/ticket-87-header-bugs`

Use `main` for the initial migration. Create `dev` after the first commit is stable.

---

## Verification Checklist

After setup, confirm:

- [ ] `npm install` at root succeeds with no errors
- [ ] `packages/xlights-file-gen/src/index.ts` exists with exports
- [ ] `packages/modiq/src/index.ts` can import from `@lightsofelmridge/xlights-file-gen`
- [ ] `packages/web/src/` can import from both sibling packages
- [ ] `packages/xwire/src/` can import from `@lightsofelmridge/xlights-file-gen`
- [ ] All 20 ticket files present in `docs/tickets/`
- [ ] Strategy doc present in `docs/strategy/`
- [ ] Crossref JSON present in both `docs/algorithm/` and `packages/modiq/src/data/`
- [ ] `.xmodel` fixture files present in `packages/xlights-file-gen/tests/fixtures/xmodels/`
- [ ] `xlights_networks.xml` fixture present in `packages/xlights-file-gen/tests/fixtures/`
- [ ] Every package has its own `package.json` and `tsconfig.json`
- [ ] No xLights file parsing code exists outside of `xlights-file-gen`
- [ ] `.gitignore` covers node_modules, dist, .next, .env, .DS_Store
- [ ] Root `npm run dev` starts the web package
- [ ] Root `npm run test` runs tests across all packages

---

## Future: When to Split

Stay monorepo until one of these triggers:

- **Collaborator isolation**: You bring on a dev who should only access modiq, not the storefront code
- **Deploy independence**: modiq needs to deploy on a different cycle than the website (e.g., modiq runs as a separate service)
- **Package publishing**: You want to publish xlights-file-gen as a public npm package for the xLights community
- **Repo size**: The repo exceeds ~500MB and clone times become painful

When any trigger hits, extract that package into its own repo and replace the workspace reference with a Git or npm dependency. The monorepo structure already has clean boundaries so extraction is straightforward.
