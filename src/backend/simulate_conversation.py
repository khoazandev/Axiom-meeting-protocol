import sys
import asyncio
import os
sys.stdout.reconfigure(encoding='utf-8')
import json
import io
import av
import uuid
from livekit import rtc, api
import edge_tts
import re

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
            
    with open("temp_tts.mp3", "wb") as f:
        f.write(mp3_data)
        
    import subprocess
    # Convert MP3 to PCM WAV (24kHz, mono, s16le)
    subprocess.run([
        "ffmpeg", "-y", "-i", "temp_tts.mp3",
        "-f", "s16le", "-acodec", "pcm_s16le",
        "-ac", "1", "-ar", "24000", "temp_tts.pcm"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    with open("temp_tts.pcm", "rb") as f:
        pcm_data = f.read()
        
    return pcm_data, 24000

async def spawn_bot(room_name: str, bot_name: str, language: str, text_to_speak: str = None, delay_before_speak: float = 0):
    voice = "vi-VN-HoaiMyNeural" if language == "vi" else "en-US-AriaNeural"
    
    # 1. Generate token
    metadata = json.dumps({"language_used_in_call": language})
    
    token = api.AccessToken(API_KEY, API_SECRET) \
        .with_identity(f"bot_{uuid.uuid4().hex[:8]}") \
        .with_name(bot_name) \
        .with_metadata(metadata) \
        .with_grants(api.VideoGrants(room_join=True, room=room_name, can_update_own_metadata=True)) \
        .to_jwt()
    
    # 2. Connect to LiveKit
    room = rtc.Room()
    await room.connect(LIVEKIT_URL, token)
    print(f"[{bot_name}] Connected to room '{room_name}' as {bot_name} ({language})")
    
    if text_to_speak:
        pcm_data, sample_rate = await generate_speech_wav(text_to_speak, voice)
        
        channels = 1
        source = rtc.AudioSource(sample_rate, channels)
        track = rtc.LocalAudioTrack.create_audio_track("microphone", source)
        options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        await room.local_participant.publish_track(track, options)
        print(f"[{bot_name}] Published audio track")
        
        print(f"[{bot_name}] Đợi 5 giây để AI Agent kịp join phòng...")
        await asyncio.sleep(5)
        
        await asyncio.sleep(delay_before_speak)
        
        chunk_size = int(sample_rate * 0.01) * 2
        print(f"[{bot_name}] 🎤 Bắt đầu nói: {text_to_speak}")
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
            
        print(f"[{bot_name}] 🤐 Đã nói xong! Đang gửi khung im lặng để AI nhận diện...")
        # Send 3 seconds of silence to trigger VAD end-of-speech
        silent_chunk = b'\x00' * chunk_size
        for _ in range(300): # 300 * 10ms = 3000ms = 3 seconds
            silent_frame = rtc.AudioFrame(
                silent_chunk, 
                sample_rate, 
                channels, 
                int(sample_rate * 0.01)
            )
            await source.capture_frame(silent_frame)
            await asyncio.sleep(0.01)
            
        print(f"[{bot_name}] 🤐 Gửi im lặng xong! Đợi AI dịch...")

    # Keep bot alive in the room
    await asyncio.sleep(30)
    await room.disconnect()
    print(f"[{bot_name}] Disconnected.")

async def main():
    print("=====================================")
    print(" AXIOM - SIMULATE CONVERSATION BOTS")
    print("=====================================")
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = input("Paste link phòng họp (VD: http://localhost:3001/meetings/xyz): ")
    
    # Extract room ID from URL
    match = re.search(r'/meetings/([^/?]+)', url)
    if not match:
        print("Lỗi: Không tìm thấy mã phòng trong URL.")
        return
    room_name = f"meeting-{match.group(1)}"
    
    print(f"\n=> Sẽ join 1 bot vào phòng: {room_name}")
    print("Đang chuẩn bị...\n")
    
    # Spawn 1 Bot (English)
    bot_task = spawn_bot(
        room_name=room_name,
        bot_name="Bot_EN",
        language="en",
        text_to_speak="Hello everyone. Today the weather is really nice. Have a good day.",
        delay_before_speak=3.0 # Wait 3 seconds after joining before speaking
    )
    
    await bot_task

if __name__ == "__main__":
    asyncio.run(main())
