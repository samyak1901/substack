"""Add reading_time, word_count, job_runs, alerts, and search index

Revision ID: 003
Revises: 002
Create Date: 2026-03-20
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("articles", sa.Column("reading_time_minutes", sa.Integer(), server_default="0"))
    op.add_column("articles", sa.Column("word_count", sa.Integer(), server_default="0"))

    op.create_table(
        "job_runs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("job_type", sa.String(32), nullable=False),
        sa.Column("status", sa.String(16), server_default="pending"),
        sa.Column("progress_pct", sa.Integer(), server_default="0"),
        sa.Column("current_step", sa.Text(), server_default=""),
        sa.Column("result_message", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "ticker",
            sa.String(16),
            sa.ForeignKey("watchlist_entries.ticker", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("alert_type", sa.String(32), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default="false"),
        sa.Column("triggered_price", sa.Float(), nullable=True),
        sa.Column("target_price", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_alerts_ticker", "alerts", ["ticker"])
    op.create_index("ix_alerts_unread", "alerts", ["is_read"], postgresql_where=sa.text("is_read = false"))

    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        "CREATE INDEX ix_articles_search ON articles "
        "USING gin ((coalesce(title, '') || ' ' || coalesce(author, '') || ' ' || coalesce(summary_raw, '')) gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_articles_search")
    op.drop_index("ix_alerts_unread", table_name="alerts")
    op.drop_index("ix_alerts_ticker", table_name="alerts")
    op.drop_table("alerts")
    op.drop_table("job_runs")
    op.drop_column("articles", "word_count")
    op.drop_column("articles", "reading_time_minutes")
