# GitHub Repository Reorganization — Claude Code Instructions

## Context

You are reorganizing the Lights of Elm Ridge codebase from a single repository into a multi-repo GitHub organization. This document tells you exactly what to create, where files go, and how repos connect.

The product suite consists of:
1. **lightsofelmridge.com** — Storefront website (sequence catalog, onboarding, checkout)
2. **Mod:IQ** — Sequence-to-display mapping engine + UI
3. **xWire** — Wiring diagram generator from xLights layout files (future, scaffold only)
4. **xlights-file-gen** — Shared library for reading/writing xLights XML files
5. **docs** — Specs, tickets, strategy docs, vendor notes

---

## Step 1: Create the GitHub Organization

Organization name: `lightsofelmridge`

Create these repositories under the org:

| Repo | Visibility | Description |
|------|-----------|-------------|
| `lightsofelmridge.com` | Private | Storefront website — sequence catalog, onboarding flow, project dashboard, shop wizard |
| `modiq` | Private | Mod:IQ — sequence-to-display mapping engine and UI |
| `xwire` | Private | xWire — wiring diagram generator (scaffold, future development) |
| `xlights-file-gen` | Private | Shared library for parsing and generating xLights XML files (.rgbeffects, xlights_networks.xml, .xmodel) |
| `docs` | Private | Product specs, UX tickets, strategy documents, vendor partnership notes |

---

## Step 2: Repository Structures

### 2A. `lightsofelmridge.com`

This is the main website. It consumes `modiq` and `xlights-file-gen` as dependencies.

```
lightsofelmridge.com/
├── README.md
├── package.json
├── next.config.js                    # or equivalent framework config
├── .env.example                      # Stripe keys, vendor API keys, etc.
│
├── public/
│   ├── assets/
│   │   ├── modiq-wordmark-v3-full.png
│   │   ├── logos/
│   │   └── videos/                   # Preview videos for packages
│   └── fonts/
│
├── src/
│   ├── app/                          # Pages / routes
│   │   ├── page.tsx                  # Home
│   │   ├── sequences/                # Sequence catalog
│   │   │   ├── page.tsx              # Browse all sequences
│   │   │   └── [slug]/
│   │   │       └── page.tsx          # Individual sequence product page
│   │   ├── tools/
│   │   │   ├── modiq/                # Mod:IQ embedded UI
│   │   │   │   └── page.tsx
│   │   │   └── xwire/                # xWire embedded UI (future)
│   │   │       └── page.tsx
│   │   ├── start/                    # Onboarding program
│   │   │   ├── page.tsx              # "Start Your Show" landing
│   │   │   ├── packages/             # Package selector (Starter/Yard/Full/Beast)
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/            # Project progress tracker
│   │   │   │   └── page.tsx
│   │   │   └── download/             # Layout file download after wizard
│   │   │       └── page.tsx
│   │   ├── display/                  # "See our display" page
│   │   │   └── page.tsx
│   │   └── about/
│   │       └── page.tsx
│   │
│   ├── components/                   # Shared UI components
│   │   ├── ui/                       # Generic (buttons, cards, pills, badges)
│   │   ├── layout/                   # Header, footer, nav, stepper bar
│   │   ├── sequences/                # Sequence cards, product info cards
│   │   └── onboarding/               # Package cards, progress tracker, wizard steps
│   │
│   ├── features/
│   │   ├── shop-wizard/              # Package selector + layout generator
│   │   │   ├── PackageSelector.tsx   # The three/four tier cards
│   │   │   ├── Customizer.tsx        # Optional tweaks after package selection
│   │   │   ├── LayoutPreview.tsx     # Visual preview of their display
│   │   │   └── FileGenerator.tsx     # Calls xlights-file-gen to produce download
│   │   │
│   │   ├── project-dashboard/        # Guided onboarding tracker
│   │   │   ├── ProgressTracker.tsx
│   │   │   ├── StepCard.tsx
│   │   │   └── MilestoneChecklist.tsx
│   │   │
│   │   └── sequence-catalog/         # Product pages, filtering, Mod:IQ integration
│   │       ├── SequenceGrid.tsx
│   │       ├── ProductPage.tsx       # The three-card layout (Ticket 85)
│   │       └── ModiqBadge.tsx        # "Works With Your Display" indicator
│   │
│   ├── lib/
│   │   ├── stripe.ts                 # Payment integration
│   │   ├── affiliate.ts              # Vendor link tracking + commission
│   │   ├── analytics.ts
│   │   └── auth.ts                   # User accounts for project persistence
│   │
│   └── styles/
│       └── globals.css
│
└── tests/
```

