'use client';

import { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ImportSummaryData {
  total: number;
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  errors: string[];
}

export default function ImportVocabulary({
  onImportSuccess,
}: {
  onImportSuccess?: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummaryData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setErrorMessage('Please upload a valid CSV, XLSX, or XLS spreadsheet.');
      setSelectedFile(null);
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSummary(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import vocabulary file.');
      }

      setSummary(data.summary);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onImportSuccess) onImportSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while uploading.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadSampleData = async () => {
    setIsUploading(true);
    setErrorMessage(null);
    setSummary(null);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useSample: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load sample dataset.');
      }

      setSummary(data.summary);
      if (onImportSuccess) onImportSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample dataset.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Upload Drop Zone Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-400" />
              Upload Vocabulary File
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Import vocabulary lists directly via CSV, XLSX, or XLS formats
            </p>
          </div>

          <button
            type="button"
            id="load-sample-btn"
            onClick={handleLoadSampleData}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-200 bg-indigo-600/20 hover:bg-indigo-600 hover:text-white border border-indigo-500/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Dataset (30 Words)</span>
          </button>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="vocabulary-file-input"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                validateAndSetFile(e.target.files[0]);
              }
            }}
          />

          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20 shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          {selectedFile ? (
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Selected file:</p>
              <p className="text-base text-indigo-300 font-mono mt-1 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 inline-block">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
              <p className="text-xs text-slate-400 mt-2">Click to select another file</p>
            </div>
          ) : (
            <div>
              <p className="text-base font-semibold text-slate-200">
                Drag and drop your file here, or{' '}
                <span className="text-indigo-400 underline underline-offset-4">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Supported formats: <span className="font-mono text-slate-300">.csv, .xlsx, .xls</span>
              </p>
            </div>
          )}
        </div>

        {/* Selected file actions */}
        {selectedFile && (
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              id="upload-file-btn"
              onClick={handleUploadSubmit}
              disabled={isUploading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-md shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing File...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Import Records</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div
            id="import-error-banner"
            className="mt-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Import Summary Results */}
      {summary && (
        <div
          id="import-summary-card"
          className="rounded-3xl border border-emerald-500/40 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-xl glow-emerald animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Import Complete</h3>
              <p className="text-xs text-slate-400">Processed {summary.total} rows from upload</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3.5 text-center">
              <span className="text-xs text-slate-400 uppercase font-semibold">Imported</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">✓ {summary.imported}</p>
            </div>
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3.5 text-center">
              <span className="text-xs text-slate-400 uppercase font-semibold">Duplicates Skipped</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">↻ {summary.skippedDuplicates}</p>
            </div>
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3.5 text-center">
              <span className="text-xs text-slate-400 uppercase font-semibold">Invalid Rows Skipped</span>
              <p className="text-2xl font-bold text-rose-400 mt-1">⚠ {summary.skippedInvalid}</p>
            </div>
          </div>

          {summary.errors && summary.errors.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                <span>{summary.errors.length} notification(s) logged</span>
                {showErrorDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showErrorDetails && (
                <ul className="mt-2 space-y-1 text-xs text-slate-400 max-h-40 overflow-y-auto font-mono bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                  {summary.errors.map((err, i) => (
                    <li key={i} className="text-amber-300/90">• {err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reference Format Guide */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 text-xs text-slate-400">
        <h4 className="font-semibold text-slate-300 mb-2">Expected Column Headers:</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-1 px-2">word</th>
                <th className="py-1 px-2">definition</th>
                <th className="py-1 px-2">example_sentence</th>
                <th className="py-1 px-2">difficulty</th>
              </tr>
            </thead>
            <tbody className="text-slate-500">
              <tr>
                <td className="py-1 px-2 text-indigo-300">meticulous</td>
                <td className="py-1 px-2 text-slate-300">Very careful and attentive to detail</td>
                <td className="py-1 px-2 text-slate-400">She was meticulous when checking the report.</td>
                <td className="py-1 px-2 text-amber-300">medium</td>
              </tr>
              <tr>
                <td className="py-1 px-2 text-indigo-300">benevolent</td>
                <td className="py-1 px-2 text-slate-300">Well meaning and kindly</td>
                <td className="py-1 px-2 text-slate-400">The benevolent person helped the poor.</td>
                <td className="py-1 px-2 text-emerald-300">easy</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
