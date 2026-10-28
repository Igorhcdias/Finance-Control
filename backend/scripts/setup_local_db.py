"""Provision only the named loopback development database; never uses DATABASE_URL."""
from pathlib import Path
import psycopg
from psycopg import sql

LOCAL_URL = "postgresql://finance@127.0.0.1:55432/finance_dev"


def main():
    with psycopg.connect("postgresql://finance@127.0.0.1:55432/postgres", autocommit=True) as connection:
        for name in ("finance_dev", "finance_test"):
            if not connection.execute("SELECT 1 FROM pg_database WHERE datname = %s", (name,)).fetchone():
                connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    migrations = Path(__file__).resolve().parents[2] / "backend" / "prisma" / "migrations"
    with psycopg.connect(LOCAL_URL) as connection:
        connection.execute('CREATE TABLE IF NOT EXISTS _local_prisma_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)')
        for migration in sorted(migrations.glob("*/migration.sql")):
            name = migration.parent.name
            if not connection.execute("SELECT 1 FROM _local_prisma_migrations WHERE name = %s", (name,)).fetchone():
                connection.execute(migration.read_text(encoding="utf-8"))
                connection.execute("INSERT INTO _local_prisma_migrations (name) VALUES (%s)", (name,))
                print(f"Aplicada somente em finance_dev local: {name}")
    print("PostgreSQL local pronto: 127.0.0.1:55432/finance_dev")


if __name__ == "__main__":
    main()
