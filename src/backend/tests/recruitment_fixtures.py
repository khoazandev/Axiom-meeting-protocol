import datetime
from datetime import timezone
from types import SimpleNamespace
import pytest
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.seeds.seed_rbac import seed_roles_and_permissions


@pytest.fixture
def recruitment_org(db_session: Session) -> SimpleNamespace:
    """Fixture providing an organization with owner, two managers, departments, and seeded RBAC."""
    models.database.Base.metadata.create_all(bind=db_session.get_bind())
    seed_roles_and_permissions(db_session)

    owner_role = db_session.query(models.Role).filter_by(name="OWNER").first()
    manager_role = db_session.query(models.Role).filter_by(name="MANAGER").first()
    member_role = db_session.query(models.Role).filter_by(name="MEMBER").first()

    review_perm = db_session.query(models.Permission).filter_by(code="recruitment.review").first()
    manage_perm = db_session.query(models.Permission).filter_by(code="recruitment.manage").first()
    approve_perm = db_session.query(models.Permission).filter_by(code="recruitment.approve").first()

    # 1. Create or get Owner User
    owner_user = db_session.query(models.User).filter_by(email="owner@axiom.test").first()
    if not owner_user:
        owner_user = models.User(
            email="owner@axiom.test",
            full_name="Alice Owner",
            is_active=True,
        )
        db_session.add(owner_user)
        db_session.flush()

    # 2. Create Organization
    org = models.Organization(
        name="Axiom Corp",
        created_by_id=owner_user.id,
    )
    db_session.add(org)
    db_session.flush()

    owner_member = db_session.query(models.OrganizationMember).filter_by(
        organization_id=org.id, user_id=owner_user.id
    ).first()
    if not owner_member:
        owner_member = models.OrganizationMember(
            organization_id=org.id,
            user_id=owner_user.id,
            role_id=owner_role.id,
            status=models.OrgMemberStatusEnum.ACTIVE,
        )
        db_session.add(owner_member)

    # 3. Create Departments
    eng_dept = models.Department(
        organization_id=org.id,
        name="Engineering",
    )
    sales_dept = models.Department(
        organization_id=org.id,
        name="Sales",
    )
    db_session.add_all([eng_dept, sales_dept])
    db_session.flush()

    # 4. Create Selected Manager (in Engineering)
    selected_mgr_user = db_session.query(models.User).filter_by(email="manager.selected@axiom.test").first()
    if not selected_mgr_user:
        selected_mgr_user = models.User(
            email="manager.selected@axiom.test",
            full_name="Bob Selected Manager",
            is_active=True,
        )
        db_session.add(selected_mgr_user)
        db_session.flush()

    selected_member = db_session.query(models.OrganizationMember).filter_by(
        organization_id=org.id, user_id=selected_mgr_user.id
    ).first()
    if not selected_member:
        selected_member = models.OrganizationMember(
            organization_id=org.id,
            user_id=selected_mgr_user.id,
            role_id=manager_role.id,
            status=models.OrgMemberStatusEnum.ACTIVE,
        )
        db_session.add(selected_member)
        db_session.flush()

    assert review_perm is not None
    existing_omp = db_session.query(models.OrganizationMemberPermission).filter_by(
        member_id=selected_member.id, permission_id=review_perm.id
    ).first()
    if not existing_omp:
        db_session.add(
            models.OrganizationMemberPermission(
                member_id=selected_member.id,
                permission_id=review_perm.id,
                granted_by_id=owner_user.id,
            )
        )

    dept_member = db_session.query(models.DepartmentMember).filter_by(
        department_id=eng_dept.id, user_id=selected_mgr_user.id
    ).first()
    if not dept_member:
        dept_member = models.DepartmentMember(
            department_id=eng_dept.id,
            user_id=selected_mgr_user.id,
            role_id=manager_role.id,
        )
        db_session.add(dept_member)

    # 5. Create Other Manager (in Sales)
    other_mgr_user = db_session.query(models.User).filter_by(email="manager.other@axiom.test").first()
    if not other_mgr_user:
        other_mgr_user = models.User(
            email="manager.other@axiom.test",
            full_name="Charlie Other Manager",
            is_active=True,
        )
        db_session.add(other_mgr_user)
        db_session.flush()

    other_member = db_session.query(models.OrganizationMember).filter_by(
        organization_id=org.id, user_id=other_mgr_user.id
    ).first()
    if not other_member:
        other_member = models.OrganizationMember(
            organization_id=org.id,
            user_id=other_mgr_user.id,
            role_id=manager_role.id,
            status=models.OrgMemberStatusEnum.ACTIVE,
        )
        db_session.add(other_member)
    db_session.flush()

    dept_member_other = models.DepartmentMember(
        department_id=sales_dept.id,
        user_id=other_mgr_user.id,
        role_id=manager_role.id,
    )
    db_session.add(dept_member_other)

    db_session.commit()
    db_session.refresh(org)
    db_session.refresh(owner_member)
    db_session.refresh(selected_member)
    db_session.refresh(other_member)

    return SimpleNamespace(
        organization=org,
        owner=owner_member,
        owner_user=owner_user,
        selected_manager=selected_member,
        selected_manager_user=selected_mgr_user,
        other_manager=other_member,
        other_manager_user=other_mgr_user,
        eng_department=eng_dept,
        sales_department=sales_dept,
        review_permission=review_perm,
        manage_permission=manage_perm,
        approve_permission=approve_perm,
        owner_role=owner_role,
        manager_role=manager_role,
        member_role=member_role,
    )


