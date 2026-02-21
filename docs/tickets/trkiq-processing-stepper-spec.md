# TRK:IQ Processing Stepper — Implementation Spec

> **Handoff doc for Claude Code.** This contains everything needed to build the processing view that users see while TRK:IQ generates their timing tracks. A reference HTML prototype exists at `trkiq-v3.html` in the repo — use it as the visual source of truth.

---

## What This Screen Does

This is the "please wait" screen for TRK:IQ. The user has uploaded a song, and the backend is running a multi-step AI pipeline (~5 minutes average) that produces an `.xtiming` file with 11 timing tracks. This screen communicates progress, educates the user on what's happening, and transitions to a review/download flow on completion.

**Design philosophy:** One calm visual, not five competing progress bars. The user should glance at this screen and feel confident, not anxious. No fake percentages. No terminal logs. No information overload.

---

## Design Tokens

### Colors

```css
--bg: #0b0b0e;           /* Page background */
--bg-card: #121216;       /* Card surfaces */
--bg-raised: #19191e;     /* Elevated elements, badges */
--accent: #e63333;        /* Primary red — progress, active states, logo */
--accent-soft: rgba(230,51,51,0.12);
--accent-glow: #ff4444;   /* Hover states, glows */
--green: #34d399;         /* Completed states */
--green-soft: rgba(52,211,153,0.12);
--amber: #f59e0b;         /* Queue/waiting states */
--amber-soft: rgba(245,158,11,0.1);
--text-1: #f2f0ed;        /* Primary text, headings */
--text-2: #9a9498;        /* Body text, descriptions */
--text-3: #5c5760;        /* Muted labels, inactive elements */
--ring-track: #1e1e24;    /* Progress ring background track */
```

### Typography

| Role | Font | Weight | Fallback |
|---|---|---|---|
| Display / Headings | Outfit | 700–800 | sans-serif |
| Body | DM Sans | 300–700 | sans-serif |
| Monospace / Data | JetBrains Mono | 400–500 | monospace |

Load via Google Fonts:
```
Outfit:wght@300;400;500;600;700;800
DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700
JetBrains+Mono:wght@400;500
```

---

## Layout

- Single column, centered, `max-width: 520px`
- Padding: `48px 24px 60px`
- Everything fits on one viewport during processing — no scroll required
- All elements stagger-animate in on load using `fadeUp` (opacity 0 → 1, translateY 12px → 0, 0.6s ease) with increasing delays (0.1s → 0.45s)

---

## Visual Layers (back to front)

### 1. Album Art Backdrop (z-index: 0)
- **Source:** iTunes Search API (`itunes.apple.com/search?term={track}+{artist}&media=music&limit=1`), free, no key, CORS-friendly
- **Rendering:** `filter: blur(100px) saturate(0.2) brightness(0.18)`, oversized at 140%, offset -20% to prevent edge bleed
- **Fade-in:** `opacity 0 → 1` over 2.5s on image load
- **Vignette:** `::after` pseudo with `radial-gradient(ellipse at 50% 35%, transparent 5%, var(--bg) 65%)`
- **Fallback:** If API fails, ambient blobs provide atmosphere. No error state shown.
- **On completion:** Transition to `blur(120px) saturate(0.1) brightness(0.12)` over 2s
- **Production note:** Skip iTunes lookup and pass album art URL directly from upload metadata via `applyAlbumArt(url)`

### 2. Ambient Blobs (z-index: 0)
- Two radial blobs with `filter: blur(100px)`:
  - Blob 1: 600×600, top-center, `rgba(230,51,51,0.06)`
  - Blob 2: 400×400, bottom-right, `rgba(230,51,51,0.03)`
- Fade in over 2s on load

### 3. Noise Texture (z-index: 1)
- SVG fractal noise: `feTurbulence baseFrequency="0.9" numOctaves="4"`, tiled at 256px
- Fixed position, full viewport, `opacity: 0.03`, pointer-events: none

### 4. Content (z-index: 2)
- All interactive UI described below

---

## Components

### Logo
- **Text:** "TRK" (--text-1) + ":" (--text-3) + "IQ" (--accent)
- **Font:** Outfit 800, 36px, letter-spacing -1px
- **Margin-bottom:** 40px

### Progress Ring
- **Size:** 240×240px SVG
- **Track:** Circle r=112, stroke-width 5, stroke `--ring-track`
- **Fill:** Circle r=112, stroke-width 5, stroke `--accent`, `stroke-linecap: round`
- **Progress method:** `stroke-dasharray: 703.7` (circumference), animate `stroke-dashoffset` from 703.7 (0%) to 0 (100%)
- **Transition:** `stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)` — snappy ease-out
- **Glow:** `filter: drop-shadow(0 0 8px rgba(230,51,51,0.3))`
- **Progress is honest:** based on `elapsed / estimatedTotal`, capped at 98% until actual completion
- **On completion:** stroke changes to `--green` with green glow, transitions over 0.5s

#### Ring Center Content (absolutely positioned inside ring)
- **Album art thumbnail:** 80×80px, border-radius 14px, 1px border `rgba(255,255,255,0.05)`
  - Fades in over 0.8s on load
  - **Placeholder:** 5 animated bars (accent red, staggered scaleY pulse at 1.2s) — hides when art loads
- **Track title:** Outfit 700, 17px, max-width 160px with text-overflow ellipsis
- **Artist:** DM Sans 13px, --text-2

### Current Phase Label
- Horizontal layout: pulsing dot + text
- **Dot:** 7px circle, `--accent`, pulsing animation (opacity + expanding box-shadow ring, 2s)
  - Queue state: `--amber`
  - Complete state: `--green`, no animation
- **Text:** DM Sans 500, 14px, `--text-1`
- Updates to match current pipeline step (see Step Config below)

### Step Pills (horizontal progress bar)
- 5 pills in a flex row with 6px gap, each `flex: 1`, height 4px, border-radius 4px
- **Pending:** `--ring-track` (dark)
- **Active:** `--bg-raised` background with a `::after` pseudo that animates width 0% → 100% in 1.5s, repeating (indeterminate feel)
  - Queue variant: `::after` uses `--amber` instead of `--accent`
- **Done:** solid `--green`

#### Step Names (below pills)
- 5 labels aligned 1:1 with pills, 10px font, 500 weight, `--text-3`
- Active label: `--text-1`
- Done label: `--green`

### Insight Card ("Did You Know")
- **Background:** `--bg-card`, 1px border `rgba(255,255,255,0.04)`, border-radius 16px, padding 22px 24px
- **Left accent:** 3px `::before` bar, gradient from `--accent` → transparent
- **Badge:** "💡 DID YOU KNOW" — 9px uppercase, letter-spacing 2px, weight 700, `--text-3`
- **Body:** DM Sans 15px, line-height 1.7, `--text-2`
  - `<strong>` renders in `--text-1`, weight 600
  - `<a>` renders in `--accent`, weight 600, subtle bottom border `rgba(230,51,51,0.3)`, intensifies on hover
- **Rotation:** Every **18 seconds**, crossfade via `.fading` class (opacity 0, translateY 5px over 0.4s), swap innerHTML after 400ms, remove class
- **Shuffle:** Fisher-Yates shuffle on page load — repeat users see different order each session
- **Entry count:** 30 insights (see full list below)
- **Lifecycle:** Fades out on completion (opacity → 0 over 0.5s, then display: none)

### Timer
- **Elapsed:** JetBrains Mono 500, 28px, `--text-1`, updates every second
- **Label:** "ELAPSED" — 11px uppercase, letter-spacing 1px, `--text-3`
- **Estimate:** DM Sans 13px, `--text-2`, natural language:
  - `> 60s remaining` → "About N min remaining"
  - `10–60s remaining` → "Less than a minute left"
  - `< 10s remaining` → "Almost done…"
  - Initial state → "Usually takes about 5 minutes"

### Completion State
Replaces all processing UI when pipeline finishes.

#### Transition sequence:
1. Phase label, insight card, and timer fade out (opacity → 0, 0.5s)
2. After 0.6s: set those to `display: none`
3. Completion area fades in (`fadeUp` 0.5s)
4. Ring reaches 100%, stroke turns green
5. All pills turn green
6. Phase dot turns green, text reads "Complete"
7. Album backdrop dims further
8. Scroll to top smoothly

#### Completion content:
- **Title:** "Your timing tracks are ready" — Outfit 700, 24px
- **Subtitle:** "11 tracks · {marks} marks · built in {time}" — 14px, `--text-2`
- **Stats row:** Three stats in flex with 40px gap:
  - Timing marks (e.g., "1,247") — Outfit 800, 30px
  - Tracks ("11")
  - Time saved ("99" + "%" in accent red)
  - Labels: 10px uppercase, letter-spacing 1.5px, `--text-3`
