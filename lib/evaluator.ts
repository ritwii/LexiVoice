import { z } from 'zod';

export interface EvaluationResult {
  correct: boolean;
  score: number;
  feedback: string;
  missingConcepts: string[];
}

export interface IEvaluator {
  evaluateAnswer(word: string, definition: string, userAnswer: string): Promise<EvaluationResult>;
}

export const EvaluationSchema = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  feedback: z.string().min(1),
  missingConcepts: z.array(z.string()).default([]),
});

export const EVALUATION_SYSTEM_PROMPT = `You are an expert vocabulary learning evaluator.
Your task is to determine whether a learner understands the true semantic meaning of a vocabulary word.

Rules:
1. Evaluate semantic meaning, not exact wording.
2. Accept synonyms, colloquialisms, and accurate paraphrasing.
3. Accept minor grammar or spelling mistakes when the intended meaning is clear.
4. Do not require the learner to reproduce the dictionary definition verbatim.
5. Do not mark an answer correct merely because it repeats a keyword in the definition without understanding.
6. If the learner demonstrates partial understanding, assign a score between 0.40 and 0.70 and specify what is missing.
7. Score strictly from 0.0 to 1.0 (>= 0.70 is considered correct).
8. Provide concise educational feedback (1-3 sentences).
9. Identify important missing concepts when applicable.
10. Return ONLY valid JSON matching the requested schema. No markdown formatting, no explanations outside the JSON object.

Schema:
{
  "correct": boolean,
  "score": number,
  "feedback": "string",
  "missingConcepts": ["string"]
}`;

/**
 * Builds user prompt for LLM evaluation
 */
export function buildEvaluatorPrompt(word: string, definition: string, userAnswer: string): string {
  return `WORD:
${word}

REFERENCE MEANING:
${definition}

LEARNER'S EXPLANATION:
${userAnswer}

Evaluate whether the learner's explanation accurately captures the meaning. Return ONLY the JSON object.`;
}

/**
 * Intelligent local semantic fallback evaluator when no LLM key is configured or when the API fails
 */
export class FallbackSemanticEvaluator implements IEvaluator {
  async evaluateAnswer(word: string, definition: string, userAnswer: string): Promise<EvaluationResult> {
    const trimmedAnswer = userAnswer.trim();
    if (!trimmedAnswer) {
      return {
        correct: false,
        score: 0,
        feedback: 'Please provide an explanation before submitting.',
        missingConcepts: ['definition'],
      };
    }

    // Common stopwords to exclude from semantic matching
    const stopwords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'against', 'between',
      'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up',
      'down', 'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
      'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'it', 'its',
      'that', 'this', 'means', 'meaning', 'something', 'someone', 'somebody', 'having',
      'action', 'state', 'act', 'way', 'person', 'thing', 'feeling'
    ]);

    const cleanTokens = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 2 && !stopwords.has(w));

    const defTokens = cleanTokens(definition);
    const userTokens = cleanTokens(userAnswer);

    if (userTokens.length === 0) {
      return {
        correct: false,
        score: 0.2,
        feedback: `Your explanation is too brief. "${word}" means: ${definition}`,
        missingConcepts: defTokens.slice(0, 3),
      };
    }

    // Check overlap with definition keywords
    let matchCount = 0;
    const missing: string[] = [];

    // Simple stemmed / prefix check
    for (const dToken of defTokens) {
      const stem = dToken.slice(0, Math.max(3, dToken.length - 2));
      const hasMatch = userTokens.some((u) => u.startsWith(stem) || stem.startsWith(u.slice(0, 3)));
      if (hasMatch) {
        matchCount++;
      } else {
        if (!missing.includes(dToken) && missing.length < 3) {
          missing.push(dToken);
        }
      }
    }

    const coverage = defTokens.length > 0 ? matchCount / defTokens.length : 0.5;
    // Calculate final score
    let score = Math.min(0.95, coverage * 1.3);

    // Boost if user provided good length explanation
    if (userTokens.length >= 4 && score >= 0.3) {
      score = Math.min(0.95, score + 0.2);
    }

    score = Math.round(score * 100) / 100;
    const correct = score >= 0.65;

    let feedback = '';
    if (correct) {
      feedback = `Correct! Your explanation captures the core meaning of "${word}".`;
    } else if (score >= 0.4) {
      feedback = `Partially correct. You touched on the idea, but "${word}" specifically means: ${definition}`;
    } else {
      feedback = `Not quite. "${word}" means: ${definition}`;
    }

    return {
      correct,
      score,
      feedback,
      missingConcepts: correct ? [] : missing,
    };
  }
}

/**
 * Standard LLM Evaluator supporting OpenAI and OpenAI-compatible endpoints
 */
export class LLMEvaluator implements IEvaluator {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey?: string, model?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.LLM_API_KEY || '';
    this.model = model || process.env.LLM_MODEL || 'gpt-4o-mini';
    this.baseUrl = baseUrl || process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  }

  async evaluateAnswer(word: string, definition: string, userAnswer: string): Promise<EvaluationResult> {
    if (!this.apiKey) {
      throw new Error('LLM_API_KEY is not set');
    }

    const prompt = buildEvaluatorPrompt(word, definition, userAnswer);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: EVALUATION_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('LLM returned empty response');
    }

    // Parse JSON safely
    const parsed = JSON.parse(rawContent);
    const validated = EvaluationSchema.parse(parsed);

    return {
      correct: validated.correct,
      score: validated.score,
      feedback: validated.feedback,
      missingConcepts: validated.missingConcepts,
    };
  }
}

/**
 * Composite evaluator that tries LLM first, falling back to local heuristic evaluator gracefully
 */
export class ResilientEvaluator implements IEvaluator {
  private llmEvaluator?: LLMEvaluator;
  private fallbackEvaluator: FallbackSemanticEvaluator;

  constructor() {
    this.fallbackEvaluator = new FallbackSemanticEvaluator();
    if (process.env.LLM_API_KEY) {
      this.llmEvaluator = new LLMEvaluator();
    }
  }

  async evaluateAnswer(word: string, definition: string, userAnswer: string): Promise<EvaluationResult> {
    const trimmed = (userAnswer || '').trim();
    if (!trimmed) {
      return {
        correct: false,
        score: 0,
        feedback: 'Please provide an explanation before submitting.',
        missingConcepts: [],
      };
    }

    if (this.llmEvaluator) {
      try {
        return await this.llmEvaluator.evaluateAnswer(word, definition, userAnswer);
      } catch (err) {
        console.warn('LLM evaluation call failed, using fallback evaluator:', err);
        const fallback = await this.fallbackEvaluator.evaluateAnswer(word, definition, userAnswer);
        return {
          ...fallback,
          feedback: `${fallback.feedback} (Note: Evaluated using local semantic analysis)`,
        };
      }
    }

    return this.fallbackEvaluator.evaluateAnswer(word, definition, userAnswer);
  }
}

// Default exported evaluation function
let defaultEvaluatorInstance: IEvaluator | null = null;

export function getEvaluator(): IEvaluator {
  if (!defaultEvaluatorInstance) {
    defaultEvaluatorInstance = new ResilientEvaluator();
  }
  return defaultEvaluatorInstance;
}

export async function evaluateAnswer(
  word: string,
  definition: string,
  userAnswer: string
): Promise<EvaluationResult> {
  const evaluator = getEvaluator();
  return evaluator.evaluateAnswer(word, definition, userAnswer);
}
