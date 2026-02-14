# Ticket 78 — Merge Submodel Groups Into Unified "Map Your Display" Step

---

## The Problem: Showstopper Spinner as Case Study

The Showstopper Spinner has **292 submodels**, organized into:

**Section headers** (not real submodels, just labels):
- `**WHOLE SPINNER`
- `**OUTER`
- `**MIDDLE`  
- `**CENTER`
- `**HALLOWEEN`
- `***INDIVIDUAL SUB-MODELS`

**83 Submodel Groups** (numbered 01-83): These are what effects target. Names like "01 Cascading Arches", "18 Swirl Right", "44 Half Moon", "73 Bat". These are the mapping targets — the things sequencers assign effects to.

**~200+ Individual Submodels**: The actual pixel ranges within submodel groups (e.g., "Cascading Arches-01" through "Cascading Arches-12", "Spider-1" through "Spider-12"). These are NOT what users map — they're internal decomposition.

### The Key Insight

**99.9% of mapping happens at the Submodel Group level** — mapping source submodel group "Cascading Arches" to destination submodel group "Cascading Arches". Nobody maps individual submodels (Cascading Arches-01 → something). The algorithm handles that internally via pixel range matching.

### What Makes Spinners Hard

1. **Volume**: 83 submodel groups per spinner, some spinners have 20, some have 100+
2. **Naming chaos**: Different vendors name the same pattern differently ("Arches" vs "Cascading Arches" vs "Arch Sweep")
3. **Structural mismatch**: Source spinner might have 83 submodel groups, destination has 45. Many have no match at all.
4. **Section hierarchy**: The `**OUTER`, `**MIDDLE`, `**CENTER` sections are hints about which submodel groups are conceptually similar, but they don't map 1:1 between spinners
5. **Multiple spinners**: A display might have 3 different spinner models, each with different submodel group structures

---

## Decision: Keep Separate or Merge?

### Recommendation: Keep as a separate step, but rename and rethink

**Why NOT merge into one giant tree:**

The mental model is fundamentally different. Groups & Models is "which physical things on my display map to which physical things from the source?" — fence to fence, tree to tree. That's intuitive and fast.

Submodel groups are "which *animation pattern* within a complex model maps to which animation pattern on my model?" — that requires understanding what "Cascading Arches" looks like vs "Big Petals" vs "Swirl Right." It's a different cognitive task:

- Groups & Models: **spatial mapping** (where is it on the display?)
- Submodel Groups: **pattern mapping** (what visual effect does it create?)

Forcing both into one tree would mean the user is looking at a list like:
```
> All - Fence (GRP)
  > Fence Panel 1
  > Fence Panel 2
> Showstopper Spinner (GRP)
  > **WHOLE SPINNER (submodel section header)
  > **OUTER (submodel section header)
    > 33 Outer Swirl Left (submodel group)
    > 34 Outer Swirl Right (submodel group)
    > ... 12 more ...
  > **MIDDLE (submodel section header)
    > 46 Big Hearts (submodel group)
    > ... 5 more ...
  > **CENTER (submodel section header)
    > 51 Crosses (submodel group)
    > ... 20 more ...
  > **HALLOWEEN (submodel section header)
    > 71 Spider Web (submodel group)
    > ... 13 more ...
```

That's overwhelming. The tree depth goes to 4 levels. Simple models (fence, arches) sit next to massively complex ones (spinners with 83 submodel groups). The UX breaks down.

### Better: A dedicated, focused Submodel Groups step

But redesigned with these principles:

---

## Proposed Stepper

```
Upload → Map Your Display → Map Submodel Groups → Finalize → Review
```

"Map Your Display" = Groups + Models (current combined step)
"Map Submodel Groups" = only appears if models with submodel groups exist

If no models have submodel groups: **step auto-skips**, stepper shows 4 pills instead of 5.

---

## Submodel Groups Step Design

### Scoped Per Model

Instead of showing all submodel groups from all models in a flat list, **scope by parent model**. The user picks a model (or Mod:IQ auto-focuses the first unmapped one), and they see only that model's submodel groups.

