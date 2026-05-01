"""Enable RLS for multi-tenancy

Revision ID: d9606e7e989a
Revises: fe6911d9bb45
Create Date: 2026-05-01 21:46:20.106889

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9606e7e989a'
down_revision: Union[str, Sequence[str], None] = 'fe6911d9bb45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Direct user_id tables
    tables = ['content', 'collections', 'search_history', 'saved_searches']
    for table in tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY tenant_isolation_policy ON {table}
            USING (
                current_setting('app.bypass_rls', true) = 'on'
                OR user_id = current_setting('app.current_user_id', true)::uuid
            )
        """)

    # Annotations uses content_id
    op.execute("ALTER TABLE annotations ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE annotations FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_policy ON annotations
        USING (
            current_setting('app.bypass_rls', true) = 'on'
            OR content_id IN (
                SELECT id FROM content WHERE user_id = current_setting('app.current_user_id', true)::uuid
            )
        )
    """)


def downgrade() -> None:
    """Downgrade schema."""
    tables = ['content', 'collections', 'search_history', 'saved_searches', 'annotations']
    for table in tables:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table}")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
