"""Add user ownership columns to content and collections

Revision ID: 013
Revises: 012
Create Date: 2026-04-10 00:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '013'
down_revision = '012'
branch_labels = None
depend_on = None


def upgrade() -> None:
    op.add_column(
        'content',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_content_user_id_users',
        'content', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_index('idx_content_user_id', 'content', ['user_id'])

    op.add_column(
        'collections',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_collections_user_id_users',
        'collections', 'users',
        ['user_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_index('idx_collections_user_id', 'collections', ['user_id'])


def downgrade() -> None:
    op.drop_index('idx_collections_user_id', table_name='collections')
    op.drop_constraint('fk_collections_user_id_users', 'collections', type_='foreignkey')
    op.drop_column('collections', 'user_id')

    op.drop_index('idx_content_user_id', table_name='content')
    op.drop_constraint('fk_content_user_id_users', 'content', type_='foreignkey')
    op.drop_column('content', 'user_id')
