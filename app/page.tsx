import Link from 'next/link';
import {
  Mic,
  Brain,
  Sparkles,
  ArrowRight,
  Volume2,
  CheckCircle,
  BarChart3,
  UploadCloud,
} from 'lucide-react';
import sheetDb from '@/lib/sheet-db';
import ProgressBar from '@/components/ProgressBar';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let totalWords = 0;
  let learnedWords = 0;

  try {
    [totalWords, learnedWords] = await Promise.all([
      sheetDb.countWords(),
      sheetDb.countWords({ where: { status: 'LEARNED' } }),
    ]);
  } catch (err) {
    console.error('[HomePage] Failed to load word counts:', err);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-medium mb-8">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <span>Voice-First Active Recall & AI Semantic Evaluation</span>
      </div>

      {/* Main Title & Subtitle */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          Speak Your Mind. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-fuchsia-400 bg-clip-text text-transparent">
            Master Every Word.
          </span>
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Passive flashcards fade fast. With <span className="text-white font-semibold">LexiVoice</span>,
          you see a word, speak or type its meaning, and receive instant semantic AI feedback with adaptive review scheduling.
        </p>
      </div>

      {/* Progress pill if words exist */}
      {totalWords > 0 && (
        <div className="w-full max-w-md my-8 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
          <ProgressBar
            current={learnedWords}
            total={totalWords}
            label="Library Mastery"
          />
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
        <Link
          href="/learn"
          id="hero-start-learning-btn"
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-600 hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer text-base"
        >
          <Mic className="w-5 h-5 text-indigo-200" />
          <span>Start Learning</span>
          <ArrowRight className="w-5 h-5" />
        </Link>

        <Link
          href="/dashboard"
          id="hero-dashboard-btn"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 transition cursor-pointer text-base"
        >
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <span>View Progress</span>
        </Link>

        <Link
          href="/import"
          id="hero-import-btn"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-semibold text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 transition cursor-pointer text-base"
        >
          <UploadCloud className="w-5 h-5 text-indigo-400" />
          <span>Import CSV/Excel</span>
        </Link>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16 sm:mt-20">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
            <Mic className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white mb-1.5">Voice-Enabled Recall</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Speak your answers using the browser Web Speech API. Review and fine-tune your transcript before submission.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mb-4">
            <Brain className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white mb-1.5">Semantic AI Evaluator</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Understands true concept grasp and synonyms. Doesn&apos;t penalize you for not memorizing dictionary wording word-for-word.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
            <CheckCircle className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white mb-1.5">Adaptive Spaced Reviews</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Words adapt dynamically based on Easy, Medium, or Hard difficulty and your confidence history until fully mastered.
          </p>
        </div>
      </div>
    </div>
  );
}
