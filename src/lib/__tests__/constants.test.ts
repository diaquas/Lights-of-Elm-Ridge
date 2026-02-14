import { describe, it, expect } from 'vitest';
import {
  SEQUENCE_CATEGORIES,
  DIFFICULTY_LEVELS,
  FILE_FORMATS,
  EXTERNAL_URLS,
  SITE_CONFIG,
  CURRENT_YEAR,
  PRICE_CONFIG,
} from '../constants';

describe('Constants', () => {
  describe('SEQUENCE_CATEGORIES', () => {
    it('contains Halloween and Christmas', () => {
      expect(SEQUENCE_CATEGORIES).toContain('Halloween');
      expect(SEQUENCE_CATEGORIES).toContain('Christmas');
    });

    it('has exactly 2 categories', () => {
      expect(SEQUENCE_CATEGORIES).toHaveLength(2);
    });
  });

  describe('DIFFICULTY_LEVELS', () => {
    it('contains all difficulty levels', () => {
      expect(DIFFICULTY_LEVELS).toContain('Beginner');
      expect(DIFFICULTY_LEVELS).toContain('Intermediate');
      expect(DIFFICULTY_LEVELS).toContain('Advanced');
    });

    it('has exactly 3 levels', () => {
      expect(DIFFICULTY_LEVELS).toHaveLength(3);
    });
  });

  describe('FILE_FORMATS', () => {
    it('contains xLights sequence format', () => {
      expect(FILE_FORMATS.some(f => f.includes('xLights'))).toBe(true);
    });

    it('contains FSEQ format', () => {
      expect(FILE_FORMATS.some(f => f.includes('FSEQ'))).toBe(true);
    });
  });

  describe('EXTERNAL_URLS', () => {
    it('has valid xLights Seq URL', () => {
      expect(EXTERNAL_URLS.XLIGHTS_SEQ).toMatch(/^https:\/\//);
    });

    it('has valid YouTube channel URL', () => {
      expect(EXTERNAL_URLS.YOUTUBE_CHANNEL).toMatch(/^https:\/\/www\.youtube\.com\//);
    });
  });

  describe('SITE_CONFIG', () => {
    it('has required site configuration', () => {
      expect(SITE_CONFIG.NAME).toBe('Lights of Elm Ridge');
      expect(SITE_CONFIG.URL).toMatch(/^https:\/\//);
      expect(SITE_CONFIG.DESCRIPTION).toBeTruthy();
    });
  });

  describe('CURRENT_YEAR', () => {
    it('matches the current year', () => {
      expect(CURRENT_YEAR).toBe(new Date().getFullYear());
    });
  });

  describe('PRICE_CONFIG', () => {
    it('has valid price thresholds', () => {
      expect(PRICE_CONFIG.MIN_PRICE).toBe(0);
      expect(PRICE_CONFIG.MAX_PRICE).toBeGreaterThan(PRICE_CONFIG.MIN_PRICE);
      expect(PRICE_CONFIG.FREE_THRESHOLD).toBe(0);
    });
  });
});
