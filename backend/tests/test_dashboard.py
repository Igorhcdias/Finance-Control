"""Dashboard ranges, monthly budgets and bounded aggregate reads on isolated DBs."""
from datetime import date, datetime
from decimal import Decimal

import pytest
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.dashboard import service
from app.models import Category, Investment, Transaction
from .test_api import transaction


def test_recent_transactions_are_bounded_filtered_and_stable(client, auth, category):
    with Session(client.test_engine) as db:
        for index in range(8):
            db.add(Transaction(
                id=f"recent-{index}", userId=category["userId"], categoryId=category["id"],
                description=f"Lançamento {index}", amount=Decimal("10.25"),
                type="INCOME" if index % 2 else "EXPENSE", date=date(2026, 9, 30),
                createdAt=datetime(2026, 9, 30, 12, index // 2),
            ))
        for day in (date(2026, 8, 31), date(2026, 10, 1)):
            db.add(Transaction(userId=category["userId"], categoryId=category["id"],
                               description="Fora do período", amount=999,
                               type="EXPENSE", date=day))
        db.commit()
    params = {"startDate": "2026-09-01", "endDate": "2026-09-30"}
    summary = client.get("/api/dashboard/summary", headers=auth, params=params).json()
    recent = summary["recentTransactions"]
    assert [item["id"] for item in recent] == [f"recent-{index}" for index in range(7, 2, -1)]
    assert all(item["category"]["id"] == category["id"] for item in recent)
    assert summary["periodIncome"] == 41 and summary["periodExpense"] == 41
    assert sum(row["amount"] for row in summary["expensesByCategory"]) == summary["periodExpense"]


@pytest.mark.parametrize("start,end", [("2026-08-01", "2026-09-30"), ("2026-09-10", "2026-09-15")])
def test_budget_uses_complete_final_month_and_reserves_are_global(client, auth, category, start, end):
    for day, amount in [("2026-08-31", 200), ("2026-09-01", 20), ("2026-09-12", 30), ("2026-09-30", 40)]:
        response = client.post("/api/transactions", headers=auth, json=transaction(category, date=day, amount=amount))
        assert response.status_code == 201, response.text
    for day, amount in [("2025-01-01", 10.15), ("2028-01-01", 20.25)]:
        response = client.post("/api/investments", headers=auth, json={"description": "Reserva", "date": day, "amount": amount})
        assert response.status_code == 201, response.text
    summary = client.get("/api/dashboard/summary", headers=auth, params={"startDate": start, "endDate": end}).json()
    assert summary["budgetPeriod"] == {"startDate": "2026-09-01", "endDate": "2026-09-30"}
    progress = summary["budgetProgress"][0]
    assert progress["amountSpent"] == 90 and progress["budgetLimit"] == 100
    assert progress["spentPercentage"] == 90 and progress["status"] == "warning"
    assert summary["reserves"] == {"totalAmount": 30.4, "count": 2}
    assert summary["periodExpense"] == (290 if start == "2026-08-01" else 30)


def test_empty_dashboard_and_tenant_isolation(client, auth, category):
    assert client.post("/api/transactions", headers=auth, json=transaction(category)).status_code == 201
    assert client.post("/api/investments", headers=auth, json={"description": "Reserva", "amount": 15, "date": "2026-09-01"}).status_code == 201
    other = client.post("/api/auth/register", json={"name": "Other User", "email": "dashboard@example.com", "password": "secret123"}).json()
    headers = {"Authorization": "Bearer " + other["token"]}
    params = {"startDate": "2026-09-01", "endDate": "2026-09-30"}
    summary = client.get("/api/dashboard/summary", headers=headers, params=params).json()
    assert summary["periodIncome"] == summary["periodExpense"] == summary["periodTotal"] == 0
    assert summary["recentTransactions"] == summary["expensesByCategory"] == summary["budgetProgress"] == []
    assert summary["reserves"] == {"totalAmount": 0, "count": 0}
    chart = client.get("/api/dashboard/chart", headers=headers, params=params).json()
    assert len(chart) == 30 and all(point["income"] == point["expense"] == 0 for point in chart)


@pytest.mark.parametrize("route", ["summary", "chart"])
def test_dashboard_rejects_reversed_and_invalid_ranges(client, auth, route):
    for start, end in [("2026-10-01", "2026-09-30"), ("2026-02-30", "2026-03-01")]:
        response = client.get(f"/api/dashboard/{route}", headers=auth, params={"startDate": start, "endDate": end})
        assert response.status_code == 422 and response.json()["message"]


def test_chart_aggregates_exact_bounds_and_zero_fills_across_years(client, auth, category):
    for values in [
        {"date": "2025-11-30", "amount": 500},
        {"date": "2025-12-01", "amount": .1, "type": "INCOME"},
        {"date": "2025-12-01", "amount": .2, "type": "INCOME"},
        {"date": "2026-02-10", "amount": 15},
        {"date": "2026-02-11", "amount": 500},
    ]:
        response = client.post("/api/transactions", headers=auth, json=transaction(category, **values))
        assert response.status_code == 201, response.text
    params = {"startDate": "2025-12-01", "endDate": "2026-02-10"}
    response = client.get("/api/dashboard/chart", headers=auth, params=params)
    assert response.status_code == 200, response.text
    assert response.json() == [
        {"label": "dez. de 25", "income": .3, "expense": 0},
        {"label": "jan. de 26", "income": 0, "expense": 0},
        {"label": "fev. de 26", "income": 0, "expense": 15},
    ]
    summary = client.get("/api/dashboard/summary", headers=auth, params=params).json()
    assert sum(point["income"] for point in response.json()) == summary["periodIncome"]
    assert sum(point["expense"] for point in response.json()) == summary["periodExpense"]


def test_default_chart_is_six_months_and_reads_one_aggregate_query(client, auth, category, monkeypatch):
    monkeypatch.setattr(service, "today", lambda: date(2026, 2, 15))
    statements = []
    def capture(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)
    event.listen(client.test_engine, "before_cursor_execute", capture)
    try:
        with Session(client.test_engine) as db:
            points = service.chart(db, category["userId"])
    finally:
        event.remove(client.test_engine, "before_cursor_execute", capture)
    assert len(statements) == 1 and "GROUP BY" in statements[0]
    assert len(points) == 6 and points[0]["label"] == "set. de 25" and points[-1]["label"] == "fev. de 26"
    assert all(point["income"] == point["expense"] == 0 for point in points)


def test_summary_does_not_load_reserve_records_or_categories_per_transaction(client, auth, category):
    with Session(client.test_engine) as db:
        for index in range(5):
            item = Category(userId=category["userId"], name=f"Categoria {index}", color="#123456", budgetLimit=100)
            db.add(item)
            db.flush()
            db.add(Transaction(userId=category["userId"], categoryId=item.id, description="Receita", amount=10,
                               type="INCOME", date=date(2026, 9, 30)))
            db.add(Investment(userId=category["userId"], description="Reserva", amount=5, date=date(2026, 9, 30)))
        db.commit()
    statements = []
    def capture(connection, cursor, statement, parameters, context, executemany):
        if statement.lstrip().upper().startswith("SELECT"):
            statements.append(statement)
    event.listen(client.test_engine, "before_cursor_execute", capture)
    try:
        with Session(client.test_engine) as db:
            result = service.summary(db, category["userId"], date(2026, 9, 1), date(2026, 9, 30))
    finally:
        event.remove(client.test_engine, "before_cursor_execute", capture)
    assert len(result["recentTransactions"]) == 5 and result["reserves"] == {"totalAmount": 25, "count": 5}
    # The bound catches N+1 category reads and duplicate category expense aggregates.
    assert len(statements) <= 9
    reserve_queries = [query for query in statements if "FROM investments" in query]
    assert len(reserve_queries) == 1 and "sum(" in reserve_queries[0].lower() and "count(" in reserve_queries[0].lower()
