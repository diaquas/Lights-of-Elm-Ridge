# ModIQ V2: Effect-Aware Mapping & Group Intelligence

**Status:** Core architectural spec — supersedes the flat model list approach.  
**Depends on:** .xsq sequence file (in addition to xlights_rgbeffects.xml)

---

## The Insight

ModIQ V1 treats the source layout as a flat list of every model that exists. This is wrong. What matters isn't which models *exist* in the source layout — it's which models, groups, and submodels **actually have effects rendered to them** in the specific sequence being mapped.

A typical Halloween layout might have 214 models in the rgbeffects file, but a given sequence might only put effects on 47 of those models/groups. The other 167 are unused layers — noise that clutters the source panel and generates nonsense suggestions.

**The .xsq file is the key.** It contains the actual effect timeline — which layers have effects, at what level (group, model, submodel), and when. By parsing the .xsq alongside the rgbeffects.xml, ModIQ can build an **effect tree** that knows exactly what needs to be mapped and — critically — at what level.

---

## The Three Scenarios

How sequence creators actually apply effects determines what ModIQ needs to ask the user to map. There are three patterns, and they mix within a single sequence.

### Scenario A: Group-Only Effects

The creator put effects on `GROUP - ALL TOMBSTONES` with render style "Per Model." They never touched Tombstone 1, Tombstone 2, Tombstone 3, or Tombstone 4 individually.

**What the .xsq shows:**
```
GROUP - ALL TOMBSTONES  →  [Chase effect, 0:00–0:45]
                           [Shimmer effect, 0:45–1:20]
                           [Color wash, 1:20–2:00]

Tombstone 1             →  (no effects)
Tombstone 2             →  (no effects)
Tombstone 3             →  (no effects)
Tombstone 4             →  (no effects)
```

**What this means for ModIQ:**

The user only needs to map the GROUP. Once they map their `All Tombstones` group → source `GROUP - ALL TOMBSTONES`, the individual tombstone models are **resolved by inheritance**. They receive effects through the group mapping.

**UI treatment:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ○  GROUP - ALL TOMBSTONES               Group · 4 models               │
│    Effects at group level only                                          │
│    Contains: Tombstone 1, Tombstone 2, Tombstone 3, Tombstone 4        │
│                                                                         │
│    💡 All Tombstones (72%)                                              │
│                                                                         │
│    ┌ Mapping this group will resolve all 4 child models ──────────┐    │
│    │ ✓ Tombstone 1   ✓ Tombstone 2   ✓ Tombstone 3   ✓ Tombstone 4│    │
│    └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

When the user maps this group:
- Group row moves to mapped/confident section
- All 4 child models are **immediately marked as "Covered by group"**
- Progress bar jumps by 5 (1 group + 4 models)
- Child models do NOT appear in Needs Mapping at all

### Scenario B: Group + Individual Effects

The creator put effects on `GROUP - ALL TOMBSTONES` AND also put unique individual effects on `Tombstone 1` and `Tombstone 3` (perhaps those two have special solo moments — a flash, a unique color, a singing face activation).

**What the .xsq shows:**
```
GROUP - ALL TOMBSTONES  →  [Chase effect, 0:00–0:45]
                           [Shimmer effect, 0:45–1:20]

Tombstone 1             →  [Solo flash, 0:30–0:32]    ← individual effect
Tombstone 2             →  (no effects)
Tombstone 3             →  [Singing face, 1:00–1:45]   ← individual effect
Tombstone 4             →  (no effects)
```

**What this means for ModIQ:**

The user needs to map the GROUP *and* Tombstone 1 and Tombstone 3 individually. Tombstone 2 and Tombstone 4 are covered by the group mapping alone — they have no individual effects.

**UI treatment:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ○  GROUP - ALL TOMBSTONES               Group · 4 models               │
│    Effects at group level + 2 individual models                         │
│                                                                         │
│    💡 All Tombstones (72%)                                              │
│                                                                         │
│    Mapping this group covers 2 of 4 children:                           │
│    ✓ Tombstone 2 (covered)   ✓ Tombstone 4 (covered)                   │
│                                                                         │
│    These 2 have their own effects and still need mapping:               │
│    ○ Tombstone 1 — solo flash at 0:30                                   │
│    ○ Tombstone 3 — singing face at 1:00                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

