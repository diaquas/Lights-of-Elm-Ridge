# Lyr:IQ — Design Document v4
## Lights of Elm Ridge · Singing Face Timing Generator for xLights

**Tool family:** FirstLight → xWire → Beat:IQ / **Lyr:IQ** → Mod:IQ

---

## What Lyr:IQ Does

**Drop an MP3 → Get complete singing face timing tracks for lead AND background vocals → Import into xLights**

For a typical holiday song, Lyr:IQ produces:

```
📁 MarriahCarey_AllIWantForChristmas_LyrIQ.xtiming
├── Lyrics (Lead)       ← 3-layer: phrases / words / phonemes
├── Lyrics (Background) ← 3-layer: phrases / words / phonemes
└── Lyrics (Duet/Alt)   ← if detected, additional voice
```

Each timing track is xLights-ready with all three layers pre-built:
- **Phrases** — lyric lines with correct start/end times
- **Words** — individual words aligned to the vocal audio
- **Phonemes** — Preston Blair mouth positions with linguistically-weighted durations

**Background vocals are a first-in-category feature.** No existing tool automates BG vocal timing tracks.

---

## The Current Pain

### The Manual Process (10+ hours per song)

1. Listen to song, press "T" at each phrase boundary
2. Type lyrics into each phrase segment
3. Break phrases → words (adjusting timing of each word)
4. Break words → phonemes (using xLights' CMU dictionary)
5. Manually drag every phoneme to align with the audio
6. Repeat for chorus sections, backing vocals, etc.

Community posts confirm the agony: *"This process is taking forever, just for a few seconds of singing, at a time. Is there an easier method?"*

### AutoLyrics (lightingfanatics.com) — The Existing Tool

| Problem | Severity | Lyr:IQ Fix |
|---|---|---|
| **Must manually paste lyrics** — user has to go find and copy them | Annoyance | Auto-fetch via web search; only ask if not found |
| **Phoneme duration is naive** — consonants like L get equal time as vowels like O, when vowels should be 2-3x longer | Major — faces look robotic | Linguistically-weighted phoneme duration model |
| **Words flat-out miss** — timestamps off by multiple seconds, not just milliseconds | Critical — defeats the purpose | Modern forced alignment (wav2vec2) on isolated vocal stem |
| **Missing dictionary words** — xLights' CMU dictionary doesn't have every word | Moderate — leaves gaps | Extended dictionary + G2P fallback |
| **No editing before export** — black box, can't fix problems until xLights | Major — wasted round-trips | In-browser phoneme editor with drag-to-adjust |
| **Queue-based, slow** — can wait 30+ minutes | Annoyance | ~60 second processing |
| **No background vocal support** | Major gap | Moises lead/BG stem separation + independent alignment |

### Papagayo (Legacy)

Before AutoLyrics, the community used Papagayo — a standalone lip-sync app from ~2006. The xLights manual notes: *"Due to a performance limitation in the Papagayo software, a sequence often had to be broken up into segments."* xLights eventually built native singing face support to replace it, but the native word breakdown is still just dictionary lookup with equal-duration phonemes — the same core problem Lyr:IQ solves.

### Our Target: 90-95% Accuracy

The gap between 70-80% and 90-95% is the difference between *"saves time but still hours of cleanup"* and *"tweak a few words and you're done in 20 minutes."*

---

## The Four Real Problems (Deep Dive)

### Problem 1: "Shouldn't need to upload lyrics"

**Current AutoLyrics experience:** Upload MP3 → go to Google → search for lyrics → copy → come back → paste. Extra friction, easy to get wrong version (live vs studio, edited vs full).

**Lyr:IQ approach:**

1. Extract ID3 tags (artist, title, album) from the MP3
2. Auto-search for lyrics via web search
3. Moises lyrics transcription API provides AI-transcribed lyrics with word-level timestamps
4. Compare sources — use official lyrics text + Moises timestamps (best of both worlds)
5. Present for confirmation: *"We found lyrics for 'Jingle Bell Rock' by Bobby Helms. Look right?"*
6. User confirms or edits
7. If no results → ask user to paste lyrics

**Edge cases handled:**
- Edited/trimmed songs → detect during alignment, flag mismatches
- Live vs studio versions → alignment catches timing differences
- Instrumental sections → gap detection, no phantom phonemes
- Ad-libs/spoken sections → Moises transcription catches these even when official lyrics don't

---

### Problem 2: "Consonants like L are way too long"

**The root cause:** xLights' built-in "Breakdown Words" distributes phoneme durations roughly equally within each word. In "close" (K L OW Z), each phoneme gets ~25% of the word. In reality:

- **OW** (vowel) should get ~55-60% — it's the sustained, sung part
- **K** should get ~12% — quick plosive
- **L** should get ~17% — brief tongue placement
- **Z** should get ~15% — trailing fricative

**Lyr:IQ phoneme duration model:**

```
Category            | Base Duration  | Behavior
────────────────────────────────────────────────────
Vowels (AI,O,E,U)  | 55-70% of word | Stretched to fill; THE sung part
Plosives (MBP,etc) | 40-80ms fixed  | Quick pop, doesn't scale with word length
Fricatives (FV)    | 60-100ms fixed | Brief but audible
Liquids (L)        | 60-100ms fixed | Brief tongue movement
Glides (WQ)        | 50-90ms fixed  | Quick transition
Nasals (etc: N,M)  | 50-90ms fixed  | Brief resonance
Stops (etc: K,T,D) | 30-60ms fixed  | Very quick
```

**Example: "close" at 400ms total**

| Phoneme | Lyr:IQ | xLights Default |
|---|---|---|
| K (etc) | 50ms | 100ms |
| L | 70ms | 100ms |
| OW (O) | **220ms** | 100ms |
| Z (etc) | 60ms | 100ms |

The vowel — the part you actually hear and see the mouth hold open for — gets 55% of the word instead of 25%. Night and day difference on the face.

**Additional refinements:**
- **Sustained notes:** When audio energy stays high (singer holding a note), extend the vowel further
- **Word-final consonants:** Often barely pronounced in singing — shortened
- **Diphthongs** (AY, OW): Split into two shorter phonemes for more natural mouth movement
- **Musical context:** Beat-grid snapping aligns word boundaries near beats

---

### Problem 3: "Some words aren't in the xLights dictionary"

**The root cause:** xLights uses the CMU Pronouncing Dictionary (~134K words). Missing:

- **Slang:** gonna, wanna, gotta, 'cause, 'bout
- **Song-specific:** fa la la, doo wop, sha la la, na na na
- **Sung nonsense:** whoa-oh-oh, hey hey hey, ooh, aah
- **Christmas-specific:** Christmastime (one word?), Rudolph variants
- **Contractions:** shouldn't've, y'all
- **Misspellings:** luv, nite

**Lyr:IQ Extended Dictionary:**

1. **Hand-curated singing words** — common words that trip up xLights:
   ```
   GONNA  G AH1 N AH0
   WANNA  W AA1 N AH0
   GOTTA  G AA1 T AH0
   FALALA F AH0 L AH0 L AH0
   WHOA   W OW1
   ```
2. **Grapheme-to-phoneme fallback** — rule-based G2P for truly unknown words
3. **User-contributed dictionary** — corrections collected over time to grow the dictionary
4. **UI flagging** — unknown words highlighted in yellow with "spell phonetically" prompt

**Output:** The .xtiming file includes phonemes for ALL words — no blanks requiring xLights post-processing.

---

### Problem 4: "Some timing marks are off by many seconds"

**The root cause:** AutoLyrics operates on the full mixed audio with an older alignment model. When instruments drown out the vocal, the aligner loses track — one bad anchor cascades downstream.

**Lyr:IQ multi-layer fix:**

**Layer 1: Vocal Isolation (via Moises)**
Clean separated vocal stems — instruments completely removed. This alone eliminates the #1 cause of alignment failures.

**Layer 2: Modern Forced Alignment**
wav2vec2-based CTC forced alignment:
- Word-level accuracy: 20-50ms (vs AutoLyrics' 200ms+)
- Character-level alignment for sub-word precision
- Robust to remaining background artifacts
- Actively maintained, continually improving

**Layer 3: Structural Anchoring**
Rather than aligning the entire song as one stream (where errors cascade):
1. Detect silence gaps and instrumental breaks
2. Split song into independent sections
3. Align each section separately
4. Prevents verse 1 errors from corrupting verse 2

**Layer 4: Confidence-Based Flagging**
The alignment model produces per-word confidence scores:
- Green: high confidence, likely correct
- Yellow: medium confidence, worth reviewing
- Red: low confidence, needs attention

**Layer 5: Chorus Repetition Intelligence**
If the same lyrics appear multiple times:
1. Align all instances independently
2. Use the highest-confidence instance as the "template"
3. Offer to apply template timing to lower-confidence instances
4. Adjust for tempo variations between repeats

---

## Background Vocals: The Breakthrough Feature

### Why This Matters

Most holiday songs have:
- Lead vocal (main singer)
- Background/harmony vocals ("oohs," "aahs," chorus harmonies)
- Sometimes a duet (e.g., "Baby It's Cold Outside")

**No existing tool automates background vocal timing tracks.** This is a genuine first-in-category feature.

Moises Pro separation gives us **lead vocals and background vocals as separate stems.** We produce independent timing tracks for each:

### BG Vocal Challenges & Solutions

| Challenge | Solution |
|---|---|
| No "official" lyrics for BG parts | AI transcription of the BG stem (Moises) + manual edit |
| "Oohs," "aahs," wordless harmonies | Detect as sustained vowel phonemes (O, AI, E) |
| BG vocals overlap with lead | Moises separation handles this — clean isolated stems |
| Timing offset from lead (harmonies) | Align BG independently from its own stem |
| Less distinct pronunciation | Lower confidence thresholds, more review flagging |

### xLights Integration

In the sequencer, the user assigns each timing track to a different singing face model:
- **Main singing face** → Lead Lyrics track
- **Second face / backing props** → Background Lyrics track
- **Third face** → Duet voice (if detected)

This unlocks display designs that were previously impossibly tedious to create — multiple faces singing different parts, all perfectly synced.

---

## Processing Pipeline

```
MP3 Upload (shared with Beat:IQ)
    │
    ├──→ Moises: Stem Separation
    │       ├──→ Lead Vocals (clean isolated stem)
    │       └──→ Background Vocals (clean isolated stem)
    │
    ├──→ Moises: Lyrics Transcription
    │       ├──→ Lead: word-level timestamps from vocal stem
    │       └──→ BG: word-level timestamps from BG stem
    │
    ├──→ Web Search: Official Lyrics (for lead)
    │       └──→ Compare with Moises transcription
    │           └──→ Use official text + Moises timing (best of both)
    │
    ├──→ Forced Alignment (per vocal stem)
    │       ├──→ Lead: align lyrics to lead vocal stem (20-50ms accuracy)
    │       └──→ BG: align transcribed lyrics to BG vocal stem
    │
    ├──→ Phoneme Generation
    │       ├──→ CMU Dictionary + Extended Dictionary lookup
    │       ├──→ CMU → Preston Blair mapping
    │       ├──→ Linguistically-weighted duration model
    │       └──→ G2P fallback for unknown words
    │
    ├──→ Musical Context Optimization
    │       ├──→ Beat-grid snapping (word boundaries near beats)
    │       ├──→ Sustained note detection (extend vowel phonemes)
    │       └──→ Chorus repetition intelligence
    │
    └──→ Output
            ├──→ Lead Lyrics .xtiming (3-layer: phrases/words/phonemes)
            └──→ Background Lyrics .xtiming (3-layer: phrases/words/phonemes)
```

---

## The .xtiming File Format

### Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<timing name="Lyrics - Lead" SourceVersion="2024.x">
  <!-- Layer 0: Phrases (lyric lines) -->
  <EffectLayer>
    <Effect label="jingle bells jingle bells" startTime="2400" endTime="5200"/>
    <Effect label="jingle all the way" startTime="5200" endTime="8100"/>
  </EffectLayer>
  <!-- Layer 1: Words -->
  <EffectLayer>
    <Effect label="jingle" startTime="2400" endTime="3100"/>
    <Effect label="bells" startTime="3100" endTime="3800"/>
    <Effect label="jingle" startTime="3800" endTime="4500"/>
    <Effect label="bells" startTime="4500" endTime="5200"/>
  </EffectLayer>
  <!-- Layer 2: Phonemes (Preston Blair) -->
  <EffectLayer>
    <Effect label="etc" startTime="2400" endTime="2480"/>
    <Effect label="AI" startTime="2480" endTime="2900"/>
    <Effect label="etc" startTime="2900" endTime="2970"/>
    <Effect label="etc" startTime="2970" endTime="3020"/>
    <Effect label="L" startTime="3020" endTime="3100"/>
    <Effect label="MBP" startTime="3100" endTime="3170"/>
    <Effect label="E" startTime="3170" endTime="3600"/>
    <Effect label="L" startTime="3600" endTime="3700"/>
    <Effect label="etc" startTime="3700" endTime="3800"/>
  </EffectLayer>
</timing>
```

### Key Rules
- Times in **milliseconds** (integers)
- Labels **lowercase** for phrases and words
- Phonemes use **Preston Blair codes** (case-sensitive)
- Phonemes within a word tile contiguously (no gaps)
- Gaps between phrases use implicit rest
- File extension: `.xtiming`

### Preston Blair Phoneme Set (xLights Standard)

| Code | Mouth Shape | Maps From (CMU) | Duration Behavior |
|---|---|---|---|
| **AI** | Wide open jaw | AA, AE, AH, AY | Vowel — stretches to fill |
| **O** | Round open | AO, AW, OW, OY, UH | Vowel — stretches to fill |
| **E** | Smile/teeth shown | EH, ER, EY, IH, IY | Vowel — stretches to fill |
| **U** | Small round pucker | UW | Vowel — stretches to fill |
| **etc** | Teeth/tongue catch-all | CH, D, DH, G, HH, JH, K, N, NG, R, S, SH, T, TH, Y, Z, ZH | 30-90ms fixed |
| **L** | Tongue tip visible | L | 60-100ms fixed |
| **WQ** | Pucker/kiss | W, WH | 50-90ms fixed |
| **MBP** | Lips pressed closed | M, B, P | 40-80ms fixed |
| **FV** | Lower lip bite | F, V | 60-100ms fixed |
| **rest** | Mouth closed/neutral | (silence) | Fills gaps between phrases |

---

## User Interface

### Screen 1: Upload

```
┌─────────────────────────────────────┐
│                                     │
│     🎵 Drop your MP3 here          │
│        or click to browse           │
│                                     │
│  Song: "Jingle Bell Rock"           │
│  Artist: Bobby Helms                │
│                                     │
│  ✅ Lyrics found automatically      │
│  [Preview lyrics ▼]                 │
│                                     │
│  ─── or ───                         │
│                                     │
│  [Paste your own lyrics]            │
│                                     │
│     [ Generate Lyr:IQ → ]           │
│                                     │
└─────────────────────────────────────┘
```

### Screen 2: Processing (~60 seconds)

```
│  ◼ Separating vocals...            │
│  ◼ Fetching lyrics...              │
│  ◼ Aligning lead vocals...         │
│  ◼ Aligning background vocals...   │
│  ◼ Generating phonemes...          │
│  ◼ Optimizing timing...            │
```

### Screen 3: Editor + Export

**Top: Audio Waveform** — vocal stem waveform with playback/scrub/zoom

**Middle: Timing Tracks** — three horizontal lanes:
```
Phrases: |  jingle bells jingle bells  |  jingle all the way  |
Words:   | jingle | bells | jingle | bells | jingle | all | the | way |
Phonemes:|etc|AI|etc|etc|L|MBP|E|L|etc|etc|AI|etc|etc|L|...
```

- Color-coded by phoneme type (vowels warm, consonants cool)
- Confidence overlay (green/yellow/red border)
- Click to select → drag edges to resize
- Double-click word to re-run phoneme breakdown

**Bottom: Sidebar**
- Animated face preview (current phoneme mouth shape)
- Stats: "237 words · 14 flagged · 823 phonemes"
- Export button

**Key interaction: Phoneme editing**
- Drag phoneme boundary left/right to change duration
- Adjacent phoneme auto-adjusts to compensate
- Vowels highlighted as "stretchable," consonants as "fixed"
- "Auto-balance" button: re-applies duration model
- "Match xLights default" button: equal distribution (for comparison)

---

## Competitive Landscape

### Lyr:IQ vs AutoLyrics

| | AutoLyrics | Lyr:IQ |
|---|---|---|
| Background vocals | ❌ | ✅ First in category |
| Auto lyrics fetch | ❌ (manual paste) | ✅ Web search + Moises transcription |
| Vocal isolation | ❌ (full mix) | ✅ Moises stem separation |
| Phoneme generation | ❌ (relies on xLights post-import) | ✅ Pre-computed with weighted durations |
| Missing words | Gaps | Extended dictionary + G2P fallback |
| Alignment accuracy | ~200ms | ~20-50ms |
| Interactive editor | ❌ | ✅ Drag-to-adjust waveform view |
| Processing time | 30+ min queue | ~60 seconds |
| Non-English support | ❌ | Future: Moises transcription is language-agnostic |

### Lyr:IQ vs Manual xLights Workflow

| | Manual in xLights | Lyr:IQ |
|---|---|---|
| Lyrics entry | Type each phrase manually | Auto-fetched |
| Word alignment | Listen & adjust each word | Forced alignment on isolated vocals |
| Phoneme breakdown | CMU dictionary (equal duration) | Weighted duration model |
| Missing words | Blank gaps, manual fix | Extended dictionary, G2P fallback |
| Background vocals | Repeat entire process on BG audio | Automated from separated stem |
| Time per song | 10+ hours | 20 minutes (including review) |

---

## Internationalization Opportunity

Community forum threads show users struggling to create Dutch, German, and other language singing face tracks. xLights' dictionary system technically supports multiple languages (german_dictionary exists) but it's completely manual.

Moises' lyrics transcription is language-agnostic — it transcribes whatever it hears. If we pair that with language-specific phoneme-to-Preston Blair mappings, Lyr:IQ could handle non-English songs with minimal extra effort. This is a significant untapped international market that no one is serving.

---

## Pricing Model

Lyr:IQ shares the Moises API pipeline with Beat:IQ. When both are processed from the same upload, the stem separation cost ($0.30/song) is shared — not doubled.

**Standalone Lyr:IQ cost:** ~$0.50/song (vocals stem + lyrics transcription + alignment compute)

**Revenue:** Same model as Beat:IQ — per-song, subscription, or bundled with sequence purchases.

---

## Implementation Phases

### Phase 1: Lead Vocal Core (MVP)
- Moises vocal stem separation + lyrics transcription
- Web search for official lyrics
- Forced alignment (wav2vec2 CTC) on isolated lead vocal
- CMU + extended dictionary phoneme generation
- Weighted phoneme duration model
- .xtiming export (3-layer: phrases/words/phonemes)

### Phase 2: Background Vocals
- BG vocal stem → Moises transcription → alignment → phonemes
- Multi-track lyrics export (lead + BG as separate timing tracks)
- Sustained vowel detection for wordless harmonies ("oohs," "aahs")
- Confidence-based review flagging

### Phase 3: Interactive Editor
- Waveform display (vocal stem)
- Drag-to-adjust timing marks and phoneme boundaries
- Animated face preview synced to playback
- Chorus copy/paste intelligence

### Phase 4: Polish + Integration
- Extended dictionary management UI
- Batch processing (multiple songs)
- Non-English language support
- Integration with Beat:IQ shared pipeline
- FirstLight/Mod:IQ ecosystem integration

---

## Testing Strategy

**10 test songs spanning common holiday display genres:**

1. Trans-Siberian Orchestra (heavy instrumentation, buried vocals)
2. Bing Crosby (clean vocal, minimal accompaniment)
3. Pentatonix (acapella, multiple voices — BG vocal stress test)
4. Mannheim Steamroller (electronic + orchestral)
5. Michael Bublé (big band, horn sections)
6. Brenda Lee (vintage recording quality)
7. Mariah Carey (complex vocal runs, melisma)
8. Rock/pop covers (heavy guitars drowning vocals)
9. Novelty songs (spoken word sections, sound effects)
10. Original/indie songs (varying recording quality)

**Per-song evaluation:**
- Words >100ms off target? (goal: <5%)
- Phoneme proportions needing manual adjustment? (goal: <10%)
- Missing dictionary words? (track and add to extended dictionary)
- BG vocal alignment quality? (separate scoring)
- Overall "could I ship this on a display?" rating

---

## The Pitch

**To the xLights community:**

*"Drop your MP3. Get complete singing face timing tracks — phrases, words, and phonemes — for lead AND background vocals. Phonemes are linguistically weighted so your faces actually look like they're singing, not randomly opening and closing. All in 60 seconds."*

*"AutoLyrics gets you 70%. Lyr:IQ gets you 95%. The last 5% is your ears — and we give you the editor to nail it."*

**On background vocals:**

*"For the first time ever, get automated timing tracks for background vocals. Assign your main face to lead, your backing faces to background harmonies, and watch your display sing in parts. Nobody else does this."*
