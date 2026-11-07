import pytest
from src.backend import models
from src.backend.tests.test_recruitment_models import make_opening


def test_candidate_registration_and_portal_lifecycle(client, auth_as, recruitment_org):
    db = recruitment_org.selected_manager._sa_instance_state.session

    # 1. Create a public active job opening
    opening = models.JobOpening(
        organization_id=recruitment_org.organization.id,
        department_id=recruitment_org.eng_department.id,
        title="Senior AI Fullstack Engineer",
        description="Develop Next.js and FastAPI real-time WebRTC collaborative platforms.",
        requirements="3+ years of React, TypeScript, Python, FastAPI, and Docker experience.",
        created_by_id=recruitment_org.owner.user_id,
        requires_assessment=True,
    )
    db.add(opening)
    db.commit()
    db.refresh(opening)

    # 2. Register an independent candidate (is_candidate=True)
    candidate_email = "candidate.nam@gmail.com"
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": candidate_email,
            "password": "Password123!",
            "full_name": "Nguyễn Văn Nam",
            "phone": "0987654321",
            "job_title": "AI & Web Engineer",
            "is_candidate": True,
        },
    )
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["role"] in ["GUEST", "CANDIDATE"]
    assert user_data["full_name"] == "Nguyễn Văn Nam"

    # 3. Log in as candidate
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": candidate_email, "password": "Password123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 4. Check /auth/me returns CANDIDATE role
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.json()["role"] in ["GUEST", "CANDIDATE"]

    # 5. List public openings
    openings_res = client.get("/api/v1/recruitment/public/openings", headers=headers)
    assert openings_res.status_code == 200
    openings = openings_res.json()
    assert len(openings) >= 1
    found_op = next((o for o in openings if o["id"] == opening.id), None)
    assert found_op is not None
    assert found_op["title"] == "Senior AI Fullstack Engineer"
    assert found_op["requires_assessment"] is True

    # 6. Test AI CV Reviewer
    sample_cv = """
    NGUYỄN VĂN NAM - Kỹ sư AI & Phần mềm
    Email: candidate.nam@gmail.com | Phone: 0987654321 | GitHub: github.com/namdev
    
    TÓM TẮT NGHỀ NGHIỆP:
    Lập trình viên Fullstack với 3 năm kinh nghiệm phát triển hệ thống microservices và AI.
    
    KINH NGHIỆM LÀM VIỆC:
    - Xây dựng hệ thống streaming real-time với FastAPI và React, giảm 40% độ trễ xử lý.
    - Tối ưu hóa kiến trúc Docker và PostgreSQL, phục vụ 10,000 req/s và 50,000 người dùng hàng ngày.
    - Triển khai pipeline CI/CD với Git và Kubernetes cho 5+ microservices.
    
    KỸ NĂNG CHUYÊN MÔN:
    Python, FastAPI, React, Next.js, TypeScript, Docker, SQL, Redis, AI / LLM.
    
    HỌC VẤN:
    Cử nhân Khoa học Máy tính - Đại học Bách Khoa.
    """
    review_res = client.post(
        "/api/v1/recruitment/candidate/cv-review",
        headers=headers,
        json={"cv_text": sample_cv, "target_role": "AI Fullstack Engineer"},
    )
    assert review_res.status_code == 200
    review_data = review_res.json()
    assert review_data["overall_score"] >= 70
    assert review_data["metrics_score"] >= 60
    assert len(review_data["strengths"]) > 0
    assert len(review_data["keyword_matches"]) > 0

    # 7. Apply to the job opening
    apply_res = client.post(
        f"/api/v1/recruitment/public/openings/{opening.id}/apply",
        headers=headers,
        json={
            "cv_url": "https://storage.axiom.local/cv/nam-cv.pdf",
            "cover_letter": "Tôi rất hào hứng được ứng tuyển vào vị trí Senior AI Engineer.",
            "phone": "0987654321",
        },
    )
    assert apply_res.status_code == 200
    app_data = apply_res.json()
    assert app_data["opening_id"] == opening.id
    assert app_data["stage"] == "INVITED"

    # 8. Check my-applications list
    my_apps_res = client.get("/api/v1/recruitment/candidate/my-applications", headers=headers)
    assert my_apps_res.status_code == 200
    my_apps = my_apps_res.json()
    assert len(my_apps) == 1
    assert my_apps[0]["id"] == app_data["id"]
    assert my_apps[0]["opening_title"] == "Senior AI Fullstack Engineer"

    # 9. Duplicate apply should be rejected with 409 Conflict
    dup_res = client.post(
        f"/api/v1/recruitment/public/openings/{opening.id}/apply",
        headers=headers,
        json={"cv_url": "https://storage.axiom.local/cv/nam-cv.pdf"},
    )
    assert dup_res.status_code == 409
