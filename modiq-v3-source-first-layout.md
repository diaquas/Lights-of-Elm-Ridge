# ModIQ V3: Source-First Layout & Sequence Coverage Model

**Status:** Supersedes the V2 refined interface layout.  
**Depends on:** Effect-aware mapping spec (effect tree from .xsq parsing)

---

## The Final Perspective Flip

**V1:** "How much of our source layout did we map?" → Source-centric  
**V2:** "How much of their layout has effects coming in?" → User-centric  
**V3:** "How much of this sequence is accounted for in your layout?" → Sequence-centric

V2 was right to orient around the user's layout — but it overcorrected. Showing all 85 (or 340) of the user's models as the primary list creates clutter, because most of those models aren't part of the task. The task is defined by the **source sequence's effect tree** — the specific groups, models, and submodels that actually have effects. Once every one of those has a destination (or is skipped), the job is done.

The user's models aren't the task list. They're the **answer pool**.

---

## The New Mental Model

```
SOURCE SEQUENCE (the task)          YOUR LAYOUT (the answers)
━━━━━━━━━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━━━━━━━━━━━━━
"This sequence puts effects on      "Here are your models and
22 things. Where should each        groups. Drag them onto the
one go in your layout?"             source items to assign."

GROUP - ALL TOMBSTONES  → ?         All Tombstones ✓
GROUP - ALL ARCHES      → ?         All Arches ✓
GROUP - WHOLE HOUSE     → ?         Whole House ✓
Spinner-Overlord        → ?         My Big Spinner ✓
Tombstone 1 (solo fx)   → ?         Tombstone 1 ✓
Matrix-P5               → ?         Garage Panel ✓
...                                 ...

18/22 mapped = 82% of sequence covered
```

The progress question becomes: **what percentage of this sequence's effects have a place to land?** Not what percentage of the user's layout is covered. If the user has 200 extra models that aren't needed by this sequence, that's fine — they don't affect the score.

---

## Page Layout

### Overall Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ┌─ STICKY STATUS BAR ────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ModIQ   Abracadabra → Your Layout                     [ Export ↓ ]   │  │
│  │                                                                        │  │
│  │  18/22 sequence layers mapped                                          │  │
│  │  ██████████████████████████████████████████████████████████░░░░░░░░░░  │  │
│  │    8 groups        6 models         4 unmapped                         │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ SEQUENCE LAYERS (left ~60%) ─────────┐  ┌─ YOUR MODELS (right ~40%) ──┐ │
│  │                                       │  │                              │ │
│  │  The sequence puts effects on these   │  │  [🔍 Search...]  [Type ▾]   │ │
│  │  layers. Assign your models to each.  │  │                              │ │
│  │                                       │  │  BEST MATCHES (dynamic)      │ │
│  │  [🔍 Filter...]           [View ▾]   │  │  ┌────────────────────────┐  │ │
│  │                                       │  │  │ All Tombstones  GROUP  │  │ │
│  │  ┌─ NEEDS MAPPING ─────────────────┐ │  │  │ Tombstone 1     TOMB   │  │ │
│  │  │                                  │ │  │  │ Tombstone 2     TOMB   │  │ │
│  │  │  (source layers without a       │ │  │  └────────────────────────┘  │ │
│  │  │   destination yet — THE WORK)   │ │  │                              │ │
│  │  │                                  │ │  │  ALL YOUR MODELS (85)       │ │
│  │  └──────────────────────────────────┘ │  │  ┌────────────────────────┐  │ │
│  │                                       │  │  │ All Arches      GROUP  │  │ │
│  │  ▸ MAPPED (18)             [expand]  │  │  │ All Ghosts       GROUP  │  │ │
│  │                                       │  │  │ All Tombstones   GROUP  │  │ │
│  │  ▸ SKIPPED (0)             [expand]  │  │  │ Arch 1           ARCH   │  │ │
│  │                                       │  │  │ Arch 2           ARCH   │  │ │
│  │                                       │  │  │ ...                      │  │ │
│  │                                       │  │  └────────────────────────┘  │ │
│  └───────────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Left Panel: Sequence Layers (The Task List)

