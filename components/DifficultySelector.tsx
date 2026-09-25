'use client';

import { Difficulty } from '@prisma/client';
import { ShieldCheck, Zap, Flame } from 'lucide-react';

interface DifficultySelectorProps {
  difficulty: Difficulty;
  onChange: (diff: Difficulty) => void;
  disabled?: boolean;
}

export default function DifficultySelector({
  difficulty,
  onChange,
  disabled = false,
}: DifficultySelectorProps) {
  const options: Array<{
    level: Difficulty;
    label: string;
    description: string;
    icon: typeof ShieldCheck;
    activeClasses: string;
    inactiveClasses: string;
  }> = [
    {
      level: Difficulty.EASY,
      label: 'Easy',
      description: 'Longer review interval (1-30 days)',
      icon: ShieldCheck,
      activeClasses:
        'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/40',
      inactiveClasses:
        'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-emerald-500/40 hover:text-emerald-300/80',
    },
    {
      level: Difficulty.MEDIUM,
      label: 'Medium',
      description: 'Standard adaptive interval (6h-14 days)',
      icon: Zap,
      activeClasses:
        'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-md shadow-amber-500/20 ring-1 ring-amber-500/40',
      inactiveClasses:
        'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-amber-500/40 hover:text-amber-300/80',
    },
    {
      level: Difficulty.HARD,
      label: 'Hard',
      description: 'Frequent reviews (1h-3 days)',
      icon: Flame,
      activeClasses:
        'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-md shadow-rose-500/20 ring-1 ring-rose-500/40',
      inactiveClasses:
        'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-rose-500/40 hover:text-rose-300/80',
    },
  ];

  return (
    <div className="w-full">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        How difficult is this word for you?
      </label>
      <div className="grid grid-cols-3 gap-2.5">
        {options.map((opt) => {
          const isSelected = difficulty === opt.level;
          const Icon = opt.icon;
          return (
            <button
              key={opt.level}
              type="button"
              id={`difficulty-btn-${opt.level.toLowerCase()}`}
              disabled={disabled}
              onClick={() => onChange(opt.level)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                isSelected ? opt.activeClasses : opt.inactiveClasses
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-sm">
                <Icon className={`w-4 h-4 ${isSelected ? 'animate-bounce' : ''}`} />
                <span>{opt.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
