"""
Reconcile database script:
1. Ensure only 1 OWNER exists: admin@axiom.com
2. Delete all other admin/owner accounts and dummy test accounts
3. Delete unused test orgs and duplicate departments
4. Ensure each of the 5 core departments has EXACTLY 1 manager
5. Ensure each member belongs to EXACTLY 1 department
"""

import sys
from datetime import datetime, timezone
from src.backend.database import SessionLocal
from src.backend.models import (
    User,
    Role,
    Department,
    DepartmentMember,
    Organization,
    OrganizationMember,
    OrgMemberStatusEnum,
    Meeting,
    MeetingMember,
    Issue,
    FollowUpTask,
    AuditLog,
    TranscriptSegment,
    MeetingChatMessage,
    MeetingDocument,
    IssueComment,
    KnowledgeDocument,
    OrganizationInvitation,
)

MAIN_ORG_ID = "2846981f-7028-4ef4-9cad-d2c3719703c4"  # Axiom Enterprise


def delete_meeting_deep(meeting_id, db):
    from src.backend.models import (
        FollowUpTask, MeetingDecision, TranscriptSegment, MeetingDocument,
        MeetingMember, MeetingChatMessage, KnowledgeDocument, Topic, Issue
    )
    db.query(FollowUpTask).filter(FollowUpTask.meeting_id == meeting_id).delete()
    db.query(MeetingDecision).filter(MeetingDecision.meeting_id == meeting_id).delete()
    db.query(TranscriptSegment).filter(TranscriptSegment.meeting_id == meeting_id).delete()
    db.query(MeetingDocument).filter(MeetingDocument.meeting_id == meeting_id).delete()
    db.query(MeetingMember).filter(MeetingMember.meeting_id == meeting_id).delete()
    db.query(MeetingChatMessage).filter(MeetingChatMessage.meeting_id == meeting_id).delete()
    db.query(KnowledgeDocument).filter(KnowledgeDocument.meeting_id == meeting_id).delete()
    db.query(Topic).filter(Topic.meeting_id == meeting_id).delete()
    db.query(Issue).filter(Issue.meeting_id == meeting_id).update({"meeting_id": None})
    db.query(Meeting).filter(Meeting.id == meeting_id).delete()


