# Lights of Elm Ridge - Backlog

Generated: 2026-02-01

This document contains all backlog items identified by our review agents. Each item is formatted for easy GitHub issue creation.

---

## HIGH PRIORITY

### UX/Design

#### Image Optimization & Lazy Loading
**Labels:** `high-priority`, `performance`, `ux`

The project uses `unoptimized: true` in next.config.ts, disabling Next.js image optimization. Images in `/public` are large (1.4MB gbdet.png, 891KB family.jpg, 555KB spookymain.png).

**Tasks:**
- [ ] Convert images to WebP/AVIF for 30-40% size reduction
- [ ] Create responsive image variants (mobile, tablet, desktop)
- [ ] Add blur placeholder effects for better perceived performance
- [ ] Migrate SequenceCardOverlay from `<img>` to Next.js Image component
- [ ] Set explicit width/height on all Image components to prevent CLS

---

#### Mobile Navigation & Tab Overflow
**Labels:** `high-priority`, `ux`, `mobile`

Tab buttons in `/sequences` have fixed `min-w-[280px]` which causes overflow on mobile screens <375px.

**Tasks:**
- [ ] Make tab buttons responsive with flex-wrap
- [ ] Test on screens 320px-390px wide
- [ ] Add horizontal scroll or stacked layout for mobile

---

#### Accessibility (a11y) Improvements
**Labels:** `high-priority`, `accessibility`

Several critical a11y gaps need addressing.

**Tasks:**
- [ ] Add alt attributes to all images (sequence thumbnails)
- [ ] Add aria-labels to share buttons
- [ ] Add visible focus states to all interactive elements
- [ ] Add skip navigation link to main content
- [ ] Add proper ARIA attributes to tab selection (aria-selected, aria-controls)
- [ ] Add labels to newsletter form inputs
- [ ] Ensure color contrast meets WCAG AA standards

---

#### Call-to-Action Clarity
**Labels:** `high-priority`, `ux`, `conversion`

"Browse Sequences" appears 5+ times on homepage creating decision paralysis. No clear visual hierarchy for CTAs.

**Tasks:**
- [ ] Reduce CTA repetition to 1-2 primary CTAs per page
- [ ] Create visual hierarchy distinguishing primary vs secondary CTAs
- [ ] Make "Currently available on xlightsseq.com" notice more prominent
- [ ] Add warning when "Buy Now" redirects to external site

---

### Technical/Performance

#### Dynamic Sitemap Generation
**Labels:** `high-priority`, `seo`, `technical`

No sitemap.xml exists for search engine indexing.

**Tasks:**
- [ ] Create `src/app/sitemap.ts` to generate sitemap.xml dynamically
- [ ] Include all sequence pages via getAllSlugs()
- [ ] Set appropriate priority and changefreq
- [ ] Create `public/robots.txt` referencing sitemap
- [ ] Submit to Google Search Console

---

#### Structured Data (JSON-LD)
**Labels:** `high-priority`, `seo`

Missing structured data for search engines.

**Tasks:**
- [ ] Add Organization schema in root layout
- [ ] Add Product schema for sequence detail pages
- [ ] Add BreadcrumbList schema on sequence detail pages
- [ ] Add AggregateOffer schema on sequences listing page

---

#### Security Headers
**Labels:** `high-priority`, `security`

No security headers configured for Cloudflare Pages.

**Tasks:**
- [ ] Create `public/_headers` file with:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Content-Security-Policy for YouTube embeds

---

#### Newsletter Integration
**Labels:** `high-priority`, `feature`

Newsletter form only stores to localStorage - data is lost on browser clear.

**Tasks:**
- [ ] Integrate with Mailchimp, ConvertKit, or similar service
- [ ] Add proper error handling and validation
- [ ] Implement double opt-in flow
- [ ] Add unsubscribe and preference management

---

#### Environment Configuration
**Labels:** `high-priority`, `technical`

Hardcoded URLs and no environment variable setup.

**Tasks:**
- [ ] Create `.env.example` documenting all environment variables
- [ ] Move hardcoded URLs (xlightsseq.com, YouTube channel) to env vars
- [ ] Document Cloudflare Pages environment setup

---

### Content/Features

#### Search & Advanced Filtering
**Labels:** `high-priority`, `feature`, `ux`

No search functionality exists. Users can't filter sequences effectively.

**Tasks:**
- [ ] Implement search box in navbar
- [ ] Add faceted filters: difficulty, duration, price range, props required
- [ ] Add "Show sequences compatible with my props" feature

---

#### Customer Testimonials & Social Proof
**Labels:** `high-priority`, `content`, `conversion`

