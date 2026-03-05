"""Add preferences table

Revision ID: 007
Revises: 006
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create preferences table
    op.create_table(
        'preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        
        # Search defaults
        sa.Column('default_search_mode', sa.String(20), nullable=False, server_default='hybrid'),
        
        # Library defaults
        sa.Column('default_library_view', sa.String(20), nullable=False, server_default='grid'),
        sa.Column('default_sort_order', sa.String(20), nullable=False, server_default='newest'),
        sa.Column('page_size', sa.Integer(), nullable=False, server_default=20),
        
        # Enrichment
        sa.Column('auto_enrich', sa.Boolean(), nullable=False, server_default=True),
        sa.Column('llm_provider', sa.String(20), nullable=False, server_default='groq'),
        sa.Column('groq_api_key', sa.String(), nullable=True),
        sa.Column('ollama_base_url', sa.String(), nullable=False, server_default='http://localhost:11434'),
        sa.Column('max_content_length', sa.Integer(), nullable=False, server_default=10000),
        
        # Appearance
        sa.Column('theme', sa.String(10), nullable=False, server_default='system'),
        sa.Column('accent_color', sa.String(10), nullable=False, server_default='#00C9A7'),
        sa.Column('reader_font_size', sa.String(10), nullable=False, server_default='medium'),
        sa.Column('compact_density', sa.Boolean(), nullable=False, server_default=False),
        
        # Audit
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        
        # Constraints
        sa.CheckConstraint("default_search_mode IN ('keyword', 'semantic', 'hybrid')", name='ck_default_search_mode'),
        sa.CheckConstraint("default_library_view IN ('grid', 'list', 'compact')", name='ck_default_library_view'),
        sa.CheckConstraint("theme IN ('light', 'dark', 'system')", name='ck_theme'),
        sa.CheckConstraint("reader_font_size IN ('small', 'medium', 'large')", name='ck_reader_font_size'),
        sa.CheckConstraint("llm_provider IN ('groq', 'ollama')", name='ck_llm_provider'),
        sa.CheckConstraint("page_size IN (10, 20, 50, 100)", name='ck_page_size'),
        sa.CheckConstraint("max_content_length BETWEEN 1000 AND 50000", name='ck_max_content_length'),
    )
    
    # Seed default row
    op.execute("""
        INSERT INTO preferences (id, default_search_mode, default_library_view, default_sort_order, 
            page_size, auto_enrich, llm_provider, ollama_base_url, max_content_length, 
            theme, accent_color, reader_font_size, compact_density) 
        VALUES (gen_random_uuid(), 'hybrid', 'grid', 'newest', 20, true, 'groq', 
            'http://localhost:11434', 10000, 'system', '#00C9A7', 'medium', false)
    """)


def downgrade() -> None:
    op.drop_table('preferences')
