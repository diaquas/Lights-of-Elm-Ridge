# TRK:IQ Processing Stepper — Design Spec & Requirements

## Overview

The TRK:IQ processing stepper is the primary user-facing UI during audio analysis. It communicates progress across a multi-phase AI pipeline that converts an uploaded audio file into a complete `.xtiming` file for xLights — replacing hours of manual timing work with ~90 seconds of automated processing.

The stepper must feel **premium and intentional**, not like a loading screen. Every second the user waits should reinforce the value of what's happening behind the scenes.

---

## Architecture Summary

The pipeline runs 5 sequential steps. Each step transitions through defined states, and one step (Demucs) includes an additional **queue phase** to account for GPU provisioning latency.

```
Upload → Read → Separate (queue → process) → Beats → Lyrics → Assemble → Download
```

---

## Visual Layers (back to front)

The UI is composed of stacked visual layers that create depth without competing with content.

| Layer                  | Purpose                                                                                         | z-index |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------- |
| **Album Art Backdrop** | Blurred, desaturated album art fills the viewport. Creates a unique color atmosphere per track. | 0       |
| **Ambient Glow**       | Subtle red radial gradients that pulse slowly. Provides warmth when no album art loads.         | 0       |
| **Noise Texture**      | SVG fractal noise overlay at ~3.5% opacity. Adds grain/texture to prevent flat digital feel.    | 1       |
| **Content Container**  | All UI elements — header, track card, steps, insights, footer. Max-width 640px, centered.       | 2       |

### Album Art Backdrop

- **Source**: Fetched via iTunes Search API (`itunes.apple.com/search`) using track name + artist. Free, no API key, CORS-friendly.
- **Rendering**: `blur(90px)`, `saturate(0.25)`, `brightness(0.22)`. Oversized at 130% to prevent edge bleed. Fades in over 2 seconds on load.
- **Vignette**: Radial gradient from transparent center → `--bg-deep` at edges, plus top/bottom linear fade.
- **Fallback**: If API returns no results or fails, the ambient glow layer provides the atmosphere. No error state shown.
- **Completion behavior**: Filter shifts to `blur(100px) saturate(0.15) brightness(0.15)` over 2s — a subtle "settling" effect.

**Integration note**: In production, you likely already have album art from the upload metadata. Pass the URL directly to `applyAlbumArt(url)` and skip the iTunes lookup.

---

## UI Components

### 1. Header

| Element | Spec                                                                                        |
| ------- | ------------------------------------------------------------------------------------------- |
| Logo    | "TRK" in `--text-primary`, ":" in `--text-muted`, "IQ" in `--accent`. Font: Sora 800, 42px. |
| Tagline | "Complete timing tracks for xLights — in seconds." DM Sans 400, 15px, `--text-secondary`.   |

### 2. Track Card

Displays what's currently being processed. Persistent across all states.

| Element           | Spec                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Album thumbnail   | 56×56px rounded square. Loads album art; fades in over 0.8s. Falls back to animated waveform bars if no art. |
| Waveform bars     | 5 vertical bars animating `scaleY` with staggered delays. Red (`--accent`). Hidden when album art loads.     |
| Track label       | Uppercase, 11px, letter-spacing 1.5px. Shows "PROCESSING" during pipeline, "COMPLETED" when done.            |
| Track title       | Sora 700, 20px.                                                                                              |
| Artist            | DM Sans 400, 14px, `--text-secondary`.                                                                       |
| Duration          | JetBrains Mono 13px in a pill badge.                                                                         |
| Top border accent | 1px gradient line: `transparent → rgba(accent, 0.3) → transparent`.                                          |

### 3. Overall Progress Bar

Sits below the track card. Shows aggregate progress across all steps.

| Element      | Spec                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------- |
| Status text  | Left-aligned. Pulsing red dot + current sub-label text. Updates as steps/phases change.      |
| Percentage   | Right-aligned. JetBrains Mono 13px.                                                          |
| Bar track    | 4px tall, `--progress-track` background, rounded.                                            |
| Bar fill     | Gradient: `--accent-dim → --accent → --accent-glow`. Transitions `width` over 0.6s ease-out. |
| Scrubber dot | 10px circle at fill edge with `--accent-glow` and a `box-shadow` glow.                       |

### 4. Step List

Vertical timeline of 5 steps. Each step has an indicator column (icon + connector line) and a content column.

#### Step States

