"""Seed script for company hierarchy: Owner at top, 5 departments with full manager accounts,
members (3-4 members per department), and realistic Jira tasks spanning past, current and future dates.
"""

import datetime
from datetime import timezone, timedelta
from src.backend.database import SessionLocal
from src.backend.models import (
    User,
    Organization,
    OrganizationMember,
    Department,
    DepartmentMember,
    Role,
    OrgMemberStatusEnum,
    Issue,
    IssueTypeEnum,
    IssueStatusEnum,
    IssuePriorityEnum,
    JiraProject,
)
from src.backend.core.security import hash_password


def seed():
    db = SessionLocal()
    try:
        print("--- START SEEDING COMPANY HIERARCHY ---")

        # 1. Get or create primary organization
        org = db.query(Organization).filter(Organization.name == "Axiom Enterprise").first()
        if not org:
            org = db.query(Organization).first()
        if not org:
            org = Organization(name="Axiom Enterprise", slug="axiom-corp")
            db.add(org)
            db.commit()
            db.refresh(org)
        print(f"Organization: {org.name} ({org.id})")

        # 2. Get Roles
        roles = {r.name: r for r in db.query(Role).all()}
        owner_role = roles.get("OWNER")
        admin_role = roles.get("ADMIN")
        manager_role = roles.get("MANAGER")
        member_role = roles.get("MEMBER")

        if not owner_role or not manager_role or not member_role:
            print("ERROR: Roles missing in DB!")
            return

        # 3. Ensure Owner accounts (Executive Chair & Root Admin)
        owner_users_data = [
            {
                "email": "admin@axiom.com",
                "full_name": "System Admin",
                "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=faces",
            },
            {
                "email": "alex@axiom.com",
                "full_name": "Lâm Phát",
                "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
            },
        ]

        for o_data in owner_users_data:
            u = db.query(User).filter(User.email == o_data["email"]).first()
            if not u:
                u = User(
                    email=o_data["email"],
                    full_name=o_data["full_name"],
                    avatar_url=o_data["avatar_url"],
                    password_hash=hash_password("Axiom@123456"),
                    is_active=True,
                )
                db.add(u)
                db.commit()
                db.refresh(u)
            else:
                u.full_name = o_data["full_name"]
                u.avatar_url = o_data["avatar_url"]

            # Ensure OrganizationMember as OWNER
            om = db.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org.id,
                OrganizationMember.user_id == u.id,
            ).first()
            if not om:
                om = OrganizationMember(
                    organization_id=org.id,
                    user_id=u.id,
                    role_id=owner_role.id,
                    status=OrgMemberStatusEnum.ACTIVE,
                )
                db.add(om)
            else:
                om.role_id = owner_role.id
            db.commit()

        # 4. Define 5 Corporate Departments with 1 Manager + 4 Members each (with Unique Work-Related Icons)
        departments_spec = [
            {
                "code": "ENG",
                "name": "Khối Kỹ Thuật & Công Nghệ",
                "description": "[icon:code] Nghiên cứu phát triển AI Protocol, WebRTC realtime và tối ưu hóa hạ tầng On-Premise",
                "color": "#3B82F6",
                "manager": {
                    "email": "long.le@axiom.internal",
                    "full_name": "Lê Hoàng Long",
                    "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces",
                },
                "members": [
                    {
                        "email": "khoa.tran@axiom.internal",
                        "full_name": "Trần Minh Khoa",
                        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "anh.nguyen@axiom.internal",
                        "full_name": "Nguyễn Tuấn Anh",
                        "avatar_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "toan.vu@axiom.internal",
                        "full_name": "Vũ Đức Toàn",
                        "avatar_url": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "nam.do@axiom.internal",
                        "full_name": "Đỗ Hữu Nam",
                        "avatar_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop&crop=faces",
                    },
                ],
                "tasks": [
                    ("Xây dựng pipeline STT Faster-Whisper On-Premise", -18, -4, "DONE", 8, "HIGH", 0),
                    ("Tối ưu hóa độ trễ WebRTC audio room dưới 150ms", -6, 8, "IN_PROGRESS", 5, "URGENT", 1),
                    ("Triển khai bộ lọc Tamper-Proof SHA-256 Audit Trail", -2, 14, "IN_PROGRESS", 5, "HIGH", 2),
                    ("Nâng cấp kiến trúc Microservices Ollama Qwen DX-OS", 4, 25, "TODO", 13, "MEDIUM", 3),
                    ("Nghiên cứu mô hình nén dữ liệu giọng nói E2EE Opus", 15, 38, "TODO", 8, "LOW", 4),
                ],
            },
            {
                "code": "PROD",
                "name": "Khối Sản Phẩm & Thiết Kế",
                "description": "[icon:palette] Định hình chiến lược sản phẩm, trải nghiệm người dùng UI/UX và chuẩn hóa quy trình",
                "color": "#8B5CF6",
                "manager": {
                    "email": "phuong.nguyen@axiom.internal",
                    "full_name": "Nguyễn Mai Phương",
                    "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=faces",
                },
                "members": [
                    {
                        "email": "ha.dang@axiom.internal",
                        "full_name": "Đặng Thu Hà",
                        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "nam.le@axiom.internal",
                        "full_name": "Lê Bảo Nam",
                        "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "ngoc.hoang@axiom.internal",
                        "full_name": "Hoàng Bích Ngọc",
                        "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "triet.pham@axiom.internal",
                        "full_name": "Phạm Minh Triết",
                        "avatar_url": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop&crop=faces",
                    },
                ],
                "tasks": [
                    ("Thiết kế giao diện Company Org Tree theo phong cách Ant Design", -16, -2, "DONE", 5, "HIGH", 0),
                    ("Chuẩn hóa bộ Icon và Anti-CLS component system", -4, 10, "IN_PROGRESS", 3, "MEDIUM", 1),
                    ("Khảo sát người dùng tính năng Trợ lý AI Tóm tắt Cuộc họp", 2, 18, "TODO", 5, "LOW", 2),
                    ("Xây dựng Design Tokens cho giao diện Dark-Mode Sovereign", 8, 28, "TODO", 8, "MEDIUM", 3),
                    ("Thiết kế luồng biểu quyết trực tiếp trong phòng họp", 20, 42, "TODO", 5, "HIGH", 4),
                ],
            },
            {
                "code": "BIZ",
                "name": "Khối Kinh Doanh & Tiếp Thị",
                "description": "[icon:trending_up] Mở rộng quan hệ đối tác chiến lược, tư vấn chuyển đổi số doanh nghiệp và phát triển thương hiệu",
                "color": "#EC4899",
                "manager": {
                    "email": "hung.do@axiom.internal",
                    "full_name": "Đỗ Quốc Hùng",
                    "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=faces",
                },
                "members": [
                    {
                        "email": "nhi.hoang@axiom.internal",
                        "full_name": "Hoàng Yến Nhi",
                        "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "khang.phan@axiom.internal",
                        "full_name": "Phan Trọng Khang",
                        "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "linh.le@axiom.internal",
                        "full_name": "Lê Khánh Linh",
                        "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "huy.tran@axiom.internal",
                        "full_name": "Trần Quang Huy",
                        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces",
                    },
                ],
                "tasks": [
                    ("Đàm phán hợp đồng cung cấp giao thức Axiom cho Tập đoàn V", -20, -5, "DONE", 8, "URGENT", 0),
                    ("Tổ chức hội thảo DX-OS Security Protocol quý III", -5, 12, "IN_PROGRESS", 5, "HIGH", 1),
                    ("Phát động chiến dịch Marketing giải pháp On-Premise Meeting", 3, 20, "TODO", 5, "MEDIUM", 2),
                    ("Khảo sát nhu cầu tích hợp Jira & Slack từ 50 doanh nghiệp đối tác", 10, 30, "TODO", 8, "LOW", 3),
                    ("Ký kết thỏa thuận bảo mật dữ liệu khách hàng khối Ngân hàng", 22, 45, "TODO", 5, "HIGH", 4),
                ],
            },
            {
                "code": "OPS",
                "name": "Khối Vận Hành & Nhân Sự",
                "description": "[icon:precision_manufacturing] Tuyển dụng nhân tài, xây dựng văn hóa doanh nghiệp và giám sát quy chế kỷ luật cuộc họp",
                "color": "#10B981",
                "manager": {
                    "email": "trang.vu@axiom.internal",
                    "full_name": "Vũ Thu Trang",
                    "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces",
                },
                "members": [
                    {
                        "email": "thang.bui@axiom.internal",
                        "full_name": "Bùi Đức Thắng",
                        "avatar_url": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "ngan.nguyen@axiom.internal",
                        "full_name": "Nguyễn Thị Kim Ngân",
                        "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "son.phan@axiom.internal",
                        "full_name": "Phan Hoàng Sơn",
                        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "duong.dang@axiom.internal",
                        "full_name": "Đặng Thùy Dương",
                        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces",
                    },
                ],
                "tasks": [
                    ("Hoàn thiện quy chế kỷ luật cuộc họp và Agenda Gate", -22, -8, "DONE", 5, "HIGH", 0),
                    ("Tổ chức chương trình đào tạo văn hóa họp hiệu quả cho Quản lý", -3, 9, "IN_PROGRESS", 3, "MEDIUM", 1),
                    ("Đánh giá KPI năng lực và tải trọng công việc toàn doanh nghiệp", 5, 22, "TODO", 8, "HIGH", 2),
                    ("Kế hoạch tuyển dụng 5 kỹ sư AI và Chuyên viên Sản phẩm quý IV", 12, 32, "TODO", 5, "MEDIUM", 3),
                    ("Xây dựng cẩm nang onboarding bảo mật số cho nhân viên mới", 24, 48, "TODO", 3, "LOW", 4),
                ],
            },
            {
                "code": "FIN",
                "name": "Khối Tài Chính & Pháp Chế",
                "description": "[icon:account_balance] Quản trị dòng tiền, thẩm định ngân sách dự án và rà soát pháp lý hợp đồng bảo mật",
                "color": "#F59E0B",
                "manager": {
                    "email": "khoa.pham@axiom.internal",
                    "full_name": "Phạm Đăng Khoa",
                    "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces",
                },
                "members": [
                    {
                        "email": "mai.do@axiom.internal",
                        "full_name": "Đỗ Thị Mai",
                        "avatar_url": "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "trong.vu@axiom.internal",
                        "full_name": "Vũ Đình Trọng",
                        "avatar_url": "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "yen.nguyen@axiom.internal",
                        "full_name": "Nguyễn Hải Yến",
                        "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=faces",
                    },
                    {
                        "email": "long.tran@axiom.internal",
                        "full_name": "Trần Bảo Long",
                        "avatar_url": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop&crop=faces",
                    },
                ],
                "tasks": [
                    ("Quyết toán chi phí hạ tầng máy chủ và API Ollama tháng trước", -15, -3, "DONE", 3, "HIGH", 0),
                    ("Thẩm định pháp lý hợp đồng NDA bảo mật dữ liệu E2EE", -2, 11, "IN_PROGRESS", 5, "URGENT", 1),
                    ("Lập kế hoạch phân bổ ngân sách công nghệ thông tin quý IV", 7, 26, "TODO", 8, "MEDIUM", 2),
                    ("Kiểm toán nội bộ quy trình lưu trữ bản ghi cuộc họp", 14, 35, "TODO", 5, "HIGH", 3),
                    ("Thẩm tra chính sách quyền sở hữu trí tuệ mô hình AI DX-OS", 25, 50, "TODO", 8, "MEDIUM", 4),
                ],
            },
        ]

        # 5. Get Jira Project for linking tasks
        jira_project = db.query(JiraProject).first()
        if not jira_project:
            jira_project = JiraProject(
                organization_id=org.id,
                name="Axiom Enterprise Project",
                key="AXM",
                lead_id=u.id,
            )
            db.add(jira_project)
            db.commit()
            db.refresh(jira_project)

        now = datetime.datetime.now(timezone.utc)

        for d_spec in departments_spec:
            # 5.1 Create or Update Department
            dept = db.query(Department).filter(
                Department.organization_id == org.id,
                Department.name == d_spec["name"],
            ).first()

            if not dept:
                dept = Department(
                    organization_id=org.id,
                    name=d_spec["name"],
                    description=d_spec["description"],
                )
                db.add(dept)
                db.commit()
                db.refresh(dept)
            else:
                dept.description = d_spec["description"]
                db.commit()

            print(f"Created/Updated Dept: {dept.name} ({dept.id})")

            # 5.2 Create Manager User
            m_data = d_spec["manager"]
            mgr_user = db.query(User).filter(User.email == m_data["email"]).first()
            if not mgr_user:
                mgr_user = User(
                    email=m_data["email"],
                    full_name=m_data["full_name"],
                    avatar_url=m_data["avatar_url"],
                    password_hash=hash_password("Axiom@123456"),
                    is_active=True,
                )
                db.add(mgr_user)
                db.commit()
                db.refresh(mgr_user)
            else:
                mgr_user.full_name = m_data["full_name"]
                mgr_user.avatar_url = m_data["avatar_url"]
                db.commit()

            # Link Manager to Org
            om = db.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org.id,
                OrganizationMember.user_id == mgr_user.id,
            ).first()
            if not om:
                om = OrganizationMember(
                    organization_id=org.id,
                    user_id=mgr_user.id,
                    role_id=manager_role.id,
                    status=OrgMemberStatusEnum.ACTIVE,
                )
                db.add(om)
            else:
                om.role_id = manager_role.id
            db.commit()

            # Link Manager to Dept
            dm = db.query(DepartmentMember).filter(
                DepartmentMember.department_id == dept.id,
                DepartmentMember.user_id == mgr_user.id,
            ).first()
            if not dm:
                dm = DepartmentMember(
                    department_id=dept.id,
                    user_id=mgr_user.id,
                    role_id=manager_role.id,
                )
                db.add(dm)
            else:
                dm.role_id = manager_role.id
            db.commit()

            # 5.3 Create Members (3-4 members per department)
            dept_member_users = [mgr_user]
            for mem_data in d_spec["members"]:
                mem_user = db.query(User).filter(User.email == mem_data["email"]).first()
                if not mem_user:
                    mem_user = User(
                        email=mem_data["email"],
                        full_name=mem_data["full_name"],
                        avatar_url=mem_data["avatar_url"],
                        password_hash=hash_password("Axiom@123456"),
                        is_active=True,
                    )
                    db.add(mem_user)
                    db.commit()
                    db.refresh(mem_user)
                else:
                    mem_user.full_name = mem_data["full_name"]
                    mem_user.avatar_url = mem_data["avatar_url"]
                    db.commit()

                dept_member_users.append(mem_user)

                # Link Member to Org
                om_m = db.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == org.id,
                    OrganizationMember.user_id == mem_user.id,
                ).first()
                if not om_m:
                    om_m = OrganizationMember(
                        organization_id=org.id,
                        user_id=mem_user.id,
                        role_id=member_role.id,
                        status=OrgMemberStatusEnum.ACTIVE,
                    )
                    db.add(om_m)
                else:
                    om_m.role_id = member_role.id
                db.commit()

                # Link Member to Dept
                dm_m = db.query(DepartmentMember).filter(
                    DepartmentMember.department_id == dept.id,
                    DepartmentMember.user_id == mem_user.id,
                ).first()
                if not dm_m:
                    dm_m = DepartmentMember(
                        department_id=dept.id,
                        user_id=mem_user.id,
                        role_id=member_role.id,
                    )
                    db.add(dm_m)
                else:
                    dm_m.role_id = member_role.id
                db.commit()

            # 5.4 Create Department Tasks / Issues with clear Department Code
            for t_idx, task_info in enumerate(d_spec["tasks"]):
                t_summary = task_info[0]
                s_off = task_info[1]
                d_off = task_info[2]
                st = task_info[3]
                sp = task_info[4]
                prio = task_info[5]
                assignee_idx = task_info[6] if len(task_info) > 6 else (t_idx % len(dept_member_users))
                assigned_user = dept_member_users[assignee_idx % len(dept_member_users)]

                # Clear department task code: ENG-101, PROD-201, BIZ-301, OPS-401, FIN-501
                base_number = {
                    "ENG": 101,
                    "PROD": 201,
                    "BIZ": 301,
                    "OPS": 401,
                    "FIN": 501,
                }.get(d_spec["code"], 101)

                issue_key = f"{d_spec['code']}-{base_number + t_idx}"
                existing_issue = db.query(Issue).filter(Issue.key == issue_key).first()

                s_date = now + timedelta(days=s_off)
                d_date = now + timedelta(days=d_off)

                status_enum = IssueStatusEnum.TODO
                if st == "DONE":
                    status_enum = IssueStatusEnum.DONE
                elif st == "IN_PROGRESS":
                    status_enum = IssueStatusEnum.IN_PROGRESS

                prio_enum = IssuePriorityEnum.MEDIUM
                if prio == "HIGH" or prio == "URGENT":
                    prio_enum = IssuePriorityEnum.HIGH
                elif prio == "LOW":
                    prio_enum = IssuePriorityEnum.LOW

                if not existing_issue:
                    iss = Issue(
                        project_id=jira_project.id,
                        key=issue_key,
                        summary=t_summary,
                        description=f"[{d_spec['code']}] Nhiệm vụ trọng tâm thuộc {dept.name}: {t_summary}",
                        type=IssueTypeEnum.TASK,
                        status=status_enum,
                        priority=prio_enum,
                        story_points=sp,
                        reporter_id=mgr_user.id,
                        assignee_id=assigned_user.id,
                        department_id=dept.id,
                        due_date=d_date,
                        created_at=s_date,
                    )
                    db.add(iss)
                else:
                    existing_issue.summary = t_summary
                    existing_issue.description = f"[{d_spec['code']}] Nhiệm vụ trọng tâm thuộc {dept.name}: {t_summary}"
                    existing_issue.status = status_enum
                    existing_issue.priority = prio_enum
                    existing_issue.story_points = sp
                    existing_issue.assignee_id = assigned_user.id
                    existing_issue.department_id = dept.id
                    existing_issue.due_date = d_date
                    existing_issue.created_at = s_date
                db.commit()

        print("--- SEEDING COMPLETED SUCCESSFULLY ---")

    except Exception as e:
        print(f"Error while seeding: {e}")
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed()
