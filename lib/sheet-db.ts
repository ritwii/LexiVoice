import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import {
  parseRawContent,
  processRawRows,
  ValidatedVocabularyItem,
} from './import';

import { DEFAULT_VOCABULARY } from './default-words';

import {
  Difficulty,
  LearningStatus,
  VocabularyWord,
  AnswerAttempt,
  DashboardStats,
} from './types';

export { Difficulty, LearningStatus };
export type { VocabularyWord, AnswerAttempt, DashboardStats };

/**
 * Normalizes any Google Sheets link into a direct downloadable export link
 */
export function normalizeGoogleSheetUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // 1. Published Google Sheets URL: https://docs.google.com/spreadsheets/d/e/{ID}/pub...
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    const pubId = pubMatch[1];
    return `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=xlsx`;
  }

  // 2. Standard Google Sheets URL: https://docs.google.com/spreadsheets/d/{ID}/...
  const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch && sheetMatch[1] && sheetMatch[1] !== 'e') {
    const sheetId = sheetMatch[1];
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx${gidParam}`;
  }

  // 3. Direct xlsx, xls, or csv URL
  return trimmed;
}

/**
 * In-memory Google Sheets backed Database
 */
export class SheetDatabase {
  private words: Map<number, VocabularyWord> = new Map();
  private wordIndex: Map<string, number> = new Map(); // word string -> id
  private attempts: AnswerAttempt[] = [];
  private nextWordId: number = 1;
  private nextAttemptId: number = 1;
  private initialized: boolean = false;
  private lastSyncTime: Date | null = null;
  private source: 'google-sheets' | 'local-sample' = 'local-sample';
  private configuredUrl: string | null = null;

  /**
   * Initializes store on first use
   */
  async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.syncFromSource();
    }
  }

  /**
   * Syncs vocabulary from Google Sheet URL configured in .env, falling back to local sample
   */
  async syncFromSource(): Promise<{
    count: number;
    source: 'google-sheets' | 'local-sample';
    error?: string;
  }> {
    const sheetUrl = process.env.GOOGLE_SHEET_URL || process.env.EXCEL_URL || '';
    this.configuredUrl = sheetUrl ? sheetUrl.trim() : null;

    if (this.configuredUrl) {
      try {
        const downloadUrl = normalizeGoogleSheetUrl(this.configuredUrl);
        console.log(`[SheetDB] Fetching Google Sheets / Excel database from: ${downloadUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(downloadUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LexiVoice/1.0',
          },
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let rawRows: Record<string, unknown>[] = [];
        try {
          rawRows = parseRawContent(buffer, 'xlsx');
        } catch {
          // Attempt CSV parse fallback
          const text = new TextDecoder('utf-8').decode(arrayBuffer);
          rawRows = parseRawContent(text, 'csv');
        }

        if (rawRows.length > 0) {
          const { validItems } = processRawRows(rawRows);
          this.mergeItems(validItems);
          this.source = 'google-sheets';
          this.lastSyncTime = new Date();
          this.initialized = true;
          console.log(`[SheetDB] Successfully synced ${validItems.length} words from Google Sheets.`);
          return { count: this.words.size, source: 'google-sheets' };
        } else {
          throw new Error('Google Sheet returned 0 rows or empty sheet.');
        }
      } catch (err: any) {
        console.warn(`[SheetDB] Failed to load from Google Sheets URL: ${err.message}. Falling back to sample data.`);
        this.loadSampleDataFallback();
        this.initialized = true;
        return {
          count: this.words.size,
          source: 'local-sample',
          error: `Could not load from Google Sheets URL (${err.message}). Using local sample vocabulary.`,
        };
      }
    } else {
      this.loadSampleDataFallback();
      this.initialized = true;
      return { count: this.words.size, source: 'local-sample' };
    }
  }

  /**
   * Loads sample data from sample-data/vocabulary.csv or statically embedded words
   */
  private loadSampleDataFallback() {
    try {
      const samplePath = path.join(process.cwd(), 'sample-data', 'vocabulary.csv');
      if (fs.existsSync(samplePath)) {
        const csvContent = fs.readFileSync(samplePath, 'utf-8');
        const rawRows = parseRawContent(csvContent, 'csv');
        const { validItems } = processRawRows(rawRows);
        if (validItems.length > 0) {
          this.mergeItems(validItems);
          this.source = 'local-sample';
          this.lastSyncTime = new Date();
          console.log(`[SheetDB] Loaded ${validItems.length} words from local sample data.`);
          return;
        }
      }
    } catch (err) {
      console.error('[SheetDB] Error loading sample CSV data, falling back to embedded default words:', err);
    }

    // Always fall back to embedded default vocabulary (guaranteed to work in serverless lambdas)
    this.mergeItems(DEFAULT_VOCABULARY);
    this.source = 'local-sample';
    this.lastSyncTime = new Date();
    console.log(`[SheetDB] Loaded ${DEFAULT_VOCABULARY.length} embedded default words.`);
  }

  /**
   * Merges incoming items into the store, preserving user learning state for existing words
   */
  private mergeItems(items: ValidatedVocabularyItem[]) {
    for (const item of items) {
      const existingId = this.wordIndex.get(item.word);
      if (existingId !== undefined) {
        const existingWord = this.words.get(existingId);
        if (existingWord) {
          // Update content while preserving learning progress
          existingWord.definition = item.definition;
          existingWord.exampleSentence = item.exampleSentence;
          existingWord.difficulty = item.difficulty;
          existingWord.updatedAt = new Date();
        }
      } else {
        const id = this.nextWordId++;
        const now = new Date();
        const newWord: VocabularyWord = {
          id,
          word: item.word,
          definition: item.definition,
          exampleSentence: item.exampleSentence || null,
          difficulty: item.difficulty,
          status: 'LEARNING',
          attemptCount: 0,
          correctCount: 0,
          incorrectCount: 0,
          confidence: 0,
          lastSeen: null,
          nextReview: null,
          createdAt: now,
          updatedAt: now,
        };
        this.words.set(id, newWord);
        this.wordIndex.set(item.word, id);
      }
    }
  }

  // --- Query & Mutation Methods ---

  async findMany(options?: { where?: { status?: { not?: LearningStatus } } }): Promise<VocabularyWord[]> {
    await this.ensureInitialized();
    const all = Array.from(this.words.values());
    if (options?.where?.status?.not) {
      return all.filter((w) => w.status !== options.where?.status?.not);
    }
    return all;
  }

  async findUnique(options: { where: { id?: number; word?: string } }): Promise<VocabularyWord | null> {
    await this.ensureInitialized();
    if (options.where.id !== undefined) {
      return this.words.get(options.where.id) || null;
    }
    if (options.where.word) {
      const id = this.wordIndex.get(options.where.word.toLowerCase());
      if (id !== undefined) {
        return this.words.get(id) || null;
      }
    }
    return null;
  }

  async updateWord(id: number, data: Partial<VocabularyWord>): Promise<VocabularyWord> {
    await this.ensureInitialized();
    const word = this.words.get(id);
    if (!word) {
      throw new Error(`Word with ID ${id} not found`);
    }

    Object.assign(word, data, { updatedAt: new Date() });
    return { ...word };
  }

  async createAttempt(data: {
    wordId: number;
    userAnswer: string;
    correct: boolean;
    score: number;
    feedback: string;
    difficulty: Difficulty;
  }): Promise<AnswerAttempt> {
    await this.ensureInitialized();
    const word = this.words.get(data.wordId);
    const attempt: AnswerAttempt = {
      id: this.nextAttemptId++,
      wordId: data.wordId,
      userAnswer: data.userAnswer,
      correct: data.correct,
      score: data.score,
      feedback: data.feedback,
      difficulty: data.difficulty,
      createdAt: new Date(),
      word: { word: word ? word.word : 'unknown' },
    };

    this.attempts.unshift(attempt);
    return attempt;
  }

  async getAttemptsForWord(wordId: number, limit: number = 10): Promise<AnswerAttempt[]> {
    await this.ensureInitialized();
    return this.attempts.filter((a) => a.wordId === wordId).slice(0, limit);
  }

  async getAllAttempts(): Promise<AnswerAttempt[]> {
    await this.ensureInitialized();
    return [...this.attempts];
  }

  async countWords(filter?: { where?: { status?: LearningStatus } }): Promise<number> {
    await this.ensureInitialized();
    if (filter?.where?.status) {
      return Array.from(this.words.values()).filter((w) => w.status === filter.where?.status).length;
    }
    return this.words.size;
  }

  async importItems(items: ValidatedVocabularyItem[]): Promise<{
    insertedCount: number;
    existingDuplicatesCount: number;
  }> {
    await this.ensureInitialized();
    let insertedCount = 0;
    let existingDuplicatesCount = 0;

    for (const item of items) {
      if (this.wordIndex.has(item.word)) {
        existingDuplicatesCount++;
      } else {
        const id = this.nextWordId++;
        const now = new Date();
        const newWord: VocabularyWord = {
          id,
          word: item.word,
          definition: item.definition,
          exampleSentence: item.exampleSentence || null,
          difficulty: item.difficulty,
          status: 'LEARNING',
          attemptCount: 0,
          correctCount: 0,
          incorrectCount: 0,
          confidence: 0,
          lastSeen: null,
          nextReview: null,
          createdAt: now,
          updatedAt: now,
        };
        this.words.set(id, newWord);
        this.wordIndex.set(item.word, id);
        insertedCount++;
      }
    }

    return { insertedCount, existingDuplicatesCount };
  }

  getSourceInfo() {
    return {
      source: this.source,
      url: this.configuredUrl,
      lastSync: this.lastSyncTime,
      wordCount: this.words.size,
    };
  }
}

// Global singleton to persist across Next.js reloads and hot serverless lambdas
const globalForSheetDb = globalThis as unknown as {
  sheetDatabase: SheetDatabase | undefined;
};

export const sheetDb = globalForSheetDb.sheetDatabase ?? new SheetDatabase();

globalForSheetDb.sheetDatabase = sheetDb;

export default sheetDb;
