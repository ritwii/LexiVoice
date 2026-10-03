'use client';

import { useState } from 'react';
import { Difficulty, VocabularyWord } from '@/lib/types';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  Check,
  Send,
  Loader2,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import DifficultySelector from './DifficultySelector';
import VoiceRecorder from './VoiceRecorder';
import AnswerFeedback from './AnswerFeedback';
import { speakText, stopSpeech } from '@/lib/speech';

interface VocabularyCardProps {
  word: VocabularyWord;
  totalWords: number;
  learnedWords: number;
  onNextWord: () => void;
  onMarkLearned: (wordId: number) => Promise<void>;
}

export default function VocabularyCard({
  word,
  totalWords,
  learnedWords,
  onNextWord,
  onMarkLearned,
}: VocabularyCardProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>(word.difficulty);
  const [userAnswer, setUserAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlayingWordAudio, setIsPlayingWordAudio] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isMarkingLearned, setIsMarkingLearned] = useState(false);
  const [justMarkedLearned, setJustMarkedLearned] = useState<string | null>(null);

  // Evaluation outcome state
  const [evaluation, setEvaluation] = useState<{
    correct: boolean;
    score: number;
    feedback: string;
    missingConcepts: string[];
    nextReview?: string | null;
  } | null>(null);

  const handleListenWord = () => {
    if (isPlayingWordAudio) {
      stopSpeech();
      setIsPlayingWordAudio(false);
      return;
    }

    setIsPlayingWordAudio(true);
    speakText(`Your word is ${word.word}. What does ${word.word} mean?`, {
      onEnd: () => setIsPlayingWordAudio(false),
      onError: () => setIsPlayingWordAudio(false),
    });
  };

  const handleVoiceTranscript = (text: string) => {
    setUserAnswer((prev) => {
      if (!prev.trim()) return text;
      return `${prev} ${text}`.trim();
    });
    setValidationError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    const trimmed = userAnswer.trim();
    if (!trimmed) {
      setValidationError('Please provide an explanation before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/words/${word.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer: trimmed,
          difficulty,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to evaluate answer.');
      }

      setEvaluation({
        correct: data.correct,
        score: data.score,
        feedback: data.feedback,
        missingConcepts: data.missingConcepts || [],
        nextReview: data.nextReview,
      });
    } catch (err: any) {
      setValidationError(err.message || 'We could not evaluate your answer right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsLearnedClick = async () => {
    try {
      setIsMarkingLearned(true);

      // Trigger celebratory confetti burst
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#6366f1', '#a855f7', '#f59e0b'],
        });
      } catch {
        // ignore if canvas not supported
      }

      await onMarkLearned(word.id);
      setJustMarkedLearned(word.word);

      // Transition to next word after brief celebration
      setTimeout(() => {
        setJustMarkedLearned(null);
        onNextWord();
      }, 1400);
    } catch (err) {
      console.error('Failed to mark as learned:', err);
    } finally {
      setIsMarkingLearned(false);
    }
  };

  if (justMarkedLearned) {
    return (
      <div className="rounded-3xl border border-emerald-500/50 bg-slate-900/90 p-10 text-center shadow-2xl backdrop-blur-xl glow-emerald animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 animate-bounce" />
        </div>
        <h2 className="text-3xl font-extrabold text-emerald-400 mb-2">🎉 Great!</h2>
        <p className="text-xl text-slate-200">
          &ldquo;<span className="font-bold text-white capitalize">{justMarkedLearned}</span>&rdquo; has been marked as learned.
        </p>
        <p className="text-xs text-slate-400 mt-3">Loading your next vocabulary word...</p>
      </div>
    );
  }

  // If already evaluated, show the result feedback view
  if (evaluation) {
    return (
      <AnswerFeedback
        word={word.word}
        definition={word.definition}
        exampleSentence={word.exampleSentence}
        userAnswer={userAnswer}
        correct={evaluation.correct}
        score={evaluation.score}
        feedback={evaluation.feedback}
        missingConcepts={evaluation.missingConcepts}
        nextReview={evaluation.nextReview}
        onNextWord={() => {
          setEvaluation(null);
          setUserAnswer('');
          onNextWord();
        }}
      />
    );
  }

  return (
    <div
      id="vocabulary-card-container"
      className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 sm:p-10 shadow-2xl backdrop-blur-xl transition-all"
    >
      {/* Top action row */}
      <div className="flex items-center justify-between gap-3 pb-6 border-b border-slate-800/80">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
          Active Recall Practice
        </span>

        <button
          type="button"
          id="mark-learned-btn"
          onClick={handleMarkAsLearnedClick}
          disabled={isMarkingLearned}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
        >
          {isMarkingLearned ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>✓ Mark as Learned</span>
        </button>
      </div>

      {/* Target Word Section */}
      <div className="text-center py-6 sm:py-8">
        <div className="inline-block relative">
          <h1
            id="target-vocabulary-word"
            className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-wider bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent drop-shadow-sm"
          >
            {word.word}
          </h1>
        </div>

        {/* Listen Pronunciation Button */}
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            id="listen-word-btn"
            onClick={handleListenWord}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-slate-800/80 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            {isPlayingWordAudio ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span>Stop Audio</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>🔊 Listen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="my-6">
        <DifficultySelector
          difficulty={difficulty}
          onChange={setDifficulty}
          disabled={isSubmitting}
        />
      </div>

      {/* Question Prompt & Input */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="answer-textarea"
            className="block text-sm font-semibold text-slate-200 mb-2 flex items-center justify-between"
          >
            <span>What does this word mean?</span>
            <span className="text-xs text-slate-400 font-normal">
              Explain in your own words (voice or text)
            </span>
          </label>

          <div className="relative">
            <textarea
              id="answer-textarea"
              rows={4}
              value={userAnswer}
              onChange={(e) => {
                setUserAnswer(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Type your explanation or click the microphone to speak..."
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-950/70 border border-slate-700/80 p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm leading-relaxed resize-none font-sans"
            />
            {userAnswer && (
              <button
                type="button"
                onClick={() => setUserAnswer('')}
                className="absolute top-3 right-3 text-xs text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Validation or Error Message */}
        {validationError && (
          <div
            id="validation-error-message"
            className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
          >
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Voice Input Section */}
        <div className="py-2 flex flex-col items-center justify-center">
          <VoiceRecorder
            onTranscript={handleVoiceTranscript}
            disabled={isSubmitting}
          />
        </div>

        {/* Submission Button */}
        <div className="pt-2">
          <button
            type="submit"
            id="submit-answer-btn"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Evaluating Your Explanation...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Answer</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
