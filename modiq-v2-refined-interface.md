# ModIQ V2: Refined Interface Spec

Supersedes the mapping interface section of the previous V2 doc. This is the definitive layout.

---

## Input Form

### The Two-Path Decision

The user needs to answer two questions: **what are you mapping FROM?** and **what are you mapping TO?**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   ModIQ                                                                  │
│   Map smarter.                                                           │
│                                                                          │
│   ┌─ MAP FROM ──────────────────────────────────────────────────────┐    │
│   │                                                                 │    │
│   │  ○ A Lights of Elm Ridge Sequence                               │    │
│   │    ┌───────────────────────────────────────────────────────┐    │    │
│   │    │ Abracadabra — Steve Miller Band                   ▾   │    │    │
│   │    └───────────────────────────────────────────────────────┘    │    │
│   │    (Pre-selected if arriving from download history)             │    │
│   │                                                                 │    │
│   │  ○ Another Vendor's Sequence                                    │    │
│   │    ┌───────────────────────────────────────────────────────┐    │    │
│   │    │                                                       │    │    │
│   │    │   Drop the vendor's xlights_rgbeffects.xml here       │    │    │
│   │    │   or click to browse                                  │    │    │
│   │    │                                                       │    │    │
│   │    └───────────────────────────────────────────────────────┘    │    │
│   │                                                                 │    │
│   └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│   ┌─ MAP TO (Your Layout) ──────────────────────────────────────────┐    │
│   │  ┌───────────────────────────────────────────────────────┐      │    │
│   │  │                                                       │      │    │
│   │  │   Drop your xlights_rgbeffects.xml here               │      │    │
│   │  │   or click to browse                                  │      │    │
│   │  │                                                       │      │    │
│   │  │   📁 my_rgbeffects.xml (2.4 MB) ✓                     │      │    │
│   │  └───────────────────────────────────────────────────────┘      │    │
│   │                                                                  │    │
│   │  Where to find this: Your xLights show folder →                  │    │
│   │  xlights_rgbeffects.xml                                          │    │
│   └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│                     [ ModIQ It → ]                                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Behavior

**Radio button selection:**
- Default: "A Lights of Elm Ridge Sequence" is pre-selected
- When selected, the sequence dropdown is active and the vendor upload zone is disabled/dimmed
- Switching to "Another Vendor's Sequence" activates the vendor upload zone and disables the dropdown
- Only one path is active at a time — clean, no confusion

**Lights of Elm Ridge path:**
- Dropdown uses the three-tier structure (Your Sequences / Free / More) from the dropdown enhancement spec
- Selecting a sequence pre-loads the source layout from our API — zero upload needed on this side
- If arriving via URL param (`/modiq?sequence=abracadabra`), this is pre-selected and the dropdown is pre-filled

**Another Vendor path:**
- Upload zone accepts `xlights_rgbeffects.xml` from any xLights show folder
- This is the source layout — the sequence the user purchased from another vendor
- File validation: must be valid XML, must contain `<models>` elements
- After upload, show summary: "Found 52 models in source layout"

**Map To (always required):**
- Always a file upload — this is the user's own layout
- Same file type: `xlights_rgbeffects.xml`
- After upload, show summary: "Found 47 models in your layout"

**ModIQ It button:**
- Disabled until both sides have data (source selected/uploaded + user layout uploaded)
- On click → processing screen → results page

---

## Results Page Layout

### The Core Principle

**Unmapped models go at the top.** This is the work to do. Everything else is done and can be reviewed/collapsed.