**Dependencies on other repos:**
```json
{
  "dependencies": {
    "@lightsofelmridge/xlights-file-gen": "github:lightsofelmridge/xlights-file-gen",
    "@lightsofelmridge/modiq": "github:lightsofelmridge/modiq"
  }
}
```

Use GitHub package references or git submodules. For early development, git submodules are simpler. Switch to proper npm packages when things stabilize.

---

### 2B. `modiq`

The Mod:IQ mapping engine and review UI. This is the most complex repo.

```
modiq/
├── README.md
├── package.json
├── tsconfig.json
│
├── src/
│   ├── engine/                       # Core matching algorithm
│   │   ├── matcher.ts                # Main orchestrator
│   │   ├── scoring.ts                # Confidence scoring (name, shape, type, pixels, structure)
│   │   ├── group-matcher.ts          # Group-level matching (Ticket 73)
│   │   ├── model-matcher.ts          # Model-level matching
│   │   ├── submodel-matcher.ts       # Submodel group matching (Ticket 86 — the big one)
│   │   │                             #   Implements: destination exclusivity, positional matching,
│   │   │                             #   aggregate detection, odd/even awareness, section matching,
│   │   │                             #   canonical pattern vocabulary, pixel ratio guards
│   │   ├── spinner-monogamy.ts       # Spinner pairing logic (Ticket 79)
│   │   ├── structural-fingerprint.ts # Category-based spinner fingerprinting (Ticket 86 Fix K)
│   │   └── constraints.ts            # Many-to-one rules, exclusivity enforcement
│   │
│   ├── data/                         # Reference data for matching
│   │   ├── canonical-patterns.json   # 1,063 patterns across 74 props (from crossref)
│   │   ├── structural-categories.ts  # radial, curve, ring, decorative, outline, aggregate
│   │   ├── translations.ts           # Cross-vendor name translations (Hook CCW → Half Moon)
│   │   ├── facial-features.ts        # Singing face semantic vocabulary (Ticket 86 Fix E)
│   │   ├── controller-specs.ts       # Known controller port counts, pixel limits
│   │   └── vendor-props/             # Per-vendor prop libraries
│   │       ├── ge/                   # Gilbert Engineering spinner definitions
│   │       ├── showstopper/          # Showstopper spinner/wreath/snowflake definitions
│   │       ├── boscoyo/              # Boscoyo coro prop definitions
│   │       └── index.ts              # Prop lookup by vendor + model name
│   │
│   ├── parsers/                      # File I/O (delegates to xlights-file-gen for XML)
│   │   ├── layout-parser.ts          # Extract models, groups, submodels from rgbeffects
│   │   ├── sequence-parser.ts        # Read .xsq files for effect coverage analysis
│   │   ├── xmodel-parser.ts          # Parse .xmodel files for submodel definitions
│   │   └── report-generator.ts       # Generate CSV export (like the one we analyzed)
│   │
│   ├── ui/                           # Mapping review interface
│   │   ├── phases/
│   │   │   ├── UploadPhase.tsx       # File upload + initial parse
│   │   │   ├── GroupsModelsPhase.tsx  # Phase 2: Group + model mapping review
│   │   │   ├── SubmodelPhase.tsx     # Phase 3: Submodel group mapping review
│   │   │   ├── CoveragePhase.tsx     # Phase 4: Display coverage analysis
│   │   │   └── ReviewPhase.tsx       # Phase 5: Final review + export
│   │   │
│   │   ├── components/
│   │   │   ├── StepperBar.tsx        # Phase navigation (Ticket 68)
│   │   │   ├── ProgressStats.tsx     # Models mapped / effects covered bars
│   │   │   ├── MappingCard.tsx       # Individual mapping row (Ticket 69)
│   │   │   ├── FractionBadge.tsx     # Resolved/total pill (Ticket 84)
│   │   │   ├── ConfidencePill.tsx    # HIGH/MED/LOW/UNMAPPED badges
│   │   │   ├── SuggestionPanel.tsx   # Right panel suggestions (Ticket 72)
│   │   │   ├── ViewModePills.tsx     # All/Spinners/Sub-Groups toggle (Ticket 83)
│   │   │   ├── FilterPills.tsx       # All/Mapped/Unmapped tabs
│   │   │   └── AutoMatchBanner.tsx   # "Auto-match found X suggestions" (Ticket 70)
│   │   │
│   │   └── hooks/
│   │       ├── useMappingState.ts    # Central mapping state management
│   │       ├── useAutoMatch.ts       # Trigger auto-matching engine
│   │       └── useExport.ts          # Generate output files
│   │
│   └── types/
│       ├── mapping.ts                # MappingResult, Confidence, MatchReason
│       ├── layout.ts                 # Model, Group, SubmodelGroup, Spinner
│       └── sequence.ts               # Effect, TimingTrack
│
├── tests/
│   ├── engine/
│   │   ├── submodel-matcher.test.ts  # Test cases from the Christmas CSV analysis
│   │   ├── spinner-monogamy.test.ts
│   │   └── destination-exclusivity.test.ts
│   ├── parsers/
│   └── fixtures/                     # Test data
│       ├── xtreme-christmas.csv      # The real mapping report we analyzed
│       ├── sample-rgbeffects.xml
│       └── sample-networks.xml
│
└── docs/
    └── algorithm.md                  # Matching algorithm documentation
```