When the user maps the group:
- Group moves to mapped section
- Tombstone 2 and 4 are marked "Covered by group"
- Tombstone 1 and 3 **remain in Needs Mapping** with a note: "Has individual effects"
- Progress bar jumps by 3 (1 group + 2 covered models), but 2 remain

### Scenario C: Individual-Only Effects

The creator never put effects at the group level. All effects are on individual models. The group exists in the layout but has an empty timeline.

**What the .xsq shows:**
```
GROUP - ALL TOMBSTONES  →  (no effects)

Tombstone 1             →  [Chase effect, 0:00–0:45]
Tombstone 2             →  [Shimmer effect, 0:00–0:45]
Tombstone 3             →  [Color wash, 0:00–0:45]
Tombstone 4             →  [Strobe, 0:00–0:45]
```

**What this means for ModIQ:**

The group is irrelevant for mapping purposes — mapping it wouldn't accomplish anything since no effects are rendered at that level. The user needs to map each individual tombstone model.

**UI treatment:**

The group does NOT appear in Needs Mapping. Only the individual models appear:

```
○  Tombstone 1    485px · Tombstone       💡 Tombstone 1 (92%)
○  Tombstone 2    485px · Tombstone       💡 Tombstone 2 (92%)
○  Tombstone 3    485px · Tombstone       💡 Tombstone 3 (92%)
○  Tombstone 4    485px · Tombstone       💡 Tombstone 4 (92%)
```

Optionally, a muted note at the top: "GROUP - ALL TOMBSTONES has no effects in this sequence — individual models shown instead."

---

## The Effect Tree

### Data Structure

Parsing the .xsq + rgbeffects.xml produces an **effect tree** for the source sequence:

```json
{
  "sequence": "abracadabra",
  "source_file": "Light_Show_2025.xsq",
  "effect_tree": {
    "groups_with_effects": [
      {
        "name": "GROUP - ALL TOMBSTONES",
        "type": "group",
        "has_effects": true,
        "effect_count": 12,
        "members": ["Tombstone 1", "Tombstone 2", "Tombstone 3", "Tombstone 4"],
        "members_with_individual_effects": ["Tombstone 1", "Tombstone 3"],
        "members_without_individual_effects": ["Tombstone 2", "Tombstone 4"],
        "scenario": "B"
      },
      {
        "name": "GROUP - ALL ARCHES",
        "type": "group",
        "has_effects": true,
        "effect_count": 24,
        "members": ["Arch-1", "Arch-2", "Arch-3", "Arch-4", "Arch-5", "Arch-6"],
        "members_with_individual_effects": [],
        "members_without_individual_effects": ["Arch-1", "Arch-2", "Arch-3", "Arch-4", "Arch-5", "Arch-6"],
        "scenario": "A"
      }
    ],
    "models_with_effects": [
      {
        "name": "Tombstone 1",
        "has_effects": true,
        "parent_group": "GROUP - ALL TOMBSTONES",
        "parent_has_effects": true,
        "needs_individual_mapping": true
      },
      {
        "name": "Spinner-Overlord",
        "has_effects": true,
        "parent_group": null,
        "parent_has_effects": false,
        "needs_individual_mapping": true
      }
    ],
    "models_without_effects": [
      "Tombstone 2", "Tombstone 4", "Unused-Prop-7", "Test-Model-3"
    ],
    "summary": {
      "total_models_in_layout": 214,
      "models_groups_with_effects": 47,
      "groups_needing_mapping": 10,
      "individual_models_needing_mapping": 12,
      "models_covered_by_groups": 35,
      "models_with_no_effects": 167,
      "effective_mapping_items": 22
    }
  }
}
```

### The Key Number: "Effective Mapping Items"

Instead of showing "214 source models" and overwhelming the user, the effect tree reduces this to the **effective mapping items** — the actual things that need to be matched:

```
Source: 214 models in layout → 22 need mapping (10 groups + 12 individual models)
```

That's a 90% reduction in the source panel. The user sees 22 meaningful items instead of 214.

---

## How This Changes the Source Panel

### Before (Current): All Models