| State         | Icon                                                             | Connector                                 | Content      | Detail Area                       |
| ------------- | ---------------------------------------------------------------- | ----------------------------------------- | ------------ | --------------------------------- |
| **Pending**   | Step icon in `--bg-elevated` with `--border`                     | `--border-subtle`                         | Opacity 0.4  | Collapsed (max-height: 0)         |
| **Active**    | Spinner (CSS border animation) in red gradient with glow + pulse | Gradient `--accent-dim → --border-subtle` | Full opacity | Expanded with sub-progress + logs |
| **Completed** | Checkmark SVG, green border, green icon color                    | `rgba(success, 0.2)`                      | Full opacity | Collapsed                         |

#### Step Content Structure

Each step displays:

- **Title** — Sora 600, 15px. Short, action-oriented.
- **Time badge** — JetBrains Mono 11px. Shows elapsed seconds. Red background tint when active.
- **Queue badge** (conditional) — Amber pill with pulsing dot. Only on steps with a `queue` config. Reads "In queue".
- **Description** — DM Sans 13px, `--text-secondary`. One line explaining what's happening in plain language.
- **Detail area** (active only) — Expandable panel with:
  - Sub-label + percentage
  - Mini progress bar (3px)
  - Log output (monospace, max-height 88px with bottom gradient fade)

#### Log Lines

- Append one at a time with a fade-in animation (`translateY(4px) → 0`, `opacity 0 → 1`).
- Prefix: `›` for in-progress lines, `✓` for the final line (green-tinted prefix).
- Never re-render existing lines — append-only via `appendChild`.

### 5. Queue Phase (Demucs Step)

The "Separating instruments" step has an additional queue phase before processing begins. This accounts for the 30–60 second cold-start latency when Replicate provisions a GPU.

#### Queue behavior:

| Aspect                 | Behavior                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Trigger**            | Step config includes a `queue` object                                                                                                                  |
| **Badge**              | Amber "In queue" badge appears next to step title                                                                                                      |
| **Progress bar color** | Switches to amber (`#d4a24e`) during queue                                                                                                             |
| **Sub-label**          | "Waiting for our turn…"                                                                                                                                |
| **Progress behavior**  | Crawls slowly to ~60% and hovers — doesn't pretend to know exact wait time                                                                             |
| **Log lines**          | 3 messages explaining the wait: requesting GPU, AI needs dedicated hardware, typical wait time                                                         |
| **Transition**         | When queue clears: badge hides, bar color returns to red, sub-label switches to processing label, first log reads "We're up — loading Demucs AI model" |
| **Overall progress**   | Queue accounts for ~30% of the step's weight in the overall bar; processing accounts for ~70%                                                          |

**Integration note**: In production, wire the queue → processing transition to your Replicate webhook status change (from `starting` to `processing`).

### 6. Insight Card ("Under the Hood")

A rotating fact card that educates the user while they wait. Red left-border accent.

| Element  | Spec                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| Icon     | ⚡ emoji, 14px                                                                                                    |
| Label    | "UNDER THE HOOD" — 10px uppercase, letter-spacing 2px                                                             |
| Text     | 14px, `--text-secondary`, with `<strong>` highlights in `--text-primary`                                          |
| Rotation | Every 7 seconds. Crossfade: add `.fading` class (opacity 0, translateY 6px), swap HTML after 400ms, remove class. |

#### Insight Copy (10 entries, rotating)

The tone is **layman-first with a tech credibility anchor**. Each fact leads with what the user would care about and drops one bolded technical term as a trust signal.

1. **Demucs** is an AI model by Meta that can listen to a full mix and pull apart vocals, drums, bass, and melody — like unmixing paint.
2. Your track is split into **6 overlapping chunks** so the AI can process each section carefully and blend them together seamlessly.
3. **Essentia** is an open-source audio intelligence toolkit — it analyzes over **40 different characteristics** of your track to nail down tempo, key, and rhythm.
4. Beat confidence of **96%** means TRK:IQ is almost certain about the tempo — accurate enough to skip manual tapping for most tracks.
5. Each word in the lyrics is placed within **~50 milliseconds** of when it's actually sung — that's more precise than a single frame of video.
6. Your finished file contains **5 separate timing tracks** you can layer in xLights — beats, downbeats, phrases, vocals, and energy peaks.
7. Most light sequences need **800–2,000 timing marks**. By hand, that's hours of clicking. TRK:IQ does it in about a minute.
8. Lyrics are synced by comparing the **shape of the singer's voice** against a pronunciation model — like audio fingerprinting for every word.
9. Energy peaks mark the loudest, most intense moments in your track — perfect for **triggering your biggest lighting effects**.
10. The beat grid is verified by comparing each detected hit against a **virtual metronome** — ensuring your lights land right on the beat, not a fraction off.

