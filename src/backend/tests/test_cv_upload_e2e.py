import io
import json
import time
import pytest
from src.backend import models


def test_cv_upload_and_application_e2e_flow(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session
    org_id = recruitment_org.organization.id

    # 0. Ensure an active opening exists
    opening = models.JobOpening(
        organization_id=org_id,
        department_id=recruitment_org.eng_department.id,
        title="Chuyên viên Kỹ thuật Phần mềm",
        description="Phát triển hệ thống microservices và real-time collaboration",
        requirements="Python, FastAPI, Next.js, Docker",
        created_by_id=recruitment_org.owner.user_id,
        status=models.JobOpeningStatusEnum.ACTIVE,
        requires_assessment=False,
    )
    db.add(opening)
    db.commit()
    db.refresh(opening)

    # 1. Test CV File Upload
    dummy_pdf = b"%PDF-1.4\n1 0 obj\n<< /Title (Test CV File) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    files = {"file": ("Nguyen_Van_A_CV.pdf", io.BytesIO(dummy_pdf), "application/pdf")}
    r_upload = client.post("/api/v1/public/careers/upload-cv", files=files)
    assert r_upload.status_code == 200, f"Upload failed: {r_upload.text}"
    upload_data = r_upload.json()
    assert upload_data["success"] is True
    file_url = upload_data["file_url"]
    unique_filename = upload_data["unique_filename"]

    # 2. Test File Serving
    r_file = client.get(file_url)
    assert r_file.status_code == 200, f"File serve failed: {r_file.text}"
    assert r_file.content == dummy_pdf, "File contents mismatch"

    # 3. Test Apply with full professional profile & uploaded CV file
    cand_email = f"candidate_prof_{int(time.time())}@gmail.com"
    payload = {
        "opening_id": opening.id,
        "full_name": "Trần Thị Thu Thảo",
        "email": cand_email,
        "phone": "0912345678",
        "current_title": "Chuyên viên Kỹ thuật Phần mềm",
        "years_of_experience": "3 - 5 năm kinh nghiệm",
        "education_level": "Kỹ sư chuyên nghiệp",
        "location": "TP. Hồ Chí Minh",
        "expected_salary": "28 - 45 triệu VNĐ / tháng",
        "earliest_start_date": "Trong vòng 1 - 2 tuần",
        "skills": ["React", "FastAPI", "Docker", "PostgreSQL", "AI / LLM Integration"],
        "cv_url": file_url,
        "cover_letter": "Kính gửi Ban Tuyển dụng Axiom, tôi có nhiều năm kinh nghiệm thực chiến phát triển các giải pháp số và rất mong được cống hiến.",
        "linkedin_url": "https://linkedin.com/in/thuthao",
        "portfolio_url": "https://github.com/thuthao",
    }
    r_apply = client.post("/api/v1/public/careers/apply", json=payload)
    assert r_apply.status_code == 201, f"Apply failed: {r_apply.text}"
    apply_data = r_apply.json()
    assert apply_data["success"] is True
    tracking_code = apply_data["tracking_code"]
    app_id = apply_data["application_id"]

    # 4. Test Public Tracking with the new code
    r_track = client.post(
        "/api/v1/public/careers/track",
        json={"email": cand_email, "tracking_code": tracking_code},
    )
    assert r_track.status_code == 200, f"Tracking failed: {r_track.text}"
    track_data = r_track.json()
    assert track_data["tracking_code"] == tracking_code
    assert track_data["stage"] == "INVITED"

    # 5. Test HR / Admin viewing the candidate's resume via /applications/{app_id}/resume
    owner_headers = auth_as(recruitment_org.owner_user)
    headers = {"X-Organization-ID": org_id, **owner_headers}
    r_resume = client.get(
        f"/api/v1/organizations/{org_id}/recruitment/applications/{app_id}/resume",
        headers=headers,
    )
    assert r_resume.status_code == 200, f"HR View resume failed: {r_resume.text}"
    resume_data = r_resume.json()
    assert resume_data["file_url"] == file_url
    assert resume_data["template_id"] == "pdf"
    assert "Trần Thị Thu Thảo" in resume_data["title"]
