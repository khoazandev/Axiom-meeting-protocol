import pytest
from src.backend.services import email_service

def test_render_email_templates():
    invite_html = email_service.render_invitation_email("guest@company.com", "Architecture Sync", "https://axiom.app/invite/token123")
    assert "Architecture Sync" in invite_html
    assert "token123" in invite_html

    task_html = email_service.render_task_assigned_email("dev@company.com", "Build Webhook Handler", "Phase 3 Meeting")
    assert "Build Webhook Handler" in task_html

    mom_html = email_service.render_mom_digest_email("boss@company.com", "Phase 4 Review", "Executive Summary: Success.")
    assert "Executive Summary: Success." in mom_html
