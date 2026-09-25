import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  parseRawContent,
  processRawRows,
  importVocabularyToDatabase,
} from '@/lib/import';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let rawRows: Record<string, unknown>[] = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();

      if (body.useSample) {
        // Load from sample-data/vocabulary.csv
        const samplePath = path.join(process.cwd(), 'sample-data', 'vocabulary.csv');
        if (!fs.existsSync(samplePath)) {
          return NextResponse.json({ error: 'Sample vocabulary file not found' }, { status: 404 });
        }
        const csvContent = fs.readFileSync(samplePath, 'utf-8');
        rawRows = parseRawContent(csvContent, 'csv');
      } else if (body.csvText) {
        rawRows = parseRawContent(body.csvText, 'csv');
      } else {
        return NextResponse.json(
          { error: 'No data provided. Please provide a file or request the sample dataset.' },
          { status: 400 }
        );
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      let fileType: 'csv' | 'xlsx' | 'xls' = 'csv';
      if (fileName.endsWith('.xlsx')) {
        fileType = 'xlsx';
      } else if (fileName.endsWith('.xls')) {
        fileType = 'xls';
      } else if (fileName.endsWith('.csv')) {
        fileType = 'csv';
      } else {
        return NextResponse.json(
          { error: 'Unsupported file format. Please upload a CSV, XLSX, or XLS file.' },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      rawRows = parseRawContent(buffer, fileType);
    } else {
      return NextResponse.json(
        { error: 'Invalid content type. Expected multipart/form-data or application/json.' },
        { status: 400 }
      );
    }

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json(
        {
          error: 'The uploaded file appears to be empty or has no readable rows.',
        },
        { status: 400 }
      );
    }

    // Process rows & detect in-file duplicates and validate
    const { validItems, summary } = processRawRows(rawRows);

    // Save to SQLite
    const { insertedCount, existingDuplicatesCount } = await importVocabularyToDatabase(validItems);

    const totalDuplicates = summary.skippedDuplicates + existingDuplicatesCount;

    return NextResponse.json({
      success: true,
      summary: {
        total: summary.total,
        imported: insertedCount,
        skippedDuplicates: totalDuplicates,
        skippedInvalid: summary.skippedInvalid,
        errors: summary.errors,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/import:', error);
    return NextResponse.json(
      { error: 'Failed to process vocabulary import. Please check file format.' },
      { status: 500 }
    );
  }
}