- **Button:** "Review & Download" — eye icon SVG, Outfit 600 15px, `--accent` background, white text, border-radius 12px, padding 15px 40px
  - Hover: translateY(-2px), intensified box-shadow
  - **Action:** navigates to the track selector/review screen

---

## Step Config

The pipeline has 6 internal steps that map to 5 visible pills (queue + processing share one pill):

| Internal Step | Phase Text | Pill | Duration (real ~) | Notes |
|---|---|---|---|---|
| Read | "Reading your track…" | Read | ~10s | |
| Queue | "Waiting for our turn…" | Separate | 30–60s | Amber dot + amber pill animation |
| Separate | "Separating instruments with AI…" | Separate | ~2 min | Same pill as queue, red animation |
| Beats | "Finding every beat…" | Beats | ~1 min | |
| Lyrics | "Syncing the lyrics…" | Lyrics | ~1 min | |
| Build | "Building your timing file…" | Build | ~30s | |

**Queue → Processing transition:** When Replicate webhook reports status change from `starting` to `processing`, update phase text and switch pill/dot color from amber to red.

---

## Insight Copy (30 entries, shuffled, 18s rotation)

Links open in new tabs (`target="_blank" rel="noopener"`). 6 total hyperlinks spread across 30 entries.

### xLights Community (7)

```
1. <strong>Fun fact:</strong> the "t" key in xLights adds one timing mark. We're about to save you a few thousand presses.

2. <strong>Fun fact:</strong> a 4-minute song at 120 BPM has about 480 beats. Imagine tapping "t" for each one. You're welcome.

3. Most sequences need <strong>800–2,000 timing marks</strong>. By hand, that's hours of clicking. TRK:IQ does it in about a minute.

4. <strong>Did you know?</strong> Most sequencers spend 2–4 hours just on timing marks before they even start mapping effects. Not anymore.

5. Your finished file contains <strong>11 separate timing tracks</strong> — vocals, drums, kick, snare, hi-hat, guitar, bass, piano, beats, bars, and song structure — all ready to layer in xLights.

6. <strong>Pro tip:</strong> the vocal timing track is great for lip-sync effects on singing faces — every word is already placed for you.

7. <strong>Pro tip:</strong> the downbeat track marks the "1" of every measure — use it to trigger scene changes or color shifts so your show follows the musical structure.
```

### Demucs — Separation (6)

```
8. <a href="https://github.com/facebookresearch/demucs">Demucs</a> is an AI model by Meta Research that listens to a full mix and pulls apart vocals, drums, bass, and melody — like unmixing paint.

9. Your track is split into <strong>6 overlapping chunks</strong> so Demucs can focus on each section carefully and blend them back together without gaps or glitches.

10. Demucs uses a technique called a <strong>Hybrid Transformer</strong> — it analyzes your audio in both the time domain (the raw waveform) and the frequency domain (the spectrogram) at the same time.

11. The AI separation model was trained on over <strong>800 professionally mixed songs</strong> where the individual instrument stems were available — it learned by studying how real recordings are assembled.

12. <a href="https://github.com/facebookresearch/demucs">Demucs</a> won the <strong>2021 Sony Music DemiXing Challenge</strong>, beating every other source separation system in the world at pulling clean stems from mixed audio.

13. The separation runs on a <strong>dedicated GPU</strong> in the cloud — the same kind of hardware used to train large language models. That's why there's sometimes a short queue.
```

### Essentia — Beat/Rhythm Analysis (6)

```
14. <a href="https://essentia.upf.edu">Essentia</a> is an open-source audio intelligence toolkit built by the Music Technology Group in Barcelona — it powers audio analysis for <strong>millions of tracks</strong> across the music industry.

15. Essentia checks over <strong>40 characteristics</strong> of your track — tempo, key, rhythm, spectral shape, and more — to build a complete picture before placing a single timing mark.

16. Beat confidence of <strong>96%</strong> means TRK:IQ is almost certain about the tempo — accurate enough to skip manual tapping for most tracks.

17. The beat grid is verified against a <strong>virtual metronome</strong> — ensuring your lights land right on the beat, not a fraction off.

18. <a href="https://essentia.upf.edu">Essentia</a> doesn't just find the tempo — it detects <strong>downbeats</strong> (the "1" of each measure), which is how TRK:IQ knows where musical phrases start and end.

19. The rhythm analysis uses a technique called <strong>beat tracking</strong> — the AI listens for repeating patterns of strong and weak pulses, similar to how a drummer feels the groove.
```

