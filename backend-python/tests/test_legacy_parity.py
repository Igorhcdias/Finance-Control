"""Optional real HTTP parity checks against Node, on the fixture's local schema."""
import os
from pathlib import Path
import socket
import subprocess
import time
import pytest
import httpx
from sqlalchemy.engine import make_url
from .test_api import transaction


def test_legacy_read_parity_and_credentials(client, auth, category):
    if not client.test_schema:
        pytest.skip("Comparação real Node exige PostgreSQL local")
    root = Path(__file__).resolve().parents[2]
    tsx = root / "backend" / "node_modules" / "tsx" / "dist" / "cli.mjs"
    if not tsx.exists():
        pytest.skip("Execute npm ci no backend original para comparar com Node")
    # Both runtimes see only a randomly named schema within finance_test.
    url = make_url(os.environ["TEST_DATABASE_URL"]).update_query_dict({"schema": client.test_schema})
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    env = {**os.environ, "DATABASE_URL": url.render_as_string(hide_password=False), "JWT_SECRET": os.environ["JWT_SECRET"], "PORT": str(port), "TZ": "UTC"}
    process = subprocess.Popen(["node", "--import", "tsx", "src/server.ts"], cwd=root / "backend", env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=5) as legacy:
            for _ in range(100):
                if process.poll() is not None:
                    pytest.fail("Backend Node encerrou antes de iniciar")
                try:
                    if legacy.get("/health").status_code == 200:
                        break
                except httpx.ConnectError:
                    time.sleep(.1)
            else:
                pytest.fail("Backend Node não iniciou em 10 segundos")
            # Python bcrypt -> Node login and Node JWT -> Python authentication.
            login = legacy.post("/api/auth/login", json={"email": "test@example.com", "password": "secret123"})
            assert login.status_code == 200, login.text
            assert client.get("/api/users/me", headers={"Authorization": "Bearer " + login.json()["token"]}).status_code == 200
            # Node bcrypt -> Python login, and Python JWT -> Node authentication.
            old_user = legacy.post("/api/auth/register", json={"name": "Legacy User", "email": "legacy@example.com", "password": "secret123"})
            assert old_user.status_code == 201, old_user.text
            assert client.post("/api/auth/login", json={"email": "legacy@example.com", "password": "secret123"}).status_code == 200
            assert legacy.get("/api/users/me", headers=auth).status_code == 200
            for amount, kind, day, method in [(1000, "INCOME", "2026-09-01", None), (85.36, "EXPENSE", "2026-09-11", "CREDIT"), (20, "EXPENSE", "2026-08-31", "DEBIT")]:
                payload = transaction(category, amount=amount, type=kind, date=day)
                if method:
                    payload["paymentMethod"] = method
                assert client.post("/api/transactions", headers=auth, json=payload).status_code == 201
            assert client.post("/api/investments", headers=auth, json={"description": "Reserva", "amount": 10.25, "date": "2026-09-11"}).status_code == 201
            routes = [
                ("/api/users/me", {}), ("/api/categories", {}), ("/api/investments", {}),
                ("/api/transactions", {"page": 1, "pageSize": 2}),
                ("/api/transactions", {"type": "EXPENSE", "search": "merc", "startDate": "2026-09-01"}),
                ("/api/dashboard/summary", {"startDate": "2026-09-01", "endDate": "2026-09-30"}),
                ("/api/dashboard/chart", {"startDate": "2026-09-10", "endDate": "2026-09-12"}),
                ("/api/dashboard/chart", {"startDate": "2026-08-01", "endDate": "2026-10-01"}),
                ("/api/dashboard/monthly-comparison", {"month1": "2026-09", "month2": "2026-08"}),
            ]
            for path, params in routes:
                old, new = legacy.get(path, headers=auth, params=params), client.get(path, headers=auth, params=params)
                assert old.status_code == new.status_code == 200, (path, old.text, new.text)
                expected, actual = old.json(), new.json()
                if path == "/api/dashboard/summary":
                    # Dashboard now filters its five recent records and adds explicit
                    # monthly budget/global reserve metadata. This fixture has only
                    # three records, so filtering the legacy result is lossless.
                    expected["recentTransactions"] = [item for item in expected["recentTransactions"] if params["startDate"] <= item["date"][:10] <= params["endDate"]]
                    assert actual.pop("budgetPeriod") == {"startDate": "2026-09-01", "endDate": "2026-09-30"}
                    assert actual.pop("reserves") == {"totalAmount": 10.25, "count": 1}
                assert expected == actual, (path, expected, actual)
    finally:
        process.terminate()
        process.wait(timeout=10)
