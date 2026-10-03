import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LexiVoice | Voice-Enabled AI Vocabulary Learning Coach',
  description:
    'Master high-impact vocabulary through active voice recall, adaptive spaced repetition, and semantic AI evaluation.',
  keywords: ['vocabulary', 'voice learning', 'speech recognition', 'spaced repetition', 'active recall', 'AI coach'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100 selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} LexiVoice • Active Voice Vocabulary Coach</p>
            <p className="flex items-center gap-2">
              <span>TypeScript</span> • <span>Next.js App Router</span> • <span>Google Sheets Database</span> • <span>Web Speech API</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
