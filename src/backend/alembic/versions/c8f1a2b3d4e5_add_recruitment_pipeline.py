"""add recruitment pipeline

Revision ID: c8f1a2b3d4e5
Revises: b72946c793f8
Create Date: 2026-09-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f1a2b3d4e5'
down_revision: Union[str, Sequence[str], None] = 'b72946c793f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. organization_member_permissions
    op.create_table(
        'organization_member_permissions',
        sa.Column('member_id', sa.String(), nullable=False),
        sa.Column('permission_id', sa.String(), nullable=False),
        sa.Column('granted_by_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['granted_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['member_id'], ['organization_members.id']),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id']),
        sa.PrimaryKeyConstraint('member_id', 'permission_id'),
        sa.UniqueConstraint('member_id', 'permission_id', name='uq_member_permission'),
    )

    # 2. recruitment_policies
    op.create_table(
        'recruitment_policies',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('organization_id', sa.String(), nullable=False),
        sa.Column('retention_days', sa.Integer(), nullable=False, server_default='180'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', name='uq_recruitment_policy_org'),
    )
    with op.batch_alter_table('recruitment_policies', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_recruitment_policies_organization_id'), ['organization_id'], unique=True)

    # 3. assessment_definitions
    op.create_table(
        'assessment_definitions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('organization_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='60'),
        sa.Column('questions_json', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('assessment_definitions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_assessment_definitions_organization_id'), ['organization_id'], unique=False)

    # 4. job_openings
    op.create_table(
        'job_openings',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('organization_id', sa.String(), nullable=False),
        sa.Column('department_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('requirements', sa.Text(), nullable=True),
        sa.Column(
            'status',
            sa.Enum('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', name='jobopeningstatusenum'),
            nullable=False,
            server_default='ACTIVE',
        ),
        sa.Column('created_by_id', sa.String(), nullable=False),
        sa.Column('assigned_hr_member_id', sa.String(), nullable=True),
        sa.Column('requires_assessment', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('assessment_definition_id', sa.String(), nullable=True),
        sa.Column('competency_rubric_json', sa.Text(), nullable=True),
        sa.Column('rubric_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_hr_member_id'], ['organization_members.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id']),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('job_openings', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_job_openings_department_id'), ['department_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_job_openings_organization_id'), ['organization_id'], unique=False)

    # 5. candidates
    op.create_table(
        'candidates',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('organization_id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('email_hash', sa.String(), nullable=True),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('cv_url', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('redacted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('candidates', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_candidates_email_hash'), ['email_hash'], unique=False)
        batch_op.create_index(batch_op.f('ix_candidates_organization_id'), ['organization_id'], unique=False)

    # 6. recruitment_applications
    op.create_table(
        'recruitment_applications',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('organization_id', sa.String(), nullable=False),
        sa.Column('opening_id', sa.String(), nullable=False),
        sa.Column('candidate_id', sa.String(), nullable=False),
        sa.Column('assigned_hr_member_id', sa.String(), nullable=True),
        sa.Column(
            'stage',
            sa.Enum(
                'INVITED',
                'ASSESSMENT_PENDING',
                'ASSESSMENT_SUBMITTED',
                'INTERVIEW_SCHEDULED',
                'INTERVIEW_COMPLETED',
                'HR_REVIEW_PENDING',
                'OWNER_APPROVAL_PENDING',
                'APPROVED',
                'ONBOARDING_INVITED',
                'HIRED',
                'REJECTED',
                'WITHDRAWN',
                'EXPIRED',
                'CANCELLED',
                name='recruitmentstageenum',
            ),
            nullable=False,
            server_default='INVITED',
        ),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('consent_given', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('consent_timestamp', sa.DateTime(), nullable=True),
        sa.Column('terminal_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assigned_hr_member_id'], ['organization_members.id']),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidates.id']),
        sa.ForeignKeyConstraint(['opening_id'], ['job_openings.id']),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('opening_id', 'candidate_id', name='uq_opening_candidate'),
    )
    with op.batch_alter_table('recruitment_applications', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_recruitment_applications_candidate_id'), ['candidate_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_recruitment_applications_opening_id'), ['opening_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_recruitment_applications_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index('ix_rec_app_org_stage', ['organization_id', 'stage'], unique=False)
        batch_op.create_index('ix_rec_app_open_stage', ['opening_id', 'stage'], unique=False)

    # 7. recruitment_audit_events
    op.create_table(
        'recruitment_audit_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('organization_id', sa.String(), nullable=False),
        sa.Column('application_id', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=True),
        sa.Column('previous_stage', sa.String(), nullable=True),
        sa.Column('new_stage', sa.String(), nullable=True),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('correlation_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['recruitment_applications.id']),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('recruitment_audit_events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_recruitment_audit_events_application_id'), ['application_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_recruitment_audit_events_organization_id'), ['organization_id'], unique=False)

    # 8. recruitment_invitations
    op.create_table(
        'recruitment_invitations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('organization_id', sa.String(), nullable=False),
        sa.Column('application_id', sa.String(), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_uses', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('delivery_status', sa.String(), nullable=True, server_default='PENDING'),
        sa.Column('delivery_attempts', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['recruitment_applications.id']),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('recruitment_invitations', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_recruitment_invitations_application_id'), ['application_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_recruitment_invitations_organization_id'), ['organization_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_recruitment_invitations_token_hash'), ['token_hash'], unique=False)

    # 9. assessment_attempts
    op.create_table(
        'assessment_attempts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('application_id', sa.String(), nullable=False),
        sa.Column('definition_id', sa.String(), nullable=True),
        sa.Column('definition_snapshot_json', sa.Text(), nullable=False),
        sa.Column(
            'status',
            sa.Enum('PENDING', 'SUBMITTED', 'EXPIRED', name='assessmentstatusenum'),
            nullable=False,
            server_default='PENDING',
        ),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('answers_json', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['recruitment_applications.id']),
        sa.ForeignKeyConstraint(['definition_id'], ['assessment_definitions.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('assessment_attempts', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_assessment_attempts_application_id'), ['application_id'], unique=False)

    # 10. interview_sessions
    op.create_table(
        'interview_sessions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('application_id', sa.String(), nullable=False),
        sa.Column('meeting_id', sa.String(), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(), nullable=False),
        sa.Column('interviewer_member_ids_json', sa.Text(), nullable=True),
        sa.Column(
            'status',
            sa.Enum('SCHEDULED', 'COMPLETED', 'CANCELLED', name='interviewstatusenum'),
            nullable=False,
            server_default='SCHEDULED',
        ),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['recruitment_applications.id']),
        sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('interview_sessions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_interview_sessions_application_id'), ['application_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_interview_sessions_meeting_id'), ['meeting_id'], unique=False)

    # 11. ai_evaluations
    op.create_table(
        'ai_evaluations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('application_id', sa.String(), nullable=False),
        sa.Column('rubric_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('model_name', sa.String(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('scores_json', sa.Text(), nullable=True),
        sa.Column('evidence_json', sa.Text(), nullable=True),
        sa.Column('recommendation', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['recruitment_applications.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('ai_evaluations', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_ai_evaluations_application_id'), ['application_id'], unique=False)

    # 12. hr_reviews
    op.create_table(
        'hr_reviews',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('application_id', sa.String(), nullable=False),
        sa.Column('reviewer_member_id', sa.String(), nullable=False),
        sa.Column(
            'decision',
            sa.Enum('RECOMMEND_HIRE', 'RECOMMEND_REJECT', 'NEEDS_MORE_EVIDENCE', name='hrdecisionenum'),
            nullable=False,
        ),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('ai_diff_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['recruitment_applications.id']),
        sa.ForeignKeyConstraint(['reviewer_member_id'], ['organization_members.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('application_id', name='uq_hr_review_application'),
    )
    with op.batch_alter_table('hr_reviews', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_hr_reviews_application_id'), ['application_id'], unique=True)

    # 13. owner_approvals
    op.create_table(
        'owner_approvals',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('application_id', sa.String(), nullable=False),
        sa.Column('approver_user_id', sa.String(), nullable=False),
        sa.Column('decision', sa.Enum('APPROVE', 'REJECT', name='ownerdecisionenum'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('onboarding_invitation_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['recruitment_applications.id']),
        sa.ForeignKeyConstraint(['approver_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('application_id', name='uq_owner_approval_application'),
    )
    with op.batch_alter_table('owner_approvals', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_owner_approvals_application_id'), ['application_id'], unique=True)


def downgrade() -> None:
    op.drop_table('owner_approvals')
    op.drop_table('hr_reviews')
    op.drop_table('ai_evaluations')
    op.drop_table('interview_sessions')
    op.drop_table('assessment_attempts')
    op.drop_table('recruitment_invitations')
    op.drop_table('recruitment_audit_events')
    op.drop_table('recruitment_applications')
    op.drop_table('candidates')
    op.drop_table('job_openings')
    op.drop_table('assessment_definitions')
    op.drop_table('recruitment_policies')
    op.drop_table('organization_member_permissions')
