"""
Test LLM Extraction Pipeline — Direct Ollama test.

Tests the task-extractor-v2 model with:
- Time context
- Pending tasks (NOT_CONFIRMED / missing info)
- New transcript segments

Validates:
- New tasks are extracted correctly
- Pending tasks are updated when transcript provides new info
"""

import json
import sys
import requests
from datetime import datetime, timezone, timedelta


OLLAMA_URL = "http://localhost:11434"
MODEL = "task-extractor01"

VN_TZ = timezone(timedelta(hours=7))
NOW = datetime.now(VN_TZ)


def call_model(pending_tasks: list[dict], transcript: str) -> list[dict]:
    """Build payload and call Ollama, return parsed JSON array."""

    time_context = (
        f"[Ngữ cảnh hệ thống: Hôm nay là ngày "
        f"{NOW.strftime('%d/%m/%Y')}, "
        f"{NOW.strftime('%H:%M')}.]\n\n"
    )

    pending_section = "[A] PENDING TASKS\n"
    if pending_tasks:
        pending_section += json.dumps(pending_tasks, ensure_ascii=False, indent=2)
    else:
        pending_section += "[]"
    pending_section += "\n\n"

    transcript_section = f"[B] TRANSCRIPT MỚI\n{transcript}\n"

    user_content = time_context + pending_section + transcript_section

    print("=" * 70)
    print("  PROMPT GỬI CHO MODEL")
    print("=" * 70)
    print(user_content)
    print("=" * 70)

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "user", "content": user_content},
        ],
        "stream": False,
        "options": {"temperature": 0.0, "top_p": 0.1},
    }

    print(f"\n⏳ Đang gọi Ollama ({MODEL})... (có thể mất 1-3 phút trên CPU)")
    try:
        resp = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=600)
        resp.raise_for_status()
    except requests.exceptions.ConnectionError:
        print("❌ Không kết nối được Ollama! Chạy: ollama serve")
        sys.exit(1)
    except requests.exceptions.Timeout:
        print("❌ Timeout sau 10 phút!")
        sys.exit(1)

    msg = resp.json().get("message", {})
    content = msg.get("content", "").strip()
    thinking = msg.get("thinking", "").strip()

    raw = content or thinking
    if not raw:
        print("❌ Model trả về rỗng!")
        return []

    if thinking:
        print(f"\n💭 Thinking ({len(thinking)} chars):")
        print(thinking[:500])
        if len(thinking) > 500:
            print("...")

    print(f"\n📤 Content ({len(content)} chars):")
    print(content)

    # Parse JSON
    import re
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()

    try:
        result = json.loads(raw)
        if isinstance(result, list):
            return result
    except json.JSONDecodeError:
        pass

    # Try markdown block
    json_match = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", raw, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try array in text
    array_match = re.search(r"\[.*\]", raw, re.DOTALL)
    if array_match:
        try:
            return json.loads(array_match.group(0))
        except json.JSONDecodeError:
            pass

    print("❌ Không parse được JSON từ output!")
    return []


def print_tasks(tasks: list[dict], label: str):
    """Pretty print task list."""
    print(f"\n{'=' * 70}")
    print(f"  {label} ({len(tasks)} tasks)")
    print(f"{'=' * 70}")
    for i, t in enumerate(tasks, 1):
        tid = t.get("task_id", "—")
        print(f"\n  Task {i}:")
        print(f"    task_id:  {tid}")
        print(f"    task:     {t.get('task', 'N/A')}")
        print(f"    assignee: {t.get('assignee', 'null')}")
        print(f"    deadline: {t.get('deadline', 'null')}")
        print(f"    status:   {t.get('status', 'N/A')}")


def validate(tasks: list[dict], checks: list[dict]) -> bool:
    """Run validation checks on output tasks."""
    all_ok = True
    print(f"\n{'─' * 70}")
    print("  VALIDATION")
    print(f"{'─' * 70}")

    for check in checks:
        desc = check["desc"]
        passed = check["fn"](tasks)
        icon = "✅" if passed else "❌"
        print(f"  {icon} {desc}")
        if not passed:
            all_ok = False

    return all_ok


# ═══════════════════════════════════════════════════════════════════════
# TEST SCENARIOS
# ═══════════════════════════════════════════════════════════════════════

