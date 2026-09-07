import { useEffect } from 'react';
import { useRoomContext, useLocalParticipant, useTracks } from '@livekit/components-react';
import { Track, RemoteAudioTrack } from 'livekit-client';
import { create } from 'zustand';

export const useTranslationStore = create<{
  enabled: boolean;
  sourceLang: string;
  setEnabled: (e: boolean) => void;
  setSourceLang: (l: string) => void;
}>((set) => ({
  enabled: true,
  sourceLang: 'vi',
  setEnabled: (e) => set({ enabled: e }),
  setSourceLang: (l) => set({ sourceLang: l }),
}));

export function useTranslationAudioMuting() {
  const { localParticipant } = useLocalParticipant();
  const audioTracks = useTracks([Track.Source.Microphone]);
  const { enabled: isTranslationEnabled, sourceLang: translationSourceLang } =
    useTranslationStore();

  useEffect(() => {
    if (!localParticipant) return;

    audioTracks.forEach((trackRef) => {
      if (trackRef.participant.identity === localParticipant.identity) return;
      if (trackRef.participant.identity.startsWith('agent-')) return;

      const track = trackRef.publication?.track as RemoteAudioTrack | undefined;
      if (!track || typeof track.setVolume !== 'function') return;

        track.setVolume(1.0);
      } catch (err) {
        console.error(
          `[AudioMuting] Error processing track for ${trackRef.participant.identity}:`,
          err
        );
        track.setVolume(1.0);
      }
    });
  }, [localParticipant, audioTracks, isTranslationEnabled, translationSourceLang]);
}
