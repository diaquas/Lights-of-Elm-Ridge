# Ticket 59 — Add Grid View Toggle to Finalize Phase

Additive to Ticket 58 (Card View). Same underlying data, new view mode.

---

## View Toggle

Add a toggle to the top of the Finalize phase header, next to the coverage bar:

```
[🎯 Card View]  [📊 Grid View]
```

- Card View = existing Ticket 58 implementation (default)
- Grid View = spreadsheet-style table (this ticket)
- Switching views preserves all state — mappings, suggestions, coverage
- Last-used view preference saved per user

---

## Grid View Layout

Full-width table. No side panels.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  Search models...                Sort: [Unmapped First ▾]   Filter: [All ▾]      │
├──────┬───────────────────────┬──────────────────────────┬────────┬───────┬────────┤
│  ☐   │ MY DISPLAY            │ MAPPED TO (SOURCE)       │ MATCH  │ FX    │ STATUS │
├──────┼───────────────────────┼──────────────────────────┼────────┼───────┼────────┤
│  ☐   │ Arch 1                │ [ARCH 2            ▾]    │        │ 11    │ ✓      │
│  ☐   │ Arch 2                │ [ARCH 1            ▾]    │        │ 11    │ ✓      │
│  ☐   │ Arch 3                │ [— Select source — ▾]    │        │       │ ⚠      │
│  ☐   │ Bat 1                 │ [MEGATREE BAT    💡▾]    │  70%   │ 81    │ 💡     │
│  ☐   │ Bat 7                 │ [MEGATREE BAT 2  💡▾]    │  74%   │ 79    │ 💡     │
│  ☐   │ Driveway Left         │ [— Select source — ▾]    │        │       │ ⚠      │
│  ...                                                                              │
├──────┴───────────────────────┴──────────────────────────┴────────┴───────┴────────┤
│  150 models · 89 mapped · 27 suggested · 34 unmapped                              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Columns

| Column | Content |
|---|---|
| **☐** | Checkbox for multi-select batch operations |
| **My Display** | Model/group name from user's layout |
| **Mapped To** | Searchable inline dropdown. Pre-filled for mapped items, shows suggestion with 💡 for suggested, empty for unmapped |
| **Match** | Confidence % for AI suggestions. Blank for manual mappings |
| **FX** | Effect count from assigned source |
| **Status** | ✓ mapped · 💡 suggested · ⚠ unmapped |

---

## Inline Source Dropdown

This replaces the full-screen source picker. When user clicks any dropdown:

- Opens a popover/dropdown directly inline — max height ~300px, scrollable
- **Searchable** — type to filter
- AI suggestions pinned at top with match % and 💡 icon
- Divider line
- All other sources below, sorted by effect count (highest first)
- One click assigns and closes dropdown
- Row updates immediately, coverage bar ticks up
- **Never leaves the page**

---

## Multi-Select Batch Assign

When one or more checkboxes are selected, show a toolbar above the table:

```
┌──────────────────────────────────────────────────────────────────┐
│  12 selected    Assign all to: [— Select source — ▾]    [Clear] │
└──────────────────────────────────────────────────────────────────┘
```

- Source dropdown in toolbar uses same searchable inline dropdown
- One selection applies to all checked rows
- Coverage bar updates after batch

---

## Accept All Suggestions

Button in the Finalize header (visible in both views):

```
[Accept All Suggestions (34)]
```

- Applies every AI suggestion (💡 rows) in one click
- Coverage bar animates up. Rows update to ✓ status.

---

## Sort Options

Dropdown in table header:

- **Unmapped First** (default) — unmapped → suggested → mapped
- Name A→Z
- Name Z→A
- Effect count high→low
- Match confidence high→low

## Filter Options

Dropdown in table header:

- **All** (default)
- Unmapped only
- Suggested only
- Mapped only

---

## Row Actions

On hover (or always visible on mobile):

- **[×]** Remove mapping — clears dropdown, row reverts to unmapped
- **[+]** Add additional source — for many-to-one, adds a sub-row:

```
│  ☐   │ Mega Tree             │ [MEGATREE          ▾]    │        │ 105   │ ✓      │
│      │                       │ [MEGATREE 2        ▾]    │        │ 105   │ ✓ +1   │
│      │                       │ [+ Add source]           │        │       │        │
```

---

## Summary Footer

Persistent footer at bottom of table, updates live:

```
150 models · 89 mapped · 27 suggested · 34 unmapped
```
