/**
 * Lyr:IQ — Extended dictionary + grapheme-to-phoneme fallback
 *
 * Augments the CMU Pronouncing Dictionary with:
 * 1. Common singing words (gonna, wanna, fa la la, etc.)
 * 2. Holiday-specific words
 * 3. Sung nonsense syllables (whoa, ooh, aah)
 * 4. Contractions and slang
 *
 * Also provides a basic rule-based G2P fallback for unknown words.
 */

import type { ArpabetPhoneme, DictionaryEntry } from "./types";

/* ── Extended Dictionary ────────────────────────────────────────── */

/**
 * Hand-curated entries for words commonly found in song lyrics
 * that are missing from the standard CMU dictionary.
 */
const EXTENDED_ENTRIES: Record<string, ArpabetPhoneme[]> = {
  /* ── Contractions & slang ── */
  gonna: ["G", "AH", "N", "AH"],
  wanna: ["W", "AA", "N", "AH"],
  gotta: ["G", "AA", "T", "AH"],
  kinda: ["K", "AY", "N", "D", "AH"],
  lemme: ["L", "EH", "M", "IY"],
  gimme: ["G", "IH", "M", "IY"],
  cause: ["K", "AH", "Z"],
  bout: ["B", "AW", "T"],
  em: ["AH", "M"],
  ya: ["Y", "AH"],
  yeah: ["Y", "EH"],
  yall: ["Y", "AO", "L"],
  aint: ["EY", "N", "T"],
  til: ["T", "IH", "L"],
  nah: ["N", "AA"],
  uh: ["AH"],
  um: ["AH", "M"],
  hmm: ["HH", "AH", "M"],
  shh: ["SH"],
  nope: ["N", "OW", "P"],
  yep: ["Y", "EH", "P"],
  luv: ["L", "AH", "V"],
  nite: ["N", "AY", "T"],
  thru: ["TH", "R", "UW"],

  /* ── Sung nonsense & vocalizations ── */
  ooh: ["UW"],
  oooh: ["UW"],
  ooooh: ["UW"],
  aah: ["AA"],
  aaah: ["AA"],
  ahh: ["AA"],
  ohh: ["OW"],
  eee: ["IY"],
  mmm: ["M"],
  whoa: ["W", "OW"],
  woah: ["W", "OW"],
  hey: ["HH", "EY"],
  ho: ["HH", "OW"],
  la: ["L", "AA"],
  na: ["N", "AA"],
  da: ["D", "AA"],
  ba: ["B", "AA"],
  sha: ["SH", "AA"],
  doo: ["D", "UW"],
  wop: ["W", "AA", "P"],
  bop: ["B", "AA", "P"],
  dee: ["D", "IY"],
  dum: ["D", "AH", "M"],
  huh: ["HH", "AH"],
  hah: ["HH", "AA"],
  heh: ["HH", "EH"],
  woo: ["W", "UW"],
  yay: ["Y", "EY"],
  bam: ["B", "AE", "M"],
  pow: ["P", "AW"],
  shoo: ["SH", "UW"],
  tra: ["T", "R", "AA"],

  /* ── Holiday words often missing ── */
  falala: ["F", "AH", "L", "AH", "L", "AH"],
  christmastime: ["K", "R", "IH", "S", "M", "AH", "S", "T", "AY", "M"],
  wintertime: ["W", "IH", "N", "T", "ER", "T", "AY", "M"],
  jinglebell: ["JH", "IH", "NG", "G", "AH", "L", "B", "EH", "L"],
  christmasy: ["K", "R", "IH", "S", "M", "AH", "S", "IY"],
  snowman: ["S", "N", "OW", "M", "AE", "N"],
  snowflake: ["S", "N", "OW", "F", "L", "EY", "K"],
  reindeer: ["R", "EY", "N", "D", "IH", "R"],
  sugarplum: ["SH", "UH", "G", "ER", "P", "L", "AH", "M"],
  sleighride: ["S", "L", "EY", "R", "AY", "D"],
  frosty: ["F", "R", "AO", "S", "T", "IY"],
  rudolph: ["R", "UW", "D", "AA", "L", "F"],
  mistletoe: ["M", "IH", "S", "AH", "L", "T", "OW"],
  nutcracker: ["N", "AH", "T", "K", "R", "AE", "K", "ER"],
  marshmallow: ["M", "AA", "R", "SH", "M", "EH", "L", "OW"],
  eggnog: ["EH", "G", "N", "AA", "G"],
  gingerbread: ["JH", "IH", "N", "JH", "ER", "B", "R", "EH", "D"],
  hallelujah: ["HH", "AE", "L", "AH", "L", "UW", "Y", "AH"],
  bethlehem: ["B", "EH", "TH", "L", "AH", "HH", "EH", "M"],
  noel: ["N", "OW", "EH", "L"],
  yuletide: ["Y", "UW", "L", "T", "AY", "D"],

  /* ── Halloween words ── */
  spooky: ["S", "P", "UW", "K", "IY"],
  ghostly: ["G", "OW", "S", "T", "L", "IY"],
  boo: ["B", "UW"],
  mwahaha: ["M", "W", "AA", "HH", "AA", "HH", "AA"],
  haha: ["HH", "AA", "HH", "AA"],
  muahahaha: ["M", "UW", "AA", "HH", "AA", "HH", "AA", "HH", "AA"],
  creepy: ["K", "R", "IY", "P", "IY"],
  eerie: ["IH", "R", "IY"],
  werewolf: ["W", "EH", "R", "W", "UH", "L", "F"],
  zombie: ["Z", "AA", "M", "B", "IY"],
  skeleton: ["S", "K", "EH", "L", "AH", "T", "AH", "N"],
  dracula: ["D", "R", "AE", "K", "Y", "AH", "L", "AH"],
  frankenstein: ["F", "R", "AE", "NG", "K", "AH", "N", "S", "T", "AY", "N"],
};

