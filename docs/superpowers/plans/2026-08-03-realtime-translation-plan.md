# Realtime Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a low-latency Web Speech API and WebSocket-based VAD streaming translation pipeline.

**Architecture:** The frontend runs `@ricky0123/vad-web` to detect speech, uses Web Speech API to get transcripts, and streams to a backend WebSocket where CTranslate2 provides real-time bilingual translation back to the UI.

**Tech Stack:** React (Next.js), `@ricky0123/vad-web`, Web Speech API, WebSocket, Python, FastAPI, CTranslate2.

## Global Constraints

- Node >= 20
- Follow Next.js App Router conventions for components
- Do not use TBD or placeholders in any files

---

### Task 1: Setup Dependencies & WebSocket Hook

**Files:**

- Modify: `src/frontend/package.json`
- Create: `src/frontend/src/hooks/useTranslationSocket.ts`

**Interfaces:**

- Consumes: Backend WebSocket on `ws://localhost:8765`
- Produces: `useTranslationSocket()` hook returning `{ connect, disconnect, sendText, streamData, isConnected }`

- [ ] **Step 1: Install VAD dependency**

```bash
npm install @ricky0123/vad-web
```

- [ ] **Step 2: Create WebSocket Hook**

```typescript
// src/frontend/src/hooks/useTranslationSocket.ts
import { useState, useEffect, useRef, useCallback } from 'react';

export interface TranslationStream {
  type: string;
  id: string;
  original_text: string;
  vi_text: string;
  en_text: string;
  is_final: boolean;
}

export function useTranslationSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [streamData, setStreamData] = useState<TranslationStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // In Docker, we connect to localhost:8765 if exposed, or through proxy
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = (e) => console.error('WebSocket error:', e);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'bilingual_translation_stream' || data.type === 'bilingual_translation') {
          setStreamData(data);
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const sendText = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'translate', text }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connect, disconnect, sendText, streamData, isConnected };
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/frontend/src/hooks/useTranslationSocket.ts
git commit -m "feat: add translation websocket hook and vad dep"
```

### Task 2: Create Web Speech API Hook

**Files:**

- Create: `src/frontend/src/hooks/useWebSpeech.ts`

**Interfaces:**

- Consumes: Browser `window.webkitSpeechRecognition`
- Produces: `useWebSpeech()` returning `{ startRecognition, stopRecognition, isRecognizing, finalTranscript }`

- [ ] **Step 1: Write Web Speech Hook**

```typescript
// src/frontend/src/hooks/useWebSpeech.ts
import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSpeech(onFinalTranscript: (text: string) => void) {
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
    recognition.interimResults = true; // True if we want to show interim, but for now we only need final
    recognition.lang = 'vi-VN';

    recognition.onstart = () => setIsRecognizing(true);
    recognition.onend = () => setIsRecognizing(false);
    recognition.onerror = (e: any) => console.error('Speech recognition error:', e.error);

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript.trim().length > 0) {
        onFinalTranscript(finalTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
  }, [onFinalTranscript]);

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
```

- [ ] **Step 2: Commit**

```bash
git add src/frontend/src/hooks/useWebSpeech.ts
git commit -m "feat: add web speech hook"
```

### Task 3: Combine VAD and Speech in Controller

**Files:**

- Create: `src/frontend/src/hooks/useVADController.ts`

**Interfaces:**

- Consumes: `useWebSpeech`, `useTranslationSocket`, `@ricky0123/vad-web`
- Produces: `useVADController()` hook

- [ ] **Step 1: Write VAD Controller Hook**

```typescript
// src/frontend/src/hooks/useVADController.ts
import { useState, useCallback } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';
import { useWebSpeech } from './useWebSpeech';
import { useTranslationSocket } from './useTranslationSocket';

export function useVADController() {
  const [vadState, setVadState] = useState<string>('idle');
  const { sendText, streamData, isConnected } = useTranslationSocket();

  const onFinalTranscript = useCallback(
    (text: string) => {
      if (text) {
        sendText(text);
      }
    },
    [sendText]
  );

  const { startRecognition, stopRecognition } = useWebSpeech(onFinalTranscript);

  const vad = useMicVAD({
    startOnLoad: false,
    onSpeechStart: () => {
      setVadState('speaking');
      startRecognition();
    },
    onSpeechEnd: (audio) => {
      setVadState('processing');
      stopRecognition();
      setTimeout(() => setVadState('idle'), 500);
    },
    onVADMisfire: () => {
      setVadState('idle');
      stopRecognition();
    },
    workletURL: '/vad/vad.worklet.bundle.min.js', // Will use CDN if not provided, but it's safe to omit for defaults
  });

  const toggleVAD = useCallback(() => {
    if (vad.listening) {
      vad.pause();
    } else {
      vad.start();
    }
  }, [vad]);

  return {
    vadState,
    isListening: vad.listening,
    toggleVAD,
    streamData,
    isConnected,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/frontend/src/hooks/useVADController.ts
git commit -m "feat: add vad controller integrating speech and socket"
```

### Task 4: UI Component Integration

**Files:**

- Create: `src/frontend/src/components/meetings/LiveSubtitle.tsx`

**Interfaces:**

- Consumes: `useVADController`

- [ ] **Step 1: Create UI Component**

```typescript
// src/frontend/src/components/meetings/LiveSubtitle.tsx
'use client';

import React from 'react';
import { useVADController } from '@/hooks/useVADController';

export function LiveSubtitle() {
  const { isListening, toggleVAD, vadState, streamData, isConnected } = useVADController();

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full max-w-3xl z-50 px-4">

      {/* Subtitle Display */}
      {streamData && (
        <div className="bg-black/70 backdrop-blur-md text-white p-4 rounded-xl w-full text-center shadow-lg transition-all">
          <p className="text-sm text-gray-300 mb-1 font-medium">{streamData.vi_text}</p>
          <p className="text-xl font-bold">{streamData.en_text || "..."}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-full shadow border border-gray-200 dark:border-gray-700">
        <button
          onClick={toggleVAD}
          className={`w-12 h-12 flex items-center justify-center rounded-full text-white transition-colors ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          {isListening ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5 3a3 3 0 0 0-6 0v5a3 3 0 0 0 6 0V3z"/>
              <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
              <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/>
            </svg>
          )}
        </button>
        <div className="flex flex-col text-sm px-2">
          <span className="font-semibold dark:text-white">
            {isListening ? 'Microphone Active' : 'Microphone Off'}
          </span>
          <span className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            {isConnected ? 'Backend Connected' : 'Backend Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/frontend/src/components/meetings/LiveSubtitle.tsx
git commit -m "feat: add live subtitle component"
```
