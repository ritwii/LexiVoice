import { NextRequest, NextResponse } from 'next/server';
import { sheetDb, Difficulty } from '@/lib/sheet-db';
import { evaluateAnswer } from '@/lib/evaluator';
import { updateLearningState } from '@/lib/learning-engine';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const wordId = parseInt(id, 10);

    if (isNaN(wordId)) {
      return NextResponse.json({ error: 'Invalid word ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { answer, difficulty: rawDifficulty } = body;

    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json(
        { error: 'Please provide an explanation before submitting.' },
        { status: 400 }
      );
    }

    const word = await sheetDb.findUnique({
      where: { id: wordId },
    });

    if (!word) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }

    // Determine difficulty
    let difficulty: Difficulty = word.difficulty;
    if (rawDifficulty && Object.values(Difficulty).includes(rawDifficulty as Difficulty)) {
      difficulty = rawDifficulty as Difficulty;
    }

    // 1. Evaluate semantic meaning
    const evaluation = await evaluateAnswer(word.word, word.definition, answer.trim());

    // 2. Persist attempt and update learning state
    const { updatedWord, nextReview } = await updateLearningState({
      wordId,
      isCorrect: evaluation.correct,
      score: evaluation.score,
      userAnswer: answer.trim(),
      feedback: evaluation.feedback,
      difficulty,
    });

    return NextResponse.json({
      correct: evaluation.correct,
      score: evaluation.score,
      feedback: evaluation.feedback,
      missingConcepts: evaluation.missingConcepts,
      nextReview: nextReview.toISOString(),
      word: updatedWord,
    });
  } catch (error) {
    console.error('Error in POST /api/words/[id]/answer:', error);
    return NextResponse.json(
      { error: 'We could not evaluate your answer right now. Please try again.' },
      { status: 500 }
    );
  }
}
