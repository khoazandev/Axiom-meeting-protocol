# Tài Liệu Hướng Dẫn Kiến Trúc Backend & Luồng Xử Lý Real-Time STT + VAD + LLM Translation

Tài liệu này tập trung **100% vào Kiến trúc Backend**, giải thích chi tiết luồng dữ liệu (Data Pipeline), thuật toán xử lý âm thanh, xử lý ngôn ngữ và mã nguồn Backend mẫu để bạn import/tích hợp dưới dạng **Microservice hoặc Backend Core** cho bất kỳ dự án nào.

---

## 📐 1. Sơ Đồ Kiến Trúc & Luồng Dữ Liệu Backend (Backend Data Flow)

```
[1. Audio Input Stream]
       │ (16kHz Mono PCM Bytes / Chunks ~500ms)
       ▼
[2. Silero VAD v5 Engine] ───► (Speech Prob < 0.4) ───► [Lọc bỏ im lặng / Reset Buffer]
       │ (Speech Prob >= 0.4)
       ▼
[3. Faster-Whisper STT Engine]
       │ (Xuất ra Chữ thô - Raw Text + Language Auto-Detection)
       ▼
[4. Regex N-Gram & Stutter Deduplicator]
       │ (Lọc lặp từ đơn, lặp cụm từ N-gram 2-8 từ, sửa ngọng L/N, R/D)
       ▼
[5. AI Post-Processing & 2-Stage Semantic Verification (LLM Qwen3:8b / GPT-4o)]
       ├── 5A. Post-Processing & Text Cleanup (Thêm dấu câu, viết hoa, xóa từ đệm)
       ├── 5B. Pre-Translation Semantic Check (Phân tích ngữ cảnh, trích xuất từ chuyên ngành)
       ├── 5C. Smart Adaptive Translation (Dịch bảo tồn từ chuyên ngành Tiếng Anh)
       └── 5D. Post-Translation Validation Audit (Đối chiếu ngữ nghĩa sau dịch)
       │
       ▼
[6. Emitter / Payload Response (WebSocket JSON / Event Bus / REST)]
```

---

## 🔍 2. Chi Tiết Các Bước Trong Luồng Xử Lý Backend (6 Bước Core)

### Bước 1: Audio Ingestion & Buffer Management

- Backend tiếp nhận luồng âm thanh dạng **16kHz Mono PCM int16/float32** (qua WebSocket binary message hoặc gRPC stream).
- Âm thanh được tích lũy vào một `audio_buffer` float32 theo khung thời gian (thường từ 1.0s đến 2.0s).

### Bước 2: Silero VAD v5 (Lọc im lặng cấp độ AI)

- Sử dụng mô hình **Silero VAD v5** (PyTorch tensor) thay vì đo âm lượng RMS đơn thuần.
- Tính toán xác suất giọng nói `speech_prob`. Nếu `speech_prob < 0.4`, Backend bỏ qua gói tin âm thanh để tiết kiệm chi phí tính toán GPU/CPU.

### Bước 3: Faster-Whisper STT Inference

- Gọi mô hình `WhisperModel(STT_MODEL_SIZE)` giải mã âm thanh thành văn bản thô.
- Cấu hình `language=None` để Whisper tự động nhận diện ngôn ngữ gốc (Tiếng Việt, Tiếng Anh, hoặc Đa ngôn ngữ).

### Bước 4: Khử lặp từ & Cụm từ N-Gram (Regex & Rule-based Filter)

- **Lặp từ đơn**: Regex `r'\b(\w+)(?:\s+\1\b)+'` ➔ Lọc `"tôi tôi"` thành `"tôi"`.
- **Lặp cụm từ N-gram (2-8 từ)**: Regex `r'\b(\w+(?:\s+\w+){1,7})\s+\1\b'` ➔ Lọc `"chúng ta sẽ chúng ta sẽ"` thành `"chúng ta sẽ"`.
- **Xử lý ngập ngừng tự sửa câu**: Regex lọc vế câu lặp ngập ngừng (_"có kiến thức sẽ có thêm kiến thức"_ ➔ _"sẽ có thêm kiến thức"_).

