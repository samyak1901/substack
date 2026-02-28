FROM python:3.12-slim

WORKDIR /opt/app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml README.md ./
COPY app app
COPY alembic.ini .
COPY alembic alembic

RUN uv pip install --system .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
