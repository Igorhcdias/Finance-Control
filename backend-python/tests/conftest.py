import os
from pathlib import Path
from uuid import uuid4
import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

# Never load the existing backend .env or a real database for normal tests.
os.environ["DATABASE_URL"] = "postgresql://unused:unused@localhost/unused"
os.environ["JWT_SECRET"] = "isolated-test-secret-with-at-least-32-bytes"
from app.config import get_settings
get_settings.cache_clear()
from app.database import get_db
from app.models import Base
from app.main import create_app
from fastapi.testclient import TestClient


@pytest.fixture(params=["sqlite", "postgresql"])
def client(request):
    if request.param == "postgresql":
        url = os.environ.get("TEST_DATABASE_URL")
        if not url:
            pytest.skip("TEST_DATABASE_URL não configurada: PostgreSQL isolado pendente")
        from sqlalchemy.engine import make_url
        parsed = make_url(url)
        if parsed.host not in ("localhost", "127.0.0.1", "::1") or not (parsed.database or "").endswith("_test"):
            pytest.fail("TEST_DATABASE_URL deve apontar para PostgreSQL local com nome terminado em _test")
        engine = create_engine(parsed.set(drivername="postgresql+psycopg"))
        schema = "test_" + uuid4().hex
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        @event.listens_for(engine, "connect")
        def set_search_path(connection, record):
            with connection.cursor() as cursor:
                cursor.execute(f'SET search_path TO "{schema}"')
            connection.commit()
        engine.dispose()
        # Validate mapping against the original Prisma DDL, not ORM-generated tables.
        with engine.begin() as connection:
            migrations = Path(__file__).resolve().parents[2] / "backend" / "prisma" / "migrations"
            for migration in sorted(migrations.glob("*/migration.sql")):
                connection.exec_driver_sql(migration.read_text(encoding="utf-8"))
    else:
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        @event.listens_for(engine, "connect")
        def foreign_keys(connection, record):
            connection.execute("PRAGMA foreign_keys=ON")
    if request.param == "sqlite":
        Base.metadata.create_all(engine)
    app = create_app()
    def database_override():
        with Session(engine) as db:
            try:
                yield db
            except Exception:
                db.rollback()
                raise
    app.dependency_overrides[get_db] = database_override
    with TestClient(app, raise_server_exceptions=False) as test_client:
        test_client.test_engine = engine
        test_client.test_schema = schema if request.param == "postgresql" else None
        yield test_client
    if request.param == "postgresql":
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
    engine.dispose()


@pytest.fixture
def auth(client):
    response = client.post("/api/auth/register", json={"name": "Test User", "email": "test@example.com", "password": "secret123"})
    assert response.status_code == 201, response.text
    return {"Authorization": "Bearer " + response.json()["token"]}


@pytest.fixture
def category(client, auth):
    response = client.post("/api/categories", headers=auth, json={"name": "Alimentação", "color": "#123456", "budgetLimit": 100})
    assert response.status_code == 201, response.text
    return response.json()
