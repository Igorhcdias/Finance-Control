from datetime import date
from decimal import Decimal
import pytest

from app.errors import AppError
from app.transactions.csv_parser import MAX_IMPORT_ROWS, parse_csv_transactions


def test_parser_brazilian_statement_with_bom_preamble_and_ignored_balances():
    csv_text = (
        "\ufeffExtrato Conta Corrente;Agencia 0001\n"
        "Periodo;01/09/2026 a 30/09/2026\n"
        "\n"
        "Data;Histórico;Descrição;Valor (R$);\n"
        "01/09/2026;Saldo;Saldo Anterior;1.000,00;\n"
        "02/09/2026;PIX;Salário Mensal;R$ 5.500,00;\n"
        "05/09/2026;Compra;Supermercado Bom Preço;-234,56;\n"
        "06/09/2026;Débito;Aluguel;(1.500,00);\n"
        "07/09/2026;Tarifa;Tarifa Bancária;15,50 D;\n"
        "08/09/2026;Estorno;Reembolso Taxi;42,00 CRÉDITO;\n"
        "30/09/2026;Total;Saldo Final;4.773,94;\n"
    )

    result = parse_csv_transactions(csv_text, source_type="STATEMENT")

    assert result["detectedDelimiter"] == ";"
    assert result["headers"] == ["Data", "Histórico", "Descrição", "Valor (R$)"]
    assert result["detectedMapping"]["date"] == "Data"
    assert result["detectedMapping"]["description"] == "Descrição"
    assert result["detectedMapping"]["amount"] == "Valor (R$)"

    rows = result["rows"]
    assert len(rows) == 5
    assert [(r["date"], r["description"], r["amount"], r["type"], r["paymentMethod"]) for r in rows] == [
        (date(2026, 9, 2), "Salário Mensal", Decimal("5500.00"), "INCOME", None),
        (date(2026, 9, 5), "Supermercado Bom Preço", Decimal("234.56"), "EXPENSE", "DEBIT"),
        (date(2026, 9, 6), "Aluguel", Decimal("1500.00"), "EXPENSE", "DEBIT"),
        (date(2026, 9, 7), "Tarifa Bancária", Decimal("15.50"), "EXPENSE", "DEBIT"),
        (date(2026, 9, 8), "Reembolso Taxi", Decimal("42.00"), "INCOME", None),
    ]
    assert len(result["errors"]) == 2
    assert all("saldo ou total" in err["reason"] for err in result["errors"])


def test_parser_credit_card_invoice_and_us_numbers():
    csv_text = (
        "date,category,title,amount\n"
        '2026-09-10,Alimentação,Restaurante Sabor,"89.90"\n'
        '2026-09-11,Transporte,Uber Viagem,"1,234.56"\n'
        '2026-09-12,Outros,IOF Internacional,"0.125"\n'
        '2026-09-15,,Pagamento recebido,-1500.00\n'
    )

    result = parse_csv_transactions(csv_text, source_type="INVOICE")
    assert result["detectedDelimiter"] == ","
    assert result["detectedMapping"]["category"] == "category"

    rows = result["rows"]
    assert len(rows) == 4
    assert rows[0]["type"] == "EXPENSE" and rows[0]["paymentMethod"] == "CREDIT"
    assert rows[0]["amount"] == Decimal("89.90") and rows[0]["suggestedCategoryName"] == "Alimentação"
    assert rows[1]["amount"] == Decimal("1234.56")
    assert rows[2]["amount"] == Decimal("0.13")
    assert rows[3]["type"] == "INCOME" and rows[3]["paymentMethod"] is None and rows[3]["amount"] == Decimal("1500.00")


def test_parser_split_income_expense_columns_and_errors():
    csv_text = (
        "Data;Descrição;Entrada;Saída;Forma de Pagamento\n"
        "10/09/2026;Freelance;1.500;0,00;\n"
        "11/09/2026;Farmácia;;45,90;Cartão de Crédito\n"
        "12/09/2026;Conflito;10,00;20,00;\n"
        "13/09/2026;Sem valor;0,00;0,00;\n"
    )

    result = parse_csv_transactions(csv_text, source_type="STATEMENT")
    rows = result["rows"]
    assert len(rows) == 2
    assert rows[0]["type"] == "INCOME" and rows[0]["amount"] == Decimal("1500.00") and rows[0]["paymentMethod"] is None
    assert rows[1]["type"] == "EXPENSE" and rows[1]["amount"] == Decimal("45.90") and rows[1]["paymentMethod"] == "CREDIT"
    assert len(result["errors"]) == 2
    assert "tanto em Entrada quanto em Saída" in result["errors"][0]["reason"]
    assert "ausente ou igual a zero" in result["errors"][1]["reason"]


