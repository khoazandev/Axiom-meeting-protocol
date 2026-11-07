"""
Clean Reset and Seed Script for Axiom Enterprise Meeting Protocol.
Seeds exactly 4 user accounts:
1. Owner: admin@axiom.com
2. Manager (HR): manager@axiom.com
3. Member (in HR department): member@axiom.com
4. Unjoined User (not joined company): guest@axiom.com
"""

import datetime
from datetime import timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.backend import models, database
from src.backend.core.security import hash_password
from src.backend.seeds.seed_rbac import seed_roles_and_permissions


def run_clean_reset():
    print("==================================================")
    print("   AXIOM DATABASE CLEAN RESET & SEED SCRIPT")
    print("==================================================")

    engine = database.engine

    print("1. Dropping all existing tables...")
    models.database.Base.metadata.drop_all(bind=engine)

    print("2. Re-creating all tables from schema...")
    models.database.Base.metadata.create_all(bind=engine)

    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        print("3. Seeding RBAC roles and permissions...")
        seed_roles_and_permissions(db)

        roles = {r.name: r for r in db.query(models.Role).all()}
        owner_role = roles["OWNER"]
        admin_role = roles["ADMIN"]
        manager_role = roles["MANAGER"]
        member_role = roles["MEMBER"]

        review_perm = db.query(models.Permission).filter_by(code="recruitment.review").first()
        manage_perm = db.query(models.Permission).filter_by(code="recruitment.manage").first()
        read_all_perm = db.query(models.Permission).filter_by(code="recruitment.read_all").first()

        print("4. Creating 4 core user accounts and primary Organization...")
        # 1. Owner / Super Admin
        admin_user = models.User(
            email="admin@axiom.com",
            full_name="System Admin",
            password_hash=hash_password("password123"),
            avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=faces",
            is_active=True,
            job_title="Chủ tịch Điều Hành (Executive Owner)",
            provider="local",
        )
        db.add(admin_user)
        db.flush()

        # Primary Organization
        org = models.Organization(
            name="Axiom Enterprise",
            created_by_id=admin_user.id,
        )
        db.add(org)
        db.flush()

        # Owner Org Membership
        db.add(models.OrganizationMember(
            organization_id=org.id,
            user_id=admin_user.id,
            role_id=owner_role.id,
            status=models.OrgMemberStatusEnum.ACTIVE,
        ))

        # 2. Manager (HR Department)
        manager_user = models.User(
            email="manager@axiom.com",
            full_name="Phạm Thu Hương",
            password_hash=hash_password("password123"),
            avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces",
            is_active=True,
            job_title="Trưởng Bộ Phận Nhân Sự & Tuyển Dụng",
            provider="local",
        )
        db.add(manager_user)
        db.flush()

        mgr_om = models.OrganizationMember(
            organization_id=org.id,
            user_id=manager_user.id,
            role_id=manager_role.id,
            status=models.OrgMemberStatusEnum.ACTIVE,
        )
        db.add(mgr_om)
        db.flush()

        # Grant recruitment permissions to HR Manager
        for perm in [review_perm, manage_perm, read_all_perm]:
            if perm:
                db.add(models.OrganizationMemberPermission(
                    member_id=mgr_om.id,
                    permission_id=perm.id,
                    granted_by_id=admin_user.id,
                ))

        # 3. Member (belonging to this company and in HR Department)
        member_user = models.User(
            email="member@axiom.com",
            full_name="Nguyễn Văn An",
            password_hash=hash_password("password123"),
            avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces",
            is_active=True,
            job_title="Chuyên viên Tuyển Dụng & Vận Hành",
            provider="local",
        )
        db.add(member_user)
        db.flush()

        member_om = models.OrganizationMember(
            organization_id=org.id,
            user_id=member_user.id,
            role_id=member_role.id,
            status=models.OrgMemberStatusEnum.ACTIVE,
        )
        db.add(member_om)
        db.flush()

        # 4. User who has NOT joined the company (no org membership)
        guest_user = models.User(
            email="guest@axiom.com",
            full_name="Trần Minh Quân (Chưa gia nhập)",
            password_hash=hash_password("password123"),
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
            is_active=True,
            job_title="Thành viên tự do",
            provider="local",
        )
        db.add(guest_user)
        db.flush()

        # 5. AI Department: 1 Manager and 3 Members
        ai_manager = models.User(
            email="long.le@axiom.com",
            full_name="Lê Hoàng Long",
            password_hash=hash_password("password123"),
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
            is_active=True,
            job_title="Trưởng Bộ Phận Kỹ Thuật AI & Nghiên Cứu R&D",
            phone="0912 345 678",
            provider="local",
        )
        ai_member1 = models.User(
            email="ngoc.tran@axiom.com",
            full_name="Trần Bảo Ngọc",
            password_hash=hash_password("password123"),
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces",
            is_active=True,
            job_title="Kỹ sư Trí tuệ Nhân tạo Cao cấp (Senior AI Engineer)",
            phone="0923 456 789",
            provider="local",
        )
        ai_member2 = models.User(
            email="huy.dang@axiom.com",
            full_name="Đặng Quốc Huy",
            password_hash=hash_password("password123"),
            avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces",
            is_active=True,
            job_title="Kỹ sư Dữ liệu & MLOps (MLOps Platform Engineer)",
            phone="0934 567 890",
            provider="local",
        )
        ai_member3 = models.User(
            email="my.vo@axiom.com",
            full_name="Võ Thảo My",
            password_hash=hash_password("password123"),
            avatar_url="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces",
            is_active=True,
            job_title="Kỹ sư Xử lý Ngôn ngữ Tự nhiên (NLP Specialist)",
            phone="0945 678 901",
            provider="local",
        )
        db.add_all([ai_manager, ai_member1, ai_member2, ai_member3])
        db.flush()

        # Org memberships for AI team
        db.add(models.OrganizationMember(
            organization_id=org.id,
            user_id=ai_manager.id,
            role_id=manager_role.id,
            status=models.OrgMemberStatusEnum.ACTIVE,
        ))
        for mem in [ai_member1, ai_member2, ai_member3]:
            db.add(models.OrganizationMember(
                organization_id=org.id,
                user_id=mem.id,
                role_id=member_role.id,
                status=models.OrgMemberStatusEnum.ACTIVE,
            ))
        db.flush()

        print("5. Creating Departments...")
        hr_dept = models.Department(
            organization_id=org.id,
            name="Bộ Phận Nhân Sự & Tuyển Dụng",
            description="[icon:badge] Quản lý nhân sự, chính sách đãi ngộ và điều hành tuyển dụng ứng viên",
        )
        ai_dept = models.Department(
            organization_id=org.id,
            name="Bộ Phận Kỹ Thuật AI & Nghiên Cứu R&D",
            description="[icon:psychology] Nghiên cứu mô hình ngôn ngữ lớn (LLM), xử lý tiếng nói thời gian thực và kiến trúc AI On-Premise",
        )
        eng_dept = models.Department(
            organization_id=org.id,
            name="Bộ Phận Kỹ Thuật & Công Nghệ",
            description="[icon:code] Nghiên cứu phát triển AI Protocol, WebRTC realtime và tối ưu hóa hạ tầng On-Premise",
        )
        prod_dept = models.Department(
            organization_id=org.id,
            name="Bộ Phận Sản Phẩm & Thiết Kế",
            description="[icon:palette] Định hình chiến lược sản phẩm, trải nghiệm người dùng UI/UX và chuẩn hóa quy trình",
        )
        fin_dept = models.Department(
            organization_id=org.id,
            name="Bộ Phận Tài Chính & Vận Hành",
            description="[icon:trending_up] Quản trị ngân sách, điều phối chi phí và tuân thủ chuẩn mực tài chính doanh nghiệp",
        )
        db.add_all([hr_dept, ai_dept, eng_dept, prod_dept, fin_dept])
        db.flush()

        # Department Memberships
        db.add_all([
            # HR Department
            models.DepartmentMember(
                department_id=hr_dept.id,
                user_id=manager_user.id,
                role_id=manager_role.id,
            ),
            models.DepartmentMember(
                department_id=hr_dept.id,
                user_id=member_user.id,
                role_id=member_role.id,
            ),
            # AI & R&D Department
            models.DepartmentMember(
                department_id=ai_dept.id,
                user_id=ai_manager.id,
                role_id=manager_role.id,
            ),
            models.DepartmentMember(
                department_id=ai_dept.id,
                user_id=ai_member1.id,
                role_id=member_role.id,
            ),
            models.DepartmentMember(
                department_id=ai_dept.id,
                user_id=ai_member2.id,
                role_id=member_role.id,
            ),
            models.DepartmentMember(
                department_id=ai_dept.id,
                user_id=ai_member3.id,
                role_id=member_role.id,
            ),
        ])
        db.flush()

        print("6. Seeding Jira Project & Issues...")
        jira_project = models.JiraProject(
            name="Axiom Operations & Talent",
            key="AXM",
            created_by_id=manager_user.id,
            organization_id=org.id,
            department_id=hr_dept.id,
        )
        db.add(jira_project)
        db.flush()

        now = datetime.datetime.now(timezone.utc)
        issues_data = [
            ("AXM-1", "Thiết lập tiêu chuẩn đánh giá năng lực ứng viên AI", "Xây dựng competency rubric theo khung chuẩn cho các vị trí kỹ thuật", models.IssueTypeEnum.TASK, models.IssueStatusEnum.IN_PROGRESS, models.IssuePriorityEnum.HIGH, member_user.id, manager_user.id, now + timedelta(days=4)),
            ("AXM-2", "Hoàn thiện quy trình tiếp nhận nhân sự Onboarding", "Chuẩn hóa tài liệu chào đón thành viên mới và kích hoạt tài khoản hệ thống", models.IssueTypeEnum.STORY, models.IssueStatusEnum.DONE, models.IssuePriorityEnum.HIGH, member_user.id, manager_user.id, now - timedelta(days=1)),
            ("AXM-3", "Tối ưu hóa bảng khảo sát phỏng vấn kỹ thuật trực tuyến", "Tích hợp biểu mẫu đánh giá tự động dựa trên biên bản phòng họp LiveKit", models.IssueTypeEnum.TASK, models.IssueStatusEnum.TODO, models.IssuePriorityEnum.MEDIUM, member_user.id, manager_user.id, now + timedelta(days=10)),
            ("AXM-4", "Xây dựng chính sách bảo lưu dữ liệu tuyển dụng", "Thiết lập thời hạn lưu trữ hồ sơ tự động xóa theo quy chuẩn bảo mật doanh nghiệp", models.IssueTypeEnum.STORY, models.IssueStatusEnum.DONE, models.IssuePriorityEnum.CRITICAL, manager_user.id, admin_user.id, now - timedelta(days=3)),
        ]

        for key, summary, desc, itype, istatus, ipriority, assignee_id, reporter_id, due_d in issues_data:
            db.add(models.Issue(
                project_id=jira_project.id,
                department_id=hr_dept.id,
                key=key,
                summary=summary,
                description=desc,
                type=itype,
                status=istatus,
                priority=ipriority,
                assignee_id=assignee_id,
                reporter_id=reporter_id,
                due_date=due_d,
            ))
        # AI Department Jira Project & Issues
        jira_ai_project = models.JiraProject(
            name="Axiom AI Engine & Protocol",
            key="AIE",
            created_by_id=ai_manager.id,
            organization_id=org.id,
            department_id=ai_dept.id,
            description="Dự án phát triển lõi trí tuệ nhân tạo, LLM context router và audio transcription protocol",
        )
        db.add(jira_ai_project)
        db.flush()

        ai_issues_data = [
            ("AIE-1", "Tối ưu hóa pipeline suy luận Ollama LLM độ trễ thấp", "Triển khai lượng tử hóa mô hình 4-bit và cấu hình streaming token cho trợ lý hội nghị", models.IssueTypeEnum.TASK, models.IssueStatusEnum.IN_PROGRESS, models.IssuePriorityEnum.HIGH, ai_member1.id, ai_manager.id, now + timedelta(days=5)),
            ("AIE-2", "Xây dựng hạ tầng MLOps tự động hóa kiểm thử benchmark", "Đóng gói Docker model runner và tích hợp script đo đạc throughput phần cứng cục bộ", models.IssueTypeEnum.STORY, models.IssueStatusEnum.DONE, models.IssuePriorityEnum.MEDIUM, ai_member2.id, ai_manager.id, now - timedelta(days=2)),
            ("AIE-3", "Tích hợp mô hình bóc tách thực thể và phân loại nhiệm vụ (NER)", "Huấn luyện bộ nhận diện action items từ biên bản âm thanh cuộc họp thời gian thực", models.IssueTypeEnum.TASK, models.IssueStatusEnum.IN_PROGRESS, models.IssuePriorityEnum.CRITICAL, ai_member3.id, ai_manager.id, now + timedelta(days=7)),
            ("AIE-4", "Chuẩn hóa kiến trúc bảo mật bộ nhớ đệm Embeddings Vector DB", "Thiết lập cơ chế mã hóa AES-256 cho vector embeddings tri thức hội nghị", models.IssueTypeEnum.TASK, models.IssueStatusEnum.TODO, models.IssuePriorityEnum.HIGH, ai_member1.id, ai_manager.id, now + timedelta(days=12)),
        ]
        for key, summary, desc, itype, istatus, ipriority, assignee_id, reporter_id, due_d in ai_issues_data:
            db.add(models.Issue(
                project_id=jira_ai_project.id,
                department_id=ai_dept.id,
                key=key,
                summary=summary,
                description=desc,
                type=itype,
                status=istatus,
                priority=ipriority,
                assignee_id=assignee_id,
                reporter_id=reporter_id,
                due_date=due_d,
            ))
        db.flush()

        print("7. Seeding Recruitment Policy & 2 Professional Job Openings...")
        policy = models.RecruitmentPolicy(
            organization_id=org.id,
            retention_days=180,
        )
        db.add(policy)
        db.flush()

        import json

        # Opening 1: Senior AI & Fullstack Platform Engineer
        ai_rubric = {
            "passing_score": 50,
            "duration_minutes": 30,
            "questions": [
                {
                    "id": "q1",
                    "type": "MULTIPLE_CHOICE",
                    "text": "Trong kiến trúc WebRTC Realtime kết hợp với LLM Streaming Audio, kỹ thuật nào sau đây quan trọng nhất để giảm thiểu độ trễ First Token Latency (TTFT) xuống dưới 500ms?",
                    "options": [
                        "A. Đợi mô hình sinh toàn bộ câu văn bản hoàn chỉnh rồi mới chuyển qua TTS tổng hợp âm thanh",
                        "B. Áp dụng kỹ thuật Streaming Token Chunking kết hợp Voice Activity Detection (VAD) và bộ đệm audio trượt",
                        "C. Tăng kích thước bộ nhớ đệm Buffer size lên 10 giây để tránh nghẽn mạng",
                        "D. Chuyển toàn bộ dữ liệu audio sang định dạng WAV 32-bit không nén trước khi truyền tải",
                    ],
                    "correct_option": "B",
                    "required": True,
                    "points": 20,
                },
                {
                    "id": "q2",
                    "type": "ESSAY",
                    "text": "Hãy trình bày giải pháp kiến trúc của bạn khi tích hợp mô hình On-Premise LLM (như Qwen/Llama) với luồng âm thanh WebRTC SFU (LiveKit) để hỗ trợ dịch và tóm tắt cuộc họp thời gian thực?",
                    "options": [],
                    "required": True,
                    "points": 30,
                    "rubric": "Đánh giá hiểu biết về WebRTC Audio Tracks, WebSocket pipeline, xử lý bất đồng bộ asyncio và tối ưu hóa suy luận Ollama/vLLM.",
                },
                {
                    "id": "q3",
                    "type": "ESSAY",
                    "text": "Bạn xử lý bài toán đồng bộ hóa trạng thái phiên họp phân tán, ghi nhận phát biểu đa luồng và chống xung đột dữ liệu (Race Condition) trong hệ thống hội nghị điều hành ra sao?",
                    "options": [],
                    "required": True,
                    "points": 25,
                    "rubric": "Đánh giá tư duy phân tán, cơ chế khóa optimistic/pessimistic locking, sequence versioning và thông điệp sự kiện DataChannel.",
                },
                {
                    "id": "q4",
                    "type": "ESSAY",
                    "text": "Hãy kể về một sự cố hệ thống nghiêm trọng hoặc nút thắt cổ chai hiệu năng (Performance Bottleneck) mà bạn từng trực tiếp phân tích, khắc phục và các biện pháp phòng ngừa rủi ro lâu dài?",
                    "options": [],
                    "required": True,
                    "points": 25,
                    "rubric": "Đánh giá phương pháp phân tích root-cause, giám sát profiling, tinh thần trách nhiệm và tư duy phòng ngừa rủi ro hệ thống.",
                },
            ]
        }

        ai_assessment_def = models.AssessmentDefinition(
            organization_id=org.id,
            title="Đánh Giá Năng Lực Kỹ Sư AI & Fullstack Platform",
            description="Bài kiểm tra năng lực đầu vào vị trí Kỹ Sư Trí Tuệ Nhân Tạo & Nền Tảng Fullstack Cao Cấp",
            duration_minutes=30,
            questions_json=json.dumps(ai_rubric["questions"], ensure_ascii=False),
        )
        db.add(ai_assessment_def)
        db.flush()

        opening_ai = models.JobOpening(
            organization_id=org.id,
            department_id=ai_dept.id,
            title="Kỹ Sư Trí Tuệ Nhân Tạo & Nền Tảng Fullstack Cao Cấp (Senior AI & Fullstack Platform Engineer)",
            description=(
                "Axiom Digital Enterprise tìm kiếm Senior AI & Fullstack Platform Engineer dẫn dắt thiết kế "
                "và hiện thực hóa hạ tầng AI Agentic, Realtime WebRTC Audio Protocol và các mô hình LLM suy luận On-Premise "
                "phục vụ hàng triệu phiên họp điều hành số của các tổ chức doanh nghiệp hàng đầu. Bạn sẽ trực tiếp làm việc "
                "với công nghệ tiên tiến nhất: WebRTC SFU (LiveKit), Ollama LLM, FastAPI, Next.js 15, PostgreSQL và Docker."
            ),
            requirements=(
                "• Tối thiểu 3+ năm kinh nghiệm phát triển hệ thống backend phân tán với Python (FastAPI/SQLAlchemy/AsyncIO) hoặc TypeScript (Next.js/Node.js).\n"
                "• Có kiến thức thực chiến chuyên sâu về LLM (vLLM, Ollama, Transformers, RAG Vector Search, Embeddings pipeline).\n"
                "• Nắm vững kiến trúc WebRTC, WebSocket, streaming audio/video realtime và các giao thức mạng độ trễ thấp (LiveKit SFU).\n"
                "• Tư duy kiến trúc hệ thống mở rộng cao (Scalability, Concurrency, Docker containerization, Microservices CI/CD).\n"
                "• Tinh thần trách nhiệm cao, năng lực tự chủ công việc và khả năng giải quyết các bài toán kỹ thuật phức tạp dưới áp lực cao."
            ),
            created_by_id=admin_user.id,
            assigned_hr_member_id=mgr_om.id,
            requires_assessment=True,
            assessment_definition_id=ai_assessment_def.id,
            competency_rubric_json=json.dumps(ai_rubric, ensure_ascii=False),
            status=models.JobOpeningStatusEnum.ACTIVE,
        )
        db.add(opening_ai)

        # Opening 2: Lead Talent Acquisition & HR Business Partner
        hr_rubric = {
            "passing_score": 50,
            "duration_minutes": 30,
            "questions": [
                {
                    "id": "q1",
                    "type": "MULTIPLE_CHOICE",
                    "text": "Trong phương pháp phỏng vấn hành vi chuẩn quốc tế (STAR Method), chữ viết tắt 'R' đại diện cho yếu tố nào sau đây?",
                    "options": [
                        "A. Reasoning (Lập luận logic của ứng viên)",
                        "B. Results (Kết quả cụ thể đạt được và số liệu đo lường)",
                        "C. Responsibility (Trách nhiệm được giao trong tổ chức)",
                        "D. Reaction (Phản ứng cảm xúc của người phỏng vấn)",
                    ],
                    "correct_option": "B",
                    "required": True,
                    "points": 20,
                },
                {
                    "id": "q2",
                    "type": "ESSAY",
                    "text": "Hãy xây dựng chiến lược tiếp cận, săn đầu người (Headhunting) và tuyển dụng thành công 5 Senior AI Engineers trong vòng 60 ngày với ngân sách tối ưu?",
                    "options": [],
                    "required": True,
                    "points": 30,
                    "rubric": "Đánh giá chiến lược nguồn kênh (sourcing channel), tạo dựng thương hiệu tuyển dụng, thông điệp cá nhân hóa và quản lý phễu chuyển đổi ứng viên.",
                },
                {
                    "id": "q3",
                    "type": "ESSAY",
                    "text": "Khi một ứng viên xuất sắc mà Axiom đánh giá cao nhận được thư mời nhận việc từ công ty đối thủ với mức thu nhập cao hơn 20%, bạn sẽ thương lượng và thuyết phục ứng viên ra sao?",
                    "options": [],
                    "required": True,
                    "points": 25,
                    "rubric": "Đánh giá kỹ năng đàm phán, nhấn mạnh giá trị văn hóa, lộ trình phát triển bản thân (Total Rewards) và nghệ thuật thuyết phục nhân sự cấp cao.",
                },
                {
                    "id": "q4",
                    "type": "ESSAY",
                    "text": "Bạn sử dụng các chỉ số dữ liệu nhân sự (Talent Analytics: Cost per Hire, Time to Fill, Quality of Hire, 90-day Retention) như thế nào để tối ưu hóa hiệu quả tuyển dụng?",
                    "options": [],
                    "required": True,
                    "points": 25,
                    "rubric": "Đánh giá tư duy dựa trên dữ liệu (Data-driven HR), khả năng phân tích báo cáo và đề xuất cải tiến liên tục cho ban lãnh đạo.",
                },
            ]
        }

        hr_assessment_def = models.AssessmentDefinition(
            organization_id=org.id,
            title="Đánh Giá Năng Lực Lead Talent Acquisition & HRBP",
            description="Bài kiểm tra năng lực đầu vào vị trí Trưởng Nhóm Thu Hút Tài Năng & Đối Tác Nhân Sự",
            duration_minutes=30,
            questions_json=json.dumps(hr_rubric["questions"], ensure_ascii=False),
        )
        db.add(hr_assessment_def)
        db.flush()

        opening_hr = models.JobOpening(
            organization_id=org.id,
            department_id=hr_dept.id,
            title="Trưởng Nhóm Thu Hút Tài Năng & Đối Tác Nhân Sự (Lead Talent Acquisition & HRBP)",
            description=(
                "Đồng hành cùng Ban Điều Hành Axiom kiến tạo đội ngũ tinh hoa trong kỷ nguyên AI. "
                "Lead Talent Acquisition & HR Business Partner sẽ chịu trách nhiệm toàn diện về chiến lược "
                "thu hút nhân tài cấp cao (Tech & Non-Tech), tối ưu hóa trải nghiệm ứng viên dựa trên hệ thống "
                "khảo thí thông minh, và cố vấn chiến lược nhân sự cho các Trưởng bộ phận."
            ),
            requirements=(
                "• Tối thiểu 3+ năm kinh nghiệm trong lĩnh vực Talent Acquisition / HRBP, ưu tiên có kinh nghiệm trong các công ty công nghệ, AI hoặc sản phẩm số.\n"
                "• Nắm vững các phương pháp phỏng vấn chuẩn mực quốc tế (phương pháp hành vi STAR, Competency-based Interviewing).\n"
                "• Khả năng phân tích dữ liệu tuyển dụng (Talent Analytics, Conversion Funnel, Cost per Hire, Time to Hire) để ra quyết định chiến lược.\n"
                "• Kỹ năng giao tiếp xuất sắc, phong thái đĩnh đạc, thấu hiểu tâm lý nhân sự và khả năng xây dựng thương hiệu nhà tuyển dụng (Employer Branding).\n"
                "• Tư duy đổi mới sáng tạo, cởi mở tiếp cận các công cụ trí tuệ nhân tạo (AI-assisted HR) để tự động hóa quy trình tuyển chọn."
            ),
            created_by_id=admin_user.id,
            assigned_hr_member_id=mgr_om.id,
            requires_assessment=True,
            assessment_definition_id=hr_assessment_def.id,
            competency_rubric_json=json.dumps(hr_rubric, ensure_ascii=False),
            status=models.JobOpeningStatusEnum.ACTIVE,
        )
        db.add(opening_hr)
        db.flush()

        print("8. Seeding Core Meeting...")
        meeting = models.Meeting(
            title="Họp Định Kỳ Bộ Phận Nhân Sự & Kế Hoạch Tuyển Dụng",
            description="Cuộc họp điều hành nội bộ của Bộ Phận Nhân Sự để thống nhất tiêu chí đánh giá ứng viên và phân công phỏng vấn.",
            organization_id=org.id,
            department_id=hr_dept.id,
            created_by_id=manager_user.id,
            scheduled_at=now,
            status=models.MeetingStatusEnum.IN_PROGRESS,
            approval_status="APPROVED",
            meeting_type="OFFICIAL",
        )
        db.add(meeting)
        db.flush()

        # Meeting members
        db.add_all([
            models.MeetingMember(
                meeting_id=meeting.id,
                user_id=manager_user.id,
                role=models.MeetingMemberRoleEnum.HOST,
                status=models.MeetingMemberStatusEnum.ACCEPTED,
            ),
            models.MeetingMember(
                meeting_id=meeting.id,
                user_id=member_user.id,
                role=models.MeetingMemberRoleEnum.PARTICIPANT,
                status=models.MeetingMemberStatusEnum.ACCEPTED,
            ),
            models.MeetingMember(
                meeting_id=meeting.id,
                user_id=admin_user.id,
                role=models.MeetingMemberRoleEnum.PARTICIPANT,
                status=models.MeetingMemberStatusEnum.ACCEPTED,
            ),
        ])

        db.commit()
        print("==================================================")
        print("   CLEAN RESET & SEEDING COMPLETED SUCCESSFULLY!")
        print("   Accounts available for login:")
        print("   1. Owner:              admin@axiom.com / password123")
        print("   2. Manager (HR):       manager@axiom.com / password123")
        print("   3. Member (HR Dept):   member@axiom.com / password123")
        print("   4. Unjoined User:      guest@axiom.com / password123")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_clean_reset()
