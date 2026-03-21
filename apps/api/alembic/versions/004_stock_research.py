"""Add stock_research table

Revision ID: 004
Revises: 003
Create Date: 2026-03-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "stock_research",
        sa.Column("ticker", sa.String(16), primary_key=True),
        sa.Column("company", sa.String(255), server_default=""),
        sa.Column("share_price", sa.Float(), nullable=True),
        sa.Column("market_cap", sa.Float(), nullable=True),
        sa.Column("enterprise_value", sa.Float(), nullable=True),
        sa.Column("financials", JSONB(), nullable=True),
        sa.Column("price_history", JSONB(), nullable=True),
        sa.Column("business_overview", JSONB(), nullable=True),
        sa.Column("management", JSONB(), nullable=True),
        sa.Column("insider_activity", JSONB(), nullable=True),
        sa.Column("superinvestors", JSONB(), nullable=True),
        sa.Column("headwinds_tailwinds", JSONB(), nullable=True),
        sa.Column("options_data", JSONB(), nullable=True),
        sa.Column("auditor", sa.String(255), nullable=True),
        sa.Column("last_refreshed", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("stock_research")
