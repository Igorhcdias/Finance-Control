from datetime import datetime, timedelta, timezone
import jwt
import pytest
from app.security import hash_password, verify_password, token_lifetime


def transaction(category, **overrides):
    return {"description": "Mercado", "amount": 10.25, "type": "EXPENSE", "paymentMethod": "DEBIT", "date": "2026-09-11", "categoryId": category["id"], **overrides}


def test_auth_profile_password(client, auth):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/api/users/me").status_code == 401
    assert client.get("/api/users/me", headers={"Authorization": "Bearer invalid"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "test@example.com", "password": "bad"}).status_code == 401
    assert client.post("/api/auth/register", json={"name": "Other", "email": "test@example.com", "password": "secret123"}).status_code == 409
    me = client.get("/api/users/me", headers=auth)
    assert set(me.json()) == {"id", "name", "email"}
    assert client.put("/api/users/me", headers=auth, json={"name": "Updated"}).json()["name"] == "Updated"
    assert client.put("/api/users/me/password", headers=auth, json={"currentPassword": "bad", "newPassword": "newpass"}).status_code == 401
    assert client.put("/api/users/me/password", headers=auth, json={"currentPassword": "secret123", "newPassword": "newpass"}).status_code == 204
    assert client.post("/api/auth/login", json={"email": "test@example.com", "password": "newpass"}).status_code == 200


def test_category_crud_and_restrictions(client, auth, category):
    assert category["budgetLimit"] == "100"
    assert "userId" in category and "createdAt" in category
    assert client.get("/api/categories/", headers=auth).json()[0]["id"] == category["id"]
    assert client.post("/api/categories", headers=auth, json={"name": category["name"], "color": "#ffffff"}).status_code == 409
    response = client.put("/api/categories/" + category["id"], headers=auth, json={"budgetLimit": None})
    assert response.json()["budgetLimit"] is None
    created = client.post("/api/transactions", headers=auth, json=transaction(category))
    assert created.status_code == 201, created.text
    assert client.delete("/api/categories/" + category["id"], headers=auth).status_code == 409
    assert client.delete("/api/transactions/" + created.json()["id"], headers=auth).status_code == 204
    assert client.delete("/api/categories/" + category["id"], headers=auth).status_code == 204


def test_transactions_filters_pagination_and_warnings(client, auth, category):
    created = client.post("/api/transactions", headers=auth, json=transaction(category, amount=120))
    assert created.status_code == 201, created.text
    data = created.json()
    assert "foi ultrapassado" in data["budgetWarning"]
    assert data["amount"] == "120" and data["date"] == "2026-09-11T00:00:00.000Z"
    assert data["category"]["id"] == category["id"]
    listing = client.get("/api/transactions", headers=auth, params={"search": "mErCa", "startDate": "2026-09-01", "endDate": "2026-09-30", "type": "EXPENSE", "categoryId": category["id"], "pageSize": 1})
    assert listing.status_code == 200, listing.text
    assert listing.json()["pagination"] == {"page": 1, "pageSize": 1, "total": 1, "totalPages": 1}
    assert client.get("/api/transactions", headers=auth, params={"startDate": "2026-10-01"}).json()["items"] == []
    changed = client.put("/api/transactions/" + data["id"], headers=auth, json={"type": "INCOME", "amount": 0.1})
    assert changed.status_code == 200, changed.text
    assert changed.json()["paymentMethod"] is None and "budgetWarning" not in changed.json()
    assert client.get("/api/transactions", headers=auth, params={"pageSize": 101}).status_code == 422
    assert client.get("/api/transactions", headers=auth, params={"categoryId": "invalid"}).status_code == 422


def test_tenant_isolation(client, auth, category):
    item = client.post("/api/transactions", headers=auth, json=transaction(category)).json()
    investment = client.post("/api/investments", headers=auth, json={"description": "Reserva", "amount": 20, "date": "2026-09-01"}).json()
    other = client.post("/api/auth/register", json={"name": "Other", "email": "other@example.com", "password": "secret123"}).json()
    headers = {"Authorization": "Bearer " + other["token"]}
    assert client.get("/api/categories", headers=headers).json() == []
    assert client.get("/api/transactions", headers=headers).json()["items"] == []
    assert client.get("/api/investments", headers=headers).json() == []
    for path in ("/api/categories/" + category["id"], "/api/transactions/" + item["id"], "/api/investments/" + investment["id"]):
        assert client.delete(path, headers=headers).status_code == 404
    assert client.put("/api/transactions/" + item["id"], headers=headers, json={"amount": 30}).status_code == 404
    assert client.post("/api/transactions", headers=headers, json=transaction(category)).status_code == 422
    assert client.get("/api/dashboard/summary", headers=headers).json()["balance"] == 0


