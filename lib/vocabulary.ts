import {
  Difficulty,
  LearningStatus,
  DashboardStats,
  sheetDb,
} from './sheet-db';

export type { DashboardStats };

/**
 * Gets a single word with its attempt history
 */
export async function getVocabularyWordById(id: number) {
  const word = await sheetDb.findUnique({ where: { id } });
  if (!word) return null;

  const attempts = await sheetDb.getAttemptsForWord(id, 10);
  return {
    ...word,
    attempts,
  };
}

/**
 * Computes comprehensive statistics for dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [words, attempts] = await Promise.all([
    sheetDb.findMany(),
    sheetDb.getAllAttempts(),
  ]);

  const totalWords = words.length;
  const learnedWords = words.filter((w) => w.status === LearningStatus.LEARNED).length;
  const learningWords = words.filter((w) => w.status === LearningStatus.LEARNING).length;
  const reviewWords = words.filter((w) => w.status === LearningStatus.REVIEW).length;

  const progressPercentage = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.correct).length;
  const accuracyPercentage = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  // Calculate today's reviews (since midnight local)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayReviews = attempts.filter((a) => new Date(a.createdAt) >= startOfToday).length;

  const difficultyBreakdown = {
    EASY: {
      total: words.filter((w) => w.difficulty === Difficulty.EASY).length,
      learned: words.filter((w) => w.difficulty === Difficulty.EASY && w.status === LearningStatus.LEARNED).length,
    },
    MEDIUM: {
      total: words.filter((w) => w.difficulty === Difficulty.MEDIUM).length,
      learned: words.filter((w) => w.difficulty === Difficulty.MEDIUM && w.status === LearningStatus.LEARNED).length,
    },
    HARD: {
      total: words.filter((w) => w.difficulty === Difficulty.HARD).length,
      learned: words.filter((w) => w.difficulty === Difficulty.HARD && w.status === LearningStatus.LEARNED).length,
    },
  };

  const recentAttempts = attempts.slice(0, 10).map((a) => ({
    id: a.id,
    word: a.word.word,
    userAnswer: a.userAnswer,
    correct: a.correct,
    score: a.score,
    feedback: a.feedback,
    difficulty: a.difficulty,
    createdAt: a.createdAt,
  }));

  const sourceInfo = sheetDb.getSourceInfo();

  return {
    totalWords,
    learnedWords,
    learningWords,
    reviewWords,
    progressPercentage,
    totalAttempts,
    correctAttempts,
    accuracyPercentage,
    todayReviews,
    difficultyBreakdown,
    recentAttempts,
    sourceInfo,
  };
}
