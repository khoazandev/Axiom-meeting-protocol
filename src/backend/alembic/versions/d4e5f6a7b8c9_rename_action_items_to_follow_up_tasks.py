"""rename_action_items_to_follow_up_tasks

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-15 19:17:31.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Rename table
    op.rename_table('action_items', 'follow_up_tasks')

    # Create enum types if not exists (Postgres)
    source_enum = sa.Enum('AI_REALTIME', 'AI_FULL', 'MANUAL', name='followuptasksourceenum')
    source_enum.create(op.get_bind(), checkfirst=True)
    status_enum = sa.Enum('CONFIRMED', 'NOT_CONFIRMED', name='followuptaskstatusenum')
    status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Batch operations on the renamed table
    with op.batch_alter_table('follow_up_tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('deadline', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('source', source_enum, server_default='AI_REALTIME', nullable=False))
        batch_op.drop_column('due_at')
        
        # Modify status column enum
        batch_op.alter_column('status',
               existing_type=sa.VARCHAR(),
               type_=status_enum,
               existing_nullable=False,
               server_default='NOT_CONFIRMED')


def downgrade() -> None:
    with op.batch_alter_table('follow_up_tasks', schema=None) as batch_op:
        batch_op.alter_column('status',
               existing_type=sa.Enum('CONFIRMED', 'NOT_CONFIRMED', name='followuptaskstatusenum'),
               type_=sa.VARCHAR(),
               existing_nullable=False,
               server_default='TODO')
        batch_op.drop_column('source')
        batch_op.drop_column('deadline')
        batch_op.add_column(sa.Column('due_at', sa.DATETIME(), nullable=True))

    op.rename_table('follow_up_tasks', 'action_items')