**Dependencies:**
```json
{
  "dependencies": {
    "@lightsofelmridge/xlights-file-gen": "github:lightsofelmridge/xlights-file-gen"
  }
}
```

---

### 2C. `xwire`

Scaffold only — this repo gets structure now but real development comes later.

```
xwire/
├── README.md                         # Vision doc: what xWire will do
├── package.json
│
├── src/
│   ├── engine/
│   │   ├── power-calculator.ts       # Voltage drop, injection points, PSU sizing
│   │   ├── cable-router.ts           # Optimal cable routing from controller to props
│   │   ├── port-assigner.ts          # Controller port → prop assignment logic
│   │   └── bill-of-materials.ts      # Cable lengths, connectors, fuses shopping list
│   │
│   ├── data/
│   │   ├── wire-gauge-tables.ts      # AWG specs, max amperage, voltage drop per foot
│   │   ├── pixel-power-specs.ts      # Power draw per pixel type (WS2811 12V, WS2812 5V, etc.)
│   │   └── controller-port-specs.ts  # Max amps per port by controller model
│   │
│   ├── ui/
│   │   ├── WiringDiagram.tsx         # Visual diagram renderer
│   │   ├── PowerOverlay.tsx          # Power injection point overlay
│   │   └── CableList.tsx             # Bill of materials table
│   │
│   └── types/
│       └── wiring.ts
│
└── tests/
```

**Dependencies:**
```json
{
  "dependencies": {
    "@lightsofelmridge/xlights-file-gen": "github:lightsofelmridge/xlights-file-gen"
  }
}
```

---

### 2D. `xlights-file-gen`

The shared library. Every other repo depends on this for reading/writing xLights files.

