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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as WindowWithSpeech;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // We want to stop and get final results quickly
    recognition.interimResults = true; // Enable interim results for realtime feedback
    recognition.lang = 'vi-VN';

    recognition.onstart = () => setIsRecognizing(true);
    recognition.onend = () => setIsRecognizing(false);
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => console.error('Speech recognition error:', e.error);

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
      }

      if (interimTranscript.trim().length > 0 && onInterimTranscript) {
        onInterimTranscript(interimTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
  }, [onFinalTranscript, onInterimTranscript]);

  const startRecognition = useCallback(() => {
    try {
      if (!isRecognizing && recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (e) {
      console.error(e);
    }
  }, [isRecognizing]);

  const stopRecognition = useCallback(() => {
    try {
      if (isRecognizing && recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (e) {
      console.error(e);
    }
  }, [isRecognizing]);

  return { startRecognition, stopRecognition, isRecognizing };
}
