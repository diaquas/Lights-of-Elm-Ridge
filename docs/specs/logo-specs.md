# Logo Implementation — Variant B (Stacked Compact)
## Specs for Claude Code

---

## Files

- `logo-full.svg` — Full wordmark for nav bar and general use
- `favicon.svg` — Favicon mark (L + red bars)

Both are in the repo. Use them directly or reference the CSS below to render the logo as styled text (better for flexibility/responsive).

---

## Logo Structure

Stacked two-line wordmark, left-aligned:

```
LIGHTS          ← Syne 800, 16px, #f4f4f5, letter-spacing: 0.04em
of ELM RIDGE    ← "of" Syne 600, 8px, #ef4444 | "ELM RIDGE" Syne 700, 10px, #a1a1aa, letter-spacing: 0.12em
```

---

## CSS Implementation (preferred over SVG for nav)

```css
.site-logo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-family: 'Syne', sans-serif;
  line-height: 1;
  gap: 1px;
  text-decoration: none;
}

.site-logo-top {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #f4f4f5;
}

.site-logo-bottom {
  display: flex;
  align-items: center;
  gap: 4px;
}

.site-logo-of {
  font-size: 8px;
  font-weight: 600;
  color: #ef4444;
  letter-spacing: 0.05em;
  text-transform: lowercase;
}

.site-logo-place {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #a1a1aa;
  text-transform: uppercase;
}
```

## HTML

```html
<a href="/" class="site-logo">
  <span class="site-logo-top">LIGHTS</span>
  <span class="site-logo-bottom">
    <span class="site-logo-of">of</span>
    <span class="site-logo-place">Elm Ridge</span>
  </span>
</a>
```

---

## Favicon

The favicon is an "L" in Syne 800 white on dark background (#0b0b0e) with three red bars stacked vertically to the right:
- Top bar: #ef4444 at full opacity
- Middle bar: #ef4444 at 60% opacity  
- Bottom bar: #ef4444 at 30% opacity

Rounded corners on the background (rx="6" at 32px).

### Usage
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
```

For broader browser support, also generate a `favicon.ico` from the SVG at 16×16, 32×32, and 48×48.

---

## Where to Replace

1. **Nav bar** — Replace the current logo image with the CSS wordmark above
2. **Favicon** — Replace with `favicon.svg`
3. **Footer** — If the logo appears in the footer, use the same CSS wordmark (can be slightly smaller, e.g. scale to 90%)
4. **Open Graph / social sharing image** — Will need a separate og-image with the logo on dark background (can do later)

---

## Design Tokens Reference

```
Primary text:    #f4f4f5
Secondary text:  #a1a1aa
Accent red:      #ef4444
Background:      #0b0b0e
Font:            Syne (Google Fonts) — weights 600, 700, 800
```

---

## Notes

- CSS text rendering is preferred over the SVG in the nav for crispness and easy tweaking
- The SVG files are provided as assets for contexts where an image file is needed (README badges, external embeds, etc.)
- The logo should link to `/` (homepage)
- No hover effects on the logo — just a cursor pointer
