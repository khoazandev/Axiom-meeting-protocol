import uuid
import pytest
from src.backend import models
from src.backend.api import deps
from src.backend.main import app


def test_hybrid_knowledge_search(client, db_session):
    unique_suffix = uuid.uuid4().hex[:6]
    user = models.User(
        email=f"knowledge_user_{unique_suffix}@axiom.test",
        full_name="Knowledge Expert",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    org = models.Organization(name=f"Knowledge Org {unique_suffix}", created_by_id=user.id)
    db_session.add(org)
    db_session.commit()

    role = db_session.query(models.Role).filter(models.Role.name == "MEMBER").first()
    if not role:
        role = models.Role(name="MEMBER", description="Member", scope=models.RoleScopeEnum.ORGANIZATION)
        db_session.add(role)
        db_session.commit()

    member = models.OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role_id=role.id,
        status="ACTIVE",
    )
    db_session.add(member)

    # Add a meeting with transcript segments
    meeting = models.Meeting(
        organization_id=org.id,
        created_by_id=user.id,
        title="Họp Chiến Lược Phát Triển Doanh Thu",
        status=models.MeetingStatusEnum.COMPLETED,
    )
    db_session.add(meeting)
    db_session.commit()

    seg1 = models.TranscriptSegment(
        meeting_id=meeting.id,
        sequence=1,
        speaker_id=user.id,
        start_time="00:00:05",
        end_time="00:00:15",
        content="Chúng ta cần tối ưu hóa chiến lược tăng trưởng doanh thu quý 4 bằng AI.",
    )
    seg2 = models.TranscriptSegment(
        meeting_id=meeting.id,
        sequence=2,
        speaker_id=user.id,
        start_time="00:00:16",
        end_time="00:00:30",
        content="Báo cáo kỹ thuật về hạ tầng âm thanh WebRTC đã hoàn thành tốt.",
    )
    db_session.add_all([seg1, seg2])
    db_session.commit()

    # Search with Header X-Organization-ID
    app.dependency_overrides[deps.get_current_user] = lambda: user
    app.dependency_overrides[deps.get_current_org_member] = lambda: member
    try:
        # Search query: "chiến lược doanh thu"
        res = client.post(
            "/api/v1/knowledge/search",
            headers={"X-Organization-ID": org.id},
            json={"query": "chiến lược doanh thu"},
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["total_matches"] >= 1
        matches = data["matches"]
        # The first match should be the most relevant (seg1)
        assert any("doanh thu" in m["snippet"].lower() for m in matches)
        assert matches[0]["meeting_id"] == meeting.id
    finally:
        app.dependency_overrides.pop(deps.get_current_user, None)
        app.dependency_overrides.pop(deps.get_current_org_member, None)
