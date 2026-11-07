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
    # 1. Tổng quan lộ trình phát triển Q4 và giới thiệu tính năng AI Assistant.
    ("Khoa", "Chào mọi người. Hôm nay chúng ta sẽ bàn về lộ trình phát triển Q4 và tính năng AI Assistant mới. Mọi người đã nắm tài liệu chưa?"),
    ("Phát", "Em đã đọc tài liệu rồi anh Khoa. Có vẻ Q4 mình tập trung vào AI Assistant là chính đúng không anh?"),
    ("Trang", "Đúng rồi, em cũng thấy phần AI Assistant có nhiều use case phức tạp. Lộ trình test của em sẽ khá căng đây."),
    ("Khoa", "Chính xác. Trọng tâm Q4 là AI Assistant. Quyết định đầu tiên là chúng ta sẽ phải ra mắt AI Assistant vào cuối tháng 11 nhé."),
    ("Nguyên", "Cuối tháng 11 thì team Backend tụi em sẽ phải đẩy nhanh tốc độ tích hợp LLM rồi."),
    ("Khoa", "Nguyên chuẩn bị sẵn hạ tầng nhé. Còn Trang, em bắt đầu lên Test Plan cho AI Assistant từ bây giờ đi."),
    ("Trang", "Vâng anh Khoa, em nhận task lên Test Plan cho AI Assistant. Em sẽ hoàn thành bản draft trong tuần này."),
    ("Phát", "Về Frontend, em sẽ rà soát lại các UI component để chuẩn bị tích hợp khung chat AI."),
    ("Khoa", "Tốt. Phát tiến hành rà soát UI component nhé. Chốt lại là tuần sau chúng ta sẽ review Test Plan của Trang."),
    ("Trang", "Dạ rõ. Hẹn mọi người tuần sau review Test Plan."),
    ("SYSTEM", "NEXT_TOPIC"),

    # 2. Lựa chọn mô hình AI (Model): Đánh giá chi phí và độ chính xác...
    ("Khoa", "Tiếp theo là phần lựa chọn mô hình AI. Nguyên, em đánh giá GPT-4o-mini và Llama 3 thế nào?"),
    ("Nguyên", "Về chi phí, GPT-4o-mini rẻ hơn nhưng Llama 3 thì mình tự host được nên an toàn dữ liệu hơn."),
    ("Trang", "Hôm qua em test thử thì độ chính xác khi trích xuất Task/Decision của GPT-4o-mini tốt hơn hẳn Llama 3 đấy ạ."),
    ("Khoa", "Vậy chúng ta sẽ dùng GPT-4o-mini cho các module trích xuất Task/Decision nhé."),
    ("Phát", "Còn phần Chat thì sao anh? Chatbot cần phản hồi nhanh để user không phải đợi."),
    ("Nguyên", "Phần Chat thì Llama 3 phản hồi nhanh hơn nếu mình optimize tốt. Em đề xuất dùng Llama 3 cho module Chat."),
    ("Khoa", "Ok, chốt phương án: Dùng GPT-4o-mini cho trích xuất tự động và Llama 3 cho module Chat."),
    ("Khoa", "Nguyên setup các kết nối API cho hai model này ngay trong tuần này nhé."),
    ("Nguyên", "Vâng, em nhận task setup API cho GPT-4o-mini và Llama 3."),
    ("Trang", "Sau khi Nguyên setup xong, em sẽ tạo bộ test data để benchmark tốc độ phản hồi của Chatbot luôn."),
    ("Khoa", "Đồng ý. Trang nhớ gửi lại report benchmark cho anh vào thứ 2 tuần sau."),
    ("Trang", "Dạ, em note lại rồi."),
    ("SYSTEM", "NEXT_TOPIC"),

    # 3. Chốt phương án thiết kế giao diện (UI/UX) cho AI Chatbot.
    ("Khoa", "Chuyển sang UI/UX cho AI Chatbot. Phát, phương án thiết kế em chuẩn bị đến đâu rồi?"),
    ("Phát", "Em có hai phương án: Một là Chatbot dạng floating widget ở góc màn hình, hai là Sidebar cố định bên phải như giao diện hiện tại."),
    ("Trang", "Dưới góc độ người dùng, em thấy floating widget hơi vướng khi đang đọc văn bản."),
    ("Nguyên", "Em cũng ủng hộ Sidebar cố định, dễ tích hợp các context menu hơn."),
    ("Khoa", "Anh cũng nghĩ nên dùng Sidebar cố định để tránh che khuất nội dung màn hình chính. Mọi người đồng ý chứ?"),
    ("Phát", "Dạ, vậy quyết định là sử dụng Sidebar cố định cho AI Chatbot. Em sẽ hoàn thiện bản thiết kế này."),
    ("Khoa", "Tốt, Phát chịu trách nhiệm hoàn thành thiết kế UI/UX Sidebar trong tuần này nhé."),
    ("Phát", "Ok anh, em sẽ gửi thiết kế vào thứ 6."),
    ("Trang", "Khi nào có thiết kế, Phát gửi qua em xem trước để lên test case UI luôn nhé."),
    ("Phát", "Nhất trí, thứ 6 anh gửi em."),
    ("SYSTEM", "NEXT_TOPIC"),

    # 4. Xử lý rủi ro kỹ thuật: Giải pháp xử lý lỗi format từ AI (Retry & Validation).
    ("Khoa", "Về phần xử lý rủi ro kỹ thuật, làm sao để tránh tình trạng AI trả về sai format JSON?"),
    ("Nguyên", "Em đề xuất áp dụng cơ chế Retry tối đa 3 lần. Nếu vẫn sai, sẽ dùng thư viện Pydantic để validate và sửa lỗi cơ bản."),
    ("Trang", "Nhưng nếu Retry 3 lần thì thời gian chờ của user sẽ bị tăng lên đáng kể. Liệu có UX fallback nào không?"),
    ("Phát", "Frontend có thể show một trạng thái 'AI đang suy nghĩ thêm' để xoa dịu user trong lúc Backend retry."),
    ("Khoa", "Ý hay. Chốt là Backend áp dụng cơ chế Retry 3 lần kèm Pydantic validation, còn Frontend làm UX fallback."),
    ("Nguyên", "Vâng, em sẽ tạo task và code module Validation & Retry cho Backend."),
    ("Phát", "Em cũng nhận task làm giao diện Loading Fallback cho quá trình Retry của AI."),
    ("Trang", "Em sẽ viết các kịch bản test để cố tình ép AI trả về format sai, xem cơ chế Retry hoạt động tốt không."),
    ("Khoa", "Hoàn hảo. Mọi người cố gắng phối hợp chặt chẽ phần này để tránh lỗi khi release."),
    ("SYSTEM", "NEXT_TOPIC"),

    # 5. Kế hoạch thử nghiệm: Lên lịch User Testing (Beta test) và chạy Performance Test bằng k6.
    ("Khoa", "Cuối cùng là kế hoạch thử nghiệm. Ai sẽ phụ trách chạy Performance Test?"),
    ("Nguyên", "Phần Performance Test bằng k6, em sẽ viết kịch bản test chịu tải cho các API AI. Chắc cần khoảng 2 ngày."),
    ("Trang", "Em sẽ hỗ trợ Nguyên chạy test k6. Còn phần User Testing với nhóm Beta tester thì sao?"),
    ("Phát", "Em có thể setup môi trường và hướng dẫn nhóm Beta tester dùng thử tính năng Chatbot."),
    ("Khoa", "Tuyệt vời. Quyết định: Phát phụ trách User Testing, Nguyên và Trang phụ trách Performance Test bằng k6."),
    ("Khoa", "Các bạn lên kịch bản test và chạy thử toàn bộ hệ thống trước ngày 15 nhé. Có issue gì báo cáo lại anh ngay."),
    ("Phát", "Dạ rõ. Em sẽ lên lịch với nhóm Beta tester vào ngày 14."),
    ("Nguyên", "Kịch bản k6 em sẽ hoàn thành vào ngày mai và tiến hành chạy test luôn."),
    ("Trang", "Em sẽ tổng hợp bug report hàng ngày để team kịp fix."),
    ("Khoa", "Cảm ơn mọi người. Hôm nay cuộc họp của chúng ta cực kỳ hiệu quả. Chào mọi người nhé!"),
    ("SYSTEM", "NEXT_TOPIC")
]

