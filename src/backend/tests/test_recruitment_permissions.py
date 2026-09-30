from types import SimpleNamespace
import pytest
from src.backend import models
from src.backend.core.exceptions import ForbiddenException
from src.backend.services.recruitment_permissions import (
    assert_recruitment_reviewer,
    has_effective_permission,
    load_active_org_member,
)


def test_direct_review_grant_applies_only_to_selected_manager(db_session, recruitment_org):
    selected, other, permission = (
        recruitment_org.selected_manager,
        recruitment_org.other_manager,
        recruitment_org.review_permission,
    )
    assert has_effective_permission(db_session, selected, "recruitment.review") is True
    assert has_effective_permission(db_session, other, "recruitment.review") is False


def test_role_based_permission_is_recognized(db_session, recruitment_org):
    owner = recruitment_org.owner
    assert has_effective_permission(db_session, owner, "recruitment.manage") is True
    assert has_effective_permission(db_session, owner, "recruitment.approve") is True


def test_manager_does_not_have_recruitment_permissions_by_default(db_session, recruitment_org):
    other = recruitment_org.other_manager
    assert has_effective_permission(db_session, other, "recruitment.manage") is False
    assert has_effective_permission(db_session, other, "recruitment.approve") is False
    assert has_effective_permission(db_session, other, "recruitment.review") is False


def test_inactive_membership_is_rejected(db_session, recruitment_org):
    recruitment_org.selected_manager.status = models.OrgMemberStatusEnum.SUSPENDED
    db_session.commit()
    with pytest.raises(ForbiddenException):
        load_active_org_member(
            db_session,
            recruitment_org.organization.id,
            recruitment_org.selected_manager.user_id,
        )


def test_active_membership_is_loaded_successfully(db_session, recruitment_org):
    member = load_active_org_member(
        db_session,
        recruitment_org.organization.id,
        recruitment_org.selected_manager.user_id,
    )
    assert member.id == recruitment_org.selected_manager.id


def test_assert_recruitment_reviewer_for_owner_succeeds(db_session, recruitment_org):
    mock_app = SimpleNamespace(
        organization_id=recruitment_org.organization.id,
        opening=SimpleNamespace(department_id=recruitment_org.eng_department.id),
        assigned_hr_member_id=recruitment_org.selected_manager.id,
    )
    # Owner has recruitment.manage / approve and can review anything
    assert_recruitment_reviewer(db_session, recruitment_org.owner, mock_app)


def test_assert_recruitment_reviewer_for_assigned_manager_with_permission(
    db_session, recruitment_org
):
    selected = recruitment_org.selected_manager
    mock_app = SimpleNamespace(
        organization_id=recruitment_org.organization.id,
        opening=SimpleNamespace(department_id=recruitment_org.eng_department.id),
        assigned_hr_member_id=selected.id,
    )
    assert_recruitment_reviewer(db_session, selected, mock_app)


def test_assert_recruitment_reviewer_rejects_manager_without_permission(
    db_session, recruitment_org
):
    ungranted = recruitment_org.other_manager
    mock_app = SimpleNamespace(
        organization_id=recruitment_org.organization.id,
        opening=SimpleNamespace(department_id=recruitment_org.eng_department.id),
        assigned_hr_member_id=ungranted.id,
    )
    with pytest.raises(ForbiddenException, match="recruitment.review"):
        assert_recruitment_reviewer(db_session, ungranted, mock_app)


def test_assert_recruitment_reviewer_rejects_manager_from_different_department(
    db_session, recruitment_org
):
    other = recruitment_org.other_manager  # in Sales department
    db_session.add(
        models.OrganizationMemberPermission(
            member_id=other.id,
            permission_id=recruitment_org.review_permission.id,
            granted_by_id=recruitment_org.owner.user_id,
        )
    )
    db_session.commit()

    mock_app = SimpleNamespace(
        organization_id=recruitment_org.organization.id,
        opening=SimpleNamespace(department_id=recruitment_org.eng_department.id),
        assigned_hr_member_id=other.id,
    )
    with pytest.raises(ForbiddenException, match="department"):
        assert_recruitment_reviewer(db_session, other, mock_app)


def test_assert_recruitment_reviewer_rejects_unassigned_manager(
    db_session, recruitment_org
):
    selected = recruitment_org.selected_manager
    mock_app = SimpleNamespace(
        organization_id=recruitment_org.organization.id,
        opening=SimpleNamespace(department_id=recruitment_org.eng_department.id),
        assigned_hr_member_id=recruitment_org.other_manager.id,  # assigned to someone else!
    )
    with pytest.raises(ForbiddenException, match="assigned"):
        assert_recruitment_reviewer(db_session, selected, mock_app)
