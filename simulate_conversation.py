import requests
import time
import re
import datetime
import sys

# Khắc phục lỗi hiển thị Unicode trên Windows console
sys.stdout.reconfigure(encoding='utf-8')

# Cấu hình API Backend (Docker đang map cổng 8001 ra ngoài)
BASE_URL = "http://localhost:8001/api/v1"

CONVERSATION = [
    # Mở đầu và thảo luận tính năng mới
    ("Khoa", "Chào mọi người. Chúng ta bắt đầu cuộc họp về lộ trình phát triển Q4 nhé. Hôm nay mình sẽ tập trung vào tính năng AI Assistant."),
    ("Phát", "Chào anh Khoa. Em đã xem qua tài liệu thiết kế ban đầu rồi, phần AI khá hứa hẹn."),
    ("Nguyên", "Chào mọi người. Về phía backend, em thấy chúng ta cần cân nhắc chi phí khi dùng API của OpenAI hoặc OpenRouter."),
    ("Khoa", "Đúng vậy. Nguyên, em hãy làm một bảng so sánh chi phí giữa các mô hình như GPT-4o-mini và Llama 3 trước thứ Sáu này nhé."),
    ("Nguyên", "Vâng ạ, em sẽ làm và gửi lên nhóm luôn. Còn về giao diện chat thì sao ạ?"),
    ("Phát", "Phần UI em dự định làm giống một cái sidebar trượt từ phải sang. Khoa thấy sao?"),
    ("Khoa", "Anh đồng ý. Chúng ta quyết định sẽ dùng thiết kế sidebar cho AI Chatbot thay vì popup nhé. Phát nhớ cập nhật lại Figma."),
    ("Phát", "Dạ rõ. Em sẽ hoàn thiện thiết kế UI/UX cho sidebar trong ngày mai."),
    
    # Chuyển sang thảo luận về module trích xuất
    ("Khoa", "Tiếp theo là phần trích xuất Task và Decision tự động. Tiến độ thế nào rồi?"),
    ("Nguyên", "Em đã viết xong luồng cho Task Extractor, chạy khá mượt với model free.")
]

def get_speaker_tokens(speakers):
    """Register and return auth tokens for a list of speaker names."""
    tokens = {}
    for speaker in speakers:
        # Xử lý tên để tạo email hợp lệ
        # Hàm đơn giản để bỏ dấu cho vài cái tên cơ bản
        name_normalized = speaker.lower().replace(' ', '_')
        name_normalized = name_normalized.replace('phát', 'phat').replace('nguyên', 'nguyen').replace('khoa', 'khoa')
        
        email = f"{name_normalized}@gmail.com"
        password = "password123"
        
        # Thử login trước
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
        if resp.status_code == 200:
            tokens[speaker] = resp.json()["access_token"]
            continue
            
        # Nếu chưa có thì đăng ký
        print(f"[*] Chưa có tài khoản cho {speaker}, đang tạo mới...")
        requests.post(f"{BASE_URL}/auth/register", json={
            "email": email, 
            "password": password, 
            "full_name": speaker
        })
        
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
        if resp.status_code == 200:
            tokens[speaker] = resp.json()["access_token"]
        else:
            print(f"[!] Lỗi khi login cho {speaker}: {resp.text}")
        
    return tokens

def main():
    print("="*50)
    print("   CÔNG CỤ TEST TRÍCH XUẤT TASK TỰ ĐỘNG (10 CÂU)")
    print("="*50)
    
    # Lấy meeting ID từ link
    link = input("\n[?] Hãy paste link phòng họp (VD: http://localhost:3001/meetings/5): ").strip()
    match = re.search(r'/meetings/([a-zA-Z0-9-]+)', link)
    if not match:
        print("[!] Link không hợp lệ. Phải có chứa /meetings/ID")
        return
        
    meeting_id = match.group(1)
    print(f"[*] Đã nhận diện Meeting ID: {meeting_id}")
    
    unique_speakers = list(set([s for s, t in CONVERSATION]))
    tokens = get_speaker_tokens(unique_speakers)
    
    print("\n[*] Bắt đầu gửi hội thoại (10 câu)...\n")
    
    for i, (speaker, text) in enumerate(CONVERSATION, 1):
        if speaker not in tokens:
            print(f"[!] Bỏ qua câu của {speaker} vì không có token.")
            continue
            
        headers = {"Authorization": f"Bearer {tokens[speaker]}"}
        
        now = datetime.datetime.now()
        start_time = now.strftime("%H:%M:%S")
        end_time = (now + datetime.timedelta(seconds=3)).strftime("%H:%M:%S")
        
        payload = {
            "content": text,
            "start_time": start_time,
            "end_time": end_time,
            "sequence": i
        }
        
        # Gọi API tạo Transcript
        resp = requests.post(
            f"{BASE_URL}/meetings/{meeting_id}/transcripts", 
            json=payload, 
            headers=headers
        )
        
        if resp.status_code == 201:
            print(f"> [{i}/30] [{speaker}]: {text}")
        else:
            print(f"[!] Lỗi gửi câu {i}: {resp.status_code} - {resp.text}")
            
        # Dừng 5 giây giữa mỗi câu để Backend kịp xử lý và tránh Rate Limit
        time.sleep(5)
        
    print("\n[+] Đã gửi xong 10 câu hội thoại!")
    print("[+] Hãy kiểm tra trên giao diện Web để xem các Task và Decision được trích xuất nhé.")

if __name__ == "__main__":
    main()
