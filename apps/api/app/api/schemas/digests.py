from pydantic import BaseModel


class ArticleOut(BaseModel):
    id: int
    title: str
    author: str
    publication: str
    url: str
    summary_html: str
    summary_raw: str
    position: int

    model_config = {"from_attributes": True}


class DigestSummary(BaseModel):
    id: int
    date: str
    overview: str
    article_count: int
    created_at: str

    model_config = {"from_attributes": True}


class DigestDetail(BaseModel):
    id: int
    date: str
    overview: str
    article_count: int
    created_at: str
    articles: list[ArticleOut]

    model_config = {"from_attributes": True}


class DigestListResponse(BaseModel):
    digests: list[DigestSummary]
    total: int
    page: int
    page_size: int
