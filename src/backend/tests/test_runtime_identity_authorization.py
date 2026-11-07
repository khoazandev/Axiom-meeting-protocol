"""Runtime identities and meeting content access come from persisted grants."""

import pytest

from src.backend import models
from src.backend.api.v1.auth import _resolve_user_role
from src.backend.api.v1.meetings_v2 import _get_user_role_and_dept
from src.backend.core.security import hash_password, verify_password


def test_verify_password_does_not_accept_another_demo_password():
    hashed = hash_password("password123")
    assert verify_password("Axiom@123456", hashed) is False


def test_seeded_admin_email_does_not_create_owner_role(db_session):
    user = models.User(email="admin@axiom.com", full_name="No Membership")
    db_session.add(user)
    db_session.commit()
    assert _resolve_user_role(user, db_session) == "CANDIDATE"


def test_manager_word_in_email_does_not_create_manager_role(db_session):
    user = models.User(email="manager@example.test", full_name="Plain Member")
    db_session.add(user)
    db_session.flush()
    assert _get_user_role_and_dept(db_session, user) == ("MEMBER", None)


def test_department_owner_role_does_not_grant_organization_owner(
    db_session, recruitment_org,
):
    member = models.User(email="department-owner@example.com", full_name="Department Owner")
    db_session.add(member)
    db_session.flush()
    db_session.add_all([
        models.OrganizationMember(
            organization_id=recruitment_org.organization.id,
            user_id=member.id,
            role_id=recruitment_org.member_role.id,
            status=models.OrgMemberStatusEnum.ACTIVE,
        ),
        models.DepartmentMember(
            department_id=recruitment_org.eng_department.id,
            user_id=member.id,
            role_id=recruitment_org.owner_role.id,
        ),
    ])
    db_session.commit()
    assert _get_user_role_and_dept(db_session, member, recruitment_org.organization.id) == (
        "MEMBER", recruitment_org.eng_department.id,
    )


def test_suspended_membership_does_not_grant_auth_role(db_session, recruitment_org):
    recruitment_org.selected_manager.status = models.OrgMemberStatusEnum.SUSPENDED
    db_session.commit()
    assert _resolve_user_role(recruitment_org.selected_manager_user, db_session) == "CANDIDATE"


def test_seeded_admin_email_cannot_bypass_invitation_registration(client, db_session):
    db_session.add(models.User(email="already@example.test", full_name="Existing User"))
    db_session.commit()

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "admin@axiom.com", "password": "a-new-password", "full_name": "Uninvited"},
    )
    assert response.status_code == 400
    assert db_session.query(models.User).filter_by(email="admin@axiom.com").count() == 0


def test_first_user_requires_explicit_registration_flow(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "first@example.test", "password": "a-new-password", "full_name": "First"},
    )
    assert response.status_code == 400


@pytest.fixture
def private_meeting(db_session, recruitment_org):
    outsider = models.User(email="outsider@example.test", full_name="Outsider")
    db_session.add(outsider)
    db_session.flush()
    meeting = models.Meeting(
        organization_id=recruitment_org.organization.id,
        department_id=recruitment_org.eng_department.id,
        created_by_id=recruitment_org.owner_user.id,
        title="Private engineering meeting",
    )
    db_session.add(meeting)
    db_session.commit()
    return meeting, outsider


def test_nonmember_cannot_post_transcript_or_join_meeting(
    client, db_session, auth_as, private_meeting,
):
    meeting, outsider = private_meeting
    response = client.post(
        f"/api/v1/meetings/{meeting.id}/transcripts",
        headers=auth_as(outsider),
        json={"content": "hello", "start_time": "0", "end_time": "1", "sequence": 1},
    )
    assert response.status_code == 403, response.text
    assert db_session.query(models.MeetingMember).filter_by(
        meeting_id=meeting.id, user_id=outsider.id,
    ).count() == 0
    assert db_session.query(models.TranscriptSegment).filter_by(meeting_id=meeting.id).count() == 0


@pytest.mark.parametrize("suffix", [
    "transcripts", "summary", "follow-up-tasks", "decisions", "topics", "chat",
])
def test_nonmember_cannot_read_meeting_content(client, auth_as, private_meeting, suffix):
    meeting, outsider = private_meeting
    response = client.get(f"/api/v1/meetings/{meeting.id}/{suffix}", headers=auth_as(outsider))
    assert response.status_code == 403, response.text