This is the star. Every item here represents a layer in the source sequence that has effects. The list is derived from the .xsq effect tree — not the full source layout. For a typical sequence, this might be 15–30 items instead of 140+.

### Section 1: NEEDS MAPPING (Expanded, Top, Prominent)

These are the source layers that don't yet have a destination in the user's layout. This is the actual work.

**Two tiers within Needs Mapping:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ● NEEDS MAPPING  4                                              ˅      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  GROUPS (2)                                                              │
│  These carry the most effects. Map these first.                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ○  GRP - ALL TOMBSTONES              12 effects · 4 members      │  │
│  │     Group-only effects (Scenario A)                                │  │
│  │     Mapping this resolves: Tombstone 1, 2, 3, 4                   │  │
│  │                                                                    │  │
│  │     ┌─────────────────────────────────────────────────────────┐    │  │
│  │     │  Drop one of your groups or models here                 │    │  │
│  │     └─────────────────────────────────────────────────────────┘    │  │
│  │     💡 Your "All Tombstones" (84%)                                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ○  GRP - WHOLE HOUSE                  4 effects · all models     │  │
│  │     Overlay group — won't resolve children                        │  │
│  │                                                                    │  │
│  │     ┌─────────────────────────────────────────────────────────┐    │  │
│  │     │  Drop one of your groups or models here                 │    │  │
│  │     └─────────────────────────────────────────────────────────┘    │  │
│  │     💡 Your "Whole House" (91%)                                   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  INDIVIDUAL MODELS (2)                                                   │
│  These have effects not covered by a group.                              │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ○  Spinner-Overlord        1529px · Spinner · 18 effects         │  │
│  │                                                                    │  │
│  │     ┌─────────────────────────────────────────────────────────┐    │  │
│  │     │  Drop one of your groups or models here                 │    │  │
│  │     └─────────────────────────────────────────────────────────┘    │  │
│  │     💡 Your "My Big Spinner" (76%)                                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ○  Matrix-P5               4800px · Matrix · 6 effects           │  │
│  │                                                                    │  │
│  │     ┌─────────────────────────────────────────────────────────┐    │  │
│  │     │  Drop one of your groups or models here                 │    │  │
│  │     └─────────────────────────────────────────────────────────┘    │  │
│  │     No close matches — consider skipping                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Anatomy of an Unmapped Source Layer Row

**Group row (expanded view):**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ○  GRP - ALL TOMBSTONES              12 effects · 4 members            │
│     ├─ Tombstone 1                                                       │
│     ├─ Tombstone 2                    Group-only effects                 │
│     ├─ Tombstone 3                    Mapping resolves all 4 children    │
│     └─ Tombstone 4                                                       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  Drop one of your groups here, or click to pick a match          │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  💡 Your "All Tombstones" (84%)    · Skip ⊘                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key details:**
- **Effect count** shown inline ("12 effects") — tells the user how much content this layer carries. A group with 30 effects is more important to map than one with 2.
- **Member list** visible (collapsible) so the user sees what models are in this group. Helps them match to their own group with similar members.
- **Scenario label** ("Group-only effects" / "Group + 2 individual" / etc.) tells the user what mapping this will accomplish.
- **"Resolves all 4 children"** — the cascade preview. The user knows that one action handles 5 items (the group + 4 children).

**Individual model row (compact):**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ○  Spinner-Overlord        1529px · Spinner · 18 effects               │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  Drop one of your models here, or click to pick a match          │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  💡 Your "My Big Spinner" (76%)    · Skip ⊘                             │
└──────────────────────────────────────────────────────────────────────────┘
```

**Scenario B: Group with some individual children that need mapping:**

When a group is Scenario B, mapping the group auto-resolves some children but others need individual mapping. After the user maps the group, the remaining children with individual effects appear as new items in Needs Mapping:

```
Before mapping the group:
  ○  GRP - ALL TOMBSTONES   (12 effects · 4 members · group + 2 individual)

