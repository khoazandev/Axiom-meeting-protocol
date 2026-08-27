import sys
import asyncio
import json
import io
import av
from livekit import rtc, api
import edge_tts

LIVEKIT_URL = "ws://localhost:7880"
API_KEY = "devkey"
API_SECRET = "secret"

async def generate_speech_wav(text: str, voice: str):
    """Generate speech using edge-tts and return pcm data."""
    print(f"Generating TTS for: '{text}'")
    communicate = edge_tts.Communicate(text, voice)
    mp3_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_data += chunk["data"]
            
    container = av.open(io.BytesIO(mp3_data))
    stream = container.streams.audio[0]
    resampler = av.AudioResampler(format='s16', layout='mono', rate=24000)
    
    pcm_data = b''
    for frame in container.decode(stream):
        frame.pts = None
        for r_frame in resampler.resample(frame):
            pcm_data += r_frame.to_ndarray().tobytes()
            
    for r_frame in resampler.resample(None):
        pcm_data += r_frame.to_ndarray().tobytes()
        
    return pcm_data, 24000

async def main():
    if len(sys.argv) < 3:
        print("Usage: python test_bot.py <room_name> <bot_name> [language] [text_to_speak]")
        return

    room_name = sys.argv[1]
    bot_name = sys.argv[2]
    language = sys.argv[3] if len(sys.argv) > 3 else "vi"
    text_to_speak = sys.argv[4] if len(sys.argv) > 4 else "Xin chào mọi người. Hôm nay thời tiết thật đẹp. Chúc một ngày tốt lành."
    
    # Select voice
    voice = "vi-VN-HoaiMyNeural" if language == "vi" else "en-US-AriaNeural"
    
    # 1. Generate audio first
    pcm_data, sample_rate = await generate_speech_wav(text_to_speak, voice)
    
    # 2. Generate token
    token = api.AccessToken(API_KEY, API_SECRET) \
        .with_grant(api.VideoGrant(room_join=True, room=room_name)) \
        .with_identity(bot_name) \
        .with_name(bot_name) \
        .with_metadata(json.dumps({"language_used_in_call": language})) \
        .to_jwt()
    
    # 3. Connect to LiveKit
    room = rtc.Room()
    await room.connect(LIVEKIT_URL, token)
    print(f"[{bot_name}] Connected to room '{room_name}' as {bot_name} ({language})")
    
    # 4. Prepare Audio Source
    channels = 1
    print(f"[{bot_name}] Audio properties: {sample_rate}Hz, {channels} channel(s)")
    
    source = rtc.AudioSource(sample_rate, channels)
    track = rtc.LocalAudioTrack.create_audio_track("microphone", source)
    options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
    await room.local_participant.publish_track(track, options)
    print(f"[{bot_name}] Published audio track")
    
    # 5. Play audio once
    chunk_size = int(sample_rate * 0.01) * 2  # 10ms frame * 2 bytes per sample (s16)
    
    print(f"[{bot_name}] 🎤 Bắt đầu nói...")
    for i in range(0, len(pcm_data), chunk_size):
        chunk = pcm_data[i:i+chunk_size]
        if len(chunk) < chunk_size:
            chunk += b'\x00' * (chunk_size - len(chunk))
        
        audio_frame = rtc.AudioFrame(
            chunk, 
            sample_rate, 
            channels, 
            int(sample_rate * 0.01)
        )
        await source.capture_frame(audio_frame)
        await asyncio.sleep(0.01)
        
    print(f"[{bot_name}] 🤐 Đã nói xong! Đang đợi 10 giây để nghe bản dịch...")
    await asyncio.sleep(10)
    
    await room.disconnect()
    print(f"[{bot_name}] Disconnected.")

if __name__ == "__main__":
    asyncio.run(main())
