"""Recruitment permissions and authorization checks."""

from typing import Any
from sqlalchemy.orm import Session

from src.backend import models
from src.backend.core.exceptions import ForbiddenException


def has_effective_permission(db: Session, member: models.OrganizationMember, permission_code: str) -> bool:
    """Check if an organization member has a permission via role or direct member-level grant."""
    role_grant = (
        db.query(models.RolePermission)
        .join(models.Permission, models.Permission.id == models.RolePermission.permission_id)
        .filter(models.RolePermission.role_id == member.role_id, models.Permission.code == permission_code)
        .first()
    )
    if role_grant:
        return True

    direct_grant = (
        db.query(models.OrganizationMemberPermission)
        .join(models.Permission, models.Permission.id == models.OrganizationMemberPermission.permission_id)
        .filter(
            models.OrganizationMemberPermission.member_id == member.id,
            models.Permission.code == permission_code,
        )
        .first()
    )
    return bool(direct_grant)


def load_active_org_member(db: Session, organization_id: str, user_id: str) -> models.OrganizationMember:
    """Load and validate that the user is an active member of the specified organization."""
    if not organization_id or not user_id:
        raise ForbiddenException("Active organization membership required")

    member = (
        db.query(models.OrganizationMember)
        .filter(
            models.OrganizationMember.organization_id == organization_id,
            models.OrganizationMember.user_id == user_id,
        )
        .first()
    )
    if member is None:
        raise ForbiddenException("Active organization membership required")
    if member.status != models.OrgMemberStatusEnum.ACTIVE:
        raise ForbiddenException("Organization membership is not active")

    return member


def assert_recruitment_reviewer(db: Session, member: models.OrganizationMember, application: Any) -> None:
    """Assert that a member is authorized to review a recruitment application.
    
    Rules:
    1. Owner or members with recruitment.manage or recruitment.read_all have full access.
    2. Other reviewers must satisfy all three:
       - Have effective permission 'recruitment.review'.
       - Belong to the department of the job opening.
       - Be assigned as the reviewer of the application.
    """
    if getattr(member.role, "name", None) == "OWNER" or (
        member.organization and member.organization.created_by_id == member.user_id
    ):
        return

    if has_effective_permission(db, member, "recruitment.manage") or has_effective_permission(
        db, member, "recruitment.read_all"
    ):
        return

    # Check 1: recruitment.review permission
    if not has_effective_permission(db, member, "recruitment.review"):
        raise ForbiddenException("Missing required permission: recruitment.review")

    # Check 2: Department match
    opening = getattr(application, "opening", None)
    dept_id = getattr(opening, "department_id", getattr(application, "department_id", None))
    if dept_id:
        is_dept_member = (
            db.query(models.DepartmentMember)
            .filter(
                models.DepartmentMember.department_id == dept_id,
                models.DepartmentMember.user_id == member.user_id,
            )
            .first()
        )
        if not is_dept_member:
            raise ForbiddenException("Reviewer does not belong to the target department")

    # Check 3: Assignment match
    assigned_hr_id = getattr(application, "assigned_hr_member_id", None)
    if assigned_hr_id and assigned_hr_id != member.id:
        raise ForbiddenException("Reviewer is not assigned to this recruitment application")
