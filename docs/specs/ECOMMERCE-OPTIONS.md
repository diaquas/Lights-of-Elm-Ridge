# E-Commerce Options for Lights of Elm Ridge

Research compiled for selling digital downloads (xLights sequences) on a static Cloudflare Pages site.

## Your Requirements
- PayPal support (required)
- Credit card support (required)
- Venmo (nice to have - note: Venmo is owned by PayPal)
- Static site compatible (Cloudflare Pages)
- Digital downloads delivery

---

## Recommended Options

### 1. Payhip (Best Overall for Digital Downloads)
**Recommended for your use case**

- **Pricing**: Free plan at 5% + payment fees, or $29/mo for 2%, or $99/mo for 0%
- **Pros**:
  - Supports both PayPal AND Stripe (credit cards)
  - Handles EU VAT automatically (important for international sales)
  - Embed checkout directly on your site
  - Automatic file delivery
  - No technical setup required
- **Cons**:
  - Free plan takes 5% cut
- **Integration**: Embed buttons or full checkout on any page
- **Verdict**: Start here. Low risk, easy setup, handles everything.

### 2. Lemon Squeezy (Best for Software/Digital Goods)
**Great alternative with lower fees**

- **Pricing**: 5% + 50c per transaction (no monthly fee)
- **Pros**:
  - Lower fees than Gumroad
  - PayPal, Stripe, and direct deposit payouts
  - Handles global tax compliance
  - Clean, modern checkout experience
  - License key support (if you ever need it)
- **Cons**:
  - Newer platform (less established)
- **Integration**: Embed or hosted checkout
- **Verdict**: Strong choice if you want modern UX and good fees.

### 3. Direct Stripe Checkout (Most Control)
**For when you want full control**

- **Pricing**: 2.9% + 30c per transaction (Stripe fees only)
- **Pros**:
  - Lowest fees (no platform cut)
  - Works with Cloudflare Pages via serverless functions
  - Full control over experience
  - Stripe has excellent reputation
- **Cons**:
  - Credit cards only (no PayPal)
  - Requires technical setup (Cloudflare Workers)
  - You handle file delivery yourself
- **Integration**: Cloudflare has native Stripe SDK support in Workers
- **Verdict**: Best fees, but more work. Consider for later.

### 4. PayPal Buy Now Buttons (Simplest)
**Quick and dirty option**

- **Pricing**: 2.9% + 30c (PayPal fees)
- **Pros**:
  - Zero technical setup
  - Everyone knows PayPal
  - Can add to any page with HTML
  - Venmo support built-in (same ecosystem)
- **Cons**:
  - No credit card without PayPal account
  - Manual file delivery (or use PayPal's digital goods)
  - Basic/dated checkout experience
- **Integration**: Copy/paste button code
- **Verdict**: Quick start option, but limited.

### 5. Gumroad (Popular but Issues)
**Widely used but has problems**

- **Pricing**: 10% + payment processing (~13% total)
- **Pros**:
  - Well-known platform
  - Easy setup
  - Built-in audience discovery
- **Cons**:
  - **PayPal dropped Gumroad in October 2024**
  - Highest fees of all options
  - Limited payout options now
- **Verdict**: Skip this one - PayPal issue is a dealbreaker for you.

---

## Comparison Table

| Platform | Monthly Fee | Transaction Fee | PayPal | Credit Card | Setup Difficulty |
|----------|-------------|-----------------|--------|-------------|------------------|
| Payhip (Free) | $0 | 5% + ~3% | Yes | Yes | Easy |
| Payhip (Plus) | $29 | 2% + ~3% | Yes | Yes | Easy |
| Lemon Squeezy | $0 | 5% + 50c | Yes | Yes | Easy |
| Stripe Direct | $0 | 2.9% + 30c | No | Yes | Medium |
| PayPal Buttons | $0 | 2.9% + 30c | Yes | Limited | Easy |
| Gumroad | $0 | 10% + ~3% | **No** | Yes | Easy |

---

## My Recommendation

### Start With: **Payhip**

1. Free to start (5% + payment fees is reasonable)
2. Supports PayPal AND credit cards
3. Embed checkout directly on your Cloudflare Pages site
4. Handles file delivery automatically
5. Upgrade to lower fees as you grow

### Later Consider: **Stripe Direct + PayPal Buttons**

Once you have consistent sales, you could:
1. Use Stripe Checkout via Cloudflare Workers for credit cards (lowest fees)
2. Add PayPal buttons as secondary option
3. Handle file delivery via email or custom solution

---

## Cloudflare-Specific Notes

Cloudflare Pages works well with all these options:

- **Embed approach**: Payhip, Lemon Squeezy, Gumroad all provide embed codes
- **Cloudflare Workers**: Can run Stripe SDK natively (announced Oct 2025)
- **No serverless needed**: For Payhip/Lemon Squeezy, just embed buttons

Cloudflare doesn't have its own e-commerce/payment solution, but their Workers platform integrates well with Stripe for custom builds.

---

## Next Steps

1. Create accounts on Payhip and/or Lemon Squeezy (free)
2. Upload a test product
3. Get embed code and test on staging
4. Replace xlightsseq.com links with your own checkout

---

## Sources

- [Gumroad vs Payhip 2025 Comparison](https://tamzidulhaque.com/gumroad-vs-payhip-best-platform-digital-products-2025/)
- [Best Gumroad Alternatives - WPBeginner](https://www.wpbeginner.com/showcase/best-gumroad-alternatives/)
- [Lemon Squeezy vs Gumroad](https://www.lemonsqueezy.com/gumroad-alternative)
- [Where to Sell Digital Products 2025](https://ecomm.design/where-to-sell-digital-products/)
- [Cloudflare Stripe SDK Support](https://blog.cloudflare.com/announcing-stripe-support-in-workers/)
