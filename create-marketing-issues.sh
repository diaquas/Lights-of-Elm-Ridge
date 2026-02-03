#!/bin/bash
# Marketing Issues Creation Script for Lights of Elm Ridge
# Run this after authenticating with: gh auth login
# Repository: diaquas/Lights-of-Elm-Ridge

REPO="diaquas/Lights-of-Elm-Ridge"

echo "Creating marketing labels..."

# Create marketing-specific labels
gh label create "marketing" --color "c2e0c6" --description "Marketing initiatives" --repo "$REPO" 2>/dev/null || echo "Label 'marketing' already exists"
gh label create "youtube" --color "ff0000" --description "YouTube marketing" --repo "$REPO" 2>/dev/null || echo "Label 'youtube' already exists"
gh label create "social-media" --color "1da1f2" --description "Social media marketing" --repo "$REPO" 2>/dev/null || echo "Label 'social-media' already exists"
gh label create "community" --color "7057ff" --description "Community engagement" --repo "$REPO" 2>/dev/null || echo "Label 'community' already exists"
gh label create "email-marketing" --color "f9d0c4" --description "Email marketing" --repo "$REPO" 2>/dev/null || echo "Label 'email-marketing' already exists"
gh label create "partnerships" --color "bfd4f2" --description "Partnerships and collaborations" --repo "$REPO" 2>/dev/null || echo "Label 'partnerships' already exists"

echo ""
echo "Creating marketing issues..."

# Issue 1: Customer Testimonials and Social Proof (HIGH IMPACT)
gh issue create --repo "$REPO" \
  --title "Add Customer Testimonials and Social Proof Section" \
  --label "marketing,high-priority,conversion" \
  --body "$(cat <<'EOF'
## Summary
Add customer testimonials, reviews, and social proof elements throughout the site to build trust and increase conversions.

## Why This Matters
- Social proof is one of the most powerful conversion drivers (can increase conversions by 15-20%)
- The xLights community is tight-knit and trusts peer recommendations
- Competitors like xTreme Sequences have dedicated testimonials pages that drive sales
- Current site has zero customer testimonials or reviews

## Tasks
- [ ] Create a testimonials section on the homepage (3-5 rotating quotes)
- [ ] Add testimonials to the About page
- [ ] Create a dedicated customer showcase gallery with display photos
- [ ] Add a simple review/rating system for sequences (1-5 stars)
- [ ] Display download counts on sequence cards ("100+ downloads")
- [ ] Add "As featured by" logos if any media/community features exist
- [ ] Reach out to past customers for testimonials and display photos

## Implementation Notes
- Testimonials should include: name, location (city/state), display size, and specific praise
- Photos of customer displays using purchased sequences add authenticity
- Consider video testimonials from enthusiastic customers

## Success Metrics
- Testimonial collection rate
- Conversion rate improvement
- Time on page for pages with testimonials
EOF
)"

echo "Created: Customer Testimonials issue"

# Issue 2: YouTube Channel Optimization (HIGH IMPACT)
gh issue create --repo "$REPO" \
  --title "Optimize YouTube Channel for Discovery and Lead Generation" \
  --label "marketing,high-priority,youtube" \
  --body "$(cat <<'EOF'
## Summary
Optimize the YouTube channel (@LightsofElmRidge) to become a primary discovery and lead generation channel for the business.

## Why This Matters
- YouTube is THE discovery platform for xLights enthusiasts
- Videos showcasing sequences are the #1 way people find new sequences to buy
- Current channel has content but may not be optimized for search and discovery
- Competitors drive significant traffic through YouTube tutorials and showcase videos

## Current State
- Channel exists with mockup videos and live show footage
- Videos are being used for sequence previews on the website
- YouTube playlists are structured for mockups and live shows

## Tasks
- [ ] Optimize video titles with keywords (e.g., "xLights Sequence - [Song Name] - Halloween 2026")
- [ ] Write detailed video descriptions with links to purchase
- [ ] Add timestamps to longer videos
- [ ] Create custom thumbnails with consistent branding
- [ ] Add end screens linking to the website and related videos
- [ ] Create playlist for "Free Sequences" to attract new viewers
- [ ] Add channel trailer explaining what Lights of Elm Ridge offers
- [ ] Include calls-to-action in video descriptions (subscribe, website link)
- [ ] Create Shorts from best moments of sequences (15-60 seconds)

