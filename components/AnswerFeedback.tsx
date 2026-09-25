'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  BookOpen,
} from 'lucide-react';
import { speakText, stopSpeech } from '@/lib/speech';

interface AnswerFeedbackProps {
  word: string;
  definition: string;
  exampleSentence?: string | null;
  userAnswer: string;
  correct: boolean;
  score: number;
  feedback: string;
  missingConcepts?: string[];
  nextReview?: string | null;
  onNextWord: () => void;
}

export default function AnswerFeedback({
  word,
  definition,
  exampleSentence,
  userAnswer,
  correct,
  score,
  feedback,
  missingConcepts = [],
  nextReview,
  onNextWord,
}: AnswerFeedbackProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const scorePercent = Math.round(score * 100);
  const isPartial = !correct && score >= 0.4;

  const handleListenFeedback = () => {
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      return;
    }

    const narration = `${correct ? 'Correct!' : isPartial ? 'Partially correct.' : 'Not quite.'} ${feedback} The word "${word}" means: ${definition}`;
    setIsPlayingAudio(true);
    speakText(narration, {
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false),
    });
  };

  const formatReviewDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.round((date.getTime() - now.getTime()) / (60 * 1000));

    if (diffMin <= 0) return 'Due immediately';
    if (diffMin < 60) return `Due in ${diffMin} minutes`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `Due in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    const diffDays = Math.round(diffHours / 24);
    return `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <div
      id="evaluation-result-card"
      className={`rounded-2xl border p-6 sm:p-8 backdrop-blur-xl transition-all shadow-2xl ${
        correct
          ? 'bg-slate-900/90 border-emerald-500/40 glow-emerald'
          : isPartial
          ? 'bg-slate-900/90 border-amber-500/40'
          : 'bg-slate-900/90 border-rose-500/40 glow-rose'
      }`}
    >
      {/* Header Result Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              correct
                ? 'bg-emerald-500/20 text-emerald-400'
                : isPartial
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {correct ? (
              <CheckCircle2 className="w-7 h-7" />
            ) : isPartial ? (
              <AlertTriangle className="w-7 h-7" />
            ) : (
              <XCircle className="w-7 h-7" />
            )}
          </div>
          <div>
            <h3
              className={`text-xl font-bold tracking-tight ${
                correct
                  ? 'text-emerald-400'
                  : isPartial
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {correct
                ? '✓ CORRECT'
                : isPartial
                ? '⚠ PARTIALLY UNDERSTOOD'
                : '✗ NEEDS PRACTICE'}
            </h3>
            <p className="text-xs text-slate-400">
              Evaluated semantic understanding • {scorePercent}% Match
            </p>
          </div>
        </div>

        {/* Action button to speak feedback */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="feedback-audio-btn"
            onClick={handleListenFeedback}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 cursor-pointer"
          >
            {isPlayingAudio ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span>Stop Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>🔊 Listen to Feedback</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Details Sections */}
      <div className="space-y-5 my-6 text-sm">
        {/* Your Answer */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Your Explanation
          </span>
          <p className="text-slate-200 italic font-serif text-base">
            &ldquo;{userAnswer}&rdquo;
          </p>
        </div>

        {/* Meaning */}
        <div className="bg-indigo-950/20 rounded-xl p-4 border border-indigo-900/30">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            Reference Meaning of &quot;{word}&quot;
          </span>
          <p className="text-slate-100 font-medium">{definition}</p>
          {exampleSentence && (
            <p className="mt-2 text-xs text-slate-400 border-t border-indigo-900/20 pt-2">
              <span className="font-semibold text-slate-300">Example:</span> &ldquo;{exampleSentence}&rdquo;
            </p>
          )}
        </div>

        {/* AI Feedback */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Coach Feedback
          </span>
          <p className="text-slate-200 leading-relaxed">{feedback}</p>

          {missingConcepts && missingConcepts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <span className="text-xs font-medium text-slate-400">Key ideas to include: </span>
              <div className="inline-flex flex-wrap gap-1.5 mt-1">
                {missingConcepts.map((concept, idx) => (
                  <span
                    key={idx}
                    className="inline-block px-2 py-0.5 rounded-full text-xs bg-slate-800 text-amber-300 border border-amber-500/30"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Review Scheduling Info */}
        {nextReview && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Spaced Repetition:</span>
            <span className="text-indigo-300 font-medium">{formatReviewDate(nextReview)}</span>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          id="next-word-btn"
          onClick={onNextWord}
          autoFocus
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <span>Next Word</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
