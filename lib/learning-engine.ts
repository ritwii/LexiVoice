import {
  Difficulty,
  LearningStatus,
  VocabularyWord,
  sheetDb,
} from './sheet-db';

export { Difficulty, LearningStatus };
export type { VocabularyWord };

export interface NextWordOptions {
  excludeId?: number;
}

// Review interval configuration in milliseconds
export const REVIEW_INTERVALS = {
  EASY: {
    correct: [
      1 * 24 * 60 * 60 * 1000,   // 1 day
      3 * 24 * 60 * 60 * 1000,   // 3 days
      7 * 24 * 60 * 60 * 1000,   // 7 days
      14 * 24 * 60 * 60 * 1000,  // 14 days
      30 * 24 * 60 * 60 * 1000,  // 30 days
    ],
    incorrect: 10 * 60 * 1000,    // 10 minutes
  },
  MEDIUM: {
    correct: [
      6 * 60 * 60 * 1000,        // 6 hours
      1 * 24 * 60 * 60 * 1000,   // 1 day
      3 * 24 * 60 * 60 * 1000,   // 3 days
      7 * 24 * 60 * 60 * 1000,   // 7 days
      14 * 24 * 60 * 60 * 1000,  // 14 days
    ],
    incorrect: 30 * 60 * 1000,    // 30 minutes
  },
  HARD: {
    correct: [
      1 * 60 * 60 * 1000,        // 1 hour
      6 * 60 * 60 * 1000,        // 6 hours
      1 * 24 * 60 * 60 * 1000,   // 1 day
      3 * 24 * 60 * 60 * 1000,   // 3 days
    ],
    incorrect: 10 * 60 * 1000,    // 10 minutes
  },
};

/**
 * Calculates next review timestamp based on difficulty, correctness, and streak
 */
export function calculateNextReview(
  difficulty: Difficulty,
  isCorrect: boolean,
  consecutiveCorrect: number = 0,
  baseDate: Date = new Date()
): Date {
  const config = REVIEW_INTERVALS[difficulty] || REVIEW_INTERVALS.MEDIUM;
  let intervalMs: number;

  if (isCorrect) {
    const idx = Math.min(consecutiveCorrect, config.correct.length - 1);
    intervalMs = config.correct[idx];
  } else {
    intervalMs = config.incorrect;
  }

  return new Date(baseDate.getTime() + intervalMs);
}

/**
 * Updates confidence bounded strictly between 0 and 1
 */
export function calculateUpdatedConfidence(currentConfidence: number, isCorrect: boolean): number {
  let updated = isCorrect ? currentConfidence + 0.15 : currentConfidence - 0.20;
  updated = Math.max(0, Math.min(1, Math.round(updated * 100) / 100));
  return updated;
}

/**
 * Word selection prioritizer
 * Prioritizes:
 * 1. Due words (nextReview <= now)
 * 2. Low confidence
 * 3. Recently answered incorrectly (incorrectCount > 0)
 * 4. Harder difficulty (HARD > MEDIUM > EASY)
 * 5. Words never attempted (attemptCount === 0)
 * Never selects LEARNED words!
 */
