# ModIQ V3: Export-Time Coverage Boost — "Lonely Groups" Prompt

**Status:** Addendum to V3 source-first layout spec.  
**Depends on:** Many-to-one mapping spec, effect-aware mapping spec.

---

## The Insight

V3 defines "done" as full **sequence coverage** — every source layer has a destination. But full sequence coverage doesn't mean full **display coverage**. The user might hit 22/22 mapped while half their physical display sits dark because those models weren't needed by the source sequence.

The user doesn't always realize this. They see 100%, they hit Export, they load the sequence in xLights, and... their 6 arches do nothing. Their spinning tree is black. Their mega-matrix just sits there. The sequence technically *works* — but their display looks half-empty.

We already have the mechanism to fix this: **many-to-one mapping**. A source layer can feed multiple user models. If the source has a group of spinners and the user mapped it to their spinner group, there's nothing stopping us from *also* pointing it at their arches group. Same effects, more coverage. The user's display fills out.

The question is when to surface this. Doing it during the main mapping flow would be distracting — the user is focused on the task list, and those extra groups aren't part of the task. But at export time? That's the perfect moment. The work is done, the user is about to commit, and we can say: *"Before you go — your display could look even fuller."*

---

## When It Triggers

The export-time coverage boost activates when **all three conditions** are met:

1. **The user clicks Export** (sequence coverage is 100%, or they're exporting with skips)
2. **There are unmapped user groups** — groups in the user's layout that have zero assignments to any source layer
3. **At least one of those groups has a reasonable match** to an already-mapped **source group** (match score ≥ 70%)

If condition 3 fails — no unmapped user group has a strong enough structural match — the prompt doesn't appear. We'd rather skip the prompt entirely than show weak suggestions that erode trust.

### What Counts as an "Unmapped User Group"

A user group is unmapped if it has never been dragged onto any source layer during this session. This includes groups that:

- Were never relevant to the sequence's task list (user has "All Arches" but the source had no arch group effects)
- Were available in the right panel the whole time but never used
- Had their assignment removed by the user during the session

We specifically target **groups** rather than individual models because:

- Groups have the highest leverage — mapping one group lights up 3–10 physical models
- A dark group is more noticeable than a dark individual model in the actual display
- Suggesting 3 groups is digestible; suggesting 15 individual models is overwhelming
- Groups are likely to be *types* the user cares about (their arches, their spinners, their trees)

### Group-to-Group Only

Both sides of the equation must be groups. We only suggest mapping an unmapped **user group** to an already-mapped **source group**. No model-to-group, no group-to-model.

Why: groups are designed as multi-model containers with render styles ("Per Model," "Per Preview") that make effects look right across multiple children. A source group's effects were authored for that kind of rendering. Pointing a user group at a source group is structurally sound — the effect distribution patterns translate naturally. Pointing a user group at a single source model is a gamble on how xLights stretches single-model effects across group members. Keep it simple, keep it reliable.

---

## Display Coverage Metric

### The Second Metric

When the user clicks Export, a **display coverage** number appears for the first time alongside the existing sequence coverage metric. This number answers a different question than the main mapping flow:

- **Sequence coverage** (the main flow): "What percentage of the *source sequence's* effects have a place to land?"
- **Display coverage** (export-time only): "What percentage of *your physical display* will receive effects?"

### How It's Calculated

Display coverage counts at the **group level**. A user group is "covered" if it has at least one mapping — either directly or because it was used as a destination during the main mapping flow. All member models within a covered group are counted as covered.

```
User's layout:
  All Arches      (6 models)  → mapped to GRP - ALL ARCHES        ✓ covered
  All Tombstones  (4 models)  → mapped to GRP - ALL TOMBSTONES    ✓ covered
  All Spinners    (5 models)  → mapped to GRP - ALL SPINNERS      ✓ covered
  All Pumpkins    (3 models)  → not mapped to anything             ✗ uncovered
  All Trees       (2 models)  → not mapped to anything             ✗ uncovered
  Whole House     (all)       → mapped to GRP - WHOLE HOUSE       ✓ covered

Display coverage: covered groups contain 15 models, uncovered contain 5
  → 15/20 models receiving effects = 75% display coverage
```

**The key rule: if the group is covered, every model in it is covered.** The user doesn't need to have individually mapped Tombstone 1, Tombstone 2, etc. — if "All Tombstones" is mapped, those 4 models count. This means a user who maps all their groups to source groups can hit 100% display coverage even if zero individual models have direct mappings.

Conversely, an individual model that belongs to a covered group but has no direct mapping is still counted as covered through its group. An individual model that belongs to NO group and has no mapping is uncovered — but we don't surface these in the boost prompt (groups only).

### Where It Appears

Display coverage shows up in two places, both at export time only:

**1. In the export confirmation / boost prompt header:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Sequence coverage: 22/22 ✓                                                 │
│  Display coverage:  75%  — 5 models in 2 groups won't receive effects       │
│                                                                              │
│  Want to fill in the gaps?                                                   │
│  ...                                                                         │
```

**2. In the final export summary (after boost decisions):**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ✓ Mapping exported!                                                         │
│                                                                              │
│  Sequence coverage: 22/22 — full                                             │
│  Display coverage:  100%  — every group in your layout receives effects      │
│  ...                                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Why Not Show It During Mapping

Display coverage is deliberately hidden during the main mapping flow. During mapping, the user's mental model is "I'm working through the source sequence's task list." Introducing a second progress metric would create confusion: "Wait, am I trying to get sequence coverage to 100% or display coverage to 100%?" The answer is sequence coverage first — it's the primary task. Display coverage is a bonus metric that only becomes relevant once the primary task is done.

Showing it at export time creates a clean narrative: "You finished the main job (sequence coverage). Here's a bonus opportunity (display coverage)."

---

## The Prompt

### Layout

When the user clicks Export with unmapped groups available, the export doesn't fire immediately. Instead, a modal or inline panel appears:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Sequence coverage: 22/22 ✓                                                 │
│  Display coverage:  75%  — 5 models in 2 groups won't receive effects       │
│                                                                              │
│  ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ──    │
│                                                                              │
│  These groups in your layout aren't mapped to anything in this sequence.     │
│  Want to duplicate some effects so more of your display lights up?           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ☐  All Pumpkins  (3 models)                                          │  │
│  │     Your pumpkins won't receive any effects from this sequence.        │  │
│  │                                                                        │  │
│  │     Suggested source:                                                  │  │
│  │     💡 GRP - ALL TOMBSTONES → already sending to "All Tombstones"     │  │
│  │        Similar shape, similar pixel count per model · 78% match        │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ☐  All Trees  (2 models)                                             │  │
│  │     Your trees won't receive any effects from this sequence.           │  │
│  │                                                                        │  │
│  │     Suggested source:                                                  │  │
│  │     💡 GRP - ALL SPINNERS → already sending to "All Spinners"         │  │
│  │        Similar radial geometry, compatible pixel count · 73% match     │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Accepting these brings display coverage to 100%.                            │
│                                                                              │
│  ┌────────────────────┐   ┌─────────────────────────────────────────────┐   │
│  │  ✓ Map selected    │   │  Skip — export at 75% display coverage     │   │
│  └────────────────────┘   └─────────────────────────────────────────────┘   │
│                                                                              │
│  ☐ Select all (2)                                                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**Checkboxes, not auto-apply.** Every suggestion is opt-in. The user checks the ones they want, then clicks "Map selected." Nothing happens until they explicitly choose. This respects the fact that some groups *should* stay dark — the user might not want their pumpkins getting tombstone effects.

**"Select all" as a power shortcut.** For users who trust the suggestions and just want maximum coverage, one click selects everything. But it's at the bottom, not the default — we don't want to feel pushy.

**"Skip" is equally prominent and shows the consequence.** "Skip — export at 75% display coverage" tells the user exactly what they're choosing. Not a guilt trip, just information. Compare to the boost path: "Accepting these brings display coverage to 100%." The user can see the delta and decide.

**Display coverage updates live with checkbox changes.** If the user checks "All Pumpkins" (3 models) but not "All Trees" (2 models), the prompt updates: "Accepting this brings display coverage to 90%." The math is immediate and visible.

**One suggestion per card, no alternatives.** Keep it even simpler than V1 draft — one best match per group. The user takes it or leaves it. If they want to explore alternatives, they go back to the main mapping view.

---

## Matching Logic: How Suggestions Are Generated

### The Pool

Suggestions draw from **already-mapped source groups only**. This is constrained on both sides:

- **Left side (what we suggest):** only source groups that are already mapped (they have at least one user destination)
- **Right side (what we're filling):** only user groups with zero assignments

Individual source models are excluded from the suggestion pool. Individual user models are excluded from the target list. Group-to-group only.

### Ranking Factors — No Name Matching

Name matching is deliberately excluded from the scoring algorithm. In the main mapping flow, name matching is useful because the user's "All Tombstones" probably should map to the source's "GRP - ALL TOMBSTONES." But at boost time, we're suggesting *cross-type* duplication — pumpkins getting tombstone effects, trees getting spinner effects. Name similarity is meaningless here and would actively suppress the best suggestions.

The real question is: "Will the source group's effects *look good* on the user's group?" That's about physical structure, not names.

```
Score = weighted combination of:

  - Member pixel count proximity (35%)
      Average pixels-per-model in source group vs user group
      Within 20%: +100
      Within 50%: +70
      Within 100%: +40
      Beyond 2x difference: +10
      
      This is the strongest signal. A group of 4 tombstones at 485px each
      will look great getting effects from a group of 3 pumpkins at 520px
      each — the per-model effects are sized similarly. A group of arches
      at 3200px each getting effects from a group of pixel sticks at 50px
      each will look terrible.
      
  - Member count similarity (30%)
      Same member count: +100
      Within ±1: +80
      Within ±2: +60
      Within ±4: +40
      Large mismatch (>4): +10
      
      When a source group has 4 members and the user group has 4 members,
      "Per Model" effects distribute perfectly — each member gets one
      channel. When counts mismatch, xLights wraps or truncates, which
      can still look fine but is less predictable.
      
  - Geometric compatibility (20%)
      Same geometry class: +100
        (radial↔radial, linear↔linear, flat↔flat, 3D↔3D)
      Adjacent class: +50
        (radial↔3D, linear↔flat)
      Unrelated: +10
        (radial↔flat)
      
      Geometry classes:
        Radial: spinners, wreaths, snowflakes, stars, trees (cone)
        Linear: arches, candy canes, icicles, rooflines
        Flat: matrices, tombstones, pumpkins, faces, signs
        3D: mega-trees, spiral trees, wireframes
      
      This is coarser than type matching but more useful for cross-type
      suggestions. A pumpkin and a tombstone are both "flat" props —
      effects designed for one flat shape look reasonable on another.
      
  - Effect richness of source (15%)
      Normalized effect count (more effects = better candidate)
      This biases toward source groups that carry lots of content,
      so the duplicated effects will be worth it visually. A source
      group with 30 effects is a better boost candidate than one with 2.
```

### Minimum Threshold: 70%

A suggestion must score ≥ 70% to appear. This is deliberately higher than what we'd use during the main mapping flow. During mapping, we show lower-confidence suggestions because the user is actively working and can evaluate them in context. At export time, the user's mindset is "I'm done" — we need to be confident enough that a quick "yes" doesn't create regret.

70% means: the pixel counts are in the same ballpark, the member counts are close, and the geometry is at least compatible. That's a suggestion worth making.

If no source group meets the 70% threshold for a given user group, that group card doesn't appear in the prompt at all. The user never sees a bad suggestion.

---

## What Happens When the User Accepts

### For Each Checked Group

A many-to-one link is created: the suggested source group now has an additional destination (the user's group).

```
Before boost:
  GRP - ALL TOMBSTONES → "All Tombstones" (1 destination)

User checks "All Pumpkins → GRP - ALL TOMBSTONES":
  GRP - ALL TOMBSTONES → "All Tombstones" + "All Pumpkins" (2 destinations)
```

This is identical to what would happen if the user had dragged "All Pumpkins" onto GRP - ALL TOMBSTONES during the main mapping flow. Same data structure, same .xmap output, same xLights behavior.

### Updated Export Summary

The export summary now includes both coverage metrics and the boost line:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ✓ Mapping exported!                                                     │
│                                                                          │
│  modiq-abracadabra-mapping.xmap saved to your downloads.                │
│                                                                          │
│  Sequence coverage: 22/22 — full                                         │
│  Display coverage:  100% — every group in your layout receives effects   │
│                                                                          │
│  Groups mapped: 10 (resolved 32 child models)                            │
│  Direct model maps: 12                                                   │
│  Skipped: 0                                                              │
│                                                                          │
│  ✨ Bonus: 2 groups linked for fuller display                            │
│     All Pumpkins → GRP - ALL TOMBSTONES                                  │
│     All Trees → GRP - ALL SPINNERS                                       │
│                                                                          │
│  [ Download Again ]   [ Map Another Sequence ]                           │
│                                                                          │
│  How was the auto-mapping?                                               │
│  😊 Great   😐 Okay   😕 Rough                            [ Skip ]       │
│                                                                          │
│  Help improve ModIQ: ☐ Share anonymous mapping data                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Updated .xmap Output

The .xmap file includes the boost mappings as additional lines. They're indistinguishable from regular many-to-one mappings:

```
GRP - ALL TOMBSTONES,All Tombstones
GRP - ALL TOMBSTONES,All Pumpkins        ← boost mapping
GRP - ALL SPINNERS,All Spinners
GRP - ALL SPINNERS,All Trees             ← boost mapping
```

The comments above are for illustration only — the actual .xmap file has no annotations.

---

## The Spinner Problem: Submodel-Level Boost

### Why Spinners Are Special

Spinners are the single biggest pain point in xLights mapping. Here's why:

A spinner in xLights isn't one model — it's a model with **submodels**: arms, rings, center, and sometimes custom-named segments. A 4-arm, 3-ring spinner has 12+ submodels. Each arm and ring can receive independent effects. The source sequence's creator spent hours choreographing chases across arms, color fades on rings, and center pops.

When a user maps their spinner group to the source's spinner group, the **group-level** effects transfer. But the submodel choreography — arm-1-does-this-while-arm-3-does-that — only works if the submodel structure aligns between source and destination. And here's the thing: most spinners in the xLights community are structurally identical (same arm count, same ring count, same naming convention) or at least very similar. A 4-arm spinner is a 4-arm spinner, whether it's called "Spinner-Overlord" or "My Yard Spinner."

The boost opportunity: if the user mapped 4 of their spinners to the source's 4 spinners, and they have 5 more spinners of similar size/structure sitting unmapped — those 5 should absolutely get the same submodel mappings. The effects will look right because the physical structure matches.

### How Submodel Boost Works

This is a separate section within the boost prompt, appearing after the group-level suggestions (if any). It triggers when:

1. **The user has spinner-type models** (or any model with submodels) in their layout
2. **Some spinners are already mapped** with submodel-level mappings from the main flow
3. **Other spinners of similar structure are unmapped** and score ≥ 70% against the mapped spinners' source counterparts

### What "Similar Structure" Means for Spinners

Two spinners are structurally similar if:

```
Structural similarity = weighted combination of:

  - Arm count match (40%)
      Exact match: +100
      Off by 1: +60
      Off by 2: +20
      Off by 3+: 0 (hard fail — a 3-arm spinner getting 6-arm
        choreography will look wrong)

  - Ring count match (25%)
      Exact match: +100
      Off by 1: +70
      Off by 2: +30
      Off by 3+: +5

  - Total pixel count proximity (20%)
      Within 20%: +100
      Within 50%: +60
      Beyond 50%: +20

  - Pixels per arm proximity (15%)
      Within 20%: +100
      Within 50%: +60
      Beyond 50%: +20
```

Arm count is the dominant factor because arm choreography is the most visible part of spinner effects. A 4-arm spinner getting effects from another 4-arm spinner will look intentional. A 4-arm spinner getting effects from a 6-arm spinner will have 2 arms doing nothing (or wrapping weirdly).

### Submodel Matching Strategy

When the boost suggests mapping unmapped Spinner X to the source's Spinner-Overlord (which is already mapped to the user's Spinner Y), the submodel mapping needs to be explicit. We don't just link the top-level model — we map submodel-to-submodel:

```
Source: Spinner-Overlord
  Already mapped to: user's "Yard Spinner 1"
    Arm 1 → Arm 1
    Arm 2 → Arm 2
    Arm 3 → Arm 3
    Arm 4 → Arm 4
    Ring 1 → Ring 1
    Ring 2 → Ring 2
    Ring 3 → Ring 3
    Center → Center

Boost: also map to user's "Yard Spinner 5" (similar structure)
    Arm 1 → Arm 1
    Arm 2 → Arm 2
    Arm 3 → Arm 3
    Arm 4 → Arm 4
    Ring 1 → Ring 1
    Ring 2 → Ring 2
    Ring 3 → Ring 3
    Center → Center
```

If the submodel names differ between user spinners (e.g., one uses "Arm1" and another uses "Blade-A"), ModIQ should match by **ordinal position and type** rather than name. Arm 1 by any name is still the first arm.

### Submodel Boost UI

The spinner section appears below the group suggestions in the boost prompt:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ── SPINNER MATCHING ────────────────────────────────────────────────────── │
│                                                                              │
│  You have 5 spinners already mapped. We found 3 more spinners that could    │
│  receive the same effects:                                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ☐  Yard Spinner 5  (4 arms · 3 rings · 1200px)                      │  │
│  │                                                                        │  │
│  │     Structure matches your already-mapped spinners:                    │  │
│  │     💡 Copy submodel mapping from Yard Spinner 1                      │  │
│  │        → Source: Spinner-Overlord                                      │  │
│  │        Same arm count, same ring count, similar pixel count · 92%     │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ☐  Yard Spinner 6  (4 arms · 3 rings · 1200px)                      │  │
│  │                                                                        │  │
│  │     💡 Copy submodel mapping from Yard Spinner 1                      │  │
│  │        → Source: Spinner-Overlord                                      │  │
│  │        Same arm count, same ring count, similar pixel count · 92%     │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ☐  Porch Spinner  (4 arms · 2 rings · 800px)                        │  │
│  │                                                                        │  │
│  │     💡 Copy submodel mapping from Yard Spinner 2                      │  │
│  │        → Source: Spinner-2                                             │  │
│  │        Same arm count, 1 fewer ring, smaller pixel count · 74%        │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Why This Is Transformative

Without this feature, a user with 9 identical spinners who maps 4 of them has to manually map the other 5 — submodel by submodel. That's potentially 5 × 12 = 60 submodel mappings done by hand. With the boost, it's 5 checkboxes and a click.

This is also where ModIQ can provide the most value that xLights' native import dialog doesn't. xLights doesn't know that your 9 spinners are structurally identical and that mapping one implies the mapping for the rest. ModIQ does.

### Submodel Boost Beyond Spinners

The same logic applies to any model type with submodels:

- **Matrices** with sub-panels
- **Mega-trees** with vertical strands or layers
- **Arches** with segments
- **Custom models** with named submodels

The structural similarity algorithm adapts per type — for matrices, it's row/column count and pixel density; for mega-trees, it's strand count and height. But spinners are the first and most impactful target because they have the most complex submodel structures and the highest mapping pain.

---

## Ordering and Limits

### How Many Items to Show

Show a maximum of **5 group-level suggestions** and a maximum of **5 submodel-level suggestions** in the boost prompt. If more exist, show the top by match score with a note:

```
Showing top 5 of 8 unmapped groups. You can map the rest from the main view.
  [ Back to mapping ]
```

### Sort Order

**Group suggestions** sorted by:
1. Best match score (highest first)
2. Model count (tiebreaker, highest first) — bigger groups = more visual impact

**Submodel suggestions** sorted by:
1. Structural similarity score (highest first) — most identical spinners at top
2. Pixel count proximity (tiebreaker) — closer size = better visual result

### Section Order in the Prompt

```
1. Display coverage headline (sequence coverage + display coverage)
2. Group-level boost suggestions (if any)
3. Spinner/submodel boost suggestions (if any)
4. Summary line ("Accepting all brings display coverage to X%")
5. Action buttons (Map selected / Skip)
```

Either section can appear without the other. A user might have all groups covered but have unmapped spinners, or vice versa.

---

## Edge Cases

### No Unmapped Groups and No Unmapped Spinners

The user's layout has no unmapped groups and no unmapped spinners that qualify. The boost prompt doesn't appear — the export proceeds directly. This is the happy path for small layouts or thorough mappers.

### All Suggestions Score Below 70%

Every unmapped group and spinner exists, but none has a match scoring ≥ 70%. The boost prompt doesn't appear. No bad suggestions, ever.

### User Has Unmapped Individual Models Too

We deliberately ignore unmapped individual models in the boost prompt. Only groups and submodel-bearing models (spinners etc.). A single unmapped tombstone or pixel stick is low-impact. Groups and spinners are where the leverage is.

### User Clicks "Map Selected" with Nothing Checked

The "Map selected" button is disabled (greyed out) when zero checkboxes are checked. The user must either check something or click Skip.

### User Wants to Change a Suggestion

In this version, they can't customize within the prompt. They can:
1. Skip the boost
2. Go back to the main mapping view and make the link manually
3. Accept the suggestion and change it later

A future iteration could allow a dropdown on each card to pick a different source layer, but V1 keeps it simple: take the suggestion or leave it.

### User Already Mapped Some Models Within the Group

The user's "All Arches" group is unmapped, but "Arch 1" and "Arch 2" are individually mapped. The group as a whole still counts as unmapped. The boost prompt should still show it, but with context:

```
☐  All Arches  (6 models — 2 already mapped individually)
   4 models in this group have no effects yet.
   
   💡 GRP - ALL TOMBSTONES → already sending to "All Tombstones"
```

### Display Coverage with Overlapping Groups

A model can belong to multiple groups. If "Arch-1" is in both "All Arches" and "Front Yard Props," and "All Arches" is mapped but "Front Yard Props" is not, Arch-1 is still covered (through "All Arches"). "Front Yard Props" might appear in the boost prompt, but its display coverage contribution is only the members that *aren't* already covered through other groups.

The display coverage math must deduplicate: count each physical model once, regardless of how many groups it belongs to.

### Spinner with Mismatched Arm Count

A user's 3-arm spinner sits unmapped while the source's 4-arm spinners are mapped. The arm count mismatch (off by 1) scores 60% on the arm count factor. Combined with other factors, this might still clear the 70% threshold if ring count and pixel count are close — but it's marginal. The suggestion would include a note: "1 fewer arm — 3 of 4 arm effects will map; 1 arm's effects won't have a destination." The user can decide if that's acceptable.

### Many-to-One Already Exists on the Suggested Source

The suggested source group already has 3 destinations from the main mapping. Adding the user's group makes it 4. That's fine — many-to-one has no practical limit.

---

## The Tone

This feature lives at a delicate moment — the user just finished a task and we're asking them to do more. The tone must be:

**Helpful, not naggy.** "75% display coverage — 5 models in 2 groups won't receive effects" — factual, not judgmental. We're not saying "you missed these" or "your mapping is incomplete." Their mapping IS complete, by the V3 definition. This is a bonus.

**Quick, not involved.** The entire interaction should take 5–10 seconds for a user who wants it, and 2 seconds for a user who doesn't (just click Skip). No scrolling through long lists, no complex decisions.

**Honest about what's happening.** "Duplicate some effects so more of your display lights up" — we're telling the user exactly what this does. It's effect duplication, not magic. Some groups will get effects that weren't originally designed for them. Most users will be fine with this; some won't. Transparency lets them decide.

**Celebratory when accepted.** The "✨ Bonus: 2 groups linked" line in the export summary makes the user feel smart for opting in. They got extra value for free. And "Display coverage: 100%" feels like a real achievement.

---

## Implementation Notes

### Data Already Available

Everything needed for this feature already exists at export time:

- The user's full model/group list with submodel structures (from their layout upload)
- Which user models/groups have assignments (from the mapping state)
- The structural match scoring algorithm (adapted from the main flow, minus name matching)
- The many-to-one link creation logic (from the many-to-one spec)

### New Computation Required

1. **Display coverage calculation:** Walk the user's group tree, check coverage status per group, deduplicate models across groups, compute percentage.
2. **Boost scoring with no name matching:** The existing match algorithm needs a mode where name similarity weight is zeroed out and replaced with the structural factors above.
3. **Submodel structure comparison:** New algorithm that compares spinner (and other submodel-bearing) structures by arm count, ring count, pixel distribution. This doesn't exist in the current spec and needs to be built.
4. **Submodel mapping cloning:** Logic to take an existing submodel mapping (Spinner-Overlord → Yard Spinner 1's submodels) and replicate it for a structurally similar target (Yard Spinner 5's submodels), remapping by ordinal position.

### Where It Lives in the Flow

```
User clicks [Export]
  → Calculate display coverage
  → Check: any unmapped user groups scoring ≥ 70% against mapped source groups?
  → Check: any unmapped spinners/submodel models scoring ≥ 70% against mapped ones?
    → YES to either: show boost prompt with display coverage + suggestions
      → User checks items + clicks "Map selected" → create links → recalc display coverage → export
      → User clicks "Skip" → export at current display coverage
    → NO to both: show export summary with display coverage number (no boost prompt)
```

Note: even when the boost prompt doesn't appear, the display coverage metric still shows in the export summary. The user always sees how much of their display is covered.

### State If User Goes Back

If the user sees the boost prompt and clicks "Back to mapping" (or closes without exporting), no mappings are created. The boost is purely tied to the export action. If they go back and manually map some groups, then hit Export again, the prompt recalculates.

---

## Future Iterations

### V2: Individual Model Boost

After proving the group-level and spinner boost works, extend to individual models. "8 models in your layout still have no effects. Want to auto-fill them?" Keep it behind a "Show more" expansion.

### V3: Smart Fill

A single "Auto-fill my display" button that applies the best match for every unmapped group, spinner, and model in one shot. Show a preview, let the user deselect, then apply all. Power-user fast path.

### V4: Pre-Export Display Coverage Preview

Move the display coverage metric into the main mapping view as a secondary, collapsible indicator. "Sequence: 22/22. Display: 75%." Lets users see the gap forming in real-time, but keeps it visually subordinate to sequence coverage.

### V5: Submodel-Aware Main Flow

Extend the submodel intelligence from the export boost into the main mapping flow. When a user maps a spinner during the regular flow, ModIQ auto-suggests: "You have 4 more spinners like this one. Map them all?" This would eventually replace the export-time spinner boost with an earlier, more natural intervention.