### 7. Timing Footer

Bottom section showing elapsed time and estimated total.

| Element      | Spec                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Elapsed      | JetBrains Mono 14px, updates every second                                                                  |
| Est. total   | JetBrains Mono 14px, countdown from ~1:30                                                                  |
| Savings line | "Manual sequencing would take **~2.5 hours** — you're saving 99% of that." Green bold on the hours figure. |

### 8. Completion Banner

Replaces all processing UI when the pipeline finishes.

#### Transition sequence:

1. Steps container, overall progress, insight card, and timing footer all fade out (opacity → 0 over 0.5s)
2. After 0.5s: all four elements set to `display: none`, collapsing their space
3. Completion banner fades in below the track card (which persists)
4. Page scrolls to top smoothly
5. Album backdrop dims further
6. Waveform bars freeze and shrink
7. Track label changes to "COMPLETED"

#### Completion content:

| Element         | Spec                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Check icon      | 72px circle, green gradient background, green border, pop-in animation (scale 0 → 1.15 → 1)       |
| Title           | "Timing tracks ready" — Sora 700, 22px                                                            |
| Subtitle        | "5 timing tracks generated with 1,247 marks" — 14px, `--text-secondary`                           |
| Stats row       | Three stats: Total time, Timing marks, Tracks. Values in Sora 800 28px, labels in 11px uppercase. |
| Download button | Red gradient, Sora 600 15px, download icon SVG, hover lifts 2px with intensified glow shadow      |

---

## Step Copy Reference

All copy is written for a layman audience with light tech credibility sprinkled in. Titles are short and active. Descriptions explain the user benefit. Logs feel like a real console but are readable.

### Step 1: Reading your track

- **Description**: Learning everything about your audio file before we begin
- **Sub-label**: Analyzing audio…
- **Logs**: MP3 detected — high quality, 320kbps stereo → Track length → Scanning waveform → Audio loaded and ready

### Step 2: Separating instruments

- **Description**: AI isolates vocals, drums, bass, and melody into separate layers
- **Queue sub-label**: Waiting for our turn…
- **Queue logs**: Requesting a GPU from Replicate → In queue — AI models run on dedicated hardware → This usually takes 30–60 seconds
- **Processing sub-label**: Splitting with Demucs AI…
- **Processing logs**: We're up — loading Demucs AI model → Isolating vocals → Pulling out drums, bass, melody → Cleaning up overlaps → 4 clean layers ready

### Step 3: Finding every beat

- **Description**: Mapping the tempo, rhythm, and energy of the entire track
- **Sub-label**: Detecting rhythm…
- **Logs**: Listening for beats using Essentia AI → Tempo locked: 128 BPM — high confidence → 467 beats, 117 downbeats → Aligning beat grid → Beat map complete

### Step 4: Syncing the lyrics

- **Description**: Matching each word to the exact moment it's sung
- **Sub-label**: Aligning words to audio…
- **Logs**: Pulling lyrics → Matching words to vocal layer → Placing 212 words at timestamps → Fine-tuning boundaries → Lyric sync complete — 212 cue points

### Step 5: Building your timing file

- **Description**: Packaging everything into a ready-to-use xLights file
- **Sub-label**: Assembling .xtiming…
- **Logs**: Combining beats, lyrics, phrase tracks → Formatting for xLights → Writing 5 tracks, 1,247 marks → Double-checking alignment → Your .xtiming file is ready

---

## Typography

| Role               | Font           | Weight  | Usage                                            |
| ------------------ | -------------- | ------- | ------------------------------------------------ |
| Display / Headings | Sora           | 700–800 | Logo, step titles, completion title, stat values |
| Body               | DM Sans        | 400–600 | Descriptions, insight text, general copy         |
| Monospace / Data   | JetBrains Mono | 400–600 | Timers, percentages, log output, duration badge  |

All loaded via Google Fonts. No system font fallbacks visible in normal operation.

---

## Color System

