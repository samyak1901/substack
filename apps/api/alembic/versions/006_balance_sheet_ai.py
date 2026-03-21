"""Add ai_analysis JSONB column to stock_research

Revision ID: 006
Revises: 005
Create Date: 2026-03-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("stock_research", sa.Column("ai_analysis", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("stock_research", "ai_analysis")