No customer testimonials or social proof on the site.

**Tasks:**
- [ ] Add customer testimonials section on homepage
- [ ] Create customer showcase gallery with display photos
- [ ] Add review/rating system for sequences
- [ ] Display download counts on product cards

---

#### Fix Missing Sequence URLs
**Labels:** `high-priority`, `bug`, `data`

Several sequences have missing xlightsSeqUrl values blocking purchases.

**Affected sequences:** IDs 7, 9, 12, 15, 16, 18, 19, 20, 25, 27, 29, 30, 32, 33, 34, 35

**Tasks:**
- [ ] Audit all sequences for missing xlightsSeqUrl
- [ ] Add fallback purchase buttons or complete missing data
- [ ] Add missing youtubeId/videoPreview where applicable

---

#### Product Bundles & Package Deals
**Labels:** `high-priority`, `feature`, `revenue`

No bundle offerings to increase average order value.

**Tasks:**
- [ ] Create "Complete Halloween Show" bundle
- [ ] Create "Kids Friendly Bundle"
- [ ] Create "Beginner Starter Pack"
- [ ] Implement bundle pricing at 15-20% discount

---

---

## MEDIUM PRIORITY

### UX/Design

#### Loading States & Skeleton Screens
**Labels:** `medium-priority`, `ux`

No loading feedback for users.

**Tasks:**
- [ ] Add skeleton screens for sequence cards
- [ ] Add loading indicator for YouTube embeds
- [ ] Add fade-in effect for lazy-loaded images

---

#### Share Button Functionality
**Labels:** `medium-priority`, `feature`

Share buttons on sequence detail page are non-functional.

**Tasks:**
- [ ] Implement working Facebook/Twitter share buttons
- [ ] Add copy link functionality with feedback
- [ ] Add Open Graph meta tags for social preview

---

#### Error Handling Improvements
**Labels:** `medium-priority`, `ux`

Error states are too generic.

**Tasks:**
- [ ] Improve error.tsx with recovery information
- [ ] Add error message if YouTube embed fails
- [ ] Add search box to 404 page

---

### Technical/Performance

#### Open Graph & Twitter Cards
**Labels:** `medium-priority`, `seo`

Sequence pages need better social media metadata.

**Tasks:**
- [ ] Add og:image from artworkUrl
- [ ] Add og:type = "product"
- [ ] Add og:price, og:priceCurrency
- [ ] Add Twitter Card type: "product"
- [ ] Add canonical URLs

---

#### TypeScript Type Safety
**Labels:** `medium-priority`, `technical`

Some type safety improvements needed.

**Tasks:**
- [ ] Add strict null checks for sequence optional fields
- [ ] Create discriminated union types for sequence.category
- [ ] Create constants file for string literals
- [ ] Add type validation for sequence data at module load

---

#### Testing Framework Setup
**Labels:** `medium-priority`, `technical`, `testing`

No tests exist in the codebase.

**Tasks:**
- [ ] Install Vitest and @testing-library/react
- [ ] Create tests for data transformations
- [ ] Create component rendering tests
- [ ] Target 60%+ code coverage

---

#### Lighthouse CI Pipeline
**Labels:** `medium-priority`, `technical`, `performance`

No automated performance monitoring.

**Tasks:**
- [ ] Set up Lighthouse CI in build process
- [ ] Set thresholds: Performance 90+, Accessibility 95+, SEO 95+
- [ ] Track metrics over time

---

#### HTTP Caching Headers
**Labels:** `medium-priority`, `performance`

No caching configured for static assets.

**Tasks:**
- [ ] Add cache headers for immutable assets (max-age=31536000)
- [ ] Add cache headers for HTML pages (max-age=3600)
- [ ] Enable compression in Cloudflare

---

### Content/Features

#### FAQ Page
**Labels:** `medium-priority`, `content`

No dedicated FAQ page for common questions.

**Tasks:**
- [ ] Create comprehensive FAQ covering licensing, compatibility, refunds
- [ ] Link prominently from navbar and sequences page

---

#### Sequence Comparison Tool
**Labels:** `medium-priority`, `feature`

No way to compare sequences side-by-side.

**Tasks:**
- [ ] Allow comparing 2-3 sequences
- [ ] Show: price, duration, difficulty, props required, video preview

---

#### Display Specifications Page
**Labels:** `medium-priority`, `content`

No detailed hardware/setup information.

**Tasks:**
- [ ] Create "About the Display" page with specs
- [ ] Add hardware specs, xLights version, controller setup
- [ ] Consider "Can I run this?" compatibility checker

---

#### Blog/Tutorial Content Hub
**Labels:** `medium-priority`, `content`, `seo`

