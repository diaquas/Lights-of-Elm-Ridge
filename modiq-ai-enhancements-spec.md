# Mod:IQ AI Enhancement Spec — Top 3 Improvements

## Overview

Three AI-powered enhancements to improve Mod:IQ's auto-mapping accuracy over time. Ordered by implementation priority.

---

## Enhancement 1: User Correction Feedback Loop & Mapping Dictionary

### The Problem

Every time Mod:IQ gets a mapping wrong and a user manually corrects it, that knowledge is lost. The next user who maps the same vendor's sequence makes the same corrections. Meanwhile, Mod:IQ keeps making the same mistakes because it has no memory.

### The Solution

Store every confirmed mapping pair (both auto-matched and user-corrected) in a persistent dictionary. Before running the matching algorithm, check the dictionary first. Known pairs get instant HIGH confidence matches.

### How It Works

```
User completes a mapping session
    │
    ├─► Auto-matched pairs that user KEPT → store as confirmed
    ├─► Auto-matched pairs that user CHANGED → store the correction
    └─► Manual mappings user created from scratch → store as new pairs
        │
        ▼
    Mapping Dictionary (persistent database)
        │
        ▼
    Next user uploads same vendor's sequence
        │
        ├─► Check dictionary FIRST
        │   Found? → instant match, HIGH confidence
        │   Not found? → fall through to normal algorithm
        └─► Algorithm runs on remaining unmatched models
```

### Data Model

Each dictionary entry stores:

```javascript
{
  // Source side (from the vendor's sequence)
  source_name: "Boscoyo Singing Tree 180",     // original model name
  source_name_normalized: "singing_tree_180",   // normalized for lookup
  source_type: "group",                         // model, group, submodel
  source_pixel_count: 540,                      // pixel count if available
  
  // Destination side (from the user's layout)  
  dest_name: "SingingTree_RGB_180px",           // what the user matched it to
  dest_name_normalized: "singingtree_rgb_180",
  dest_type: "group",
  dest_pixel_count: 540,
  
  // Metadata
  vendor_hint: "Boscoyo Studio",               // if detectable from sequence
  match_source: "user_correction",             // "auto_confirmed" | "user_correction" | "user_manual"
  confidence: 1.0,                             // user-confirmed = max confidence
  times_confirmed: 14,                         // how many users have confirmed this pair
  first_seen: "2025-09-15T...",
  last_confirmed: "2026-02-17T..."
}
```

### Lookup Strategy

When a new mapping session starts:

1. **Exact normalized name match** — if `source_name_normalized` matches an entry in the dictionary, use it immediately
2. **Fuzzy normalized match** — if the normalized name is within edit distance 2 of a dictionary entry, suggest it with HIGH confidence
3. **Pixel count + type match** — if pixel count and model type match a dictionary entry, use it as an additional confidence signal (not a standalone match)
4. **Vendor-scoped lookup** — if we can detect the vendor (from folder names, file metadata, or known naming patterns), filter the dictionary to that vendor's entries first for faster/more accurate lookup

### What Gets Stored

| Event | Action |
|-------|--------|
| User keeps an auto-match | Store as `auto_confirmed`, increment `times_confirmed` if entry exists |
| User changes an auto-match | Store the corrected pair as `user_correction` |
| User manually maps an unmapped model | Store as `user_manual` |
| User unmaps a model (leaves it empty) | Do NOT store — absence of mapping is not a negative signal |

### Privacy & Scope

- Dictionary is **global across all users** — the whole point is that User B benefits from User A's corrections
- Do NOT store any user-identifying information in dictionary entries
- Only store model/group/submodel names, types, and pixel counts — no layout file contents
- Users can opt out of contributing to the dictionary (but still benefit from lookups)

### Implementation Notes

- This can start as a simple JSON file or database table — no ML needed
- The dictionary grows organically with every mapping session
- Vendor detection heuristics: check for known folder name patterns (e.g., "Boscoyo", "GE_", "PPD_"), known group naming conventions, or sequence file metadata
- Over time, the dictionary becomes a crowdsourced "Rosetta Stone" of xLights model names across vendors and users

### Expected Impact

- **Immediate:** First-time corrections are captured and never repeated
- **Within weeks:** Common vendor sequences (Boscoyo, Gilbert, Xtreme) achieve near-100% auto-match rates
- **Long term:** The dictionary becomes the most valuable asset in the product — a proprietary knowledge base that no competitor can replicate without the user base

---