```
┌─────────────────────────────────┐
│  Source Models                   │
│  214 available · 74 mapped       │
│                                  │
│  UNMAPPED (140)                  │  ← overwhelming
│  ⠿ Arch-1         ARCH    150px │
│  ⠿ Arch-2         ARCH    150px │
│  ⠿ Arch-3         ARCH    150px │
│  ... (137 more)                  │
└─────────────────────────────────┘
```

### After (Effect-Aware): Only Active Layers

```
┌──────────────────────────────────────────────┐
│  Source Models                                │
│  22 active layers in this sequence            │
│                                               │
│  GROUPS WITH EFFECTS (10)                     │
│  ⠿ GRP - All Tombstones   GROUP   4 models  │
│  ⠿ GRP - All Arches       GROUP   6 models  │
│  ⠿ GRP - All Spinners     GROUP   3 models  │
│  ⠿ GRP - Whole House      GROUP   all       │
│  ...                                          │
│                                               │
│  INDIVIDUAL MODELS (12)                       │
│  ⠿ Tombstone 1     TOMBSTONE    485px  ⚡    │
│  ⠿ Tombstone 3     TOMBSTONE    485px  ⚡    │
│  ⠿ Spinner-Overlord  SPINNER   1529px       │
│  ⠿ Matrix-P5         MATRIX    4800px       │
│  ...                                          │
│                                               │
│  ──────────────────────────────────────────── │
│  167 models in layout have no effects in      │
│  this sequence and don't need mapping.        │
└──────────────────────────────────────────────┘
```

The ⚡ icon on Tombstone 1 and 3 indicates "has individual effects AND belongs to a group with effects" (Scenario B) — these need attention even after the group is mapped.

---

## How This Changes the User's Layout Panel (Left Side)

### The Two-Tier Structure

The user's layout panel now organizes by mapping priority:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  GROUPS NEEDING MAPPING (4)                                              │
│  ─────────────────────────                                               │
│  These are where most effects live. Map these first.                     │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ ○  All Ghosts                     Group · 3 models                │  │
│  │    Source effects at group level only                              │  │
│  │    💡 GROUP - ALL GHOSTS (84%)    Maps 3 children automatically   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ ○  All Black Cats                 Group · 2 models                │  │
│  │    Source effects at group level + 1 individual                    │  │
│  │    💡 GROUP - ALL CATS (71%)      Maps 1 child; 1 needs own map   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  (2 more groups...)                                                      │
│                                                                          │
│  INDIVIDUAL MODELS NEEDING MAPPING (3)                                   │
│  ─────────────────────────────────────                                   │
│  These have their own effects beyond what groups cover.                   │
│                                                                          │
│  ○  Tombstone 1       485px · Tombstone  ⚡ has solo effects             │
│  ○  Vertical Matrix 2  160px · Matrix                                    │
│  ○  Ghost 2            75px · Ghost      ⚡ has solo effects             │
│                                                                          │
│  ▸ COVERED BY GROUPS (28 models)   ── already resolved ───  [expand]     │
│                                                                          │
│  ▸ HIGH CONFIDENCE (24)                                      [expand]    │
│  ▸ MED CONFIDENCE (15)                                       [expand]    │
│  ▸ LOW CONFIDENCE (35)                                       [expand]    │
│  ▸ SKIPPED (8)                                               [expand]    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key UX Details

**"Covered by Groups" section:** A new collapsed section that shows models which don't need individual mapping because their parent group is already mapped. This section appears once a group IS mapped and the child models move here. Shows a reassuring checkmark and greyed-out treatment.

**⚡ "Has solo effects" badge:** Marks individual models that belong to a mapped group BUT also have their own effects in the sequence. These can't be auto-resolved by group mapping; the user needs to handle them.

**Group row expansion:** Clicking a group row could expand to show its children inline, letting the user see what will be resolved:

