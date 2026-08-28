import requests
import time
import re
import datetime

# Cấu hình API Backend (Docker đang map cổng 8001 ra ngoài)
BASE_URL = "http://localhost:8001/api/v1"

CONVERSATION = [
    ("Sếp Hoàng", "Chào mọi người. Chúng ta bắt đầu cuộc họp về chiến dịch marketing quý 4 nhé. Tiến độ hiện tại ra sao rồi?"),
    ("Alice", "Chào sếp. Em đã lên xong sườn nội dung cho các bài đăng mạng xã hội rồi ạ."),
    ("Sếp Hoàng", "Tốt lắm. Alice, em hãy hoàn thiện toàn bộ hình ảnh và lên lịch đăng bài trước thứ Năm tuần sau nhé."),
    ("Alice", "Vâng ạ. Em sẽ làm việc với team thiết kế để chốt hình ảnh ạ."),
    ("Sếp Hoàng", "Thế còn phần ngân sách chạy quảng cáo thì sao, Bob?"),
    ("Bob", "Dạ em đang xem lại báo cáo chi phí của quý trước. Khoảng chiều nay sẽ có con số dự tính."),
    ("Sếp Hoàng", "Đồng ý. Bob, em hãy lập chi tiết kế hoạch chạy quảng cáo trên Facebook và Google, gửi báo cáo cho anh vào sáng thứ Sáu tuần sau nhé."),
    ("Bob", "Rõ rồi sếp. Em sẽ hoàn thành kế hoạch chạy quảng cáo đúng hạn ạ."),
    ("Sếp Hoàng", "Tuyệt vời. Mọi người nhớ cập nhật trạng thái công việc lên hệ thống. Cuộc họp kết thúc tại đây."),
    ("Alice", "Dạ vâng, chào sếp và mọi người.")
]

def get_speaker_tokens(speakers):
    """Register and return auth tokens for a list of speaker names."""
    tokens = {}
    for speaker in speakers:
        email = f"{speaker.lower().replace(' ', '_').replace('ế', 'e').replace('ọ', 'o')}@gmail.com"
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
        tokens[speaker] = resp.json()["access_token"]
        
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
    
    print("\n[*] Bắt đầu gửi hội thoại...\n")
    
    for i, (speaker, text) in enumerate(CONVERSATION, 1):
        headers = {"Authorization": f"Bearer {tokens[speaker]}"}
        
        now = datetime.datetime.now()
        start_time = now.strftime("%H:%M:%S")
        end_time = (now + datetime.timedelta(seconds=2)).strftime("%H:%M:%S")
        
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
            print(f"> [{speaker}]: {text}")
        else:
            print(f"[!] Lỗi gửi câu {i}: {resp.status_code} - {resp.text}")
            
        # Dừng 2 giây giữa mỗi câu để Backend kịp lưu (và cứ 5 câu sẽ kích hoạt AI)
        time.sleep(2)
        
    print("\n[+] Đã gửi xong 10 câu!")
    print("[+] Bạn hãy quay lại màn hình trình duyệt, chờ khoảng vài giây (vì mô hình AI đang chạy nền).")
    print("[+] Các task sẽ tự động hiển thị trên Tab Note!")

if __name__ == "__main__":
    main()