## Enhancement 2: LLM Classification for Ambiguous Matches

### The Problem

Mod:IQ's rule-based algorithm handles clear matches well (exact names, matching pixel counts) and correctly identifies obvious non-matches. The hard part is the middle — LOW confidence matches where the algorithm isn't sure, especially with submodel groups, spinner semantics, and vendor-specific naming quirks.

Examples of ambiguous pairs the algorithm struggles with:

```
Source: "SP_CW_16_Arm_01"      →  Dest: "Spinner Clockwise Arm 1"     (same thing, different naming)
Source: "MegaTree_180_S12"     →  Dest: "Mega Tree - Strand 12 of 16" (is it strand 12 of 16 or 12 of 12?)
Source: "Matrix_P50_W48_H32"   →  Dest: "LED Panel 50mm"              (same? maybe different size)
Source: "Boscoyo_CandyCane_L"  →  Dest: "CandyCane_Left_GE"           (same prop, different vendor prefixes)
```

### The Solution

For matches scoring LOW or MEDIUM confidence, send the ambiguous pair to Claude Sonnet via the Anthropic API for classification. The LLM understands context, abbreviations, vendor naming conventions, and prop semantics in a way that string matching never will.

### API Integration

**Model:** Claude Sonnet (claude-sonnet-4-20250514) — fast, cheap, smart enough for classification

**When to call:** Only for matches where the algorithm returned LOW or MEDIUM confidence. Do NOT call for HIGH confidence matches (waste of money) or UNMAPPED models (no candidate to evaluate).

**Batch all ambiguous pairs in one call** — don't make a separate API call per pair.

```javascript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: `You are an expert in xLights Christmas/Halloween lighting displays. 
You understand model naming conventions across vendors like Boscoyo Studio, 
Gilbert Engineering, Pixel Pro Displays (PPD), Xtreme Sequences, and others.

Your job is to evaluate whether pairs of xLights model names refer to the 
same physical prop/element. Consider:
- Abbreviations (SP = Spinner, MT = MegaTree, CC = Candy Cane)
- Vendor prefixes/suffixes that can be ignored
- Pixel counts as strong matching signals
- Submodel group semantics (arms, strands, segments)
- "Per model" render style meaning effects target the group, not individuals
- Position indicators (L/R, CW/CCW, Top/Bottom)

Respond ONLY with valid JSON.`,

  messages: [{
    role: "user",
    content: `Evaluate these ambiguous model mapping pairs. For each, respond with:
- match: true/false — are these the same prop?
- confidence: 0.0-1.0
- reasoning: one sentence explaining why

Pairs to evaluate:
${ambiguousPairs.map((p, i) => `
${i + 1}. Source: "${p.source_name}" (type: ${p.source_type}, pixels: ${p.source_pixels})
   Dest:   "${p.dest_name}" (type: ${p.dest_type}, pixels: ${p.dest_pixels})
   Context: source parent="${p.source_parent}", dest parent="${p.dest_parent}"
`).join('')}

Respond as JSON array:
[{"pair": 1, "match": true, "confidence": 0.92, "reasoning": "..."}]`
  }]
});
```

### Using the Response

```javascript
const llmResults = JSON.parse(response.content[0].text);

for (const result of llmResults) {
  const pair = ambiguousPairs[result.pair - 1];
  
  if (result.match && result.confidence >= 0.7) {
    // Upgrade the match confidence
    pair.confidence = "HIGH";
    pair.confidence_source = "llm_confirmed";
    pair.llm_reasoning = result.reasoning;
  } else if (result.match && result.confidence >= 0.4) {
    // Keep as MEDIUM but add LLM signal
    pair.confidence = "MEDIUM";
    pair.confidence_source = "llm_tentative";
    pair.llm_reasoning = result.reasoning;
  } else {
    // LLM says no match — downgrade or remove
    pair.confidence = "LOW";
    pair.confidence_source = "llm_rejected";
    pair.llm_reasoning = result.reasoning;
  }
}
```

### Cost Analysis

A typical mapping session might have 10-30 ambiguous pairs. That's roughly:

- System prompt: ~150 tokens
- User message with 20 pairs: ~600 tokens  
- Response: ~400 tokens
- **Total: ~1,150 tokens per mapping session**
- **Cost: < $0.01 per mapping session** (Sonnet pricing)

This is essentially free. Even at scale (1,000 mapping sessions/month), total LLM cost would be under $10/month.

### Prompt Refinement Over Time