def test_parser_explicit_type_column_and_row_validation():
    csv_text = (
        "Data;Descrição;Valor;Tipo\n"
        "2026-09-01;Dividendos;250,00;Receita\n"
        "2026-09-02;Internet;120,00;Despesa\n"
        "99/99/2026;Data Ruim;50,00;Despesa\n"
        "2026-09-03;A;50,00;Despesa\n"
        "2026-09-04;Zero;0,00;Despesa\n"
    )

    result = parse_csv_transactions(csv_text, source_type="STATEMENT")
    assert len(result["rows"]) == 2
    assert result["rows"][0]["type"] == "INCOME"
    assert result["rows"][1]["type"] == "EXPENSE"
    assert [e["reason"] for e in result["errors"]] == [
        "Data inválida ou ausente",
        "Descrição deve ter no mínimo 2 caracteres",
        "Valor inválido ou igual a zero",
    ]


def test_parser_headerless_and_manual_column_mapping():
    headerless = (
        "01/09/2026;Salário;3200,00\n"
        "02/09/2026;Padaria;-18,50\n"
    )
    auto_res = parse_csv_transactions(headerless, source_type="STATEMENT")
    assert auto_res["headers"] == ["Coluna 1", "Coluna 2", "Coluna 3"]
    assert len(auto_res["rows"]) == 2
    assert auto_res["rows"][0]["type"] == "INCOME"
    assert auto_res["rows"][1]["type"] == "EXPENSE"

    unmapped = (
        "ColA;ColB;ColC\n"
        "2026-09-10;Cafeteria;-12,50\n"
    )
    need_map = parse_csv_transactions(unmapped, source_type="STATEMENT")
    assert need_map["headers"] == ["ColA", "ColB", "ColC"]
    assert need_map["rows"] == []

    manual_res = parse_csv_transactions(
        unmapped,
        source_type="STATEMENT",
        column_mapping={"date": "ColA", "description": "ColB", "amount": "ColC"},
    )
    assert len(manual_res["rows"]) == 1
    assert manual_res["rows"][0]["description"] == "Cafeteria"


def test_parser_rejects_excessive_rows_and_missing_mapped_column():
    header = "Data;Descrição;Valor\n"
    lines = "\n".join(f"2026-09-01;Item {i};-10,00" for i in range(MAX_IMPORT_ROWS + 1))
    with pytest.raises(AppError) as exc:
        parse_csv_transactions(header + lines)
    assert exc.value.status == 422

    with pytest.raises(AppError) as col_exc:
        parse_csv_transactions(
            "Data;Descrição;Valor\n2026-09-01;Teste;-10,00",
            column_mapping={"date": "Inexistente", "description": "Descrição", "amount": "Valor"},
        )
    assert col_exc.value.status == 422


def test_csv_import_preview_duplicates_and_tenant_isolation(client, auth, category):
    # Pre-existing transaction matching one row in CSV
    existing = client.post(
        "/api/transactions",
        headers=auth,
        json={
            "description": "Supermercado Bom Preço",
            "amount": 120.50,
            "type": "EXPENSE",
            "paymentMethod": "DEBIT",
            "date": "2026-09-10",
            "categoryId": category["id"],
        },
    )
    assert existing.status_code == 201, existing.text

    other = client.post(
        "/api/auth/register",
        json={"name": "Other User", "email": "csv-other@example.com", "password": "secret123"},
    )
    assert other.status_code == 201
    other_headers = {"Authorization": "Bearer " + other.json()["token"]}
    other_cat = client.post(
        "/api/categories",
        headers=other_headers,
        json={"name": "SecretaOutro", "color": "#abcdef"},
    ).json()

    csv_content = (
        "Data;Descrição;Valor;Categoria\n"
        "10/09/2026;Supermercado Bom Preço;-120,50;Alimentação\n"
        "10/09/2026;Supermercado Bom Preço;-120,50;Alimentação\n"
        "11/09/2026;Salário;3000,00;SecretaOutro\n"
    )

    assert client.post("/api/transactions/import/preview", json={"csvContent": csv_content}).status_code == 401

    preview = client.post(
        "/api/transactions/import/preview",
        headers=auth,
        json={"csvContent": csv_content, "sourceType": "STATEMENT"},
    )
    assert preview.status_code == 200, preview.text
    data = preview.json()
    assert data["summary"] == {
        "totalRows": 3,
        "incomeCount": 1,
        "expenseCount": 2,
        "incomeTotal": 3000.0,
        "expenseTotal": 241.0,
        "duplicateCount": 1,
        "errorCount": 0,
    }
    assert data["rows"][0]["isDuplicate"] is True
    assert data["rows"][0]["categoryId"] == category["id"]
    assert data["rows"][1]["isDuplicate"] is False
    # Other user's category name must NOT match for current user
    assert data["rows"][2]["categoryId"] is None
    assert other_cat["id"] != category["id"]


