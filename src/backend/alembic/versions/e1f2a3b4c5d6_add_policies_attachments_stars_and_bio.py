"""add_policies_attachments_stars_and_bio

Revision ID: e1f2a3b4c5d6
Revises: d9e2f3a4b5c6
Create Date: 2026-11-27 12:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1f2a3b4c5d6'
down_revision = 'd9e2f3a4b5c6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add bio to users
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    users_columns = [col['name'] for col in inspector.get_columns('users')]
    if 'bio' not in users_columns:
        with op.batch_alter_table('users', schema=None) as batch_op:
            batch_op.add_column(sa.Column('bio', sa.Text(), nullable=True))

    # 2. Create organization_policies
    existing_tables = inspector.get_table_names()
    if 'organization_policies' not in existing_tables:
        op.create_table(
            'organization_policies',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('organization_id', sa.String(), nullable=False),
            sa.Column('policy_key', sa.String(length=100), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('category', sa.String(length=50), server_default='MEETING', nullable=False),
            sa.Column('enabled', sa.Boolean(), server_default=sa.text('true'), nullable=False),
            sa.Column('config_json', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('organization_id', 'policy_key', name='uq_org_policy_key')
        )
        op.create_index('ix_organization_policies_organization_id', 'organization_policies', ['organization_id'], unique=False)
        op.create_index('ix_organization_policies_policy_key', 'organization_policies', ['policy_key'], unique=False)

    # 3. Create issue_attachments
    if 'issue_attachments' not in existing_tables:
        op.create_table(
            'issue_attachments',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('issue_id', sa.String(), nullable=False),
            sa.Column('uploaded_by_id', sa.String(), nullable=True),
            sa.Column('filename', sa.String(), nullable=False),
            sa.Column('file_path', sa.String(), nullable=False),
            sa.Column('file_size', sa.Integer(), nullable=False),
            sa.Column('content_type', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['issue_id'], ['issues.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_issue_attachments_issue_id', 'issue_attachments', ['issue_id'], unique=False)

    # 4. Create user_project_stars
    if 'user_project_stars' not in existing_tables:
        op.create_table(
            'user_project_stars',
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('project_id', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['project_id'], ['jira_projects.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('user_id', 'project_id')
        )


def downgrade() -> None:
    op.drop_table('user_project_stars')
    op.drop_table('issue_attachments')
    op.drop_table('organization_policies')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('bio')
