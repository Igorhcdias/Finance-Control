from collections import Counter, defaultdict
from datetime import date
from decimal import Decimal

from ..errors import AppError
from ..models import Transaction
from ..serialization import serialize
from ..common.values import data_dict, money
from ..common.persistence import save, owned, delete_record
from . import repository
from .csv_parser import normalize_text, parse_csv_transactions
from ..categories import repository as category_repository


def _format_currency_brl(value):
    return "R$\xa0" + f"{value:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def list_transactions(db, user_id, filters):
    total, items = repository.list_page(db, user_id, filters)
    return {"items": serialize(list(items)), "pagination": {"page": filters.page, "pageSize": filters.pageSize, "total": total, "totalPages": (total + filters.pageSize - 1) // filters.pageSize}}


def save_transaction(db, user_id, data, record_id=None):
    record = owned(db, Transaction, record_id, user_id, "Transação") if record_id else Transaction(userId=user_id)
    values = data_dict(data)
    if "categoryId" in values:
        if not category_repository.find_for_user(db, values["categoryId"], user_id):
            raise AppError("Categoria informada não existe ou não pertence a este usuário", 422)
    if values.get("type", record.type) == "INCOME":
        values["paymentMethod"] = None
    for key, value in values.items():
        setattr(record, key, value)
    save(db, record)
    result = serialize(record)
    if record.type == "EXPENSE":
        from ..dashboard.service import period, budget_progress, MONTHS
        try:
            start, end = period(record.date)
            progress = budget_progress(db, user_id, start, end)
            category = next((c for c in progress if c["categoryId"] == record.categoryId), None)
            if category and category["amountSpent"] > category["budgetLimit"]:
                result["budgetWarning"] = f"O orçamento de {category['categoryName']} em {MONTHS[record.date.month - 1]} de {record.date.year} foi ultrapassado: {_format_currency_brl(category['amountSpent'])} gastos para um limite de {_format_currency_brl(category['budgetLimit'])}."
        except Exception:
            db.rollback()
            result["budgetWarning"] = "Não foi possível consultar o orçamento da categoria agora. Confira o acompanhamento no dashboard."
    return result


def delete_transaction(db, user_id, record_id):
    delete_record(db, Transaction, user_id, record_id, "Transação")


def preview_csv_import(db, user_id, data):
    parsed = parse_csv_transactions(
        data.csvContent,
        data.sourceType,
        data.columnMapping.model_dump() if data.columnMapping else None,
    )
    categories = category_repository.list_for_user(db, user_id)
    category_map = {normalize_text(cat.name): cat.id for cat in categories}

    parsed_rows = parsed["rows"]
    existing_counter: Counter = Counter()
    if parsed_rows:
        min_date = min(row["date"] for row in parsed_rows)
        max_date = max(row["date"] for row in parsed_rows)
        existing = repository.find_signatures_in_range(db, user_id, min_date, max_date)
        existing_counter = Counter(
            (tx_date, money(tx_amount), tx_type, normalize_text(tx_desc))
            for tx_date, tx_amount, tx_type, tx_desc in existing
        )

    preview_rows = []
    income_count = 0
    expense_count = 0
    income_total = Decimal("0.00")
    expense_total = Decimal("0.00")
    duplicate_count = 0

    for row in parsed_rows:
        suggested = row["suggestedCategoryName"]
        matched_category_id = category_map.get(normalize_text(suggested)) if suggested else None
        sig = (row["date"], money(row["amount"]), row["type"], normalize_text(row["description"]))
        is_duplicate = False
        if existing_counter[sig] > 0:
            is_duplicate = True
            existing_counter[sig] -= 1
            duplicate_count += 1

        if row["type"] == "INCOME":
            income_count += 1
            income_total += row["amount"]
        else:
            expense_count += 1
            expense_total += row["amount"]

        preview_rows.append(
            {
                "lineNumber": row["lineNumber"],
                "date": row["date"].isoformat(),
                "description": row["description"],
                "amount": float(row["amount"]),
                "type": row["type"],
                "paymentMethod": row["paymentMethod"],
                "suggestedCategoryName": suggested,
                "categoryId": matched_category_id,
                "isDuplicate": is_duplicate,
            }
        )

    return {
        "sourceType": data.sourceType,
        "detectedDelimiter": parsed["detectedDelimiter"],
        "headers": parsed["headers"],
        "detectedMapping": parsed["detectedMapping"],
        "rows": preview_rows,
        "errors": parsed["errors"],
        "summary": {
            "totalRows": len(preview_rows),
            "incomeCount": income_count,
            "expenseCount": expense_count,
            "incomeTotal": float(income_total),
            "expenseTotal": float(expense_total),
            "duplicateCount": duplicate_count,
            "errorCount": len(parsed["errors"]),
        },
    }


def import_transactions(db, user_id, data):
    category_ids = {str(item.categoryId) for item in data.items}
    owned_ids = category_repository.find_ids_for_user(db, category_ids, user_id)
    if owned_ids != category_ids:
        raise AppError("Categoria informada não existe ou não pertence a este usuário", 422)

    records = []
    income_count = 0
    expense_count = 0
    income_total = Decimal("0.00")
    expense_total = Decimal("0.00")
    expense_categories_by_month: dict[tuple[int, int], set[str]] = defaultdict(set)

    for item in data.items:
        values = data_dict(item)
        if values["type"] == "INCOME":
            values["paymentMethod"] = None
            income_count += 1
            income_total += values["amount"]
        else:
            expense_count += 1
            expense_total += values["amount"]
            expense_categories_by_month[(values["date"].year, values["date"].month)].add(values["categoryId"])

        records.append(Transaction(userId=user_id, **values))

    db.add_all(records)
    db.commit()

    budget_warnings: list[str] = []
    if expense_categories_by_month:
        from ..dashboard.service import period, budget_progress, MONTHS
        try:
            for year, month in sorted(expense_categories_by_month):
                start, end = period(date(year, month, 1))
                progress = budget_progress(db, user_id, start, end)
                target_categories = expense_categories_by_month[(year, month)]
                for category in progress:
                    if category["categoryId"] in target_categories and category["amountSpent"] > category["budgetLimit"]:
                        budget_warnings.append(
                            f"O orçamento de {category['categoryName']} em {MONTHS[month - 1]} de {year} foi ultrapassado: "
                            f"{_format_currency_brl(category['amountSpent'])} gastos para um limite de {_format_currency_brl(category['budgetLimit'])}."
                        )
        except Exception:
            db.rollback()
            budget_warnings = [
                "Não foi possível consultar o orçamento das categorias agora. Confira o acompanhamento no dashboard."
            ]

    return {
        "importedCount": len(records),
        "incomeCount": income_count,
        "expenseCount": expense_count,
        "incomeTotal": float(income_total),
        "expenseTotal": float(expense_total),
        "budgetWarnings": budget_warnings,
    }
