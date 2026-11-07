import { useEffect, useRef } from 'react';
import { useRoomContext, useDataChannel } from '@livekit/components-react';
import { RemoteAudioTrack, Track } from 'livekit-client';

interface TTSPlaybackEvent {
  type: 'tts_started' | 'tts_ended';
  track: string;
  source_participant_id: string;
}

export function useAudioDucking() {
  const room = useRoomContext();
  const previousVolumesRef = useRef<Map<string, number>>(new Map());

  const handleDataChannel = (msg: { payload: Uint8Array }) => {
    try {
      const text = new TextDecoder().decode(msg.payload);
      const data = JSON.parse(text) as TTSPlaybackEvent;

      if (data.type === 'tts_started' || data.type === 'tts_ended') {
        const participantId = data.source_participant_id;
        if (!participantId) return;

        const participant = room.remoteParticipants.get(participantId);
        if (!participant) return;

        // Get their microphone track
        const micPublication = participant.getTrackPublication(Track.Source.Microphone);
        if (!micPublication || !micPublication.track) return;

        const track = micPublication.track as RemoteAudioTrack;

        // Ensure track has setVolume method (it's a RemoteAudioTrack feature)
        if (typeof track.setVolume !== 'function') {
          console.warn('[AudioDucking] setVolume not available on this track');
          return;
        }

        if (data.type === 'tts_started') {
          // If we haven't ducked them yet, save their current volume
          if (!previousVolumesRef.current.has(participantId)) {
            let currentVol = 1.0;
            const elements = track.attachedElements;
            if (elements.length > 0 && elements[0] instanceof HTMLMediaElement) {
              currentVol = elements[0].volume;
            }
            previousVolumesRef.current.set(participantId, currentVol);
          }

          console.log(`[AudioDucking] Muting ${participantId} during translation`);
          track.setVolume(0);
        } else if (data.type === 'tts_ended') {
          const prevVol = previousVolumesRef.current.get(participantId) ?? 1.0;
          console.log(`[AudioDucking] Restoring ${participantId} to ${prevVol * 100}%`);
          track.setVolume(prevVol);
          previousVolumesRef.current.delete(participantId);
        }
      }
    } catch (err) {
      // Not a JSON message or not our event
    }
  };

  useDataChannel('translation_events', handleDataChannel);
}