### SOFA — Lyrics Alignment (5)

```
20. <a href="https://github.com/qiuqiao/SOFA">SOFA</a> (Singing-Oriented Forced Aligner) is a specialized AI built specifically for singing — unlike speech tools, it understands how vowels stretch and notes bend in a vocal performance.

21. The lyrics alignment maps every syllable to within <strong>~50 milliseconds</strong> of when it's actually sung — more precise than a single frame of video.

22. Lyrics are synced by comparing the <strong>shape of the singer's voice</strong> against a pronunciation model — like audio fingerprinting for every word.

23. Traditional speech alignment tools struggle with singing because singers <strong>hold vowels, slide between notes, and add vibrato</strong>. SOFA was trained specifically on singing data to handle this.

24. <a href="https://github.com/qiuqiao/SOFA">SOFA</a> works at the <strong>phoneme level</strong> — the smallest units of sound in language — then groups them back into words. It's like the AI is reading lips, but with sound waves.
```

### General Pipeline (6)

```
25. The entire pipeline chains <strong>4 different AI models</strong> together — each one specialized for a different job. No single model could do all of this alone.

26. TRK:IQ separates your audio before analyzing it because beats are easier to detect in an <strong>isolated drum track</strong> and lyrics are easier to align with <strong>clean vocals</strong>.

27. The timing file format (<strong>.xtiming</strong>) is native to xLights — you can drag it straight into your sequence without any conversion or import steps.

28. Each timing track serves a different purpose: <strong>kick</strong> for bass drops, <strong>snare</strong> for sharp accents, <strong>vocals</strong> for lip sync, <strong>bars</strong> for measure-level phrasing, and <strong>song structure</strong> for scene changes.

29. The hardest part of building timing tracks isn't any single step — it's making sure the beats, lyrics, and phrases all <strong>agree with each other</strong>. TRK:IQ cross-references every layer.

30. After this finishes, you're skipping straight to the fun part — <strong>mapping effects to music</strong> — instead of spending your first session just placing timing marks.
```

---

## Integration Points

| Function | When to call | What it does |
|---|---|---|
| `applyAlbumArt(url)` | At upload, from metadata | Sets backdrop + ring thumbnail, skips iTunes lookup |
| `startStep(index)` | Backend phase begins | Updates phase text, dot color, active pill |
| `updateRing(pct)` | Periodic from backend | Sets ring fill percentage (0–100) |
| `complete()` | `.xtiming` file ready | Triggers full completion transition |
| Queue → Processing | Replicate webhook `starting` → `processing` | Advance internal step index, amber → red |

---

## Animation Reference

| Animation | Duration | Easing | Trigger |
|---|---|---|---|
| Page load fadeUp (staggered) | 0.6s | ease | Load, delays 0.1–0.45s |
| Ring fill | 1.5s | cubic-bezier(0.16, 1, 0.3, 1) | Every progress update |
| Phase dot pulse | 2s | ease-in-out | Continuous while processing |
| Waveform bar placeholder | 1.2s per bar | ease-in-out | Until album art loads |
| Pill fill sweep | 1.5s | ease-in-out | Continuous on active pill |
| Insight crossfade | 0.4s out + 0.4s in | ease | Every 18s |
| Completion fadeUp | 0.5s | ease | On complete |
| Album backdrop dim | 2s | ease | On complete |
| Download button hover | 0.2s | ease | Hover |

---

## Responsive Notes

Currently targets desktop at 520px max-width. For production:
- Container stays centered and constrained on large screens
- At < 480px: reduce ring to 200px, reduce logo to 28px, stack timer vertically
- Insight card and pills work at any width as-is

---

## Output Tracks (11 total)

For reference — these are the timing tracks TRK:IQ generates:

1. Vocals
2. Drums (full kit)
3. Kick
4. Snare
5. Hi-Hat
6. Guitar
7. Bass
8. Piano
9. Beats
10. Bars
11. Song Structure

---

## Not Yet Implemented

- Error states (step failure, queue timeout, network loss)
- Lyrics-not-found / instrumental track handling
- Mobile responsive breakpoints
- "Review & Download" button wiring to selector screen
- Real-time progress streaming from backend (currently uses elapsed-based estimation)