## Content Ideas
- "How I Sequenced [Song Name]" behind-the-scenes videos
- "xLights Tutorial" series for beginners
- "Display Tour 2026" walkthrough video
- "Sequence Spotlight" series highlighting new releases

## Success Metrics
- Subscriber growth rate
- Video view counts
- Click-through rate to website
- Traffic from YouTube in analytics
EOF
)"

echo "Created: YouTube Optimization issue"

# Issue 3: Community Engagement Strategy (HIGH IMPACT)
gh issue create --repo "$REPO" \
  --title "Develop Community Engagement Strategy for xLights Forums and Facebook" \
  --label "marketing,high-priority,community" \
  --body "$(cat <<'EOF'
## Summary
Build presence and trust in the xLights community through active participation in forums, Facebook groups, and Reddit.

## Why This Matters
- The xLights community is close-knit and purchases from trusted members
- Word-of-mouth in these communities drives significant sales
- Establishing expertise builds long-term brand credibility
- Current presence appears minimal in major community spaces

## Key Community Platforms
1. **xLights Zoom Meetings** - Weekly community calls
2. **xLights Facebook Group** - Primary community hub (50k+ members)
3. **Christmas Light Show Enthusiasts** - Large hobbyist group
4. **Reddit r/ChristmasLights** - Growing subreddit
5. **Auschristmaslighting** - If targeting international
6. **Local Christmas Light Show groups** - Regional targeting

## Tasks
- [ ] Audit current presence in major xLights communities
- [ ] Create a community participation schedule (30 min/day minimum)
- [ ] Share helpful tips and answer questions (without direct selling)
- [ ] Post display photos and behind-the-scenes content
- [ ] Announce new sequence releases with preview videos
- [ ] Offer exclusive community discounts occasionally
- [ ] Host or participate in community events (Zoom calls, virtual showcases)
- [ ] Create a "Share Your Display" campaign encouraging user-generated content

## Guidelines
- Be helpful first, promotional second
- Share knowledge freely to build trust
- Engage authentically, not just for sales
- Respond to mentions and questions quickly

## Success Metrics
- Community mentions/tags
- Referral traffic from social platforms
- Community member testimonials
- Sales attributed to community sources
EOF
)"

echo "Created: Community Engagement issue"

# Issue 4: Email Marketing Integration (HIGH IMPACT)
gh issue create --repo "$REPO" \
  --title "Implement Email Marketing System with Seasonal Campaigns" \
  --label "marketing,high-priority,email-marketing" \
  --body "$(cat <<'EOF'
## Summary
Set up a proper email marketing system to capture leads and run seasonal campaigns.

## Why This Matters
- Email has highest ROI of any marketing channel (~$36 for every $1 spent)
- Newsletter form currently only saves to localStorage (data is lost!)
- Seasonal business requires timely email campaigns for Halloween/Christmas
- Email list is a owned asset that compounds over time

## Current State
- Newsletter form exists but only stores to localStorage
- No email service provider connected
- No automated sequences or campaigns

## Tasks
- [ ] Choose email service provider (Mailchimp, ConvertKit, or Loops)
- [ ] Integrate newsletter form with chosen ESP
- [ ] Set up double opt-in flow
- [ ] Create welcome email sequence (3-5 emails introducing the brand)
- [ ] Design email templates matching site branding
- [ ] Plan seasonal campaign calendar:
  - July: "Halloween Prep" campaign
  - September: Halloween sequence releases
  - October: Last-chance Halloween + Christmas teaser
  - November: Christmas sequence releases
  - December: New Year sale/wrap-up

## Email Sequence Ideas
1. Welcome email + free sequence download
2. Introduction to the display and story
3. Top sequences showcase
4. Behind-the-scenes content
5. Limited-time offer

## Lead Magnet Ideas
- Free starter sequence (already have some)
- "Beginner's Guide to xLights" PDF
- "How to Build Your First Light Display" guide
- Layout planning template

## Success Metrics
- Email list growth rate
- Open rates (aim for 30%+)
- Click-through rates (aim for 5%+)
- Revenue attributed to email campaigns
EOF
)"

echo "Created: Email Marketing issue"

