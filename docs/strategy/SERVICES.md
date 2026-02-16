# Lights of Elm Ridge - Services & Infrastructure

This document outlines all external services and infrastructure used by the project.

## Overview

| Service          | Purpose             | Cost         | Dashboard                                                    |
| ---------------- | ------------------- | ------------ | ------------------------------------------------------------ |
| Cloudflare Pages | Hosting             | Free         | [dash.cloudflare.com](https://dash.cloudflare.com)           |
| Cloudflare R2    | File Storage        | ~$0/mo       | [dash.cloudflare.com](https://dash.cloudflare.com)           |
| Supabase         | Auth & Database     | Free tier    | [supabase.com/dashboard](https://supabase.com/dashboard)     |
| Resend           | Transactional Email | Free tier    | [resend.com](https://resend.com)                             |
| YouTube Data API | Video sync          | Free         | [console.cloud.google.com](https://console.cloud.google.com) |
| Stripe           | Payments            | 2.9% + $0.30 | [dashboard.stripe.com](https://dashboard.stripe.com)         |
| GitHub           | Source code         | Free         | [github.com](https://github.com)                             |

---

## Cloudflare Pages (Hosting)

**Purpose:** Hosts the Next.js static site

**Setup:**

- Connected to GitHub repo for automatic deployments
- Custom domain: `lightsofelmridge.com`
- SSL handled automatically

**Environment Variables Needed:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `YOUTUBE_API_KEY` (for build-time video sync)

**Dashboard:** [dash.cloudflare.com](https://dash.cloudflare.com) → Pages → lightsofelmridge

---

## Cloudflare R2 (File Storage)

**Purpose:** Hosts downloadable sequence files (zip files)

**Setup:**

- Bucket: `lightsofelmridge-sequences`
- Custom domain: `downloads.lightsofelmridge.com`
- Public access enabled for `/Free/` folder

**Folder Structure:**

```
/Free/           - Free sequences (public access)
/Paid/           - Paid sequences (signed URLs only - future)
```

**Current Files:**

- `/Free/Spooky%20Dub.zip` - Spooky Scary Skeletons

**Dashboard:** [dash.cloudflare.com](https://dash.cloudflare.com) → R2 → lightsofelmridge-sequences

---

## Supabase (Authentication & Database)

**Purpose:** User authentication, purchase history, user data

**Setup:**

- Project: `lightsofelmridge`
- Region: (your region)

**Features Used:**

- [x] Authentication (email/password)
- [ ] Database (coming - for purchase history)
- [ ] Row Level Security (coming - for user data)

**Environment Variables:**

```
NEXT_PUBLIC_SUPABASE_URL=https://bzmpcgsloptensafzfle.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

**Dashboard:** [supabase.com/dashboard](https://supabase.com/dashboard/project/bzmpcgsloptensafzfle)

---

## Resend (Transactional Email)

**Purpose:** Send branded emails from lightsofelmridge.com (signup confirmations, password resets, purchase receipts)

**Setup:**

- Domain: `lightsofelmridge.com` (verified via DNS)
- Sender: `noreply@lightsofelmridge.com`
- Connected to Supabase via SMTP

**SMTP Settings (configured in Supabase):**

- Host: `smtp.resend.com`
- Port: `465`
- User: `resend`
- Password: (API key from Resend dashboard)

**Free Tier:** 3,000 emails/month, 100 emails/day

**Dashboard:** [resend.com](https://resend.com)

---

## YouTube Data API

**Purpose:** Automatically sync video metadata from YouTube playlists

**Setup:**

- Enabled in Google Cloud Console
- API key stored as GitHub secret

**Playlists Synced:**
| Playlist | ID | Purpose |
|----------|-----|---------|
| xLights Mockups | `PLNrebbWMDXn3a7I8I-I7fOKodoo8zdlaE` | Sequence preview videos |
| Live 2024 | `PLNrebbWMDXn25mqAx7N1M4XUun46lTaXy` | Live show recordings |
| Live 2025 | `PLNrebbWMDXn0o1Bipyk5pbxTbG0gYxyqF` | Live show recordings |

**Automation:**

- GitHub Action runs daily at 6 AM UTC
- Updates `src/data/youtube-videos.json`

**Dashboard:** [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → YouTube Data API v3

---

## Stripe (Payments)

**Purpose:** Process payments for sequence purchases

**Setup Steps:**

1. Create Stripe account at [stripe.com](https://stripe.com)
2. Get API keys from Dashboard → Developers → API keys
3. Create products in Stripe Dashboard (optional - we create them dynamically)
4. Set up webhook endpoint for order fulfillment

**Architecture:**

Since this is a static Next.js site, we use Supabase Edge Functions to handle Stripe:

```
User clicks Checkout → Edge Function creates Stripe Session → Redirect to Stripe
                                                                      ↓
User completes payment → Stripe Webhook → Edge Function → Save to Supabase DB
```

**Edge Functions:**

| Function                  | Purpose                            |
| ------------------------- | ---------------------------------- |
| `create-checkout-session` | Creates Stripe Checkout session    |
| `stripe-webhook`          | Handles payment completion webhook |

**Environment Variables:**

In Supabase Dashboard → Edge Functions → Secrets:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

In your `.env.local` and Cloudflare Pages:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Webhook URL:** `https://bzmpcgsloptensafzfle.supabase.co/functions/v1/stripe-webhook`

**Dashboard:** [dashboard.stripe.com](https://dashboard.stripe.com)

---

## GitHub

**Purpose:** Source code repository, CI/CD

**Repo:** `diaquas/Lights-of-Elm-Ridge.com`

**GitHub Actions:**

- `youtube-sync.yml` - Daily video metadata sync

**Secrets Configured:**

- `YOUTUBE_API_KEY` - For YouTube Data API access

**Dashboard:** [github.com/diaquas/Lights-of-Elm-Ridge.com](https://github.com/diaquas/Lights-of-Elm-Ridge.com)

---

## Environment Variables Summary

### Local Development (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://bzmpcgsloptensafzfle.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# YouTube (optional for local dev)
YOUTUBE_API_KEY=your-youtube-api-key
```

### Cloudflare Pages (Production)

Set these in Cloudflare Pages → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### GitHub Secrets

Set these in GitHub → Settings → Secrets → Actions:

- `YOUTUBE_API_KEY`

---

## Cost Breakdown

| Service          | Free Tier Limit            | Current Usage | Monthly Cost  |
| ---------------- | -------------------------- | ------------- | ------------- |
| Cloudflare Pages | Unlimited                  | -             | $0            |
| Cloudflare R2    | 10GB storage, 10M requests | ~1GB          | $0            |
| Supabase         | 50k MAU, 500MB DB          | Minimal       | $0            |
| Resend           | 3,000 emails/mo            | Minimal       | $0            |
| YouTube API      | 10,000 units/day           | ~100/day      | $0            |
| Stripe           | No monthly fee             | Not active    | $0 + fees     |
| **Total**        |                            |               | **~$0/month** |

---

## Future Services (Potential)

- **Cloudflare Workers** - Signed URL generation for paid downloads
- **Analytics** - Google Analytics or Plausible

---

## Backlog

### Email Templates

- [ ] Design branded email template (logo, colors, footer)
- [ ] Update Supabase email templates (confirmation, password reset)
- [ ] Create purchase receipt email template (for Stripe integration)

### E-commerce

- [x] Shopping cart functionality (Phase 2 - Complete)
- [ ] Stripe Checkout integration (Phase 3 - In Progress)
- [ ] Purchase history in user account
- [ ] Signed URLs for paid downloads

### Database Schema (Supabase)

```sql
-- purchases table
create table purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  stripe_session_id text unique,
  stripe_payment_intent text,
  sequence_ids integer[] not null,
  amount_total integer not null, -- cents
  currency text default 'usd',
  status text default 'pending', -- pending, completed, failed
  created_at timestamp with time zone default now(),
  completed_at timestamp with time zone
);

-- Enable RLS
alter table purchases enable row level security;

-- Users can only see their own purchases
create policy "Users can view own purchases"
  on purchases for select
  using (auth.uid() = user_id);
```
