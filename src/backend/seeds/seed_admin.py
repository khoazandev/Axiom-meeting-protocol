"""Seed default admin account and organization."""

from sqlalchemy.orm import Session
from src.backend.core.security import hash_password
from src.backend.database import SessionLocal
from src.backend.models import Organization, OrganizationMember, OrgMemberStatusEnum, Role, User
from src.backend.seeds.seed_rbac import seed_roles_and_permissions


def seed_admin_user(db: Session) -> dict:
    """Create default system admin user if not already exists."""
    seed_roles_and_permissions(db)

    admin_email = "admin@axiom.com"
    admin_password = "admin"  # or admin123
    admin_name = "System Admin"

    # Remove old invalid emails if any
    db.query(User).filter(User.email == "admin@axiom.local").delete()
    db.commit()

    existing_user = db.query(User).filter(User.email == admin_email).first()
    if existing_user:
        return {
            "email": existing_user.email,
            "password": admin_password,
            "full_name": existing_user.full_name,
        }

    # 1. Create Admin User
    user = User(
        email=admin_email,
        password_hash=hash_password(admin_password),
        full_name=admin_name,
        provider="local",
    )
    db.add(user)
    db.flush()

    # 2. Create Default Organization
    org = Organization(
        name="Axiom Enterprise",
        created_by_id=user.id,
    )
    db.add(org)
    db.flush()

    # 3. Assign OWNER Role
    owner_role = db.query(Role).filter(Role.name == "OWNER", Role.is_system == True).first()
    if owner_role:
        member = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            role_id=owner_role.id,
            status=OrgMemberStatusEnum.ACTIVE,
        )
        db.add(member)

    db.commit()
    db.refresh(user)

    return {
        "email": admin_email,
        "password": admin_password,
        "full_name": admin_name,
        "org": org.name,
    }


if __name__ == "__main__":
    with SessionLocal() as db:
        result = seed_admin_user(db)
        print("Admin user seeded:", result)
