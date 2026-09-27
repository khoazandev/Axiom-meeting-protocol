"""Candidate portal API endpoints."""

from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.exceptions import NotFoundException
from src.backend.database import get_db
from src.backend.models import AssessmentAttempt, RecruitmentApplication
from src.backend.schemas.recruitment import (
    ApplicationDetail,
    AssessmentAttemptResponse,
    AssessmentSubmit,
)
from src.backend.services.assessment_service import AssessmentService
from src.backend.services.candidate_auth import (
    exchange_invitation_token,
    get_current_candidate_application,
)
from src.backend.services.recruitment_workflow import RecruitmentCommand, RecruitmentWorkflow

router = APIRouter(
    prefix="/recruitment",
    tags=["candidate-recruitment"],
)


@router.post("/invitations/{token}/session")
def exchange_candidate_token(
    token: str,
    db: Session = Depends(get_db),
):
    """Exchange raw invitation token for a 30-minute candidate JWT access token."""
    jwt_token, application = exchange_invitation_token(db, token)
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "application_id": application.id,
        "candidate_id": application.candidate_id,
    }


@router.get("/applications/me", response_model=ApplicationDetail)
def get_candidate_application(
    app: RecruitmentApplication = Depends(get_current_candidate_application),
):
    """Retrieve application status and details for the authenticated candidate."""
    return app


@router.get("/applications/me/assessment", response_model=AssessmentAttemptResponse)
def get_candidate_assessment(
    app: RecruitmentApplication = Depends(get_current_candidate_application),
    db: Session = Depends(get_db),
):
    """Retrieve current assessment attempt for candidate."""
    attempt = (
        db.query(AssessmentAttempt)
        .filter_by(application_id=app.id)
        .order_by(AssessmentAttempt.created_at.desc())
        .first()
    )
    if not attempt:
        raise NotFoundException("Assessment attempt")
    return attempt


@router.post("/applications/me/assessment/submit", response_model=AssessmentAttemptResponse)
def submit_candidate_assessment(
    payload: AssessmentSubmit,
    app: RecruitmentApplication = Depends(get_current_candidate_application),
    db: Session = Depends(get_db),
):
    """Submit candidate answers and complete assessment."""
    service = AssessmentService(db)
    return service.submit_attempt(app.id, payload.answers_json)


@router.post("/applications/me/withdraw")
def withdraw_candidate_application(
    app: RecruitmentApplication = Depends(get_current_candidate_application),
    db: Session = Depends(get_db),
):
    """Allow candidate to withdraw their application."""
    workflow = RecruitmentWorkflow(db)
    workflow.advance(app.id, RecruitmentCommand("WITHDRAW"))
    return {"message": "Application successfully withdrawn"}
