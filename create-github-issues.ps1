# Lights of Elm Ridge - GitHub Issues Creator
# Run this after: gh auth login

$repo = "diaquas/Lights-of-Elm-Ridge"

Write-Host "Creating GitHub Issues for Lights of Elm Ridge..." -ForegroundColor Cyan
Write-Host ""

# HIGH PRIORITY ISSUES

Write-Host "[1/36] Creating: Image Optimization & Lazy Loading" -ForegroundColor Yellow
gh issue create --repo $repo --title "Image Optimization & Lazy Loading" --label "high-priority,performance,ux" --body @"
The project uses ``unoptimized: true`` in next.config.ts, disabling Next.js image optimization. Images in ``/public`` are large (1.4MB gbdet.png, 891KB family.jpg).

**Tasks:**
- [ ] Convert images to WebP/AVIF for 30-40% size reduction
- [ ] Create responsive image variants (mobile, tablet, desktop)
- [ ] Add blur placeholder effects
- [ ] Migrate SequenceCardOverlay to Next.js Image component
- [ ] Set explicit width/height on all Images to prevent CLS
"@

Write-Host "[2/36] Creating: Mobile Navigation & Tab Overflow" -ForegroundColor Yellow
gh issue create --repo $repo --title "Mobile Navigation & Tab Overflow" --label "high-priority,ux,mobile" --body @"
Tab buttons in ``/sequences`` have fixed ``min-w-[280px]`` which causes overflow on mobile screens <375px.

**Tasks:**
- [ ] Make tab buttons responsive with flex-wrap
- [ ] Test on screens 320px-390px wide
- [ ] Add horizontal scroll or stacked layout for mobile
"@

Write-Host "[3/36] Creating: Accessibility (a11y) Improvements" -ForegroundColor Yellow
gh issue create --repo $repo --title "Accessibility (a11y) Improvements" --label "high-priority,accessibility" --body @"
Several critical a11y gaps need addressing.

**Tasks:**
- [ ] Add alt attributes to all images
- [ ] Add aria-labels to share buttons
- [ ] Add visible focus states to all interactive elements
- [ ] Add skip navigation link
- [ ] Add proper ARIA attributes to tabs
- [ ] Add labels to newsletter form inputs
- [ ] Ensure color contrast meets WCAG AA
"@

Write-Host "[4/36] Creating: Call-to-Action Clarity" -ForegroundColor Yellow
gh issue create --repo $repo --title "Call-to-Action Clarity" --label "high-priority,ux,conversion" --body @"
Browse Sequences appears 5+ times on homepage creating decision paralysis.

**Tasks:**
- [ ] Reduce CTA repetition to 1-2 per page
- [ ] Create visual hierarchy for CTAs
- [ ] Make xlightsseq.com notice more prominent
- [ ] Add warning when Buy Now redirects externally
"@

Write-Host "[5/36] Creating: Dynamic Sitemap Generation" -ForegroundColor Yellow
gh issue create --repo $repo --title "Dynamic Sitemap Generation" --label "high-priority,seo,technical" --body @"
No sitemap.xml exists for search engine indexing.

**Tasks:**
- [ ] Create ``src/app/sitemap.ts``
- [ ] Include all sequence pages
- [ ] Create ``public/robots.txt``
- [ ] Submit to Google Search Console
"@

Write-Host "[6/36] Creating: Structured Data (JSON-LD)" -ForegroundColor Yellow
gh issue create --repo $repo --title "Structured Data (JSON-LD)" --label "high-priority,seo" --body @"
Missing structured data for search engines.

**Tasks:**
- [ ] Add Organization schema in root layout
- [ ] Add Product schema for sequence detail pages
- [ ] Add BreadcrumbList schema
- [ ] Add AggregateOffer schema on sequences page
"@

Write-Host "[7/36] Creating: Security Headers" -ForegroundColor Yellow
gh issue create --repo $repo --title "Security Headers" --label "high-priority,security" --body @"
No security headers configured for Cloudflare Pages.

