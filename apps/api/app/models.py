from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass



class Digest(Base):
    __tablename__ = "digests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    date: Mapped[str] = mapped_column(String(32), unique=True)
    overview: Mapped[str] = mapped_column(Text, default="")
    article_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    articles: Mapped[list["Article"]] = relationship(
        back_populates="digest", cascade="all, delete-orphan", order_by="Article.position"
    )


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    digest_id: Mapped[int] = mapped_column(ForeignKey("digests.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(Text)
    author: Mapped[str] = mapped_column(String(255), default="")
    publication: Mapped[str] = mapped_column(String(255), default="")
    url: Mapped[str] = mapped_column(Text, default="")
    summary_html: Mapped[str] = mapped_column(Text, default="")
    summary_raw: Mapped[str] = mapped_column(Text, default="")
    position: Mapped[int] = mapped_column(Integer, default=0)

    digest: Mapped["Digest"] = relationship(back_populates="articles")


class WatchlistEntry(Base):
    __tablename__ = "watchlist_entries"

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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    price_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class ProcessedPost(Base):
    __tablename__ = "processed_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    canonical_url: Mapped[str] = mapped_column(Text, unique=True)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
