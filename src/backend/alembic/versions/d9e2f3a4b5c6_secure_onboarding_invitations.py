"""secure_onboarding_invitations

Revision ID: d9e2f3a4b5c6
Revises: c8f1a2b3d4e5
Create Date: 2026-09-27 14:06:00.000000

"""
import hashlib
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd9e2f3a4b5c6'
down_revision = 'c8f1a2b3d4e5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    
    with op.batch_alter_table('organization_invitations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('token_hash', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('recruitment_application_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('idempotency_key', sa.String(), nullable=True))
        batch_op.create_foreign_key('fk_org_inv_rec_app', 'recruitment_applications', ['recruitment_application_id'], ['id'])
        batch_op.create_unique_constraint('uq_org_inv_rec_app', ['recruitment_application_id'])
        batch_op.create_unique_constraint('uq_org_inv_idempotency_key', ['idempotency_key'])
        batch_op.create_index('ix_org_invitations_recruitment_app_id', ['recruitment_application_id'], unique=True)
        batch_op.create_index('ix_org_invitations_idempotency_key', ['idempotency_key'], unique=True)

    columns = [col['name'] for col in inspector.get_columns('organization_invitations')]
    if 'token' in columns:
        rows = connection.execute(sa.text("SELECT id, token FROM organization_invitations")).fetchall()
        for row in rows:
            inv_id, raw_token = row[0], row[1]
            if raw_token:
                thash = hashlib.sha256(raw_token.strip().encode('utf-8')).hexdigest()
                connection.execute(
                    sa.text("UPDATE organization_invitations SET token_hash = :thash WHERE id = :id"),
                    {"thash": thash, "id": inv_id}
                )

    with op.batch_alter_table('organization_invitations', schema=None) as batch_op:
        batch_op.alter_column('token_hash', nullable=False)
        batch_op.create_index('ix_org_invitations_token_hash', ['token_hash'], unique=True)
        if 'token' in columns:
            batch_op.drop_column('token')


def downgrade() -> None:
    with op.batch_alter_table('organization_invitations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('token', sa.String(), nullable=True))
        batch_op.drop_index('ix_org_invitations_token_hash')
        batch_op.drop_index('ix_org_invitations_idempotency_key')
        batch_op.drop_index('ix_org_invitations_recruitment_app_id')
        batch_op.drop_constraint('uq_org_inv_idempotency_key', type_='unique')
        batch_op.drop_constraint('uq_org_inv_rec_app', type_='unique')
        batch_op.drop_constraint('fk_org_inv_rec_app', type_='foreignkey')
        batch_op.drop_column('idempotency_key')
        batch_op.drop_column('recruitment_application_id')
        batch_op.drop_column('token_hash')
