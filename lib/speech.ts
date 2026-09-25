// Speech utility functions for Web Speech API (STT & TTS)

// Augment window object for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

/**
 * Checks if browser supports SpeechRecognition
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Checks if browser supports SpeechSynthesis (TTS)
 */
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Speaks a given text using window.speechSynthesis
 */
export function speakText(
  text: string,
  options: {
    rate?: number;
    pitch?: number;
    lang?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  } = {}
): SpeechSynthesisUtterance | null {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis is not supported in this browser.');
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 0.95;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.lang = options.lang ?? 'en-US';

  if (options.onStart) utterance.onstart = options.onStart;
  if (options.onEnd) utterance.onend = options.onEnd;
  if (options.onError) utterance.onerror = options.onError;

  // Attempt to select a natural English voice if available
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(
    (v) => (v.lang.startsWith('en') || v.lang === 'en-US') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Premium'))
  ) || voices.find((v) => v.lang.startsWith('en'));

  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Stops any active speech synthesis
 */
export function stopSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Factory for SpeechRecognition instance
 */
export function createSpeechRecognition(): any | null {
  if (!isSpeechRecognitionSupported()) return null;
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognitionClass();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  return recognition;
}