| Token              | Value     | Usage                                                         |
| ------------------ | --------- | ------------------------------------------------------------- |
| `--bg-deep`        | `#0a0a0c` | Page background, vignette target                              |
| `--bg-card`        | `#111114` | Card backgrounds (track card, insight card)                   |
| `--bg-elevated`    | `#18181c` | Step icons, detail area backgrounds, badges                   |
| `--accent`         | `#e63333` | Primary brand red — progress fills, active states, logo       |
| `--accent-glow`    | `#ff4444` | Glows, gradient endpoints, hover states                       |
| `--accent-dim`     | `#991f1f` | Gradient starts, dimmed accents                               |
| `--success`        | `#22c55e` | Completed checkmarks, savings highlight                       |
| `--text-primary`   | `#f0eeec` | Headings, primary text                                        |
| `--text-secondary` | `#8a8690` | Descriptions, body text                                       |
| `--text-muted`     | `#5a5660` | Labels, timestamps, pending content                           |
| Queue amber        | `#d4a24e` | Queue badge, queue-phase progress bar (inline, not a CSS var) |

---

## Animation Inventory

| Animation             | Trigger             | Duration                     | Notes                                           |
| --------------------- | ------------------- | ---------------------------- | ----------------------------------------------- |
| Ambient pulse         | Always              | 8s / 12s                     | Radial glow scale + opacity oscillation         |
| Waveform bars         | During processing   | 1.2s per bar                 | Staggered `scaleY` bounce. Stops on completion. |
| Status dot pulse      | During processing   | 2s                           | Opacity + expanding box-shadow ring             |
| Active icon pulse     | Active step         | 2.5s                         | Box-shadow intensity oscillation                |
| Spinner               | Active step icon    | 0.8s                         | Border-top rotation                             |
| Step slide-in         | Page load           | 0.5s                         | Staggered left-slide with fade, 50ms apart      |
| Log line appear       | Log appended        | 0.3s                         | `translateY(4px) → 0` with fade                 |
| Insight crossfade     | Every 7s            | 0.4s out + 0.4s in           | Opacity + translateY via `.fading` class toggle |
| Queue badge glow      | During queue        | 2s                           | Border-color oscillation                        |
| Detail area expand    | Step becomes active | 0.5s                         | `max-height: 0 → 300px` with opacity            |
| Completion check pop  | On complete         | 0.6s                         | `scale(0) → 1.15 → 1` spring                    |
| Album art fade-in     | On image load       | 2s (backdrop) / 0.8s (thumb) | Opacity transition                              |
| Completion dimming    | On complete         | 2s                           | Backdrop filter transition                      |
| Download button hover | Hover               | 0.3s                         | `translateY(-2px)` + shadow intensify           |

---

## Integration Points

These are the functions your backend events should call to drive the UI in production (replacing the demo simulation):

| Function                         | When to call                                           | Parameters                                   |
| -------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| `startStep(index)`               | When a pipeline phase begins server-side               | Step index (0–4)                             |
| `updateSubProgress(index, pct)`  | When streaming progress from Replicate or your backend | Step index, percentage 0–100                 |
| `appendLog(index, text, isLast)` | When you have a real status message to show            | Step index, log string, boolean if final log |
| `updateOverall(pct)`             | If you calculate aggregate progress server-side        | Percentage 0–100                             |
| `applyAlbumArt(url)`             | At upload time when you have metadata                  | Image URL string                             |
| `showCompletion()`               | When the `.xtiming` file is ready for download         | None                                         |

For the queue phase specifically, the step's `queue` config drives the behavior automatically in the demo. In production, you'd call `startStep(1)` when Demucs is submitted, and the queue → processing transition should fire when your Replicate webhook reports status changing from `starting` to `processing`.

---

## Responsive Considerations

The current prototype targets desktop (640px max-width container). For production:

- Container should remain centered and max-width constrained on large screens
- At < 480px: reduce logo size, stack timing footer vertically, reduce stat font sizes in completion banner
- Track card: album thumb and duration badge may need to stack or hide on very narrow screens
- Log output is already constrained to 88px max-height — works on mobile as-is

---

## Error States (Not Yet Implemented)

Future work should handle:

- **Step failure**: Red icon state, error message in detail area, retry button
- **Queue timeout**: After N seconds in queue, show a "taking longer than usual" message with option to cancel
- **Album art 404**: Already handled (silent fallback to waveform bars)
- **Network loss**: Pause elapsed timer, show reconnection indicator
- **Lyrics not found**: Skip the lyrics step gracefully or show "instrumental track detected"
