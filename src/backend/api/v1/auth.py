import datetime
from datetime import timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.backend.api.deps import get_current_user
from src.backend.core.exceptions import AuthenticationException, ValidationException
from src.backend.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from src.backend.database import get_db
from src.backend.models import (
    User,
    Organization,
    Department,
    OrganizationMember,
    DepartmentMember,
    OrganizationInvitation,
    OrgInvitationStatusEnum,
    OrgMemberStatusEnum,
    Role,
)
from src.backend.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


import re

def normalize_email(email: str) -> str:
    cleaned = email.strip().lower()
    if "@" not in cleaned:
        return cleaned + "@gmail.com"
    return cleaned


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    invitation = None
    is_creating_new_org = bool(payload.organization_name and payload.organization_name.strip())

    if payload.invite_token:
        clean_inv = payload.invite_token.strip()
        if "code=" in clean_inv:
            clean_inv = clean_inv.split("code=")[1].split("&")[0]
        elif "invite_token=" in clean_inv:
            clean_inv = clean_inv.split("invite_token=")[1].split("&")[0]
        elif "token=" in clean_inv:
            clean_inv = clean_inv.split("token=")[1].split("&")[0]
        elif "/invite/" in clean_inv:
            clean_inv = clean_inv.split("/invite/")[1].split("?")[0]

        invitation = (
            db.query(OrganizationInvitation)
            .filter(
                (OrganizationInvitation.token == clean_inv) | (OrganizationInvitation.invite_code == clean_inv),
                OrganizationInvitation.status == OrgInvitationStatusEnum.PENDING,
            )
            .first()
        )
        if not invitation:
            raise ValidationException("Mã mời không tồn tại, đã hết hạn hoặc đã được sử dụng")

        now = datetime.datetime.now(timezone.utc)
        if invitation.expires_at.replace(tzinfo=timezone.utc) < now:
            invitation.status = OrgInvitationStatusEnum.EXPIRED
            db.commit()
            raise ValidationException("Thư mời đã hết hạn hiệu lực (quá 7 ngày)")

        # Prioritize email from invitation
        email = normalize_email(invitation.email)
    elif is_creating_new_org:
        # Creating a brand-new Organization / Company as Founder & OWNER
        pass
    else:
        # Invitation-only security enforcement for existing companies
        user_count = db.query(User).count()
        if user_count > 0 and email != "admin@axiom.com":
            raise ValidationException(
                "Để đăng ký tài khoản, vui lòng chọn tab 'Khởi tạo Công ty mới' (nếu bạn là chủ doanh nghiệp) "
                "hoặc sử dụng Thư mời chính thức gửi qua Email từ Quản trị viên để gia nhập công ty."
            )

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ValidationException("Tài khoản với email này đã tồn tại trong hệ thống")

    hashed_pw = hash_password(payload.password)
    user = User(
        email=email,
        password_hash=hashed_pw,
        full_name=payload.full_name,
        phone=payload.phone or (invitation.phone if invitation else None),
        job_title=payload.job_title or (invitation.job_title if invitation else ("Chủ tịch / Founder" if is_creating_new_org else None)),
        provider="local",
    )
    db.add(user)
    db.flush()

    if invitation:
        # Link user to Organization
        org_member = OrganizationMember(
            organization_id=invitation.organization_id,
            user_id=user.id,
            role_id=invitation.role_id,
            status=OrgMemberStatusEnum.ACTIVE,
        )
        db.add(org_member)

        # Department assignment: payload.department_id can be updated by user, fallback to invitation.department_id
        final_dept_id = payload.department_id or invitation.department_id
        if final_dept_id:
            dept_member = DepartmentMember(
                department_id=final_dept_id,
                user_id=user.id,
                role_id=invitation.role_id,
            )
            db.add(dept_member)

        invitation.status = OrgInvitationStatusEnum.ACCEPTED
        invitation.accepted_at = datetime.datetime.now(timezone.utc)

    elif is_creating_new_org:
        org_name = payload.organization_name.strip()
        new_org = Organization(
            name=org_name,
            created_by_id=user.id,
        )
        db.add(new_org)
        db.flush()

        owner_role = (
            db.query(Role)
            .filter(Role.name == "OWNER", Role.is_system == True)
            .first()
        )
        if not owner_role:
            owner_role = db.query(Role).filter(Role.name == "OWNER").first()

        if owner_role:
            org_member = OrganizationMember(
                organization_id=new_org.id,
                user_id=user.id,
                role_id=owner_role.id,
                status=OrgMemberStatusEnum.ACTIVE,
            )
            db.add(org_member)

            # Auto create foundational corporate departments
            default_departments = [
                ("Ban Điều Hành", "Hội đồng quản trị và ban giám đốc điều hành"),
                ("Kỹ Thuật & Công Nghệ", "Nghiên cứu phát triển sản phẩm, hạ tầng kỹ thuật và công nghệ"),
                ("Kinh Doanh & Tiếp Thị", "Chiến lược tăng trưởng kinh doanh, phát triển thị trường và khách hàng"),
                ("Tài Chính & Nhân Sự", "Hoạch định tài chính kế toán và quản trị nhân sự"),
            ]
            first_dept = None
            for d_name, d_desc in default_departments:
                dept = Department(
                    organization_id=new_org.id,
                    name=d_name,
                    description=d_desc,
                )
                db.add(dept)
                if first_dept is None:
                    first_dept = dept
            db.flush()

            if first_dept:
                dept_member = DepartmentMember(
                    department_id=first_dept.id,
                    user_id=user.id,
                    role_id=owner_role.id,
                )
                db.add(dept_member)

    db.commit()
    db.refresh(user)
    role_name = _resolve_user_role(user, db)
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        role=role_name,
        phone=user.phone,
        job_title=user.job_title,
        provider=user.provider,
        is_active=user.is_active,
    )


@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise AuthenticationException("Invalid email or password")

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


def _resolve_user_role(user: User, db: Session) -> str:
    membership = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user.id)
        .first()
    )
    if membership and membership.role_id:
        role_obj = db.query(Role).filter(Role.id == membership.role_id).first()
        if role_obj and role_obj.name:
            return role_obj.name.upper()

    if user.email == "admin@axiom.com":
        return "OWNER"
    elif user.email == "manager.khoa@axiom.com":
        return "MANAGER"
    return "MEMBER"


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role_name = _resolve_user_role(current_user, db)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        role=role_name,
        phone=current_user.phone,
        job_title=current_user.job_title,
        provider=current_user.provider,
        is_active=current_user.is_active,
    )


@router.patch("/me", response_model=UserResponse)
@router.put("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None:
        trimmed = payload.full_name.strip()
        if trimmed:
            current_user.full_name = trimmed
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url
    db.commit()
    db.refresh(current_user)
    role_name = _resolve_user_role(current_user, db)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        role=role_name,
        phone=current_user.phone,
        job_title=current_user.job_title,
        provider=current_user.provider,
        is_active=current_user.is_active,
    )

