import { Difficulty, LearningStatus } from '@prisma/client';
import prisma from './prisma';

export interface DashboardStats {
  totalWords: number;
  learnedWords: number;
  learningWords: number;
  reviewWords: number;
  progressPercentage: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracyPercentage: number;
  todayReviews: number;
  difficultyBreakdown: {
    EASY: { total: number; learned: number };
    MEDIUM: { total: number; learned: number };
    HARD: { total: number; learned: number };
  };
  recentAttempts: Array<{
    id: number;
    word: string;
    userAnswer: string;
    correct: boolean;
    score: number;
    feedback: string;
    difficulty: Difficulty;
    createdAt: Date;
  }>;
}

/**
 * Gets a single word with its attempt history
 */
export async function getVocabularyWordById(id: number) {
  return prisma.vocabularyWord.findUnique({
    where: { id },
    include: {
      attempts: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}

/**
 * Computes comprehensive statistics for dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [words, attempts] = await Promise.all([
    prisma.vocabularyWord.findMany(),
    prisma.answerAttempt.findMany({
      include: {
        word: { select: { word: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const totalWords = words.length;
  const learnedWords = words.filter((w) => w.status === LearningStatus.LEARNED).length;
  const learningWords = words.filter((w) => w.status === LearningStatus.LEARNING).length;
  const reviewWords = words.filter((w) => w.status === LearningStatus.REVIEW).length;

  const progressPercentage = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.correct).length;
  const accuracyPercentage = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  // Calculate today's reviews (since midnight local/UTC)
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
  };
}
