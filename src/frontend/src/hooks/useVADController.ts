import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslationSocket, type TranscriptHistoryEntry } from './useTranslationSocket';
import { useLocalParticipant } from '@livekit/components-react';

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
}

type WindowWithSpeech = Window & {
  SpeechRecognition?: new () => ISpeechRecognition;
  webkitSpeechRecognition?: new () => ISpeechRecognition;
};

export function useWebSpeech(
  onFinalTranscript: (text: string) => void,
  onInterimTranscript?: (text: string) => void
) {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const currentInterimRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as WindowWithSpeech;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'vi-VN';

    recognition.onstart = () => setIsRecognizing(true);

    recognition.onend = () => {
      setIsRecognizing(false);
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          // Ignore restart error
        }
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is expected when mic is on but user isn't talking — not a real error
      if (e.error === 'no-speech' || e.error === 'aborted') {
        return;
      }
      console.warn('[STT] Speech recognition:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        shouldListenRef.current = false;
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript.trim().length > 0) {
        onFinalTranscript(finalTranscript.trim());
        currentInterimRef.current = '';
      }

      if (interimTranscript.trim().length > 0) {
        currentInterimRef.current = interimTranscript.trim();
        if (onInterimTranscript) {
          onInterimTranscript(interimTranscript.trim());
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onFinalTranscript, onInterimTranscript]);

  const startRecognition = useCallback(() => {
    shouldListenRef.current = true;
    try {
      recognitionRef.current?.start();
    } catch {
      // Silently ignore 'already started' InvalidStateError
    }
  }, []);

  const stopRecognition = useCallback(() => {
    shouldListenRef.current = false;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  return { startRecognition, stopRecognition, isRecognizing };
}

// Helper to clean real-time text before backend processing
function cleanInterimText(text: string): string {
  let cleaned = text;

  // Remove filler words
  const fillers = [
    /\bừm\b/gi,
    /\bà\b/gi,
    /\buhm\b/gi,
    /\buh\b/gi,
    /\bum\b/gi,
    /\ber\b/gi,
    /\bah\b/gi,
    /\bừ\b/gi,
    /\bloại như\b/gi,
    /\bkiểu như\b/gi,
    /\bdạng như\b/gi,
    /\bthì là\b/gi,
    /\bnói chung là\b/gi,
  ];
  fillers.forEach((f) => {
    cleaned = cleaned.replace(f, '');
  });

  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Capitalize tech terms & common proper names
  const techTerms = {
    axiom: 'Axiom',
    livekit: 'LiveKit',
    ai: 'AI',
    api: 'API',
    websocket: 'WebSocket',
    nextjs: 'Next.js',
    react: 'React',
    fastapi: 'FastAPI',
  };
  Object.entries(techTerms).forEach(([key, val]) => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    cleaned = cleaned.replace(regex, val);
  });

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Append temporary punctuation if it looks like a sentence
  if (cleaned.length > 10 && !cleaned.endsWith('.')) {
    cleaned += '...';
  }

  return cleaned;
}

export function useVADController(
  speakerName = 'Thành viên',
  onFinalized?: (entry: TranscriptHistoryEntry) => void
) {
  const [interimText, setInterimText] = useState<string>('');
  const { connect, disconnect, sendText, streamData, isConnected, transcriptHistory } =
    useTranslationSocket(speakerName, onFinalized);
  const { isMicrophoneEnabled } = useLocalParticipant();

  const onFinalTranscript = useCallback(
    (text: string) => {
      if (text) {
        setInterimText('');
        // Send raw to backend, let backend do the heavy NLP cleaning
        sendText(text);
      }
    },
    [sendText]
  );

  const onInterimTranscript = useCallback((text: string) => {
    if (text) {
      // Clean locally for immediate UI feedback
      setInterimText(cleanInterimText(text));
    }
  }, []);

  const { startRecognition, stopRecognition, isRecognizing } = useWebSpeech(
    onFinalTranscript,
    onInterimTranscript
  );

  useEffect(() => {
    let disconnectTimeout: NodeJS.Timeout;

    if (isMicrophoneEnabled) {
      connect();
      startRecognition();
    } else {
      stopRecognition();
      // Delay disconnect by 3 seconds to allow pending sentences to finish translating
      disconnectTimeout = setTimeout(() => {
        disconnect();
      }, 3000);
    }

    return () => {
      if (disconnectTimeout) clearTimeout(disconnectTimeout);
    };
  }, [isMicrophoneEnabled, startRecognition, stopRecognition, connect, disconnect]);

  return {
    isListening: isRecognizing,
    streamData,
    interimText,
    isConnected,
    transcriptHistory,
  };
}
