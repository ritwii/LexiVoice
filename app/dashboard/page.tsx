'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  ArrowRight,
  Flame,
  ShieldCheck,
  UploadCloud,
  Mic,
  Loader2,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import ProgressBar from '@/components/ProgressBar';
import { DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load dashboard stats:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(data.message || 'Synchronized successfully.');
        await loadStats();
      } else {
        setSyncMessage(data.error || 'Failed to sync.');
      }
    } catch (err: any) {
      setSyncMessage(err.message || 'Sync failed.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Loading learning analytics...</p>
      </div>
    );
  }

  const data: DashboardStats = stats || {
    totalWords: 0,
    learnedWords: 0,
    learningWords: 0,
    reviewWords: 0,
    progressPercentage: 0,
    totalAttempts: 0,
    correctAttempts: 0,
    accuracyPercentage: 0,
    todayReviews: 0,
    difficultyBreakdown: {
      EASY: { total: 0, learned: 0 },
      MEDIUM: { total: 0, learned: 0 },
      HARD: { total: 0, learned: 0 },
    },
    recentAttempts: [],
    sourceInfo: {
      source: 'local-sample',
      url: null,
      lastSync: null,
      wordCount: 0,
    },
  };

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider border border-indigo-500/20">
              <BarChart3 className="w-3.5 h-3.5" />
              Learning Analytics
            </div>

            {data.sourceInfo?.source === 'google-sheets' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Google Sheets Live DB
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Local Sample (Add GOOGLE_SHEET_URL in .env)
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Vocabulary Progress
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time track of your active recall mastery and review schedule
          </p>
          {syncMessage && (
            <p className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-1 mt-2 inline-block">
              {syncMessage}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            id="sync-sheet-btn"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Sync latest words from Google Sheets"
          >
            <Loader2 className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>
          <Link
            href="/learn"
            id="dashboard-practice-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-600/30 transition hover:scale-105"
          >
            <Mic className="w-4 h-4" />
            <span>Practice Now</span>
          </Link>
          <Link
            href="/import"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>Import</span>
          </Link>
        </div>
      </div>

      {/* Progress Bar Card */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Overall Vocabulary Mastery</span>
          <span className="text-emerald-400 font-mono text-base font-bold">
            {data.progressPercentage}%
          </span>
        </h2>
        <ProgressBar
          current={data.learnedWords}
          total={data.totalWords}
          label="Learned Words"
          showNumbers={false}
        />
        <div className="flex justify-between items-center text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/60 font-mono">
          <span>{data.learnedWords} Learned</span>
          <span>{data.learningWords + data.reviewWords} In Active Rotation</span>
          <span>{data.totalWords} Total Library</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard
          title="Total Words"
          value={data.totalWords}
          subtitle={`${data.learningWords} learning, ${data.reviewWords} review`}
          icon={BookOpen}
          color="indigo"
        />

        <StatsCard
          title="Learned"
          value={data.learnedWords}
          subtitle={`${data.progressPercentage}% of total library`}
          icon={CheckCircle2}
          color="emerald"
        />

        <StatsCard
          title="Accuracy"
          value={`${data.accuracyPercentage}%`}
          subtitle={`${data.correctAttempts} / ${data.totalAttempts} total attempts`}
          icon={Target}
          color="amber"
        />

        <StatsCard
          title="Today's Reviews"
          value={data.todayReviews}
          subtitle="Answers submitted today"
          icon={Clock}
          color="violet"
        />
      </div>

      {/* Difficulty Breakdown & Learning Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Easy */}
        <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Easy</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {data.difficultyBreakdown.EASY.total} words
            </span>
          </div>
          <p className="text-3xl font-extrabold text-white mb-2">
            {data.difficultyBreakdown.EASY.total}
          </p>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Mastered:</span>
            <span className="text-emerald-400 font-semibold font-mono">
              {data.difficultyBreakdown.EASY.learned} / {data.difficultyBreakdown.EASY.total}
            </span>
          </div>
        </div>

        {/* Medium */}
        <div className="rounded-2xl border border-amber-500/20 bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Medium</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {data.difficultyBreakdown.MEDIUM.total} words
            </span>
          </div>
          <p className="text-3xl font-extrabold text-white mb-2">
            {data.difficultyBreakdown.MEDIUM.total}
          </p>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Mastered:</span>
            <span className="text-amber-400 font-semibold font-mono">
              {data.difficultyBreakdown.MEDIUM.learned} / {data.difficultyBreakdown.MEDIUM.total}
            </span>
          </div>
        </div>

        {/* Hard */}
        <div className="rounded-2xl border border-rose-500/20 bg-slate-900/50 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-white text-base">Hard</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {data.difficultyBreakdown.HARD.total} words
            </span>
          </div>
          <p className="text-3xl font-extrabold text-white mb-2">
            {data.difficultyBreakdown.HARD.total}
          </p>
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Mastered:</span>
            <span className="text-rose-400 font-semibold font-mono">
              {data.difficultyBreakdown.HARD.learned} / {data.difficultyBreakdown.HARD.total}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Practice History Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          Recent Answer Attempts
        </h3>

        {data.recentAttempts && data.recentAttempts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                  <th className="py-3 px-3">Word</th>
                  <th className="py-3 px-3">Your Explanation</th>
                  <th className="py-3 px-3">Evaluation</th>
                  <th className="py-3 px-3">Score</th>
                  <th className="py-3 px-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.recentAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-white uppercase tracking-wide">
                      {attempt.word}
                    </td>
                    <td className="py-3 px-3 italic text-slate-300 max-w-xs truncate font-serif">
                      &ldquo;{attempt.userAnswer}&rdquo;
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          attempt.correct
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {attempt.correct ? '✓ Correct' : '✗ Needs Practice'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold">
                      {Math.round(attempt.score * 100)}%
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(attempt.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">
            <p>No practice attempts recorded yet.</p>
            <Link
              href="/learn"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              <span>Start your first active recall session</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