**Tasks:**
- [ ] Create ``public/_headers`` file with:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Content-Security-Policy for YouTube embeds
"@

Write-Host "[8/36] Creating: Newsletter Integration" -ForegroundColor Yellow
gh issue create --repo $repo --title "Newsletter Integration" --label "high-priority,feature" --body @"
Newsletter form only stores to localStorage - data is lost on browser clear.

**Tasks:**
- [ ] Integrate with Mailchimp/ConvertKit
- [ ] Add proper error handling
- [ ] Implement double opt-in flow
- [ ] Add unsubscribe management
"@

Write-Host "[9/36] Creating: Environment Configuration" -ForegroundColor Yellow
gh issue create --repo $repo --title "Environment Configuration" --label "high-priority,technical" --body @"
Hardcoded URLs and no environment variable setup.

**Tasks:**
- [ ] Create ``.env.example``
- [ ] Move hardcoded URLs to env vars
- [ ] Document Cloudflare Pages setup
"@

Write-Host "[10/36] Creating: Search & Advanced Filtering" -ForegroundColor Yellow
gh issue create --repo $repo --title "Search & Advanced Filtering" --label "high-priority,feature,ux" --body @"
No search functionality exists.

**Tasks:**
- [ ] Implement search box in navbar
- [ ] Add faceted filters: difficulty, duration, price range, props
- [ ] Add props compatibility feature
"@

Write-Host "[11/36] Creating: Customer Testimonials & Social Proof" -ForegroundColor Yellow
gh issue create --repo $repo --title "Customer Testimonials & Social Proof" --label "high-priority,content,conversion" --body @"
No customer testimonials or social proof on the site.

**Tasks:**
- [ ] Add testimonials section on homepage
- [ ] Create customer showcase gallery
- [ ] Add review/rating system
- [ ] Display download counts
"@

Write-Host "[12/36] Creating: Fix Missing Sequence URLs" -ForegroundColor Yellow
gh issue create --repo $repo --title "Fix Missing Sequence URLs" --label "high-priority,bug,data" --body @"
Several sequences have missing xlightsSeqUrl values blocking purchases.

**Affected:** IDs 7, 9, 12, 15, 16, 18, 19, 20, 25, 27, 29, 30, 32, 33, 34, 35

**Tasks:**
- [ ] Audit all sequences for missing URLs
- [ ] Add fallback buttons or complete data
- [ ] Add missing youtubeId where applicable
"@

Write-Host "[13/36] Creating: Product Bundles & Package Deals" -ForegroundColor Yellow
gh issue create --repo $repo --title "Product Bundles & Package Deals" --label "high-priority,feature,revenue" --body @"
No bundle offerings to increase average order value.

**Tasks:**
- [ ] Create Complete Halloween Show bundle
- [ ] Create Kids Friendly Bundle
- [ ] Create Beginner Starter Pack
- [ ] Implement 15-20% bundle discount
"@

# MEDIUM PRIORITY ISSUES

Write-Host "[14/36] Creating: Loading States & Skeleton Screens" -ForegroundColor Yellow
gh issue create --repo $repo --title "Loading States & Skeleton Screens" --label "medium-priority,ux" --body @"
No loading feedback for users.

**Tasks:**
- [ ] Add skeleton screens for sequence cards
- [ ] Add loading indicator for YouTube embeds
- [ ] Add fade-in effect for lazy-loaded images
"@

Write-Host "[15/36] Creating: Share Button Functionality" -ForegroundColor Yellow
gh issue create --repo $repo --title "Share Button Functionality" --label "medium-priority,feature" --body @"
Share buttons on sequence detail page are non-functional.

**Tasks:**
- [ ] Implement working Facebook/Twitter share
- [ ] Add copy link with feedback
- [ ] Add Open Graph meta tags
"@

Write-Host "[16/36] Creating: Error Handling Improvements" -ForegroundColor Yellow
gh issue create --repo $repo --title "Error Handling Improvements" --label "medium-priority,ux" --body @"
Error states are too generic.

