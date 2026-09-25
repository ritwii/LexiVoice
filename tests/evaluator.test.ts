import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LLMEvaluator,
  FallbackSemanticEvaluator,
  EvaluationSchema,
} from '../lib/evaluator';

describe('Evaluator', () => {
  describe('Zod Evaluation Schema', () => {
    it('validates a correct evaluation payload', () => {
      const valid = {
        correct: true,
        score: 0.95,
        feedback: 'Excellent explanation!',
        missingConcepts: [],
      };
      const result = EvaluationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects payload with score outside 0-1 range', () => {
      const invalid = {
        correct: true,
        score: 1.5,
        feedback: 'Too high score',
        missingConcepts: [],
      };
      const result = EvaluationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects payload missing feedback', () => {
      const invalid = {
        correct: true,
        score: 0.8,
        missingConcepts: [],
      };
      const result = EvaluationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('LLMEvaluator with Mocked Fetch', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('handles correct response from LLM', async () => {
      const mockLlmResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                correct: true,
                score: 0.92,
                feedback: 'Correct. You captured the idea of being very careful and attentive to detail.',
                missingConcepts: [],
              }),
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockLlmResponse,
      } as Response);

      const evaluator = new LLMEvaluator('test-key');
      const result = await evaluator.evaluateAnswer(
        'meticulous',
        'Showing great attention to detail; very careful and precise.',
        'Being very careful about small details.'
      );

      expect(result.correct).toBe(true);
      expect(result.score).toBe(0.92);
      expect(result.feedback).toContain('attentive to detail');
      expect(result.missingConcepts).toEqual([]);
    });

    it('handles incorrect response from LLM', async () => {
      const mockLlmResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                correct: false,
                score: 0.15,
                feedback: 'Incorrect. Meticulous relates to care and precision, not speed.',
                missingConcepts: ['careful', 'attention to detail'],
              }),
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockLlmResponse,
      } as Response);

      const evaluator = new LLMEvaluator('test-key');
      const result = await evaluator.evaluateAnswer(
        'meticulous',
        'Showing great attention to detail; very careful and precise.',
        'Moving very fast and running quickly.'
      );

      expect(result.correct).toBe(false);
      expect(result.score).toBe(0.15);
      expect(result.missingConcepts).toContain('careful');
    });

    it('handles partial understanding response', async () => {
      const mockLlmResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                correct: false,
                score: 0.55,
                feedback: 'Partially correct. You mentioned caution, but missed precision with small details.',
                missingConcepts: ['precision', 'small details'],
              }),
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockLlmResponse,
      } as Response);

      const evaluator = new LLMEvaluator('test-key');
      const result = await evaluator.evaluateAnswer(
        'meticulous',
        'Showing great attention to detail; very careful and precise.',
        'Doing things cautiously.'
      );

      expect(result.score).toBe(0.55);
      expect(result.correct).toBe(false);
      expect(result.missingConcepts).toHaveLength(2);
    });

    it('throws on malformed JSON response from LLM', async () => {
      const mockBadResponse = {
        choices: [
          {
            message: {
              content: 'Sorry, I cannot answer as JSON right now.',
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBadResponse,
      } as Response);

      const evaluator = new LLMEvaluator('test-key');
      await expect(
        evaluator.evaluateAnswer('meticulous', 'careful', 'being careful')
      ).rejects.toThrow();
    });

    it('throws when LLM API returns HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      const evaluator = new LLMEvaluator('test-key');
      await expect(
        evaluator.evaluateAnswer('meticulous', 'careful', 'being careful')
      ).rejects.toThrow('LLM API returned status 500');
    });
  });

  describe('FallbackSemanticEvaluator', () => {
    const fallback = new FallbackSemanticEvaluator();

    it('rejects empty answers gracefully', async () => {
      const res = await fallback.evaluateAnswer('serene', 'Calm and peaceful', '   ');
      expect(res.correct).toBe(false);
      expect(res.feedback).toContain('Please provide an explanation');
    });

    it('recognizes semantic matches for definitions', async () => {
      const res = await fallback.evaluateAnswer(
        'benevolent',
        'Well meaning and kindly wishing to do good to others',
        'kind generous person wishing good to people'
      );
      expect(res.correct).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(0.65);
    });

    it('identifies incorrect or unrelated answers', async () => {
      const res = await fallback.evaluateAnswer(
        'meticulous',
        'Very careful and precise with details',
        'A large heavy truck that carries cement'
      );
      expect(res.correct).toBe(false);
      expect(res.score).toBeLessThan(0.65);
    });
  });
});
