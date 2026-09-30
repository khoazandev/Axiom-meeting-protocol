import datetime
from datetime import timezone
from types import SimpleNamespace
import pytest
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.seeds.seed_rbac import seed_roles_and_permissions


@pytest.fixture
def recruitment_org(db_session: Session) -> SimpleNamespace:
    """Fixture providing an organization with owner, two managers, departments, and seeded RBAC."""
    seed_roles_and_permissions(db_session)

    owner_role = db_session.query(models.Role).filter_by(name="OWNER").first()
    manager_role = db_session.query(models.Role).filter_by(name="MANAGER").first()
    member_role = db_session.query(models.Role).filter_by(name="MEMBER").first()

    review_perm = db_session.query(models.Permission).filter_by(code="recruitment.review").first()
    manage_perm = db_session.query(models.Permission).filter_by(code="recruitment.manage").first()
    approve_perm = db_session.query(models.Permission).filter_by(code="recruitment.approve").first()

    # 1. Create Owner User
    owner_user = models.User(
        email="owner@axiom.test",
        full_name="Alice Owner",
        is_active=True,
    )
    db_session.add(owner_user)
    db_session.flush()

    # 2. Create Organization
    org = models.Organization(
        name="Axiom Corp",
        created_by_id=owner_user.id,
    )
    db_session.add(org)
    db_session.flush()

    owner_member = models.OrganizationMember(
        organization_id=org.id,
        user_id=owner_user.id,
        role_id=owner_role.id,
        status=models.OrgMemberStatusEnum.ACTIVE,
    )
    db_session.add(owner_member)

    # 3. Create Departments
    eng_dept = models.Department(
        organization_id=org.id,
        name="Engineering",
    )
    sales_dept = models.Department(
        organization_id=org.id,
        name="Sales",
    )
    db_session.add_all([eng_dept, sales_dept])
    db_session.flush()

    # 4. Create Selected Manager (in Engineering)
    selected_mgr_user = models.User(
        email="manager.selected@axiom.test",
        full_name="Bob Selected Manager",
        is_active=True,
    )
    db_session.add(selected_mgr_user)
    db_session.flush()

    selected_member = models.OrganizationMember(
        organization_id=org.id,
        user_id=selected_mgr_user.id,
        role_id=manager_role.id,
        status=models.OrgMemberStatusEnum.ACTIVE,
    )
    db_session.add(selected_member)
    db_session.flush()

    assert review_perm is not None
    db_session.add(
        models.OrganizationMemberPermission(
            member_id=selected_member.id,
            permission_id=review_perm.id,
            granted_by_id=owner_user.id,
        )
    )

    dept_member = models.DepartmentMember(
        department_id=eng_dept.id,
        user_id=selected_mgr_user.id,
        role_id=manager_role.id,
    )
    db_session.add(dept_member)

    # 5. Create Other Manager (in Sales)
    other_mgr_user = models.User(
        email="manager.other@axiom.test",
        full_name="Charlie Other Manager",
        is_active=True,
    )
    db_session.add(other_mgr_user)
    db_session.flush()

    other_member = models.OrganizationMember(
        organization_id=org.id,
        user_id=other_mgr_user.id,
        role_id=manager_role.id,
        status=models.OrgMemberStatusEnum.ACTIVE,
    )
    db_session.add(other_member)
    db_session.flush()

    dept_member_other = models.DepartmentMember(
        department_id=sales_dept.id,
        user_id=other_mgr_user.id,
        role_id=manager_role.id,
    )
    db_session.add(dept_member_other)

    db_session.commit()
    db_session.refresh(org)
    db_session.refresh(owner_member)
    db_session.refresh(selected_member)
    db_session.refresh(other_member)

    return SimpleNamespace(
        organization=org,
        owner=owner_member,
        owner_user=owner_user,
        selected_manager=selected_member,
        selected_manager_user=selected_mgr_user,
        other_manager=other_member,
        other_manager_user=other_mgr_user,
        eng_department=eng_dept,
        sales_department=sales_dept,
        review_permission=review_perm,
        manage_permission=manage_perm,
        approve_permission=approve_perm,
        owner_role=owner_role,
        manager_role=manager_role,
        member_role=member_role,
    )


@pytest.fixture
def auth_as():
    def _auth(user: models.User):
        from src.backend.core.security import create_access_token
        from src.backend.api import deps
        from src.backend.main import app

        token = create_access_token(data={"sub": user.id, "type": "access"})
        app.dependency_overrides[deps.get_current_user] = lambda: user
        return {"Authorization": f"Bearer {token}"}

    return _auth
