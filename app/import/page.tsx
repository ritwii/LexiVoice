'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UploadCloud, ArrowRight, Mic, Sparkles } from 'lucide-react';
import ImportVocabulary from '@/components/ImportVocabulary';

export default function ImportPage() {
  const [hasImported, setHasImported] = useState(false);

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2 border border-indigo-500/20">
            <UploadCloud className="w-3.5 h-3.5" />
            Dataset Management
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Import Vocabulary
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Expand your learning library with spreadsheets or load our curated collection
          </p>
        </div>

        {hasImported && (
          <Link
            href="/learn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/30 transition animate-bounce"
          >
            <Mic className="w-4 h-4" />
            <span>Practice New Words</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Main Import Component */}
      <ImportVocabulary onImportSuccess={() => setHasImported(true)} />
    </div>
  );
}