The left panel is THEIR layout (the user's models). The right panel is the available pool of source models. The spatial relationship between the unmapped drop targets (top-left) and the draggable source cards (right) should be as tight as possible.

### Full Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ┌─ STICKY TOP BAR ───────────────────────────────────────────────────┐  │
│  │  ModIQ — Abracadabra → Your Layout                                 │  │
│  │  ██████████████████████████████████████░░░░  87% (41/47)           │  │
│  │  38 auto · 2 manual · 1 skipped · 6 remaining                     │  │
│  │                                                    [ Export ↓ ]    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ YOUR LAYOUT (left ~62%) ──────────┐  ┌─ SOURCE MODELS (right) ────┐ │
│  │                                    │  │                            │ │
│  │  [🔍 Filter...]  [Type ▾] [All ▾] │  │  [🔍 Search...]  [Type ▾] │ │
│  │                                    │  │                            │ │
│  │ ╔══════════════════════════════╗   │  │  UNMAPPED SOURCE (6)       │ │
│  │ ║  NEEDS MAPPING (6)          ║   │  │                            │ │
│  │ ║                              ║   │  │  ┌────────────────────┐   │ │
│  │ ║  ┌────────────────────────┐ ║   │  │  │ ☰ Arch-7    150px  │   │ │
│  │ ║  │ window_frame_garage    │ ║   │  │  │   Arch · yard-left │   │ │
│  │ ║  │ Window · 200px · garge │ ║   │  │  └────────────────────┘   │ │
│  │ ║  │ [drop here ▾]         │ ║   │  │  ┌────────────────────┐   │ │
│  │ ║  │ 💡 Best: Flood-3 32%  │ ║   │  │  │ ☰ Arch-8    150px  │   │ │
│  │ ║  └────────────────────────┘ ║   │  │  │   Arch · yard-right│   │ │
│  │ ║                              ║   │  │  └────────────────────┘   │ │
│  │ ║  ┌────────────────────────┐ ║   │  │  ┌────────────────────┐   │ │
│  │ ║  │ P10_Video_Wall         │ ║   │  │  │ ☰ MiniTree-6 100px│   │ │
│  │ ║  │ Matrix · 12288px       │ ║   │  │  │   Tree · yard-left │   │ │
│  │ ║  │ [drop here ▾]         │ ║   │  │  └────────────────────┘   │ │
│  │ ║  │ No close matches       │ ║   │  │  ┌────────────────────┐   │ │
│  │ ║  │           [ Skip ⊘ ]  │ ║   │  │  │ ☰ MiniTree-7 100px│   │ │
│  │ ║  └────────────────────────┘ ║   │  │  │   Tree · yard-ctr  │   │ │
│  │ ║                              ║   │  │  └────────────────────┘   │ │
│  │ ║  (4 more unmapped rows...)  ║   │  │  ┌────────────────────┐   │ │
│  │ ║                              ║   │  │  │ ☰ MiniTree-8 100px│   │ │
│  │ ╚══════════════════════════════╝   │  │  │   Tree · yard-right│   │ │
│  │                                    │  │  └────────────────────┘   │ │
│  │  ▸ MAPPED — High (38)  [expand]   │  │  ┌────────────────────┐   │ │
│  │                                    │  │  │ ☰ Flood-3     3ch │   │ │
│  │  ▸ MAPPED — Medium (3) [expand]   │  │  │   Flood            │   │ │
│  │                                    │  │  └────────────────────┘   │ │
│  │  ▸ SKIPPED (1)          [expand]  │  │                            │ │
│  │                                    │  │  ──────────────────────── │ │
│  │                                    │  │                            │ │
│  │                                    │  │  ALL SOURCE MODELS (42)   │ │
│  │                                    │  │  ┌────────────────────┐   │ │
│  │                                    │  │  │ Arch-1    mapped   │   │ │
│  │                                    │  │  │ Arch-2    mapped   │   │ │
│  │                                    │  │  │ ...                │   │ │
│  │                                    │  │  └────────────────────┘   │ │
│  │                                    │  │                            │ │
│  └────────────────────────────────────┘  └────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Left Panel Detail: Your Layout

### Section 1: NEEDS MAPPING (Always at Top, Expanded, Prominent)

This section has a distinct visual treatment — a subtle border or background tint that says "action required." It's always expanded and always at the top.

**Each unmapped row:**

```
┌─────────────────────────────────────────────────────────────────┐
│  window_frame_garage                                            │
│  Window Frame · 200px · garage-center                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  Drop a source model here    or    [ Pick match ▾ ]   │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                 │
│  💡 Best match: Flood-3 (32%)  ·  Skip this model ⊘             │
└─────────────────────────────────────────────────────────────────┘
```

**Drop zone is the full-width inner box.** Large, visible, impossible to miss. When a source card hovers over it, the border glows green and shows "Release to map."

**Pick match dropdown (▾):** Opens a contextual menu of available source models ranked by match score. Includes search. Includes "Skip" at the bottom.

**Best match suggestion:** If ModIQ has a guess (even low confidence), show it inline as a one-click option. "💡 Best match: Flood-3 (32%)" — click the name to instantly apply it.

**Skip link:** Right-aligned, subtle. Moves this model to the Skipped section.

### Section 2: MAPPED — High Confidence (Collapsed by Default)

These are done. The user doesn't need to see them unless they want to verify or remap.

**Collapsed header shows count and summary:**
```
▸ MAPPED — High Confidence (38 models)                         [expand]
```

**Expanded, each row:**

```
┌─────────────────────────────────────────────────────────────────┐
│  ●● DrivewayArch_L1          →  Arch-1                    ✕ ↻ │
│     Arch · 150px · yard-left     Arch · 150px · yard-left      │
│     ▸ No submodels                                              │
└─────────────────────────────────────────────────────────────────┘
```

- **✕** clears the mapping (returns source to pool, moves this row to Needs Mapping)
- **↻** opens the quick-pick dropdown to remap to a different source
- Row is draggable: user can drag a source card from the right panel onto it to replace
- Row-to-row drag between two mapped rows = swap

### Section 3: MAPPED — Medium Confidence (Collapsed)

Same layout as High, but with amber indicators. These might need the user's attention.

```
▸ MAPPED — Medium Confidence (3 models)  ⚠ review recommended  [expand]
```

### Section 4: SKIPPED (Collapsed)

Models the user intentionally marked as "no equivalent needed."

```
▸ SKIPPED (1 model)                                             [expand]
```

Each skipped row has an "Un-skip" button that moves it back to Needs Mapping.

---

## Right Panel Detail: Source Models

### Section 1: UNMAPPED SOURCE MODELS (Top)

Source models not yet assigned to anything. These are the draggable cards.

```
┌────────────────────────────┐
│  UNMAPPED SOURCE (6)       │
│                            │
│  ┌──────────────────────┐  │
│  │ ☰ Arch-7       150px │  │  ← grab ☰ to drag
│  │   Arch · yard-left   │  │
│  └──────────────────────┘  │
│                            │
│  ┌──────────────────────┐  │
│  │ ☰ Arch-8       150px │  │
│  │   Arch · yard-right  │  │
│  └──────────────────────┘  │
│                            │
│  ...etc                    │
└────────────────────────────┘
```

**Each card:**
- ☰ drag handle (left edge)
- Model name (bold)
- Pixel count (right-aligned)
- Type + zone (second line, muted)
- On hover: expand to show submodel count, additional metadata
- Cursor changes to grab hand on hover over the card

**As cards get mapped**, they animate out of this section (shrink + fade) and appear grayed in the All Source Models section below.

When this section reaches zero: "All source models mapped! 🎉" — replaced by a subtle confirmation.

### Section 2: ALL SOURCE MODELS (Below, Scrollable)

The full catalog for remapping. Searchable, filterable.

```
┌────────────────────────────────┐
│  ALL SOURCE MODELS (42)        │
│  [🔍 Search...]  [Type ▾]     │
│                                │
│  Arch-1     150px   → mapped   │  (grayed, shows target)
│  Arch-2     150px   → mapped   │
│  Arch-3     150px   → mapped   │
│  Arch-4     150px   → mapped   │
│  Arch-5     150px   → mapped   │
│  Arch-6     150px   → mapped   │
│  Arch-7     150px   (free)     │  (full color, draggable)
│  Arch-8     150px   (free)     │
│  ...                           │
│  Spinner-Overlord  1529px → m  │
│  ...                           │
└────────────────────────────────┘
```

- **Mapped models** are grayed with a "→ mapped to [name]" indicator. Still draggable — dragging a mapped source onto a different row will remap it (with confirmation).
- **Free models** are full color and draggable.
- **Type filter dropdown** filters to one category (Arches, Spinners, Trees, etc.)
- **Search** filters by name, type, pixel count

---

## Drag and Drop Mechanics

### Dragging a Source Card → Unmapped Row (Primary Action)

1. User grabs ☰ on a source card in the right panel
2. Card lifts and follows cursor (ghost preview with slight transparency)
3. Valid drop targets on the left highlight as user drags over them:
   - Unmapped rows: green border glow + "Release to map" tooltip
   - Mapped rows: amber border glow + "Release to remap (replaces [current])" tooltip
4. Dropping on an unmapped row: instant map — row fills in, card moves to mapped pool
5. Dropping on a mapped row: confirmation mini-dialog inline: "Replace [current source] with [new source]?" [Yes / No]
6. Dropping on invalid area: card snaps back to original position

### Dragging Between Two Mapped Rows (Swap)

1. User grabs the source model name from a mapped row on the left panel
2. Drags it onto another mapped row
3. Both rows highlight: "Swap these mappings?"
4. Drop → both mappings swap simultaneously
5. This handles the common "these two arches are in the wrong left/right order" case

### Drag Indicators

| State | Visual |
|-------|--------|
| Card idle | Subtle shadow, ☰ visible |
| Card grabbed | Lifts off page, slight scale up, higher shadow |
| Over valid unmapped target | Target row: green border, green background pulse |
| Over valid mapped target (remap) | Target row: amber border |
| Over invalid area | Red X cursor, card translucent |
| Card dropped successfully | Card shrinks into place, target row animates to filled state |

### Touch / Mobile

On touch devices, drag-and-drop is replaced by a tap flow:
1. Tap a source card → it becomes "selected" (highlighted border)
2. Tap an unmapped row → mapping created
3. To remap: tap a mapped row → "Change mapping" → source list appears → tap new source

---

## Manual Mapping Telemetry

Every user action is logged for retraining ModIQ:

### Event Schema

```json
{
  "event": "mapping_action",
  "session": "uuid",
  "sequence_slug": "abracadabra",
  "timestamp": "ISO-8601",
  "action": "drag_map | click_map | remap | swap | skip | unskip | submodel_remap | accept_suggestion | export",
  "source_model": {
    "name": "Arch-7",
    "type": "Arch",
    "pixels": 150,
    "position": { "x": 0.15, "y": 0.65 }
  },
  "target_model": {
    "name": "my_left_arch",
    "display_as": "Arches",
    "pixels": 150,
    "position": { "x": 0.12, "y": 0.70 }
  },
  "previous_mapping": null,
  "ai_confidence": 0.38,
  "ai_suggested": "Flood-3",
  "method": "drag_drop | dropdown_pick | suggestion_click | swap_gesture"
}
```

### Aggregate Metrics to Track

| Metric | What It Tells Us |
|--------|-----------------|
| % of auto-maps accepted without changes | Overall algorithm quality |
| Most common remap corrections | Where the algorithm fails by type |
| Most common swap corrections | Spatial matching failures |
| Most skipped model types | Props that rarely have equivalents |
| Avg time from page load to export | UX efficiency |
| % who use drag vs click vs suggestion | Which interaction pattern to optimize |
| Unmapped models manually mapped: what type pairs | New patterns to learn |

### Feedback Loop

After export, optional one-question survey:

```
┌─────────────────────────────────────────────────────┐
│  How was the auto-mapping?                           │
│                                                      │
│  😊 Great, barely changed anything                   │
│  😐 Okay, fixed a few things                         │
│  😕 Rough, had to fix a lot                          │
│                                                      │
│  [ Skip ]                                            │
└─────────────────────────────────────────────────────┘
```

This gives us a high-level quality signal alongside the granular telemetry.

---

## Export Flow

### Export Button (Sticky Top Bar)

Always visible. Shows state:

- **< 100% mapped:** "Export (6 unmapped)" — click triggers warning dialog
- **100% mapped:** "Export .xmap ✓" — click downloads immediately
- **100% with skips:** "Export .xmap (1 skipped)" — click downloads, skipped models noted in file

### Export Warning (If Unmapped Models Remain)

```
┌─────────────────────────────────────────────────────────────────┐
│  6 of your models don't have a mapping yet.                      │
│  These won't receive any effects from this sequence.             │
│                                                                  │
│  Unmapped: window_frame_garage, P10_Video_Wall,                  │
│            extra_tree_1, extra_tree_2, flood_back_L, flood_back_R│
│                                                                  │
│  [ Export Anyway ]   [ Skip All & Export ]   [ Keep Mapping ]    │
└─────────────────────────────────────────────────────────────────┘
```

- **Export Anyway:** Downloads with unmapped models left blank in the .xmap
- **Skip All & Export:** Marks all remaining unmapped as skipped, then downloads
- **Keep Mapping:** Closes dialog, returns to mapping

### Post-Export

```
┌─────────────────────────────────────────────────────────────────┐
│  ✓ Mapping exported!                                             │
│                                                                  │
│  modiq-abracadabra-mapping.xmap saved to your downloads.        │
│                                                                  │
│  How to import:                                                  │
│  1. Open xLights                                                 │
│  2. Open or create your sequence                                 │
│  3. File → Import Effects → select the purchased sequence file   │
│  4. In the mapping dialog, click "Load Mapping"                  │
│  5. Select the .xmap file you just downloaded                    │
│  6. Review and click OK                                          │
│                                                                  │
│  [ Download Again ]   [ Map Another Sequence ]                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  How was the auto-mapping?                               │     │
│  │  😊 Great   😐 Okay   😕 Rough              [ Skip ]    │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Help improve ModIQ: ☐ Share anonymous mapping data              │
└─────────────────────────────────────────────────────────────────┘
```
