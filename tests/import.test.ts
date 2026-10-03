import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { Difficulty } from '../lib/sheet-db';
import {
  parseRawContent,
  processRawRows,
  validateAndCleanRow,
  normalizeDifficulty,
} from '../lib/import';

describe('Vocabulary Import', () => {
  describe('Parsing Formats', () => {
    it('parses valid CSV correctly', () => {
      const csv = `word,definition,example_sentence,difficulty
meticulous,Very careful with details,He was meticulous.,medium
benevolent,Kind and generous,A benevolent donor.,easy`;

      const rows = parseRawContent(csv, 'csv');
      expect(rows).toHaveLength(2);
      expect(rows[0].word).toBe('meticulous');
      expect(rows[1].word).toBe('benevolent');
    });

    it('parses valid XLSX correctly', () => {
      const data = [
        { word: 'lucid', definition: 'Clear and easy to understand', difficulty: 'easy' },
        { word: 'austere', definition: 'Severe or strict', difficulty: 'medium' },
      ];

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const rows = parseRawContent(buffer, 'xlsx');
      expect(rows).toHaveLength(2);
      expect(rows[0].word).toBe('lucid');
      expect(rows[1].word).toBe('austere');
    });
  });

  describe('Validation and Cleaning', () => {
    it('validates required columns and flags missing word or definition', () => {
      const missingWord = validateAndCleanRow({ definition: 'Some meaning' }, 1);
      expect(missingWord.error).toContain("Missing required 'word'");

      const missingDef = validateAndCleanRow({ word: 'serene' }, 2);
      expect(missingDef.error).toContain("Missing required 'definition'");
    });

    it('identifies and skips empty rows', () => {
      const emptyRow = validateAndCleanRow({}, 3);
      expect(emptyRow.error).toContain('Empty row');
      expect(emptyRow.item).toBeUndefined();
    });

    it('normalizes difficulty correctly and defaults invalid difficulty to MEDIUM', () => {
      expect(normalizeDifficulty('easy')).toBe(Difficulty.EASY);
      expect(normalizeDifficulty('EASY')).toBe(Difficulty.EASY);
      expect(normalizeDifficulty('hard')).toBe(Difficulty.HARD);
      expect(normalizeDifficulty('HARD')).toBe(Difficulty.HARD);
      expect(normalizeDifficulty('medium')).toBe(Difficulty.MEDIUM);
      expect(normalizeDifficulty('unknown-level')).toBe(Difficulty.MEDIUM);
      expect(normalizeDifficulty(undefined)).toBe(Difficulty.MEDIUM);
    });

    it('detects and skips duplicate words within upload', () => {
      const rows = [
        { word: 'candid', definition: 'Truthful and frank', difficulty: 'easy' },
        { word: 'candid', definition: 'Another definition of candid', difficulty: 'medium' },
        { word: 'ephemeral', definition: 'Lasting a very short time', difficulty: 'medium' },
      ];

      const { validItems, summary } = processRawRows(rows);

      expect(validItems).toHaveLength(2);
      expect(validItems.map((i) => i.word)).toEqual(['candid', 'ephemeral']);
      expect(summary.skippedDuplicates).toBe(1);
      expect(summary.imported).toBe(2);
    });

    it('skips invalid rows without failing entire import', () => {
      const rows = [
        { word: 'resilient', definition: 'Able to recover quickly', difficulty: 'easy' },
        { word: '', definition: 'Invalid missing word', difficulty: 'easy' },
        { word: 'wary', definition: '', difficulty: 'easy' },
        {},
        { word: 'pragmatic', definition: 'Practical and sensible', difficulty: 'medium' },
      ];

      const { validItems, summary } = processRawRows(rows);

      expect(validItems).toHaveLength(2);
      expect(validItems.map((i) => i.word)).toEqual(['resilient', 'pragmatic']);
      expect(summary.skippedInvalid).toBe(3);
    });
  });
});
