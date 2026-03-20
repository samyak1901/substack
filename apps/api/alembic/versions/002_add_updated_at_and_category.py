"""Add updated_at and category columns

Revision ID: 002
Revises: 001
Create Date: 2026-03-20
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("digests", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.add_column("articles", sa.Column("category", sa.String(64), nullable=True))
    op.add_column("watchlist_entries", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_articles_digest_id", "articles", ["digest_id"])
    op.create_index("ix_watchlist_price_updated", "watchlist_entries", ["price_updated_at"])


def downgrade() -> None:
    op.drop_index("ix_watchlist_price_updated", table_name="watchlist_entries")
    op.drop_index("ix_articles_digest_id", table_name="articles")
    op.drop_column("watchlist_entries", "updated_at")
    op.drop_column("articles", "category")
    op.drop_column("digests", "updated_at")
