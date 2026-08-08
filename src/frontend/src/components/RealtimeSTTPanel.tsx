'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Sparkles, Volume2, Trash2, Zap, Cpu, Radio, Globe } from 'lucide-react';
import { useAuthStore } from '@/lib/store/useAuthStore';

export interface STTPayload {
  id?: string;
  type: string;
  original_text: string;
  polished_text: string;
  detected_lang: string;
  context_summary: string;
  technical_terms: string[];
  en_text: string;
  vi_text: string;
  validation_notes: string;
  whisper_detected_lang?: string;
  timestamp?: string;
  is_final?: boolean;
}

type STTMode = 'browser' | 'whisper';

// Wave Text Effect component for subtle "Processing..." animation
function WaveTextEffect({ text = 'Processing...' }: { text?: string }) {
  return (
    <div className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="inline-block animate-wave-bounce"
          style={{ animationDelay: `${index * 0.08}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </div>
  );
}

// Mode badge component
function ModeBadge({ mode }: { mode: STTMode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
        mode === 'browser'
          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
      }`}
    >
      <Globe className="w-2.5 h-2.5" />
      {mode === 'browser' ? 'Browser STT' : 'Whisper STT'}
    </span>
  );
}

export interface SubtitleData {
  vi: string;
  en: string;
  isStreaming: boolean;
}

interface RealtimeSTTPanelProps {
  isMuted?: boolean;
  onSubtitleUpdate?: (sub: SubtitleData | null) => void;
  onTranscriptUpdate?: (fullTranscriptText: string) => void;
}

export function RealtimeSTTPanel({
  isMuted,
  onSubtitleUpdate,
  onTranscriptUpdate,
}: RealtimeSTTPanelProps = {}) {
  const currentUser = useAuthStore((state) => state.user);
  const speakerName = currentUser?.full_name || 'Thành viên cuộc họp';

  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>(
    'disconnected'
  );
  const [isRecording, setIsRecording] = useState(false);
  const [liveSpeechText, setLiveSpeechText] = useState('');
  const [transcripts, setTranscripts] = useState<STTPayload[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const subtitleClearTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce refs for accumulating isFinal segments
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTextRef = useRef<string>('');
  const isRecordingRef = useRef(false);

  // Keep isRecordingRef in sync
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Sync full accumulated transcript text (with speaker name attribution) to parent component for RAG
  useEffect(() => {
    if (onTranscriptUpdate && transcripts.length > 0) {
      const fullText = transcripts
        .map((t) => {
          const text = t.vi_text || t.polished_text || t.original_text;
          const time = t.timestamp || '';
          return text ? `[${speakerName}${time ? ' — ' + time : ''}]: ${text}` : '';
        })
        .filter(Boolean)
        .reverse()
        .join('\n');
      onTranscriptUpdate(fullText);
    }
  }, [transcripts, onTranscriptUpdate, speakerName]);

  // STT Mode: auto-detected based on backend Whisper availability
  const [sttMode, setSttMode] = useState<STTMode>('browser');
  const sttModeRef = useRef<STTMode>('browser');

  // ══════════════════════════════════════════════════════
  // Recording Controls (Whisper STT Binary Stream)
  // ══════════════════════════════════════════════════════
  const startWhisperSTT = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });
    audioContextRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      const inputData = e.inputBuffer.getChannelData(0);

      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      socketRef.current.send(pcm16.buffer);
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
  };

  const startRecording = useCallback(async () => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    }

    try {
      if (sttModeRef.current === 'whisper') {
        await startWhisperSTT();
      } else {
        startBrowserSTT();
      }
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
    setLiveSpeechText('');
  }, []);

  // Sync with meeting mic mute state (Auto start/stop STT based on mic toggle)
  useEffect(() => {
    if (isMuted !== undefined) {
      if (isMuted) {
        if (isRecordingRef.current) {
          console.log('[Pipeline] Mic MUTED -> Stopping STT recording');
          stopRecording();
        }
      } else {
        if (!isRecordingRef.current) {
          console.log('[Pipeline] Mic UNMUTED -> Auto-starting STT recording');
          startRecording();
        }
      }
    }
  }, [isMuted, startRecording, stopRecording]);

  // Send accumulated text to backend (called after debounce)
  const flushAccumulatedText = useCallback(() => {
    const textToSend = accumulatedTextRef.current.trim();
    accumulatedTextRef.current = '';

    if (!textToSend) return;

    console.log(
      `[Pipeline] Sending debounced text to AI (${textToSend.length} chars):`,
      textToSend
    );
    setLiveSpeechText(textToSend);
    setIsProcessing(true);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'translate',
          text: textToSend,
        })
      );
    } else {
      // Fallback to REST API
      fetch('http://127.0.0.1:8000/api/stt/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.type === 'bilingual_translation') {
            setTranscripts((prev) => [
              { ...data, timestamp: new Date().toLocaleTimeString() },
              ...prev,
            ]);
          }
        })
        .catch((err) => console.error('REST fallback error:', err))
        .finally(() => {
          setIsProcessing(false);
          setLiveSpeechText('');
        });
    }
  }, []);

  // Initialize WebSocket Connection with auto-reconnect
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(2000); // Start at 2s, max 30s

  const connectWebSocket = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

    try {
      setWsStatus('connecting');
      const wsUrl = 'ws://127.0.0.1:8000/ws/realtime-stt';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsStatus('connected');
        reconnectDelayRef.current = 2000; // Reset delay on success
        console.log('[Pipeline] WebSocket Connected:', wsUrl);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === 'bilingual_translation_stream' ||
            data.type === 'bilingual_translation'
          ) {
            const payload: STTPayload = {
              ...data,
              timestamp: data.timestamp || new Date().toLocaleTimeString(),
            };

            // Update transcript cards (upsert by id)
            setTranscripts((prev) => {
              if (payload.id) {
                const existingIdx = prev.findIndex((item) => item.id === payload.id);
                if (existingIdx !== -1) {
                  const updated = [...prev];
                  updated[existingIdx] = payload;
                  return updated;
                }
              }
              return [payload, ...prev];
            });

            // Stream subtitle update on EVERY frame (streaming or final)
            if (onSubtitleUpdate) {
              onSubtitleUpdate({
                vi: payload.vi_text || payload.polished_text || '',
                en: payload.en_text || '',
                isStreaming: payload.is_final === false,
              });
            }

            if (payload.is_final !== false) {
              setIsProcessing(false);
              setLiveSpeechText('');
              // Auto-clear subtitle overlay after 8 seconds
              if (subtitleClearTimerRef.current) clearTimeout(subtitleClearTimerRef.current);
              subtitleClearTimerRef.current = setTimeout(() => {
                if (onSubtitleUpdate) onSubtitleUpdate(null);
              }, 8000);
            } else {
              setIsProcessing(true);
              // Cancel any pending clear while streaming
              if (subtitleClearTimerRef.current) {
                clearTimeout(subtitleClearTimerRef.current);
                subtitleClearTimerRef.current = null;
              }
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket response', e);
          setIsProcessing(false);
        }
      };

      ws.onerror = () => {
        setWsStatus('disconnected');
        setIsProcessing(false);
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        setIsProcessing(false);
        socketRef.current = null;
        // Auto-reconnect with backoff
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 1.5, 30000);
        console.log(`[Pipeline] WebSocket closed, reconnecting in ${delay}ms...`);
        reconnectTimerRef.current = setTimeout(connectWebSocket, delay);
      };

      socketRef.current = ws;
    } catch (e) {
      console.error('Failed to create WebSocket', e);
      setWsStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    connectWebSocket();

    // Auto-detect Whisper availability from backend
    fetch('http://127.0.0.1:8000/api/stt/status')
      .then((res) => res.json())
      .then((data) => {
        // Tạm tắt Whisper, ép dùng Browser STT theo yêu cầu
        const mode: STTMode = 'browser'; // data.whisper_available ? 'whisper' : 'browser';
        setSttMode(mode);
        sttModeRef.current = mode;
        console.log(`[Pipeline] STT mode forced to: ${mode}`, data);
      })
      .catch(() => {
        console.log('[Pipeline] Backend unreachable, defaulting to Browser STT');
        setSttMode('browser');
        sttModeRef.current = 'browser';
      });

    return () => {
      stopRecording();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (subtitleClearTimerRef.current) clearTimeout(subtitleClearTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // ══════════════════════════════════════════════════════
  // MODE A: Browser Web Speech API (text-only path)
  // ══════════════════════════════════════════════════════
  const startBrowserSTT = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'vi-VN';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Show live preview of what user is speaking (interim)
      if (interimTranscript) {
        const liveText =
          accumulatedTextRef.current + (accumulatedTextRef.current ? ' ' : '') + interimTranscript;
        setLiveSpeechText(liveText);
        if (onSubtitleUpdate) {
          onSubtitleUpdate({
            vi: liveText,
            en: '',
            isStreaming: true,
          });
        }
      }

      // Accumulate finalized segments with 500ms debounce
      if (finalTranscript.trim()) {
        accumulatedTextRef.current +=
          (accumulatedTextRef.current ? ' ' : '') + finalTranscript.trim();
        setLiveSpeechText(accumulatedTextRef.current);

        // Hiển thị lập tức final transcript lên Subtitle ngay khi chốt câu
        if (onSubtitleUpdate) {
          onSubtitleUpdate({
            vi: accumulatedTextRef.current,
            en: '',
            isStreaming: true,
          });
        }

        // Reset debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          flushAccumulatedText();
        }, 500);
      }
    };

    recognition.onerror = (err: any) => {
      if (err.error === 'no-speech') return; // Ignore silent periods
      if (err.error === 'not-allowed' || err.error === 'audio-capture') {
        console.error('Speech recognition blocked:', err.error);
        setIsRecording(false);
        return;
      }
      console.warn('SpeechRecognition error:', err.error || err);
    };

    recognition.onend = () => {
      if (isRecordingRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header Bar with WS Status, Mode Badge & Record Button */}
      <div className="flex items-center justify-between bg-card/60 p-3 rounded-lg border border-border/40 backdrop-blur-sm shadow-xs">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              wsStatus === 'connected'
                ? 'bg-emerald-500 animate-pulse'
                : wsStatus === 'connecting'
                  ? 'bg-amber-500 animate-ping'
                  : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {wsStatus === 'connected'
              ? 'Realtime WS Active'
              : wsStatus === 'connecting'
                ? 'Connecting...'
                : 'WS Offline'}
          </span>
          <ModeBadge mode={sttMode} />
        </div>

        <div className="flex items-center gap-2">
          {transcripts.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setTranscripts([])}
              title="Xóa lịch sử"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}

          {isMuted !== undefined ? (
            <div
              className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-medium border transition-all duration-300 ${
                !isMuted && isRecording
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}
              title="STT tự động bật/tắt theo trạng thái mic trong phòng họp"
            >
              {!isMuted && isRecording ? (
                <>
                  <Mic className="w-3.5 h-3.5" /> Mic Bật (Đang dịch)
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5" /> Mic Tắt (Tạm dừng)
                </>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              variant={isRecording ? 'destructive' : 'default'}
              className={`h-8 gap-1.5 text-xs font-medium transition-all duration-300 ${
                isRecording
                  ? 'animate-pulse shadow-red-500/20 shadow-lg'
                  : 'shadow-primary/10 shadow-md'
              }`}
              onClick={toggleRecording}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-3.5 h-3.5" /> Dừng thu
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" /> Thu giọng nói
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Realtime Transcripts Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {transcripts.length === 0 && !isRecording && !isProcessing ? (
          <Card className="border-dashed border-border/60 bg-muted/20">
            <CardContent className="p-6 text-center flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              <Sparkles className="w-8 h-8 text-primary/40 mb-1" />
              <p className="text-xs font-medium text-foreground">Sẵn sàng nhận diện Real-time</p>
              <p className="text-[11px]">
                Bấm nút <strong>&quot;Thu giọng nói&quot;</strong> ở trên và phát biểu. Giọng nói sẽ
                xuất hiện dưới dạng phụ đề trực tiếp trên màn hình họp.
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Mode:{' '}
                <strong>
                  {sttMode === 'browser' ? 'Browser STT (vi-VN)' : 'Whisper STT (On-Premise)'}
                </strong>
              </p>
            </CardContent>
          </Card>
        ) : (
          transcripts.map((item, idx) => (
            <Card
              key={item.id || idx}
              className={`border-border/50 shadow-sm transition-all duration-300 bg-background/90 ${
                item.is_final === false ? 'border-primary/30 shadow-primary/5' : 'hover:shadow-md'
              }`}
            >
              <CardContent className="p-3 space-y-2">
                {/* Header: timestamp + lang + status */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>{item.timestamp}</span>
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold text-[10px]">
                      {item.detected_lang}
                    </span>
                    {/* Translation method badge */}
                    {item.is_final !== false && item.validation_notes && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          item.validation_notes.includes('MarianMT')
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : item.validation_notes.includes('LLM')
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {item.validation_notes.includes('MarianMT')
                          ? '⚡ MarianMT'
                          : item.validation_notes.includes('LLM')
                            ? '✨ LLM'
                            : item.validation_notes}
                      </span>
                    )}
                  </div>
                  {item.is_final === false ? (
                    <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
                      <Radio className="w-3 h-3 animate-pulse" />
                      <span>Streaming...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>✓ Done</span>
                    </div>
                  )}
                </div>

                {/* Vietnamese polished text */}
                <div className="text-xs font-medium text-foreground flex items-start gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    {item.polished_text}
                    {item.is_final === false && (
                      <span className="inline-block w-1 h-3 bg-primary ml-1 animate-pulse" />
                    )}
                  </span>
                </div>

                {/* English translation — bilingual display */}
                {item.en_text && (
                  <div className="text-xs text-muted-foreground flex items-start gap-1.5 pl-0.5">
                    <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed italic">
                      {item.en_text}
                      {item.is_final === false && (
                        <span className="inline-block w-1.5 h-3 bg-blue-400 ml-1 animate-pulse align-middle" />
                      )}
                    </span>
                  </div>
                )}

                {/* Tech Terms — only when final */}
                {item.is_final !== false &&
                  item.technical_terms &&
                  item.technical_terms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-0.5 mr-1">
                        <Cpu className="w-3 h-3" /> Terms:
                      </span>
                      {item.technical_terms.map((term, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded border border-blue-500/20"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>
          ))
        )}
        <div ref={feedEndRef} />
      </div>
    </div>
  );
}