```
┌────────────────────────────────────────────────────────────────────────┐
│ ▾  All Ghosts                          Group · 3 models               │
│    Source effects at group level only                                  │
│    💡 GROUP - ALL GHOSTS (84%)                                        │
│                                                                        │
│    Mapping this group resolves:                                        │
│    ┌──────────────────────────────────────────────────────────────┐    │
│    │  ✓  Ghost 1     75px · Ghost     no individual effects      │    │
│    │  ✓  Ghost 2     75px · Ghost     no individual effects      │    │
│    │  ✓  Ghost 3     75px · Ghost     no individual effects      │    │
│    └──────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

Versus Scenario B where some children still need attention:

```
┌────────────────────────────────────────────────────────────────────────┐
│ ▾  All Tombstones                      Group · 4 models               │
│    Source effects at group + 2 individual                              │
│    💡 GROUP - ALL TOMBSTONES (72%)                                    │
│                                                                        │
│    Mapping this group resolves:                                        │
│    ┌──────────────────────────────────────────────────────────────┐    │
│    │  ✓  Tombstone 2    485px       covered by group             │    │
│    │  ✓  Tombstone 4    485px       covered by group             │    │
│    │  ⚡ Tombstone 1    485px       has own effects — map below  │    │
│    │  ⚡ Tombstone 3    485px       has own effects — map below  │    │
│    └──────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Progress Bar: Weighted by Impact

### Current: Flat Count
```
74/85 mapped (87%)
```
Every model and group counts as 1. Mapping GROUP - ALL TOMBSTONES = 1 point, same as mapping one pixel stake.

### Proposed: Effect-Weighted Count

The progress bar should reflect **effective coverage** — how much of the sequence's effects are now accounted for in the user's layout.

```
Groups mapped: 8/10 — covering 32 child models
Individual models: 9/12
Effective coverage: 73/85 models receiving effects (86%)
```

Or simplified for the headline:

```
73 /85 covered
```

Where "covered" means "this model will receive effects from the sequence, either through direct mapping or group inheritance."

The segmented bar still shows confidence for directly-mapped items, but adds a new segment color for "covered by group":

```
  ████████████████████   ██████████████   ████████   ████   ░░░░░░░░
     32 via groups          24 high        15 med    12 low  2 unmapped
```

The "via groups" segment could use a distinct color — perhaps blue or a lighter green — to visually distinguish "resolved by inheritance" from "directly mapped with high confidence."

---

## Parsing the .xsq File

### What We Need From the .xsq

The .xsq file is an XML-based sequence file. We need to extract:

1. **Which layers have effects** — each model/group/submodel that has at least one effect in the timeline
2. **The layer hierarchy** — parent-child relationships (group → models → submodels)
3. **Render styles** — "Per Model" vs "Per Preview" on group layers (determines if the group mapping cascades to children)

### .xsq Structure (Simplified)

```xml
<xsequence>
  <head>
    <version>...</version>
    <timing>...</timing>
  </head>
  <ElementEffects>
    <Element name="GROUP - ALL TOMBSTONES" type="model">
      <EffectLayer>
        <Effect name="Chase" startTime="0" endTime="45000" ... />
        <Effect name="Shimmer" startTime="45000" endTime="80000" ... />
      </EffectLayer>
    </Element>
    <Element name="Tombstone 1" type="model">
      <EffectLayer>
        <Effect name="On" startTime="30000" endTime="32000" ... />
      </EffectLayer>
    </Element>
    <!-- Models with no effects simply don't appear here, -->
    <!-- or appear with an empty EffectLayer -->
  </ElementEffects>
</xsequence>
```

### Parsing Logic

```
1. Parse rgbeffects.xml → build full model/group/submodel tree with relationships
2. Parse .xsq → extract list of layer names that have ≥ 1 effect
3. Cross-reference:
   a. For each group with effects: identify which members also have effects
   b. Classify each group as Scenario A, B, or C
   c. For each model: determine if it has effects, if its parent group has effects
4. Build the effect tree with the scenario classification
5. Compute "effective mapping items" = groups with effects + individual models
   that either have no parent group OR have effects beyond their group
```

### Edge Cases

**Model in multiple groups:** A model can belong to multiple groups in xLights (e.g., `Arch-1` might be in `All Arches` and `Whole House`). If both groups have effects, both need mapping — but the individual model only needs one mapping. ModIQ should detect this and note it.