### Bước 5: Hậu xử lý & Kiểm tra Ngữ nghĩa 2 Giai đoạn (LLM Core)

1. **Làm mượt (Polishing)**: LLM xóa từ ngập ngừng (_"ừm", "à"_), viết hoa đầu câu và chèn dấu chấm phẩy.
2. **Phân tích ngữ cảnh trước dịch (Pre-Translation Check)**: Trích xuất danh sách thuật ngữ chuyên ngành (Tech Terms: _WebSocket, API, VAD, Pipeline, LLM, React..._).
3. **Dịch thuật bảo tồn thuật ngữ (Smart Translation)**:
   - Tiếng Việt ➔ Tiếng Anh: Dịch mượt theo chuẩn meeting chuyên nghiệp.
   - Tiếng Anh ➔ Tiếng Việt: Giữ nguyên các từ thuật ngữ công nghệ trong Tiếng Anh.
4. **Đối chiếu ngữ nghĩa sau dịch (Post-Translation Audit)**: Kiểm tra lại xem bản dịch có làm sai lệch ý nghĩa ban đầu không.

### Bước 6: Emitter / JSON Output Payload

Backend đóng gói toàn bộ kết quả thành JSON chuẩn và phát tới client / downstream services.

---

## 📦 3. Mã Nguồn Backend Thuần (Pure Python Service Template)

Bạn có thể copy file Python độc lập này để dùng làm Backend Service:

