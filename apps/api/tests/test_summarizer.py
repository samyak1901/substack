from unittest.mock import MagicMock, patch

from app.services.summarizer import (
    VALID_CATEGORIES,
    ArticleSummaryResult,
    Summarizer,
    estimate_reading_time,
)


def test_estimate_reading_time_basic():
    text = " ".join(["word"] * 400)
    minutes, words = estimate_reading_time(text)
    assert words == 400
    assert minutes == 2


def test_estimate_reading_time_minimum():
    minutes, words = estimate_reading_time("short")
    assert words == 1
    assert minutes == 1


def test_estimate_reading_time_empty():
    minutes, _words = estimate_reading_time("")
    # Empty string has 1 element when split
    assert minutes == 1


def test_summarize_article_empty_content():
    with patch.object(Summarizer, "__init__", lambda self, **kw: None):
        s = Summarizer()
        s.client = MagicMock()
        s.model = "test"

        result = s.summarize_article("Title", "Author", "")
        assert result.category == "other"
        assert "No content" in result.bullets[0]


def test_summarize_article_structured():
    mock_result = ArticleSummaryResult(
        bullets=["Point 1", "Point 2", "Point 3"],
        category="tech",
        key_takeaway="AI is changing everything.",
    )

    with patch.object(Summarizer, "__init__", lambda self, **kw: None):
        s = Summarizer()
        s.client = MagicMock()
        s.model = "test"
        s._generate_structured = MagicMock(return_value=mock_result)

        result = s.summarize_article("Test Article", "Test Author", "Some long content here")
        assert result.category == "tech"
        assert len(result.bullets) == 3
        assert result.key_takeaway == "AI is changing everything."


def test_summarize_article_invalid_category_gets_corrected():
    mock_result = ArticleSummaryResult(
        bullets=["Point"],
        category="invalid_category",
        key_takeaway="Takeaway.",
    )

    with patch.object(Summarizer, "__init__", lambda self, **kw: None):
        s = Summarizer()
        s.client = MagicMock()
        s.model = "test"
        s._generate_structured = MagicMock(return_value=mock_result)

        result = s.summarize_article("Title", "Author", "Content here")
        assert result.category == "other"


def test_summarize_article_api_failure_fallback():
    with patch.object(Summarizer, "__init__", lambda self, **kw: None):
        s = Summarizer()
        s.client = MagicMock()
        s.model = "test"
        s._generate_structured = MagicMock(return_value=None)

        result = s.summarize_article("Title", "Author", "Content")
        assert "Failed" in result.bullets[0]
        assert result.category == "other"


def test_daily_overview_empty():
    with patch.object(Summarizer, "__init__", lambda self, **kw: None):
        s = Summarizer()
        s.client = MagicMock()
        s.model = "test"

        result = s.generate_daily_overview([])
        assert "No articles" in result


def test_valid_categories_list():
    assert "macro" in VALID_CATEGORIES
    assert "tech" in VALID_CATEGORIES
    assert len(VALID_CATEGORIES) == 10