**"Whole House" group:** Almost every layout has a "Whole House" group that contains everything. This group frequently has effects (opening flash, blackout, full-display color wash). Mapping "Whole House" doesn't resolve individual model mappings because the effects are meant to overlay on top of individual effects. ModIQ should treat "Whole House" (and similar all-encompassing groups) as needing its own mapping but NOT auto-resolving children — the children likely have their own effects too.

**Detection heuristic for "all-encompassing" groups:**
- Group member count > 80% of total model count → likely a "Whole House" type
- Group name contains "whole", "all", "house", "everything", "full" → flag it
- These groups should be flagged: "This group covers most/all of your layout. Mapping it won't resolve individual models."

**Submodel effects:** The same A/B/C pattern applies at the submodel level. A spinner might have effects at the model level AND on individual arms/rings. The .xsq tells us which submodels have effects, so we can apply the same inheritance logic.

**Empty groups in the source:** If a group exists in the source layout but has zero effects in this sequence, it should NOT appear in the source panel. It's noise.

**Render style matters:** A group with effects rendered "Per Preview" (single buffer, one look across all members) behaves differently than "Per Model" (individual buffer per member). Both need group-level mapping, but "Per Model" is more common and is the case where group mapping truly cascades to children. ModIQ should parse render style from the rgbeffects.xml model group definition when available.

---

## The Vendor Sequence Upload Challenge

### The Problem

For Lights of Elm Ridge sequences, we have both the rgbeffects.xml (layout) and the .xsq (sequence), so we can build the full effect tree server-side. Easy.

For vendor sequences (the "Other Vendor" path), the user needs to upload BOTH files:
- The vendor's `xlights_rgbeffects.xml` — the layout (what models exist)
- The vendor's `.xsq` file — the sequence (which models have effects)

### UX for Vendor Upload