After mapping the group:
  ✓  GRP - ALL TOMBSTONES → Your "All Tombstones"   (moved to Mapped section)
  ✓  Tombstone 2 — covered by group                  (moved to Mapped section)
  ✓  Tombstone 4 — covered by group                  (moved to Mapped section)
  ○  Tombstone 1 — ⚡ has 3 solo effects              (NEW in Needs Mapping)
  ○  Tombstone 3 — ⚡ has 1 solo effect               (NEW in Needs Mapping)
```

The Needs Mapping count briefly goes up by 2 (new individual items) but goes down by 1 (mapped group) and the progress bar reflects that the group and 2 children are now covered. Net progress is forward, and the remaining items are clearly labeled as "these appeared because the source has individual effects on them beyond the group."

**Messaging to prevent confusion when new items appear:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ✓ Mapped GRP - ALL TOMBSTONES → Your "All Tombstones"                  │
│    Resolved Tombstone 2 and Tombstone 4 (group-only effects)            │
│                                                                          │
│  ⚡ 2 members have their own effects beyond the group:                   │
│     Tombstone 1 (3 solo effects) and Tombstone 3 (1 solo effect)        │
│     These still need individual mapping below.                           │
└──────────────────────────────────────────────────────────────────────────┘
```

This could appear as a brief toast/banner or as context within the Mapped section when the group row is expanded.

### Section 2: MAPPED (Collapsed by Default)

Source layers that have been assigned a destination.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ● MAPPED  18  (82%)                                             ˅      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  GROUPS (8)                                                              │
│                                                                          │
│  ● GRP - ALL ARCHES          → Your "All Arches"         6 resolved     │
│  ● GRP - ALL SPINNERS        → Your "Spinner Group"      3 resolved     │
│  ● GRP - ALL TOMBSTONES      → Your "All Tombstones"     2 resolved ⚡2 │
│  ● GRP - WHOLE HOUSE         → Your "Whole House"        overlay        │
│  ...                                                                     │
│                                                                          │
│  INDIVIDUAL MODELS (6)                                                   │
│                                                                          │
│  ● Tombstone 2               → (covered by group)                        │
│  ● Tombstone 4               → (covered by group)                        │
│  ● Bat-Right                 → Your "Bat Right"                          │
│  ● Bat-Left                  → Your "Bat Left"                           │
│  ...                                                                     │
│                                                                          │
│  RESOLVED BY INHERITANCE (14 models)                                     │
│  ● Arch-1 through Arch-6     → covered by GRP - ALL ARCHES              │
│  ● Spinner 1-3               → covered by GRP - ALL SPINNERS            │
│  ● Tombstone 2, 4            → covered by GRP - ALL TOMBSTONES          │
│  ...                                                                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

The "Resolved by inheritance" subsection shows models that were auto-covered by group mappings. This gives the user confidence that mapping the group actually accomplished something — they can see the cascade. Each row links back to the parent group mapping that resolved it.

### Section 3: SKIPPED (Collapsed)

Source layers the user decided to skip. Same as current spec.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ○ SKIPPED  2                                                    ˅      │
├──────────────────────────────────────────────────────────────────────────┤
│  ⊘ Matrix-P5          4800px · Matrix      (no equivalent in your layout)│
│  ⊘ DMX Fogger         3ch · DMX            (no equivalent in your layout)│
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Right Panel: Your Models (The Answer Pool)

The user's models and groups, available for dragging onto source layers. This panel is the "shelf" they pick from.

### Dynamic "Best Matches" Section

When the user hovers over or focuses an unmapped source layer on the left, the right panel updates to show the best matches from their layout for THAT specific item at the top. This creates a dynamic, contextual relationship between the panels.

