"""Seed default admin account and organization."""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from src.backend.core.security import hash_password
from src.backend.database import SessionLocal
from src.backend.models import (
    Department,
    DepartmentMember,
    JiraProject,
    Meeting,
    MeetingMember,
    MeetingMemberRoleEnum,
    MeetingMemberStatusEnum,
    MeetingStatusEnum,
    Organization,
    OrganizationMember,
    OrgMemberStatusEnum,
    Role,
    User,
)
from src.backend.seeds.seed_rbac import seed_roles_and_permissions


def seed_admin_user(db: Session) -> dict:
    """Create default system admin user if not already exists."""
    seed_roles_and_permissions(db)

    admin_email = "admin@axiom.com"
    admin_password = "password123"  # Sync with frontend's AuthQuickAccess
    admin_name = "System Admin"

    # Remove old invalid emails if any
    db.query(User).filter(User.email == "admin@axiom.local").delete()
    db.commit()

    existing_user = db.query(User).filter(User.email == admin_email).first()
    if existing_user:
        existing_user.password_hash = hash_password(admin_password)
        db.commit()
        user = existing_user
        org = db.query(Organization).filter(Organization.created_by_id == user.id).first()
        if not org:
            org = Organization(name="Axiom Enterprise", created_by_id=user.id)
            db.add(org)
            db.flush()
    else:
        # 1. Create Admin User
        user = User(
            email=admin_email,
            password_hash=hash_password(admin_password),
            full_name=admin_name,
            provider="local",
        )
        db.add(user)
        db.flush()

        # 2. Create Default Organization
        org = Organization(
            name="Axiom Enterprise",
            created_by_id=user.id,
        )
        db.add(org)
        db.flush()

    # 3. Assign OWNER Role
    owner_role = db.query(Role).filter(Role.name == "OWNER", Role.is_system == True).first()
    if owner_role:
        existing_om = db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user.id,
        ).first()
        if not existing_om:
            member = OrganizationMember(
                organization_id=org.id,
                user_id=user.id,
                role_id=owner_role.id,
                status=OrgMemberStatusEnum.ACTIVE,
            )
            db.add(member)
        else:
            existing_om.role_id = owner_role.id

    # 4. Create Member Account (member@axiom.com & alex@axiom.com)
    member_role = db.query(Role).filter(Role.name == "MEMBER", Role.is_system == True).first()
    for m_email, m_name in [("member@axiom.com", "Team Member"), ("alex@axiom.com", "Alex Rivera")]:
        m_user = db.query(User).filter(User.email == m_email).first()
        if not m_user:
            m_user = User(
                email=m_email,
                password_hash=hash_password("password123"),
                full_name=m_name,
                provider="local",
            )
            db.add(m_user)
            db.flush()
        else:
            m_user.password_hash = hash_password("password123")

        if member_role:
            m_om = db.query(OrganizationMember).filter(
                OrganizationMember.organization_id == org.id,
                OrganizationMember.user_id == m_user.id,
            ).first()
            if not m_om:
                db.add(OrganizationMember(
                    organization_id=org.id,
                    user_id=m_user.id,
                    role_id=member_role.id,
                    status=OrgMemberStatusEnum.ACTIVE,
                ))
            else:
                m_om.role_id = member_role.id

    # 5. Create Manager Account (manager.khoa@axiom.com)
    manager_role = db.query(Role).filter(Role.name == "MANAGER", Role.is_system == True).first()
    manager = db.query(User).filter(User.email == "manager.khoa@axiom.com").first()
    if not manager:
        manager = User(
            email="manager.khoa@axiom.com",
            password_hash=hash_password("password123"),
            full_name="Trần Minh Khoa (Trưởng Bộ Phận Kỹ Thuật)",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
            provider="local",
        )
        db.add(manager)
        db.flush()
    else:
        manager.password_hash = hash_password("password123")

    if manager_role:
        mgr_om = db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == manager.id,
        ).first()
        if not mgr_om:
            db.add(OrganizationMember(
                organization_id=org.id,
                user_id=manager.id,
                role_id=manager_role.id,
                status=OrgMemberStatusEnum.ACTIVE,
            ))
        else:
            mgr_om.role_id = manager_role.id

    # 6. Assign Department Membership (Bộ Phận Kỹ Thuật & Công Nghệ)
    eng_dept = (
        db.query(Department).filter(Department.name.ilike("%Kỹ Thuật%")).first()
        or db.query(Department).first()
    )
    if eng_dept:
        # Assign members to engineering department
        for m_email in ["member@axiom.com", "alex@axiom.com"]:
            u = db.query(User).filter(User.email == m_email).first()
            if u and member_role:
                dm = db.query(DepartmentMember).filter(
                    DepartmentMember.department_id == eng_dept.id,
                    DepartmentMember.user_id == u.id,
                ).first()
                if not dm:
                    db.add(DepartmentMember(
                        department_id=eng_dept.id,
                        user_id=u.id,
                        role_id=member_role.id,
                    ))
                u.job_title = "Kỹ sư Kỹ thuật (Software Engineer)"

        # Assign manager to engineering department
        if manager and manager_role:
            dm_mgr = db.query(DepartmentMember).filter(
                DepartmentMember.department_id == eng_dept.id,
                DepartmentMember.user_id == manager.id,
            ).first()
            if not dm_mgr:
                db.add(DepartmentMember(
                    department_id=eng_dept.id,
                    user_id=manager.id,
                    role_id=manager_role.id,
                ))

    # 7. Seed Department Meetings (Bộ Phận Kỹ Thuật & Công Nghệ)
    if eng_dept and manager:
        sample_meetings = [
            (
                "Họp Đồng Bộ Kỹ Thuật Sprint & Kiến Trúc Microservices",
                "Cuộc họp kỹ thuật hàng tuần của Bộ Phận Kỹ Thuật & Công Nghệ để thống nhất kiến trúc và bàn giao sprint tasks.",
                MeetingStatusEnum.IN_PROGRESS,
            ),
            (
                "Daily Sync — Đội Ngũ Kỹ Thuật & Hạ Tầng CI/CD",
                "Đồng bộ tiến độ hạ tầng pipeline, review PRs và tháo gỡ blockers kỹ thuật trong ngày.",
                MeetingStatusEnum.IN_PROGRESS,
            ),
        ]
        for mtg_title, mtg_desc, mtg_st in sample_meetings:
            existing_mtg = db.query(Meeting).filter(
                Meeting.department_id == eng_dept.id,
                Meeting.title == mtg_title,
            ).first()
            if not existing_mtg:
                new_mtg = Meeting(
                    title=mtg_title,
                    description=mtg_desc,
                    organization_id=org.id,
                    department_id=eng_dept.id,
                    created_by_id=manager.id,
                    scheduled_at=datetime.now(timezone.utc),
                    status=mtg_st,
                    approval_status="APPROVED",
                    meeting_type="OFFICIAL",
                )
                db.add(new_mtg)
                db.flush()
                # Manager as Host
                db.add(MeetingMember(
                    meeting_id=new_mtg.id,
                    user_id=manager.id,
                    role=MeetingMemberRoleEnum.HOST,
                    status=MeetingMemberStatusEnum.ACCEPTED,
                ))
                # Add members as participants
                for m_email in ["member@axiom.com", "alex@axiom.com"]:
                    u = db.query(User).filter(User.email == m_email).first()
                    if u:
                        db.add(MeetingMember(
                            meeting_id=new_mtg.id,
                            user_id=u.id,
                            role=MeetingMemberRoleEnum.PARTICIPANT,
                            status=MeetingMemberStatusEnum.ACCEPTED,
                        ))

    # 8. Ensure Department Jira Project exists for task assignments
    if eng_dept:
        eng_proj = db.query(JiraProject).filter(
            (JiraProject.department_id == eng_dept.id) | (JiraProject.key == "ENG")
        ).first()
        if not eng_proj:
            db.add(JiraProject(
                key="ENG",
                name="Bộ Phận Kỹ Thuật & Công Nghệ",
                description="Dự án quản lý phân bổ công việc và nhiệm vụ phòng ban Kỹ thuật",
                organization_id=org.id,
                department_id=eng_dept.id,
                created_by_id=manager.id if manager else user.id,
                issue_counter=0,
            ))

    db.commit()
    db.refresh(user)

    return {
        "email": admin_email,
        "password": admin_password,
        "full_name": admin_name,
        "director": "director@axiom.com",
        "org": org.name,
    }


if __name__ == "__main__":
    with SessionLocal() as db:
        result = seed_admin_user(db)
        print("Admin user seeded:", result)
