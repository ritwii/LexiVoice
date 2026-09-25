'use client';

import { useState, useEffect, useCallback } from 'react';
import { VocabularyWord } from '@prisma/client';
import Link from 'next/link';
import {
  Loader2,
  Sparkles,
  Trophy,
  UploadCloud,
  RefreshCw,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import VocabularyCard from '@/components/VocabularyCard';
import ProgressBar from '@/components/ProgressBar';

export default function LearnPage() {
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [lastWordId, setLastWordId] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; learned: number }>({
    total: 0,
    learned: 0,
  });
  const [allLearned, setAllLearned] = useState(false);
  const [isEmptyLibrary, setIsEmptyLibrary] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats({ total: data.totalWords, learned: data.learnedWords });
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  const loadNextWord = useCallback(async (excludeId?: number) => {
    setIsLoading(true);
    setIsEmptyLibrary(false);
    setAllLearned(false);

    try {
      const url = excludeId ? `/api/words/next?excludeId=${excludeId}` : '/api/words/next';
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch next word');
      }

      if (!data.word) {
        // Check if library is completely empty or all are learned
        const statsRes = await fetch('/api/stats');
        const statsData = await statsRes.json();
        setStats({ total: statsData.totalWords, learned: statsData.learnedWords });

        if (statsData.totalWords === 0) {
          setIsEmptyLibrary(true);
        } else if (statsData.learnedWords >= statsData.totalWords) {
          setAllLearned(true);
        } else {
          // Fallback fetch without excludeId
          const retryRes = await fetch('/api/words/next');
          const retryData = await retryRes.json();
          if (retryData.word) {
            setCurrentWord(retryData.word);
            setLastWordId(retryData.word.id);
          } else {
            setAllLearned(true);
          }
        }
        setCurrentWord(null);
      } else {
        setCurrentWord(data.word);
        setLastWordId(data.word.id);
      }
    } catch (err) {
      console.error('Error fetching word:', err);
    } finally {
      setIsLoading(false);
      fetchStats();
    }
  }, []);

  useEffect(() => {
    loadNextWord();
  }, [loadNextWord]);

  const handleMarkLearned = async (wordId: number) => {
    const res = await fetch(`/api/words/${wordId}/learned`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to mark word as learned');
    }
    fetchStats();
  };

  const handleSeedSample = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useSample: true }),
      });
      if (res.ok) {
        await fetchStats();
        loadNextWord();
      }
    } catch (e) {
      console.error('Failed to seed sample words:', e);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col justify-center">
      {/* Top Header & Progress */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Vocabulary Coach
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 font-semibold"
          >
            <span>View detailed analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats.total > 0 && (
          <ProgressBar
            current={stats.learned}
            total={stats.total}
            label={`Learned ${stats.learned} / ${stats.total}`}
          />
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-16 text-center shadow-xl backdrop-blur-md flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-sm font-semibold text-slate-300">Selecting your next vocabulary word...</p>
          <p className="text-xs text-slate-500 mt-1">Applying adaptive repetition prioritization</p>
        </div>
      ) : isEmptyLibrary ? (
        /* Empty Library State */
        <div
          id="empty-library-card"
          className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 sm:p-12 text-center shadow-2xl backdrop-blur-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No Vocabulary Words Yet</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Get started right away by loading our curated dataset of 30 essential words or uploading your own CSV/Excel file.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              id="seed-words-cta-btn"
              onClick={handleSeedSample}
              disabled={isSeeding}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
            >
              {isSeeding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Load 30 Sample Words</span>
            </button>

            <Link
              href="/import"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Custom File</span>
            </Link>
          </div>
        </div>
      ) : allLearned ? (
        /* All Mastered State */
        <div
          id="all-learned-card"
          className="rounded-3xl border border-emerald-500/50 bg-slate-900/90 p-8 sm:p-12 text-center shadow-2xl backdrop-blur-xl glow-emerald"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 animate-bounce" />
          </div>
          <h2 className="text-3xl font-extrabold text-emerald-400 mb-2">All Words Mastered!</h2>
          <p className="text-base text-slate-300 max-w-md mx-auto mb-6">
            Spectacular! You have marked all {stats.total} vocabulary words as <span className="font-semibold text-white">Learned</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30 transition"
            >
              <Trophy className="w-4 h-4" />
              <span>View Dashboard</span>
            </Link>

            <Link
              href="/import"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import More Words</span>
            </Link>
          </div>
        </div>
      ) : currentWord ? (
        /* Active Practice Card */
        <VocabularyCard
          key={currentWord.id}
          word={currentWord}
          totalWords={stats.total}
          learnedWords={stats.learned}
          onNextWord={() => loadNextWord(currentWord.id)}
          onMarkLearned={handleMarkLearned}
        />
      ) : (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <p className="text-slate-400">No words due for review right now.</p>
          <button
            onClick={() => loadNextWord()}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Queue</span>
          </button>
        </div>
      )}
    </div>
  );
}
