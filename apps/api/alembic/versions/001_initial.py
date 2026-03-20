"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-02-21
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "digests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("date", sa.String(32), unique=True),
        sa.Column("overview", sa.Text(), server_default=""),
        sa.Column("article_count", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "articles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("digest_id", sa.Integer(), sa.ForeignKey("digests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.Text()),
        sa.Column("author", sa.String(255), server_default=""),
        sa.Column("publication", sa.String(255), server_default=""),
        sa.Column("url", sa.Text(), server_default=""),
        sa.Column("summary_html", sa.Text(), server_default=""),
        sa.Column("summary_raw", sa.Text(), server_default=""),
        sa.Column("position", sa.Integer(), server_default="0"),
    )

    op.create_table(
        "watchlist_entries",
        sa.Column("ticker", sa.String(16), primary_key=True),
        sa.Column("company", sa.String(255)),
        sa.Column("price_at_mention", sa.Float(), nullable=True),
        sa.Column("current_price", sa.Float(), nullable=True),
        sa.Column("reasoning", sa.Text(), server_default=""),
        sa.Column("article_url", sa.Text(), server_default=""),
        sa.Column("article_title", sa.Text(), server_default=""),
        sa.Column("publication", sa.String(255), server_default=""),
        sa.Column("author", sa.String(255), server_default=""),
        sa.Column("mention_date", sa.String(32), server_default=""),
        sa.Column("sector", sa.String(255), nullable=True),
        sa.Column("market_cap", sa.Float(), nullable=True),
        sa.Column("conviction", sa.String(16), nullable=True),
        sa.Column("target_price", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("price_updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "processed_posts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("canonical_url", sa.Text(), unique=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )



def downgrade() -> None:
    op.drop_table("processed_posts")
    op.drop_table("watchlist_entries")
    op.drop_table("articles")
    op.drop_table("digests")
