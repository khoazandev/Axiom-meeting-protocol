import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type WindowWithSpeech = Window & {
  SpeechRecognition?: new () => ISpeechRecognition;
  webkitSpeechRecognition?: new () => ISpeechRecognition;
};

export interface UseWebSpeechOptions {
  enabled?: boolean;
  lang?: string;
  onFinalTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
}

export function useWebSpeech(
  optionsOrOnFinal: UseWebSpeechOptions | ((text: string) => void),
  legacyOnInterim?: (text: string) => void
) {
  // Support both legacy signature and options object
  const options: UseWebSpeechOptions =
    typeof optionsOrOnFinal === 'function'
      ? {
          onFinalTranscript: optionsOrOnFinal,
          onInterimTranscript: legacyOnInterim,
          enabled: false,
          lang: 'vi-VN',
        }
      : optionsOrOnFinal;

  const {
    enabled = false,
    lang = 'vi-VN',
    onFinalTranscript,
    onInterimTranscript,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const enabledRef = useRef(enabled);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestInterimRef = useRef<string>('');
  const lastFinalRef = useRef<string>('');
  const lastFinalTimeRef = useRef<number>(0);
  const callbacksRef = useRef({ onFinalTranscript, onInterimTranscript });

  useEffect(() => {
    callbacksRef.current = { onFinalTranscript, onInterimTranscript };
  }, [onFinalTranscript, onInterimTranscript]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const commitFinal = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;

    const now = Date.now();
    if (clean === lastFinalRef.current && now - lastFinalTimeRef.current < 1500) {
      return;
    }
    lastFinalRef.current = clean;
    lastFinalTimeRef.current = now;
    latestInterimRef.current = '';

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    callbacksRef.current.onFinalTranscript?.(clean);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const win = window as WindowWithSpeech;
    const SpeechRecognitionClass =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if user still has mic enabled (continuous loop)
      if (enabledRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              // Already running or starting
            }
          }
        }, 100);
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      // Benign errors in continuous speech recognition
      if (e.error === 'no-speech' || e.error === 'aborted') {
        return;
      }
      console.warn('[WebSpeech] Recognition notice:', e.error);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let finalized = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0]?.transcript || '';
        if (result.isFinal) {
          finalized += text;
        } else {
          interim += text;
        }
      }

      const cleanInterim = interim.trim();
      const cleanFinal = finalized.trim();

      if (cleanFinal) {
        commitFinal(cleanFinal);
      }

      if (cleanInterim) {
        latestInterimRef.current = cleanInterim;
        callbacksRef.current.onInterimTranscript?.(cleanInterim);

        // Adaptive Silence Finalizer:
        // Automatically commit after 750ms of natural pause instead of waiting 3s for Chrome
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          if (latestInterimRef.current) {
            const pending = latestInterimRef.current;
            commitFinal(pending);
            if (recognitionRef.current && enabledRef.current) {
              try {
                recognitionRef.current.abort();
              } catch (e) {}
            }
          }
        }, 750);
      }
    };

    recognitionRef.current = recognition;

    if (enabledRef.current) {
      try {
        recognition.start();
      } catch (e) {
        // Recognition may already be running or initializing
      }
    }

    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        recognition.onend = null;
        recognition.stop();
      } catch (e) {}
    };
  }, [lang, commitFinal]);

  // Sync with enabled prop
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (enabled) {
      try {
        recognition.start();
      } catch (e) {
        // Recognition may already be running
      }
    } else {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      try {
        recognition.stop();
      } catch (e) {}
    }
  }, [enabled]);

  const startRecognition = useCallback(() => {
    enabledRef.current = true;
    try {
      recognitionRef.current?.start();
    } catch (e) {}
  }, []);

  const stopRecognition = useCallback(() => {
    enabledRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try {
      recognitionRef.current?.stop();
    } catch (e) {}
  }, []);

  return {
    isListening,
    isSupported,
    startRecognition,
    stopRecognition,
  };
}
