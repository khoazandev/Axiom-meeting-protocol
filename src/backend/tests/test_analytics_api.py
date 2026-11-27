import uuid
import pytest
from src.backend import models
from src.backend.api import deps
from src.backend.main import app


def test_analytics_export_and_summary(client, db_session):
    # 1. Create Owner & Normal Member
    unique_suffix = uuid.uuid4().hex[:6]
    owner = models.User(
        email=f"analytics_owner_{unique_suffix}@axiom.test",
        full_name="Analytics Owner",
        is_active=True,
    )
    regular_member = models.User(
        email=f"analytics_member_{unique_suffix}@axiom.test",
        full_name="Analytics Member",
        is_active=True,
    )
    db_session.add_all([owner, regular_member])
    db_session.commit()
    db_session.refresh(owner)
    db_session.refresh(regular_member)

    # 2. Get or create OWNER and MEMBER roles
    owner_role = db_session.query(models.Role).filter(models.Role.name == "OWNER").first()
    if not owner_role:
        owner_role = models.Role(name="OWNER", description="Owner", scope=models.RoleScopeEnum.ORGANIZATION)
        db_session.add(owner_role)
        db_session.commit()

    member_role = db_session.query(models.Role).filter(models.Role.name == "MEMBER").first()
    if not member_role:
        member_role = models.Role(name="MEMBER", description="Member", scope=models.RoleScopeEnum.ORGANIZATION)
        db_session.add(member_role)
        db_session.commit()

    # 3. Create Organization
    org = models.Organization(name=f"Analytics Test Org {unique_suffix}", created_by_id=owner.id)
    db_session.add(org)
    db_session.commit()

    # 4. Add Memberships
    owner_membership = models.OrganizationMember(
        organization_id=org.id,
        user_id=owner.id,
        role_id=owner_role.id,
        status="ACTIVE",
    )
    reg_membership = models.OrganizationMember(
        organization_id=org.id,
        user_id=regular_member.id,
        role_id=member_role.id,
        status="ACTIVE",
    )
    db_session.add_all([owner_membership, reg_membership])

    # 5. Add a test Meeting
    meeting = models.Meeting(
        organization_id=org.id,
        created_by_id=owner.id,
        title="Sprint Review & Analytics Meeting",
        status=models.MeetingStatusEnum.COMPLETED,
    )
    db_session.add(meeting)

    # 6. Add Jira Project & Issue
    jira_proj = models.JiraProject(
        organization_id=org.id,
        name="Analytics Engineering",
        key=f"ANL{unique_suffix[:2].upper()}",
        created_by_id=owner.id,
    )
    db_session.add(jira_proj)
    db_session.commit()

    issue = models.Issue(
        project_id=jira_proj.id,
        key=f"{jira_proj.key}-1",
        summary="Build Real-Time Analytics Pipeline",
        type=models.IssueTypeEnum.TASK,
        status=models.IssueStatusEnum.DONE,
        priority=models.IssuePriorityEnum.HIGH,
        reporter_id=owner.id,
        assignee_id=regular_member.id,
    )
    db_session.add(issue)

    # 7. Add Audit Log
    audit = models.AuditLog(
        organization_id=org.id,
        user_id=owner.id,
        action="EXPORT_ANALYTICS",
        resource="ANALYTICS_SERVICE",
    )
    db_session.add(audit)
    db_session.commit()

    # --- TEST 1: Regular member forbidden ---
    app.dependency_overrides[deps.get_current_user] = lambda: regular_member
    try:
        res = client.get(f"/api/v1/analytics/export?org_id={org.id}")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.pop(deps.get_current_user, None)

    # --- TEST 2: Owner authorized to export NDJSON ---
    app.dependency_overrides[deps.get_current_user] = lambda: owner
    try:
        res = client.get(f"/api/v1/analytics/export?org_id={org.id}")
        assert res.status_code == 200, res.text
        assert "application/x-ndjson" in res.headers["content-type"]
        body = res.text
        assert "meeting_record" in body
        assert "task_record" in body
        assert "audit_event" in body

        # --- TEST 3: Summary endpoint ---
        summary_res = client.get(f"/api/v1/analytics/summary?org_id={org.id}")
        assert summary_res.status_code == 200, summary_res.text
        summary_data = summary_res.json()
        assert summary_data["organization_id"] == org.id
        assert summary_data["total_meetings"] >= 1
        assert summary_data["total_tasks"] >= 1
        assert summary_data["total_audit_events"] >= 1
        assert summary_data["total_members"] >= 2
    finally:
        app.dependency_overrides.pop(deps.get_current_user, None)