**Tasks:**
- [ ] Improve error.tsx with recovery info
- [ ] Add YouTube embed error handling
- [ ] Add search box to 404 page
"@

Write-Host "[17/36] Creating: Open Graph & Twitter Cards" -ForegroundColor Yellow
gh issue create --repo $repo --title "Open Graph & Twitter Cards" --label "medium-priority,seo" --body @"
Sequence pages need better social metadata.

**Tasks:**
- [ ] Add og:image from artworkUrl
- [ ] Add og:type product
- [ ] Add og:price, og:priceCurrency
- [ ] Add Twitter Card type product
- [ ] Add canonical URLs
"@

Write-Host "[18/36] Creating: TypeScript Type Safety" -ForegroundColor Yellow
gh issue create --repo $repo --title "TypeScript Type Safety" --label "medium-priority,technical" --body @"
Type safety improvements needed.

**Tasks:**
- [ ] Add strict null checks for optional fields
- [ ] Create discriminated unions for category
- [ ] Create constants file for string literals
- [ ] Add type validation at module load
"@

Write-Host "[19/36] Creating: Testing Framework Setup" -ForegroundColor Yellow
gh issue create --repo $repo --title "Testing Framework Setup" --label "medium-priority,technical,testing" --body @"
No tests exist in the codebase.

**Tasks:**
- [ ] Install Vitest and testing-library/react
- [ ] Create data transformation tests
- [ ] Create component tests
- [ ] Target 60%+ coverage
"@

Write-Host "[20/36] Creating: Lighthouse CI Pipeline" -ForegroundColor Yellow
gh issue create --repo $repo --title "Lighthouse CI Pipeline" --label "medium-priority,technical,performance" --body @"
No automated performance monitoring.

**Tasks:**
- [ ] Set up Lighthouse CI
- [ ] Set thresholds: Performance 90+, Accessibility 95+
- [ ] Track metrics over time
"@

Write-Host "[21/36] Creating: HTTP Caching Headers" -ForegroundColor Yellow
gh issue create --repo $repo --title "HTTP Caching Headers" --label "medium-priority,performance" --body @"
No caching configured for static assets.

**Tasks:**
- [ ] Add cache headers for immutable assets
- [ ] Add cache headers for HTML pages
- [ ] Enable compression in Cloudflare
"@

Write-Host "[22/36] Creating: FAQ Page" -ForegroundColor Yellow
gh issue create --repo $repo --title "FAQ Page" --label "medium-priority,content" --body @"
No dedicated FAQ page for common questions.

**Tasks:**
- [ ] Create comprehensive FAQ
- [ ] Cover licensing, compatibility, refunds
- [ ] Link from navbar and sequences page
"@

Write-Host "[23/36] Creating: Sequence Comparison Tool" -ForegroundColor Yellow
gh issue create --repo $repo --title "Sequence Comparison Tool" --label "medium-priority,feature" --body @"
No way to compare sequences side-by-side.

**Tasks:**
- [ ] Allow comparing 2-3 sequences
- [ ] Show price, duration, difficulty, props, video
"@

Write-Host "[24/36] Creating: Display Specifications Page" -ForegroundColor Yellow
gh issue create --repo $repo --title "Display Specifications Page" --label "medium-priority,content" --body @"
No detailed hardware/setup information.

**Tasks:**
- [ ] Create About the Display page
- [ ] Add hardware specs, xLights version, controllers
- [ ] Consider compatibility checker
"@

Write-Host "[25/36] Creating: Blog/Tutorial Content Hub" -ForegroundColor Yellow
gh issue create --repo $repo --title "Blog/Tutorial Content Hub" --label "medium-priority,content,seo" --body @"
No blog or tutorial content for SEO.

**Tasks:**
- [ ] Create blog section
- [ ] Write Choosing Your First Sequence
- [ ] Write How to Remap Sequences
- [ ] Write xLights Setup for Beginners
"@

Write-Host "[26/36] Creating: Customer Reviews & Ratings" -ForegroundColor Yellow
gh issue create --repo $repo --title "Customer Reviews & Ratings" --label "medium-priority,feature" --body @"
No review/rating capability.

