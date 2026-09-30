"""Tests for real knowledge search, tenant isolation, and recent transcripts."""

import datetime
from types import SimpleNamespace
import pytest
from src.backend import models


@pytest.fixture
def knowledge_context(db_session, auth_as):
    # Org 1 & User 1
    owner1 = models.User(email="owner1@example.test", full_name="Owner One")
    db_session.add(owner1)
    db_session.flush()

    org1 = models.Organization(name="Org One", created_by_id=owner1.id)
    db_session.add(org1)
    db_session.flush()

    role1 = models.Role(
        name="MEMBER",
        description="Member",
        organization_id=org1.id,
        scope=models.RoleScopeEnum.ORGANIZATION,
    )
    db_session.add(role1)
    db_session.flush()

    user1 = models.User(email="user1@example.test", full_name="User One")
    db_session.add(user1)
    db_session.flush()

    mem1 = models.OrganizationMember(
        organization_id=org1.id,
        user_id=user1.id,
        role_id=role1.id,
        status=models.OrgMemberStatusEnum.ACTIVE,
    )
    db_session.add(mem1)

    meeting1 = models.Meeting(
        organization_id=org1.id,
        created_by_id=user1.id,
        title="Engineering Sync Meeting",
    )
    db_session.add(meeting1)
    db_session.flush()

    seg1 = models.TranscriptSegment(
        meeting_id=meeting1.id,
        speaker_id=user1.id,
        content="We achieved consensus on the architecture proposal.",
        start_time="00:01",
        end_time="00:05",
        sequence=1,
        created_at=datetime.datetime(2026, 9, 30, 10, 0, 0),
    )
    db_session.add(seg1)

    # Org 2 & User 2
    owner2 = models.User(email="owner2@example.test", full_name="Owner Two")
    db_session.add(owner2)
    db_session.flush()

    org2 = models.Organization(name="Org Two", created_by_id=owner2.id)
    db_session.add(org2)
    db_session.flush()

    role2 = models.Role(
        name="MEMBER",
        description="Member",
        organization_id=org2.id,
        scope=models.RoleScopeEnum.ORGANIZATION,
    )
    db_session.add(role2)
    db_session.flush()

    user2 = models.User(email="user2@example.test", full_name="User Two")
    db_session.add(user2)
    db_session.flush()

    mem2 = models.OrganizationMember(
        organization_id=org2.id,
        user_id=user2.id,
        role_id=role2.id,
        status=models.OrgMemberStatusEnum.ACTIVE,
    )
    db_session.add(mem2)

    meeting2 = models.Meeting(
        organization_id=org2.id,
        created_by_id=user2.id,
        title="Foreign Organization Meeting",
    )
    db_session.add(meeting2)
    db_session.flush()

    seg2 = models.TranscriptSegment(
        meeting_id=meeting2.id,
        speaker_id=user2.id,
        content="This contains foreign-only-phrase secrets.",
        start_time="00:01",
        end_time="00:05",
        sequence=1,
        created_at=datetime.datetime(2026, 9, 30, 11, 0, 0),
    )
    db_session.add(seg2)

    # Add extra segments to meeting1 to test pagination and ordering
    for i in range(2, 25):
        db_session.add(
            models.TranscriptSegment(
                meeting_id=meeting1.id,
                speaker_id=user1.id,
                content=f"Discussion segment number {i}",
                start_time=f"00:{i:02d}",
                end_time=f"00:{i+1:02d}",
                sequence=i,
                created_at=datetime.datetime(2026, 9, 30, 10, i, 0),
            )
        )

    db_session.commit()

    headers = {"X-Organization-ID": org1.id, **auth_as(user1)}
    return SimpleNamespace(
        headers=headers,
        user=user1,
        own_meeting=meeting1,
        foreign_meeting=meeting2,
        own_org=org1,
        foreign_org=org2,
    )


def test_search_returns_matching_transcript_content(client, knowledge_context):
    response = client.post(
        "/api/v1/knowledge/search",
        json={"query": "consensus"},
        headers=knowledge_context.headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_matches"] >= 1
    assert data["matches"][0]["snippet"].lower().find("consensus") >= 0
    assert data["matches"][0]["type"] == "transcript"
    assert data["matches"][0]["meeting_id"] == knowledge_context.own_meeting.id


def test_search_returns_empty_matches_instead_of_system_result(client, knowledge_context):
    response = client.post(
        "/api/v1/knowledge/search",
        json={"query": "not-present"},
        headers=knowledge_context.headers,
    )
    assert response.status_code == 200
    assert response.json() == {"query": "not-present", "total_matches": 0, "matches": []}


def test_search_never_returns_another_organization_transcript(client, knowledge_context):
    response = client.post(
        "/api/v1/knowledge/search",
        json={"query": "foreign-only-phrase"},
        headers=knowledge_context.headers,
    )
    assert response.status_code == 200
    assert response.json()["matches"] == []


def test_recent_transcripts_returns_descending_and_capped(client, knowledge_context):
    response = client.get(
        "/api/v1/knowledge/transcripts/recent?limit=20",
        headers=knowledge_context.headers,
    )
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 20
    # Should be sorted descending by created_at
    for idx in range(len(items) - 1):
        assert items[idx]["created_at"] >= items[idx + 1]["created_at"]
    # All items must belong to own meeting/org
    for item in items:
        assert item["meeting_id"] == knowledge_context.own_meeting.id
        assert item["type"] == "transcript"