```
┌────────────────────────────────────────────┐
│  Your Models                                │
│  85 models · 12 groups                      │
│                                             │
│  [🔍 Search...]                             │
│  [All Types                          ▾]    │
│                                             │
│  ┌─ BEST MATCHES ────────────────────────┐ │
│  │  for: GRP - ALL TOMBSTONES            │ │
│  │                                        │ │
│  │  ⠿ All Tombstones    GROUP   4 mbr 84%│ │  ← drag this
│  │  ⠿ Tombstones Yard   GROUP   3 mbr 62%│ │  ← or this
│  │  ⠿ Tombstone 1       TOMB   485px  41%│ │  ← individual match
│  └────────────────────────────────────────┘ │
│                                             │
│  GROUPS (12)                                │
│  ⠿ All Arches          GROUP   6 models   │
│  ⠿ All Bats            GROUP   2 models   │
│  ⠿ All Black Cats      GROUP   2 models   │
│  ⠿ All Ghosts          GROUP   3 models   │
│  ⠿ All Props           GROUP   all        │
│  ⠿ All Spinners        GROUP   3 models   │
│  ⠿ All Tombstones      GROUP   4 models ✓ │  ← already used
│  ⠿ Ghost Eyes Mouth    GROUP   3 models   │
│  ⠿ Whole House         GROUP   all        │
│  ...                                        │
│                                             │
│  MODELS (85)                                │
│  ⠿ Arch 1             ARCH    150px       │
│  ⠿ Arch 2             ARCH    150px       │
│  ⠿ Bat Left           BAT      30px   ✓  │  ← already used
│  ⠿ Bat Right          BAT      30px   ✓  │
│  ...                                        │
│                                             │
│  ▸ ALREADY ASSIGNED (18)        [expand]   │
└────────────────────────────────────────────┘
```

### Key Details

**Best Matches section:**
- Dynamically updates based on which source layer is focused/hovered on the left
- Shows top 3-5 matches from the user's layout ranked by match score
- Includes both groups and individual models (a group might be the best match for a source group)
- Match percentage shown for each
- When no source layer is focused, this section shows a neutral state: "Click a source layer to see matches"

**Groups section:**
- Shown before individual models — groups are higher-leverage mapping targets
- Each shows member count instead of pixel count
- Checkmark (✓) or greyed state if already assigned to a source layer
- Still draggable even if assigned (for remapping)

**Models section:**
- Standard model list: name, type badge, pixel count
- Same checkmark/grey treatment if assigned
- Searchable and type-filterable

**Already Assigned section (collapsed):**
- Models and groups that have been dragged onto source layers
- Shows where they went: "All Tombstones → GRP - ALL TOMBSTONES"
- Draggable for remapping

### Right Panel Behavior

**On focus/hover of a left panel item:**
1. Best Matches section updates instantly (no loading delay — computed client-side)
2. In the full model list, matching models get a subtle highlight (faint green border) so they're visible even while scrolling
3. Non-matching models don't change — they stay available for manual selection

**On search:**
- Filters all sections (Best Matches, Groups, Models)
- Typing "tomb" shows All Tombstones group + individual Tombstone models
- Typing "spinner" shows spinner groups + spinner models

**On type filter:**
- Filters to one type across all sections
- Useful when the source layer is a spinner and the user wants to see only their spinners

---

## Interaction Patterns (Updated for V3 Layout)

### Primary: Drag from Right → Drop on Left

User grabs a model/group from the right panel and drops it onto an unmapped source layer on the left.

```
1. User sees "GRP - ALL TOMBSTONES" needs mapping (left panel)
2. Right panel shows "All Tombstones" as best match
3. User grabs "All Tombstones" from right panel
4. Drags it to the drop zone on "GRP - ALL TOMBSTONES"
5. Drop zone glows green on hover
6. Release → mapping created
7. Source layer moves to Mapped section
8. If Scenario A: child models auto-resolve, progress jumps
9. Right panel: "All Tombstones" moves to Already Assigned
```

**This is the opposite drag direction from V2.** In V2, the user dragged source models FROM the right TO their layout on the left. Now they drag their models FROM the right TO the source layers on the left. The direction is the same physically (right → left), but the semantics are flipped: the left panel is now the "task" receiving assignments, not the user's layout receiving source mappings.

### Secondary: Click to Pick from Popover

Same as V2 — click an unmapped row, popover opens with the user's models ranked by match. The popover content is essentially the Best Matches section in expanded form.

### Tertiary: One-Click Suggestion

The 💡 suggestion pill on each unmapped row. Click it → instant mapping using the best match. Same as V2.

### Skip

Click ⊘ on a source layer → moves to Skipped. Same as V2.

---

## Status Bar: Sequence Coverage

### The New Headline Metric

```
18/22 sequence layers mapped
```

