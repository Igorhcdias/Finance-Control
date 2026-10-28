from functools import lru_cache
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from .config import get_settings


@lru_cache
def get_engine():
    url = make_url(get_settings().database_url)
    if url.drivername in ("postgres", "postgresql"):
        url = url.set(drivername="postgresql+psycopg")
    return create_engine(url, pool_pre_ping=True)


def get_db():
    # No DDL, migrations, seeds or connections at import/startup.
    with Session(get_engine()) as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise
