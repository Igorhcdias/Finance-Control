from ..errors import AppError
from ..models import Transaction
from ..serialization import serialize
from ..common.values import data_dict
from ..common.persistence import save, owned, delete_record
from . import repository
from ..categories import repository as category_repository


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
                def currency(value):
                    return "R$ " + f"{value:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
                result["budgetWarning"] = f"O orçamento de {category['categoryName']} em {MONTHS[record.date.month - 1]} de {record.date.year} foi ultrapassado: {currency(category['amountSpent'])} gastos para um limite de {currency(category['budgetLimit'])}."
        except Exception:
            db.rollback()
            result["budgetWarning"] = "Não foi possível consultar o orçamento da categoria agora. Confira o acompanhamento no dashboard."
    return result


def delete_transaction(db, user_id, record_id):
    delete_record(db, Transaction, user_id, record_id, "Transação")