```
xlights-file-gen/
├── README.md
├── package.json
├── tsconfig.json
│
├── src/
│   ├── index.ts                      # Public API exports
│   │
│   ├── parsers/                      # READ xLights files
│   │   ├── rgbeffects-parser.ts      # Parse xlights_rgbeffects.xml → structured model data
│   │   ├── networks-parser.ts        # Parse xlights_networks.xml → controller definitions
│   │   ├── xmodel-parser.ts          # Parse .xmodel files → submodel definitions
│   │   └── xsq-parser.ts            # Parse .xsq sequence files → effect data
│   │
│   ├── generators/                   # WRITE xLights files
│   │   ├── rgbeffects-generator.ts   # Generate xlights_rgbeffects.xml from model definitions
│   │   ├── networks-generator.ts     # Generate xlights_networks.xml from controller config
│   │   └── xmodel-bundler.ts         # Bundle .xmodel files for complex props
│   │
│   ├── packages/                     # Pre-built display package definitions
│   │   ├── index.ts                  # Package registry
│   │   ├── starter.ts                # Starter: outline + 4 canes
│   │   ├── yard-show.ts              # Yard Show: + mega tree, arches, mini trees
│   │   ├── full-production.ts        # Full Production: + matrix, snowflakes, faces
│   │   └── the-beast.ts              # The Beast: + HD spinners, pixel forest, floods
│   │
│   ├── models/                       # Prop / model definitions
│   │   ├── prop-templates.ts         # Model type → xLights XML attributes
│   │   │                             #   Arches → DisplayAs="Arches", parm1=pixelCount, etc.
│   │   │                             #   Tree → DisplayAs="Tree", parm1=strings, parm2=pixelsPerString
│   │   │                             #   Custom → from .xmodel file
│   │   ├── controller-db.ts          # Known controllers: vendor, model, port count, protocol
│   │   │                             #   { vendor: "HinksPix", model: "PRO V3", ports: 48, ... }
│   │   │                             #   { vendor: "Falcon", model: "F16V4", ports: 16, ... }
│   │   │                             #   { vendor: "Falcon", model: "F4V3", ports: 4, ... }
│   │   │                             #   { vendor: "HolidayCoro", model: "AlphaPix 16", ports: 16, ... }
│   │   └── universe-calculator.ts    # pixels → channels → universes math
│   │
│   ├── validators/                   # Validate generated XML
│   │   ├── rgbeffects-validator.ts   # Verify model XML is well-formed + complete
│   │   └── networks-validator.ts     # Verify controller XML is well-formed
│   │
│   └── types/
│       ├── models.ts                 # Model, Group, SubmodelGroup, PropTemplate
│       ├── controllers.ts            # Controller, Port, Universe, Network
│       └── packages.ts               # DisplayPackage, PackageTier, ShoppingListItem
│
├── tests/
│   ├── parsers/
│   │   ├── rgbeffects-parser.test.ts
│   │   └── networks-parser.test.ts
│   ├── generators/
│   │   ├── rgbeffects-generator.test.ts
│   │   ├── networks-generator.test.ts
│   │   └── packages.test.ts          # Generate each package tier → validate output
│   └── fixtures/
│       ├── xlights_rgbeffects.xml    # Your actual layout file
│       ├── xlights_networks.xml      # Your actual networks file
│       └── xmodels/                  # Sample .xmodel files
│           ├── SHOWSTOPPER-SPINNER-with-Bat-Silhouette.xmodel
│           ├── 46_MegaSpin.xmodel
│           └── Boscoyo_Spider_Web.xmodel
│
└── docs/
    ├── xml-schemas.md                # xLights XML format documentation
    └── adding-controllers.md         # How to add new controller definitions
```

**Key public API:**
```typescript
// Reading
import { parseRgbEffects, parseNetworks, parseXModel } from '@lightsofelmridge/xlights-file-gen';

const layout = parseRgbEffects(xmlString);    // → { models, groups, submodelGroups }
const controllers = parseNetworks(xmlString); // → { controllers: [{ name, vendor, model, ip, universes }] }
const prop = parseXModel(xmlString);          // → { submodels, pixelCount, dimensions }

// Writing
import { generateRgbEffects, generateNetworks, generatePackage } from '@lightsofelmridge/xlights-file-gen';

const pkg = generatePackage('starter', {
  controller: 'falcon-f16v4',
  rooflineLength: 150,     // feet
  candyCaneCount: 4,
});
// Returns: { rgbeffectsXml, networksXml, shoppingList, summary }

// Or granular:
const rgbXml = generateRgbEffects(models, groups, positions);
const netXml = generateNetworks(controllers);
```