No blog or tutorial content for SEO.

**Tasks:**
- [ ] Create blog section
- [ ] Write "Choosing Your First Sequence" guide
- [ ] Write "How to Remap Sequences" tutorial
- [ ] Write "xLights Setup for Beginners" guide

---

#### Customer Reviews & Ratings
**Labels:** `medium-priority`, `feature`

No review/rating capability.

**Tasks:**
- [ ] Add 5-star rating system on sequences
- [ ] Show average rating on listing pages
- [ ] Collect reviews post-purchase

---

---

## LOW PRIORITY

### UX/Design

#### Micro-interactions & Polish
**Labels:** `low-priority`, `ux`

- [ ] Add fade-in animations for lazy-loaded images
- [ ] Button press feedback (scale/shadow)
- [ ] Hover underline animations for links
- [ ] Scroll indicator fade out

---

#### Footer Optimization
**Labels:** `low-priority`, `ux`

- [ ] Add newsletter signup in footer
- [ ] Add warning for external links opening in new tabs
- [ ] Consider adding quick stats or latest sequences

---

#### Typography Refinements
**Labels:** `low-priority`, `ux`

- [ ] Standardize heading sizes across pages
- [ ] Increase body text line-height
- [ ] Standardize padding/margin in cards

---

### Technical/Performance

#### Component Documentation
**Labels:** `low-priority`, `technical`

- [ ] Add JSDoc comments to all components
- [ ] Consider Storybook for visual testing
- [ ] Document design system

---

#### ESLint Accessibility Plugin
**Labels:** `low-priority`, `technical`, `accessibility`

- [ ] Install eslint-plugin-jsx-a11y
- [ ] Enable ARIA validation rules
- [ ] Fix Navigation mobile menu labels

---

#### Git Hooks
**Labels:** `low-priority`, `technical`

- [ ] Setup Husky for pre-commit hooks
- [ ] Add ESLint/Prettier check
- [ ] Add TypeScript type checking

---

### Content/Features

#### Gift Card System
**Labels:** `low-priority`, `feature`

- [ ] Create $25/$50/$100 gift cards
- [ ] Implement gift card redemption

---

#### Referral Program
**Labels:** `low-priority`, `feature`

- [ ] "Refer a friend" program with credit for both parties

---

#### Behind-the-Scenes Content
**Labels:** `low-priority`, `content`

- [ ] Complete promised xLights Masterclass content
- [ ] Add Hardware Deep Dives
- [ ] Add Build Logs

---

#### Social Media Integration
**Labels:** `low-priority`, `feature`

- [ ] Add social sharing buttons on sequences
- [ ] Create Instagram shoppable posts integration
- [ ] YouTube Shorts for sequence clips

---

---

## Summary by Category

| Category | High | Medium | Low | Total |
|----------|------|--------|-----|-------|
| UX/Design | 4 | 3 | 3 | 10 |
| Technical | 5 | 5 | 3 | 13 |
| Content/Features | 4 | 5 | 4 | 13 |
| **Total** | **13** | **13** | **10** | **36** |

## Recommended Implementation Order

### Phase 1 - Foundation (Critical Path)
1. Fix missing sequence URLs (blocking revenue)
2. Newsletter integration (capture leads)
3. Sitemap + robots.txt (SEO foundation)
4. Security headers (security baseline)
5. Image optimization (performance)

### Phase 2 - Conversion Optimization
6. Search & filtering
7. Customer testimonials
8. Call-to-action cleanup
9. Product bundles
10. Accessibility fixes

### Phase 3 - Growth & Polish
11. Structured data
12. Share functionality
13. FAQ page
14. Reviews & ratings
15. Loading states

---

## FUTURE FEATURES

### Shopping List Wizard
**Labels:** `future`, `feature`, `ux`

Interactive tool to help users build custom shopping lists based on their experience level, budget, and display goals.

**Core Features:**
- [ ] Quick survey: experience level (beginner/intermediate/advanced)
- [ ] Budget input with price range filtering
- [ ] Location selection for vendor availability
- [ ] Display size/type selection (small yard, medium, large, mega)
- [ ] Holiday focus (Halloween, Christmas, year-round)

**Output:**
- [ ] Personalized product list with quantities
- [ ] Estimated total cost
- [ ] Direct links to recommended vendors
- [ ] "Starter pack" vs "complete display" options
- [ ] PDF export for shopping reference

**Technical Considerations:**
- [ ] Store preferences in localStorage
- [ ] Product database with pricing tiers
- [ ] Vendor availability by region
- [ ] Bundle suggestions for cost savings