Update the "Other Vendor" upload path to request both files:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ○ Another Vendor's Sequence                                            │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                                                                 │    │
│  │   1. Drop the vendor's xlights_rgbeffects.xml                   │    │
│  │      (their layout — found in the vendor's show folder)         │    │
│  │                                                                 │    │
│  │   📁 vendor_rgbeffects.xml (1.8 MB) ✓ 142 models found         │    │
│  │                                                                 │    │
│  │   ─────────────────────────────────────────────────────────     │    │
│  │                                                                 │    │
│  │   2. Drop the vendor's sequence file (.xsq)                    │    │
│  │      (the actual sequence — found in the same folder)           │    │
│  │                                                                 │    │
│  │   📁 Abracadabra.xsq (4.2 MB) ✓ 47 active layers found        │    │
│  │                                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  Why both files?                                                        │
│  The layout tells us what models exist. The sequence tells us which     │
│  ones actually have effects — so we only ask you to map what matters.   │
└─────────────────────────────────────────────────────────────────────────┘
```

### IP / Competitive Concerns

Important: ModIQ only needs to parse the **structure** of the .xsq — which layers have effects and when. It does NOT need to read or store the actual effect parameters (colors, timing curves, render settings). The effect data itself is the vendor's IP; the layer structure is metadata.

**What we parse:**
- Layer names that have ≥ 1 effect
- Effect start/end times (to detect if a layer has meaningful content vs. a stray 0.1s effect)
- Render style on groups

**What we do NOT parse or store:**
- Effect type details (chase parameters, color values, etc.)
- The actual rendered output
- Any data that could reconstruct the sequence

**Privacy approach:**
- Vendor files are processed client-side or in a transient server session
- No vendor sequence data is stored after the mapping session ends
- The .xsq is used only to build the effect tree, then discarded
- Only anonymous aggregate mapping telemetry is retained (same as current spec)

This is defensible: we're using the structure of the file the same way xLights' own import dialog does — to know what needs mapping. We're just doing it smarter.

### Fallback: No .xsq Provided

If the user only uploads the rgbeffects.xml (they can't find the .xsq, or the vendor doesn't provide it), ModIQ falls back to the current behavior: flat model list, no effect awareness, no group intelligence. Still useful, just not as smart.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚠ No sequence file provided                                           │
│                                                                         │
│  Without the .xsq file, ModIQ can't tell which models have effects.    │
│  You'll see all 142 source models instead of just the active ones.      │
│                                                                         │
│  [ Continue without .xsq ]   [ Help me find the file ]                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Mapping Resolution Logic

### When a Group Is Mapped

```
User maps: their "All Ghosts" → source "GROUP - ALL GHOSTS"

ModIQ checks the effect tree for "GROUP - ALL GHOSTS":

IF Scenario A (group-only effects):
  → Mark all child models as "Covered by group"
  → Remove all children from Needs Mapping
  → Progress increases by (1 + number_of_children)

IF Scenario B (group + some individual effects):
  → Mark children WITHOUT individual effects as "Covered by group"
  → Keep children WITH individual effects in Needs Mapping
  → Add ⚡ badge to those children: "Has solo effects beyond group"
  → Progress increases by (1 + number_of_covered_children)

IF Scenario C (shouldn't happen — group has no effects):
  → Group shouldn't have been in Needs Mapping to begin with
  → This is a bug in the effect tree parser
```

### When an Individual Model Is Mapped

```
User maps: their "Tombstone 1" → source "Tombstone 1"

ModIQ checks:
  → Is this model's parent group already mapped? If yes, this was a ⚡ item
  → Mark as individually mapped
  → Progress increases by 1
```

### When a Group Mapping Is Cleared

```
User unmaps: their "All Ghosts" group

ModIQ checks:
  → Were any children auto-resolved by this group?
  → Move those children BACK to Needs Mapping (or to a limbo state)
  → If any children were individually mapped, those stay mapped
  → Progress decreases by (1 + number_of_previously_covered_children)
```

---

## Implementation Phases

### Phase 1: .xsq Parsing for Own Sequences

Start with Lights of Elm Ridge sequences where we control both files:
- Parse the .xsq files for Halloween and Christmas layouts
- Build the effect tree
- Filter the source panel to only show active layers
- This alone will dramatically reduce source panel noise

### Phase 2: Group Inheritance Logic

Add the Scenario A/B/C classification:
- Show groups with effects prominently
- Implement "Covered by group" resolution on mapping
- Add the two-tier (Groups / Individual Models) structure to Needs Mapping
- Update progress counting to reflect inheritance

### Phase 3: Vendor .xsq Upload

Extend the "Other Vendor" path to accept .xsq files:
- Client-side or server-side .xsq parsing
- Build effect tree for arbitrary vendor sequences
- Same group intelligence as Phase 2
- Fallback gracefully when .xsq isn't provided

### Phase 4: Submodel Effect Intelligence

Apply the same A/B/C logic at the submodel level:
- Spinner has effects at model level → arms/rings inherit
- Spinner has effects at model level AND on specific arms → flag those arms
- Submodels with no effects in the source → don't bother mapping them

---

## Impact Estimate

Based on the current screenshots (74/85 layout with 140 unmapped source models):

**Without effect awareness:**
- Source panel: 140+ items to scroll through
- Groups treated same as models — 6 of 11 unmapped rows were groups getting nonsense suggestions
- User has to figure out what matters themselves

**With effect awareness (estimated for a typical Halloween sequence):**
- Source panel: ~25-35 active layers (82% reduction)
- Groups shown with clear child resolution preview
- Needs Mapping reduced to ~5-8 items (groups + individual models with effects)
- Mapping 3-4 groups could resolve 20+ models instantly

This transforms ModIQ from "here's a list, good luck" to "here are the 8 things that matter, and mapping this one group handles 6 models at once."

---

## Open Questions

1. **Render style detection:** Can we reliably parse "Per Model" vs "Per Preview" from the rgbeffects.xml group definition? If not, should we default to assuming "Per Model" (the more common case)?

2. **"Whole House" detection:** What's the right heuristic for identifying all-encompassing groups that shouldn't auto-resolve children? Member count threshold? Name pattern? Both?

3. **Timing significance:** Should we ignore effects shorter than a threshold (e.g., < 0.5 seconds) when building the effect tree? A stray accidental effect shouldn't force a mapping requirement.

4. **Multiple sequences per .xsq:** Some .xsq files might contain multiple sequences or timing tracks. How do we handle this?

5. **Group nesting:** Can groups contain other groups in xLights? If so, the inheritance logic needs to be recursive.

6. **User override:** Should users be able to force "show all models" even with effect awareness, in case they want to remap something unusual?