---

### 2E. `docs`

All specs, tickets, and strategy documents. This is the knowledge base.

```
docs/
├── README.md                         # Index of everything
│
├── tickets/                          # Mod:IQ UX overhaul tickets
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
├── mockups/                          # React/JSX mockup files
│   ├── modiq-card-mockup.jsx
│   ├── submodel-groups-mockup.jsx
│   └── sequence-product-cards.jsx
│
├── strategy/
│   ├── beginner-onboarding-platform.md   # Full onboarding program strategy
│   ├── tam-analysis.md                    # Market size analysis
│   └── vendor-partnership-model.md        # Affiliate / commission structure
│
├── algorithm/
│   ├── hd-submodel-crossref.json          # 74 props, 1,063 canonical patterns
│   ├── matching-algorithm.md              # Full algorithm spec (from tickets 73, 78, 79, 86)
│   └── test-data/
│       └── xtreme-christmas-mapping.csv   # Real-world mapping report for validation
│
└── xwire/
    └── product-vision.md                  # xWire feature spec + technical approach
```

---

## Step 3: Migration Instructions

### What to move from the existing repo

If the current codebase is a single repo (likely `lightsofelmridge.com` or similar), here's how to split it:

1. **Create the org and all 5 repos** (empty, with just a README each).

2. **`xlights-file-gen` — extract first** (other repos depend on it):
   - Move any xLights XML parsing code (rgbeffects reader, networks reader, xmodel reader) into `xlights-file-gen/src/parsers/`
   - Move any XML generation code into `xlights-file-gen/src/generators/`
   - Move the .xmodel fixture files from uploads into `xlights-file-gen/tests/fixtures/xmodels/`
   - Move `xlights_networks.xml` sample into `xlights-file-gen/tests/fixtures/`
   - Create package.json with name `@lightsofelmridge/xlights-file-gen`
   - Stub out the package definitions (starter.ts, yard-show.ts, etc.) — these can be empty files with TODO comments for now

3. **`modiq` — extract second**:
   - Move all Mod:IQ engine code (matching algorithm, scoring, constraints) into `modiq/src/engine/`
   - Move the mapping UI components into `modiq/src/ui/`
   - Move `hd_submodel_crossref.json` into `modiq/src/data/canonical-patterns.json`
   - Move vendor prop definitions into `modiq/src/data/vendor-props/`
   - Update imports to reference `@lightsofelmridge/xlights-file-gen` instead of local parsers
   - Copy the Christmas mapping CSV into `modiq/tests/fixtures/`

4. **`lightsofelmridge.com` — the remaining website code**:
   - Everything that isn't Mod:IQ engine or xLights file parsing stays here
   - Add `@lightsofelmridge/xlights-file-gen` and `@lightsofelmridge/modiq` as dependencies
   - Mod:IQ UI can be imported as a component or served as a route that lazy-loads the modiq package
   - Scaffold the `/start` onboarding routes (empty pages with TODO placeholders)
   - Scaffold the Shop Wizard feature directory

5. **`xwire` — scaffold only**:
   - Create the directory structure shown above
   - Add README with the product vision from the strategy doc
   - Stub out empty TypeScript files with interfaces and TODO comments
   - Add `@lightsofelmridge/xlights-file-gen` as a dependency
   - No real implementation yet

6. **`docs` — copy all spec documents**:
   - Copy all ticket markdown files (68-87)
   - Copy all mockup JSX files
   - Copy the strategy doc (beginner-onboarding-platform.md)
   - Copy the crossref JSON
   - Copy the Christmas mapping CSV
   - This repo is documentation only — no executable code

### Dependency linking for local development

Use npm workspaces or git submodules for local dev. Recommended approach:

```bash
# Local development workspace
mkdir lightsofelmridge-dev && cd lightsofelmridge-dev

# Clone all repos
git clone git@github.com:lightsofelmridge/xlights-file-gen.git
git clone git@github.com:lightsofelmridge/modiq.git
git clone git@github.com:lightsofelmridge/lightsofelmridge.com.git
git clone git@github.com:lightsofelmridge/xwire.git
git clone git@github.com:lightsofelmridge/docs.git

# Link local packages for development
cd xlights-file-gen && npm link && cd ..
cd modiq && npm link @lightsofelmridge/xlights-file-gen && npm link && cd ..
cd lightsofelmridge.com && npm link @lightsofelmridge/xlights-file-gen && npm link @lightsofelmridge/modiq && cd ..
```

Or use a root `package.json` with npm workspaces:
```json
{
  "name": "lightsofelmridge-dev",
  "private": true,
  "workspaces": [
    "xlights-file-gen",
    "modiq",
    "lightsofelmridge.com",
    "xwire"
  ]
}
```

---

## Step 4: README Templates

Each repo should have a README that explains what it is, how to set it up, and how it connects to the other repos.

### `xlights-file-gen` README

```markdown
# @lightsofelmridge/xlights-file-gen

Shared library for parsing and generating xLights XML files.

## What it does
- Reads `.rgbeffects` layout files → structured model/group data
- Reads `xlights_networks.xml` → controller definitions
- Reads `.xmodel` files → submodel definitions
- Reads `.xsq` sequence files → effect data
- Generates valid `.rgbeffects` and `xlights_networks.xml` from structured data
- Includes pre-built display package templates (Starter, Yard Show, Full, Beast)

## Used by
- [modiq](https://github.com/lightsofelmridge/modiq) — for reading source/destination layouts
- [lightsofelmridge.com](https://github.com/lightsofelmridge/lightsofelmridge.com) — for Shop Wizard file generation
- [xwire](https://github.com/lightsofelmridge/xwire) — for reading layout files to generate wiring diagrams

## Setup
\`\`\`bash
npm install
npm test
\`\`\`
```

### `modiq` README

```markdown
# Mod:IQ

Intelligent sequence-to-display mapping engine for xLights.

Maps sequences built for one display layout to work on a different display — handling groups, models, submodel groups, and HD spinner props with structural awareness.

## Architecture
- `src/engine/` — Matching algorithm (scoring, constraints, submodel logic)
- `src/data/` — Canonical pattern vocabulary, vendor prop library
- `src/ui/` — Multi-phase mapping review interface
- `src/parsers/` — File I/O layer

## Key specs
- See [docs repo](https://github.com/lightsofelmridge/docs) tickets 68-87 for full UX + algorithm specs
- Ticket 86 is the submodel group matching algorithm (the big one)

## Dependencies
- [@lightsofelmridge/xlights-file-gen](https://github.com/lightsofelmridge/xlights-file-gen)

## Setup
\`\`\`bash
npm install
npm test
\`\`\`
```

---

## Step 5: Branch Strategy

All repos use the same branching model:

- `main` — Production. Always deployable.
- `dev` — Integration branch. PRs merge here first.
- `feature/*` — Feature branches off dev. Named by ticket: `feature/ticket-86-submodel-matching`
- `fix/*` — Bug fixes: `fix/ticket-87-header-bugs`

For the initial migration, work directly on `main` to establish the baseline, then create `dev` branches once the structure is solid.

---

## Step 6: Verification Checklist

After migration, verify:

- [ ] `xlights-file-gen`: `npm test` passes, can parse the sample rgbeffects and networks XML files
- [ ] `modiq`: `npm test` passes, can import from `@lightsofelmridge/xlights-file-gen`
- [ ] `lightsofelmridge.com`: `npm run dev` starts, can import from both shared packages
- [ ] `xwire`: Scaffold exists, README describes the vision, stubs compile
- [ ] `docs`: All 20 tickets present, strategy doc present, crossref JSON present
- [ ] No cross-repo code duplication — xLights parsing only exists in `xlights-file-gen`
- [ ] Each repo has a .gitignore (node_modules, .env, dist/, build/)
- [ ] Each repo has a LICENSE file (private / proprietary)
