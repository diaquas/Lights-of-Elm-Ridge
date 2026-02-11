# Ticket 58 — Finalize Phase V2: Redesign Recommendations

After reviewing the current V1 implementation, here are the issues observed and a proposed redesign.

---

## Issues Observed in V1

### 1. "Choose a Source" Goes Full-Screen (Critical)
When clicking "Choose a source" on a dark model, the entire page is replaced by a flat, unstyled full-screen list of every source model. No context, no hierarchy, no way to understand what you're choosing or why. The Finalize page disappears completely — you lose all context of what model you were assigning. This is the single biggest UX problem.

### 2. Left Panel Is Low-Value in Practice
The Source Sequence panel (left) shows every mapped source with its destinations, but users don't naturally think "let me browse sources and add destinations." They think from their display: "this model is dark, I need to fix it." The left panel ends up being a long scrollable list you rarely interact with. It's reference material taking up 50% of the screen.

### 3. "Dark" List Is Overwhelming
125 dark models as a flat list is paralyzing. No grouping, no prioritization, no sense of "where do I start?" Every item looks the same — warning icon, model name, "Choose a source." The user has to make 125 individual decisions with no guidance beyond the occasional suggestion.

### 4. Accept/Choose Are the Only Interactions
The only things you can do are Accept a suggestion or Choose a source (which breaks the whole page). No drag and drop, no batch operations, no quick "same as above" shortcut. Each model is an isolated interaction.

### 5. Coverage Bar Doesn't Feel Motivating
52% display coverage with 125 dark models — the bar barely moves when you accept one suggestion. There's no momentum or satisfaction. The numbers update but the experience feels like a slog.

### 6. Scrolling Context Loss
Both panels scroll independently. When you're 30 items deep in the Dark list on the right, the left panel is showing completely unrelated sources. There's no connection between what you're looking at on each side.

---

## V2 Proposal: Single-Pane, Card-Based Workflow

### Core Idea: Kill the Side-by-Side

Replace the dual-pane layout with a **single, focused pane** that walks the user through their dark models intelligently. The mental model shifts from "here are two giant lists, figure it out" to "here's the next thing to fix, here are your options."

---

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  FINALIZE                                                            │
│  Display Coverage: ████████████░░░░░░░░  59%  (89/150)              │
│                                                                      │
│  ┌─── Quick Actions ───────────────────────────────────────────────┐ │
│  │  [Accept All Suggestions (34)]  [Dismiss All Low-Match]         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ▾ NEEDS ATTENTION (97)                                             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  ▾ Eaves (26 models)                          Batch: [Assign]  │ │
│  │    ┌──────────────────────────────────────────────────────────┐ │ │
│  │    │ Eave 2 - Office Peak 1                                  │ │ │
│  │    │ 💡 ARCH 1 (50%)  |  💡 ARCH 2 (50%)                    │ │ │
│  │    │                                         [Accept] [Skip] │ │ │
│  │    │                                                          │ │ │
│  │    │              ┌─ or drag a source here ─┐                 │ │ │
│  │    │              └─────────────────────────-┘                 │ │ │
│  │    └──────────────────────────────────────────────────────────┘ │ │
│  │    ┌──────────────────────────────────────────────────────────┐ │ │
│  │    │ Eave 3 - Office Peak 2                                  │ │ │
│  │    │ No strong suggestions                                   │ │ │
│  │    │              ┌─ drag a source here ─────┐                │ │ │
│  │    │              └──────────────────────────-┘                │ │ │
│  │    └──────────────────────────────────────────────────────────┘ │ │
│  │    ... (24 more)                                               │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  ▸ Bats (7 models)                            Batch: [Assign]  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  ▸ Standalone Models (12)                                       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ▸ ALREADY MAPPED (53)   ← collapsed, click to review/edit         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  SOURCE TRAY (draggable)                              [collapse]││
│  │  Search sources...                                              ││
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       ││
│  │  │ ARCH 1 │ │ ARCH 2 │ │ ARCH 3 │ │MATRIX 1│ │MEGATREE│  ...  ││
│  │  │ 11 fx  │ │ 11 fx  │ │ 11 fx  │ │ 82 fx  │ │ 105 fx │       ││
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       ││
│  └──────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

---

### Key Components

#### 1. Source Tray (Bottom Dock)
Replaces the entire left panel AND the full-screen source picker.

- **Persistent dock** pinned to the bottom of the Finalize view (~120px tall)
- Horizontally scrollable row of source **chips/cards** — each showing the source name + effect count
- Searchable — type to filter the chips
- **Draggable** — pick up a source chip and drop it onto any dark model card above
- Collapsible — user can minimize it when not needed to reclaim vertical space
- Visual states: sources already mapped to 1+ destinations get a subtle badge showing destination count; unmapped sources (if any) get highlighted
- Chips sorted by effect count (highest first) — most impactful sources are easiest to grab

This solves the full-screen problem completely. The sources are always visible, always in context, and the interaction is drag-and-drop instead of "click, lose the page, scroll a giant list, click, come back."