def get_speaker_tokens(speakers):
    """Register and return auth tokens for a list of speaker names."""
    tokens = {}
    import unicodedata
    for speaker in speakers:
        name_normalized = unicodedata.normalize('NFKD', speaker.lower()).encode('ASCII', 'ignore').decode('utf-8')
        name_normalized = name_normalized.replace(' ', '_')
        
        email = f"{name_normalized}@gmail.com"
        password = "password123"
        
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
        if resp.status_code == 200:
            tokens[speaker] = resp.json()["access_token"]
            continue
            
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
    print("   CÔNG CỤ TEST TRÍCH XUẤT TASK TỰ ĐỘNG (50 CÂU)")
    print("="*50)
    
    link = input("\n[?] Hãy paste link phòng họp (VD: http://localhost:3001/meetings/5): ").strip()
    match = re.search(r'/meetings/([a-zA-Z0-9-]+)', link)
    if not match:
        print("[!] Link không hợp lệ. Phải có chứa /meetings/ID")
        return
        
    meeting_id = match.group(1)
    print(f"[*] Đã nhận diện Meeting ID: {meeting_id}")
    
    unique_speakers = list(set([s for s, t in CONVERSATION if s != "SYSTEM"]))
    tokens = get_speaker_tokens(unique_speakers)
    
    print(f"\n[*] Đã chuẩn bị xong token cho {len(unique_speakers)} người: {', '.join(unique_speakers)}")
    
    # Bước bắt đầu họp
    input("\n[>>>] Nhấn ENTER để BẮT ĐẦU HỌP (Kích hoạt Topic 1) ...")
    admin_token = tokens.get("Khoa") or list(tokens.values())[0]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Bắt đầu topic đầu tiên ngay lập tức
    print("\n[>>>] Đang khởi động Topic đầu tiên...")
    resp = requests.post(f"{BASE_URL}/meetings/{meeting_id}/topics/next", headers=headers)
    if resp.status_code == 200:
        print("[+] Đã bắt đầu topic 1 thành công!")
    else:
        print(f"[!] Lỗi chuyển topic: {resp.status_code} - {resp.text}")

    print(f"\n[*] Bắt đầu gửi hội thoại (delay 0.2s giữa các câu)...\n")
    
    sequence = 1
    for speaker, text in CONVERSATION:
        if speaker == "SYSTEM" and text == "NEXT_TOPIC":
            input("\n[>>>] Nhấn ENTER để CHUYỂN SANG TOPIC TIẾP THEO (Gửi lệnh Next Topic) ...")
            resp = requests.post(f"{BASE_URL}/meetings/{meeting_id}/topics/next", headers=headers)
            if resp.status_code == 200:
                print("[+] Đã chuyển topic thành công!")
            else:
                print(f"[!] Lỗi chuyển topic: {resp.status_code} - {resp.text}")
            continue

        if speaker not in tokens:
            print(f"[!] Bỏ qua câu của {speaker} vì không có token.")
            continue
            
        speaker_headers = {"Authorization": f"Bearer {tokens[speaker]}"}
        
        now = datetime.datetime.now()
        start_time = now.strftime("%H:%M:%S")
        end_time = (now + datetime.timedelta(seconds=3)).strftime("%H:%M:%S")
        
        payload = {
            "content": text,
            "start_time": start_time,
            "end_time": end_time,
            "sequence": sequence
        }
        
        resp = requests.post(
            f"{BASE_URL}/meetings/{meeting_id}/transcripts", 
            json=payload, 
            headers=speaker_headers
        )
        
        if resp.status_code == 201:
            print(f"> [{sequence}] [{speaker}]: {text}")
        else:
            print(f"[!] Lỗi gửi câu {sequence}: {resp.status_code} - {resp.text}")
            
        sequence += 1
        time.sleep(0.2)
        
    print("\n[+] Đã gửi xong toàn bộ hội thoại!")
    print("[+] Hãy kiểm tra trên giao diện Web để xem các Task và Decision được trích xuất nhé.")

if __name__ == "__main__":
    main()
