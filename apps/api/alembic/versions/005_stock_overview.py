"""Add overview JSONB column to stock_research

Revision ID: 005
Revises: 004
Create Date: 2026-03-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("stock_research", sa.Column("overview", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("stock_research", "overview")
