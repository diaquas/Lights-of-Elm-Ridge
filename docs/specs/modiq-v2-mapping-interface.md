# ModIQ V2: Mapping Interface & Manual Mapping UX

## The Perspective Flip

**V1 thinking:** "How much of our sequence layout did we successfully map?"
**V2 thinking:** "How much of THEIR layout now has effects coming in?"

This changes everything. The user doesn't care if our Arch-7 and Arch-8 are unmapped — they don't have those arches. They care that every one of THEIR models is receiving effects. The goal is 100% coverage of their display, not 100% coverage of ours.

**Implication for the UI:** Their layout is the primary list. Our source models are the available pool. The page is built around getting every row in THEIR list filled.

---

## What xLights Does (And Where It Falls Short)

The xLights import mapping dialog:
- Left column: YOUR models and groups (alphabetical)
- Right column: AVAILABLE source models (from the imported sequence)
- Middle: "Map To" column where you drag from right → left
- Drag a model name from the right list to the "Map To" cell
- Or highlight the cell and double-click an available model
- Mapped source models turn gray (but can still be reused)
- Can save/load .xmap files for reuse

**Where it earns that C+/B-:**
- No intelligence about what should map to what — just two raw lists
- No grouping, filtering, or type-based organization
- Alphabetical only — you're scanning a flat list of 50+ models looking for matches
- No pixel count, type, or position info visible — just names
- No visual indication of "how close" two models are
- Submodels buried inside expandable rows with no guidance
- No way to see what's left unmapped at a glance
- No learning — every import starts from scratch unless you saved an .xmap

**Our opportunity:** We've already auto-mapped 80%+ of their layout. Now make the remaining 20% as fast as possible, and make every correction feed back into making ModIQ smarter.

---

## Page Layout

### Overall Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ModIQ — Abracadabra → Your Layout                                       │
│  ████████████████████████████████░░░░  87% mapped (41 of 47 models)      │
│  38 high · 3 medium · 0 low · 6 unmapped                                │
│                                                                          │
│ ┌─ THEIR LAYOUT (left 65%) ──────────────┐ ┌─ AVAILABLE (right 35%) ──┐ │
│ │                                        │ │                          │ │
│ │  [Search/filter bar]                   │ │  [Search/filter bar]     │ │
│ │                                        │ │                          │ │
│ │  ▸ HIGH CONFIDENCE (38)   [collapse]   │ │  OUR UNMAPPED MODELS     │ │
│ │    mapped rows...                      │ │  (source models not yet  │ │
│ │                                        │ │   assigned to anything)  │ │
│ │  ▸ MEDIUM CONFIDENCE (3)  [collapse]   │ │                          │ │
│ │    mapped rows...                      │ │  Arch-7         150px    │ │
│ │                                        │ │  Arch-8         150px    │ │
│ │  ▾ UNMAPPED (6)           [expanded]   │ │  MiniTree-6     100px    │ │
│ │    empty rows = THE WORK TO DO         │ │  MiniTree-7     100px    │ │
│ │    drag targets here                   │ │  MiniTree-8     100px    │ │
│ │                                        │ │  Flood-3         3ch     │ │
│ │                                        │ │                          │ │
│ │                                        │ │  ─────────────────────── │ │
│ │                                        │ │  ALL SOURCE MODELS       │ │
│ │                                        │ │  (full list, searchable) │ │
│ │                                        │ │  Grayed if already used  │ │
│ │                                        │ │                          │ │
│ └────────────────────────────────────────┘ └──────────────────────────┘ │
│                                                                          │
│  [ Export .xmap ]    [ Start Over ]    [ Feedback: How did we do? ]       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Left Panel: Their Layout (Primary)

This is the star of the show. Every model in their layout appears here, organized by mapping status.

**Each row shows:**

```
┌──────────────────────────────────────────────────────────────────┐
│  ●● Their Model Name        →  Source Model Name        ✕  ↕   │
│     Arch · 150px · yard-left    Arch · 150px · yard-left        │
│                                                                  │
│  (if submodels exist, expandable arrow)                          │
│  ▸ 8 submodels mapped                                           │
└──────────────────────────────────────────────────────────────────┘
```

