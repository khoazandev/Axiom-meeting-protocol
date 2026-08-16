"""
E2E Test: Task Extraction Pipeline
===================================
Test luồng trích xuất follow-up tasks end-to-end qua REST API.

Tự động tạo users, meeting, gửi transcript, đợi AI trích xuất.
Không cần tạo phòng họp trên frontend trước.

Sử dụng:
  $env:PYTHONIOENCODING='utf-8'; python src/backend/tests/test_e2e_extraction.py

Cấu hình (env vars, tất cả optional — có default):
  BACKEND_URL          — Backend base URL          (default: http://localhost:8000)
  OLLAMA_BASE_URL      — Ollama server URL         (default: http://localhost:11434)
  TASK_EXTRACTOR_MODEL — Model name prefix to check (default: task-extractor)
  FRONTEND_URL         — Frontend URL for links    (default: http://localhost:3000)
  E2E_TEST_PASSWORD    — Password cho test users   (default: random mỗi lần chạy)
  E2E_POLL_INTERVAL    — Polling interval (giây)   (default: 10)
  E2E_MAX_WAIT         — Max wait time (giây)      (default: 600)
  E2E_SEND_DELAY       — Delay giữa các segment   (default: 0.3)

Yêu cầu:
  - Backend đang chạy (docker-compose up)
  - Ollama đang chạy với model task-extractor
"""

import os
import re
import requests
import time
import sys
import uuid
import json


# ══════════════════════════════════════════════════════════════════════
# CONFIG — Tất cả đọc từ env, không hardcode
# ══════════════════════════════════════════════════════════════════════
def _env(key, default=""):
    """Read env var with fallback."""
    return os.environ.get(key, default)


BACKEND_URL = _env("BACKEND_URL", "http://localhost:8000")
API = f"{BACKEND_URL}/api/v1"
OLLAMA_BASE_URL = _env("OLLAMA_BASE_URL", "http://localhost:11434")
TASK_EXTRACTOR_MODEL = _env("TASK_EXTRACTOR_MODEL", "task-extractor")
FRONTEND_URL = _env("FRONTEND_URL", "http://localhost:3000")
E2E_TEST_PASSWORD = _env("E2E_TEST_PASSWORD", "") or f"e2e_pass_{uuid.uuid4().hex[:12]}"
E2E_POLL_INTERVAL = int(_env("E2E_POLL_INTERVAL", "10"))
E2E_MAX_WAIT = int(_env("E2E_MAX_WAIT", "600"))
E2E_SEND_DELAY = float(_env("E2E_SEND_DELAY", "0.3"))

# Batch size: import trực tiếp từ source code, không hardcode
try:
    from src.backend.services.turn_accumulator import TurnAccumulator
    BATCH_SIZE = TurnAccumulator.BATCH_SIZE
except ImportError:
    # Fallback nếu không import được (chạy ngoài project context)
    BATCH_SIZE = int(_env("E2E_BATCH_SIZE", "5"))


