"""add_extraction_corrections_table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-17 02:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "extraction_corrections",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("meeting_id", sa.String(), nullable=False),
        sa.Column("transcript_snippet", sa.Text(), nullable=False),
        sa.Column("ai_output_json", sa.Text(), nullable=False),
        sa.Column("corrected_output_json", sa.Text(), nullable=False),
        sa.Column(
            "correction_type",
            sa.Enum("task_edited", "task_deleted", "task_added", name="correctiontypeenum"),
            nullable=False,
        ),
        sa.Column("embedding_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["meeting_id"], ["meetings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_extraction_corrections_meeting_id"),
        "extraction_corrections",
        ["meeting_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_extraction_corrections_meeting_id"),
        table_name="extraction_corrections",
    )
    op.drop_table("extraction_corrections")
    sa.Enum(name="correctiontypeenum").drop(op.get_bind(), checkfirst=True)
