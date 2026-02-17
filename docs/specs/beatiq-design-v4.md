# Beat:IQ — Design Document v4
## Lights of Elm Ridge · Instrument Timing Track Generator for xLights

**Tool family:** FirstLight → xWire → **Beat:IQ** / Lyr:IQ → Mod:IQ

---

## What Beat:IQ Does

**Drop an MP3 → Get individual timing tracks for every instrument → Import into xLights**

For a typical Christmas song, Beat:IQ produces:

```
📁 TSO_ChristmasEve_BeatIQ.xtiming
├── Drums — Kick
├── Drums — Snare  
├── Drums — Hi-Hat
├── Drums — Cymbals/Crashes
├── Bass
├── Guitar — Electric
├── Guitar — Acoustic
├── Keys/Piano
├── Strings/Orchestra
├── Beats (combined downbeats)
├── Bars (measure boundaries)
├── BPM + Tempo Map (metadata)
├── Chord Changes
└── Song Sections (intro/verse/chorus/bridge/outro)
```

Each track is a standard xLights timing track with marks at every onset. A sequencer can now:
- Assign cymbal crashes to strobe effects on specific props
- Sync kick drum hits to mega tree chase patterns
- Trigger guitar riff highlights on arches
- Map piano runs to matrix waterfall effects
- Use string swells for slow color washes
- Use song sections to structure their entire sequence flow

**This is something NO tool in the xLights ecosystem currently does.**

---

## The Current Pain

### QM VAMP Plugins (~2010 Academic Tools)

The xLights community uses **QM VAMP plugins** (Queen Mary, originally designed for Audacity) for beat/bar detection:

- **Works on the full mix** — can detect overall beats/bars reasonably well
- **Cannot isolate instruments** — "just the snare hits" or "just the guitar riffs" = impossible
- **No drum sub-tracks** — kick, snare, hi-hat, cymbals all lumped together
- **Breaks down on complex music** — tempo changes, odd time signatures, heavily layered arrangements
- **Requires separate Audacity installation** — extra friction for beginners
- **Limited to beats/bars** — no concept of instrument-specific onsets, song sections, or chord changes

### Community Has Been Asking For This

