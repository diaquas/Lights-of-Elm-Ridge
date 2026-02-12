# Ticket 54 — Stepper Bar Redesign

## Problem
The stepper row is cramped and inconsistent. Pills vary in height due to text wrapping ("Auto-Matches", "Submodel Groups"), the status bars at the end feel squeezed in, and the overall row tries to do too much in one horizontal line.

## Proposed Redesign

### Split into two rows

**Row 1 — Stepper pills (navigation/progress)**
**Row 2 — Status summary bar**

This gives each layer room to breathe and creates clear visual separation between "where am I in the flow" and "how am I doing overall."

---

### Row 1: Stepper Pills

```
 ✓ Upload  ——  ✓ Auto-Matches (117)  ——  ✓ Groups (9)  ——  ✓ Models (53)  ——  ✓ Submodels (83)  ——  ◉ Review
```

- **Fixed pill height** for all steps: `min-height: 2.5rem` (~40px), vertically centered text
- **Uniform width**: set a consistent `min-width` (~120px) so pills feel balanced — no more some being tiny and others wide
- Connector dashes between pills (keep existing style)
- Active step gets the red/highlighted treatment (current behavior)
- Completed steps get green check + green border (current behavior)
- Shorten "Submodel Groups" → **"Submodels"** in the pill only (the page content can still say "Submodel Groups") — this avoids two-line wrapping entirely
- Count badges stay inline on the pill

### Row 2: Status Summary Bar

Pull the two status indicators (effects covered %, models mapped) out of the stepper row and into their own dedicated bar directly below.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🔒 Effects Covered   ████░░░░░░░░░░░░░░░  18%  (36/201)     │     📦 Models Mapped   ██░░░░░░░░░░░░░░░░░░  8%  (398/4.9K)  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Full-width bar, subtle background (`#1f2937` or similar dark card)
- Two progress bars side by side, each taking ~50% width
- Progress bars are taller than current (~8–10px height) for better visibility
- Color-coded: use the existing orange/yellow dot colors for the bar fill
- Label + percentage + fraction all on one line per bar
- This row is **always visible** regardless of which step you're on — it's a persistent status dashboard

---

### Spacing & Layout

```
┌─ Header (Mod:IQ logo + sequence name + Export) ──────────────────────┐
│                                                                       │
├─ Row 1: Stepper Pills ──────────────────────────────────────────────-─┤
│  ✓ Upload — ✓ Auto-Matches (117) — ✓ Groups (9) — ...  ◉ Review     │
│                                                                       │
├─ Row 2: Status Summary ─────────────────────────────────────────────-─┤
│  🔒 18% effects covered (36/201)  ·  📦 8% models mapped (398/4.9K)  │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░   ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                                       │
├─ Content area ───────────────────────────────────────────────────────-─┤
│  < Back                    8% effects covered · 36/201 models active  │
│                                                                       │
```

- Small gap between Row 1 and Row 2 (`0.5rem`)
- Row 2 has subtle top border or slight background difference to separate from stepper
- The inline "8% effects covered · 36/201 models active" text below the back button may become redundant — consider removing it once Row 2 is in place, or keep it as a compact repeat for the content area

## Summary
The key insight: **separate navigation from status**. The stepper should only answer "where am I?" and the status bar should answer "how am I doing?" Combining them into one row is what's causing the cramped, inconsistent feel.