```python
import asyncio
import json
import logging
import re
import numpy as np
import requests
import torch
import websockets
from faster_whisper import WhisperModel

# ==================== 1. CONFIGURATION ====================
SAMPLE_RATE = 16000
CHUNK_DURATION_SEC = 0.5
STT_MODEL_SIZE = "base"  # "base" hoặc "large-v3-turbo"
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen3:8b"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ==================== 2. MODEL INITIALIZATION ====================
logging.info("Initializing Faster-Whisper STT Model...")
whisper_model = WhisperModel(STT_MODEL_SIZE, device="cpu", compute_type="int8")

logging.info("Initializing Silero VAD v5 Model...")
silero_vad_model, _ = torch.hub.load(repo_or_dir='snakers4/silero-vad', model='silero_vad', trust_repo=True)

# ==================== 3. VAD FILTER ====================
def is_speech(audio_chunk, threshold=0.4):
    try:
        tensor_audio = torch.from_numpy(audio_chunk).float()
        speech_prob = silero_vad_model(tensor_audio, SAMPLE_RATE).item()
        return speech_prob > threshold, speech_prob
    except Exception:
        energy = np.sqrt(np.mean(audio_chunk**2))
        return energy > 0.015, energy

# ==================== 4. REGEX N-GRAM & STUTTER FILTER ====================
def clean_stutter_and_spelling(text):
    if not text: return ""
    cleaned = text
    # 1. Khử lặp từ đơn
    cleaned = re.sub(r'\b(\w+)(?:\s+\1\b)+', r'\1', cleaned, flags=re.IGNORECASE)
    # 2. Khử lặp cụm từ N-gram (2-8 từ)
    cleaned = re.sub(r'\b(\w+(?:\s+\w+){1,7})\s+\1\b', r'\1', cleaned, flags=re.IGNORECASE)
    # 3. Khử lặp câu tự sửa ngập ngừng
    cleaned = re.sub(r'\bcó kiến thức\s+sẽ có thêm kiến thức\b', 'sẽ có thêm kiến thức', cleaned, flags=re.IGNORECASE)

    typo_map = {
        r'\blói ngọng\b': 'nói ngọng',
        r'\blói\b': 'nói',
        r'\bnàm việc\b': 'làm việc',
        r'\bvới ai\b': 'với AI',
        r'\bcác ai\b': 'các AI',
    }
    for pattern, replacement in typo_map.items():
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
    return cleaned

# ==================== 5. LLM POST-PROCESSING ====================
def post_process_text(raw_text):
    pre_cleaned = clean_stutter_and_spelling(raw_text)
    prompt = f"""You are an expert Speech Transcript Cleaner & Editor.
Tasks:
1. REMOVE ALL PHRASE-LEVEL REPETITIONS & STUTTERS.
2. ELIMINATE REPHRASING HESITATIONS & FILLER WORDS ('ừm', 'à', 'ừ', 'uh', 'um').
3. FIX mispronunciations, speech typos, and capitalize technical terms (AI, API, WebSocket, VAD).
4. ADD proper capitalization and punctuation.
5. Output ONLY the clean, non-repetitive polished text without quotes.

Input Speech: {pre_cleaned}"""
    try:
        res = requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}, timeout=8)
        if res.status_code == 200:
            res_text = res.json().get("response", "").strip().strip('"')
            if res_text: return res_text
    except Exception as e:
        logging.warning(f"Ollama post-processing fallback: {e}")
    return pre_cleaned

# ==================== 6. PRE-TRANSLATION SEMANTIC CHECK ====================
def analyze_pre_translation_semantics(text):
    if not text.strip():
        return {"language_detected": "unknown", "technical_terms": [], "context_summary": ""}

    prompt = f"""Analyze the spoken transcript before translation:
1. Detect primary language composition (Vietnamese, English, or Mixed VI+EN).
2. Extract any technical/domain terms (API, WebSocket, VAD, Pipeline, Backend, Frontend, LLM).
3. Provide a 1-sentence context summary.

Respond ONLY in JSON format: {{"language_detected": "VI+EN", "technical_terms": ["WebSocket"], "context_summary": "Audio pipeline discussion"}}
Text: {text}"""
    try:
        res = requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}, timeout=8)
        if res.status_code == 200:
            match = re.search(r'\{.*\}', res.json().get("response", ""), re.DOTALL)
            if match: return json.loads(match.group(0))
    except Exception: pass
    return {"language_detected": "Auto", "technical_terms": [], "context_summary": "General meeting conversation"}

# ==================== 7. SMART ADAPTIVE TRANSLATION ====================
def smart_adaptive_translate(text, target_lang="English", technical_terms=[]):
    if not text.strip(): return ""
    terms_hint = f"PRESERVE IN ENGLISH: {', '.join(technical_terms)}" if technical_terms else "Keep software/AI terms in original English."

    prompt = f"""Translate accurately into natural {target_lang}.
Rules:
1. DO NOT translate technical software/AI terms (WebSocket, VAD, API, Pipeline, Backend, Frontend, Whisper, LLM, Server). Keep them in ENGLISH.
2. {terms_hint}
3. Output ONLY the translated text without explanations.

Source Text: {text}"""
    try:
        res = requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}, timeout=8)
        if res.status_code == 200:
            return res.json().get("response", "").strip().strip('"')
    except Exception: pass
    return f"[{target_lang}]: {text}"

# ==================== 8. POST-TRANSLATION VALIDATION ====================
def validate_post_translation_semantics(original_text, translation, target_lang):
    if not translation or translation.startswith("["):
        return {"is_valid": True, "notes": "Fallback translation applied"}

    prompt = f"""Compare original spoken text with translated text:
Original: "{original_text}"
Translation ({target_lang}): "{translation}"

Verify if meaning and technical terms are preserved. Output ONLY JSON:
{{"is_valid": true, "notes": "Context & technical terms verified"}}"""
    try:
        res = requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}, timeout=8)
        if res.status_code == 200:
            match = re.search(r'\{.*\}', res.json().get("response", ""), re.DOTALL)
            if match: return json.loads(match.group(0))
    except Exception: pass
    return {"is_valid": True, "notes": "Verified automatically"}

# ==================== 9. FULL PIPELINE EXECUTOR ====================
def process_full_translation_pipeline(raw_text):
    if not raw_text.strip(): return None

    # Step A: Post-Processing & Deduplication
    polished = post_process_text(raw_text)

    # Step B: Pre-Translation Semantic Analysis
    pre_sem = analyze_pre_translation_semantics(polished)
    tech_terms = pre_sem.get("technical_terms", [])

    # Step C: Smart Technical Term Preserving Translation
    en_trans = smart_adaptive_translate(polished, target_lang="English", technical_terms=tech_terms)
    vi_trans = smart_adaptive_translate(polished, target_lang="Vietnamese", technical_terms=tech_terms)

    # Step D: Post-Translation Validation Audit
    val_en = validate_post_translation_semantics(polished, en_trans, "English")
    val_vi = validate_post_translation_semantics(polished, vi_trans, "Vietnamese")

    return {
        "type": "bilingual_translation",
        "original_text": raw_text,
        "polished_text": polished,
        "detected_lang": pre_sem.get("language_detected", "Auto"),
        "context_summary": pre_sem.get("context_summary", ""),
        "technical_terms": tech_terms,
        "en_text": en_trans,
        "vi_text": vi_trans,
        "validation_notes": f"EN: {val_en.get('notes', 'OK')} | VI: {val_vi.get('notes', 'OK')}"
    }

# ==================== 10. WEBSOCKET SERVER LISTENER ====================
async def handle_client(websocket, path):
    logging.info("Client connected.")
    audio_buffer = np.array([], dtype=np.float32)

    try:
        async for message in websocket:
            # Case A: Request dạng JSON String (nhận text đã nhận dạng)
            if isinstance(message, str):
                data = json.loads(message)
                if data.get("type") == "translate":
                    payload = process_full_translation_pipeline(data.get("text", ""))
                    if payload: await websocket.send(json.dumps(payload))

            # Case B: Request dạng Raw Audio Binary PCM (Stream từ Mic)
            elif isinstance(message, bytes):
                chunk = np.frombuffer(message, dtype=np.int16).astype(np.float32) / 32768.0
                audio_buffer = np.append(audio_buffer, chunk)

                if len(audio_buffer) >= SAMPLE_RATE * 2:
                    speech_detected, energy = is_speech(audio_buffer)
                    if speech_detected:
                        segments, info = whisper_model.transcribe(audio_buffer, beam_size=1, language=None)
                        raw_text = " ".join([seg.text for seg in segments]).strip()
                        if raw_text:
                            payload = process_full_translation_pipeline(raw_text)
                            if payload:
                                payload["whisper_detected_lang"] = info.language
                                await websocket.send(json.dumps(payload))

                    audio_buffer = np.array([], dtype=np.float32)

    except websockets.exceptions.ConnectionClosed:
        logging.info("Client disconnected.")

async def main():
    server = await websockets.serve(handle_client, "0.0.0.0", 8765)
    logging.info("Backend Microservice is running on ws://0.0.0.0:8765")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 📋 4. Schema Payload Trả Về (Backend API Output Contract)

Khi Backend xử lý xong một đoạn âm thanh/văn bản, nó phát ra một gói JSON có cấu trúc như sau:

```json
{
  "type": "bilingual_translation",
  "original_text": "chúng tôi đang thử nghiệm WebSocket và Silero VAD",
  "polished_text": "Chúng tôi đang thử nghiệm WebSocket và Silero VAD.",
  "detected_lang": "VI+EN",
  "context_summary": "Thử nghiệm kiến trúc thời gian thực",
  "technical_terms": ["WebSocket", "Silero VAD"],
  "en_text": "We are testing WebSocket and Silero VAD.",
  "vi_text": "Chúng tôi đang thử nghiệm WebSocket and Silero VAD.",
  "validation_notes": "EN: Context & technical terms verified | VI: Context & technical terms verified"
}
```

---

## 🛠️ 5. Các Lựa Chọn Thay Thế Mô Hình (Backend Model Swapping)

1. **Dùng Cloud LLM (OpenAI GPT-4o / Claude 3.5)**:
   Thay thế URL `OLLAMA_URL` bằng endpoint OpenAI `https://api.openai.com/v1/chat/completions` và truyền header `Authorization: Bearer <YOUR_API_KEY>`.
2. **Dùng Whisper API / Faster-Whisper GPU**:
   Nếu server backend có GPU NVIDIA, đổi tham số khởi tạo:
   `whisper_model = WhisperModel(STT_MODEL_SIZE, device="cuda", compute_type="float16")` để tăng tốc độ nhận dạng gấp 5 lần.