There is a literal GitHub issue (#2715) on the xLights repository where a user requested exactly what Beat:IQ does — using Deezer's Spleeter to split stems and use them as separate audio references for effects like VU Meter. The xLights devs acknowledged it as a "very good idea" but never built it. The community is manually splitting stems in Spleeter, then trying to bring them back as separate timing tracks. Beat:IQ solves this from the outside without requiring xLights to change anything.

### Current Sequencer Options

1. **Manually press "T" while listening** to each instrument (hours of work per song)
2. **Use VAMP beats/bars** and accept that all percussion is lumped together
3. **Run Spleeter manually** → export stems → analyze each in Audacity → create timing tracks → import to xLights (advanced users only, extremely tedious)

---

## How It Works: The Moises API

**Moises has a developer API** with exactly the capabilities we need:

| Moises API Module | What We Use It For | Cost |
|---|---|---|
| **Stems Separation** | Split MP3 into isolated instrument tracks | $0.10/min |
| **Beats & Chords** | Detect beats, bars, chord changes, BPM | $0.07/min |
| **Music Segmentation** | Detect song sections (verse/chorus/bridge) | $0.07/min |
| **Lyrics Transcription** | Word-level timestamps (shared with Lyr:IQ) | $0.07/min |

**Cost per song:** A 3-minute song costs roughly:
- Stems: $0.30
- Beats: $0.21
- Segmentation: $0.21
- Lyrics: $0.21
- **Total: ~$0.93 per song**

At scale (100 songs/month): ~$93/month in API costs. Moises offers volume discounts for enterprise.

### Moises Stem Separation Capabilities

| Tier | Stems Available |
|---|---|
| **Free** | Vocals, Drums, Bass, Other |
| **Premium** | + Guitar, Keys, Strings, Wind |
| **Pro (drums)** | Kick, Snare, Hi-Hat, Toms, Cymbals |
| **Pro (vocals)** | Lead Vocals, Background Vocals ← KEY FOR LYR:IQ |
| **Pro (guitar)** | Acoustic, Electric, Rhythm, Lead |

The drum sub-separation alone is worth the entire tool. A dedicated snare track vs trying to pick snare hits out of a full mix waveform is night and day.

---

## Processing Pipeline

```
MP3 Upload
    │
    ├──→ Extract ID3 tags (artist, title, BPM if embedded)
    │
    ▼
┌─────────────────────────────┐
│   Moises API: Stems         │──→ Vocals (lead)    ──→ Lyr:IQ
│   Separate into 7+ stems    │──→ Vocals (BG)      ──→ Lyr:IQ
│                              │──→ Drums (composite) ──→ Sub-separation
│                              │    ├── Kick          ──→ Onset detection
│                              │    ├── Snare         ──→ Onset detection
│                              │    ├── Hi-Hat        ──→ Onset detection
│                              │    └── Cymbals       ──→ Onset detection
│                              │──→ Bass              ──→ Onset detection
│                              │──→ Guitar            ──→ Onset detection
│                              │──→ Keys              ──→ Onset detection
│                              │──→ Strings/Other     ──→ Onset detection
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│   Moises API: Beats/Chords  │──→ Downbeats → timing track
│                              │──→ Bar lines → timing track  
│                              │──→ BPM / tempo map → metadata
│                              │──→ Chord changes → timing track
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│   Moises API: Segmentation  │──→ Intro/Verse/Chorus/Bridge/Outro → timing track
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│   Onset Detection Engine    │  For each stem:
│   (Web Audio API or server) │  - Energy-based onset detection
│                              │  - Instrument-specific thresholds
│                              │  - Convert to ms timing marks
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│   .xtiming Export           │  Multi-track .xtiming file
│                              │  10-15 named timing tracks
│                              │  Ready for xLights import
└─────────────────────────────┘
```

---

## Onset Detection on Isolated Stems

Once Moises gives us clean, isolated stems, onset detection becomes dramatically easier. On a mixed track, a kick drum and a bass note at the same time are indistinguishable. On an isolated kick stem? Trivial.

### Per-Instrument Detection Approach

| Instrument | Detection Method | Threshold Tuning |
|---|---|---|
| Kick drum | Energy spike in low freq (20-150Hz) | High threshold, wide minimum gap |
| Snare | Energy spike in mid freq (200-2kHz) + noise burst | Medium threshold |
| Hi-hat | High freq energy (5-15kHz) | Low threshold, fast recovery |
| Cymbals | Sustained high freq energy | Amplitude envelope, longer sustain |
| Bass | Pitch onset + energy spike in low freq | Medium, note-change detection |
| Guitar | Broadband energy spike + spectral flux | Adaptive based on playing style |
| Keys/Piano | Sharp attack envelope + harmonic onset | Per-note detection |
| Strings | Slower onset, bow changes | Spectral flux, longer analysis window |

We can run onset detection client-side using the Web Audio API (OfflineAudioContext for analysis). Isolated stems deliver 90%+ accuracy where VAMP plugins on mixed audio hit maybe 70%.

---

## Drum Fill Accuracy: 32nd & 64th Note Resolution

### The Math

A 32nd note at 120 BPM = **62.5ms per note.** A 64th note at 120 BPM = **31.25ms.**

| Frame Rate | ms/frame | 32nd notes (62.5ms) | 64th notes (31.25ms) |
|---|---|---|---|
| 20 fps (default xLights) | 50ms | Barely — 1.25 frames/note | ❌ Sub-frame |
| 25 fps | 40ms | Yes — 1.56 frames | Barely — 0.78 frames |
| **40 fps** | 25ms | **Yes — 2.5 frames** | **Yes — 1.25 frames** |
| **50 fps** | 20ms | **Yes — 3.125 frames** | **Yes — 1.56 frames** |

### Why This Works

Moises outputs **44.1kHz WAV** stems. That's one audio sample every 0.023ms. At 64th notes (31.25ms), we have **~1,400 audio samples per note** to analyze. Onset detection on a clean, isolated snare stem with that resolution is not a hard problem — the attack transient of a snare hit is one of the sharpest, most detectable events in audio.

We analyze at full sample rate. The .xtiming output uses millisecond integer timestamps, giving us 1ms resolution — more than sufficient for 64th notes at any reasonable tempo.

**Slowing stems down is unnecessary** — onset detection operates on raw audio samples, not on playback speed. The entire analysis happens offline at full fidelity.

### Frame Rate Disclaimer

Beat:IQ will include a recommendation with every download:

> **⚡ For drum fill accuracy:** Set your xLights sequence to **40fps or 50fps** before importing these timing tracks. At the default 20fps, fast drum fills (32nd/64th notes) may not resolve cleanly to individual frames.

Additionally, we can include a "frame rate compatibility" indicator per track — if a timing track contains events closer together than the selected frame rate can resolve, we flag it.

---

## Output Format: Multi-Track .xtiming

xLights supports importing multiple timing tracks from a single .xtiming file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<timings>
  <timing name="Drums - Kick" SourceVersion="2024.x">
    <EffectLayer>
      <Effect label="" startTime="500" endTime="550"/>
      <Effect label="" startTime="1000" endTime="1050"/>
      <Effect label="" startTime="1500" endTime="1550"/>
    </EffectLayer>
  </timing>
  <timing name="Drums - Snare" SourceVersion="2024.x">
    <EffectLayer>
      <Effect label="" startTime="1000" endTime="1050"/>
      <Effect label="" startTime="2000" endTime="2050"/>
    </EffectLayer>
  </timing>
  <timing name="Guitar" SourceVersion="2024.x">
    <EffectLayer>
      <Effect label="" startTime="200" endTime="800"/>
      <Effect label="" startTime="1200" endTime="1800"/>
    </EffectLayer>
  </timing>
  <timing name="Chord Changes" SourceVersion="2024.x">
    <EffectLayer>
      <Effect label="Am" startTime="0" endTime="2000"/>
      <Effect label="F" startTime="2000" endTime="4000"/>
      <Effect label="C" startTime="4000" endTime="6000"/>
      <Effect label="G" startTime="6000" endTime="8000"/>
    </EffectLayer>
  </timing>
  <timing name="Song Sections" SourceVersion="2024.x">
    <EffectLayer>
      <Effect label="intro" startTime="0" endTime="15000"/>
      <Effect label="verse 1" startTime="15000" endTime="45000"/>
      <Effect label="chorus" startTime="45000" endTime="65000"/>
    </EffectLayer>
  </timing>
</timings>
```

**The sequencer imports this and instantly has 10-15 named timing tracks** — each labeled, each instrument-specific, all perfectly synced.

---

## VU Meter Effect Synergy

xLights' VU Meter effect can already react to audio levels, trigger on beats, and filter by frequency range. But it operates on the full mixed audio. Beat:IQ timing tracks dramatically enhance VU Meter usage:

- Point a VU Meter "timing event" trigger at the **Drums - Kick** track → clean mega tree pulses
- Use **Drums - Snare** for arch strobe triggers
- Use **Drums - Cymbals** for whole-display sparkle/glitter flashes
- Use **Song Sections** to set up effect zones without manual section marking

This isn't a replacement for VU Meter — it makes VU Meter dramatically more precise by giving it instrument-specific timing marks instead of trying to filter frequencies from a mixed signal.

---

## User Experience

### One Upload → Everything Out

```
┌─────────────────────────────────────┐
│                                     │
│     🎵 Drop your MP3 here          │
│        or click to browse           │
│                                     │
│  "Christmas Eve / Sarajevo"         │
│   Trans-Siberian Orchestra          │
│   BPM: 138 · Duration: 3:24        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  Processing with Moises AI...       │
│  ■■■■■■■■░░ 80%                    │
│                                     │
│  ✅ Stems separated (7 tracks)     │
│  ✅ Beats & bars detected (138 BPM)│
│  ✅ Chord changes mapped           │
│  ✅ Song sections identified       │
│  ⏳ Running onset detection...     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  🥁 YOUR TIMING TRACKS             │
│                                     │
│  Drums                              │
│  ├ Kick              (147 hits)  ✅│
│  ├ Snare             (89 hits)   ✅│
│  ├ Hi-Hat            (312 hits)  ✅│
│  └ Cymbals/Crashes   (23 hits)   ✅│
│                                     │
│  Melodic                            │
│  ├ Bass              (201 notes) ✅│
│  ├ Guitar - Electric (156 notes) ✅│
│  ├ Guitar - Acoustic (42 notes)  ✅│
│  ├ Keys/Piano        (98 notes)  ✅│
│  └ Strings           (34 swells) ✅│
│                                     │
│  Structure                          │
│  ├ Beats             (312 marks) ✅│
│  ├ Bars              (78 bars)   ✅│
│  ├ Chord Changes     (45 chords) ✅│
│  └ Song Sections     (8 parts)   ✅│
│                                     │
│  ⚡ Recommended: 40fps or higher    │
│     (32nd note fills detected)      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  ⬇ Download All (.xtiming) │   │
│  └─────────────────────────────┘   │
│                                     │
│  ⬇ Drums only  ⬇ Melodic only     │
│  ⬇ Structure only                  │
│                                     │
│  🎤 Also want singing face tracks? │
│  [Generate Lyr:IQ →]               │
│                                     │
└─────────────────────────────────────┘
```

---

## Competitive Landscape

### Beat:IQ vs QM VAMP Plugins

| | QM VAMP Plugins | Beat:IQ |
|---|---|---|
| Instrument isolation | ❌ None | ✅ 7+ isolated stems |
| Drum sub-tracks | ❌ All percussion lumped | ✅ Kick, snare, hi-hat, cymbals |
| Song sections | ❌ | ✅ Auto-detected |
| Chord changes | ❌ | ✅ From Moises |
| BPM / tempo map | Basic | ✅ Handles tempo changes |
| Install required | Audacity + VAMP | ❌ Web-based |
| Quality on complex music | Poor (full mix) | Excellent (isolated stems) |
| 32nd/64th note fills | Unreliable | ✅ 1ms resolution on clean stems |
| xLights format output | Via Audacity export | Direct multi-track .xtiming |
| Processing time | Manual per-track | ~60 seconds, all tracks |

### Beat:IQ vs Manual Spleeter Workflow

| | DIY Spleeter → Audacity | Beat:IQ |
|---|---|---|
| Stem separation | ✅ But manual CLI | ✅ Automated |
| Drum sub-separation | ❌ Spleeter doesn't | ✅ Moises Pro |
| Onset detection | Manual per stem | ✅ Automated per stem |
| Beats/bars/sections | Separate VAMP pass | ✅ Included (Moises) |
| xLights export | Manual timing track creation | ✅ Direct .xtiming |
| Technical skill needed | High (Python, CLI, Audacity) | None (web upload) |
| Time per song | 30-60 minutes | ~60 seconds |

---

## Pricing Model

**Cost structure per song (3-minute average):**

| Moises API Call | Cost |
|---|---|
| Stems separation | $0.30 |
| Beats & chords | $0.21 |
| Segmentation | $0.21 |
| Lyrics transcription (shared with Lyr:IQ) | $0.21 |
| **Total API cost** | **$0.93** |

**Revenue options:**

1. **Per-song pricing:** $2.99-4.99 per song (covers API + healthy margin)
2. **Bundle with LOER sequence purchases:** Free Beat:IQ + Lyr:IQ with any sequence file purchase
3. **Monthly subscription:** $9.99/month unlimited (break-even ~10 songs)
4. **Freemium:** Free basic beats/bars/sections, paid for instrument-specific tracks

Bundling option is compelling: *"Buy any sequence from Lights of Elm Ridge, get Beat:IQ + Lyr:IQ processing free for that song."* Drives sequence sales while providing genuinely useful tooling.

---

## Implementation Phases

### Phase 1: Moises Integration + Core Pipeline
- Moises API integration (stems, beats, segmentation)
- Onset detection engine for isolated stems
- .xtiming multi-track export
- Basic web UI: upload → process → download
- Frame rate advisory system

### Phase 2: Interactive Preview
- Waveform display per stem
- Audio playback synced to timing marks
- Visual confidence indicators
- Selective track download

### Phase 3: Advanced Features
- Onset sensitivity tuning per instrument (user-adjustable thresholds)
- Custom track naming
- Batch processing (multiple songs)
- Export format options (individual .xtiming per instrument vs combined)

### Phase 4: Platform Integration
- Bundle with LOER sequence purchases
- Shared processing pipeline with Lyr:IQ (one upload → both tools)
- FirstLight integration (suggest timing tracks for your display package)
- Feed data to future Show:IQ / auto-sequencing engine

---

## Future Enhancement: Smart Song Trimming (Trim:IQ)

### The Problem

Most holiday display songs need trimming before sequencing. The community workflow today is:

1. Open Audacity (separate app)
2. Load the MP3
3. Manually identify sections to cut (long intros, repeated verses, spoken interludes, fade-out outros)
4. Cut/trim/crossfade
5. Export as constant bit rate MP3
6. Bring back into xLights

People share Audacity .aup project files alongside sequences so the next person can reconstruct the same trim. xLights has a "Prepare Audio" tool that accepts Reaper project files, but almost nobody uses it — everyone's in Audacity.

**Shorter is better in this hobby.** Most experienced sequencers trim songs to 2:30-3:30. A 5-minute song means 5 minutes of sequencing work AND 5 minutes where the audience is watching the same song while the line of cars waits.

### The Opportunity

Beat:IQ already has all the data needed to do intelligent trimming:

- **Song structure** (intro/verse/chorus/bridge/outro) from Moises segmentation
- **Repetition detection** — identify which choruses and verses are musically identical
- **Beat grid** — ensure cuts happen on clean beat/bar boundaries
- **BPM / tempo map** — maintain musical flow across cuts

### Smart Trim Feature (v2+)

**User specifies a target duration range** (e.g., "I want this song between 2:30 and 3:00").

Beat:IQ analyzes the structure and proposes intelligent cuts:

```
┌─────────────────────────────────────┐
│  🎵 Song: "All I Want For Christmas│
│     Original: 4:02                  │
│     Target: 2:30 - 3:00            │
│                                     │
│  SUGGESTED TRIM                     │
│                                     │
│  ✅ Keep: Intro (0:00 - 0:15)      │
│  ✅ Keep: Verse 1 (0:15 - 0:52)    │
│  ✅ Keep: Chorus 1 (0:52 - 1:24)   │
│  ❌ Cut: Verse 2 (1:24 - 2:01)     │
│     → identical structure to V1     │
│  ✅ Keep: Chorus 2 (2:01 - 2:33)   │
│  ❌ Cut: Bridge (2:33 - 2:49)      │
│  ❌ Cut: Chorus 3 (2:49 - 3:21)    │
│     → repetition of C1/C2          │
│  ✅ Keep: Outro (3:21 - 3:42)      │
│     → trimmed fade                  │
│                                     │
│  Result: 2:44 ✅ (in target range) │
│                                     │
│  [Preview trim ▶] [Adjust cuts]    │
│  [Download trimmed MP3]             │
│                                     │
└─────────────────────────────────────┘
```

### Smart Trim Rules

1. **Always keep** the first verse + first chorus (establishes the song)
2. **Prefer cutting** repeated verses over unique sections
3. **Prefer cutting** later choruses when multiple exist (keep first, keep last)
4. **Never cut mid-phrase** — all cuts on bar boundaries
5. **Crossfade at cut points** — 50-200ms crossfade to avoid audible clicks
6. **Preserve the ending** — keep some form of outro/resolution (truncated fade is fine)
7. **Export as CBR MP3** — constant bit rate, 192kbps, ready for xLights (xLights requires CBR)

### Why This Fits Beat:IQ

The trimming feature uses the same Moises segmentation data that Beat:IQ already processes. Adding it is near-zero incremental API cost. It removes Audacity from the workflow entirely — the user uploads their original MP3 and gets back both timing tracks AND a trimmed MP3, ready for xLights.

---

## The Pitch

**To the xLights community:**

*"Drop your MP3. Get timing tracks for every instrument in your song — kick, snare, hi-hat, bass, guitar, keys, strings — plus beats, bars, chord changes, and song sections. All in 60 seconds. All importable to xLights with one click."*

*"The VAMP plugins see one waveform. Beat:IQ sees seven instruments. That's the difference between sequencing by ear and sequencing by intelligence."*

**To vendors/sequencers:**

*"Include Beat:IQ timing tracks with your sequence files. Give your customers a complete package — not just effects, but the timing infrastructure to build on."*

**On drum fills:**

*"Beat:IQ resolves 32nd and 64th note drum fills at full audio fidelity. At 40fps, every snare roll, every kick pattern, every hi-hat rhythm lands on its own timing mark. Try that with VAMP plugins on a full mix."*
