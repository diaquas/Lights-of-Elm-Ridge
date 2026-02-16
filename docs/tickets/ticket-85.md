# Ticket 85 — Redesign Sequence Product Page Info Cards

**Priority:** P1 — Storefront improvement
**Applies to:** All sequence product pages on lightsofelmridge.com
**Reference mockup:** `sequence-product-cards.jsx`

---

## The Problem

The three cards below the hero on each sequence product page (What's Included, Props & Models, About This Sequence) are flat, spec-heavy, and don't answer what buyers actually care about:

1. **"Will this work on my display?"** — The Props & Models card shows pill tags with no context. "Showstopper Spinners" doesn't tell a buyer how many spinners, which models, or what level of detail.
2. **"How easy is the adaptation?"** — Mod:IQ isn't mentioned anywhere on the product page. Buyers don't know that adaptation is automatic and included free.
3. **What's Included reads like a receipt** — xLights (.xsq) and FSEQ listed separately, "Compatible with xLights 2024.15+" is table-stakes nobody cares about, videos and images aren't listed.

---

## The Redesign: Three Cards, New Purpose

### Card 1: "Works With Your Display" (full width, hero position)

The biggest card. Answers the #1 buyer question: what props does this sequence support?

**Layout:**
- Full-width card spanning both columns
- Title: **"Works With Your Display"**
- Subtitle: "This sequence was built for these props. Don't have an exact match? Mod:IQ adapts it."
- Prop grid: responsive auto-fill grid of prop cards (5 props for Darkside)

**Each prop card contains:**
- SVG icon (consistent line-art style, not emoji)
- Prop name (bold)
- Detail line in mono font: dimensions, count, effect type
- Tags where applicable: `MATRIX` (red), `HD` (red)

**Prop card icons** (use Lucide or equivalent SVG line icons):

| Prop | Icon | Detail |
|---|---|---|
| Matrix | Grid/layout icon | 70×100 · Video effects |
| Singing Pumpkin | Microphone icon | 263px · Face animations |
| Fireworks | Sparkles/star icon | 2 props · Burst patterns |
| Spinners | Sun/radial icon | 7 props · 3 Showstopper, GE Overlord, Fuzion, Rosa Grande, Click Click Boom |
| Pixel Forest | Tree icon | 2 trees · Chase effects |

**Spinner consolidation:** Don't list individual spinner models as separate cards. One "Spinners" card with the vendor breakdown in the detail line.

**Bottom row:** Stats on the left (165 models · 25 groups · 4,852 effects · 3:42), "See our display →" CTA button on the right linking to the display page.

### Card 2: "Different props? No problem." (left column)

The Mod:IQ conversion card. Directly addresses purchase anxiety about display compatibility.

**Layout:**
- Mod:IQ logo (actual wordmark, not placeholder) at top
- Headline: **"Different props? No problem."**
- Body: "Mod:IQ intelligently maps this sequence to your display — even if your props don't match exactly. Spinners, arches, matrices, pixel trees — it figures out what goes where."
- Mini flow diagram: `Their Display (165 models) —🔗— Your Display (Any layout)`
- Footer: *"Included free with every sequence purchase."*

**Flow diagram:** Simple three-part inline: source label, red link icon with connecting lines, destination label. Communicates the mapping concept at a glance.

### Card 3: About + What's Included (right column)

Merged into one card. Description on top, What's Included at the bottom.

**Layout:**
- Title: **"About This Sequence"**
- Description paragraph (tightened copy, no bullet lists)
- Feature tags as compact inline pills (not bullets): "Bass-reactive effects", "Dramatic build-ups", "Cinematic matrix visuals", "Dark palette + bright accents"
- Divider
- "WHAT'S INCLUDED" section at bottom

**What's Included order (updated):**
1. **Mod:IQ auto-mapping** — Lead item, uses actual Mod:IQ wordmark logo, "Auto-mapping included" text
2. ✓ xLights (.xsq)
3. ✓ FSEQ
4. ✓ All Videos
5. ✓ All Images
6. ✓ Lifetime access

**Removed:** "Compatible with xLights 2024.15+" — table-stakes, not a selling point.

---

## Brand Color: Red (#e8432a) Everywhere

All accent colors use the site's brand red:
- Link icon in the flow diagram → red
- Connecting lines → red (with alpha)
- Mod:IQ card accent glow → red radial gradient
- MATRIX and HD tags → red bg + red text
- "See our display →" CTA → red
- Prop card hover state → subtle red tint

No teal, no purple, no blue accents. Red is the brand.

---

## Mod:IQ Logo

Use the actual Mod:IQ wordmark asset (`modiq-wordmark-v3-full.png` or equivalent SVG). The logo is white + red on dark backgrounds. It appears in two places:

1. **Card 2** — Top of the Mod:IQ adaptation card, standalone
2. **Card 3** — What's Included section, inline next to "Auto-mapping included"

In both cases, render the logo at appropriate height (12–16px) using an `<img>` tag referencing the site's asset path. Do not recreate the logo with text — use the actual file.

---

## "See Our Display" CTA

Bottom-right of Card 1. Links to the display overview page where buyers can see the house layout, model inventory, and prop breakdown.

**Styling:**
- Subtle red pill button: `rgba(232,67,42,0.06)` background, `1px solid rgba(232,67,42,0.12)` border
- Text: "See our display" + right arrow icon
- Hover: background darkens slightly
- Not a primary CTA — the buy button elsewhere on the page is primary. This is informational.

---

## Responsive Behavior

- **Card 1 prop grid:** `grid-template-columns: repeat(auto-fill, minmax(190px, 1fr))` — wraps naturally on mobile
- **Cards 2+3:** Side by side on desktop (`grid-template-columns: 1fr 1fr`), stack vertically on mobile
- **Feature tags:** flex-wrap, flow to next line on narrow screens

---

## Implementation Notes

- These cards replace the existing What's Included, Props & Models, and About This Sequence cards on every sequence product page
- The prop data (names, details, icons, tags) varies per sequence — pull from the sequence's metadata
- The stats (models, groups, effects, runtime) pull from sequence metadata
- The description and feature tags pull from sequence metadata / CMS
- What's Included is the same across all sequences (Mod:IQ + xsq + FSEQ + Videos + Images + Lifetime access)