# Issue 5: Blog/Tutorial Content Hub (HIGH IMPACT)
gh issue create --repo "$REPO" \
  --title "Create Blog/Tutorial Content Hub for SEO and Authority Building" \
  --label "marketing,high-priority,seo,content" \
  --body "$(cat <<'EOF'
## Summary
Create a blog/content hub with tutorials, guides, and articles to drive organic search traffic and establish expertise.

## Why This Matters
- Long-tail SEO can drive significant free traffic
- Tutorials establish authority and build trust before purchase
- Content marketing compounds over time
- Competitors with blogs rank for valuable keywords

## Target Keywords to Research
- "xlights sequences for beginners"
- "how to remap xlights sequence"
- "best halloween light show songs"
- "xlights matrix setup guide"
- "christmas light show planning"
- "xlights vs [competitor]"

## Content Ideas

### Getting Started Series
- [ ] "Complete Beginner's Guide to xLights Sequences"
- [ ] "How to Choose Your First Light Show Sequence"
- [ ] "xLights Installation and Setup Guide"
- [ ] "Understanding Sequence File Formats (XSQ, FSEQ)"

### How-To Tutorials
- [ ] "How to Remap a Sequence to Your Display"
- [ ] "Setting Up Singing Faces in xLights"
- [ ] "Creating Matrix Effects in xLights"
- [ ] "How to Sync Your Light Show to FM Radio"

### Planning Guides
- [ ] "Planning Your Halloween Light Display"
- [ ] "Building a Light Show on a Budget"
- [ ] "How Many Pixels Do You Actually Need?"

### Showcase Content
- [ ] "Top 10 Halloween Songs for Light Displays"
- [ ] "Best Christmas Sequences of 2025"
- [ ] Monthly "Sequence Spotlight" features

## Technical Implementation
- Create /blog route with Next.js
- Use MDX for content authoring
- Add proper meta tags and structured data
- Include internal links to sequences

## Success Metrics
- Organic search traffic growth
- Keyword rankings for target terms
- Time on page and pages per session
- Conversions from blog traffic
EOF
)"

echo "Created: Blog/Tutorial Content issue"

# Issue 6: SEO Technical Improvements (MEDIUM-HIGH IMPACT)
gh issue create --repo "$REPO" \
  --title "Technical SEO Audit and Improvements" \
  --label "marketing,high-priority,seo,technical" \
  --body "$(cat <<'EOF'
## Summary
Audit and improve technical SEO elements to ensure maximum search visibility.

## Current State (Good)
- Sitemap.ts exists and generates dynamic sitemap
- robots.txt is configured properly
- Organization schema is implemented
- Meta tags are well-structured
- Google Search Console verification is in place

## Current Gaps
- Product schema only on detail pages (could add to listing page)
- No FAQ schema on FAQ page
- Image alt tags may need audit
- Page speed optimization needed (images unoptimized)

## Tasks

### Structured Data Enhancements
- [ ] Add FAQPage schema to /faq page
- [ ] Add ItemList schema to /sequences listing page
- [ ] Add VideoObject schema for YouTube embeds
- [ ] Validate all schema with Google Rich Results Test

### Technical Optimizations
- [ ] Enable Next.js image optimization (remove unoptimized flag)
- [ ] Convert images to WebP format
- [ ] Add lazy loading to below-fold images
- [ ] Implement critical CSS inlining
- [ ] Add proper canonical URLs to all pages

### Content SEO
- [ ] Audit and optimize page titles for keywords
- [ ] Add unique meta descriptions to all pages
- [ ] Improve internal linking between sequences
- [ ] Add breadcrumbs to all pages (already on sequence detail)

### Monitoring
- [ ] Set up Google Search Console monitoring
- [ ] Configure Lighthouse CI for build process
- [ ] Track Core Web Vitals
- [ ] Set up rank tracking for target keywords

## Success Metrics
- Google PageSpeed score 90+
- All pages indexed in Google
- Core Web Vitals passing
- Keyword ranking improvements
EOF
)"

echo "Created: Technical SEO issue"

# Issue 7: Instagram Strategy (MEDIUM IMPACT)
gh issue create --repo "$REPO" \
  --title "Develop Instagram Content Strategy and Posting Schedule" \
  --label "marketing,medium-priority,social-media" \
  --body "$(cat <<'EOF'
## Summary
Build an active Instagram presence to showcase sequences and engage the light display community.

