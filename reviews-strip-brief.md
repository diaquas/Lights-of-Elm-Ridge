# Review Strips — Homepage & Sequences Page
## Implementation Brief for Claude Code

---

## Overview

Add customer review displays to two pages. Reviews are sourced from xlightsseq.com (third-party platform) and should be attributed as such for credibility.

Current reviews available (all 5-star):

| User | Date | Quote | Source sequence |
|---|---|---|---|
| chromewolf7 | Sep 2025 | "Pretty dang good, and easy to apply" | (general) |
| Anonymous | Nov 2025 | "My kiddo's favorite song so had to find a sequence for it and this one hit just right. Love the classic Skeleton Dance video and good timing of effects with the dub step. Thank you!" | Spooky Scary Skeletons |
| joeally06 | Sep 2025 | "Great Job on this." | (general) |

---

## Page 1: Homepage — Social Proof Strip

Positioned **below the Latest Drops section and above the Stats Bar**. Light and compact — credibility signal, not a feature section.

### Layout

Three reviews in a horizontal row. Each is a small card with stars, quote, and username.

### HTML

```html
<section class="reviews-strip">
  <div class="reviews-strip-header">
    <span class="reviews-strip-title">What People Are Saying</span>
    <a href="https://xlightsseq.com/" class="reviews-strip-source" target="_blank" rel="noopener">
      via xlightsseq.com ↗
    </a>
  </div>
  <div class="reviews-strip-grid">

    <div class="review-card">
      <div class="review-stars">★★★★★</div>
      <p class="review-quote">"My kiddo's favorite song so had to find a sequence for it and this one hit just right. Love the classic Skeleton Dance video and good timing of effects with the dub step."</p>
      <div class="review-meta">
        <span class="review-user">Anonymous</span>
        <span class="review-date">Nov 2025</span>
      </div>
    </div>

    <div class="review-card">
      <div class="review-stars">★★★★★</div>
      <p class="review-quote">"Pretty dang good, and easy to apply"</p>
      <div class="review-meta">
        <span class="review-user">chromewolf7</span>
        <span class="review-date">Sep 2025</span>
      </div>
    </div>

    <div class="review-card">
      <div class="review-stars">★★★★★</div>
      <p class="review-quote">"Great Job on this."</p>
      <div class="review-meta">
        <span class="review-user">joeally06</span>
        <span class="review-date">Sep 2025</span>
      </div>
    </div>

  </div>
</section>
```

### CSS

```css
.reviews-strip {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 0 var(--page-gutter) 24px;
}

.reviews-strip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.reviews-strip-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
}

.reviews-strip-source {
  font-size: 11px;
  color: var(--text-tertiary);
  text-decoration: none;
  font-weight: 500;
}

.reviews-strip-source:hover {
  color: var(--text-secondary);
}

.reviews-strip-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.review-card {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.review-stars {
  color: #facc15;
  font-size: 13px;
  letter-spacing: 1px;
}

.review-quote {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  flex: 1;
}

.review-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.review-user {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.review-date {
  font-size: 11px;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .reviews-strip-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
```

### Homepage Section Order (updated)

```
Hero
Latest Drops (4 sequence cards)
Reviews Strip        ← NEW
Stats Bar
Footer
```

---

## Page 2: Sequences Page — Review Section

Positioned **above the "Built For" props strip** (which we designed in the sequences cleanup brief). More prominent than the homepage version since visitors here are in shopping/evaluation mode.

### Layout

Full-width section with all reviews shown. Includes a header with aggregate star rating and link to xlightsseq.com.

### HTML

