"""
TDD tests for platform redesign models.
All tests written FIRST — implementation follows.
"""
import pytest

from src.backend import models


class TestNewEnums:
    """RED: These tests define the expected enum types."""

    def test_org_member_status_enum(self):
        assert models.OrgMemberStatusEnum.ACTIVE == "ACTIVE"
        assert models.OrgMemberStatusEnum.SUSPENDED == "SUSPENDED"
        assert models.OrgMemberStatusEnum.DEACTIVATED == "DEACTIVATED"

    def test_meeting_member_role_enum(self):
        assert models.MeetingMemberRoleEnum.HOST == "HOST"
        assert models.MeetingMemberRoleEnum.CO_HOST == "CO_HOST"
        assert models.MeetingMemberRoleEnum.PARTICIPANT == "PARTICIPANT"

    def test_meeting_member_status_enum(self):
        assert models.MeetingMemberStatusEnum.INVITED == "INVITED"
        assert models.MeetingMemberStatusEnum.ACCEPTED == "ACCEPTED"
        assert models.MeetingMemberStatusEnum.DECLINED == "DECLINED"
        assert models.MeetingMemberStatusEnum.JOINED == "JOINED"
        assert models.MeetingMemberStatusEnum.LEFT == "LEFT"

    def test_role_scope_enum(self):
        assert models.RoleScopeEnum.ORGANIZATION == "ORGANIZATION"
        assert models.RoleScopeEnum.DEPARTMENT == "DEPARTMENT"

    def test_document_status_enum(self):
        assert models.DocumentStatusEnum.UPLOADED == "UPLOADED"
        assert models.DocumentStatusEnum.PROCESSING == "PROCESSING"
        assert models.DocumentStatusEnum.READY == "READY"
        assert models.DocumentStatusEnum.FAILED == "FAILED"

    def test_transcript_source_type_enum(self):
        assert models.TranscriptSourceTypeEnum.DOCUMENT == "DOCUMENT"
        assert models.TranscriptSourceTypeEnum.TRANSCRIPT == "TRANSCRIPT"

    def test_action_item_status_enum(self):
        assert models.ActionItemStatusEnum.TODO == "TODO"
        assert models.ActionItemStatusEnum.IN_PROGRESS == "IN_PROGRESS"
        assert models.ActionItemStatusEnum.COMPLETED == "COMPLETED"

    def test_org_invitation_status_enum(self):
        assert models.OrgInvitationStatusEnum.PENDING == "PENDING"
        assert models.OrgInvitationStatusEnum.ACCEPTED == "ACCEPTED"
        assert models.OrgInvitationStatusEnum.EXPIRED == "EXPIRED"
        assert models.OrgInvitationStatusEnum.REVOKED == "REVOKED"
