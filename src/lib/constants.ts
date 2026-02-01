/**
 * Application-wide constants for Lights of Elm Ridge
 */

/** Available sequence categories */
export const SEQUENCE_CATEGORIES = ['Halloween', 'Christmas'] as const;
export type SequenceCategory = typeof SEQUENCE_CATEGORIES[number];

/** Difficulty levels for sequences */
export const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

/** File formats available for sequences */
export const FILE_FORMATS = ['xLights Sequence (.xsq)', 'FSEQ File', 'Audio Sync File'] as const;
export type FileFormat = typeof FILE_FORMATS[number];

/** External URLs */
export const EXTERNAL_URLS = {
  XLIGHTS_SEQ: 'https://xlightsseq.com',
  YOUTUBE_CHANNEL: 'https://www.youtube.com/@LightsofElmRidge',
} as const;

/** Site configuration */
export const SITE_CONFIG = {
  NAME: 'Lights of Elm Ridge',
  URL: 'https://lightsofelmridge.com',
  DESCRIPTION: 'Professional xLights sequences for Halloween and Christmas displays.',
} as const;

/** Current year for "new" badge */
export const CURRENT_YEAR = 2026;

/** Price thresholds */
export const PRICE_CONFIG = {
  MIN_PRICE: 0,
  MAX_PRICE: 25,
  FREE_THRESHOLD: 0,
} as const;