```html
<section class="seq-reviews">
  <div class="seq-reviews-header">
    <div class="seq-reviews-header-left">
      <h2 class="seq-reviews-title">Customer Reviews</h2>
      <div class="seq-reviews-aggregate">
        <span class="seq-reviews-stars">★★★★★</span>
        <span class="seq-reviews-count">5.0 from 3 reviews</span>
      </div>
    </div>
    <a href="https://xlightsseq.com/" class="seq-reviews-source" target="_blank" rel="noopener">
      Reviews from xlightsseq.com ↗
    </a>
  </div>

  <div class="seq-reviews-grid">

    <div class="seq-review">
      <div class="seq-review-top">
        <span class="seq-review-stars">★★★★★</span>
        <span class="seq-review-date">Nov 2025</span>
      </div>
      <p class="seq-review-quote">"My kiddo's favorite song so had to find a sequence for it and this one hit just right. Love the classic Skeleton Dance video and good timing of effects with the dub step. Thank you!"</p>
      <div class="seq-review-bottom">
        <span class="seq-review-user">Anonymous</span>
        <span class="seq-review-seq">Spooky Scary Skeletons</span>
      </div>
    </div>

    <div class="seq-review">
      <div class="seq-review-top">
        <span class="seq-review-stars">★★★★★</span>
        <span class="seq-review-date">Sep 2025</span>
      </div>
      <p class="seq-review-quote">"Pretty dang good, and easy to apply"</p>
      <div class="seq-review-bottom">
        <span class="seq-review-user">chromewolf7</span>
      </div>
    </div>

    <div class="seq-review">
      <div class="seq-review-top">
        <span class="seq-review-stars">★★★★★</span>
        <span class="seq-review-date">Sep 2025</span>
      </div>
      <p class="seq-review-quote">"Great Job on this."</p>
      <div class="seq-review-bottom">
        <span class="seq-review-user">joeally06</span>
      </div>
    </div>

  </div>
</section>
```

### CSS

```css
.seq-reviews {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid var(--surface-border);
}

.seq-reviews-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
}

.seq-reviews-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.seq-reviews-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 800;
}

.seq-reviews-aggregate {
  display: flex;
  align-items: center;
  gap: 8px;
}

.seq-reviews-stars {
  color: #facc15;
  font-size: 14px;
  letter-spacing: 1px;
}

.seq-reviews-count {
  font-size: 13px;
  color: var(--text-secondary);
}

.seq-reviews-source {
  font-size: 12px;
  color: var(--text-tertiary);
  text-decoration: none;
  font-weight: 500;
  flex-shrink: 0;
}

.seq-reviews-source:hover {
  color: var(--accent);
}

.seq-reviews-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.seq-review {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.seq-review-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.seq-review-stars {
  color: #facc15;
  font-size: 13px;
  letter-spacing: 1px;
}

.seq-review-date {
  font-size: 11px;
  color: var(--text-tertiary);
}

.seq-review-quote {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.55;
  flex: 1;
}

.seq-review-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}

.seq-review-user {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.seq-review-seq {
  font-size: 11px;
  color: var(--text-tertiary);
  font-style: italic;
}

@media (max-width: 768px) {
  .seq-reviews-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .seq-reviews-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
```

### Sequences Page Section Order (updated)

```
Hero + filters
Sequence cards
Customer Reviews      ← NEW
Built For props strip
Info bar (xLights native · previews · etc.)
Footer
```

---

## Key Differences Between the Two Placements

| | Homepage | Sequences Page |
|---|---|---|
| **Purpose** | Credibility signal for new visitors | Purchase reinforcement for shoppers |
| **Header** | "What People Are Saying" | "Customer Reviews" with aggregate rating |
| **Detail level** | Compact | Shows which sequence was reviewed |
| **Attribution** | Small "via xlightsseq.com ↗" | More prominent "Reviews from xlightsseq.com ↗" |
| **Position** | Between Latest Drops and Stats Bar | Between sequence cards and Built For strip |

---

## Future Considerations

- As more reviews come in, rotate the homepage to show the 3 most descriptive/recent ones
- On the sequences page, reviews could eventually be filterable or linked to individual sequence cards
- If reviews exceed 6+, consider a horizontal scroll or "show more" pattern instead of a growing grid
- Individual sequence detail pages could show their own specific reviews from xlightsseq.com