@pytest.mark.parametrize("suffix,payload", [
    ("summary", {"summary": "private"}),
    ("follow-up-tasks", {"title": "private"}),
    ("chat", {"content": "private"}),
    ("topics/next", None),
    ("extract-tasks", None),
])
def test_nonmember_cannot_change_meeting_content(
    client, auth_as, private_meeting, suffix, payload,
):
    meeting, outsider = private_meeting
    response = client.post(
        f"/api/v1/meetings/{meeting.id}/{suffix}",
        headers=auth_as(outsider),
        json=payload,
    )
    assert response.status_code == 403, response.text


def test_owner_of_another_organization_cannot_access_meeting(
    client, db_session, auth_as, recruitment_org,
):
    other_creator = models.User(email="second-owner@example.test", full_name="Second Owner")
    db_session.add(other_creator)
    db_session.flush()
    other_org = models.Organization(name="Other Organization", created_by_id=other_creator.id)
    db_session.add(other_org)
    db_session.flush()
    meeting = models.Meeting(
        organization_id=other_org.id,
        created_by_id=other_creator.id,
        title="Other organization's meeting",
    )
    db_session.add(meeting)
    db_session.commit()

    response = client.get(
        f"/api/v1/meetings/{meeting.id}",
        headers=auth_as(recruitment_org.owner_user),
    )
    assert response.status_code == 403, response.text
    assert db_session.query(models.MeetingMember).filter_by(
        meeting_id=meeting.id, user_id=recruitment_org.owner_user.id,
    ).count() == 0


@pytest.mark.parametrize("route,method,payload", [
    ("", "patch", {"title": "Taken over"}),
    ("/approval", "patch", {"approval_status": "REJECTED"}),
    ("/start-early", "post", None),
    ("", "delete", None),
])
def test_foreign_owner_cannot_mutate_another_org_meeting(
    client, db_session, auth_as, recruitment_org, route, method, payload,
):
    other_creator = models.User(email="another-owner@example.test", full_name="Another Owner")
    db_session.add(other_creator)
    db_session.flush()
    other_org = models.Organization(name="Another Org", created_by_id=other_creator.id)
    db_session.add(other_org)
    db_session.flush()
    meeting = models.Meeting(
        organization_id=other_org.id, created_by_id=other_creator.id, title="Another meeting",
    )
    db_session.add(meeting)
    db_session.commit()
    request_kwargs = {"headers": auth_as(recruitment_org.owner_user)}
    if payload is not None:
        request_kwargs["json"] = payload
    response = getattr(client, method)(f"/api/v1/meetings/{meeting.id}{route}", **request_kwargs)
    assert response.status_code == 403, response.text
    db_session.refresh(meeting)
    assert meeting.title == "Another meeting"
    assert meeting.status == models.MeetingStatusEnum.SCHEDULED


def test_foreign_owner_cannot_list_another_org_meetings(
    client, db_session, auth_as, recruitment_org,
):
    other_creator = models.User(email="listing-owner@example.test", full_name="Listing Owner")
    db_session.add(other_creator)
    db_session.flush()
    other_org = models.Organization(name="Listing Org", created_by_id=other_creator.id)
    db_session.add(other_org)
    db_session.flush()
    meeting = models.Meeting(
        organization_id=other_org.id, created_by_id=other_creator.id, title="Invisible meeting",
    )
    db_session.add(meeting)
    db_session.commit()
    response = client.get(
        f"/api/v1/meetings?org_id={other_org.id}",
        headers=auth_as(recruitment_org.owner_user),
    )
    assert response.status_code == 200, response.text
    assert all(item["id"] != meeting.id for item in response.json())


def test_seeded_admin_email_cannot_invite_to_foreign_org(
    client, db_session, auth_as, recruitment_org, monkeypatch,
):
    from src.backend.api.v1 import org_invitations

    monkeypatch.setattr(org_invitations, "send_org_invitation_email", lambda **kwargs: {"sent": False})
    outsider = models.User(email="admin@axiom.com", full_name="Uninvited Admin")
    db_session.add(outsider)
    db_session.commit()
    response = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/invitations",
        headers=auth_as(outsider),
        json={"email": "target@example.com", "role_id": recruitment_org.member_role.id},
    )
    assert response.status_code == 403, response.text
    assert db_session.query(models.OrganizationInvitation).count() == 0
