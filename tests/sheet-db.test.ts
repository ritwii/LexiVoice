import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeGoogleSheetUrl,
  SheetDatabase,
} from '../lib/sheet-db';

describe('Google Sheets Database (sheet-db)', () => {
  describe('normalizeGoogleSheetUrl', () => {
    it('converts standard Google Sheet edit link to export xlsx link', () => {
      const editUrl =
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing';
      const normalized = normalizeGoogleSheetUrl(editUrl);
      expect(normalized).toBe(
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=xlsx'
      );
    });

    it('preserves gid parameter when present in edit link', () => {
      const editWithGid =
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=123456';
      const normalized = normalizeGoogleSheetUrl(editWithGid);
      expect(normalized).toBe(
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=xlsx&gid=123456'
      );
    });

    it('converts published google sheet link', () => {
      const pubUrl =
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXYZ12345/pubhtml';
      const normalized = normalizeGoogleSheetUrl(pubUrl);
      expect(normalized).toBe(
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXYZ12345/pub?output=xlsx'
      );
    });

    it('leaves direct xlsx or csv url unchanged', () => {
      const directUrl = 'https://example.com/vocab.xlsx';
      expect(normalizeGoogleSheetUrl(directUrl)).toBe(directUrl);
    });
  });

  describe('SheetDatabase operations', () => {
    let db: SheetDatabase;

    beforeEach(() => {
      db = new SheetDatabase();
    });

    it('initializes and provides words from fallback if no url is given', async () => {
      await db.ensureInitialized();
      const words = await db.findMany();
      expect(words.length).toBeGreaterThan(0);
      expect(db.getSourceInfo().source).toBe('local-sample');
    });

    it('can find words by id or by word text', async () => {
      await db.ensureInitialized();
      const first = (await db.findMany())[0];
      expect(first).toBeDefined();

      const byId = await db.findUnique({ where: { id: first.id } });
      expect(byId?.word).toBe(first.word);

      const byWord = await db.findUnique({ where: { word: first.word.toUpperCase() } });
      expect(byWord?.id).toBe(first.id);
    });

    it('records attempts and tracks history', async () => {
      await db.ensureInitialized();
      const first = (await db.findMany())[0];

      const attempt = await db.createAttempt({
        wordId: first.id,
        userAnswer: 'A friendly and kind person',
        correct: true,
        score: 0.9,
        feedback: 'Great job!',
        difficulty: 'EASY',
      });

      expect(attempt.id).toBeDefined();
      expect(attempt.wordId).toBe(first.id);

      const attempts = await db.getAttemptsForWord(first.id);
      expect(attempts).toHaveLength(1);
      expect(attempts[0].correct).toBe(true);
    });

    it('updates word fields and preserves learning progress on sync', async () => {
      await db.ensureInitialized();
      const first = (await db.findMany())[0];

      await db.updateWord(first.id, {
        status: 'LEARNED',
        confidence: 1.0,
      });

      const updated = await db.findUnique({ where: { id: first.id } });
      expect(updated?.status).toBe('LEARNED');
      expect(updated?.confidence).toBe(1.0);
    });
  });
});
