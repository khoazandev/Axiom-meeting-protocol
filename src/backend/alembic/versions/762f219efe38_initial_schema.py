"""initial_schema

Revision ID: 762f219efe38
Revises: 
Create Date: 2026-08-02 18:59:02.001808

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '762f219efe38'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('avatar_url', sa.String(), nullable=True),
        sa.Column('provider', sa.String(), nullable=True, server_default='local'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 2. workspaces
    op.create_table(
        'workspaces',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('logo_url', sa.String(), nullable=True),
        sa.Column('owner_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_workspaces_slug', 'workspaces', ['slug'], unique=True)

    # 3. workspace_members
    op.create_table(
        'workspace_members',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('workspace_id', sa.String(), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('role', sa.Enum('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', name='roleenum'), nullable=False),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_workspace_members_workspace_id', 'workspace_members', ['workspace_id'], unique=False)
    op.create_index('ix_workspace_members_user_id', 'workspace_members', ['user_id'], unique=False)

    # 4. departments
    op.create_table(
        'departments',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('workspace_id', sa.String(), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('manager_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_departments_workspace_id', 'departments', ['workspace_id'], unique=False)

    # 5. department_members
    op.create_table(
        'department_members',
        sa.Column('department_id', sa.String(), sa.ForeignKey('departments.id'), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), primary_key=True),
    )

    # 6. invitations
    op.create_table(
        'invitations',
        sa.Column('id', sa.String(), nullable=False, primary_key=True),
        sa.Column('workspace_id', sa.String(), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('role', sa.Enum('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', name='roleenum'), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_invitations_token', 'invitations', ['token'], unique=True)

    # 7. meetings
    op.create_table(
        'meetings',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('agenda', sa.Text(), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True, server_default='60'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default=sa.text('true')),
        sa.Column('transcript', sa.String(), nullable=True, server_default=''),
        sa.Column('summary', sa.String(), nullable=True, server_default=''),
        sa.Column('workspace_id', sa.String(), sa.ForeignKey('workspaces.id'), nullable=True),
        sa.Column('department_id', sa.String(), sa.ForeignKey('departments.id'), nullable=True),
        sa.Column('created_by_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index('ix_meetings_id', 'meetings', ['id'], unique=False)
    op.create_index('ix_meetings_title', 'meetings', ['title'], unique=False)
    op.create_index('ix_meetings_workspace_id', 'meetings', ['workspace_id'], unique=False)

    # 8. action_items
    op.create_table(
        'action_items',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('assignee', sa.String(), nullable=True),
        sa.Column('assignee_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('meeting_id', sa.Integer(), sa.ForeignKey('meetings.id'), nullable=True),
        sa.Column('workspace_id', sa.String(), sa.ForeignKey('workspaces.id'), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=True, server_default=sa.text('false')),
    )
    op.create_index('ix_action_items_id', 'action_items', ['id'], unique=False)
    op.create_index('ix_action_items_workspace_id', 'action_items', ['workspace_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_action_items_workspace_id', table_name='action_items')
    op.drop_index('ix_action_items_id', table_name='action_items')
    op.drop_table('action_items')

    op.drop_index('ix_meetings_workspace_id', table_name='meetings')
    op.drop_index('ix_meetings_title', table_name='meetings')
    op.drop_index('ix_meetings_id', table_name='meetings')
    op.drop_table('meetings')

    op.drop_index('ix_invitations_token', table_name='invitations')
    op.drop_table('invitations')

    op.drop_table('department_members')

    op.drop_index('ix_departments_workspace_id', table_name='departments')
    op.drop_table('departments')

    op.drop_index('ix_workspace_members_user_id', table_name='workspace_members')
    op.drop_index('ix_workspace_members_workspace_id', table_name='workspace_members')
    op.drop_table('workspace_members')

    op.drop_index('ix_workspaces_slug', table_name='workspaces')
    op.drop_table('workspaces')

    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
