# ModIQ — Product Spec
### Intelligent Sequence Mapping for xLights

---

## Branding

**Name:** ModIQ (pronounced "mod-ick" or "mod-eye-cue")

**Tagline options:**
- "Map smarter." (primary — short, imperative, implies intelligence)
- "Your layout. Any sequence. Mapped in seconds."
- "Stop mapping manually."

**Name rationale:** "Mod" reads as both "model" (xLights core terminology) and "modification/modern." "IQ" signals intelligence without explicitly saying "AI" or "smart." Short, verbable ("ModIQ your layout"), visually sharp as a wordmark.

**Brand relationship:** ModIQ is a tool *by* Lights of Elm Ridge, not a separate brand. It appears as "ModIQ" with "by Lights of Elm Ridge" or "Powered by ModIQ" depending on context. This gives it its own identity while keeping it tied to the parent brand.

**Logo:** Separate wordmark (see logo assets). Uses the same design system — Syne font family, dark palette — but with a subtle neural/connection motif in the "IQ" that suggests AI without screaming it. The red accent (#ef4444) carries over for continuity.

---

## The Problem

When someone buys a third-party xLights sequence, they have to manually map every model in the sequence to the corresponding model in their own layout. This is done through xLights' built-in mapping dialog, which presents two lists side by side — the source sequence's models on the left, the user's models on the right — and requires the user to manually connect them.

This is painful for three reasons:

1. **Naming inconsistency.** The sequence creator's "Arch_Left_1" might be the user's "driveway-arch-01" or "ARC_DW_L1." There's no naming standard.
2. **Submodel complexity.** A spinner isn't one thing — it's arms, rings, centers, and each needs independent mapping. Different prop manufacturers structure submodels differently, so even two "spinners" may have completely different internal hierarchies.
3. **Quantity mismatches.** The sequence has 8 arches; the user has 5. Which 5 map to which 8? The user has to make judgment calls on every group.

The result: users spend 30–90 minutes on mapping per sequence, often get it wrong, re-map, tweak, and still end up with imperfect results. Some potential customers avoid buying sequences entirely because of this friction.

---

## The Solution

**ModIQ** — an AI-powered mapping tool on lightsofelmridge.com that:

1. Accepts the user's xLights files (network XML + RGB effects file)
2. Automatically matches the user's models to the sequence's models using pixel counts, model types, spatial positioning, submodel structure, and naming patterns
3. Generates a mapping file that imports directly into xLights' mapping dialog
4. Previews the mapping with confidence indicators and key decision factors
5. (V2) Allows inline tweaking before export
6. (V3) Supports any-to-any sequence mapping — not just Lights of Elm Ridge sequences

This is the first tool of its kind in the xLights ecosystem. No other vendor offers automated mapping.

---

## User Flow

### V1 Flow — New Purchase

```
User purchases sequence on lightsofelmridge.com
  ↓
Download confirmation page shows:
  "Ready to map this to your layout? → ModIQ it"
  ↓
ModIQ page opens with sequence pre-selected
  (source file auto-referenced from Cloudflare — no re-upload)
  ↓
User uploads their xlights_rgbeffects.xml
  ↓
Processing screen (ModIQ analyzes both layouts)
  ↓
Mapping Preview screen
  - Source model (ours) → Destination model (theirs)
  - Confidence indicator (High / Medium / Low)
  - Key factors: pixel count match, type match, spatial match
  - Unmapped models highlighted
  ↓
User clicks "Export Mapping File"
  ↓
Downloads .xmap file → imports into xLights mapping dialog
  ↓
Done. User tweaks only the low-confidence mappings in xLights.
```

### V1 Flow — Returning Customer (Download History)

```
User visits their account → Download History
  ↓
Each sequence shows: [Re-download] [ModIQ →]
  ↓
Clicking "ModIQ →" opens the tool with sequence pre-selected
  (source file already referenced — zero friction)
  ↓
User uploads their layout file → same flow as above
```

### V2 Additions

```
Mapping Preview screen (enhanced)
  ↓
User can:
  - Correct model types ("this is labeled 'prop1' but it's actually a spinner")
  - Reassign mappings via dropdowns
  - View submodel breakdown and reassign at submodel level
  - See spatial visualization of their layout vs source layout
  ↓
Revised mapping generated in real-time
  ↓
Export
```

### V3 — Open Mapping (Any Sequence → Any Layout)

```
ModIQ page shows two upload zones:
  ↓
LEFT: "Source Sequence"
  - Dropdown of Lights of Elm Ridge sequences (pre-loaded, no upload needed)
  - OR "Upload any sequence's layout file" (new)
  ↓
RIGHT: "Your Layout"
  - User uploads their xlights_rgbeffects.xml (same as V1)
  ↓
ModIQ processes both sides and generates mapping
```

V3 transforms ModIQ from a vendor-specific feature into a community-wide utility tool. Users who never buy our sequences still come to our site, use ModIQ, and discover our catalog. It's a top-of-funnel acquisition channel disguised as a free tool.

Strategic implications:
- Every xLights user becomes a potential site visitor
- ModIQ gets mentioned in Facebook groups whenever someone asks "how do I map this sequence?"
- Competitors' customers use our tool — we earn goodwill and visibility
- The tool itself markets our sequences (the dropdown shows our catalog prominently)

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────┐
│                  Frontend (React)                │
│  Upload UI → Processing → Preview → Export       │
└──────────────────────┬──────────────────────────┘
                       │ API calls
                       ▼
┌─────────────────────────────────────────────────┐
│                Backend / AI Layer                │
│                                                  │
│  1. File Parser (XML → structured data)          │
│  2. Model Classifier (type, shape, role)         │
│  3. Spatial Analyzer (coordinates → zones)       │
│  4. Submodel Resolver (answer key lookup)        │
│  5. Matching Engine (weighted scoring)            │
│  6. Map File Generator (.xmap output)            │
│                                                  │
│  Knowledge Base:                                 │
│  - Source layouts (our sequences' models)         │
│  - Prop answer key (submodel structures by mfr)  │
│  - Training layouts (community RGB files)         │
└─────────────────────────────────────────────────┘
```

### xLights File Formats

#### Input: User's Layout Files

**Network XML (`xlights_networks.xml`)**
Contains controller/output definitions. Less critical for mapping but confirms universe/channel structure.

**RGB Effects File (`xlights_rgbeffects.xml`)**
This is the primary file. Contains:
- Every model definition (name, type, pixel count, start channel)
- Model coordinates (x, y, z position in the layout)
- Model groups and submodels
- Display dimensions

Key XML elements per model:
```xml
<model name="Arch_Left_1"
       DisplayAs="Arches"         <!-- model type -->
       parm1="25"                  <!-- nodes/pixels per arch -->
       parm2="1"                   <!-- strands -->
       parm3="1"                   <!-- lights per node -->
       StringType="RGB Nodes"
       StartChannel=">!Controller:E1.31_1:3:1"
       WorldPosX="123.45"         <!-- spatial X coordinate -->
       WorldPosY="67.89"          <!-- spatial Y coordinate -->
       WorldPosZ="0.00"           <!-- spatial Z (if 3D) -->
       ... />
```

**Model Files (`.xmodel`)**
Individual model definitions that can be exported/imported. Contain the same data as the rgbeffects entries but as standalone files.

#### Input: Source Sequence Layout (Ours)

We maintain a canonical model list for each sequence we sell. This is the "source" side of the mapping. Stored in our backend as structured data:

```json
{
  "sequence": "Abracadabra",
  "source_models": [
    {
      "name": "Spinner-Overlord",
      "type": "Spinner",
      "pixel_count": 1529,
      "submodels": ["Arm1", "Arm2", "Arm3", "Arm4", "Ring1", "Ring2", "Ring3", "Center"],
      "manufacturer": "Gilbert Engineering",
      "product": "Overlord",
      "zone": "roof-center",
      "position": { "x": 0.5, "y": 0.15 }
    },
    {
      "name": "Arch-1",
      "type": "Arch",
      "pixel_count": 150,
      "submodels": [],
      "zone": "yard-center",
      "position": { "x": 0.2, "y": 0.65 }
    }
  ]
}
```

#### Output: Mapping File (`.xmap`)

The xLights mapping file format. This is what the user imports into xLights' mapping dialog.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<MapInfo>
  <map name="Lights of Elm Ridge - Abracadabra"/>
  <mapping>
    <!-- Each line maps a source model to a destination model -->
    <map src="Spinner-Overlord" dst="MySpinner1"/>
    <map src="Arch-1" dst="DrivewayArch_L1"/>
    <map src="Arch-2" dst="DrivewayArch_L2"/>
    <!-- Submodel mappings -->
    <map src="Spinner-Overlord/Arm1" dst="MySpinner1/Arm_A"/>
    <map src="Spinner-Overlord/Arm2" dst="MySpinner1/Arm_B"/>
    <!-- Unmapped (user has no equivalent) -->
    <map src="Arch-7" dst=""/>
    <map src="Arch-8" dst=""/>
  </mapping>
</MapInfo>
```

**Note:** The exact xmap schema should be validated against xLights source code and tested with real imports. The format above is representative — we need to confirm the exact element names, attributes, and any required metadata by examining actual exported mapping files from xLights.

---

## AI Matching Algorithm

### Overview

The matching engine uses weighted multi-factor scoring to determine the best mapping between source models and destination models.

### Factor 1: Model Type Match (Weight: 35%)

The `DisplayAs` attribute in xLights tells us the model type. Common values:

| DisplayAs Value | Category |
|---|---|
| Arches | Arch |
| Tree 360, Tree Flat | Tree |
| Spinner | Spinner |
| Matrix, Custom | Matrix/Panel |
| Single Line, Poly Line | Line/Outline |
| Star | Star |
| Circle | Circle/Wreath |
| Candy Cane | Candy Cane |
| Window Frame | Window |
| Icicles | Icicles |
| Custom | (requires deeper analysis) |

Scoring:
- Exact type match: 1.0
- Related type match (e.g., "Tree 360" ↔ "Tree Flat"): 0.7
- "Custom" type with name suggesting a match: 0.5
- No type match: 0.0

### Factor 2: Pixel Count Match (Weight: 25%)

Pixel count is a strong indicator. Two "arches" with 150 pixels each are almost certainly equivalent. Two "arches" where one has 50 pixels and the other has 300 are probably different sizes.

Scoring:
```
score = 1.0 - (abs(source_pixels - dest_pixels) / max(source_pixels, dest_pixels))
```

This gives:
- 150 vs 150 = 1.0 (perfect match)
- 150 vs 175 = 0.83 (close enough — same prop, different density)
- 150 vs 50 = 0.67 (probably different prop/size)
- 150 vs 500 = 0.70 (very different)

A minimum threshold of 0.5 should be applied — below that, pixel count is so different it's probably not the same type of prop.

### Factor 3: Spatial Position Match (Weight: 20%)

Using the x, y coordinates from the RGB effects file, we can determine where props sit in the layout. This is critical for disambiguation when someone has multiples (e.g., 8 arches).

**Normalization:** Both layouts' coordinates are normalized to a 0–1 range (relative to layout bounds). This makes them comparable regardless of absolute coordinate systems.

**Zone assignment:** Divide the layout into a grid:

```
┌───────────┬───────────┬───────────┐
│ Left-High │  Mid-High │ Right-High│
│ (roof L)  │ (roof C)  │ (roof R)  │
├───────────┼───────────┼───────────┤
│ Left-Mid  │  Mid-Mid  │ Right-Mid │
│ (house L) │ (house C) │ (house R) │
├───────────┼───────────┼───────────┤
│ Left-Low  │  Mid-Low  │ Right-Low │
│ (yard L)  │ (yard C)  │ (yard R)  │
└───────────┴───────────┴───────────┘
```

Scoring:
- Same zone: 1.0
- Adjacent zone: 0.6
- Opposite zone: 0.2
- No position data: 0.5 (neutral — don't penalize if coordinates aren't available)

**Within-group ordering:** For multiples (arches, trees), sort by x-coordinate within the same type. Map leftmost-to-leftmost, etc. This handles the "which arch maps to which arch" problem.

### Factor 4: Name Similarity (Weight: 10%)

Names are unreliable but can provide a tiebreaker. Use fuzzy string matching after normalization.

**Name normalization:**
1. Lowercase
2. Remove common separators: `_`, `-`, `.`, spaces
3. Remove common prefixes: "my", "the", numbers-only suffixes
4. Expand common abbreviations: "dw" → "driveway", "l" → "left", "r" → "right", "c" → "center"

Scoring: Normalized Levenshtein distance or token overlap ratio.

### Factor 5: Submodel Structure Match (Weight: 10%)

This uses the prop answer key (the Excel spreadsheet) to understand what submodels a prop should have.

**The Prop Answer Key** is a lookup table:

```json
{
  "Gilbert Engineering Overlord": {
    "type": "Spinner",
    "total_pixels": 1529,
    "submodels": {
      "arms": { "count": 8, "pixels_per": 120 },
      "rings": { "count": 4, "pixels_per": 80 },
      "center": { "count": 1, "pixels_per": 49 }
    }
  },
  "EFL Designs Showstopper": {
    "type": "Spinner",
    "total_pixels": 800,
    "submodels": {
      "arms": { "count": 6, "pixels_per": 100 },
      "rings": { "count": 3, "pixels_per": 60 },
      "center": { "count": 1, "pixels_per": 20 }
    }
  }
}
```

When the AI identifies a model as a spinner with ~1500 pixels, it can look up the answer key and predict the submodel structure — then map arm-to-arm, ring-to-ring, even when the counts differ.

**Submodel mapping strategy when counts differ:**
- If source has 8 arms and dest has 6: map 1→1, 2→2, ... 6→6, leave source arms 7–8 unmapped
- If source has 4 rings and dest has 3: map outer→outer, inner→inner, merge middle rings
- Always map "center" → "center"
- Use pixel counts within submodels to further refine (a 120px arm maps better to a 100px arm than a 20px center)

### Combined Scoring

```
total_score = (type_score × 0.35) +
              (pixel_score × 0.25) +
              (spatial_score × 0.20) +
              (name_score × 0.10) +
              (submodel_score × 0.10)
```

### Confidence Levels

| Score Range | Confidence | Display | Meaning |
|---|---|---|---|
| 0.85 – 1.0 | High | Green | Almost certainly correct |
| 0.60 – 0.84 | Medium | Amber | Likely correct, worth verifying |
| 0.40 – 0.59 | Low | Red | Best guess, user should confirm |
| Below 0.40 | Unmapped | Gray | No good match found |

### Assignment Algorithm

This is a classic assignment problem. After scoring all source↔destination pairs, use the Hungarian algorithm (or a greedy approach for V1) to find the optimal overall mapping:

1. Build an N×M score matrix (source models × destination models)
2. Filter: zero out any pair where type doesn't match at all
3. For each model type group (all arches, all spinners, etc.):
   a. Extract the sub-matrix for that type
   b. Sort by spatial position (left to right)
   c. Assign greedily: best score first, removing assigned models from the pool
4. Handle quantity mismatches:
   - More source than dest: mark excess source models as "unmapped (no equivalent in your layout)"
   - More dest than source: mark excess dest models as "available but unused"

---

## Knowledge Base

### Source Layouts (Our Sequences)

For each sequence we sell, we maintain:

```
sequences/
├── abracadabra/
│   ├── source_models.json     (canonical model list with types, pixels, positions)
│   ├── submodel_map.json      (submodel structure for complex props)
│   └── notes.md               (any special mapping considerations)
├── thunderstruck/
│   ├── source_models.json
│   └── ...
└── ...
```

**Bootstrap:** Extract this data from our own xlights_rgbeffects.xml for our display. This is the initial training set — one source layout that all our sequences share.

### Prop Answer Key

The community Excel spreadsheet that maps manufacturer/product → submodel structure. Convert to JSON and store as a reference:

```
knowledge/
├── prop_answer_key.json       (manufacturer → submodel structures)
├── model_type_aliases.json    (name variations → canonical type)
└── common_patterns.json       (frequently seen naming conventions)
```

**Credit:** The Excel creator gets credited on the tool page and in the mapping output. Something like: "Submodel data powered by [Creator Name]'s prop reference database."

### Training Layouts (Community Files)

As users (or you) provide additional RGB files, the system learns:
- New naming conventions it hasn't seen
- Common prop combinations
- Typical layout structures

This doesn't require retraining a model — it's more like expanding a lookup table and tuning the name-matching heuristics.

---

## Site Placement & Navigation

### Where ModIQ Lives

**Primary page:** `/modiq`

Clean, short URL. Not buried under `/tools/modiq` — it's prominent enough to be top-level. This is a headline feature, not a utility buried in a submenu.

### Navigation

Add a **"Tools"** top-level nav item with dropdown:

```
┌──────────────────────────────────────────────────────────┐
│  LIGHTS of ELM RIDGE                                      │
│  Home  Sequences  The Show  Display  Tools ▾  About       │
│                                       ┌───────────────┐   │
│                                       │ ⚡ ModIQ       │   │
│                                       │ 🛒 Shop Wizard│   │
│                                       └───────────────┘   │
└──────────────────────────────────────────────────────────┘
```

ModIQ gets the top spot in the dropdown with a subtle accent treatment (red dot, icon, or "NEW" badge during launch). The Shopping List Wizard sits below it. Two tools is enough to justify a nav section and positions the brand as a vendor that builds tools for the community, not just someone selling files.

### CTA Touchpoints Across the Site

ModIQ should appear everywhere a user might need it, woven into the natural flow:

**1. Homepage — Feature callout strip**
Position between existing sections (after Latest Drops or in the stats area):
```
┌─────────────────────────────────────────────────────────┐
│  ⚡ ModIQ                                                │
│  Stop mapping sequences manually.                        │
│  Upload your layout → get a mapping file in seconds.     │
│  [ Try ModIQ → ]                                         │
└─────────────────────────────────────────────────────────┘
```
Not the hero (the show is the hero), but prominent. One-liner + CTA.

**2. Each sequence product page — Buying motivator**
Below "Add to Cart" / "Download" button:
```
  ┌────────────────────────────────────────────┐
  │  ⚡ Includes ModIQ — auto-map this          │
  │  sequence to your layout in seconds         │
  └────────────────────────────────────────────┘
```
This tells the customer *before* purchase that the mapping pain is solved. It's a reason to buy.

**3. Download / purchase confirmation page**
Right after download completes:
```
  ✓ Abracadabra downloaded successfully

  Ready to map it to your layout?
  [ ModIQ this sequence → ]
```
Button pre-selects the sequence and auto-links the Cloudflare download. Zero re-uploading.

**4. Account → Download History**
Each sequence in their history gets a ModIQ action:
```
  Abracadabra — purchased Oct 12, 2025
  [↓ Re-download]  [⚡ ModIQ →]

  Thunderstruck — purchased Nov 3, 2025
  [↓ Re-download]  [⚡ ModIQ →]
```
One click, sequence is pre-selected, source file already referenced. User just provides their layout XML.

**5. Sequences listing page — Banner**
Near the top of the sequences grid:
```
  Every sequence includes ModIQ — automatic layout mapping.
  No more dragging models around for an hour. [Learn more →]
```

**6. Social media / marketing**
- Demo videos: side-by-side of 60-minute manual mapping vs. 30-second ModIQ flow
- Facebook groups (organic, not spammy): when someone asks "how do I map this?" → "we built a tool for that"
- YouTube: dedicated explainer video

### Cloudflare Download Integration

Critical detail: when a user accesses ModIQ from their download history or purchase confirmation, the "source sequence" side should **reference the sequence's model data directly from our backend** — not force them to re-upload a file they already downloaded. The source layout data for our sequences is stored server-side as structured JSON. The Cloudflare download URL is only relevant for the actual sequence file (.fseq / .xsq); the model mapping data is a separate, lightweight JSON payload that ModIQ fetches automatically when a sequence is selected.

Flow:
```
User clicks "ModIQ →" on Thunderstruck
  ↓
ModIQ page loads with ?sequence=thunderstruck in URL
  ↓
Frontend fetches /api/modiq/source/thunderstruck
  ↓
Returns structured model list (JSON, ~5KB)
  ↓
Source side is populated — user only needs to upload their layout
```

---

## Interface Design

### Page: `/modiq`

#### Section 1: Hero / Explainer

```
┌─────────────────────────────────────────────────────┐
│  ModIQ                                               │
│  Map smarter.                                        │
│                                                      │
│  Upload your xLights layout, pick a sequence,        │
│  and get a mapping file in seconds — not hours.      │
│                                                      │
│  [How It Works ↓]                                    │
└─────────────────────────────────────────────────────┘
```

Minimal, matches site aesthetic. Dark bg, red accent, Syne headers.

#### Section 2: Input Form

**V1/V2 — Our sequences only:**
```
┌─────────────────────────────────────────────────────┐
│  STEP 1: Select Your Sequence                        │
│  ┌─────────────────────────────────────────────┐     │
│  │ Abracadabra — Steve Miller Band         ▾   │     │
│  └─────────────────────────────────────────────┘     │
│  (Pre-selected if user arrived via download history)  │
│                                                      │
│  STEP 2: Upload Your Layout                          │
│  ┌─────────────────────────────────────────────┐     │
│  │                                             │     │
│  │   Drag & drop your xlights_rgbeffects.xml   │     │
│  │   or click to browse                        │     │
│  │                                             │     │
│  │   📁 xlights_rgbeffects.xml (2.4 MB) ✓      │     │
│  │                                             │     │
│  └─────────────────────────────────────────────┘     │
│                                                      │
│  Where to find this file:                            │
│  Your xLights show folder → xlights_rgbeffects.xml   │
│                                                      │
│  [ ModIQ It → ]                                      │
└─────────────────────────────────────────────────────┘
```

**V3 — Any sequence (upgraded layout):**
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌─────────────────────┐     ┌──────────────────────────┐   │
│  │  SOURCE SEQUENCE     │     │  YOUR LAYOUT              │   │
│  │                      │     │                           │   │
│  │  ● Our Sequences  ▾  │     │  Drag & drop your         │   │
│  │    Abracadabra       │     │  xlights_rgbeffects.xml    │   │
│  │    Thunderstruck     │     │                           │   │
│  │    Skeleton Dance    │     │  📁 my_rgbeffects.xml ✓    │   │
│  │    ───────────────   │     │                           │   │
│  │  ● Upload any layout │     │                           │   │
│  │    [Drop file here]  │     │                           │   │
│  └─────────────────────┘     └──────────────────────────┘   │
│                                                              │
│               [ ModIQ It → ]                                 │
└─────────────────────────────────────────────────────────────┘
```

The V3 input form shows our sequences as the default/promoted option (top of the list, pre-selected) with "Upload any layout" as a secondary option below. This ensures our catalog gets visibility even when someone is mapping a competitor's sequence.

#### Section 3: Processing State

```
┌─────────────────────────────────────────────────────┐
│  ModIQ is working...                                 │
│                                                      │
│  ✓ Parsing your layout — 47 models found             │
│  ✓ Analyzing model types and positions               │
│  ● Matching against Abracadabra source layout...     │
│  ○ Resolving submodel structures                     │
│  ○ Generating optimal mapping                        │
│                                                      │
│  ████████████████████░░░░░░░  78%                    │
└─────────────────────────────────────────────────────┘
```

Real-time progress updates. Each step reveals as it completes.

#### Section 4: Mapping Preview

```
┌─────────────────────────────────────────────────────────────────┐
│  MAPPING RESULTS                                                 │
│  Abracadabra → Your Layout                                       │
│                                                                  │
│  42 of 47 models mapped · 38 high confidence · 4 medium         │
│  5 models in your layout have no equivalent in this sequence     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  CONFIDENCE   OUR MODEL            →   YOUR MODEL           │ │
│  │─────────────────────────────────────────────────────────────│ │
│  │  ●● HIGH      Spinner-Overlord     →   My_Big_Spinner       │ │
│  │               1529px · Spinner     →   1400px · Spinner     │ │
│  │               roof-center          →   roof-center          │ │
│  │               8 submodels mapped                            │ │
│  │                                                             │ │
│  │  ●● HIGH      Arch-1              →   DrivewayArch_L1      │ │
│  │               150px · Arch         →   150px · Arch         │ │
│  │               yard-left            →   yard-left            │ │
│  │                                                             │ │
│  │  ●○ MEDIUM    Matrix-P5           →   LED_Panel_1           │ │
│  │               7140px · Matrix      →   4800px · Custom      │ │
│  │               yard-right           →   yard-right           │ │
│  │               ⚠ Pixel count differs significantly           │ │
│  │                                                             │ │
│  │  ○○ LOW       MiniTree-3          →   tree_sm_c             │ │
│  │               100px · Tree Flat    →   75px · Custom         │ │
│  │               yard-center          →   yard-center          │ │
│  │               ⚠ Type detected from name only                │ │
│  │                                                             │ │
│  │  — UNMAPPED   Arch-7              →   (no match)            │ │
│  │               150px · Arch                                  │ │
│  │               Your layout has fewer arches                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [ ↓ Download Mapping File (.xmap) ]                             │
│                                                                  │
│  How to import: Open xLights → Sequence tab →                    │
│  Import → Mapping → Load Mapping File                            │
└─────────────────────────────────────────────────────────────────┘
```

#### Section 5: Submodel Detail (Expandable)

When a user clicks on a mapped spinner or complex prop:

```
┌─────────────────────────────────────────────────────────────────┐
│  ▼ Spinner-Overlord → My_Big_Spinner                            │
│                                                                  │
│  Detected your spinner as: EFL Showstopper (6-arm, 3-ring)      │
│  Our spinner: GE Overlord (8-arm, 4-ring)                        │
│                                                                  │
│  SUBMODEL MAPPING:                                               │
│  Arm1    →  Arm_A      (120px → 100px)     ●● HIGH              │
│  Arm2    →  Arm_B      (120px → 100px)     ●● HIGH              │
│  Arm3    →  Arm_C      (120px → 100px)     ●● HIGH              │
│  Arm4    →  Arm_D      (120px → 100px)     ●● HIGH              │
│  Arm5    →  Arm_E      (120px → 100px)     ●● HIGH              │
│  Arm6    →  Arm_F      (120px → 100px)     ●● HIGH              │
│  Arm7    →  (unmapped) — your spinner has 6 arms                 │
│  Arm8    →  (unmapped) — your spinner has 6 arms                 │
│  Ring1   →  Ring_Outer (80px → 60px)       ●● HIGH              │
│  Ring2   →  Ring_Mid   (80px → 60px)       ●○ MEDIUM            │
│  Ring3   →  Ring_Inner (80px → 60px)       ●● HIGH              │
│  Ring4   →  (unmapped) — your spinner has 3 rings                │
│  Center  →  Center     (49px → 20px)       ●● HIGH              │
│                                                                  │
│  Prop reference data credit: [Creator Name]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## V2 Features

### Inline Type Correction

If the AI isn't sure about a model type (DisplayAs = "Custom" with an ambiguous name), V2 surfaces a prompt:

```
┌─────────────────────────────────────────────────────┐
│  ⚠ We're not sure about these models:               │
│                                                      │
│  "prop_1" — 350px, Custom type                       │
│  This looks like it could be a: [Spinner ▾]          │
│                                                      │
│  "yard_thing_L" — 485px, Custom type                 │
│  This looks like it could be a: [Tombstone ▾]        │
│                                                      │
│  [ Re-run Mapping With Corrections → ]               │
└─────────────────────────────────────────────────────┘
```

### Inline Reassignment

Dropdown on each mapping row to manually override:

```
│  ●○ MEDIUM    Matrix-P5   →   [ LED_Panel_1     ▾]  │
│                                  LED_Panel_1          │
│                                  LED_Panel_2          │
│                                  Matrix_Main          │
│                                  (unmapped)           │
```

### Side-by-Side Spatial View

Visual representation showing both layouts with lines connecting mapped models:

```
┌─────────────────┐     ┌─────────────────┐
│  OUR LAYOUT     │     │  YOUR LAYOUT    │
│                 │     │                 │
│   ◉ ◉ ◉        │────▶│     ◉ ◉        │
│   spinners      │     │   spinners      │
│                 │     │                 │
│  ◉◉◉◉◉◉◉◉     │────▶│   ◉◉◉◉◉        │
│    arches       │     │   arches        │
│                 │     │                 │
│    ◉            │────▶│      ◉          │
│   matrix        │     │    panel        │
└─────────────────┘     └─────────────────┘
```

---

## Implementation Plan

### Phase 1: Foundation (Weeks 1–2)

**Goal:** Parse xLights files and extract structured model data.

Tasks:
- Write XML parser for `xlights_rgbeffects.xml` — extract all model definitions (name, DisplayAs, pixel count, coordinates, start channel, submodels)
- Write parser for `.xmodel` files as an alternative input
- Build our source layout data from our own RGB effects file
- Create the structured JSON representation for our sequences
- Validate parsing against 3–5 real-world RGB files (our own + any community files available)

Deliverable: A function that takes an RGB effects XML file and returns a structured model list.

### Phase 2: Matching Engine (Weeks 3–4)

**Goal:** Implement the multi-factor scoring and assignment algorithm.

Tasks:
- Implement each scoring factor (type, pixels, spatial, name, submodel)
- Implement coordinate normalization and zone assignment
- Build the greedy assignment algorithm (grouped by type, sorted by position)
- Import the prop answer key Excel → JSON
- Test against our own layout mapped to itself (should produce 100% high-confidence matches)
- Test against 2–3 real user layouts (if available) and manually verify results

Deliverable: A function that takes two model lists and returns a scored mapping.

### Phase 3: Map File Generation (Week 5)

**Goal:** Generate valid xLights mapping files.

Tasks:
- Research exact `.xmap` file format from xLights source code
- Generate mapping XML from the scored results
- Test import in xLights — verify the mapping dialog loads correctly
- Handle submodel mappings in the output format
- Handle edge cases: unmapped models, partial mappings

Deliverable: A function that takes a mapping result and outputs a downloadable `.xmap` file.

### Phase 4: Frontend (Weeks 6–8)

**Goal:** Build the user-facing tool on lightsofelmridge.com.

Tasks:
- Upload interface (drag-and-drop, file validation, clear instructions)
- Sequence selector (dropdown of our available sequences)
- Processing state with real-time progress
- Mapping preview table with confidence indicators
- Submodel expansion panels
- Export/download button
- "How to import" instructions
- Mobile-responsive design matching site aesthetic
- Error handling (invalid files, unsupported formats, etc.)

Deliverable: Full ModIQ tool page at `/modiq`.

### Phase 5: AI Integration (Weeks 9–10)

**Goal:** Add Claude API-powered intelligence for ambiguous cases.

Tasks:
- For models where algorithmic matching is uncertain (Custom types, unusual names), send the model data to Claude API for classification
- Claude prompt: "Given this xLights model with name '[name]', [X] pixels, DisplayAs 'Custom', and these submodels [...], what type of holiday light prop is this most likely? Options: Spinner, Arch, Tree, Matrix, Star, Wreath, Candy Cane, Icicles, Window, Outline, Tombstone, Other."
- Cache results — once a model pattern is classified, store it for future lookups
- This layer sits on top of the algorithmic matching and only fires for low-confidence matches

Deliverable: AI classification fallback for ambiguous models.

### Phase 6: V2 Features (Weeks 11–14)

- Inline type correction UI
- Inline reassignment dropdowns
- Side-by-side spatial visualization
- Expanded prop answer key
- Community feedback loop (optional: "Was this mapping correct?" → improves future matches)

### Phase 7: V3 — Open Mapping (Weeks 15–18)

**Goal:** Allow any-to-any sequence mapping, not just Lights of Elm Ridge sequences.

Tasks:
- Add second upload zone for source sequence layout file
- Apply the same parsing pipeline to uploaded source files (no pre-structured JSON advantage)
- Adjust confidence scoring — V3 mappings from uploaded sources will have slightly lower confidence than our pre-structured sequences (no answer key advantage on the source side)
- Add "Upload source layout" option alongside the existing sequence dropdown
- Promote our catalog within the V3 interface (dropdown shows our sequences first, "or upload any layout" as secondary option)
- Marketing push: announce in Facebook groups as a free community tool
- Track analytics: how many V3 users convert to sequence purchases

Deliverable: ModIQ V3 supporting arbitrary source layouts.

---

## Data Privacy & Trust

This matters because users are uploading their xLights configuration files, which represent significant personal investment of time and money.

- Files are processed and discarded — we do not store user layout files permanently
- Display a clear privacy statement: "Your files are processed in real-time and not stored on our servers."
- No account required for V1 — reduce friction to zero
- Optionally allow users to save their mapping for future sequence purchases (requires account, V2+)

---

## Competitive Positioning

ModIQ should be marketed as a **reason to buy from Lights of Elm Ridge** over any other vendor — and eventually as a reason to visit lightsofelmridge.com even if you buy from someone else.

### V1/V2 Messaging (Our Sequences)

- Homepage: "Every sequence includes ModIQ — mapping in seconds, not hours"
- Sequence pages: "Includes ModIQ — auto-map to your layout in seconds"
- Social media: Demo videos showing 30-second ModIQ flow vs. 60-minute manual process
- Facebook groups (organic): When someone asks "how do I map this?" — "we built ModIQ for exactly this"

### V3 Messaging (Open to All Sequences)

- "ModIQ maps any sequence to any layout — free, by Lights of Elm Ridge"
- Positions us as a community tool provider, not just a vendor
- Even competitors' customers visit our site, see our catalog, and potentially convert
- The tool markets our sequences passively (our catalog appears first in the dropdown)

### Why Competitors Can't Easily Replicate

1. Technical capability to build it
2. Structured source layout data for every sequence
3. The prop answer key knowledge base
4. Ongoing maintenance as xLights evolves
5. Community trust and first-mover advantage (if we launch first, ModIQ becomes the default answer to "how do I map?")

---

## Open Questions

1. **xLights mapping file format** — Need to export a real `.xmap` from xLights and reverse-engineer the exact schema. The format shown above is representative but needs validation.

2. **Submodel naming conventions** — How consistent is the prop answer key Excel? Does it cover all major manufacturers? What's the update cadence?

3. **Processing location** — Should the AI processing happen client-side (browser), server-side, or via Claude API? Client-side is simpler (no backend needed, no data leaves the user's browser) but limits AI capability. Server-side allows more sophisticated matching but requires hosting.

4. **xLights version compatibility** — The XML format may vary across xLights versions. Need to handle format differences gracefully.

5. **Group models** — xLights allows "model groups" which are logical collections of models. How should these be handled in mapping? Groups typically don't need mapping (they're derived from their member models), but some sequences use group-level effects.

6. **Strand and node configuration** — Beyond pixel count, strand count and nodes-per-strand affect how effects render. Should ModIQ flag mismatches here?

7. **V3 source parsing quality** — When users upload an arbitrary source layout (not one of ours), the matching won't benefit from pre-structured data or answer key lookups on the source side. How much does this degrade accuracy? Needs testing.

8. **Account requirement** — V1 should work without login for minimum friction. But download history integration requires an account. Should ModIQ's standalone mode (manual sequence selection) remain account-free while the integrated mode (pre-selected from history) requires login?

## Resolved Decisions

- **Name:** ModIQ
- **URL:** `/modiq` (top-level, not nested)
- **Nav:** "Tools" dropdown containing ModIQ + Shopping List Wizard
- **Version scope:** V1 = our sequences only, V2 = inline editing, V3 = any-to-any mapping
- **Download integration:** Source sequence data fetched from backend API, not re-uploaded by user
- **Logo:** Separate wordmark, same design system as parent brand, subtle AI motif
