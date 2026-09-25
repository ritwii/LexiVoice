'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle, Radio } from 'lucide-react';
import { isSpeechRecognitionSupported, createSpeechRecognition } from '@/lib/speech';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onTranscript, disabled = false }: VoiceRecorderProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const supported = isSpeechRecognitionSupported();
    setIsSupported(supported);

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startListening = () => {
    setErrorMessage(null);
    if (!isSupported) {
      setErrorMessage("Voice input isn't supported in this browser. Please type your answer instead.");
      return;
    }

    try {
      const recognition = createSpeechRecognition();
      if (!recognition) {
        setErrorMessage("Voice input couldn't be initialized.");
        return;
      }

      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript.trim()) {
          onTranscript(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions.');
        } else if (event.error === 'no-speech') {
          setErrorMessage('No speech was detected. Please try speaking again.');
        } else {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setErrorMessage(err.message || 'Failed to start microphone recording.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          id="voice-recorder-btn"
          onClick={toggleListening}
          disabled={disabled}
          title={isListening ? 'Stop recording' : 'Click to speak your answer'}
          className={`relative group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isListening
              ? 'bg-rose-600 text-white ring-4 ring-rose-500/30 shadow-rose-600/40 animate-pulse'
              : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600 hover:text-white hover:border-transparent shadow-indigo-500/10'
          }`}
        >
          {isListening ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <MicOff className="w-4 h-4 text-white" />
              <span>Recording... (Click to Stop)</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" />
              <span>🎙 Speak your answer</span>
            </>
          )}
        </button>

        {isListening && (
          <div className="flex items-center gap-1 h-6 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <div className="flex items-end gap-1 h-4">
              <span className="w-1 bg-rose-500 rounded-full animate-wave-1" />
              <span className="w-1 bg-rose-400 rounded-full animate-wave-2" />
              <span className="w-1 bg-rose-500 rounded-full animate-wave-3" />
              <span className="w-1 bg-rose-400 rounded-full animate-wave-4" />
            </div>
            <span className="text-xs text-rose-400 ml-1 font-mono">Listening</span>
          </div>
        )}
      </div>

      {!isSupported && (
        <div
          id="speech-unsupported-warning"
          className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-center"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Voice input isn&apos;t supported in this browser. Please type your answer instead.</span>
        </div>
      )}

      {errorMessage && isSupported && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg text-center">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