## Why This Matters
- Instagram is highly visual - perfect for light show content
- Reels can reach new audiences beyond current followers
- Light show clips are highly shareable and engaging
- Current Instagram (@lights_of_elm_ridge) may need more activity

## Content Strategy

### Content Types
1. **Reels** (primary focus - best reach)
   - 15-30 second clips of best sequence moments
   - Behind-the-scenes of sequencing process
   - Time-lapse of display setup
   - Before/after effects comparisons

2. **Stories**
   - Day-in-the-life during show season
   - Polls asking "Which song should I sequence next?"
   - Countdown to new releases
   - Share customer displays

3. **Posts**
   - High-quality photos of the display
   - New sequence announcements
   - Customer showcase reposts
   - Seasonal holiday posts

### Posting Schedule
- Reels: 3-5 per week
- Stories: Daily during season, 3x/week off-season
- Posts: 2-3 per week

## Tasks
- [ ] Audit current Instagram presence and followers
- [ ] Create content calendar for next 3 months
- [ ] Batch create Reels from existing video content
- [ ] Set up consistent posting schedule
- [ ] Engage with light show community hashtags
- [ ] Collaborate with other display owners for cross-promotion
- [ ] Add link in bio to website with tracking

## Hashtag Strategy
#xlights #christmaslights #lightshow #holidaylights #pixellights #christmasdisplay #halloweenlights #rgblights #christmaslightshow #lightingdesign

## Success Metrics
- Follower growth rate
- Reel views and engagement
- Website clicks from Instagram
- DM inquiries about sequences
EOF
)"

echo "Created: Instagram Strategy issue"

# Issue 8: Seasonal Marketing Calendar (MEDIUM IMPACT)
gh issue create --repo "$REPO" \
  --title "Create Seasonal Marketing Calendar and Campaign Plan" \
  --label "marketing,medium-priority" \
  --body "$(cat <<'EOF'
## Summary
Develop a comprehensive seasonal marketing calendar aligned with Halloween and Christmas buying cycles.

## Why This Matters
- Sequence sales are highly seasonal
- Planning ahead ensures timely campaigns
- Competitors who plan ahead capture early buyers
- Off-season marketing keeps brand top-of-mind

## Seasonal Timeline

### Q1 (January - March)
- Post-season recap and thank you to customers
- Early bird announcements for next year
- Behind-the-scenes content about what's coming
- Off-season tutorials and content marketing

### Q2 (April - June)
- Hardware planning content ("What to buy now while prices are low")
- Summer sale on existing sequences
- Preview upcoming Halloween sequences
- Community engagement and relationship building

### Q3 (July - September)
- **July**: "Start Planning Your Halloween Display" campaign
- **August**: Halloween sequence teasers and pre-orders
- **September**: Halloween sequence releases, "Last Chance for Halloween"
- Early Christmas sequence previews

### Q4 (October - December)
- **October**: Final Halloween push, Christmas sequence releases begin
- **November**: Major Christmas sequence push, Black Friday/Cyber Monday deals
- **December**: Last-minute Christmas sales, gift cards, new year prep

## Campaign Ideas
- Early Bird Discount (15% off pre-orders)
- Bundle Deals (Halloween Bundle, Christmas Bundle)
- Flash Sales (24-48 hour discounts)
- Loyalty Rewards (repeat customer discounts)
- Referral Program (discount for referrals)

## Tasks
- [ ] Map out full year marketing calendar
- [ ] Plan sequence release schedule aligned with seasons
- [ ] Create campaign assets in advance
- [ ] Set up automated email campaigns
- [ ] Schedule social media content batches
- [ ] Plan promotional pricing strategy

## Success Metrics
- Revenue by season comparison
- Early-season vs late-season sales ratio
- Campaign-specific conversion rates
EOF
)"

echo "Created: Seasonal Marketing Calendar issue"

# Issue 9: Partnerships and Collaborations (MEDIUM IMPACT)
gh issue create --repo "$REPO" \
  --title "Establish Partnerships with Hardware Vendors and Content Creators" \
  --label "marketing,medium-priority,partnerships" \
  --body "$(cat <<'EOF'
## Summary
Build strategic partnerships with hardware vendors, other sequence creators, and content creators in the xLights space.