This replaces "74/85 mapped" (which counted user models). The denominator is now **the number of source layers with effects**, and the numerator is how many have been assigned a destination.

### Counting Rules

```
Mapped:
  - Each group mapped directly             = 1
  - Each individual model mapped directly   = 1
  - Each model covered by group inheritance = 1 (counts toward total but not
    shown as a separate "mapped" item — rolled into the group's count)

Skipped:
  - Removed from the denominator entirely. If 22 layers exist and
    2 are skipped, the bar shows X/20 instead of X/22.
    (Skipped items don't count against you.)

Unmapped:
  - Layers with no assignment yet
```

### Bar Visualization

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ModIQ   Abracadabra → Your Layout                      [ Export ↓ ]    │
│                                                                          │
│  18/22 sequence layers mapped                                            │
│                                                                          │
│  ██████████████████████████████████████████████████████░░░░░░░░░░░░░░░  │
│     8 groups (covering 26 models)    6 direct     4 unmapped             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Segment Breakdown

| Segment | Color | What it counts |
|---------|-------|---------------|
| Groups | Blue-green (#2dd4bf, teal) | Source groups mapped, with note of how many children resolved |
| Direct | Green (#22c55e) | Individual source models mapped directly (not via group inheritance) |
| Unmapped | Dark gray (#333) | Source layers still needing assignment |

**Why not High/Med/Low confidence segments?**

In V2, confidence was about how good the auto-match was. In V3, the task is clearer: either a source layer is mapped or it isn't. Confidence still matters for the auto-suggestion quality, but the status bar should show **coverage**, not match quality. Confidence can live in the expanded Mapped section where users review individual pairings.

### Label Details

**"8 groups (covering 26 models)"** — this is the cascade callout. The user mapped 8 groups and that resolved 26 child models. This number is the payoff of effect-aware mapping — without it, they'd have had to map 34 items (8 groups + 26 models) individually.

**"6 direct"** — individual model mappings. These are either Scenario C models (no group effects) or Scenario B children that had individual effects.

**"4 unmapped"** — the remaining work.

### At 100% Coverage

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ModIQ   Abracadabra → Your Layout                      [ Export ✓ ]    │
│                                                                          │
│  22/22 sequence layers mapped — full coverage!                           │
│                                                                          │
│  ██████████████████████████████████████████████████████████████████████  │
│     10 groups (covering 32 models)    12 direct    0 skipped             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

Export button goes solid green. Celebratory state. The "covering 32 models" number shows the user how much leverage they got from group mapping.

### With Skips

```
18/20 sequence layers mapped   (2 skipped)
```

Skipped items are removed from the denominator. The user skipped Matrix-P5 and DMX Fogger because they don't have equivalents. So it's 18 out of 20 remaining, not 18 out of 22. The skip count is noted parenthetically.

---

## The Flow: From Upload to Export

### Step 1: Input (unchanged from V2)

User picks source (Elm Ridge sequence or vendor upload) and uploads their layout.

**Updated for .xsq awareness:** If vendor path, also request the .xsq file. If Elm Ridge path, .xsq is loaded from our backend automatically.

### Step 2: Processing

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ModIQ is working...                                                     │
│                                                                          │
│  ✓ Parsing your layout — 85 models found                                │
│  ✓ Parsing sequence — 22 active layers (10 groups, 12 models)           │
│  ✓ Analyzing effect placement (8 group-only, 1 group+individual, 3 ind) │
│  ✓ Matching against your layout                                          │
│  ✓ Generating optimal mapping                                            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**New line:** "Analyzing effect placement" — this is the .xsq parsing step that classifies groups into Scenarios A/B/C. Surfacing this step tells the user we're doing something smart, not just name-matching.

### Step 3: Results (V3 Layout)

The page described in this spec. Source layers on the left, user's models on the right.

**Auto-mapping is applied before the page loads.** ModIQ has already matched what it could. The Needs Mapping section only shows items where it couldn't find a confident match. If auto-mapping was great, the user might land on "20/22 mapped" with only 2 items to handle.

### Step 4: Manual Mapping

User works through Needs Mapping items:
- Drag from right to left
- Click suggestions
- Skip items without equivalents
- Review Mapped section if desired

### Step 5: Export

Same as V2: .xmap file download, with the addition of group mapping data. The .xmap format needs to include group-level mappings so xLights applies them correctly.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ✓ Mapping exported!                                                     │
│                                                                          │
│  modiq-abracadabra-mapping.xmap saved to your downloads.                │
│                                                                          │
│  Coverage: 22/22 layers — full sequence coverage                         │
│  Groups mapped: 10 (resolved 32 child models)                            │
│  Direct model maps: 12                                                   │
│  Skipped: 0                                                              │
│                                                                          │
│  [ Download Again ]   [ Map Another Sequence ]                           │
│                                                                          │
│  How was the auto-mapping?                                               │
│  😊 Great   😐 Okay   😕 Rough                            [ Skip ]       │
│                                                                          │
│  Help improve ModIQ: ☐ Share anonymous mapping data                      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases

### User's Layout Has No Equivalent Group

Source has "GRP - ALL TOMBSTONES" but the user doesn't have a tombstone group — they just have individual tombstone models.

**Handling:** The suggestion engine should detect this and suggest: "No matching group found. You can map individual models instead:" and show the user's tombstone models as possible matches. Alternatively, the user can create a group mapping on the fly: "Map to Tombstone 1, 2, 3, 4 as a virtual group" (this would create individual mappings for each member under the hood).

Or simpler: the user skips the group and maps the individual Tombstone models from the source's member list.

### Source Has "Whole House" Overlay Group

As discussed in the effect-aware spec: "Whole House" groups contain all or most models and their effects are overlays (opening flash, full-display wash). Mapping this group does NOT auto-resolve children because the children have their own effects too.

**Detection:** Group member count > 80% of total, or name matches "Whole House" / "All Props" / "Everything" patterns.

**UI treatment:** Show in Groups tier but with a note: "Overlay group — maps as a layer over all models. Children still need their own mapping."

### User Has More Models Than Source Layers

Very common — user has 85 models, source only has 22 active layers. This is expected and fine. The right panel should not make the user feel like those extra models are "unmatched" — they're just not needed for this sequence.

No "unmatched user models" warning. No red indicators on user models that aren't assigned to anything. They're just available and unused.

### Source Has More Active Layers Than User Has Models

Less common but possible — a very large source layout with effects on 60+ layers, user has a small 30-model display. Many source layers won't have matches.

**Handling:** The Skip action becomes prominent. ModIQ should be smart about auto-suggesting skips for source layers where no reasonable match exists (e.g., source has 6 arches but user only has 2 — after 2 are mapped, suggest skipping the remaining 4).

### User Wants to Map a Model That's Already Assigned

User drags "Tombstone 1" to a new source layer, but it's already assigned to a different source layer.

**Handling:** Confirmation dialog: "Tombstone 1 is currently mapped to [source layer X]. Move it to [source layer Y] instead?" [Move / Cancel]. If moved, source layer X becomes unmapped again.

---

## Comparison: V2 vs V3

| Aspect | V2 (User-Centric) | V3 (Sequence-Centric) |
|--------|-------------------|----------------------|
| Left panel | User's layout (all models) | Source sequence layers (active only) |
| Right panel | Source models (all) | User's models and groups |
| Task list | User's unmapped models | Source unmapped layers |
| Progress metric | % of user's layout mapped | % of sequence layers covered |
| Denominator | User's model count (85, 340, etc.) | Active source layers (22, 35, etc.) |
| Group handling | Flat alongside models | First-class tier with inheritance |
| Source list size | Full layout (140+) | Effect tree only (22-35) |
| Drag direction | Source (right) → user layout (left) | User models (right) → source layers (left) |
| "Done" definition | All user models have a source | All source effects have a destination |
| Leverage feeling | Incremental (1 map = 1 model) | Multiplicative (1 group = 5+ models) |

The semantic shift: **V2 asks "does your layout have everything it needs?" V3 asks "does this sequence have everywhere it needs to go?"** V3 is the right question — the user bought a sequence and wants it to work. They don't care about their extra models.
