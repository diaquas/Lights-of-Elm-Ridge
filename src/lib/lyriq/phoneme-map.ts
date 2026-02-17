/**
 * Lyr:IQ — CMU ARPAbet → Preston Blair phoneme mapping
 *
 * Maps the ~39 ARPAbet phonemes used by the CMU Pronouncing Dictionary
 * to the 10 Preston Blair mouth shapes used by xLights singing faces.
 *
 * Reference: xLights Singing Faces documentation + design spec v4.
 */

import type {
  ArpabetPhoneme,
  PhonemeCategory,
  PrestonBlairCode,
} from "./types";

interface PhonemeMapping {
  prestonBlair: PrestonBlairCode;
  category: PhonemeCategory;
  /** Human-readable description of the mouth shape. */
  description: string;
}

/**
 * Complete mapping from every ARPAbet phoneme to its Preston Blair code
 * and duration category.
 */
export const ARPABET_TO_PRESTON_BLAIR: Record<ArpabetPhoneme, PhonemeMapping> =
  {
    /* ── Vowels → stretch to fill word duration ── */
    AA: {
      prestonBlair: "AI",
      category: "vowel",
      description: "Wide open jaw (father)",
    },
    AE: {
      prestonBlair: "AI",
      category: "vowel",
      description: "Wide open jaw (cat)",
    },
    AH: {
      prestonBlair: "AI",
      category: "vowel",
      description: "Wide open jaw (but)",
    },
    AY: {
      prestonBlair: "AI",
      category: "vowel",
      description: "Wide open jaw (my)",
    },
    AO: {
      prestonBlair: "O",
      category: "vowel",
      description: "Round open (caught)",
    },
    AW: {
      prestonBlair: "O",
      category: "vowel",
      description: "Round open (cow)",
    },
    OW: {
      prestonBlair: "O",
      category: "vowel",
      description: "Round open (go)",
    },
    OY: {
      prestonBlair: "O",
      category: "vowel",
      description: "Round open (boy)",
    },
    UH: {
      prestonBlair: "O",
      category: "vowel",
      description: "Round open (could)",
    },
    EH: {
      prestonBlair: "E",
      category: "vowel",
      description: "Smile/teeth (bed)",
    },
    ER: {
      prestonBlair: "E",
      category: "vowel",
      description: "Smile/teeth (bird)",
    },
    EY: {
      prestonBlair: "E",
      category: "vowel",
      description: "Smile/teeth (day)",
    },
    IH: {
      prestonBlair: "E",
      category: "vowel",
      description: "Smile/teeth (bit)",
    },
    IY: {
      prestonBlair: "E",
      category: "vowel",
      description: "Smile/teeth (beat)",
    },
    UW: {
      prestonBlair: "U",
      category: "vowel",
      description: "Small round pucker (boot)",
    },

    /* ── Plosives → quick pop, 40-80ms fixed ── */
    B: {
      prestonBlair: "MBP",
      category: "plosive",
      description: "Lips pressed (bat)",
    },
    P: {
      prestonBlair: "MBP",
      category: "plosive",
      description: "Lips pressed (pat)",
    },
    M: {
      prestonBlair: "MBP",
      category: "nasal",
      description: "Lips pressed (mat)",
    },

    /* ── Fricatives → brief but audible, 60-100ms ── */
    F: {
      prestonBlair: "FV",
      category: "fricative",
      description: "Lower lip bite (fan)",
    },
    V: {
      prestonBlair: "FV",
      category: "fricative",
      description: "Lower lip bite (van)",
    },

    /* ── Liquid → brief tongue, 60-100ms ── */
    L: {
      prestonBlair: "L",
      category: "liquid",
      description: "Tongue tip visible (let)",
    },

    /* ── Glides → quick transition, 50-90ms ── */
    W: {
      prestonBlair: "WQ",
      category: "glide",
      description: "Pucker/kiss (wet)",
    },
    WH: {
      prestonBlair: "WQ",
      category: "glide",
      description: "Pucker/kiss (what)",
    },

    /* ── Catch-all consonants → etc (30-90ms) ── */
    CH: {
      prestonBlair: "etc",
      category: "stop",
      description: "Teeth/tongue (chat)",
    },
    D: {
      prestonBlair: "etc",
      category: "stop",
      description: "Teeth/tongue (dog)",
    },
    DH: {
      prestonBlair: "etc",
      category: "fricative",
      description: "Teeth/tongue (the)",
    },
    G: {
      prestonBlair: "etc",
      category: "stop",
      description: "Teeth/tongue (go)",
    },
    HH: {
      prestonBlair: "etc",
      category: "fricative",
      description: "Teeth/tongue (hat)",
    },
    JH: {
      prestonBlair: "etc",
      category: "stop",
      description: "Teeth/tongue (jam)",
    },
    K: {
      prestonBlair: "etc",
      category: "stop",
      description: "Teeth/tongue (cat)",
    },
    N: {
      prestonBlair: "etc",
      category: "nasal",
      description: "Teeth/tongue (nap)",
    },
    NG: {
      prestonBlair: "etc",
      category: "nasal",
      description: "Teeth/tongue (sing)",
    },
    R: {
      prestonBlair: "etc",
      category: "liquid",
      description: "Teeth/tongue (red)",
    },
    S: {
      prestonBlair: "etc",
      category: "fricative",
      description: "Teeth/tongue (sit)",
    },
    SH: {
      prestonBlair: "etc",
      category: "fricative",
      description: "Teeth/tongue (she)",
    },
    T: {
      prestonBlair: "etc",
      category: "stop",
      description: "Teeth/tongue (top)",
    },
    TH: {
      prestonBlair: "etc",
      category: "fricative",
      description: "Teeth/tongue (thin)",
    },
    Y: {
      prestonBlair: "etc",
      category: "glide",
      description: "Teeth/tongue (yes)",
    },
    Z: {
      prestonBlair: "etc",
      category: "fricative",
      description: "Teeth/tongue (zoo)",
    },
    ZH: {
      prestonBlair: "etc",
      category: "fricative",
      description: "Teeth/tongue (azure)",
    },
  };

/**
 * Strip stress digit from an ARPAbet phoneme token.
 * CMU dictionary uses AA0, AA1, AA2 for stress levels — we ignore them.
 */
export function stripStress(token: string): ArpabetPhoneme {
  return token.replace(/[012]$/, "") as ArpabetPhoneme;
}

/**
 * Look up the Preston Blair code for an ARPAbet phoneme.
 * Returns "etc" for unknown phonemes.
 */
export function toPrestonBlair(arpabet: string): PrestonBlairCode {
  const clean = stripStress(arpabet);
  return ARPABET_TO_PRESTON_BLAIR[clean]?.prestonBlair ?? "etc";
}

/**
 * Look up the duration category for an ARPAbet phoneme.
 * Returns "stop" for unknown phonemes (shortest fixed duration).
 */
export function getPhonemeCategory(arpabet: string): PhonemeCategory {
  const clean = stripStress(arpabet);
  return ARPABET_TO_PRESTON_BLAIR[clean]?.category ?? "stop";
}

/**
 * Check whether an ARPAbet phoneme is a vowel.
 */
export function isVowel(arpabet: string): boolean {
  return getPhonemeCategory(arpabet) === "vowel";
}
