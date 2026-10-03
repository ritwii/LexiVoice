'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, BookOpen } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js caught runtime error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/10">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
        Something unexpected occurred
      </h1>

      <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
        {error.message || 'An error occurred while loading this page. You can try refreshing or navigate back to the home page.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          id="error-try-again-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/20 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          id="error-home-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 transition cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </Link>

        <Link
          href="/learn"
          id="error-learn-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 transition cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span>Go to Practice</span>
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 text-xs font-mono text-slate-600">
          Error Digest: {error.digest}
        </p>
      )}
    </div>
  );
}