export function rankWordsForLearning(
  words: VocabularyWord[],
  now: Date = new Date(),
  excludeId?: number
): VocabularyWord[] {
  // Filter out any LEARNED words and optionally the last seen word
  const activeWords = words.filter((w) => w.status !== LearningStatus.LEARNED);

  if (activeWords.length === 0) return [];

  // Filter out excludeId if there are other candidates
  const candidates =
    excludeId !== undefined && activeWords.length > 1
      ? activeWords.filter((w) => w.id !== excludeId)
      : activeWords;

  // Sorting with multi-criteria priority
  return candidates.slice().sort((a, b) => {
    // 1. Due words priority (words that need review now)
    const aIsDue = a.nextReview !== null && a.nextReview !== undefined && a.nextReview.getTime() <= now.getTime();
    const bIsDue = b.nextReview !== null && b.nextReview !== undefined && b.nextReview.getTime() <= now.getTime();

    if (aIsDue && !bIsDue) return -1;
    if (!aIsDue && bIsDue) return 1;

    // If both are due, older due date comes first
    if (aIsDue && bIsDue && a.nextReview && b.nextReview) {
      if (a.nextReview.getTime() !== b.nextReview.getTime()) {
        return a.nextReview.getTime() - b.nextReview.getTime();
      }
    }

    // 2. Unseen words (attemptCount === 0) vs already seen words (if not due)
    if (a.attemptCount === 0 && b.attemptCount > 0) return -1;
    if (a.attemptCount > 0 && b.attemptCount === 0) return 1;

    // 3. Lower confidence comes first
    if (Math.abs(a.confidence - b.confidence) > 0.05) {
      return a.confidence - b.confidence;
    }

    // 4. Incorrect count priority
    if (a.incorrectCount !== b.incorrectCount) {
      return b.incorrectCount - a.incorrectCount;
    }

    // 5. Harder difficulty priority
    const diffScore = { HARD: 3, MEDIUM: 2, EASY: 1 };
    if (diffScore[a.difficulty] !== diffScore[b.difficulty]) {
      return diffScore[b.difficulty] - diffScore[a.difficulty];
    }

    // 6. Last seen priority (older last seen first)
    const aTime = a.lastSeen ? a.lastSeen.getTime() : 0;
    const bTime = b.lastSeen ? b.lastSeen.getTime() : 0;
    return aTime - bTime;
  });
}

/**
 * Gets the next vocabulary word to practice from the database
 */
export async function getNextWord(options: NextWordOptions = {}): Promise<VocabularyWord | null> {
  const words = await sheetDb.findMany({
    where: {
      status: {
        not: LearningStatus.LEARNED,
      },
    },
  });

  if (words.length === 0) {
    return null;
  }

  const ranked = rankWordsForLearning(words, new Date(), options.excludeId);
  return ranked[0] || null;
}

/**
 * Updates learning state in database after user submits an answer
 */
export async function updateLearningState(params: {
  wordId: number;
  isCorrect: boolean;
  score: number;
  userAnswer: string;
  feedback: string;
  difficulty?: Difficulty;
}) {
  const { wordId, isCorrect, score, userAnswer, feedback, difficulty } = params;

  const currentWord = await sheetDb.findUnique({
    where: { id: wordId },
  });

  if (!currentWord) {
    throw new Error(`Word with ID ${wordId} not found`);
  }

  const recentAttempts = await sheetDb.getAttemptsForWord(wordId, 10);

  // Calculate consecutive correct streak
  let consecutiveCorrect = 0;
  if (isCorrect) {
    consecutiveCorrect = 1;
    for (const attempt of recentAttempts) {
      if (attempt.correct) {
        consecutiveCorrect++;
      } else {
        break;
      }
    }
  }

  const effectiveDifficulty = difficulty || currentWord.difficulty;
  const newNextReview = calculateNextReview(
    effectiveDifficulty,
    isCorrect,
    consecutiveCorrect,
    new Date()
  );

  const newConfidence = calculateUpdatedConfidence(currentWord.confidence, isCorrect);

  const attempt = await sheetDb.createAttempt({
    wordId,
    userAnswer,
    correct: isCorrect,
    score,
    feedback,
    difficulty: effectiveDifficulty,
  });

  const updatedWord = await sheetDb.updateWord(wordId, {
    difficulty: effectiveDifficulty,
    attemptCount: currentWord.attemptCount + 1,
    correctCount: isCorrect ? currentWord.correctCount + 1 : currentWord.correctCount,
    incorrectCount: !isCorrect ? currentWord.incorrectCount + 1 : currentWord.incorrectCount,
    confidence: newConfidence,
    status: currentWord.status === LearningStatus.LEARNED ? LearningStatus.LEARNED : LearningStatus.REVIEW,
    lastSeen: new Date(),
    nextReview: newNextReview,
  });

  return { attempt, updatedWord, nextReview: newNextReview };
}

/**
 * Marks a word as LEARNED so it immediately leaves the active learning queue
 */
export async function markAsLearned(wordId: number): Promise<VocabularyWord> {
  const updatedWord = await sheetDb.updateWord(wordId, {
    status: LearningStatus.LEARNED,
    confidence: 1.0,
    nextReview: null,
  });

  return updatedWord;
}
