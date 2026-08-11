import asyncio
import json
import logging

import pytest
import websockets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@pytest.mark.skip(reason="Manual integration test requiring running server")
async def test_websocket_stt():
    uri = "ws://localhost:8000/ws/realtime-stt"

    logger.info(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            logger.info("Connected!")

            # Send a test translation payload
            payload = {
                "type": "translate",
                "text": "Chào mọi người, hôm nay chúng ta sẽ bàn về API WebSocket.",
            }
            logger.info(f"Sending: {payload}")
            await websocket.send(json.dumps(payload))

            # Receive stream frames until is_final is True
            while True:
                response_str = await websocket.recv()
                try:
                    data = json.loads(response_str)
                    is_final = data.get("is_final", False)
                    vi_text = data.get("vi_text", "")
                    en_text = data.get("en_text", "")
                    notes = data.get("validation_notes", "")

                    logger.info(
                        f"Received frame | Final: {is_final} | VI: {vi_text} | EN: {en_text} | Notes: {notes}"
                    )

                    if is_final:
                        logger.info("Stream finished successfully.")
                        break
                except json.JSONDecodeError:
                    logger.error(f"Received non-JSON response: {response_str}")
                    break

    except ConnectionRefusedError:
        logger.error("Connection refused. Make sure FastAPI backend is running on port 8000.")
    except Exception as e:
        logger.error(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_websocket_stt())
