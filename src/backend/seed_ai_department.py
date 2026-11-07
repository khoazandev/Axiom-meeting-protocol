"""
Seed Script to add a new department with 1 Manager and 3 Members to the Axiom database.
Idempotent: safe to run multiple times without duplicating entries.
"""

import datetime
from datetime import timezone, timedelta
from src.backend import models, database
from src.backend.core.security import hash_password


def add_ai_department():
    print("=== SEEDING NEW AI & R&D DEPARTMENT ===")
    db = database.SessionLocal()
    try:
        # 1. Fetch Primary Organization
        org = db.query(models.Organization).first()
        if not org:
            raise RuntimeError("No Organization found in database! Please ensure an organization exists.")

        print(f"Organization: {org.name} ({org.id})")

        # 2. Fetch System Roles
        roles = {r.name: r for r in db.query(models.Role).all()}
        manager_role = roles.get("MANAGER")
        member_role = roles.get("MEMBER")
        if not manager_role or not member_role:
            raise RuntimeError("MANAGER or MEMBER roles not found in database!")

        # 3. Create or fetch Department
        dept_name = "Bộ Phận Kỹ Thuật AI & Nghiên Cứu R&D"
        dept_desc = "[icon:psychology] Nghiên cứu mô hình ngôn ngữ lớn (LLM), xử lý tiếng nói thời gian thực và kiến trúc AI On-Premise"
        
        dept = db.query(models.Department).filter(
            models.Department.organization_id == org.id,
            models.Department.name == dept_name,
        ).first()

        if not dept:
            dept = models.Department(
                organization_id=org.id,
                name=dept_name,
                description=dept_desc,
            )
            db.add(dept)
            db.flush()
            print(f"Created Department: {dept.name} (ID: {dept.id})")
        else:
            print(f"Department already exists: {dept.name} (ID: {dept.id})")

        # 4. Define 1 Manager and 3 Members
        users_config = [
            # 1 Manager
            {
                "email": "long.le@axiom.com",
                "full_name": "Lê Hoàng Long",
                "job_title": "Trưởng Bộ Phận Kỹ Thuật AI & Nghiên Cứu R&D",
                "phone": "0912 345 678",
                "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
                "role": manager_role,
                "is_manager": True,
            },
            # 3 Members
            {
                "email": "ngoc.tran@axiom.com",
                "full_name": "Trần Bảo Ngọc",
                "job_title": "Kỹ sư Trí tuệ Nhân tạo Cao cấp (Senior AI Engineer)",
                "phone": "0923 456 789",
                "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces",
                "role": member_role,
                "is_manager": False,
            },
            {
                "email": "huy.dang@axiom.com",
                "full_name": "Đặng Quốc Huy",
                "job_title": "Kỹ sư Dữ liệu & MLOps (MLOps Platform Engineer)",
                "phone": "0934 567 890",
                "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces",
                "role": member_role,
                "is_manager": False,
            },
            {
                "email": "my.vo@axiom.com",
                "full_name": "Võ Thảo My",
                "job_title": "Kỹ sư Xử lý Ngôn ngữ Tự nhiên (NLP Specialist)",
                "phone": "0945 678 901",
                "avatar_url": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces",
                "role": member_role,
                "is_manager": False,
            },
        ]

        created_users = []
        manager_user = None

        for uc in users_config:
            user = db.query(models.User).filter(models.User.email == uc["email"]).first()
            if not user:
                user = models.User(
                    email=uc["email"],
                    full_name=uc["full_name"],
                    password_hash=hash_password("password123"),
                    avatar_url=uc["avatar_url"],
                    phone=uc["phone"],
                    job_title=uc["job_title"],
                    is_active=True,
                    provider="local",
                )
                db.add(user)
                db.flush()
                print(f"Created User: {user.full_name} ({user.email})")
            else:
                user.full_name = uc["full_name"]
                user.job_title = uc["job_title"]
                user.phone = uc["phone"]
                user.avatar_url = uc["avatar_url"]
                user.is_active = True
                print(f"Updated User: {user.full_name} ({user.email})")

            created_users.append(user)
            if uc["is_manager"]:
                manager_user = user

            # Organization Membership
            om = db.query(models.OrganizationMember).filter(
                models.OrganizationMember.organization_id == org.id,
                models.OrganizationMember.user_id == user.id,
            ).first()
            if not om:
                om = models.OrganizationMember(
                    organization_id=org.id,
                    user_id=user.id,
                    role_id=uc["role"].id,
                    status=models.OrgMemberStatusEnum.ACTIVE,
                    joined_at=datetime.datetime.now(timezone.utc),
                )
                db.add(om)
                db.flush()
                print(f"  -> Added Org Member: {user.email} as {uc['role'].name}")
            else:
                om.role_id = uc["role"].id
                om.status = models.OrgMemberStatusEnum.ACTIVE

            # Department Membership
            dm = db.query(models.DepartmentMember).filter(
                models.DepartmentMember.department_id == dept.id,
                models.DepartmentMember.user_id == user.id,
            ).first()
            if not dm:
                dm = models.DepartmentMember(
                    department_id=dept.id,
                    user_id=user.id,
                    role_id=uc["role"].id,
                )
                db.add(dm)
                db.flush()
                print(f"  -> Added Department Member: {user.email} to {dept.name}")
            else:
                dm.role_id = uc["role"].id

        # 5. Create Jira Project & Tasks for this department to populate Gantt and progress
        jira_project = db.query(models.JiraProject).filter(
            models.JiraProject.department_id == dept.id,
        ).first()

        if not jira_project:
            jira_project = models.JiraProject(
                name="Axiom AI Engine & Protocol",
                key="AIE",
                created_by_id=manager_user.id,
                organization_id=org.id,
                department_id=dept.id,
                description="Dự án phát triển lõi trí tuệ nhân tạo, LLM context router và audio transcription protocol",
            )
            db.add(jira_project)
            db.flush()
            print(f"Created Jira Project: {jira_project.name} ({jira_project.key})")

        now = datetime.datetime.now(timezone.utc)
        tasks_data = [
            (
                "AIE-1",
                "Tối ưu hóa pipeline suy luận Ollama LLM độ trễ thấp",
                "Triển khai lượng tử hóa mô hình 4-bit và cấu hình streaming token cho trợ lý hội nghị",
                models.IssueTypeEnum.TASK,
                models.IssueStatusEnum.IN_PROGRESS,
                models.IssuePriorityEnum.HIGH,
                created_users[1].id,  # ngoc.tran
                now + timedelta(days=5),
            ),
            (
                "AIE-2",
                "Xây dựng hạ tầng MLOps tự động hóa kiểm thử benchmark",
                "Đóng gói Docker model runner và tích hợp script đo đạc throughput phần cứng cục bộ",
                models.IssueTypeEnum.STORY,
                models.IssueStatusEnum.DONE,
                models.IssuePriorityEnum.MEDIUM,
                created_users[2].id,  # huy.dang
                now - timedelta(days=2),
            ),
            (
                "AIE-3",
                "Tích hợp mô hình bóc tách thực thể và phân loại nhiệm vụ (NER)",
                "Huấn luyện bộ nhận diện action items từ biên bản âm thanh cuộc họp thời gian thực",
                models.IssueTypeEnum.TASK,
                models.IssueStatusEnum.IN_PROGRESS,
                models.IssuePriorityEnum.CRITICAL,
                created_users[3].id,  # my.vo
                now + timedelta(days=7),
            ),
            (
                "AIE-4",
                "Chuẩn hóa kiến trúc bảo mật bộ nhớ đệm Embeddings Vector DB",
                "Thiết lập cơ chế mã hóa AES-256 cho vector embeddings tri thức hội nghị",
                models.IssueTypeEnum.TASK,
                models.IssueStatusEnum.TODO,
                models.IssuePriorityEnum.HIGH,
                created_users[1].id,  # ngoc.tran
                now + timedelta(days=12),
            ),
        ]

        for key, summary, desc, itype, istatus, ipriority, assignee_id, due_d in tasks_data:
            existing_issue = db.query(models.Issue).filter(models.Issue.key == key).first()
            if not existing_issue:
                db.add(models.Issue(
                    project_id=jira_project.id,
                    department_id=dept.id,
                    key=key,
                    summary=summary,
                    description=desc,
                    type=itype,
                    status=istatus,
                    priority=ipriority,
                    assignee_id=assignee_id,
                    reporter_id=manager_user.id,
                    due_date=due_d,
                ))
                print(f"  -> Added Task: {key} - {summary}")

        db.commit()
        print("=== COMPLETED: NEW DEPARTMENT, MANAGER & 3 MEMBERS ADDED TO DATABASE SUCCESSFULLY ===")
    except Exception as e:
        db.rollback()
        print(f"Error during department seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    add_ai_department()