The system prompt should be expanded as you learn more about vendor-specific patterns:

- Add specific vendor abbreviation dictionaries
- Add known prop categories and their common names
- Add examples of tricky pairs that the LLM should recognize
- Feed confirmed corrections from Enhancement 1's dictionary into the system prompt as few-shot examples

### When NOT to Call the LLM

- HIGH confidence matches — algorithm is already confident, don't waste the call
- UNMAPPED models with no candidates — there's nothing to evaluate
- Models already resolved by the dictionary (Enhancement 1) — dictionary lookup is instant and free
- When the user has disabled AI features (respect user preference)

### Fallback

If the API call fails (timeout, rate limit, network error), fall back gracefully to the original algorithm confidence. The LLM is an enhancement layer, not a dependency. Mod:IQ must work without it.

---

## Enhancement 3: Semantic Embeddings for Name Matching

### The Problem

String-based matching (Levenshtein distance, Jaccard similarity, normalized token comparison) fails when two names are semantically identical but lexically different:

```
"Christmas Mega Tree 16 Strand"  vs  "MegaTree_16str_RGB"     → low string similarity
"Singing Face Santa"             vs  "SF_Santa_Head"           → low string similarity  
"Pixel Arch Left"                vs  "L_Arch_Pix"              → low string similarity
```

A human reads these and instantly knows they're the same. String matching sees mostly different characters.

### The Solution

Use an embeddings API to convert model names into semantic vectors. Compute cosine similarity between all source and destination name vectors. Use the similarity scores as an additional confidence signal alongside pixel count matching, type matching, and string similarity.

### API Choice

**OpenAI `text-embedding-3-small`** — $0.02 per million tokens, 1536-dimensional vectors, excellent semantic understanding.

Alternative: **Anthropic's embedding capability** (if/when available), or **Cohere Embed v3** ($0.10/M tokens, multilingual).

### How It Works

```javascript
import OpenAI from 'openai';
const openai = new OpenAI();

async function getEmbeddings(names) {
  // Preprocess names for better semantic matching
  const processed = names.map(name => {
    // Expand common abbreviations before embedding
    let expanded = name
      .replace(/\bSP\b/gi, 'Spinner')
      .replace(/\bMT\b/gi, 'MegaTree')
      .replace(/\bCC\b/gi, 'CandyCane')
      .replace(/\bSF\b/gi, 'Singing Face')
      .replace(/\bGE\b/gi, '') // strip vendor prefix
      .replace(/\bPPD\b/gi, '') // strip vendor prefix
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2'); // camelCase → spaces
    return `xLights model: ${expanded}`; // prefix for context
  });

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: processed
  });

  return response.data.map(d => d.embedding);
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

### Integration with Existing Algorithm

Embeddings don't replace the current algorithm — they add a new signal:

```javascript
function computeMatchConfidence(source, dest) {
  const scores = {
    pixelMatch:    computePixelScore(source, dest),      // existing
    typeMatch:     computeTypeScore(source, dest),        // existing
    stringMatch:   computeStringSimilarity(source, dest), // existing
    positionMatch: computePositionScore(source, dest),    // existing
    embeddingMatch: cosineSimilarity(source.embedding, dest.embedding), // NEW
    dictionaryMatch: lookupDictionary(source, dest)       // Enhancement 1
  };

  // Weighted combination
  const weights = {
    pixelMatch:     0.25,
    typeMatch:      0.15,
    stringMatch:    0.15,
    positionMatch:  0.10,
    embeddingMatch: 0.20,  // significant weight — this catches what strings miss
    dictionaryMatch: 0.15  // high value when present, 0 when not in dictionary
  };

  // Dictionary match overrides everything when present
  if (scores.dictionaryMatch === 1.0) {
    return { confidence: "HIGH", score: 1.0, source: "dictionary" };
  }

  const weighted = Object.keys(scores).reduce((sum, key) => {
    return sum + (scores[key] * weights[key]);
  }, 0);

  return {
    confidence: weighted > 0.75 ? "HIGH" : weighted > 0.5 ? "MEDIUM" : "LOW",
    score: weighted,
    breakdown: scores
  };
}
```

### Batch Processing

Embed all names at once — don't make individual API calls:

```javascript
async function prepareEmbeddings(sourceModels, destModels) {
  const allNames = [
    ...sourceModels.map(m => m.name),
    ...destModels.map(m => m.name)
  ];

  // One API call for all names
  const allEmbeddings = await getEmbeddings(allNames);

  // Split back into source and dest
  sourceModels.forEach((m, i) => {
    m.embedding = allEmbeddings[i];
  });
  destModels.forEach((m, i) => {
    m.embedding = allEmbeddings[sourceModels.length + i];
  });
}
```

### Cost Analysis

A typical mapping session:

- Source layout: ~50-100 model names
- Dest layout: ~50-150 model names  
- Total: ~200 names × ~5 tokens each = ~1,000 tokens
- **Cost: ~$0.00002 per mapping session** (essentially free)

Even with the abbreviation expansion preprocessing, you're looking at under a penny per thousand mapping sessions.

### Preprocessing Matters

Raw model names embed poorly because abbreviations and underscores confuse the embedding model. The preprocessing step (expanding abbreviations, splitting camelCase, stripping vendor prefixes) is critical:

```
Raw:        "SP_CW_16_Arm_01"
Processed:  "xLights model: Spinner CW 16 Arm 01"