def test_csv_import_commit_atomic_budget_warnings_and_dashboard(client, auth, category):
    other = client.post(
        "/api/auth/register",
        json={"name": "Other User 2", "email": "csv-other2@example.com", "password": "secret123"},
    )
    other_headers = {"Authorization": "Bearer " + other.json()["token"]}
    other_cat = client.post(
        "/api/categories",
        headers=other_headers,
        json={"name": "Outro", "color": "#112233"},
    ).json()

    # Cross-tenant category must fail atomically with 422 without inserting the valid item
    bad_import = client.post(
        "/api/transactions/import",
        headers=auth,
        json={
            "items": [
                {
                    "description": "Salário válido",
                    "amount": 1000,
                    "type": "INCOME",
                    "date": "2026-09-05",
                    "categoryId": category["id"],
                },
                {
                    "description": "Tentativa inválida",
                    "amount": 50,
                    "type": "EXPENSE",
                    "paymentMethod": "DEBIT",
                    "date": "2026-09-06",
                    "categoryId": other_cat["id"],
                },
            ]
        },
    )
    assert bad_import.status_code == 422
    assert client.get("/api/transactions", headers=auth).json()["pagination"]["total"] == 0

    # Valid import exceeding category budgetLimit (100)
    good_import = client.post(
        "/api/transactions/import",
        headers=auth,
        json={
            "items": [
                {
                    "description": "Salário Setembro",
                    "amount": 2500.50,
                    "type": "INCOME",
                    "paymentMethod": "DEBIT",  # forced to None for INCOME
                    "date": "2026-09-05",
                    "categoryId": category["id"],
                },
                {
                    "description": "Compra Mercado",
                    "amount": 150.25,
                    "type": "EXPENSE",
                    "paymentMethod": "CREDIT",
                    "date": "2026-09-10",
                    "categoryId": category["id"],
                },
            ]
        },
    )
    assert good_import.status_code == 201, good_import.text
    result = good_import.json()
    assert result["importedCount"] == 2
    assert result["incomeCount"] == 1
    assert result["expenseCount"] == 1
    assert result["incomeTotal"] == 2500.5
    assert result["expenseTotal"] == 150.25
    assert len(result["budgetWarnings"]) == 1
    assert "foi ultrapassado" in result["budgetWarnings"][0]

    listing = client.get("/api/transactions", headers=auth).json()["items"]
    assert len(listing) == 2
    income_item = next(item for item in listing if item["type"] == "INCOME")
    expense_item = next(item for item in listing if item["type"] == "EXPENSE")
    assert income_item["paymentMethod"] is None
    assert expense_item["paymentMethod"] == "CREDIT"

    summary = client.get(
        "/api/dashboard/summary",
        headers=auth,
        params={"startDate": "2026-09-01", "endDate": "2026-09-30"},
    ).json()
    assert summary["periodIncome"] == 2500.5
    assert summary["periodExpense"] == 150.25
    assert summary["periodTotal"] == 2350.25


def test_csv_import_advisory_failure_does_not_undo_import(client, auth, category, monkeypatch):
    def fail(*args):
        raise RuntimeError("isolated simulated failure")

    monkeypatch.setattr("app.dashboard.service.budget_progress", fail)
    response = client.post(
        "/api/transactions/import",
        headers=auth,
        json={
            "items": [
                {
                    "description": "Compra Mercado",
                    "amount": 50,
                    "type": "EXPENSE",
                    "paymentMethod": "DEBIT",
                    "date": "2026-09-10",
                    "categoryId": category["id"],
                }
            ]
        },
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["importedCount"] == 1
    assert "Não foi possível consultar" in data["budgetWarnings"][0]
    assert client.get("/api/transactions", headers=auth).json()["pagination"]["total"] == 1

