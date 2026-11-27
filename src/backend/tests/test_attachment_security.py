import io
import uuid
import pytest
from src.backend import models
from src.backend.api import deps
from src.backend.main import app


def test_attachment_security_validation(client, db_session):
    unique_suffix = uuid.uuid4().hex[:6]
    user = models.User(
        email=f"attach_sec_{unique_suffix}@axiom.test",
        full_name="Attach Sec Tester",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    org = models.Organization(name=f"Sec Org {unique_suffix}", created_by_id=user.id)
    db_session.add(org)
    db_session.commit()

    proj = models.JiraProject(
        organization_id=org.id,
        name="Sec Project",
        key=f"SEC{unique_suffix[:2].upper()}",
        created_by_id=user.id,
    )
    db_session.add(proj)
    db_session.commit()

    issue = models.Issue(
        project_id=proj.id,
        key=f"{proj.key}-1",
        summary="Security Hardening Task",
        type=models.IssueTypeEnum.TASK,
        status=models.IssueStatusEnum.TODO,
        priority=models.IssuePriorityEnum.HIGH,
        reporter_id=user.id,
    )
    db_session.add(issue)
    db_session.commit()

    app.dependency_overrides[deps.get_current_user] = lambda: user
    try:
        # TEST 1: Reject dangerous executable file (.exe)
        malicious_file = ("malware.exe", io.BytesIO(b"MZtestpayload"), "application/x-dosexec")
        res = client.post(
            f"/api/v1/jira/issues/{issue.id}/attachments",
            files={"file": malicious_file},
        )
        assert res.status_code == 400, res.text
        data = res.json()
        error_msg = str(data.get("error", {}).get("message", "") or data.get("detail", ""))
        assert "không được phép" in error_msg or "không hợp lệ" in error_msg

        # TEST 2: Accept valid document (.pdf)
        valid_pdf = ("meeting_notes.pdf", io.BytesIO(b"%PDF-1.4 sample pdf content"), "application/pdf")
        res_ok = client.post(
            f"/api/v1/jira/issues/{issue.id}/attachments",
            files={"file": valid_pdf},
        )
        assert res_ok.status_code == 201, res_ok.text
        assert res_ok.json()["filename"] == "meeting_notes.pdf"
    finally:
        app.dependency_overrides.pop(deps.get_current_user, None)