**Tasks:**
- [ ] Add 5-star rating system
- [ ] Show average rating on listings
- [ ] Collect reviews post-purchase
"@

# LOW PRIORITY ISSUES

Write-Host "[27/36] Creating: Micro-interactions & Polish" -ForegroundColor Yellow
gh issue create --repo $repo --title "Micro-interactions & Polish" --label "low-priority,ux" --body @"
Missing subtle animations and feedback.

**Tasks:**
- [ ] Add fade-in for lazy images
- [ ] Button press feedback
- [ ] Hover animations for links
- [ ] Scroll indicator fade out
"@

Write-Host "[28/36] Creating: Footer Optimization" -ForegroundColor Yellow
gh issue create --repo $repo --title "Footer Optimization" --label "low-priority,ux" --body @"
Footer could be more useful.

**Tasks:**
- [ ] Add newsletter signup in footer
- [ ] Add warning for external links
- [ ] Consider adding quick stats
"@

Write-Host "[29/36] Creating: Typography Refinements" -ForegroundColor Yellow
gh issue create --repo $repo --title "Typography Refinements" --label "low-priority,ux" --body @"
Typography inconsistencies.

**Tasks:**
- [ ] Standardize heading sizes
- [ ] Increase body line-height
- [ ] Standardize padding/margin
"@

Write-Host "[30/36] Creating: Component Documentation" -ForegroundColor Yellow
gh issue create --repo $repo --title "Component Documentation" --label "low-priority,technical" --body @"
No component documentation.

**Tasks:**
- [ ] Add JSDoc comments
- [ ] Consider Storybook
- [ ] Document design system
"@

Write-Host "[31/36] Creating: ESLint Accessibility Plugin" -ForegroundColor Yellow
gh issue create --repo $repo --title "ESLint Accessibility Plugin" --label "low-priority,technical,accessibility" --body @"
No a11y linting.

**Tasks:**
- [ ] Install eslint-plugin-jsx-a11y
- [ ] Enable ARIA validation
- [ ] Fix Navigation labels
"@

Write-Host "[32/36] Creating: Git Hooks Setup" -ForegroundColor Yellow
gh issue create --repo $repo --title "Git Hooks Setup" --label "low-priority,technical" --body @"
No pre-commit validation.

**Tasks:**
- [ ] Setup Husky
- [ ] Add ESLint/Prettier check
- [ ] Add TypeScript checking
"@

Write-Host "[33/36] Creating: Gift Card System" -ForegroundColor Yellow
gh issue create --repo $repo --title "Gift Card System" --label "low-priority,feature" --body @"
No gift card functionality.

**Tasks:**
- [ ] Create \$25/\$50/\$100 gift cards
- [ ] Implement redemption flow
"@

Write-Host "[34/36] Creating: Referral Program" -ForegroundColor Yellow
gh issue create --repo $repo --title "Referral Program" --label "low-priority,feature" --body @"
No referral system.

**Tasks:**
- [ ] Refer a friend program
- [ ] Credit for both parties
"@

Write-Host "[35/36] Creating: Behind-the-Scenes Content" -ForegroundColor Yellow
gh issue create --repo $repo --title "Behind-the-Scenes Content" --label "low-priority,content" --body @"
Promised content not complete.

**Tasks:**
- [ ] Complete xLights Masterclass
- [ ] Add Hardware Deep Dives
- [ ] Add Build Logs
"@

Write-Host "[36/36] Creating: Social Media Integration" -ForegroundColor Yellow
gh issue create --repo $repo --title "Social Media Integration" --label "low-priority,feature" --body @"
Limited social integration.

**Tasks:**
- [ ] Add sharing buttons on sequences
- [ ] Instagram shoppable posts
- [ ] YouTube Shorts for clips
"@

Write-Host ""
Write-Host "Done! All 36 issues created." -ForegroundColor Green
Write-Host "View them at: https://github.com/diaquas/Lights-of-Elm-Ridge/issues" -ForegroundColor Cyan
