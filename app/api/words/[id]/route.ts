import { NextRequest, NextResponse } from 'next/server';
import { getVocabularyWordById } from '@/lib/vocabulary';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const wordId = parseInt(id, 10);

    if (isNaN(wordId)) {
      return NextResponse.json({ error: 'Invalid word ID' }, { status: 400 });
    }

    const word = await getVocabularyWordById(wordId);

    if (!word) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }

    return NextResponse.json({ word });
  } catch (error) {
    console.error('Error in GET /api/words/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch word' }, { status: 500 });
  }
}