#### 2. Smart Grouping in the Main List
Instead of 125 flat items, group dark models by type/name similarity (same logic as the model grouping in the mapping phases):

- **Eaves (26)** — all eave models collapsed into one expandable card
- **Bats (7)** — all bat models
- **Standalone Models (12)** — anything that doesn't group

This makes 125 items feel like 8–12 groups. Much less overwhelming.

#### 3. Batch Operations Per Group
Each group header gets a **"Batch Assign"** button:

- Click it → opens a compact inline picker (NOT full screen) showing the top 3–5 suggested sources for that group type
- One click assigns the same source to every model in the group
- "All 26 eaves will receive effects from ARCH 1 (11 effects)" — confirm and done
- Display coverage jumps noticeably. That's the dopamine hit.

#### 4. Drag-and-Drop
Two drag-and-drop interactions:

**Source → Model card:** Grab a source from the bottom tray, drop it on a model card (or group header for batch). The card gets a green confirmation flash, the coverage bar ticks up.

**Model → Model (copy mapping):** Grab an already-mapped model and drop it on a dark model to say "same as this one." This is the "same as above" shortcut — you mapped Eave 1 to ARCH 3? Drag Eave 1 onto Eave 2 to copy that mapping. Huge time saver for repetitive models.

#### 5. Inline Source Picker (Replaces Full-Screen)
When a user clicks "Choose a source" (for those who prefer clicking over dragging), a **compact inline dropdown/popover** appears directly below the model card:

```
┌──────────────────────────────────────────┐
│ Search sources...                        │
├──────────────────────────────────────────┤
│ 💡 ARCH 1          11 fx   50% match    │  ← suggested, highlighted
│ 💡 ARCH 2          11 fx   50% match    │
│ ─────────────────────────────────────    │
│    MATRIX 1         82 fx               │  ← all other sources
│    MATRIX 2         82 fx               │
│    MEGATREE         105 fx              │
│    MEGATREE 2       105 fx              │
│    ...                                  │
└──────────────────────────────────────────┘
```

- Max height ~300px, scrollable within
- Suggestions at top, separated by divider, then all sources below
- Search to filter
- One click assigns and closes the popover
- **Never leaves the page.** The model card and surrounding context stay visible.

#### 6. Coverage Bar with Momentum
Make the coverage bar feel rewarding:

- **Animate** on every change — smooth fill transition (300ms ease)
- **Milestone callouts** — at 75%, 90%, 100% show a brief toast: "75% — getting there!" / "100% — full coverage!"
- **Show delta** after batch operations: "+26 models mapped" appears briefly next to the bar
- Consider a subtle color shift as it climbs: red (< 50%) → orange (50-75%) → yellow (75-90%) → green (90%+)

---

### What Happens to the Left Panel Content?

The "Source Sequence" left panel information isn't lost — it's redistributed:

| V1 Left Panel Feature | V2 Location |
|---|---|
| List of all sources + their destinations | Source Tray (bottom dock) + "Already Mapped" section |
| "+ Add another destination" | Drag source from tray onto any model |
| "Skip this source" | Not needed — Finalize is display-focused, not source-focused |
| Source effect counts | Shown on source tray chips |

---

### Interaction Flow Comparison

**V1 (current):**
1. Look at right panel, find dark model
2. Click "Choose a source"
3. Page explodes to full-screen list
4. Scroll through flat list trying to find a good source
5. Click one
6. Page returns — try to find where you were
7. Repeat 125 times

**V2 (proposed):**
1. See grouped dark models, expand a group (e.g., "Eaves (26)")
2. Click "Batch Assign" → pick from 3 suggested sources → done, 26 models mapped in one click
3. OR drag a source from the bottom tray onto individual models
4. OR Accept inline suggestions with one click
5. Coverage bar climbs visibly with each action
6. Never leave the page

---

### Edge Cases

**Very few dark models (<5):** Skip the grouping, just show flat cards with suggestions. Source tray still available for manual assignment.

**User wants to review/change existing mappings:** "Already Mapped" section is collapsed by default. Expand to see all mapped models with their sources. Click [×] to unmap, drag a new source to remap. Same interactions, just in the lower section.

**User drags wrong source:** Undo button in the header (already exists). Also, each model card shows its current assignment with an [×] to remove.

**Massive layouts (300+ dark models):** Grouping is critical here. Also add a search bar at the top of the Needs Attention list. Groups should lazy-load their children — show the group header with count, expand only on click.

---

### Implementation Priority

1. **Source Tray dock** — this is the biggest win, kills the full-screen picker immediately
2. **Inline popover picker** — fallback for click-based interaction
3. **Smart grouping** of dark models by type
4. **Batch assign** per group
5. **Drag-and-drop** (source → model)
6. **Drag-and-drop** (model → model copy)
7. **Coverage bar animations + milestones**
8. **Remove left panel**, migrate "Already Mapped" to collapsible section