## Why This Matters
- Partnerships extend reach to new audiences
- Vendor partnerships can drive referral traffic
- Collaborations build credibility through association
- Cross-promotion is cost-effective marketing

## Partnership Opportunities

### Hardware Vendors
- **Holiday Coro** - Major LED/prop vendor
- **Boscoyo Studio** - Popular prop manufacturer
- **HolidayLightingOutlet** - LED supplier
- **Wired Watts** - Power supplies and accessories

Potential: Offer exclusive sequences bundled with their products, or affiliate relationships

### Sequence Marketplaces
- **xlightsseq.com** - Already selling here, could negotiate featured placement
- **RGB Sequences** - Potential cross-promotion
- **Magical Light Shows** - Largest competitor, potential collaboration on events

### Content Creators
- xLights YouTube channels with tutorials
- Light show bloggers
- Local news features during show season

### Community Events
- xLights Zoom Meetings - Present or sponsor
- Light-O-Rama conventions (cross-community)
- Local Christmas light show tours

## Tasks
- [ ] Identify top 5 potential vendor partners
- [ ] Reach out to 3 YouTube creators for collaboration
- [ ] Apply for featured vendor status on xlightsseq.com
- [ ] Create affiliate/referral program structure
- [ ] Propose cross-promotion deals with complementary creators
- [ ] Participate in community events as sponsor/presenter

## Success Metrics
- Partner referral traffic
- Sales from partnership channels
- Brand mention reach
- New audience exposure
EOF
)"

echo "Created: Partnerships issue"

# Issue 10: Facebook Presence (MEDIUM IMPACT)
gh issue create --repo "$REPO" \
  --title "Establish Facebook Page and Group Engagement Strategy" \
  --label "marketing,medium-priority,social-media,community" \
  --body "$(cat <<'EOF'
## Summary
Create or optimize Facebook presence and develop a strategy for engaging in Facebook groups.

## Why This Matters
- Facebook groups are where most xLights discussion happens
- Many sequence buyers are 35-55 age range (heavy Facebook users)
- Facebook Marketplace potential for local visibility
- Groups allow direct connection with potential customers

## Facebook Strategy

### Facebook Page
- [ ] Create/optimize Facebook business page
- [ ] Add all relevant business info (website, location, contact)
- [ ] Set up Facebook Shop (if applicable)
- [ ] Post sequence previews and updates
- [ ] Share blog content and tutorials
- [ ] Respond to messages and comments promptly

### Facebook Groups to Engage
1. **xLights Official Group** (~50k members)
2. **Christmas Light Show Enthusiasts** (~30k members)
3. **DIY Christmas Light Displays**
4. **Halloween Light Display Enthusiasts**
5. **[Local city/state] Christmas Lights** groups

### Engagement Guidelines
- Provide helpful answers to questions
- Share display photos and videos
- Don't spam promotional content
- Build relationships before selling
- Offer exclusive group discounts occasionally

## Content for Facebook
- Video posts of sequences (native video preferred over YouTube links)
- Display setup progress photos
- Customer display features
- Behind-the-scenes content
- Polls and questions to drive engagement

## Tasks
- [ ] Audit existing Facebook presence
- [ ] Join key xLights and light display groups
- [ ] Create posting schedule (3-5x/week)
- [ ] Set up Facebook Business Suite for scheduling
- [ ] Develop response templates for common questions
- [ ] Plan Facebook-exclusive promotions

## Success Metrics
- Page followers and engagement
- Group post reach and engagement
- Website traffic from Facebook
- Messages and inquiries received
EOF
)"

echo "Created: Facebook Presence issue"

# Issue 11: Product Bundles and Pricing Strategy (MEDIUM IMPACT)
gh issue create --repo "$REPO" \
  --title "Create Product Bundles and Optimize Pricing Strategy" \
  --label "marketing,medium-priority,revenue,conversion" \
  --body "$(cat <<'EOF'
## Summary
Create sequence bundles and optimize pricing strategy to increase average order value and conversions.

## Why This Matters
- Bundles increase average order value by 20-30%
- Tiered pricing creates perception of value
- Bundle deals reduce decision fatigue for buyers
- Competitive differentiation through unique offerings

## Bundle Ideas

### Season Bundles
- **Complete Halloween Show** (5-7 sequences) - 20% off individual prices
- **Complete Christmas Show** (6-8 sequences) - 20% off individual prices
- **Starter Pack** (3 beginner-friendly sequences) - 25% off

