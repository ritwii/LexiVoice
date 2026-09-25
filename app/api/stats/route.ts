import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/vocabulary';

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/stats:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve dashboard statistics' },
      { status: 500 }
    );
  }
}
