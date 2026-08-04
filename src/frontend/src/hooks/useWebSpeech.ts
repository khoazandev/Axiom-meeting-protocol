import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSpeech(
  onFinalTranscript: (text: string) => void,
  onInterimTranscript?: (text: string) => void
) {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
    recognition.onerror = (e: any) => console.error('Speech recognition error:', e.error);

    recognition.onresult = (event: any) => {
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
