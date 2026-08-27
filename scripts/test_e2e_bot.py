import asyncio
import logging
import os
import wave
import sys
from livekit import rtc, api

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("e2e-bot")

async def play_audio_file(audio_source: rtc.AudioSource, filepath: str):
    """Đọc file .wav và ghi vào audio source của LiveKit."""
    if not os.path.exists(filepath):
        logger.error(f"Không tìm thấy file audio: {filepath}")
        return

    # Mở file wav để đọc
    wf = wave.open(filepath, "rb")
    sample_rate = wf.getframerate()
    channels = wf.getnchannels()
    sampwidth = wf.getsampwidth()
    
    logger.info(f"Phát file audio: {filepath} ({sample_rate}Hz, {channels} ch)")

    # AudioSource của LiveKit cần 10ms frame
    samples_10ms = sample_rate // 100
    chunk_size = samples_10ms * channels * sampwidth
    
    while True:
        data = wf.readframes(samples_10ms)
        if len(data) == 0:
            break
            
        # Tạo AudioFrame từ byte data
        audio_frame = rtc.AudioFrame(
            data=data,
            sample_rate=sample_rate,
            num_channels=channels,
            samples_per_channel=samples_10ms
        )
        
        await audio_source.capture_frame(audio_frame)
        await asyncio.sleep(0.01) # Chờ 10ms

    wf.close()
    logger.info("Hoàn tất phát file audio.")

async def main(room_name: str, audio_file: str):
    # Lấy thông tin từ biến môi trường
    url = os.getenv("LIVEKIT_URL", "ws://127.0.0.1:7880")
    api_key = os.getenv("LIVEKIT_API_KEY", "devkey")
    api_secret = os.getenv("LIVEKIT_API_SECRET", "secret")

    logger.info(f"Tạo token cho phòng {room_name}")
    token = api.AccessToken(api_key, api_secret).with_identity("TestBot").with_name("Auto Bot").with_grants(api.VideoGrants(
        room_join=True,
        room=room_name,
    )).to_jwt()

    room = rtc.Room()

    # Lắng nghe DataChannel (Translated Caption)
    @room.on("data_received")
    def on_data_received(data: rtc.DataPacket):
        if data.topic == "translation":
            payload = data.data.decode("utf-8")
            logger.info(f"🔔 [Nhận Translated Caption]: {payload}")

    # Lắng nghe Audio Track (Speech Translation)
    @room.on("track_subscribed")
    def on_track_subscribed(track: rtc.Track, publication: rtc.TrackPublication, participant: rtc.RemoteParticipant):
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            logger.info(f"🎧 [Subscribed Audio Track] Từ: {participant.identity}, Tên track: {track.name}")

    logger.info(f"Đang kết nối tới LiveKit: {url}")
    await room.connect(url, token)
    logger.info(f"Đã kết nối vào phòng: {room.name}!")

    # Tạo Audio Track cho Bot và phát file wav
    source = rtc.AudioSource(48000, 1) # Mặc định 48kHz, sẽ tự convert nếu file wav khác rate
    track = rtc.LocalAudioTrack.create_audio_track("bot_mic", source)
    options = rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
    
    logger.info("Đang publish Audio Track...")
    await room.local_participant.publish_track(track, options)

    # Đợi 2 giây cho ổn định kết nối
    await asyncio.sleep(2)
    
    # Phát file
    await play_audio_file(source, audio_file)

    # Đợi thêm 15 giây để hứng kết quả STT/TTS từ Agent trả về trước khi ngắt kết nối
    logger.info("Chờ 15s để nghe ngóng kết quả từ Agent...")
    await asyncio.sleep(15)

    await room.disconnect()
    logger.info("Đã ngắt kết nối.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Sử dụng: python test_e2e_bot.py <ROOM_NAME> <AUDIO_FILE.wav>")
        sys.exit(1)
        
    asyncio.run(main(sys.argv[1], sys.argv[2]))