```
┌─────────────────────────────────────────────────────────────────┐
│  Model: Showstopper Spinner → [Source: VLS Mega Spinner]       │
│  83 submodel groups · 47 auto-matched · 12 unmapped            │
├─────────────────────────────────────────────────────────────────┤
│  [All Models ▾]  Click a model to map its submodel groups      │
│                                                                 │
│  ☑ Showstopper Spinner      83 sub-groups   ████████░░  47/83  │
│  ☐ Cross Spinner            13 sub-groups   ██████████  13/13  │
│  ☐ GE Overlord              22 sub-groups   ████░░░░░░   9/22  │
└─────────────────────────────────────────────────────────────────┘
```

Select a model → its submodel groups appear below, using the same card UI from Groups & Models (checkbox, fx badge, type badge SUB, name, destination, health bar, actions).

### Section Headers as Collapsible Dividers

The `**OUTER`, `**MIDDLE`, `**CENTER`, `**HALLOWEEN` headers from the xmodel become collapsible section dividers. Not mappable — just organizational.

```
▾ WHOLE SPINNER
  ☑  12 fx  SUB  01 Cascading Arches      → Cascading Arches    72%    🔓 ✕
  ☑   6 fx  SUB  02 Cascading Arches-Odd  → Cascading Arches    72%    🔓 ✕
  ☑   6 fx  SUB  03 Cascading Arches-Even → Cascading Arches    72%    🔓 ✕
  ...

▾ OUTER  
  ☑   4 fx  SUB  33 Outer Swirl Left      → Outer Swirl Left    88%    🔓 ✕
  ☐   0 fx  SUB  34 Outer Swirl Right     → (no match)                + Assign

▾ HALLOWEEN
  ☐   8 fx  SUB  71 Spider Web            →                           + Assign
  ☑   3 fx  SUB  73 Bat                   → Bat Silhouette      65%   🔓 ✕
```

### Smart Cascade from Parent Mapping

When the user mapped "Showstopper Spinner → VLS Mega Spinner" in the Groups & Models step, the cascade prompt said "Yes, Map Models." If they said yes: **auto-matching already ran on submodel groups**. The Submodel Groups step shows results pre-applied, same as auto-matches in Groups & Models.

If they said no or the parent mapping was manual: submodel groups start unmapped.

### Algorithm Hints

The matching algorithm for submodel groups should:
1. **Exact name match** (case-insensitive): "Cascading Arches" → "Cascading Arches" — 100%
2. **Fuzzy name match**: "Big Petals" → "Large Petals" — 80%
3. **Section match**: Source OUTER submodel groups prefer destination OUTER submodel groups
4. **Structural match**: Compare pixel range patterns (count of lines, count of pixels per line) as a secondary signal
5. **Number prefix match**: "01 Cascading Arches" → ignore the number prefix, match on "Cascading Arches"

### What About Individual Submodels?

Don't show them. They're internal to the submodel group. The mapping is at the group level ("Cascading Arches" → "Cascading Arches"). The export writes the pixel ranges directly. There's no user decision to make at the individual submodel level.

If in the future there's a need (custom pixel remapping), it could be a power-user "Advanced" expand within a submodel group. But for now: hidden.

---

## Filter / Sort for Submodel Groups

Same pattern as Groups & Models:
- Filter pills: [All (83)] [Mapped (47)] [Unmapped (12)] [Review (24)]
- Auto-start with unmapped/review filtered
- Sort: Unmapped first, then by section order

---

## Why This Works for the Hard Cases

**42 submodel groups**: Manageable in one scrollable list with section dividers
**100+ submodel groups**: Sections collapse to manage the volume. User focuses on one section at a time.
**Different spinner vendors**: Algorithm does heavy lifting with name matching. User reviews mismatches.
**Multiple spinners on display**: Model selector at top. Map one spinner at a time. Each is self-contained.

---

## Summary

| Aspect | Decision |
|---|---|
| Merge into one step? | No — keep separate |
| Step name | "Map Submodel Groups" |
| Auto-skip? | Yes — step hidden if no models have submodel groups |
| Scope | Per-model (pick a spinner, see its submodel groups) |
| Section headers | Collapsible dividers (`**OUTER`, `**CENTER`, etc.) |
| Individual submodels | Hidden (no user action needed) |
| Card UI | Same grid layout as Groups & Models (checkbox, fx, SUB badge, name, destination, health, actions) |
| Cascade | Inherits from "Yes, Map Models" prompt in Groups & Models |
| Algorithm | Name match (exact → fuzzy → section hint → structural) |
