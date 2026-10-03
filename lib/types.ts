export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export const Difficulty = {
  EASY: 'EASY' as const,
  MEDIUM: 'MEDIUM' as const,
  HARD: 'HARD' as const,
};

export type LearningStatus = 'LEARNING' | 'REVIEW' | 'LEARNED';
export const LearningStatus = {
  LEARNING: 'LEARNING' as const,
  REVIEW: 'REVIEW' as const,
  LEARNED: 'LEARNED' as const,
};

export interface ValidatedVocabularyItem {
  word: string;
  definition: string;
  exampleSentence?: string;
  difficulty: Difficulty;
}

export interface VocabularyWord {
  id: number;
  word: string;
  definition: string;
  exampleSentence?: string | null;
  difficulty: Difficulty;
  status: LearningStatus;
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  confidence: number;
  lastSeen?: Date | null;
  nextReview?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnswerAttempt {
  id: number;
  wordId: number;
  userAnswer: string;
  correct: boolean;
  score: number;
  feedback: string;
  difficulty: Difficulty;
  createdAt: Date;
  word: { word: string };
}

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
  sourceInfo: {
    source: 'google-sheets' | 'local-sample';
    url: string | null;
    lastSync: Date | null;
    wordCount: number;
  };
}
