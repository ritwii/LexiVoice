'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet';
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
}: StatsCardProps) {
  const colorSchemes = {
    indigo: {
      bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
      badge: 'text-indigo-300',
    },
    emerald: {
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      badge: 'text-emerald-300',
    },
    amber: {
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      badge: 'text-amber-300',
    },
    rose: {
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      badge: 'text-rose-300',
    },
    violet: {
      bg: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
      badge: 'text-violet-300',
    },
  };

  const scheme = colorSchemes[color] || colorSchemes.indigo;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md shadow-sm hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${scheme.bg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