# ══════════════════════════════════════════════════════════════════════
# SCENARIOS — Dữ liệu test
# ══════════════════════════════════════════════════════════════════════
SCENARIOS = {
    "1": {
        "name": "Phát triển phần mềm (Anh & Tuan)",
        "speakers": ["Anh", "Tuan"],
        "conversation": [
            {"speaker": "Anh", "content": "Tuan oi em lam giup anh phan giao dien trang dang nhap nha.", "start": "0.0", "end": "4.0"},
            {"speaker": "Tuan", "content": "Da duoc anh. Em se lam ngay.", "start": "5.0", "end": "8.0"},
            {"speaker": "Anh", "content": "Em co gang hoan thanh truoc 20 thang 08 nam 2026 nha.", "start": "9.0", "end": "13.0"},
            {"speaker": "Tuan", "content": "Da vang anh. Em se uu tien hoan thanh som.", "start": "14.0", "end": "17.0"},
            {"speaker": "Anh", "content": "Em kiem tra luon phan xac thuc va xu ly nhung loi dang co nha.", "start": "18.0", "end": "23.0"},
        ],
        "expected": {
            "min_tasks": 1,
            "checks": [
                "Có ít nhất 1 task được trích xuất",
                "Có task liên quan đến giao diện hoặc xác thực",
            ],
        },
    },
    "2": {
        "name": "Chiến dịch Marketing (Lan & Minh)",
        "speakers": ["Lan", "Minh"],
        "conversation": [
            {"speaker": "Lan", "content": "Minh ơi, em chuẩn bị xong nội dung cho chiến dịch quảng cáo Facebook tháng này chưa?", "start": "0.0", "end": "5.0"},
            {"speaker": "Minh", "content": "Dạ em viết xong kịch bản rồi chị, đang đợi design làm ảnh.", "start": "6.0", "end": "10.0"},
            {"speaker": "Lan", "content": "Em hối design gửi ảnh sớm, rồi set up chiến dịch chạy thử trước ngày 25 tháng 8 nhé.", "start": "11.0", "end": "16.0"},
            {"speaker": "Minh", "content": "Vâng, em sẽ tạo campaign và lên lịch chạy thử. Budget ban đầu bao nhiêu ạ?", "start": "17.0", "end": "22.0"},
            {"speaker": "Lan", "content": "Khoảng 5 triệu nha. Em nhớ theo dõi và báo cáo lại kết quả vào cuối tuần.", "start": "23.0", "end": "28.0"},
        ],
        "expected": {
            "min_tasks": 1,
            "checks": [
                "Có ít nhất 1 task về chiến dịch/campaign",
            ],
        },
    },
    "3": {
        "name": "Nhân sự / Onboarding (Mai & Khang)",
        "speakers": ["Mai", "Khang"],
        "conversation": [
            {"speaker": "Mai", "content": "Khang ơi, tuần sau có 2 bạn nhân viên mới vào, em chuẩn bị hợp đồng thử việc giúp chị nha.", "start": "0.0", "end": "6.0"},
            {"speaker": "Khang", "content": "Dạ chị gửi thông tin lương và chức vụ qua email cho em để điền vào hợp đồng ạ.", "start": "7.0", "end": "12.0"},
            {"speaker": "Mai", "content": "Chị gửi rồi đó. Em in ra và đưa cho giám đốc ký trước ngày 15 tháng 9 nhé.", "start": "13.0", "end": "18.0"},
            {"speaker": "Khang", "content": "Vâng ạ. Còn về máy tính và chỗ ngồi thì sao chị?", "start": "19.0", "end": "22.0"},
            {"speaker": "Mai", "content": "Chị nhờ bên IT setup máy rồi. Em chuẩn bị thẻ nhân viên nữa là xong.", "start": "23.0", "end": "27.0"},
        ],
        "expected": {
            "min_tasks": 1,
            "checks": [
                "Có ít nhất 1 task về hợp đồng hoặc onboarding",
            ],
        },
    },
}


# ══════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════
def log(msg, indent=1):
    prefix = "  " * indent
    print(f"{prefix}{msg}")
    sys.stdout.flush()


def separator(char="═", width=70):
    print(char * width)


def header(title, char="═", width=70):
    print()
    print(char * width)
    print(f"  {title}")
    print(char * width)


def extract_meeting_id(input_str):
    """Extract meeting UUID from URL or raw string."""
    match = re.search(
        r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
        input_str,
    )
    if match:
        return match.group()
    return input_str.strip()


def register_user(name, email, password=None):
    """Register a user. Ignore if already exists."""
    password = password or E2E_TEST_PASSWORD
    resp = requests.post(f"{API}/auth/register", json={
        "email": email,
        "password": password,
        "full_name": name,
    })
    if resp.status_code in (200, 201):
        data = resp.json()
        return data.get("id")
    elif resp.status_code in (400, 422):
        # User already exists — that's fine
        return None
    else:
        log(f"⚠️  Register {name} unexpected: {resp.status_code}")
        return None


def login_user(email, password=None):
    """Login and return (headers, user_id)."""
    password = password or E2E_TEST_PASSWORD
    resp = requests.post(f"{API}/auth/login", json={
        "email": email,
        "password": password,
    })
    if resp.status_code != 200:
        log(f"❌ Login failed: {resp.status_code} {resp.text[:200]}")
        return None, None
    data = resp.json()
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get user_id via /auth/me
    me_resp = requests.get(f"{API}/auth/me", headers=headers)
    user_id = None
    if me_resp.status_code == 200:
        user_id = me_resp.json().get("id")

    return headers, user_id


def create_meeting(headers, title, description=None):
    """Create a meeting. Returns meeting_id."""
    resp = requests.post(f"{API}/meetings/", json={
        "title": title,
        "description": description or f"E2E test meeting — {title}",
    }, headers=headers)
    if resp.status_code == 201:
        meeting = resp.json()
        return meeting["id"]
    else:
        log(f"❌ Create meeting failed: {resp.status_code} {resp.text[:300]}")
        return None