def test_1_new_tasks_only():
    """Test 1: Không có pending tasks, chỉ trích xuất task mới từ transcript."""
    print("\n\n" + "█" * 70)
    print("  TEST 1: TRÍCH XUẤT TASK MỚI (Không có pending)")
    print("█" * 70)

    pending = []
    transcript = (
        'Lan: "Minh ơi, em chuẩn bị xong nội dung cho chiến dịch quảng cáo Facebook tháng này chưa?"\n\n'
        'Minh: "Dạ em viết xong kịch bản rồi chị, đang đợi design làm ảnh."\n\n'
        'Lan: "Em hối design gửi ảnh sớm, rồi set up chiến dịch chạy thử trước ngày 25 tháng 8 nhé."\n\n'
        'Minh: "Vâng, em sẽ tạo campaign và lên lịch chạy thử. Budget ban đầu bao nhiêu ạ?"\n\n'
        'Lan: "Khoảng 5 triệu nha. Em nhớ theo dõi và báo cáo lại kết quả vào cuối tuần."'
    )

    tasks = call_model(pending, transcript)
    print_tasks(tasks, "OUTPUT")

    return validate(tasks, [
        {
            "desc": "Có ít nhất 1 task mới (task_id == null)",
            "fn": lambda ts: any(t.get("task_id") is None for t in ts),
        },
        {
            "desc": "Có task gán cho Minh",
            "fn": lambda ts: any(t.get("assignee") == "Minh" for t in ts),
        },
        {
            "desc": "Có task có deadline 2026-08-25",
            "fn": lambda ts: any("2026-08-25" in str(t.get("deadline", "")) for t in ts),
        },
        {
            "desc": "Tất cả task mới đều có task_id = null",
            "fn": lambda ts: all(t.get("task_id") is None for t in ts),
        },
    ])


def test_2_update_pending():
    """Test 2: Có pending task thiếu info, transcript mới bổ sung deadline + confirm."""
    print("\n\n" + "█" * 70)
    print("  TEST 2: CẬP NHẬT PENDING TASK (bổ sung deadline + confirm)")
    print("█" * 70)

    pending = [
        {
            "task_id": "task_abc_001",
            "task": "Thiết kế giao diện trang đăng nhập",
            "assignee": "Tuan",
            "deadline": None,
            "status": "NOT_CONFIRMED"
        },
        {
            "task_id": "task_abc_002",
            "task": "Kiểm tra và sửa lỗi module xác thực",
            "assignee": None,
            "deadline": None,
            "status": "NOT_CONFIRMED"
        },
    ]

    transcript = (
        'Anh: "Tuan ơi, phần giao diện login em hoàn thành trước ngày 20 tháng 8 được không?"\n\n'
        'Tuan: "Dạ được anh, em sẽ xong trước ngày 20."\n\n'
        'Anh: "Còn phần xác thực thì để Hùng kiểm tra nhé, deadline ngày 22 tháng 8."'
    )

    tasks = call_model(pending, transcript)
    print_tasks(tasks, "OUTPUT")

    return validate(tasks, [
        {
            "desc": "task_abc_001 vẫn giữ nguyên task_id",
            "fn": lambda ts: any(t.get("task_id") == "task_abc_001" for t in ts),
        },
        {
            "desc": "task_abc_001 có deadline 2026-08-20",
            "fn": lambda ts: any(
                t.get("task_id") == "task_abc_001" and "2026-08-20" in str(t.get("deadline", ""))
                for t in ts
            ),
        },
        {
            "desc": "task_abc_001 status = CONFIRMED (Tuan xác nhận)",
            "fn": lambda ts: any(
                t.get("task_id") == "task_abc_001" and t.get("status") == "CONFIRMED"
                for t in ts
            ),
        },
        {
            "desc": "task_abc_002 được gán assignee = Hùng",
            "fn": lambda ts: any(
                t.get("task_id") == "task_abc_002" and t.get("assignee") == "Hùng"
                for t in ts
            ),
        },
        {
            "desc": "task_abc_002 có deadline 2026-08-22",
            "fn": lambda ts: any(
                t.get("task_id") == "task_abc_002" and "2026-08-22" in str(t.get("deadline", ""))
                for t in ts
            ),
        },
        {
            "desc": "task_abc_002 status = NOT_CONFIRMED (Hùng chưa xác nhận)",
            "fn": lambda ts: any(
                t.get("task_id") == "task_abc_002" and t.get("status") == "NOT_CONFIRMED"
                for t in ts
            ),
        },
    ])


