"""add_knowledge_documents_fix

Revision ID: db2393f6dc8b
Revises: d1d49489330d
Create Date: 2026-09-07 08:22:00.869402

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'db2393f6dc8b'
down_revision: Union[str, Sequence[str], None] = 'd1d49489330d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("organization_id", sa.String(), nullable=False),
        sa.Column("meeting_id", sa.String(), nullable=True),
        sa.Column("uploaded_by_id", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("vector_status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"], ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_knowledge_documents_meeting_id"), "knowledge_documents", ["meeting_id"], unique=False)
    op.create_index(op.f("ix_knowledge_documents_organization_id"), "knowledge_documents", ["organization_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_knowledge_documents_organization_id"), table_name="knowledge_documents")
    op.drop_index(op.f("ix_knowledge_documents_meeting_id"), table_name="knowledge_documents")
    op.drop_table("knowledge_documents")