@pytest.fixture
def auth_as():
    def _auth(user: models.User):
        from src.backend.core.security import create_access_token
        from src.backend.api import deps
        from src.backend.main import app

        token = create_access_token(data={"sub": user.id, "type": "access"})
        app.dependency_overrides[deps.get_current_user] = lambda: user
        return {"Authorization": f"Bearer {token}"}

    return _auth


class FakeEvaluator:
    def __init__(self, source_id="seg-1", score=4.0, confidence=0.82):
        self.source_id = source_id
        self.score = score
        self.confidence = confidence

    async def evaluate(self, evaluation_input):
        from src.backend.services.candidate_evaluator import (
            CompetencyScore,
            EvaluationResult,
            Evidence,
        )
        return EvaluationResult(
            competencies=[CompetencyScore(name="Architecture", score=self.score, confidence=self.confidence)],
            evidence=[
                Evidence(
                    source_type="TRANSCRIPT",
                    source_id=self.source_id,
                    quote="I designed the distributed consensus protocol.",
                    timestamp="00:05:00",
                )
            ],
            concerns=[],
            follow_up_questions=[],
            recommendation="PROCEED_TO_HUMAN_REVIEW",
            summary="Candidate demonstrated exceptional architecture competence.",
        )


@pytest.fixture
def fake_evaluator():
    from src.backend.main import app as fastapi_app
    from src.backend.services.candidate_evaluator import get_candidate_evaluator

    evaluator = FakeEvaluator()
    fastapi_app.dependency_overrides[get_candidate_evaluator] = lambda: evaluator
    yield evaluator
    fastapi_app.dependency_overrides.pop(get_candidate_evaluator, None)