Raw:        "Boscoyo_STree_180"  
Processed:  "xLights model: Boscoyo Singing Tree 180"
```

The `xLights model:` prefix gives the embedding model domain context, improving semantic clustering of lighting-related terms.

### Caching

Embeddings for the same name never change. Cache aggressively:

- Cache by normalized name → embedding vector
- Store in the same database as the mapping dictionary (Enhancement 1)
- A user's layout names rarely change between sessions — cache the entire layout's embeddings on first use
- Vendor sequence names are fixed — cache those permanently

### When Embeddings Shine

| Scenario | String Similarity | Embedding Similarity |
|----------|------------------|---------------------|
| "Mega Tree" vs "MegaTree" | High (close) | High |
| "Singing Face Santa" vs "SF_Santa_Head" | Low (different chars) | **High** ✓ |
| "Pixel Arch Left" vs "L_Arch_Pix" | Low | **High** ✓ |
| "Spinner CW Arm 1" vs "SP_CW_16_Arm_01" | Medium | **High** ✓ |
| "Matrix" vs "MegaTree" | Low | Low |
| "Candy Cane" vs "Spinner" | Low | Low |

Embeddings catch the cases where string matching fails — semantically equivalent names with different formatting. They also correctly give low scores to actually different props, so false positives aren't a concern.

---

## Implementation Order

```
Enhancement 1: Mapping Dictionary          ← Do first (zero API cost, immediate compound value)
    │
    ▼
Enhancement 2: LLM Classification          ← Do second (handles the hard cases dictionary can't)
    │
    ▼  
Enhancement 3: Semantic Embeddings         ← Do third (improves baseline matching across the board)
```

### Why This Order

1. **Dictionary first** because it's the cheapest (free), simplest (just a database table), and starts compounding value immediately. Every mapping session after launch makes the next session better.

2. **LLM second** because it solves the hardest remaining cases (submodel group semantics, vendor quirks) that neither string matching nor embeddings can handle. It also generates additional dictionary entries — when the LLM confirms a match with high confidence, that pair goes into the dictionary for future instant lookup.

3. **Embeddings third** because they improve the baseline matching quality across the board, catching the "semantically same, lexically different" cases that slip through string matching. By this point, the dictionary handles known pairs and the LLM handles ambiguous ones, so embeddings are filling in the remaining gaps.

### Combined Flow (All Three Active)

```
New mapping session starts
    │
    ├─► 1. Dictionary lookup (instant, free)
    │       Found? → HIGH confidence, done
    │       Not found? → continue
    │
    ├─► 2. Algorithm + Embeddings (fast, <$0.001)
    │       Compute string similarity + embedding similarity + pixel/type matching
    │       HIGH confidence? → done
    │       MEDIUM/LOW? → continue
    │
    ├─► 3. LLM classification (fast, <$0.01)
    │       Send ambiguous pairs to Claude Sonnet
    │       Upgrade/downgrade confidence based on response
    │
    └─► 4. User reviews and corrects
            All confirmed/corrected pairs → back into dictionary (step 1)
            Cycle continues, system gets smarter
```

---

## Total Cost Per Mapping Session (All Three Enhancements)

| Enhancement | Cost |
|-------------|------|
| Dictionary lookup | $0.00 |
| Embeddings (200 names) | ~$0.00002 |
| LLM classification (20 pairs) | ~$0.005 |
| **Total** | **< $0.01** |

At any price point for Mod:IQ, these AI enhancements are essentially free to operate while dramatically improving match quality over time.
