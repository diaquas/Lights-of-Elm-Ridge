# Ticket 77 — Group Card: Health Bar, Model Counts & Accept Suggestion Redesign

---

## Group Card — Double Height Layout

Group cards get two rows. Model cards stay single-row.

### Row 1: Identity + Group-Level Mapping
```
> GRP  All - Fence (7)  ·  110 fx               🔗→ VLS GROUP - ALL MATRIX  65%  🔓 ✕
```

Same as Ticket 76 — group name, count, total effects, destination mapping, actions.

### Row 2: Children Health Summary
```
  ████████░░░░░░  5/7 mapped  ·  2 covered  ·  0 unmapped     [✓ Accept Match]
```

This row packs the "should I open this?" signal into a glance.

---

## Health Bar (Mini Segmented Bar)

A thin horizontal bar (~100-120px wide, 4px tall) showing the composition of children inside the group:

```
████████████░░░░░░░░
green  yellow  amber  gray
```

| Segment | Color | Meaning |
|---|---|---|
| Green | Mapped (manual or accepted auto-match) | Strong — done |
| Yellow | Auto-matched, needs review (<75%) | Decent — worth a look |
| Amber | Unmapped, not covered by group | Needs work |
| Gray | Covered by group mapping | Handled — don't worry |

### Examples:

**All green + gray — skip this group:**
```
████████████████████  7/7 mapped  ·  0 unmapped              [✓ Accept Match]
```

**Mix of states — open and review:**
```
██████████░░░░░░░░░░  5/7 mapped  ·  2 need review           [✓ Accept Match]
```

**All amber — this group needs work:**
```
░░░░░░░░░░░░░░░░░░░░  0/7 mapped  ·  7 unmapped
```

**All gray (covered by group) — don't even look:**
```
████████████████████  0/7 individually mapped  ·  7 covered by group
```

---

## Count Summary (Text Next to Bar)

Compact text summary next to the health bar. Show only non-zero counts to save space:

| Scenario | Text |
|---|---|
| All mapped | `7/7 mapped` |
| Mixed | `5/7 mapped · 2 need review` |
| All unmapped | `0/7 mapped · 7 unmapped` |
| All covered | `7 covered by group` |
| Covered + some mapped | `3/7 mapped · 4 covered` |

The denominators give total child count. "Need review" = auto-matched below 75% confidence.

---

## Accept Suggestion Redesign

The star icon currently means "accept top auto-match suggestion." This is a high-value action hidden behind an unclear icon.

### Replace With: `[✓ Accept Match]` Button

Positioned at the right end of Row 2:

```
  ████████░░░░  5/7 mapped  ·  2 need review                [✓ Accept Match]
```

**Behavior:**
- Visible only when the group has an auto-match suggestion that hasn't been accepted yet
- Click: accepts the suggested mapping for this group (or for all unresolved children within)
- After clicking: button disappears, health bar updates, destination fills in on Row 1
- If the group is already fully mapped/accepted: button doesn't appear

**For groups with mixed child states:**
Button text adapts: `[✓ Accept 3 Matches]` — accepts all auto-matched children within the group that are pending review.

**For unmapped groups with a suggestion:**
Button shows the suggestion inline: `[✓ Accept: VLS GROUP - ALL MATRIX 65%]`

### Why Not a Star:
- Stars universally mean "favorite" — wrong mental model
- A labeled button is self-explanatory
- The action deserves more visual weight since it's a one-click resolution for the whole group

---

## Full Group Card — Standard View

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ > GRP  All - Fence (7)  ·  110 fx           🔗→ VLS GROUP - ALL MATRIX  65% 🔓✕│
│   ████████████░░░░░░  5/7 mapped · 2 need review               [✓ Accept 2]   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Height: ~56px (two 28px rows)
Model rows below remain 28px single-row.

---

## Full Group Card — Focus Mode

Focus mode gets slightly more detail on Row 2:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ > GRP  All - Fence (7)  ·  110 fx  ·  4,655px  🔗→ VLS GROUP - ALL MATRIX 65%🔓✕│
│   ████████████░░░░░░  5 mapped · 2 need review · 0 unmapped · 0 covered  [✓ Accept 2] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- Pixel count visible on Row 1
- All four count categories visible on Row 2 (even zeros for completeness)
- Slightly wider health bar

---

## Decision Tree: "Should I Open This Group?"

The health bar + counts answer this instantly:

| What You See | What It Means | Action |
|---|---|---|
| All green bar, `7/7 mapped` | Every child is handled | Skip — don't open |
| All gray bar, `7 covered by group` | Group mapping covers everything | Skip — don't open |
| Green + gray, `3/7 mapped · 4 covered` | Mix of individual + group coverage | Probably skip |
| Green + yellow, `5/7 mapped · 2 need review` | Mostly done, 2 iffy matches | Open, review the yellow ones |
| All amber, `0/7 mapped · 7 unmapped` | Nothing mapped at all | Open and map, or map at group level |
| Has `[✓ Accept]` button | Auto-match suggestions pending | Click accept without opening |

---

## Interaction: Click Group Header vs Click Accept

- **Click chevron or group name**: expand/collapse to show child models
- **Click `[✓ Accept]`**: accept matches without expanding (one-click resolution)
- **Click destination pill area**: opens right panel for group-level mapping review/swap
- These are distinct click targets — chevron/name on the left, accept on the right, destination in the middle