def send_transcript(meeting_id, headers, content, start, end, seq):
    """Send a transcript segment. Returns status code."""
    resp = requests.post(
        f"{API}/meetings/{meeting_id}/transcripts",
        json={
            "content": content,
            "start_time": start,
            "end_time": end,
            "sequence": seq,
        },
        headers=headers,
    )
    return resp.status_code


def get_tasks(meeting_id, headers):
    """Get follow-up tasks for a meeting."""
    resp = requests.get(
        f"{API}/meetings/{meeting_id}/follow-up-tasks",
        headers=headers,
    )
    if resp.status_code == 200:
        return resp.json()
    return []


def get_transcripts(meeting_id, headers):
    """Get transcripts for a meeting."""
    resp = requests.get(
        f"{API}/meetings/{meeting_id}/transcripts",
        headers=headers,
    )
    if resp.status_code == 200:
        return resp.json()
    return []


def check_backend():
    """Check if backend is reachable."""
    try:
        resp = requests.get(f"{BACKEND_URL}/health", timeout=5)
        return resp.status_code == 200
    except Exception:
        return False


def check_ollama():
    """Check if Ollama is running with the required model."""
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if resp.status_code != 200:
            return False, "Ollama không phản hồi"
        models = [m["name"] for m in resp.json().get("models", [])]
        if any(TASK_EXTRACTOR_MODEL in m for m in models):
            return True, "OK"
        return False, f"Model '{TASK_EXTRACTOR_MODEL}' không tìm thấy. Có: {models}"
    except requests.exceptions.ConnectionError:
        return False, f"Không kết nối được Ollama ({OLLAMA_BASE_URL})"
    except Exception as e:
        return False, str(e)