def create_opening_as_owner(client, auth_as, recruitment_org, requires_assessment=True, auto_assign_hr=True):
    headers = {"X-Organization-ID": recruitment_org.organization.id, **auth_as(recruitment_org.owner_user)}
    assessment_definition_id = None
    if requires_assessment:
        definition_res = client.post(
            f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/assessment-definitions",
            headers=headers,
            json={
                "title": "E2E Systems Assessment",
                "duration_minutes": 45,
                "questions_json": '[{"id":"q1","text":"Describe a consensus protocol.","required":true}]',
            },
        )
        assert definition_res.status_code == 201, definition_res.text
        assessment_definition_id = definition_res.json()["id"]

    res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/openings",
        headers=headers,
        json={
            "department_id": recruitment_org.eng_department.id,
            "title": "Principal Distributed Systems Engineer",
            "description": "Architect high-performance distributed systems",
            "requirements": "7+ years experience in systems programming",
            "requires_assessment": requires_assessment,
            "assigned_hr_member_id": recruitment_org.selected_manager.id if auto_assign_hr else None,
            "assessment_definition_id": assessment_definition_id,
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    return SimpleNamespace(
        id=data["id"],
        title=data["title"],
        department_id=data["department_id"],
        organization_id=recruitment_org.organization.id,
        assessment_definition_id=assessment_definition_id,
        owner_headers=headers,
    )


def invite_candidate_as_owner(client, opening, email="candidate.john@example.com", full_name="John Doe", phone="+84901234567"):
    res = client.post(
        f"/api/v1/organizations/{opening.organization_id}/recruitment/applications",
        headers=opening.owner_headers,
        json={
            "opening_id": opening.id,
            "candidate_email": email,
            "candidate_name": full_name,
            "candidate_phone": phone,
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    application_id = data["application_id"]
    if opening.assessment_definition_id:
        assessment_res = client.post(
            f"/api/v1/organizations/{opening.organization_id}/recruitment/applications/{application_id}/assign-assessment",
            headers=opening.owner_headers,
            json={"definition_id": opening.assessment_definition_id},
        )
        assert assessment_res.status_code == 200, assessment_res.text

    token = data.get("invitation_token") or data.get("raw_token")
    return SimpleNamespace(
        invitation_id=data.get("invitation_id", application_id),
        application_id=application_id,
        candidate_id=data.get("candidate_id"),
        invitation_token=token,
        raw_token=token,
        candidate_email=email,
        candidate_name=full_name,
    )


def exchange_candidate_session(client, raw_token):
    res = client.post(
        f"/api/v1/recruitment/invitations/{raw_token}/session",
    )
    assert res.status_code == 200, res.text
    data = res.json()
    return SimpleNamespace(
        access_token=data["access_token"],
        headers={"Authorization": f"Bearer {data['access_token']}"},
        application_id=data["application_id"],
        candidate_id=data["candidate_id"],
        email="candidate.senior@example.com",
    )


def submit_assessment(client, candidate, answers=None):
    import json
    me_res = client.get("/api/v1/recruitment/applications/me", headers=candidate.headers)
    assert me_res.status_code == 200, me_res.text

    if answers is None:
        answers = {"q1": "Raft Consensus", "q2": "Optimistic Locking with Versioning"}

    res = client.post(
        "/api/v1/recruitment/applications/me/assessment/submit",
        headers=candidate.headers,
        json={"answers_json": json.dumps(answers)},
    )
    assert res.status_code == 200, res.text
    return SimpleNamespace(result=res.json())


def schedule_and_complete_interview(client, auth_as, application_id, candidate_headers, db_session):
    from datetime import datetime, timedelta, timezone
    from src.backend import models
    db = db_session
    try:
        app = db.query(models.RecruitmentApplication).filter_by(id=application_id).first()
        assert app is not None
        org_id = app.organization_id
        owner_member = db.query(models.OrganizationMember).filter_by(organization_id=org_id).join(models.Role).filter(models.Role.name == "OWNER").first()
        headers = {"X-Organization-ID": org_id, **auth_as(owner_member.user)}

        sched_time = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        res = client.post(
            f"/api/v1/organizations/{org_id}/recruitment/applications/{application_id}/interviews",
            headers=headers,
            json={"scheduled_at": sched_time},
        )
        assert res.status_code == 201, res.text
        interview_data = res.json()
        interview_id = interview_data["id"]

        meeting = db.query(models.Meeting).filter_by(id=interview_data["meeting_id"]).first()
        if meeting:
            seg = db.query(models.TranscriptSegment).filter_by(id="seg-1").first()
            if not seg:
                seg = models.TranscriptSegment(
                    id="seg-1",
                    meeting_id=meeting.id,
                    content="Candidate: I designed the distributed consensus protocol.",
                    start_time="00:00:12",
                    end_time="00:00:24",
                    sequence=1,
                )
                db.add(seg)
            else:
                seg.meeting_id = meeting.id
            db.commit()

        consent_res = client.post(
            f"/api/v1/recruitment/interviews/{interview_id}/consent",
            headers=candidate_headers,
            json={
                "recording": True,
                "transcription": True,
                "ai_evaluation": True,
            },
        )
        assert consent_res.status_code == 200, consent_res.text

        complete_res = client.post(
            f"/api/v1/organizations/{org_id}/recruitment/interviews/{interview_id}/complete",
            headers=headers,
        )
        assert complete_res.status_code == 200, complete_res.text
        return SimpleNamespace(id=interview_id, meeting_id=interview_data["meeting_id"])
    finally:
        pass


def run_ai_evaluation(client, auth_as, application_id, fake_evaluator=None, db_session=None):
    from src.backend import database, models
    db = db_session or database.SessionLocal()
    try:
        app = db.query(models.RecruitmentApplication).filter_by(id=application_id).first()
        assert app is not None
        org_id = app.organization_id
        owner_member = db.query(models.OrganizationMember).filter_by(organization_id=org_id).join(models.Role).filter(models.Role.name == "OWNER").first()
        headers = {"X-Organization-ID": org_id, **auth_as(owner_member.user)}

        res = client.post(
            f"/api/v1/organizations/{org_id}/recruitment/applications/{application_id}/ai-evaluations",
            headers=headers,
        )
        assert res.status_code == 201, res.text
        return SimpleNamespace(result=res.json())
    finally:
        if not db_session:
            db.close()


def submit_hr_hire(client, auth_as, application_id, reason="Candidate demonstrated exceptional systems capability", ai_diff_reason=None, db_session=None):
    from src.backend import database, models
    db = db_session or database.SessionLocal()
    try:
        app = db.query(models.RecruitmentApplication).filter_by(id=application_id).first()
        assert app is not None
        org_id = app.organization_id

        mgr_member = db.query(models.OrganizationMember).filter_by(id=app.assigned_hr_member_id).first()
        if not mgr_member:
            mgr_member = db.query(models.OrganizationMember).filter_by(organization_id=org_id).join(models.Role).filter(models.Role.name == "MANAGER").first()
            app.assigned_hr_member_id = mgr_member.id
            db.commit()

        review_perm = db.query(models.Permission).filter_by(code="recruitment.review").first()
        existing_perm = db.query(models.OrganizationMemberPermission).filter_by(member_id=mgr_member.id, permission_id=review_perm.id).first()
        if not existing_perm:
            perm_link = models.OrganizationMemberPermission(
                member_id=mgr_member.id,
                permission_id=review_perm.id,
            )
            db.add(perm_link)
            db.commit()

        headers = {"X-Organization-ID": org_id, **auth_as(mgr_member.user)}
        res = client.post(
            f"/api/v1/organizations/{org_id}/recruitment/applications/{application_id}/hr-review",
            headers=headers,
            json={
                "decision": "RECOMMEND_HIRE",
                "reason": reason,
                "ai_diff_reason": ai_diff_reason,
            },
        )
        assert res.status_code == 200, res.text
        return SimpleNamespace(result=res.json())
    finally:
        if not db_session:
            db.close()


def approve_as_owner(client, auth_as, application_id, reason="Approved by Executive Committee", db_session=None):
    from src.backend import database, models
    db = db_session or database.SessionLocal()
    try:
        app = db.query(models.RecruitmentApplication).filter_by(id=application_id).first()
        assert app is not None
        org_id = app.organization_id
        owner_member = db.query(models.OrganizationMember).filter_by(organization_id=org_id).join(models.Role).filter(models.Role.name == "OWNER").first()
        headers = {"X-Organization-ID": org_id, **auth_as(owner_member.user)}

        res = client.post(
            f"/api/v1/organizations/{org_id}/recruitment/applications/{application_id}/owner-approval",
            headers=headers,
            json={
                "decision": "APPROVE",
                "reason": reason,
            },
        )
        assert res.status_code == 200, res.text
        return SimpleNamespace(result=res.json())
    finally:
        if not db_session:
            db.close()


def issue_onboarding(client, auth_as, application_id, idempotency_key=None, db_session=None):
    from src.backend import database, models
    if not idempotency_key:
        idempotency_key = f"key-onboard-{application_id}"
    db = db_session or database.SessionLocal()
    try:
        app = db.query(models.RecruitmentApplication).filter_by(id=application_id).first()
        assert app is not None
        org_id = app.organization_id
        owner_member = db.query(models.OrganizationMember).filter_by(organization_id=org_id).join(models.Role).filter(models.Role.name == "OWNER").first()
        headers = {"X-Organization-ID": org_id, **auth_as(owner_member.user)}

        res = client.post(
            f"/api/v1/organizations/{org_id}/recruitment/applications/{application_id}/issue-onboarding",
            headers=headers,
            json={"idempotency_key": idempotency_key},
        )
        assert res.status_code == 200, res.text
        data = res.json()
        return SimpleNamespace(
            invitation_id=data["invitation_id"],
            application_id=data["application_id"],
            raw_token=data["raw_token"],
            register_url=data["register_url"],
            status=data["status"],
        )
    finally:
        if not db_session:
            db.close()


def accept_onboarding(client, raw_token, candidate_user=None, auth_as=None, db_session=None):
    from src.backend import database, models
    db = db_session or database.SessionLocal()
    try:
        if not candidate_user:
            from src.backend.core.security import hash_recruitment_token
            inv = db.query(models.OrganizationInvitation).filter_by(token_hash=hash_recruitment_token(raw_token)).first()
            assert inv is not None
            candidate_user = db.query(models.User).filter_by(email=inv.email).first()
            if not candidate_user:
                candidate_user = models.User(
                    email=inv.email,
                    full_name="Newly Hired Employee",
                    is_active=True,
                )
                db.add(candidate_user)
                db.commit()
                db.refresh(candidate_user)

        from src.backend.core.security import create_access_token
        from src.backend.api import deps
        from src.backend.main import app as fastapi_app
        token = create_access_token(data={"sub": candidate_user.id, "type": "access"})
        fastapi_app.dependency_overrides[deps.get_current_user] = lambda: candidate_user
        headers = {"Authorization": f"Bearer {token}"}

        res = client.post(f"/api/v1/invitations/{raw_token}/accept", headers=headers)
        assert res.status_code == 200, res.text
        return res.json()
    finally:
        if not db_session:
            db.close()


def load_application(client, auth_as, application_id, db_session):
    from src.backend import models
    db = db_session
    app = db.query(models.RecruitmentApplication).filter_by(id=application_id).first()
    assert app is not None
    org_id = app.organization_id
    owner_member = db.query(models.OrganizationMember).filter_by(organization_id=org_id).join(models.Role).filter(models.Role.name == "OWNER").first()
    headers = {"X-Organization-ID": org_id, **auth_as(owner_member.user)}

    res = client.get(
        f"/api/v1/organizations/{org_id}/recruitment/applications/{application_id}",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    return res.json()


def membership_count(org_id, email, db_session):
    from src.backend import models
    db = db_session
    user = db.query(models.User).filter_by(email=email).first()
    if not user:
        return 0
    return (
        db.query(models.OrganizationMember)
        .filter_by(organization_id=org_id, user_id=user.id, status=models.OrgMemberStatusEnum.ACTIVE)
        .count()
    )
