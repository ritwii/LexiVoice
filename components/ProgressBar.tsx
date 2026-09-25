'use client';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showNumbers?: boolean;
}

export default function ProgressBar({
  current,
  total,
  label = 'Mastery Progress',
  showNumbers = true,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="w-full">
      {showNumbers && (
        <div className="flex justify-between items-center text-xs font-medium mb-1.5 text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            {label}
          </span>
          <span className="font-mono text-slate-400">
            <span className="text-emerald-400 font-semibold">{current}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span>{total} words</span>
            <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
              {percentage}%
            </span>
          </span>
        </div>
      )}
      <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-700 ease-out shadow-sm"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
