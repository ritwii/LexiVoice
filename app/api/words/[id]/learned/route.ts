import { NextRequest, NextResponse } from 'next/server';
import { markAsLearned } from '@/lib/learning-engine';

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

    const word = await markAsLearned(wordId);

    return NextResponse.json({
      success: true,
      message: `"${word.word}" has been marked as learned.`,
      word,
    });
  } catch (error) {
    console.error('Error in POST /api/words/[id]/learned:', error);
    return NextResponse.json(
      { error: 'Failed to mark word as learned' },
      { status: 500 }
    );
  }
}
