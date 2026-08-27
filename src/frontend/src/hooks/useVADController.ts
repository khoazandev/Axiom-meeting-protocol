import { useState } from 'react';
import { useDataChannel, useConnectionState } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';

export interface TranslationStream {
  type: string;
  id: string;
  original_text: string;
  vi_text: string;
  en_text: string;
  is_final: boolean;
  timestamp?: string;
}

export interface TranscriptHistoryEntry {
  id: string;
  vi_text: string;
  en_text: string;
  original_text: string;
  timestamp: string;
  speaker: string;
}

export function useVADController(
  speakerName = 'Thành viên',
  onFinalized?: (entry: TranscriptHistoryEntry) => void
) {
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptHistoryEntry[]>([]);
  
  const roomState = useConnectionState();
  const isConnected = roomState === ConnectionState.Connected;

  useDataChannel('translation', (msg) => {
    try {
      const text = new TextDecoder().decode(msg.payload);
      const data = JSON.parse(text);
      if (data.type === 'bilingual_translation') {
        const timestamp = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        
        const entry: TranscriptHistoryEntry = {
          id: data.id,
          vi_text: data.vi_text || data.original_text || '',
          en_text: data.en_text || '',
          original_text: data.original_text || '',
          timestamp,
          speaker: data.participant_identity || speakerName,
        };

        setTranscriptHistory((prev) => {
          const existingIdx = prev.findIndex((e) => e.id === data.id);
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = entry;
            return updated;
          }
          return [...prev, entry];
        });

        if (onFinalized) {
          onFinalized(entry);
        }
      }
    } catch (err) {
      console.error('Failed to parse DataChannel message', err);
    }
  });

  return {
    isListening: false,
    streamData: null,
    interimText: '',
    isConnected,
    transcriptHistory,
  };
}
