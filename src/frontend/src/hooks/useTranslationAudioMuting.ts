import { useEffect } from 'react';
import { useRoomContext, useLocalParticipant, useTracks } from '@livekit/components-react';
import { Track, RemoteAudioTrack } from 'livekit-client';

export function useTranslationAudioMuting() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const audioTracks = useTracks([Track.Source.Microphone]);

  useEffect(() => {
    if (!localParticipant) return;

    const attrs = localParticipant.attributes;
    const isTranslationEnabled = attrs['translation_enabled'] === 'true';
    const translationSourceLang = attrs['translation_source'];

    audioTracks.forEach((trackRef) => {
      // We only want to mute remote participants
      if (trackRef.participant.identity === localParticipant.identity) return;
      if (trackRef.participant.identity.startsWith('agent-')) return; // Don't mute the AI agent itself

      const track = trackRef.publication?.track as RemoteAudioTrack | undefined;
      if (!track || typeof track.setVolume !== 'function') return;

      try {
        let shouldMute = false;

        if (isTranslationEnabled && translationSourceLang && trackRef.participant.metadata) {
          const metadata = JSON.parse(trackRef.participant.metadata);
          // If the remote participant is speaking the language we are translating from, mute them!
          if (metadata.language_used_in_call === translationSourceLang) {
            shouldMute = true;
          }
        }

        if (shouldMute) {
          track.setVolume(0);
        } else {
          track.setVolume(1.0);
        }
      } catch (err) {
        // Safe fallback if metadata is not JSON
        track.setVolume(1.0);
      }
    });
  }, [localParticipant, localParticipant.attributes, audioTracks]);
}