### Theme Bundles
- **Kids Favorites** (family-friendly songs)
- **TSO Mega Pack** (Trans-Siberian Orchestra)
- **Disney Magic** (Disney songs)
- **Pop Hits Collection** (popular music)

### Value Bundles
- **First-Timer Special** (2 sequences + tutorial access)
- **Season Pass** (all new sequences for the year)
- **Upgrade Bundle** (specific upgrade path)

## Pricing Strategy

### Current Pricing
- Free sequences: 4 available
- $10 sequences: 6 available
- $20 sequences: 25 available

### Recommendations
- Consider $15 tier for mid-range sequences
- Create higher-value "premium" tier at $25-30
- Bundle discounts of 15-25%
- First-time buyer discount (10% off first order)
- Returning customer rewards

## Tasks
- [ ] Analyze competitor bundle offerings
- [ ] Design 3-5 initial bundles
- [ ] Create bundle artwork and marketing materials
- [ ] Implement bundle purchasing (Stripe or platform)
- [ ] A/B test pricing on new sequences
- [ ] Create limited-time bundle offers

## Success Metrics
- Bundle sales volume
- Average order value
- Bundle vs individual purchase ratio
- Customer lifetime value
EOF
)"

echo "Created: Product Bundles issue"

# Issue 12: Free Lead Magnets (MEDIUM IMPACT)
gh issue create --repo "$REPO" \
  --title "Create Free Lead Magnets to Grow Email List" \
  --label "marketing,medium-priority,email-marketing,content" \
  --body "$(cat <<'EOF'
## Summary
Create valuable free resources that capture email addresses and introduce potential customers to the brand.

## Why This Matters
- Lead magnets grow email list faster than newsletter signups alone
- Quality free content builds trust before purchase
- Establishes expertise and authority in the niche
- Creates entry point into the customer journey

## Lead Magnet Ideas

### Free Sequences (Already Have Some)
- Ensure free sequences are prominent and easy to find
- Add email gate for some free sequences
- Create a "Free Samples" bundle

### PDF Guides
- [ ] "Beginner's Guide to Your First Light Display" (15-20 pages)
- [ ] "xLights Quick Start Cheat Sheet" (1-2 pages)
- [ ] "Halloween vs Christmas Display Planning Guide"
- [ ] "Prop Layout Planning Template"
- [ ] "Music Licensing Guide for Light Shows"

### Video Training
- [ ] "5 Mistakes First-Time Displayers Make" (YouTube + email gate for bonus content)
- [ ] "xLights Setup in 30 Minutes" mini-course
- [ ] "Sequence Remapping Crash Course"

### Tools/Templates
- [ ] Spreadsheet: Display Budget Planner
- [ ] Spreadsheet: Show Planning Timeline
- [ ] Checklist: Display Setup Checklist
- [ ] Checklist: Pre-Show Testing Checklist

## Implementation
- Create dedicated landing pages for each lead magnet
- Set up email automation for delivery
- Add lead magnet CTAs throughout the site
- Promote on social media and in communities

## Tasks
- [ ] Prioritize and create top 3 lead magnets
- [ ] Design professional PDF templates
- [ ] Create landing pages with email capture
- [ ] Set up automated delivery emails
- [ ] Test lead magnet conversion rates

## Success Metrics
- Lead magnet download rates
- Email list growth from lead magnets
- Conversion rate to paid purchases
- Email engagement from lead magnet subscribers
EOF
)"

echo "Created: Lead Magnets issue"

# Issue 13: Local SEO and Press (LOW-MEDIUM IMPACT)
gh issue create --repo "$REPO" \
  --title "Pursue Local SEO and Press Coverage for Display" \
  --label "marketing,low-priority,seo" \
  --body "$(cat <<'EOF'
## Summary
Leverage the physical light display for local SEO, press coverage, and word-of-mouth marketing.

## Why This Matters
- Local news loves covering holiday light displays
- Press coverage provides high-authority backlinks (SEO value)
- Local recognition builds credibility for online sales
- Word-of-mouth from display visitors can drive sales

## Local SEO Tasks
- [ ] Create Google Business Profile for the display
- [ ] Add display to light show finder websites (christmaslightfinder.com, etc.)
- [ ] Get listed in local "things to do" guides
- [ ] Optimize for "[city] Christmas lights" searches
- [ ] Encourage Google reviews from visitors