# ══════════════════════════════════════════════════════════════════════
# MAIN TEST RUNNER
# ══════════════════════════════════════════════════════════════════════
def run_test(scenario_key, existing_meeting_id=None):
    """Run a single E2E test scenario. Returns (passed, task_count).

    Args:
        scenario_key: Key in SCENARIOS dict.
        existing_meeting_id: If provided, use this meeting instead of auto-creating.
            This allows the user to create a meeting on the frontend first,
            then watch the UI while the test runs.
    """
    scenario = SCENARIOS[scenario_key]
    conversation = scenario["conversation"]
    speakers = scenario["speakers"]
    uid = uuid.uuid4().hex[:6]

    header(f"SCENARIO {scenario_key}: {scenario['name']}")

    # ── Step 1: Register & Login speakers ──
    log("📝 Đăng ký & đăng nhập speakers...")
    speaker_map = {}  # speaker_name → {headers, user_id, email}

    for name in speakers:
        email = f"e2e_{name.lower()}_{uid}@test.com"
        register_user(name, email)
        headers, user_id = login_user(email)
        if not headers:
            log(f"❌ Không thể login {name}. Bỏ qua scenario này.")
            return False, 0
        speaker_map[name] = {"headers": headers, "user_id": user_id, "email": email}
        log(f"  ✅ {name} (user_id={user_id[:8]}...)")

    # Use first speaker as meeting creator
    creator_name = speakers[0]
    creator = speaker_map[creator_name]

    # ── Step 2: Get or create meeting ──
    if existing_meeting_id:
        meeting_id = existing_meeting_id
        log(f"\n📋 Sử dụng meeting có sẵn: {meeting_id}")
        # Verify meeting exists
        check = requests.get(f"{API}/meetings/{meeting_id}", headers=creator["headers"])
        if check.status_code == 200:
            meeting_title = check.json().get("title", "Unknown")
            log(f"  ✅ Meeting found: \"{meeting_title}\"")
        elif check.status_code == 403:
            log("  ⚠️  Meeting exists nhưng bot chưa có quyền GET (403) — vẫn thử gửi transcript")
        else:
            log(f"  ❌ Meeting not found! Status: {check.status_code}")
            log("     Hãy tạo phòng họp trên frontend trước.")
            return False, 0
    else:
        log(f"\n📋 Tạo meeting: \"{scenario['name']}\"...")
        meeting_id = create_meeting(
            creator["headers"],
            f"E2E Test — {scenario['name']} ({uid})",
            f"Auto-created for E2E test scenario {scenario_key}",
        )
        if not meeting_id:
            log("❌ Không tạo được meeting!")
            return False, 0
        log(f"  ✅ Meeting ID: {meeting_id}")

    # ── Step 3: Check initial tasks (should be 0) ──
    initial_tasks = get_tasks(meeting_id, creator["headers"])
    initial_count = len(initial_tasks)
    log(f"\n📊 Tasks ban đầu: {initial_count}")

    # ── Step 4: Send transcript segments ──
    total_segments = len(conversation)
    log(f"\n🎤 Gửi {total_segments} transcript segments (batch trigger ở segment {BATCH_SIZE})...")

    for i, line in enumerate(conversation, 1):
        speaker_name = line["speaker"]
        headers = speaker_map[speaker_name]["headers"]
        content = line["content"]

        status_code = send_transcript(
            meeting_id, headers,
            content, line["start"], line["end"], i,
        )

        status_icon = "✅" if status_code == 201 else f"❌({status_code})"
        trigger_note = " ◀◀◀ BATCH TRIGGER!" if i == BATCH_SIZE else ""
        preview = content[:60] + ("..." if len(content) > 60 else "")
        log(f"  [{i}/{total_segments}] {speaker_name}: \"{preview}\" [{status_icon}]{trigger_note}")

        if status_code != 201:
            log(f"     ⚠️  Gửi transcript thất bại!")
        time.sleep(E2E_SEND_DELAY)

    # ── Step 5: Verify transcripts were stored ──
    log("\n📄 Kiểm tra transcripts đã lưu...")
    stored = get_transcripts(meeting_id, creator["headers"])
    log(f"  Transcripts trong DB: {len(stored)}/{total_segments}")
    if len(stored) < total_segments:
        log("  ⚠️  Thiếu transcripts! Một số có thể bị lỗi.")

    # Show stored transcripts
    for t in stored:
        speaker_label = t.get("speaker_name") or t.get("speaker_id", "?")
        content_preview = t.get("content", "")[:60]
        log(f"    [{speaker_label}] {content_preview}")

    # ── Step 6: Wait for AI extraction ──
    log("\n⏳ Đợi AI trích xuất tasks...")
    log(f"   (Model: {TASK_EXTRACTOR_MODEL}, max wait: {E2E_MAX_WAIT}s, poll: {E2E_POLL_INTERVAL}s)")

    elapsed = 0
    tasks = initial_tasks

    while elapsed < E2E_MAX_WAIT:
        tasks = get_tasks(meeting_id, creator["headers"])
        new_count = len(tasks) - initial_count

        if new_count > 0:
            log(f"\n  🎉 Phát hiện {new_count} tasks mới sau {elapsed}s!")
            break

        dots = "." * ((elapsed // E2E_POLL_INTERVAL) % 4 + 1)
        print(f"\r  Waiting{dots} ({elapsed}s / {E2E_MAX_WAIT}s max)   ", end="", flush=True)
        time.sleep(E2E_POLL_INTERVAL)
        elapsed += E2E_POLL_INTERVAL

    # ── Step 7: Display results ──
    new_tasks = tasks[initial_count:] if len(tasks) > initial_count else tasks
    print()  # Clear waiting line

    header(f"KẾT QUẢ TRÍCH XUẤT — Scenario {scenario_key}", char="─")

    if not new_tasks:
        log("❌ Không có task nào được trích xuất (timeout).")
        log("   Kiểm tra:")
        log("     - docker-compose logs backend")
        log("     - ollama ps")
        log(f"     - curl {API}/meetings/{meeting_id}/follow-up-tasks")
        return False, 0

    log(f"✅ {len(new_tasks)} task(s) được trích xuất:\n")
    for i, task in enumerate(new_tasks, 1):
        log(f"  Task {i}:")
        log(f"    ID:        {task.get('id', 'N/A')}", indent=2)
        log(f"    Title:     {task.get('title', 'N/A')}", indent=2)
        log(f"    Assignee:  {task.get('assignee_name') or task.get('assignee_id') or 'Chưa gán'}", indent=2)
        log(f"    Deadline:  {task.get('deadline') or 'Chưa có'}", indent=2)
        log(f"    Status:    {task.get('status', 'N/A')}", indent=2)
        log(f"    Source:    {task.get('source', 'N/A')}", indent=2)
        print()

    # ── Step 8: Validate ──
    expected = scenario["expected"]
    passed = True

    header("VALIDATION", char="─")

    # Check minimum tasks
    min_tasks = expected["min_tasks"]
    if len(new_tasks) >= min_tasks:
        log(f"✅ Có ít nhất {min_tasks} task (thực tế: {len(new_tasks)})")
    else:
        log(f"❌ Cần ít nhất {min_tasks} task, chỉ có {len(new_tasks)}")
        passed = False

    # Check all tasks have source = AI_REALTIME
    ai_tasks = [t for t in new_tasks if t.get("source") == "AI_REALTIME"]
    if ai_tasks:
        log(f"✅ {len(ai_tasks)} task có source = AI_REALTIME")
    else:
        log("⚠️  Không có task nào source = AI_REALTIME (có thể chấp nhận)")

    # Check tasks have titles
    titled = [t for t in new_tasks if t.get("title") and len(t["title"]) > 3]
    if titled:
        log(f"✅ Tất cả {len(titled)} task có title hợp lệ")
    else:
        log("❌ Có task thiếu title")
        passed = False

    # Print expected checks as info
    for check_desc in expected["checks"]:
        log(f"ℹ️  {check_desc} (kiểm tra thủ công)")

    # ── Summary ──
    print()
    log(f"📍 Meeting ID:  {meeting_id}")
    log(f"🌐 Frontend:    {FRONTEND_URL}/meetings/{meeting_id}")

    return passed, len(new_tasks)


# ══════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════
def main():
    print()
    separator("█")
    print("  E2E TEST: Task Extraction Pipeline")
    print(f"  Backend:    {BACKEND_URL}")
    print(f"  Ollama:     {OLLAMA_BASE_URL}")
    print(f"  Model:      {TASK_EXTRACTOR_MODEL}")
    print(f"  Batch size: {BATCH_SIZE} segments")
    separator("█")

    # ── Preflight checks ──
    print()
    log("🔍 Kiểm tra hệ thống...")

    if not check_backend():
        log(f"❌ Backend không phản hồi ({BACKEND_URL})! Chạy: docker-compose up")
        sys.exit(1)
    log("  ✅ Backend OK")

    ollama_ok, ollama_msg = check_ollama()
    if not ollama_ok:
        log(f"  ⚠️  Ollama: {ollama_msg}")
        log("     (Extraction sẽ được xử lý bởi backend container)")
    else:
        log("  ✅ Ollama OK")

    # ── Scenario selection ──
    print()
    log("Chọn kịch bản test:")
    for k, v in SCENARIOS.items():
        log(f"  {k}. {v['name']}")
    log("  a. Chạy TẤT CẢ")

    choice = input("\n  > ").strip()

    if choice.lower() == "a":
        scenarios_to_run = list(SCENARIOS.keys())
    elif choice in SCENARIOS:
        scenarios_to_run = [choice]
    else:
        log("Lựa chọn không hợp lệ. Chạy scenario 1.")
        scenarios_to_run = ["1"]

    # ── Meeting mode ──
    print()
    log("Chọn mode:")
    log("  1. Nhập meeting ID (tạo phòng trên frontend trước, xem UI real-time)")
    log("  2. Tự tạo meeting (test tự động hoàn toàn)")
    mode = input("\n  > ").strip()

    existing_meeting_id = None
    if mode == "1":
        print()
        log("Nhập meeting ID hoặc URL phòng họp:")
        log("  VD: http://localhost:3000/meetings/abc-123-def")
        log("  Hoặc chỉ nhập UUID: abc-123-def")
        raw = input("\n  > ").strip()
        if raw:
            existing_meeting_id = extract_meeting_id(raw)
            log(f"  → Meeting ID: {existing_meeting_id}")
        else:
            log("  Không có input. Chuyển sang mode tự tạo.")

    # ── Run tests ──
    results = {}
    for key in scenarios_to_run:
        passed, task_count = run_test(key, existing_meeting_id=existing_meeting_id)
        results[key] = {"passed": passed, "tasks": task_count}

    # ── Final summary ──
    print()
    separator("█")
    print("  KẾT QUẢ TỔNG HỢP")
    separator("█")

    all_passed = True
    for key, result in results.items():
        name = SCENARIOS[key]["name"]
        icon = "✅ PASS" if result["passed"] else "❌ FAIL"
        tasks = result["tasks"]
        print(f"  {icon}  Scenario {key}: {name} ({tasks} tasks)")
        if not result["passed"]:
            all_passed = False

    print()
    if all_passed:
        print("  🎉 TẤT CẢ SCENARIOS ĐỀU PASS!")
    else:
        print("  ⚠️  CÓ SCENARIO FAIL — kiểm tra output ở trên.")
    print()


if __name__ == "__main__":
    main()
