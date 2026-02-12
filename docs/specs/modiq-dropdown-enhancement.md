# ModIQ Enhancement: Three-Tier Sequence Selector

## Overview

Replace the simple sequence dropdown with a three-tier grouped selector that shows owned, free, and unowned sequences. Serves dual purpose: functional tool for mapping AND passive sales channel for sequence discovery.

---

## Dropdown Structure

### Logged-In User (Has Purchases)

```
┌─────────────────────────────────────────────────┐
│  YOUR SEQUENCES                                  │
│  ✓ Abracadabra — Steve Miller Band              │
│  ✓ Thunderstruck — AC/DC                        │
│  ✓ Skeleton Dance — Andrew Gold                  │
│                                                  │
│  FREE SEQUENCES                                  │
│  ★ Monster Mash — Bobby Pickett                  │
│  ★ Ghostbusters — Ray Parker Jr.                 │
│  ★ This Is Halloween — Marilyn Manson            │
│                                                  │
│  ── MORE SEQUENCES ─────────────────────────     │
│  ○ Bohemian Rhapsody — Queen           $9.99     │
│  ○ Welcome to the Jungle — GNR         $7.99     │
│  ○ Crazy Train — Ozzy Osbourne         $9.99     │
│  ○ Purple People Eater — S. Wooley     $5.99     │
│                    ↓ Browse all sequences         │
└─────────────────────────────────────────────────┘
```

### Logged-In User (No Purchases)

```
┌─────────────────────────────────────────────────┐
│  FREE SEQUENCES                                  │
│  ★ Monster Mash — Bobby Pickett                  │
│  ★ Ghostbusters — Ray Parker Jr.                 │
│  ★ This Is Halloween — Marilyn Manson            │
│                                                  │
│  ── MORE SEQUENCES ─────────────────────────     │
│  ○ Abracadabra — Steve Miller Band     $7.99     │
│  ○ Bohemian Rhapsody — Queen           $9.99     │
│  ○ Thunderstruck — AC/DC              $9.99     │
│                    ↓ Browse all sequences         │
└─────────────────────────────────────────────────┘
```

### Logged-Out User

```
┌─────────────────────────────────────────────────┐
│  FREE SEQUENCES                                  │
│  ★ Monster Mash — Bobby Pickett                  │
│  ★ Ghostbusters — Ray Parker Jr.                 │
│  ★ This Is Halloween — Marilyn Manson            │
│                                                  │
│  ── ALL SEQUENCES ──────────────────────────     │
│  ○ Abracadabra — Steve Miller Band     $7.99     │
│  ○ Bohemian Rhapsody — Queen           $9.99     │
│  ○ Thunderstruck — AC/DC              $9.99     │
│                                                  │
│  Log in to see your purchased sequences          │
│                    ↓ Browse all sequences         │
└─────────────────────────────────────────────────┘
```

---

## Visual Treatment Per Tier

| Tier | Icon | Text weight | Price shown | Text opacity |
|------|------|-------------|-------------|-------------|
| Your Sequences | ✓ (checkmark, green or white) | Normal | No | 100% |
| Free Sequences | ★ (star, red accent) | Normal | No — show "Free" badge | 100% |
| More Sequences | ○ (open circle, gray) | Normal | Yes, inline, muted | 70–80% |

**Section headers:** Uppercase, small text (`text-xs tracking-widest`), zinc-500 color. "YOUR SEQUENCES" / "FREE SEQUENCES" / "MORE SEQUENCES" (or "ALL SEQUENCES" for logged-out).

**Divider:** Thin rule (`border-t border-zinc-800`) above the "More Sequences" section to visually separate owned/free from the catalog.

**"Browse all sequences" link:** Centered below the last item, `text-sm text-red-400 hover:text-red-300`, links to `/sequences`.

**"Log in" nudge (logged-out only):** `text-xs text-zinc-500`, below the catalog section. Links to login page with redirect back to `/modiq`.

---

## Behavior When Selecting an Unowned Sequence

Clicking an unowned (paid) sequence does NOT start ModIQ. Instead, show a soft inline interstitial below the dropdown:

```
┌─────────────────────────────────────────────────┐
│  Bohemian Rhapsody — Queen                       │
│                                                  │
│  You don't own this sequence yet.                │
│                                                  │
│  [ Add to Cart — $9.99 ]  [ View Sequence → ]   │
│                                                  │
│  Already purchased? Log in to access it.         │
└─────────────────────────────────────────────────┘
```

- "Add to Cart" button: Primary style (red bg, white text). Adds to cart via existing cart API.
- "View Sequence" link: Secondary style (text link). Goes to the sequence's product page for preview, audio, details.
- "Already purchased?" line: Only shows if user is logged out. Links to login.
- The interstitial replaces the upload zone temporarily — it slides away once they select an owned or free sequence.

### Behavior When Selecting a Free Sequence

Immediately enables the upload zone and ModIQ button. No interstitial. No login required. Zero friction.

### Behavior When Selecting an Owned Sequence

Same as free — immediately ready. Source layout data is fetched from backend API automatically. If the user arrived via download history link (`/modiq?sequence=abracadabra`), this selection is pre-populated and the upload zone is already active.

---

## Data Requirements

The dropdown needs a single API endpoint that returns the sequence catalog with ownership status:

```
GET /api/modiq/sequences
Authorization: Bearer <token> (optional)

Response:
{
  "sequences": [
    {
      "slug": "abracadabra",
      "title": "Abracadabra",
      "artist": "Steve Miller Band",
      "price": 7.99,
      "is_free": false,
      "is_owned": true,
      "season": "halloween"
    },
    {
      "slug": "monster-mash",
      "title": "Monster Mash",
      "artist": "Bobby Pickett",
      "price": 0,
      "is_free": true,
      "is_owned": true,
      "season": "halloween"
    },
    {
      "slug": "bohemian-rhapsody",
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "price": 9.99,
      "is_free": false,
      "is_owned": false,
      "season": "christmas"
    }
  ]
}
```

Frontend groups by: `is_owned && !is_free` → Your Sequences, `is_free` → Free Sequences, `!is_owned && !is_free` → More Sequences.

If no auth token provided, `is_owned` is `false` for all non-free sequences, and the "Your Sequences" group is hidden.

---

## Sorting Within Tiers

- **Your Sequences:** Most recently purchased first (helps users find what they just bought)
- **Free Sequences:** Alphabetical by title
- **More Sequences:** Alphabetical by title (or optionally: newest releases first)

---

## Edge Cases

- **User owns all sequences:** "More Sequences" section doesn't appear. Optionally show: "You own every sequence! 🎉" with a link to browse anyway.
- **No free sequences available:** "Free Sequences" section doesn't appear. (Unlikely but handle gracefully.)
- **Sequence added to cart but not purchased:** Still shows as unowned in the dropdown. Cart state is separate.
- **User purchases a sequence mid-session:** If they buy from the interstitial, re-fetch the sequences endpoint on cart confirmation and move the sequence to "Your Sequences" without full page reload.