## Press Outreach
- [ ] Create press kit with high-quality photos and story
- [ ] Identify local TV stations, newspapers, and bloggers
- [ ] Pitch story for Halloween and Christmas seasons
- [ ] Offer exclusive "behind-the-scenes" access to journalists
- [ ] Follow up on any coverage with thank-you and social shares

## Display Promotion
- [ ] Create QR codes at the display linking to website
- [ ] Signage mentioning "sequences available for purchase"
- [ ] Social media hashtag for the display
- [ ] Encourage visitor photos and shares

## Press Kit Contents
- High-resolution display photos (day and night)
- Owner bio and story
- Display statistics (pixel count, songs, years running)
- Contact information
- Quote sheet with key messages

## Success Metrics
- Press mentions and backlinks
- Local search rankings
- Display visitor counts
- Sales from local visitors
EOF
)"

echo "Created: Local SEO and Press issue"

# Issue 14: Review/Rating System (LOW IMPACT)
gh issue create --repo "$REPO" \
  --title "Implement Customer Review and Rating System for Sequences" \
  --label "marketing,low-priority,feature,conversion" \
  --body "$(cat <<'EOF'
## Summary
Add the ability for customers to leave reviews and ratings on sequences to provide social proof.

## Why This Matters
- Reviews increase conversion rates by 10-15%
- Star ratings stand out in search results (with proper schema)
- User reviews provide authentic social proof
- Feedback loop helps improve sequence quality

## Features to Implement

### Basic Reviews
- 1-5 star rating system
- Text review (optional)
- Verified purchase badge
- Date of review
- Helpful/not helpful voting

### Display
- Average rating on sequence cards
- Number of reviews displayed
- Star rating in sequence detail page
- "Top Rated" filter option

### Collection
- Post-purchase email requesting review
- Incentive for reviews (discount on next purchase)
- Easy review submission form

## Technical Implementation
- Store reviews in database (Supabase)
- Add Review aggregate schema for SEO
- Moderate reviews before publishing
- Prevent spam and fake reviews

## Tasks
- [ ] Design review UI components
- [ ] Implement database schema for reviews
- [ ] Build review submission flow
- [ ] Add post-purchase review emails
- [ ] Implement review moderation
- [ ] Add aggregate rating schema

## Success Metrics
- Review submission rate
- Average rating
- Impact on conversion rate
- Search result click-through rate
EOF
)"

echo "Created: Review System issue"

# Issue 15: Referral Program (LOW IMPACT)
gh issue create --repo "$REPO" \
  --title "Create Customer Referral Program" \
  --label "marketing,low-priority,revenue" \
  --body "$(cat <<'EOF'
## Summary
Implement a referral program that rewards customers for bringing in new buyers.

## Why This Matters
- Referral customers have 16% higher lifetime value
- Word-of-mouth is highly trusted in the xLights community
- Cost-effective customer acquisition
- Turns happy customers into brand advocates

## Program Structure

### Reward Options
- **Credit Model**: Both referrer and referee get $5 credit
- **Percentage Model**: 15% off for referee, $5 for referrer
- **Free Sequence**: Refer 3 friends, get a free sequence

### Mechanics
- Unique referral link for each customer
- Track referrals via cookies or codes
- Automatic reward application at checkout
- Dashboard to track referral status

## Implementation Phases

### Phase 1 (MVP)
- Simple referral code system
- Manual tracking via email
- Coupon code rewards

### Phase 2 (Automated)
- Unique referral links
- Automatic tracking
- Dashboard for customers
- Automated reward delivery

## Tasks
- [ ] Define referral program structure
- [ ] Create referral landing page
- [ ] Implement tracking mechanism
- [ ] Design reward delivery system
- [ ] Create promotional materials
- [ ] Test and launch program

## Success Metrics
- Referral program participation rate
- Referral conversion rate
- Revenue from referral customers
- Customer acquisition cost comparison
EOF
)"

echo "Created: Referral Program issue"

echo ""
echo "============================================"
echo "All marketing issues created successfully!"
echo "============================================"
echo ""
echo "View issues at: https://github.com/diaquas/Lights-of-Elm-Ridge/issues"
