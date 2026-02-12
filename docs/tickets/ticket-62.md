# Ticket 62 — Finalize Phase: Filters & Sorts

---

## Quick Filter Pills

Horizontal pill row above the search bar, same pattern as the Auto-Match phase:

```
[All (150)]  [Groups (14)]  [Models (45)]  [Submodels (91)]
```

- One active at a time, default is All
- Counts update live as mappings change
- Filters the table/card list to only show that type
- Active pill uses the same highlighted style as Auto-Match phase pills

---

## Status Filter Dropdown

Separate dropdown to the right of the quick filter pills, combining with them (AND logic):

```
Status: [All ▾]
```

Options:
- **All** (default)
- **Unmapped** — no source assigned
- **Suggested** — has AI suggestion, not yet accepted
- **Mapped** — source assigned (manually or via accepted suggestion)
- **Multi-mapped** — receiving from 2+ sources

Combining with quick filters: selecting "Submodels" pill + "Unmapped" status = only unmapped submodels. Counts in quick filter pills should update to reflect the active status filter.

---

## Sort Dropdown

Single dropdown, right of the status filter:

```
Sort: [Unmapped First ▾]
```

Options:
- **Unmapped First** (default) — unmapped → suggested → mapped
- **Match Confidence High→Low** — best AI suggestions at top for rapid-fire accepting
- **Effect Count High→Low** — prioritize high-content models
- **Effect Count Low→High** — find low-value items to skip
- **Name A→Z**
- **Name Z→A**

---

## Full Controls Layout

```
[All (150)]  [Groups (14)]  [Models (45)]  [Submodels (91)]

🔍 Search models...          Status: [All ▾]     Sort: [Unmapped First ▾]
```

- Quick filter pills on their own row for prominence
- Search, status filter, and sort on the row below
- All three interact: pills filter by type, dropdown filters by status, sort orders the result
- When any filter is active (not All), show a "Clear filters" link to reset everything
