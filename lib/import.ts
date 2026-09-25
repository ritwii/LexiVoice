import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Difficulty } from '@prisma/client';
import prisma from './prisma';

export interface RawVocabularyRow {
  word?: string;
  definition?: string;
  example_sentence?: string;
  exampleSentence?: string;
  example?: string;
  difficulty?: string;
  [key: string]: unknown;
}

export interface ValidatedVocabularyItem {
  word: string;
  definition: string;
  exampleSentence?: string;
  difficulty: Difficulty;
}

export interface ImportSummary {
  total: number;
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  errors: string[];
  words: ValidatedVocabularyItem[];
}

/**
 * Normalizes keys of an object to lowercase and removes non-alphanumeric chars (like underscores)
 */
export function normalizeRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
    normalized[cleanKey] = value;
  }
  return normalized;
}

/**
 * Normalizes difficulty string to Difficulty enum
 */
export function normalizeDifficulty(diff?: unknown): Difficulty {
  if (typeof diff !== 'string') return Difficulty.MEDIUM;
  const lower = diff.trim().toLowerCase();
  if (lower === 'easy') return Difficulty.EASY;
  if (lower === 'hard') return Difficulty.HARD;
  return Difficulty.MEDIUM;
}

/**
 * Extracts and validates a single row
 */
export function validateAndCleanRow(rawRow: Record<string, unknown>, rowIndex: number): {
  item?: ValidatedVocabularyItem;
  error?: string;
} {
  const norm = normalizeRowKeys(rawRow);

  const wordVal = norm['word'];
  const defVal = norm['definition'] || norm['meaning'];
  const exVal = norm['examplesentence'] || norm['example'] || norm['sentence'];
  const diffVal = norm['difficulty'] || norm['level'];

  const word = typeof wordVal === 'string' ? wordVal.trim() : typeof wordVal === 'number' ? String(wordVal).trim() : '';
  const definition = typeof defVal === 'string' ? defVal.trim() : typeof defVal === 'number' ? String(defVal).trim() : '';
  const exampleSentence = typeof exVal === 'string' ? exVal.trim() : typeof exVal === 'number' ? String(exVal).trim() : undefined;

  if (!word && !definition) {
    return { error: `Row ${rowIndex}: Empty row` };
  }

  if (!word) {
    return { error: `Row ${rowIndex}: Missing required 'word'` };
  }

  if (!definition) {
    return { error: `Row ${rowIndex}: Missing required 'definition' for word "${word}"` };
  }

  const difficulty = normalizeDifficulty(diffVal);

  return {
    item: {
      word: word.toLowerCase(),
      definition,
      exampleSentence: exampleSentence || undefined,
      difficulty,
    },
  };
}

/**
 * Parses raw text or buffer according to file extension or format
 */
export function parseRawContent(
  content: string | Buffer | ArrayBuffer,
  fileType: 'csv' | 'xlsx' | 'xls'
): Record<string, unknown>[] {
  if (fileType === 'csv') {
    const text =
      typeof content === 'string'
        ? content
        : Buffer.isBuffer(content)
        ? content.toString('utf-8')
        : new TextDecoder('utf-8').decode(content as ArrayBuffer);
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
    });
    return result.data;
  } else {
    const workbook = XLSX.read(content, { type: typeof content === 'string' ? 'string' : 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const sheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  }
}

/**
 * Validates rows, checks duplicate entries, and prepares for database insertion
 */
export function processRawRows(rawRows: Record<string, unknown>[]): {
  validItems: ValidatedVocabularyItem[];
  summary: ImportSummary;
} {
  const validItems: ValidatedVocabularyItem[] = [];
  const seenWords = new Set<string>();
  const errors: string[] = [];
  let skippedDuplicates = 0;
  let skippedInvalid = 0;

  rawRows.forEach((row, index) => {
    const rowIndex = index + 1;
    const { item, error } = validateAndCleanRow(row, rowIndex);

    if (error || !item) {
      skippedInvalid++;
      if (error && !error.includes('Empty row')) {
        errors.push(error);
      }
      return;
    }

    if (seenWords.has(item.word)) {
      skippedDuplicates++;
      errors.push(`Row ${rowIndex}: Duplicate word "${item.word}" in upload (skipped)`);
      return;
    }

    seenWords.add(item.word);
    validItems.push(item);
  });

  return {
    validItems,
    summary: {
      total: rawRows.length,
      imported: validItems.length,
      skippedDuplicates,
      skippedInvalid,
      errors,
      words: validItems,
    },
  };
}

/**
 * Imports items into the database, respecting existing database records
 */
export async function importVocabularyToDatabase(
  items: ValidatedVocabularyItem[]
): Promise<{ insertedCount: number; existingDuplicatesCount: number }> {
  let insertedCount = 0;
  let existingDuplicatesCount = 0;

  for (const item of items) {
    try {
      const existing = await prisma.vocabularyWord.findUnique({
        where: { word: item.word },
      });

      if (existing) {
        existingDuplicatesCount++;
        continue;
      }

      await prisma.vocabularyWord.create({
        data: {
          word: item.word,
          definition: item.definition,
          exampleSentence: item.exampleSentence,
          difficulty: item.difficulty,
          status: 'LEARNING',
          confidence: 0,
        },
      });
      insertedCount++;
    } catch {
      existingDuplicatesCount++;
    }
  }

  return { insertedCount, existingDuplicatesCount };
}