def reconcile():
    db = SessionLocal()
    try:
        print("=== 1. FETCHING ROLES AND MAIN ORG ===")
        owner_role = db.query(Role).filter(Role.name == "OWNER").first()
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        manager_role = db.query(Role).filter(Role.name == "MANAGER").first()
        member_role = db.query(Role).filter(Role.name == "MEMBER").first()

        main_org = db.query(Organization).filter(Organization.id == MAIN_ORG_ID).first()
        if not main_org:
            raise RuntimeError(f"Main organization {MAIN_ORG_ID} not found!")

        admin_user = db.query(User).filter(User.email == "admin@axiom.com").first()
        if not admin_user:
            raise RuntimeError("Primary admin@axiom.com user not found!")

        # Ensure main org is created_by admin_user
        main_org.created_by_id = admin_user.id
        db.commit()

        print(f"Main Org: {main_org.name}, Owner: {admin_user.email}")

        # === 2. CLEAN UP TEST ORGS & DUPLICATE DEPARTMENTS ===
        print("\n=== 2. CLEANING UP TEST ORGS AND DUPLICATE DEPARTMENTS ===")
        test_org_ids = ["55590ce8-1cbd-480b-9320-85ea23a507e1", "1a073229-f3fd-4bc3-98b6-3c9cfe26eb65", "762fdc06-1f59-4f57-86bb-2220ab624a71"]
        for t_id in test_org_ids:
            t_org = db.query(Organization).filter(Organization.id == t_id).first()
            if t_org:
                print(f"Deleting test org: {t_org.name} ({t_org.id})")
                # Delete meetings in this test org
                meetings = db.query(Meeting).filter(Meeting.organization_id == t_id).all()
                for m in meetings:
                    delete_meeting_deep(m.id, db)
                # Delete departments in this test org
                for d in db.query(Department).filter(Department.organization_id == t_id).all():
                    db.query(DepartmentMember).filter(DepartmentMember.department_id == d.id).delete()
                    db.delete(d)
                # Delete org members
                db.query(OrganizationMember).filter(OrganizationMember.organization_id == t_id).delete()
                db.delete(t_org)
                db.commit()

        # Delete empty duplicate departments in main org if any
        duplicate_dept_names = ["Kỹ Thuật & Công Nghệ", "Kinh Doanh & Tiếp Thị", "Tài Chính & Nhân Sự"]
        for d in db.query(Department).filter(Department.name.in_(duplicate_dept_names)).all():
            print(f"Deleting duplicate department: {d.name} ({d.id})")
            db.query(DepartmentMember).filter(DepartmentMember.department_id == d.id).delete()
            db.delete(d)
            db.commit()

        # === 3. REASSIGN DATA AND DELETE EXTRA ADMIN / OWNER USERS ===
        print("\n=== 3. REASSIGNING REFERENCES & DELETING EXTRA ADMIN / OWNER USERS ===")
        users_to_delete_emails = [
            "director@axiom.com",          # ADMIN
            "alex@axiom.com",              # OWNER
            "founder.test@company.vn",     # OWNER
            "testuser5247@gmail.com",      # OWNER
            "testuser3139@axiom.internal", # OWNER
            "bob@gmail.com",
            "alice@gmail.com",
            "sep_hoàng@gmail.com",
            "testuser@axiom.com@gmail.com",
        ]

        manager_khoa = db.query(User).filter(User.email == "manager.khoa@axiom.com").first()
        target_reassign_user = manager_khoa if manager_khoa else admin_user

        for email in users_to_delete_emails:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                continue

            print(f"Reassigning references and deleting user: {u.email} ({u.id})")

            # Reassign created meetings to admin_user
            db.query(Meeting).filter(Meeting.created_by_id == u.id).update(
                {"created_by_id": admin_user.id}
            )

            # Reassign issues to target_reassign_user
            db.query(Issue).filter(Issue.assignee_id == u.id).update(
                {"assignee_id": target_reassign_user.id}
            )
            db.query(Issue).filter(Issue.reporter_id == u.id).update(
                {"reporter_id": admin_user.id}
            )

            # Reassign follow-up tasks
            db.query(FollowUpTask).filter(FollowUpTask.assignee_id == u.id).update(
                {"assignee_id": target_reassign_user.id}
            )

            # Clean up foreign keys in transcript_segments, chat, documents, comments, invitations
            db.query(TranscriptSegment).filter(TranscriptSegment.speaker_id == u.id).update(
                {"speaker_id": None}
            )
            db.query(MeetingChatMessage).filter(MeetingChatMessage.user_id == u.id).delete()
            db.query(MeetingDocument).filter(MeetingDocument.uploaded_by_id == u.id).update(
                {"uploaded_by_id": admin_user.id}
            )
            db.query(IssueComment).filter(IssueComment.author_id == u.id).update(
                {"author_id": admin_user.id}
            )
            db.query(KnowledgeDocument).filter(KnowledgeDocument.uploaded_by_id == u.id).update(
                {"uploaded_by_id": admin_user.id}
            )
            db.query(OrganizationInvitation).filter(OrganizationInvitation.invited_by_id == u.id).delete()

            # Delete meeting memberships, department memberships, organization memberships
            db.query(MeetingMember).filter(MeetingMember.user_id == u.id).delete()
            db.query(DepartmentMember).filter(DepartmentMember.user_id == u.id).delete()
            db.query(OrganizationMember).filter(OrganizationMember.user_id == u.id).delete()
            db.query(AuditLog).filter(AuditLog.user_id == u.id).delete()

            # Delete the user
            db.delete(u)
            db.commit()
            print(f"Successfully deleted {email}")

        # === 4. RECONCILE THE 5 CORE DEPARTMENTS ===
        print("\n=== 4. RECONCILING 5 DEPARTMENTS (1 MANAGER EACH, 1 DEPT PER MEMBER) ===")

        # Map department name -> (Manager email, [Members emails])
        dept_structure = {
            "Khối Kỹ Thuật & Công Nghệ": {
                "manager": "manager.khoa@axiom.com",
                "members": [
                    "long.le@axiom.internal",
                    "khoa.tran@axiom.internal",
                    "anh.nguyen@axiom.internal",
                    "toan.vu@axiom.internal",
                    "nam.do@axiom.internal",
                    "nguyenvana.tech@gmail.com",
                    "trantandat612004@gmail.com",
                    "nguyenvana.test@gmail.com",
                ],
            },
            "Khối Sản Phẩm & Thiết Kế": {
                "manager": "phuong.nguyen@axiom.internal",
                "members": [
                    "ha.dang@axiom.internal",
                    "nam.le@axiom.internal",
                    "ngoc.hoang@axiom.internal",
                    "triet.pham@axiom.internal",
                ],
            },
            "Khối Kinh Doanh & Tiếp Thị": {
                "manager": "hung.do@axiom.internal",
                "members": [
                    "nhi.hoang@axiom.internal",
                    "khang.phan@axiom.internal",
                    "linh.le@axiom.internal",
                    "huy.tran@axiom.internal",
                    "ngul4914@gmail.com",
                ],
            },
            "Khối Vận Hành & Nhân Sự": {
                "manager": "trang.vu@axiom.internal",
                "members": [
                    "thang.bui@axiom.internal",
                    "ngan.nguyen@axiom.internal",
                    "duc.pham@axiom.internal",
                    "duong.dang@axiom.internal",
                    "son.phan@axiom.internal",
                ],
            },
            "Khối Tài Chính & Pháp Chế": {
                "manager": "khoa.pham@axiom.internal",
                "members": [
                    "mai.do@axiom.internal",
                    "yen.nguyen@axiom.internal",
                    "long.tran@axiom.internal",
                    "trong.vu@axiom.internal",
                    "member@axiom.com",
                ],
            },
        }

        # Clear all existing DepartmentMember rows to guarantee pristine 1:1 mapping
        db.query(DepartmentMember).delete()
        db.commit()

        # Track assigned users to guarantee each user belongs to exactly 1 department
        assigned_user_ids = set()

        for dept_name, spec in dept_structure.items():
            dept = db.query(Department).filter(
                Department.organization_id == MAIN_ORG_ID,
                Department.name == dept_name
            ).first()

            if not dept:
                print(f"Creating missing department: {dept_name}")
                dept = Department(
                    organization_id=MAIN_ORG_ID,
                    name=dept_name,
                    description=f"Bộ phận {dept_name} trực thuộc Axiom Enterprise",
                )
                db.add(dept)
                db.flush()

            print(f"\nProcessing department: {dept.name} ({dept.id})")

            # 1. Assign Manager
            mgr_email = spec["manager"]
            mgr_user = db.query(User).filter(User.email == mgr_email).first()
            if mgr_user:
                if mgr_user.id in assigned_user_ids:
                    print(f"WARNING: Manager {mgr_email} already assigned elsewhere!")
                assigned_user_ids.add(mgr_user.id)

                db.add(DepartmentMember(
                    department_id=dept.id,
                    user_id=mgr_user.id,
                    role_id=manager_role.id,
                ))

                # Ensure OrganizationMember has MANAGER role
                om = db.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == MAIN_ORG_ID,
                    OrganizationMember.user_id == mgr_user.id,
                ).first()
                if not om:
                    om = OrganizationMember(
                        organization_id=MAIN_ORG_ID,
                        user_id=mgr_user.id,
                        role_id=manager_role.id,
                        status=OrgMemberStatusEnum.ACTIVE,
                    )
                    db.add(om)
                else:
                    om.role_id = manager_role.id

                print(f"  -> MANAGER: {mgr_user.full_name} ({mgr_email})")
            else:
                print(f"  -> ERROR: Manager {mgr_email} not found in DB!")

            # 2. Assign Members
            for mem_email in spec["members"]:
                mem_user = db.query(User).filter(User.email == mem_email).first()
                if not mem_user:
                    print(f"  -> Creating missing member: {mem_email}")
                    mem_user = User(
                        email=mem_email,
                        full_name=mem_email.split('@')[0].replace('.', ' ').title(),
                        provider="local",
                        is_active=True,
                    )
                    db.add(mem_user)
                    db.flush()

                if mem_user.id in assigned_user_ids:
                    print(f"WARNING: Member {mem_email} already assigned to another department! Skipping duplicate.")
                    continue
                assigned_user_ids.add(mem_user.id)

                db.add(DepartmentMember(
                    department_id=dept.id,
                    user_id=mem_user.id,
                    role_id=member_role.id,
                ))

                # Ensure OrganizationMember has MEMBER role
                om = db.query(OrganizationMember).filter(
                    OrganizationMember.organization_id == MAIN_ORG_ID,
                    OrganizationMember.user_id == mem_user.id,
                ).first()
                if not om:
                    om = OrganizationMember(
                        organization_id=MAIN_ORG_ID,
                        user_id=mem_user.id,
                        role_id=member_role.id,
                        status=OrgMemberStatusEnum.ACTIVE,
                    )
                    db.add(om)
                else:
                    om.role_id = member_role.id

                print(f"  -> MEMBER: {mem_user.full_name} ({mem_email})")

            db.commit()

        # === 5. ENSURE ONLY 1 OWNER REMAINS ===
        print("\n=== 5. VERIFYING SINGLE OWNER ===")
        # Remove any stray owner roles from any user other than admin@axiom.com
        for om in db.query(OrganizationMember).filter(OrganizationMember.role_id == owner_role.id).all():
            u = db.query(User).filter(User.id == om.user_id).first()
            if u and u.email != "admin@axiom.com":
                print(f"Demoting extra owner {u.email} to MEMBER")
                om.role_id = member_role.id

        admin_om = db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == MAIN_ORG_ID,
            OrganizationMember.user_id == admin_user.id,
        ).first()
        if not admin_om:
            admin_om = OrganizationMember(
                organization_id=MAIN_ORG_ID,
                user_id=admin_user.id,
                role_id=owner_role.id,
                status=OrgMemberStatusEnum.ACTIVE,
            )
            db.add(admin_om)
        else:
            admin_om.role_id = owner_role.id
        db.commit()

        print("\n=== RECONCILIATION COMPLETED SUCCESSFULLY ===")

    except Exception as e:
        db.rollback()
        print(f"Error during reconciliation: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reconcile()
