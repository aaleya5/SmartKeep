"""update_enrichment_status_constraint

Revision ID: c8f924b6e319
Revises: ed07b3c61389
Create Date: 2026-05-01 22:51:05.529980

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f924b6e319'
down_revision: Union[str, Sequence[str], None] = 'ed07b3c61389'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop the old constraint first so we can update values
    op.drop_constraint('ck_enrichment_status', 'content', type_='check')
    
    # Now update any existing 'complete' values to 'ready'
    op.execute("UPDATE content SET enrichment_status = 'ready' WHERE enrichment_status = 'complete'")
    
    # Add the new constraint with all required values
    op.create_check_constraint(
        'ck_enrichment_status',
        'content',
        "enrichment_status IN ('pending', 'scraping', 'enriching', 'ready', 'failed', 'processing', 'complete')"
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop the new constraint
    op.drop_constraint('ck_enrichment_status', 'content', type_='check')
    
    # Revert 'ready' back to 'complete' 
    op.execute("UPDATE content SET enrichment_status = 'complete' WHERE enrichment_status = 'ready'")
    
    # Restore the old constraint
    op.create_check_constraint(
        'ck_enrichment_status',
        'content',
        "enrichment_status IN ('pending', 'processing', 'complete', 'failed')"
    )