- **Confidence dot** (●● green, ●○ amber, ○○ red)
- **Their model name** (prominent, bold)
- **Arrow →** visual connector
- **Source model name** (what it's mapped to from our sequence)
- **✕ button** — clear this mapping (unmaps it, moves source model back to available pool)
- **↕ drag handle** — not for reordering, but indicates this row is a drop target
- **Metadata line** — type, pixel count, zone (for both sides)
- **Submodel expansion** — collapsible, shows submodel-level mapping

**UNMAPPED rows are the action items:**

```
┌──────────────────────────────────────────────────────────────────┐
│  ○  window_frame_garage      →  [ drag source here / click ▾ ]  │
│     Window Frame · 200px · garage                                │
│     ⚡ Suggested: Flood-3 (32% match) or skip                   │
└──────────────────────────────────────────────────────────────────┘
```

Unmapped rows have:
- A **drop zone** that accepts dragged source models from the right panel
- A **dropdown trigger** (▾) that opens a quick-pick menu of available source models, sorted by best match score
- A **suggestion line** — ModIQ's best guess even though it was below the confidence threshold, plus a "skip" option
- Visual treatment: slightly highlighted background (subtle red/amber tint) to draw the eye

**Skip option:** Not every model needs a mapping. If the user's layout has a prop type that doesn't exist in our sequence (e.g., they have a P10 matrix but our sequence doesn't use one), they should be able to mark it as "intentionally skipped" so it doesn't count against the completion percentage.

### Right Panel: Available Source Models

This is the pool of source models available for mapping.

**Two sections:**

**Section 1: Our Unmapped Models** (top, prominent)
Models from our sequence that haven't been assigned to anything yet. These are the most likely candidates for manual mapping.

```
┌──────────────────────────────┐
│  OUR UNMAPPED (6)            │
│                              │
│  ☰ Arch-7        150px Arch  │  ← draggable
│  ☰ Arch-8        150px Arch  │  ← draggable
│  ☰ MiniTree-6    100px Tree  │  ← draggable
│  ☰ MiniTree-7    100px Tree  │  ← draggable
│  ☰ MiniTree-8    100px Tree  │  ← draggable
│  ☰ Flood-3        3ch Flood  │  ← draggable
└──────────────────────────────┘
```

Each card is draggable. Drag handles (☰) visible. On hover, show full details (pixel count, type, zone, submodel count). Cards are color-coded by type (subtle type badges).

**Section 2: All Source Models** (below, scrollable, searchable)
The complete list for remapping. Models already assigned are shown grayed with a "(mapped to: their_model_name)" label. They can still be dragged to remap.

```
┌──────────────────────────────┐
│  ALL SOURCE MODELS           │
│  [🔍 Search...]   [Type ▾]  │
│                              │
│  ☰ Arch-1     150px  → mapped│
│  ☰ Arch-2     150px  → mapped│
│  ☰ Arch-3     150px  → mapped│
│  ...                         │
│  ☰ Arch-7     150px  (free)  │
│  ☰ Arch-8     150px  (free)  │
│  ☰ Spinner-Overlord   → mppd│
│  ...                         │
└──────────────────────────────┘
```

**Filter by type:** Dropdown that filters to Arches only, Spinners only, etc. This is huge when the user is looking for a specific type to map to.

**Search:** Type-ahead search that filters both model names and types.

---

## Interaction Patterns

### Pattern 1: Drag and Drop (Primary)

1. User grabs a source model card from the right panel (☰ drag handle)
2. Drags it to an unmapped row on the left
3. Drop zone highlights on hover (green border glow)
4. Release → mapping is created, row updates, progress bar advances
5. Source model moves from "unmapped" to "mapped" in the right panel (grays out)
6. Animation: smooth transition, card flies from right to left, settles into the row

**Drop targets must be generous.** The entire unmapped row is a valid drop target, not just a tiny cell. On mobile, the drop zones should be even larger.

### Pattern 2: Click-to-Map (Quick Pick)

For users who prefer clicking over dragging (many will, especially on laptops):

1. Click the ▾ dropdown on an unmapped row
2. A contextual menu appears showing available source models, **sorted by match score**
3. Best matches at the top with score indicators
4. User clicks one → mapped immediately

```
┌──────────────────────────────────────────┐
│  Best matches for "window_frame_garage": │
│                                          │
│  Flood-3          3ch    32% match       │
│  Arch-7           150px  12% match       │
│  MiniTree-6       100px   8% match       │
│  ──────────────────────────────────────  │
│  All available models...                 │
│  ──────────────────────────────────────  │
│  ⊘ Skip this model                      │
└──────────────────────────────────────────┘
```

### Pattern 3: Remap (Override Existing)

1. User clicks ✕ on a mapped row → clears the mapping
2. Source model returns to the available pool
3. Row reverts to unmapped state with drop zone
4. OR: user drags a different source model onto an already-mapped row
5. Confirmation tooltip: "Replace Arch-1 with Arch-7?" [Yes / No]
6. If yes: old source returns to pool, new source takes its place

### Pattern 4: Swap

1. User drags a source model from one mapped row and drops it on another mapped row
2. The two mappings swap
3. This is critical for position fixes — "these two arches are in the wrong order"

### Pattern 5: Multi-Select Mapping

For power users mapping several similar items at once:

1. Shift-click to select multiple unmapped rows on the left (e.g., 3 unmapped trees)
2. Then shift-click multiple source models on the right (e.g., 3 unmapped mini trees)
3. Click "Map Selected" → auto-maps them in order (spatial position or alphabetical)
4. A confirmation preview shows the proposed pairs before applying

### Pattern 6: Skip / Intentionally Unmapped

1. On an unmapped row, user clicks "Skip" (⊘ icon or from the dropdown)
2. Row changes to "Skipped" state — dimmed, moved to a collapsed "Skipped" section
3. Progress bar adjusts — skipped models don't count toward the total
4. Can be un-skipped at any time

---

## Submodel Mapping Detail

When a mapped row with submodels is expanded:

```
┌──────────────────────────────────────────────────────────────────────┐
│  ▾ My_Big_Spinner → Spinner-Overlord                                 │
│                                                                      │
│  Their Submodel          →  Our Submodel              Status         │
│  ──────────────────────────────────────────────────────────────       │
│  Arm_A (100px)           →  Arm1 (120px)              ●● auto        │
│  Arm_B (100px)           →  Arm2 (120px)              ●● auto        │
│  Arm_C (100px)           →  Arm3 (120px)              ●● auto        │
│  Arm_D (100px)           →  Arm4 (120px)              ●● auto        │
│  Arm_E (100px)           →  Arm5 (120px)              ●● auto        │
│  Arm_F (100px)           →  Arm6 (120px)              ●● auto        │
│  Ring_Outer (60px)       →  Ring1 (80px)              ●● auto        │
│  Ring_Mid (60px)         →  Ring2 (80px)              ●○ auto        │
│  Ring_Inner (60px)       →  Ring3 (80px)              ●● auto        │
│  Center (20px)           →  Center (49px)             ●● auto        │
│  (no equivalent)         ←  Arm7 (120px)              — skipped      │
│  (no equivalent)         ←  Arm8 (120px)              — skipped      │
│  (no equivalent)         ←  Ring4 (80px)              — skipped      │
│                                                                      │
│  [Remap Submodels ↻]                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

Submodel rows follow the same drag/drop/click patterns as top-level mapping. "Remap Submodels" button resets just the submodel mappings and lets the user redo them without touching the parent mapping.

---

## Progress Tracking

### Top Bar (Always Visible, Sticky)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ModIQ — Abracadabra → Your Layout                                       │
│  ██████████████████████████████████████████░░░  91% (43/47)              │
│  38 auto-high · 3 auto-medium · 2 manual · 4 remaining                  │
│                                                                          │
│  [ Export .xmap ↓ ]                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

- Progress bar fills as models are mapped (auto + manual)
- Counts update in real-time as user maps/unmaps/skips
- Export button is always accessible but shows a warning if unmapped models remain
- At 100%: celebratory state — "All models mapped! Ready to export."

### Export Warning (If < 100%)

```
┌─────────────────────────────────────────────────────────┐
│  4 of your models don't have a mapping yet.              │
│  These models will have no effects from this sequence.   │
│                                                          │
│  [ Export Anyway ]  [ Continue Mapping ]  [ Skip All ]   │
└─────────────────────────────────────────────────────────┘
```

"Skip All" marks remaining unmapped models as intentionally skipped and exports.

---

## Learning from Manual Mapping

### What We Capture

Every user action feeds back into ModIQ's knowledge base:

```json
{
  "session_id": "abc-123",
  "sequence": "abracadabra",
  "timestamp": "2025-10-15T19:42:00Z",
  "actions": [
    {
      "type": "remap",
      "their_model": {
        "name": "My_Spinner",
        "type": "Custom",
        "pixels": 1529,
        "display_as": "Custom",
        "submodels": ["Arm_A", "Arm_B", "Ring1", "Center"],
        "position": { "x": 0.48, "y": 0.12 }
      },
      "auto_mapped_to": "Arch-1",
      "user_mapped_to": "Spinner-Overlord",
      "confidence_was": 0.72,
      "reason_category": "wrong_type"
    },
    {
      "type": "manual_map",
      "their_model": {
        "name": "garage_panel",
        "type": "Custom",
        "pixels": 4800,
        "display_as": "Custom"
      },
      "auto_mapped_to": null,
      "user_mapped_to": "Matrix-P5",
      "reason_category": "unmapped_resolved"
    },
    {
      "type": "skip",
      "their_model": {
        "name": "P10_Video_Wall",
        "type": "Custom",
        "pixels": 12288
      },
      "reason_category": "no_equivalent_in_source"
    }
  ]
}
```

### Action Types to Track

| Action | What It Means | Training Signal |
|--------|--------------|-----------------|
| `auto_accepted` | User exported without changing this mapping | Positive confirmation of the algorithm |
| `remap` | User changed an auto-mapped pair | Negative signal for the algorithm + positive signal for the corrected pair |
| `manual_map` | User mapped a previously unmapped model | New mapping pattern ModIQ should learn |
| `swap` | User swapped two existing mappings | Usually a spatial/positional error — retrain position scoring |
| `skip` | User intentionally skipped a model | This model type likely has no equivalent — useful for "don't bother matching" patterns |
| `submodel_remap` | User changed a submodel mapping | Submodel structure correction — feed into answer key |
| `type_correction` | User corrected the detected model type | Name/type classification error — retrain name patterns |

### How This Feeds Back

**Short-term (per-session):** The corrections immediately improve the current mapping. Remapping Spinner→Spinner after the AI wrongly mapped it to an Arch fixes that export.

**Medium-term (aggregate patterns):** After 50+ sessions, we can identify:
- Model names that consistently get misclassified ("garage_panel" is always a matrix)
- Pixel counts that map to specific vendor products
- Submodel name patterns we missed
- Common skip patterns (P10 video walls, DMX fixtures rarely have equivalents)

**Long-term (algorithm tuning):** Aggregate data informs weight adjustments:
- If spatial matching causes the most swaps → increase spatial weight
- If name matching causes the most remaps → decrease name weight or improve normalization
- If pixel count matching causes type-crossing errors → add a minimum type-match gate

### Privacy-Respecting Data Collection

- Collect model metadata (names, types, pixel counts, positions) but NOT the full layout file
- Anonymize: no user identifiers attached to training data
- Opt-in: "Help improve ModIQ by sharing anonymous mapping data" checkbox on the export screen
- Clear disclosure: "We use anonymous mapping patterns to improve ModIQ for everyone"

---

## Keyboard Shortcuts (Power Users)

| Key | Action |
|-----|--------|
| `Tab` | Move to next unmapped row |
| `Enter` | Open quick-pick dropdown on focused unmapped row |
| `Esc` | Close dropdown / cancel drag |
| `S` | Skip focused unmapped row |
| `U` | Undo last action |
| `Ctrl+Z` | Undo (standard) |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Export .xmap |
| `/` | Focus search bar (right panel) |
| `?` | Show keyboard shortcut overlay |

---

## Mobile Considerations

Drag-and-drop is harder on mobile. Mobile interaction pattern:

1. Tap an unmapped row → opens the quick-pick dropdown (full screen on small devices)
2. Quick-pick sorted by match score, with search at top
3. Tap a source model → mapped
4. Swipe left on a mapped row → reveal "Clear" and "Swap" actions

The page should be fully functional on tablet (many users have an iPad near their xLights setup) but the primary target is desktop where they're running xLights.

---

## Comparison: xLights Mapping Dialog vs. ModIQ V2

| Feature | xLights | ModIQ V2 |
|---------|---------|----------|
| Auto-mapping | None (blank slate) | 80%+ pre-mapped with AI |
| Organization | Alphabetical only | Grouped by confidence, type filterable |
| Model info visible | Name only | Name, type, pixels, zone, submodel count |
| Suggested matches | None | Ranked suggestions on unmapped rows |
| Submodel guidance | None | Auto-mapped submodels with answer key |
| Progress tracking | None | Real-time progress bar with counts |
| Learning | None | Every correction improves future sessions |
| Interaction | Drag or double-click | Drag, click, dropdown, search, multi-select, keyboard |
| Spatial awareness | None | Zone-based matching, position-sorted |
| Export | .xmap | .xmap (same format, works in xLights) |
| Perspective | Source-centric | User-centric (their layout = 100%) |

ModIQ doesn't replace the xLights mapping dialog — it generates the .xmap that pre-fills it. But for the manual refinement step, ModIQ is strictly better because the user can see confidence scores, suggestions, and type information that xLights never shows.
