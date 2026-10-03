import { describe, it, expect } from 'vitest';
import {
  Difficulty,
  LearningStatus,
  VocabularyWord,
  calculateNextReview,
  calculateUpdatedConfidence,
  rankWordsForLearning,
  REVIEW_INTERVALS,
} from '../lib/learning-engine';

describe('Learning Engine', () => {
  describe('Confidence Calculation', () => {
    it('correct answers increase confidence', () => {
      const initial = 0.5;
      const updated = calculateUpdatedConfidence(initial, true);
      expect(updated).toBeGreaterThan(initial);
      expect(updated).toBe(0.65);
    });

    it('incorrect answers decrease confidence', () => {
      const initial = 0.5;
      const updated = calculateUpdatedConfidence(initial, false);
      expect(updated).toBeLessThan(initial);
      expect(updated).toBe(0.3);
    });

    it('confidence remains strictly clamped between 0 and 1', () => {
      // Upper clamp test
      const high = calculateUpdatedConfidence(0.95, true);
      expect(high).toBe(1.0);
      const higher = calculateUpdatedConfidence(1.0, true);
      expect(higher).toBe(1.0);

      // Lower clamp test
      const low = calculateUpdatedConfidence(0.1, false);
      expect(low).toBe(0.0);
      const lower = calculateUpdatedConfidence(0.0, false);
      expect(lower).toBe(0.0);
    });
  });

  describe('Review Scheduling Intervals', () => {
    const baseDate = new Date('2026-01-01T12:00:00Z');

    it('easy creates longer review intervals on correct answers', () => {
      const easyReview = calculateNextReview(Difficulty.EASY, true, 0, baseDate);
      const mediumReview = calculateNextReview(Difficulty.MEDIUM, true, 0, baseDate);
      const hardReview = calculateNextReview(Difficulty.HARD, true, 0, baseDate);

      // Easy 1st streak is 1 day (24h), Medium is 6h, Hard is 1h
      const easyInterval = easyReview.getTime() - baseDate.getTime();
      const mediumInterval = mediumReview.getTime() - baseDate.getTime();
      const hardInterval = hardReview.getTime() - baseDate.getTime();

      expect(easyInterval).toBe(24 * 60 * 60 * 1000);
      expect(mediumInterval).toBe(6 * 60 * 60 * 1000);
      expect(hardInterval).toBe(1 * 60 * 60 * 1000);

      expect(easyInterval).toBeGreaterThan(mediumInterval);
      expect(mediumInterval).toBeGreaterThan(hardInterval);
    });

    it('hard creates shorter review intervals', () => {
      const hardStreak3 = calculateNextReview(Difficulty.HARD, true, 2, baseDate);
      const easyStreak3 = calculateNextReview(Difficulty.EASY, true, 2, baseDate);

      const hardInterval = hardStreak3.getTime() - baseDate.getTime();
      const easyInterval = easyStreak3.getTime() - baseDate.getTime();

      // Hard 3rd interval is 1 day, Easy 3rd interval is 7 days
      expect(hardInterval).toBeLessThan(easyInterval);
    });

    it('incorrect answers set short retry interval', () => {
      const easyIncorrect = calculateNextReview(Difficulty.EASY, false, 0, baseDate);
      const mediumIncorrect = calculateNextReview(Difficulty.MEDIUM, false, 0, baseDate);

      expect(easyIncorrect.getTime() - baseDate.getTime()).toBe(REVIEW_INTERVALS.EASY.incorrect);
      expect(mediumIncorrect.getTime() - baseDate.getTime()).toBe(REVIEW_INTERVALS.MEDIUM.incorrect);
    });
  });

  describe('Word Selection Ranking', () => {
    const mockWord = (overrides: Partial<VocabularyWord>): VocabularyWord => ({
      id: 1,
      word: 'test',
      definition: 'a test',
      exampleSentence: null,
      difficulty: Difficulty.MEDIUM,
      status: LearningStatus.LEARNING,
      attemptCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      confidence: 0,
      lastSeen: null,
      nextReview: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

    it('learned words are not selected', () => {
      const words: VocabularyWord[] = [
        mockWord({ id: 1, word: 'active', status: LearningStatus.LEARNING }),
        mockWord({ id: 2, word: 'mastered', status: LearningStatus.LEARNED }),
      ];

      const ranked = rankWordsForLearning(words);
      expect(ranked).toHaveLength(1);
      expect(ranked[0].word).toBe('active');
    });

    it('due words are prioritized over non-due words', () => {
      const now = new Date('2026-06-01T12:00:00Z');
      const pastDue = new Date('2026-06-01T10:00:00Z'); // Due 2 hours ago
      const futureReview = new Date('2026-06-02T12:00:00Z'); // Due tomorrow

      const words: VocabularyWord[] = [
        mockWord({
          id: 1,
          word: 'future',
          nextReview: futureReview,
          attemptCount: 2,
          confidence: 0.8,
        }),
        mockWord({
          id: 2,
          word: 'due_word',
          nextReview: pastDue,
          attemptCount: 2,
          confidence: 0.8,
        }),
      ];

      const ranked = rankWordsForLearning(words, now);
      expect(ranked[0].word).toBe('due_word');
    });

    it('prioritizes low confidence among non-due words', () => {
      const now = new Date('2026-06-01T12:00:00Z');
      const words: VocabularyWord[] = [
        mockWord({ id: 1, word: 'high_conf', confidence: 0.9, attemptCount: 1 }),
        mockWord({ id: 2, word: 'low_conf', confidence: 0.1, attemptCount: 1 }),
      ];

      const ranked = rankWordsForLearning(words, now);
      expect(ranked[0].word).toBe('low_conf');
    });

    it('avoids repeating the excluded word if other options exist', () => {
      const words: VocabularyWord[] = [
        mockWord({ id: 1, word: 'word1' }),
        mockWord({ id: 2, word: 'word2' }),
      ];

      const ranked = rankWordsForLearning(words, new Date(), 1);
      expect(ranked[0].id).toBe(2);
    });
  });
});
