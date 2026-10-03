import { NextResponse } from 'next/server';
import sheetDb from '@/lib/sheet-db';

export async function GET() {
  try {
    await sheetDb.ensureInitialized();
    const info = sheetDb.getSourceInfo();
    return NextResponse.json({
      success: true,
      ...info,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get data source info' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await sheetDb.syncFromSource();
    const info = sheetDb.getSourceInfo();
    return NextResponse.json({
      success: true,
      ...result,
      ...info,
      message:
        result.source === 'google-sheets'
          ? `Successfully synchronized ${result.count} words from Google Sheets.`
          : `Loaded ${result.count} words from local sample data. ${result.error || ''}`.trim(),
    });
  } catch (error: any) {
    console.error('Error in POST /api/sync:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync from Google Sheets' },
      { status: 500 }
    );
  }
}