def test_dashboard_decimal_totals_chart_and_comparison(client, auth, category):
    for values in ({"amount": .1, "type": "INCOME"}, {"amount": .2, "type": "INCOME"}, {"amount": 80, "paymentMethod": "CREDIT"}, {"amount": 20, "date": "2026-08-31"}):
        result = client.post("/api/transactions", headers=auth, json=transaction(category, **values))
        assert result.status_code == 201, result.text
    reserve = client.post("/api/investments", headers=auth, json={"description": "Reserva", "amount": 5, "date": "2028-02-29"})
    assert reserve.status_code == 201, reserve.text
    summary = client.get("/api/dashboard/summary", headers=auth, params={"startDate": "2026-09-01", "endDate": "2026-09-30"}).json()
    assert summary["balance"] == -104.7
    assert summary["periodIncome"] == .3 and summary["periodExpense"] == 80
    assert summary["periodTotal"] == -79.7
    assert summary["expensesByPaymentMethod"] == {"debit": 0, "credit": 80, "unspecified": 0}
    assert summary["budgetProgress"][0]["status"] == "warning"
    assert summary["expensesByCategory"][0]["percentage"] == 100
    assert isinstance(summary["recentTransactions"][0]["amount"], str)
    chart = client.get("/api/dashboard/chart", headers=auth, params={"startDate": "2026-09-10", "endDate": "2026-09-12"}).json()
    assert len(chart) == 3 and chart[1] == {"label": "11 de set.", "income": .3, "expense": 80}
    assert chart[0]["income"] == 0
    monthly = client.get("/api/dashboard/chart", headers=auth, params={"startDate": "2026-08-01", "endDate": "2026-09-30"}).json()
    assert len(monthly) == 2 and monthly[0]["expense"] == 20
    assert len(client.get("/api/dashboard/chart", headers=auth).json()) == 6
    comparison = client.get("/api/dashboard/monthly-comparison", headers=auth, params={"month1": "2026-09", "month2": "2026-08"}).json()
    assert comparison["difference"] == 60 and comparison["percentageChange"] == 300
    assert comparison["month1"]["label"] == "Setembro de 2026"
    assert comparison["categories"][0]["month2Amount"] == 20
    assert client.get("/api/dashboard/monthly-comparison", headers=auth, params={"month1": "2026-13"}).status_code == 400
    assert client.put("/api/investments/" + reserve.json()["id"], headers=auth, json={"description": "Reserva atualizada", "amount": 10, "date": "2026-10-01"}).status_code == 204
    assert client.delete("/api/investments/" + reserve.json()["id"], headers=auth).status_code == 204


@pytest.mark.parametrize("amount", [0, -1, 1.001, 10000000000])
def test_invalid_investments(client, auth, amount):
    assert client.post("/api/investments", headers=auth, json={"description": "Reserva", "amount": amount, "date": "2026-09-01"}).status_code == 422


def test_validation_and_cors(client, auth, category):
    assert client.post("/api/investments", headers=auth, json={"description": "Reserva", "amount": 10, "date": "2026-02-29"}).status_code == 422
    for data in ({"amount": -1}, {"amount": None}, {"paymentMethod": None}, {"date": "invalid"}):
        response = client.post("/api/transactions", headers=auth, json=transaction(category, **data))
        assert response.status_code == 422 and set(response.json()) == {"message"}
    cors = client.options("/api/categories", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"})
    assert cors.status_code == 200 and cors.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_bcrypt_and_jwt_compatibility(client, auth):
    password = "á" * 50
    assert verify_password(password, hash_password(password))
    assert token_lifetime("1d") == timedelta(days=1)
    assert token_lifetime("1000") == timedelta(seconds=1)
    user_id = client.get("/api/users/me", headers=auth).json()["id"]
    # Same claims and signing algorithm as jsonwebtoken; old tokens need no reissue.
    token = jwt.encode({"sub": user_id, "email": "test@example.com", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, "isolated-test-secret-with-at-least-32-bytes", algorithm="HS256")
    assert client.get("/api/users/me", headers={"Authorization": "Bearer " + token}).status_code == 200
    expired = jwt.encode({"sub": user_id, "exp": 1}, "isolated-test-secret-with-at-least-32-bytes", algorithm="HS256")
    assert client.get("/api/users/me", headers={"Authorization": "Bearer " + expired}).status_code == 401


def test_budget_thresholds_and_decimal_rounding(client, auth, category):
    created = client.post("/api/transactions", headers=auth, json=transaction(category, amount=85.35)).json()
    params = {"startDate": "2026-09-01", "endDate": "2026-09-30"}
    progress = client.get("/api/dashboard/summary", headers=auth, params=params).json()["budgetProgress"][0]
    # Deliberate decimal correction: JS Number.toFixed yields 85.3 at this tie.
    assert progress["spentPercentage"] == 85.4 and progress["status"] == "warning"
    updated = client.put("/api/transactions/" + created["id"], headers=auth, json={"amount": 100}).json()
    assert "budgetWarning" not in updated
    assert client.get("/api/dashboard/summary", headers=auth, params=params).json()["budgetProgress"][0]["status"] == "exceeded"
    assert client.get("/api/dashboard/monthly-comparison", headers=auth, params={"month1": "2026-09", "month2": "2026-08"}).json()["percentageChange"] is None
    assert client.put("/api/transactions/" + created["id"], headers=auth, json={"amount": 110}).json()["budgetWarning"]


def test_advisory_failure_does_not_undo_transaction(client, auth, category, monkeypatch):
    def fail(*args):
        raise RuntimeError("isolated simulated failure")
    monkeypatch.setattr("app.dashboard.service.budget_progress", fail)
    response = client.post("/api/transactions", headers=auth, json=transaction(category))
    assert response.status_code == 201
    assert "Não foi possível consultar" in response.json()["budgetWarning"]
    assert client.get("/api/transactions", headers=auth).json()["pagination"]["total"] == 1
