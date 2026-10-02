import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def create_document():
    doc = docx.Document()
    
    # Page setup (A4, 1-inch margins)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)
        
    # Styles
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = title_p.add_run("TÀI LIỆU THUYẾT MINH SẢN PHẨM\n")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(13)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(30, 64, 175)
    
    r_main = title_p.add_run("HỆ ĐIỀU HÀNH NGHI THỨC CUỘC HỌP SỐ DOANH NGHIỆP\nAXIOM (AXIOM DX-OS)")
    r_main.font.name = "Calibri"
    r_main.font.size = Pt(20)
    r_main.font.bold = True
    r_main.font.color.rgb = RGBColor(15, 23, 42)
    
    r_en = title_p.add_run("\nA High Security On-Premise Enterprise Meeting Protocol")
    r_en.font.name = "Calibri"
    r_en.font.size = Pt(11)
    r_en.font.italic = True
    r_en.font.color.rgb = RGBColor(100, 116, 139)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(12)
    
    # Metadata Table
    table = doc.add_table(rows=4, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    meta_data = [
        ("Lĩnh vực:", "Công nghệ thông tin – Chuyển đổi số doanh nghiệp (Enterprise SaaS / On-Premise AI)"),
        ("Mô hình kiến trúc:", "H-P-D-I (Human – Process – Data – Intelligence)"),
        ("Môi trường triển khai:", "100% On-Premise / Private Cloud (Chủ quyền dữ liệu tuyệt đối)"),
        ("Giấy phép mã nguồn:", "MIT License (Mã nguồn mở)")
    ]
    
    for i, (label, val) in enumerate(meta_data):
        row = table.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.0)
        c1.width = Inches(4.7)
        
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(label)
        r0.font.bold = True
        r0.font.size = Pt(10)
        
        p1 = c1.paragraphs[0]
        r1 = p1.add_run(val)
        r1.font.size = Pt(10)
        
        set_cell_background(c0, "F1F5F9")
        set_cell_background(c1, "F8FAFC")
        
    doc.add_paragraph().paragraph_format.space_after = Pt(16)
    
    def add_heading_1(text):
        h = doc.add_heading(text, level=1)
        h.paragraph_format.space_before = Pt(16)
        h.paragraph_format.space_after = Pt(6)
        for r in h.runs:
            r.font.name = "Calibri"
            r.font.size = Pt(14)
            r.font.bold = True
            r.font.color.rgb = RGBColor(30, 64, 175)
        return h
        
    def add_heading_2(text):
        h = doc.add_heading(text, level=2)
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(4)
        for r in h.runs:
            r.font.name = "Calibri"
            r.font.size = Pt(12)
            r.font.bold = True
            r.font.color.rgb = RGBColor(15, 23, 42)
        return h

    def add_p(text):
        p = doc.add_paragraph(text)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        for r in p.runs:
            r.font.name = "Calibri"
            r.font.size = Pt(11)
        return p

    def add_bullet(text, bold_prefix=""):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_b = p.add_run(bold_prefix)
            r_b.font.name = "Calibri"
            r_b.font.size = Pt(11)
            r_b.font.bold = True
        r_t = p.add_run(text)
        r_t.font.name = "Calibri"
        r_t.font.size = Pt(11)
        return p

    # --- SECTION 1 ---
    add_heading_1("1. BÀI TOÁN / VẤN ĐỀ THỰC TẾ CẦN GIẢI QUYẾT")
    add_p("Trong kỷ nguyên làm việc hybrid và chuyển đổi số, hội nghị trực tuyến là kênh trao đổi thiết yếu của mọi doanh nghiệp. Tuy nhiên, các tổ chức đang phải đối mặt với 5 vấn nạn lớn gây tổn thất nặng nề về chi phí và bảo mật:")
    
    add_bullet(" Các nghiên cứu chỉ ra rằng hơn 67% số cuộc họp bị đánh giá là lãng phí. Nguyên nhân xuất phát từ việc họp tự phát, không chuẩn bị nghị trình (Agenda) trước khi họp, thành viên tham dự bị động, thảo luận lan man và kết thúc không có kết luận cụ thể.", "1.1. Vấn nạn 'Họp rác' và thiếu kỷ luật tổ chức:")
    add_bullet(" Đại đa số doanh nghiệp đang họp qua các nền tảng SaaS công cộng của nước ngoài (Zoom, Teams, Meet). Mọi trao đổi chiến lược, bí mật kinh doanh, số liệu tài chính đều lưu trữ trên đám mây bên thứ ba, tiềm ẩn nguy cơ rò rỉ và vi phạm luật an toàn thông tin (ISO 27001, GDPR, tuân thủ On-Premise ngành Ngân hàng, Y tế, Nhà nước).", "1.2. Mất chủ quyền dữ liệu và rủi ro rò rỉ bí mật:")
    add_bullet(" Việc ghi chép biên bản cuộc họp (MoM) thủ công mất nhiều giờ của thư ký, dễ bỏ sót quyết định. Sau cuộc họp, các cam kết và đầu việc (Action Items) bị trôi vào nhóm chat, không được gán người phụ trách và không đồng bộ với hệ thống quản lý dự án (Jira, Trello, Kanban).", "1.3. Đứt gãy luồng công việc hậu cuộc họp (Task Leakage):")
    add_bullet(" Các cuộc họp đa quốc gia gặp rào cản ngôn ngữ. Công cụ dịch tự động đám mây thường dịch máy móc, làm sai lệch hoặc ngô nghê hóa các thuật ngữ công nghệ, tài chính chuyên sâu.", "1.4. Rào cản ngôn ngữ và sai lệch thuật ngữ chuyên ngành:")
    add_bullet(" Đánh giá ứng viên trong các buổi phỏng vấn trực tuyến thường dựa vào cảm tính cá nhân của người phỏng vấn, thiếu cơ chế đối soát tự động giữa transcript phỏng vấn với tiêu chí tuyển dụng (JD) và thiếu quy trình phê duyệt hai tầng chặt chẽ giữa Quản lý chuyên môn và Ban Lãnh đạo.", "1.5. Phỏng vấn tuyển dụng thiếu khách quan:")

    # --- SECTION 2 ---
    add_heading_1("2. GIẢI PHÁP VÀ CÁC CHỨC NĂNG CHÍNH CỦA SẢN PHẨM")
    add_p("Axiom là một Hệ điều hành nghi thức cuộc họp số (Digital Enterprise Operating System - DX-OS) được xây dựng theo mô hình 4 tầng H-P-D-I:")
    
    add_bullet(" Giao diện B2B Focus Mode, LiveKit WebRTC SFU Mesh độ trễ < 200ms, phụ đề thời gian thực, thiết kế chống nhảy giao diện (Anti-CLS).", "• H (Human):")
    add_bullet(" Cổng kiểm duyệt Agenda Gate bắt buộc có nghị trình chi tiết ≥ 20 ký tự mới được tạo phòng; phân quyền tổ chức RBAC đa cấp.", "• P (Process):")
    add_bullet(" 100% On-Premise / Private Cloud, PostgreSQL, Redis; dữ liệu âm thanh và tài liệu tuyệt đối không bao giờ rò rỉ ra ngoài Internet.", "• D (Data):")
    add_bullet(" Silero VAD v5, Faster-Whisper, CTranslate2 EN↔VI, Local LLM Auto MoM bóc tách quyết định và đồng bộ 1-click sang Jira Kanban.", "• I (Intelligence):")

    add_heading_2("Các chức năng chính của Axiom:")
    add_bullet(" Cổng logic kép trên Frontend và Backend từ chối cấp phòng nếu người khởi tạo không chuẩn bị nghị trình và mục tiêu chi tiết (tối thiểu 20 ký tự).", "1. Cổng kiểm duyệt kỷ luật nghị trình (Agenda Gate):")
    add_bullet(" Gọi nhóm video Full HD, chia sẻ màn hình, độ trễ truyền dẫn cực thấp dưới 200ms với hạ tầng LiveKit SFU tự lưu trữ.", "2. Phòng họp trực tuyến bảo mật (Axiom LiveKit Room):")
    add_bullet(" Nhận dạng giọng nói tức thì qua WebSocket nhị phân, hiển thị phụ đề song ngữ trực tiếp, bảo lưu nguyên vẹn thuật ngữ công nghệ.", "3. Phụ đề & Phiên dịch song ngữ thời gian thực:")
    add_bullet(" Tự động tổng hợp Executive Summary, Key Decisions và Action Items có đầy đủ người phụ trách và hạn chót trong vòng 60 giây sau khi kết thúc cuộc họp.", "4. Tự động hóa biên bản cuộc họp bằng AI (AI MoM):")
    add_bullet(" Chuyển hóa toàn bộ Action Items thành các thẻ công việc trên bảng Kanban nội bộ hoặc xuất sang Jira chỉ với 1 cú click.", "5. Tích hợp Mini Jira Kanban Board & 1-Click Sync:")
    add_bullet(" Biến toàn bộ các cuộc họp thành tài sản tri thức số có thể tìm kiếm ngữ nghĩa (Semantic Search) chính xác theo từng người nói và mốc thời gian.", "6. Trung tâm tri thức số doanh nghiệp (Knowledge Hub):")
    add_bullet(" Quản lý hồ sơ ứng viên, phòng phỏng vấn trực tuyến tích hợp AI nhận định sơ bộ (AI Evaluation), cơ chế thẩm định chuyên môn (HR Review) và phê duyệt tiếp nhận (Owner Approval).", "7. Quy trình tuyển dụng và phỏng vấn có kiểm soát 2 tầng:")
    add_bullet(" Quản trị tổ chức đa phòng ban, phân quyền RBAC và ghi nhận nhật ký kiểm toán bảo mật phục vụ công tác thanh tra tuân thủ.", "8. Bảng điều khiển Quản trị & Nhật ký Kiểm toán:")

    # --- SECTION 3 ---
    add_heading_1("3. CÔNG NGHỆ SỬ DỤNG TRONG HỆ THỐNG")
    
    t_tech = doc.add_table(rows=9, cols=3)
    t_tech.alignment = WD_TABLE_ALIGNMENT.CENTER
    tech_headers = ["Tầng kiến trúc", "Công nghệ chính", "Mục đích & Ưu điểm vượt trội"]
    for j, h_text in enumerate(tech_headers):
        cell = t_tech.rows[0].cells[j]
        set_cell_background(cell, "1E40AF")
        p = cell.paragraphs[0]
        r = p.add_run(h_text)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)
        r.font.size = Pt(10)
        
    tech_data = [
        ("Frontend Layer", "Next.js 16 (App Router), React 19, TypeScript", "Server Components tải trang nhanh chóng, tối ưu SEO, bảo đảm an toàn kiểu dữ liệu tuyệt đối."),
        ("Giao diện & UI", "Tailwind CSS v4, Shadcn UI, GSAP", "Thiết kế B2B Enterprise hiện đại, tuân thủ nghiêm ngặt quy tắc chống biến dạng giao diện (Anti-CLS)."),
        ("Backend Core", "FastAPI (Python 3.12+), Pydantic V2, Uvicorn", "Xử lý bất đồng bộ (Async) hiệu năng cao, tự động sinh tài liệu OpenAPI, tương thích tự nhiên với AI/ML."),
        ("Truyền thông Real-time", "LiveKit WebRTC, Web Audio API, WebSockets", "WebRTC SFU tự lưu trữ On-Premise, độ trễ < 200ms; WebSocket streaming luồng âm thanh PCM 16kHz."),
        ("Cơ sở dữ liệu", "PostgreSQL 16, SQLAlchemy 2.0, Alembic", "Cơ sở dữ liệu quan hệ mạnh mẽ, đảm bảo tính toàn vẹn giao dịch (ACID) và quản trị lược đồ an toàn."),
        ("Bộ nhớ đệm & Queue", "Redis Enterprise Cache", "Lưu trữ phiên người dùng, quản lý hàng đợi cho các tác vụ AI hậu kỳ và phát sóng thông báo thời gian thực."),
        ("AI - STT & VAD", "Silero VAD v5, Faster-Whisper (Large-v3 / int8)", "VAD lọc khoảng lặng âm thanh trực tiếp; Faster-Whisper lượng tử hóa int8 phiên âm tiếng Việt/tiếng Anh cực nhanh."),
        ("AI - Dịch & LLM", "CTranslate2 (EN↔VI), Ollama (Qwen 2.5 / Llama 3)", "Dịch máy song ngữ ngoại tuyến tốc độ cao; Local LLM bóc tách quyết định và sinh MoM dạng JSON có cấu trúc.")
    ]
    
    for row_idx, data_row in enumerate(tech_data, start=1):
        for col_idx, text_val in enumerate(data_row):
            cell = t_tech.rows[row_idx].cells[col_idx]
            p = cell.paragraphs[0]
            r = p.add_run(text_val)
            r.font.size = Pt(9.5)
            if col_idx == 0:
                r.font.bold = True
            set_cell_background(cell, "F8FAFC" if row_idx % 2 == 0 else "FFFFFF")

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # --- SECTION 4 ---
    add_heading_1("4. CÁCH ỨNG DỤNG AI VÀ TỰ ĐỘNG HÓA TRONG SẢN PHẨM")
    add_p("Toàn bộ quy trình AI của Axiom được thiết kế theo kiến trúc Edge/On-Premise Pipeline – vận hành 100% cục bộ trên máy chủ doanh nghiệp:")
    
    add_bullet(" Phân tích năng lượng sóng âm và xác suất giọng nói ngay tại cổng WebSocket. Chỉ xử lý khi speech_prob ≥ 0.4, giúp giảm hơn 70% tải tính toán của CPU/GPU, cho phép phục vụ hàng chục phòng họp đồng thời.", "4.1. Lọc khoảng lặng với Silero VAD v5:")
    add_bullet(" Mô hình nhận dạng giọng nói được lượng tử hóa 8-bit int8 chạy trên nền CTranslate2. Tốc độ phiên âm nhanh gấp 4 lần mô hình gốc, độ trễ dưới 300ms, nhận diện chuẩn xác cả tiếng Việt và tiếng Anh.", "4.2. Nhận dạng tiếng nói tốc độ cao với Faster-Whisper:")
    add_bullet(" Thuật toán cửa sổ trượt Regex N-Gram (2 đến 8 từ) tự động loại bỏ các từ lặp lại tự nhiên ('tôi nghĩ là... tôi nghĩ là') và sửa lỗi ngắt câu trước khi lưu trữ hoặc dịch thuật.", "4.3. Khử lặp từ & Lắp bắp (Regex N-Gram Deduplicator):")
    add_bullet(" Mô hình dịch máy ngoại tuyến CTranslate2 EN↔VI với độ trễ < 150ms. Tự động nhận diện và bảo lưu nguyên vẹn các thuật ngữ chuyên ngành (Kubernetes, Docker, EBITDA, Sprint...).", "4.4. Dịch thuật song ngữ bảo toàn thuật ngữ (Term Preservation):")
    add_bullet(" Tích hợp mô hình ngôn ngữ lớn cục bộ (Qwen 2.5 8B/32B hoặc Llama-3) qua Ollama với các Modelfile chuyên biệt. Ép buộc LLM xuất dữ liệu dạng JSON có cấu trúc (Pydantic Schema) gồm: Executive Summary, Key Decisions và Action Items có đầy đủ người phụ trách và hạn chót.", "4.5. Động cơ tự động hóa biên bản cuộc họp & trích xuất việc cần làm (Auto MoM):")
    add_bullet(" Chỉ với 1 nút bấm từ biên bản cuộc họp, toàn bộ Action Items được tự động chuyển thành thẻ công việc trên bảng Kanban nội bộ hoặc đẩy qua Webhook tới Jira của doanh nghiệp.", "4.6. Tự động hóa quy trình hậu cuộc họp (1-Click Sync):")

    # --- SECTION 5 ---
    add_heading_1("5. GIÁ TRỊ VÀ KHẢ NĂNG ỨNG DỤNG ĐỐI VỚI DOANH NGHIỆP")
    
    add_heading_2("5.1. Giá trị kinh tế và Hiệu suất vận hành (ROI & Productivity)")
    add_bullet(" Nhờ cổng kiểm duyệt Agenda Gate (≥ 20 ký tự), nhân viên không thể tùy tiện lên lịch họp nếu chưa chuẩn bị mục tiêu và nội dung rõ ràng, tiết kiệm hàng nghìn giờ công lao động.", "• Giảm 40% số cuộc họp vô ích:")
    add_bullet(" Biên bản họp hoàn chỉnh cùng danh sách đầu việc có thể phát hành chỉ sau 60 giây khi cuộc họp kết thúc, thay vì mất từ 2 đến 6 tiếng ghi chép thủ công của thư ký.", "• Tiết kiệm 85% thời gian hành chính:")
    add_bullet(" Mọi cam kết và phân công trong cuộc thảo luận đều được số hóa thành thẻ Kanban có người chịu trách nhiệm và hạn chót rõ ràng.", "• Triệt tiêu 100% tình trạng bỏ quên việc (Zero Task Leakage):")
    add_bullet(" 100% dữ liệu cuộc họp, âm thanh, transcript và tri thức doanh nghiệp được lưu trữ trong mạng nội bộ, loại bỏ hoàn toàn rủi ro rò rỉ bí mật kinh doanh.", "• An toàn thông tin và Chủ quyền dữ liệu tuyệt đối:")
    add_bullet(" Bản quyền mã nguồn mở MIT, không chịu phí thuê bao leo thang theo số lượng người dùng như các phần mềm SaaS đám mây.", "• Tiết kiệm chi phí bản quyền phần mềm:")

    add_heading_2("5.2. Khả năng ứng dụng thực tế theo các lĩnh vực trọng yếu")
    add_bullet(" Nơi các cuộc họp Hội đồng quản trị, thẩm định tín dụng đòi hỏi bí mật tuyệt đối và tuân thủ kiểm toán nghiêm ngặt.", "• Ngân hàng, Tài chính & Bảo hiểm (BFSI):")
    add_bullet(" Chuẩn hóa nghi thức các phiên họp giao ban và chỉ đạo; tự động tạo lập biên bản họp và nghị quyết hành chính theo quy định văn thư.", "• Cơ quan Quản lý Nhà nước & Đơn vị Hành chính:")
    add_bullet(" Môi trường họp tập trung, tích hợp tức thì các đầu việc vào Jira/Kanban và hỗ trợ dịch thuật ngữ công nghệ song ngữ chuẩn xác.", "• Tập đoàn Công nghệ & Viễn thông:")
    add_bullet(" Hội chẩn trực tuyến an toàn, bảo vệ hồ sơ bệnh án nhạy cảm của người bệnh theo chuẩn bảo mật dữ liệu y tế.", "• Hệ thống Y tế & Bệnh viện:")

    add_heading_2("5.3. Tính khả thi trong triển khai")
    add_bullet(" Đóng gói hoàn chỉnh bằng Docker Compose, sẵn sàng vận hành trên máy chủ doanh nghiệp chỉ sau 15 phút.", "• Triển khai siêu tốc:")
    add_bullet(" Sẵn sàng nâng cấp lên cụm Kubernetes tích hợp bộ tự động co giãn HPA khi mở rộng quy mô toàn doanh nghiệp.", "• Khả năng mở rộng cao:")
    add_bullet(" Tối ưu hóa lượng tử hóa int8 cho phép hệ thống chạy mượt mà ngay trên các máy chủ có GPU phổ thông (NVIDIA RTX 3060/4060) hoặc CPU đa nhân.", "• Chi phí phần cứng tối ưu:")

    # --- SECTION 6 ---
    add_heading_1("6. THÔNG TIN MÃ NGUỒN & LIÊN KẾT DỰ ÁN")
    add_p("Toàn bộ mã nguồn, tài liệu kiến trúc kỹ thuật và hướng dẫn triển khai của dự án Axiom DX-OS được công khai minh bạch tại:")
    
    p_link = doc.add_paragraph()
    r_icon = p_link.add_run("🔗 Kho lưu trữ GitHub chính thức: ")
    r_icon.font.bold = True
    r_icon.font.size = Pt(11)
    
    r_url = p_link.add_run("https://github.com/khoazandev/Axiom-meeting-protocol.git")
    r_url.font.name = "Consolas"
    r_url.font.bold = True
    r_url.font.size = Pt(11.5)
    r_url.font.color.rgb = RGBColor(37, 99, 235)
    
    add_p("Giấy phép bản quyền: MIT License (Tự do sử dụng, tùy biến và triển khai thương mại).")
    
    output_path = os.path.abspath("THUYET_MINH_SAN_PHAM.docx")
    doc.save(output_path)
    print(f"SUCCESS: Created Word document at {output_path}")

if __name__ == "__main__":
    create_document()