def test_3_mixed_new_and_update():
    """Test 3: Vừa có pending task cần update, vừa có task mới trong transcript."""
    print("\n\n" + "█" * 70)
    print("  TEST 3: HỖN HỢP — UPDATE PENDING + TASK MỚI")
    print("█" * 70)

    pending = [
        {
            "task_id": "task_hr_001",
            "task": "Chuẩn bị hợp đồng thử việc cho nhân viên mới",
            "assignee": "Khang",
            "deadline": None,
            "status": "NOT_CONFIRMED"
        },
    ]

    transcript = (
        'Mai: "Khang ơi, hợp đồng em in ra và đưa cho giám đốc ký trước ngày 15 tháng 9 nhé."\n\n'
        'Khang: "Dạ vâng chị, em sẽ in và đưa ký trước ngày 15/9."\n\n'
        'Mai: "À, em chuẩn bị thêm máy tính và chỗ ngồi cho 2 bạn mới luôn nha. Hoàn thành trước ngày 10 tháng 9."'
    )

    tasks = call_model(pending, transcript)
    print_tasks(tasks, "OUTPUT")

    return validate(tasks, [
        {
            "desc": "task_hr_001 giữ nguyên task_id",
            "fn": lambda ts: any(t.get("task_id") == "task_hr_001" for t in ts),
        },
        {
            "desc": "task_hr_001 deadline = 2026-09-15",
            "fn": lambda ts: any(
                t.get("task_id") == "task_hr_001" and "2026-09-15" in str(t.get("deadline", ""))
                for t in ts
            ),
        },
        {
            "desc": "task_hr_001 status = CONFIRMED (Khang xác nhận)",
            "fn": lambda ts: any(
                t.get("task_id") == "task_hr_001" and t.get("status") == "CONFIRMED"
                for t in ts
            ),
        },
        {
            "desc": "Có task MỚI (task_id = null) về chuẩn bị máy tính / chỗ ngồi",
            "fn": lambda ts: any(t.get("task_id") is None for t in ts),
        },
        {
            "desc": "Task mới có deadline 2026-09-10",
            "fn": lambda ts: any(
                t.get("task_id") is None and "2026-09-10" in str(t.get("deadline", ""))
                for t in ts
            ),
        },
    ])


def test_4_filter_noise():
    """Test 4: Lọc nhiễu — không tạo task từ câu hội thoại tức thời."""
    print("\n\n" + "█" * 70)
    print("  TEST 4: LỌC NHIỄU — Không tạo task từ hội thoại tức thời")
    print("█" * 70)

    pending = []
    transcript = (
        'Hà: "Chị Linh ơi, gửi giúp em file báo cáo tuần trước."\n\n'
        'Linh: "Chị gửi rồi nha, em check email đi."\n\n'
        'Hà: "Dạ em nhận được rồi, cảm ơn chị."\n\n'
        'Linh: "Hôm nay thời tiết đẹp quá nhỉ?"\n\n'
        'Hà: "Dạ, đúng rồi chị."'
    )

    tasks = call_model(pending, transcript)
    print_tasks(tasks, "OUTPUT")

    return validate(tasks, [
        {
            "desc": "Không có task nào được tạo (tất cả là hội thoại tức thời/tán gẫu)",
            "fn": lambda ts: len(ts) == 0,
        },
    ])


# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════

def main():
    print("=" * 70)
    print("  TEST LLM EXTRACTION PIPELINE")
    print(f"  Model: {MODEL}")
    print(f"  Ollama: {OLLAMA_URL}")
    print(f"  Time:  {NOW.strftime('%d/%m/%Y %H:%M')} (VN)")
    print("=" * 70)

    # Check Ollama connectivity
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        models = [m["name"] for m in r.json().get("models", [])]
        if not any(MODEL in m for m in models):
            print(f"\n⚠️  Model '{MODEL}' không tìm thấy! Có sẵn: {models}")
            print(f"   Chạy: ollama create {MODEL} -f docker/Modelfile.task-extractor")
            sys.exit(1)
        print(f"\n✅ Model '{MODEL}' sẵn sàng.")
    except Exception as e:
        print(f"\n❌ Không kết nối được Ollama: {e}")
        sys.exit(1)

    print("\n  Chọn test:")
    print("    1. Trích xuất task mới (không pending)")
    print("    2. Cập nhật pending task (bổ sung deadline + confirm)")
    print("    3. Hỗn hợp: update pending + task mới")
    print("    4. Lọc nhiễu (không tạo task từ chat tức thời)")
    print("    a. Chạy TẤT CẢ")
    choice = input("  > ").strip()

    results = {}

    if choice == "1":
        results["Test 1"] = test_1_new_tasks_only()
    elif choice == "2":
        results["Test 2"] = test_2_update_pending()
    elif choice == "3":
        results["Test 3"] = test_3_mixed_new_and_update()
    elif choice == "4":
        results["Test 4"] = test_4_filter_noise()
    elif choice.lower() == "a":
        results["Test 1"] = test_1_new_tasks_only()
        results["Test 2"] = test_2_update_pending()
        results["Test 3"] = test_3_mixed_new_and_update()
        results["Test 4"] = test_4_filter_noise()
    else:
        print("Lựa chọn không hợp lệ.")
        sys.exit(1)

    # Summary
    print("\n\n" + "█" * 70)
    print("  KẾT QUẢ TỔNG HỢP")
    print("█" * 70)
    all_passed = True
    for name, passed in results.items():
        icon = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {icon}  {name}")
        if not passed:
            all_passed = False

    print()
    if all_passed:
        print("  🎉 TẤT CẢ TEST ĐỀU PASS!")
    else:
        print("  ⚠️  CÓ TEST FAIL — kiểm tra output ở trên.")
    print()


if __name__ == "__main__":
    main()
