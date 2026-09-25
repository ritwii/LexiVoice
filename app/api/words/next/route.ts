import { NextRequest, NextResponse } from 'next/server';
import { getNextWord } from '@/lib/learning-engine';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const excludeIdParam = searchParams.get('excludeId');
    const excludeId = excludeIdParam ? parseInt(excludeIdParam, 10) : undefined;

    const word = await getNextWord({ excludeId });

    if (!word) {
      return NextResponse.json({
        word: null,
        message: 'No active words available to learn. All words may be learned or no words exist yet.',
      });
    }

    return NextResponse.json({ word });
  } catch (error) {
    console.error('Error in GET /api/words/next:', error);
    return NextResponse.json(
      { error: 'Failed to fetch next vocabulary word' },
      { status: 500 }
    );
  }
}
