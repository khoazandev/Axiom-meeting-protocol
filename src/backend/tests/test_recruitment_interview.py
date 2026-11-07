from datetime import datetime, timedelta, timezone
import json
import jwt
import pytest
from src.backend import models
from src.backend.core.config import get_settings
from src.backend.core.exceptions import ForbiddenException
from src.backend.core.security import create_candidate_access_token
from src.backend.services.interview_service import InterviewService
from src.backend.tests.test_recruitment_models import make_application, make_opening


def decode_livekit_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.livekit_api_secret, algorithms=["HS256"])


def test_guest_access_is_scoped_to_linked_meeting(client, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org, stage="INVITED")

    # Schedule interview
    service = InterviewService(db)
    session = service.schedule(
        application_id=app.id,
        scheduled_at=datetime.now(timezone.utc) + timedelta(days=2),
        interviewer_member_ids=[recruitment_org.selected_manager.id],
        actor_member=recruitment_org.owner,
    )

    cand_jwt = create_candidate_access_token(application_id=app.id, candidate_id=app.candidate_id)
    cand_headers = {"Authorization": f"Bearer {cand_jwt}"}

    res = client.post(
        f"/api/v1/recruitment/interviews/{session.id}/guest-access",
        headers=cand_headers,
    )
    assert res.status_code == 200
    token_str = res.json()["token"]
    claims = decode_livekit_token(token_str)
    assert claims["video"]["room"] == f"meeting-{session.meeting_id}"
    assert claims["video"]["roomJoin"] is True


def test_ai_source_is_blocked_without_consent(recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org)
    service = InterviewService(db)
    session = service.schedule(
        application_id=app.id,
        scheduled_at=datetime.now(timezone.utc) + timedelta(days=2),
        interviewer_member_ids=[recruitment_org.selected_manager.id],
        actor_member=recruitment_org.owner,
    )

    # Consent not given
    session.consent_recording = False
    session.consent_ai_evaluation = False
    db.commit()

    with pytest.raises(ForbiddenException):
        service.assert_ai_consent(session.id)


def test_schedule_interview_and_candidate_consent_flow(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    app = make_application(db, recruitment_org, stage="INVITED", version=1)

    owner_headers = auth_as(recruitment_org.owner_user)
    scheduled_time = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()

    # 1. Schedule interview
    res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/applications/{app.id}/interviews",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
        json={
            "scheduled_at": scheduled_time,
            "interviewer_member_ids": [recruitment_org.selected_manager.id],
        },
    )
    assert res.status_code == 201
    session_id = res.json()["id"]
    meeting_id = res.json()["meeting_id"]

    # Verify meeting created
    meeting = db.query(models.Meeting).filter_by(id=meeting_id).first()
    assert meeting is not None
    assert meeting.meeting_type == "RECRUITMENT_INTERVIEW"

    # Verify stage advanced
    db.refresh(app)
    assert app.stage == models.RecruitmentStageEnum.INTERVIEW_SCHEDULED

    # 2. Candidate records consent
    cand_jwt = create_candidate_access_token(application_id=app.id, candidate_id=app.candidate_id)
    cand_headers = {"Authorization": f"Bearer {cand_jwt}"}

    consent_res = client.post(
        f"/api/v1/recruitment/interviews/{session_id}/consent",
        headers=cand_headers,
        json={"recording": True, "transcription": True, "ai_evaluation": True},
    )
    assert consent_res.status_code == 200
    assert consent_res.json()["consent_recording"] is True
    assert consent_res.json()["consent_ai_evaluation"] is True

    # 3. Assert AI consent now passes
    InterviewService(db).assert_ai_consent(session_id)

    # 4. Complete interview advances stage to HR_REVIEW_PENDING
    complete_res = client.post(
        f"/api/v1/organizations/{recruitment_org.organization.id}/recruitment/interviews/{session_id}/complete",
        headers={"X-Organization-ID": recruitment_org.organization.id, **owner_headers},
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"

    db.refresh(app)
    assert app.stage == models.RecruitmentStageEnum.HR_REVIEW_PENDING
