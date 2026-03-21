from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Digest(Base):
    __tablename__ = "digests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[str] = mapped_column(String(32), unique=True)
    overview: Mapped[str] = mapped_column(Text, default="")
    article_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    articles: Mapped[list["Article"]] = relationship(
        back_populates="digest", cascade="all, delete-orphan", order_by="Article.position"
    )


class Article(Base):
    __tablename__ = "articles"
    __table_args__ = (Index("ix_articles_digest_id", "digest_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    digest_id: Mapped[int] = mapped_column(ForeignKey("digests.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(Text)
    author: Mapped[str] = mapped_column(String(255), default="")
    publication: Mapped[str] = mapped_column(String(255), default="")
    url: Mapped[str] = mapped_column(Text, default="")
    summary_html: Mapped[str] = mapped_column(Text, default="")
    summary_raw: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reading_time_minutes: Mapped[int] = mapped_column(Integer, default=0)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    position: Mapped[int] = mapped_column(Integer, default=0)

    digest: Mapped["Digest"] = relationship(back_populates="articles")


class WatchlistEntry(Base):
    __tablename__ = "watchlist_entries"
    __table_args__ = (Index("ix_watchlist_price_updated", "price_updated_at"),)

    ticker: Mapped[str] = mapped_column(String(16), primary_key=True)
    company: Mapped[str] = mapped_column(String(255))
    price_at_mention: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    reasoning: Mapped[str] = mapped_column(Text, default="")
    article_url: Mapped[str] = mapped_column(Text, default="")
    article_title: Mapped[str] = mapped_column(Text, default="")
    publication: Mapped[str] = mapped_column(String(255), default="")
    author: Mapped[str] = mapped_column(String(255), default="")
    mention_date: Mapped[str] = mapped_column(String(32), default="")
    sector: Mapped[str | None] = mapped_column(String(255), nullable=True)
    market_cap: Mapped[float | None] = mapped_column(Float, nullable=True)
    conviction: Mapped[str | None] = mapped_column(String(16), nullable=True)
    target_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    price_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class ProcessedPost(Base):
    __tablename__ = "processed_posts"
    __table_args__ = (Index("ix_processed_posts_url", "canonical_url", unique=True),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    canonical_url: Mapped[str] = mapped_column(Text, unique=True)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class JobRun(Base):
    __tablename__ = "job_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    job_type: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(16), default="pending")
    progress_pct: Mapped[int] = mapped_column(Integer, default=0)
    current_step: Mapped[str] = mapped_column(Text, default="")
    result_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(
        String(16), ForeignKey("watchlist_entries.ticker", ondelete="CASCADE")
    )
    alert_type: Mapped[str] = mapped_column(String(32))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    triggered_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StockResearch(Base):
    __tablename__ = "stock_research"

    ticker: Mapped[str] = mapped_column(String(16), primary_key=True)
    company: Mapped[str] = mapped_column(String(255), default="")

    share_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    market_cap: Mapped[float | None] = mapped_column(Float, nullable=True)
    enterprise_value: Mapped[float | None] = mapped_column(Float, nullable=True)

    # FMP overview data (profile, ratios, metrics, growth)
    overview: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Structured JSON blobs (deep research)
    financials: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    price_history: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    business_overview: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    management: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    insider_activity: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    superinvestors: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    headwinds_tailwinds: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    options_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    auditor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ai_analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    last_refreshed: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