/** Lookup map keyed by uppercase word. */
const extendedMap = new Map<string, ArpabetPhoneme[]>();
for (const [word, phonemes] of Object.entries(EXTENDED_ENTRIES)) {
  extendedMap.set(word.toUpperCase(), phonemes);
}

/**
 * Look up a word in the extended dictionary.
 * @returns ARPAbet phoneme array, or null if not found.
 */
export function lookupExtended(word: string): ArpabetPhoneme[] | null {
  const clean = word.toUpperCase().replace(/[^A-Z']/g, "");
  return extendedMap.get(clean) ?? null;
}

/* ── Grapheme-to-Phoneme Fallback ───────────────────────────────── */

/**
 * Rule-based grapheme-to-phoneme conversion for unknown words.
 * This is a simplified model — not as accurate as a neural G2P —
 * but catches the most common English spelling patterns.
 *
 * The rules are applied left-to-right, consuming characters greedily.
 */

interface G2PRule {
  /** Grapheme pattern (matched case-insensitively). */
  pattern: string;
  /** ARPAbet phoneme(s) this pattern produces. */
  phonemes: ArpabetPhoneme[];
}

const G2P_RULES: G2PRule[] = [
  // Multi-character patterns first (greedy)
  { pattern: "ough", phonemes: ["AO"] },
  { pattern: "tion", phonemes: ["SH", "AH", "N"] },
  { pattern: "sion", phonemes: ["ZH", "AH", "N"] },
  { pattern: "ight", phonemes: ["AY", "T"] },
  { pattern: "ould", phonemes: ["UH", "D"] },
  { pattern: "atch", phonemes: ["AE", "CH"] },
  { pattern: "ange", phonemes: ["EY", "N", "JH"] },
  { pattern: "ious", phonemes: ["IY", "AH", "S"] },
  { pattern: "eous", phonemes: ["IY", "AH", "S"] },
  { pattern: "ture", phonemes: ["CH", "ER"] },
  { pattern: "tch", phonemes: ["CH"] },
  { pattern: "dge", phonemes: ["JH"] },
  { pattern: "sch", phonemes: ["SH"] },
  { pattern: "chr", phonemes: ["K", "R"] },
  { pattern: "thr", phonemes: ["TH", "R"] },
  { pattern: "shr", phonemes: ["SH", "R"] },
  { pattern: "ght", phonemes: ["T"] },
  { pattern: "wh", phonemes: ["W"] },
  { pattern: "wr", phonemes: ["R"] },
  { pattern: "kn", phonemes: ["N"] },
  { pattern: "gn", phonemes: ["N"] },
  { pattern: "ph", phonemes: ["F"] },
  { pattern: "gh", phonemes: [] }, // silent in most positions
  { pattern: "sh", phonemes: ["SH"] },
  { pattern: "ch", phonemes: ["CH"] },
  { pattern: "th", phonemes: ["TH"] },
  { pattern: "ng", phonemes: ["NG"] },
  { pattern: "ck", phonemes: ["K"] },
  { pattern: "qu", phonemes: ["K", "W"] },
  { pattern: "ee", phonemes: ["IY"] },
  { pattern: "ea", phonemes: ["IY"] },
  { pattern: "oo", phonemes: ["UW"] },
  { pattern: "ou", phonemes: ["AW"] },
  { pattern: "ow", phonemes: ["OW"] },
  { pattern: "oi", phonemes: ["OY"] },
  { pattern: "oy", phonemes: ["OY"] },
  { pattern: "ai", phonemes: ["EY"] },
  { pattern: "ay", phonemes: ["EY"] },
  { pattern: "au", phonemes: ["AO"] },
  { pattern: "aw", phonemes: ["AO"] },
  { pattern: "ie", phonemes: ["IY"] },
  { pattern: "ei", phonemes: ["EY"] },
  { pattern: "ue", phonemes: ["UW"] },

  // Single characters
  { pattern: "a", phonemes: ["AE"] },
  { pattern: "e", phonemes: ["EH"] },
  { pattern: "i", phonemes: ["IH"] },
  { pattern: "o", phonemes: ["AA"] },
  { pattern: "u", phonemes: ["AH"] },
  { pattern: "y", phonemes: ["IY"] },
  { pattern: "b", phonemes: ["B"] },
  { pattern: "c", phonemes: ["K"] },
  { pattern: "d", phonemes: ["D"] },
  { pattern: "f", phonemes: ["F"] },
  { pattern: "g", phonemes: ["G"] },
  { pattern: "h", phonemes: ["HH"] },
  { pattern: "j", phonemes: ["JH"] },
  { pattern: "k", phonemes: ["K"] },
  { pattern: "l", phonemes: ["L"] },
  { pattern: "m", phonemes: ["M"] },
  { pattern: "n", phonemes: ["N"] },
  { pattern: "p", phonemes: ["P"] },
  { pattern: "r", phonemes: ["R"] },
  { pattern: "s", phonemes: ["S"] },
  { pattern: "t", phonemes: ["T"] },
  { pattern: "v", phonemes: ["V"] },
  { pattern: "w", phonemes: ["W"] },
  { pattern: "x", phonemes: ["K", "S"] },
  { pattern: "z", phonemes: ["Z"] },
];

/**
 * Convert a word to ARPAbet phonemes using rule-based G2P.
 * This is a fallback — the dictionary should be tried first.
 */
export function graphemeToPhoneme(word: string): ArpabetPhoneme[] {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  const result: ArpabetPhoneme[] = [];
  let i = 0;

  while (i < lower.length) {
    let matched = false;

    // Try longest patterns first
    for (const rule of G2P_RULES) {
      if (lower.startsWith(rule.pattern, i)) {
        result.push(...rule.phonemes);
        i += rule.pattern.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Skip unknown character
      i++;
    }
  }

  // Remove trailing silent E effect: if last phoneme is EH and word ends in 'e',
  // drop it and lengthen the preceding vowel (approximation of magic-e rule)
  if (
    result.length > 1 &&
    result[result.length - 1] === "EH" &&
    lower.endsWith("e")
  ) {
    result.pop();
  }

  return result;
}

/* ── Unified Lookup ─────────────────────────────────────────────── */

/**
 * Look up a word's pronunciation, trying sources in order:
 * 1. Extended dictionary (singing words)
 * 2. G2P fallback (rule-based)
 *
 * A full CMU dictionary can be loaded and checked between steps 1 and 2
 * once the async dictionary loader is implemented.
 */
export function lookupWord(word: string): DictionaryEntry {
  const clean = word.replace(/[^a-zA-Z']/g, "");

  // Try extended dictionary
  const extended = lookupExtended(clean);
  if (extended) {
    return { word: clean.toLowerCase(), phonemes: extended };
  }

  // Fall back to G2P
  const g2p = graphemeToPhoneme(clean);
  return { word: clean.toLowerCase(), phonemes: g2p };
}

/**
 * Check whether a word exists in the extended dictionary.
 */
export function isInDictionary(word: string): boolean {
  const clean = word.toUpperCase().replace(/[^A-Z']/g, "");
  return extendedMap.has(clean);
}

/**
 * Get all entries in the extended dictionary (for debugging/UI).
 */
export function getExtendedDictionarySize(): number {
  return extendedMap.size;
}
