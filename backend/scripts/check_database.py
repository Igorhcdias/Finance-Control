"""Check configured database connectivity and login table without changing data."""
import sys
from pathlib import Path
from time import perf_counter

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg
from app.config import get_settings


def main():
    started = perf_counter()
    try:
        with psycopg.connect(get_settings().database_url, connect_timeout=8) as connection:
            connection.execute("SET TRANSACTION READ ONLY")
            connection.execute("SET LOCAL statement_timeout = '5s'")
            connection.execute('SELECT id, email, password_hash FROM users LIMIT 0')
        print(f"Banco conectado; tabela de login acessivel ({perf_counter() - started:.2f}s).")
    except Exception as error:
        # Connection errors can contain credentials; never print the raw exception.
        print(f"Falha ao verificar banco ({type(error).__name__}). Confira DATABASE_URL, rede e SSL em backend/.env.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
