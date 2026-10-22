from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import select, func
from .errors import AppError
from .models import Category, Transaction, Investment, User
from .security import hash_password, verify_password, auth_response, profile
from .serialization import serialize


def money(value):
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def data_dict(data):
    values = data.model_dump(exclude_unset=True)
    if "categoryId" in values:
        values["categoryId"] = str(values["categoryId"])
    for key in ("amount", "budgetLimit"):
        if values.get(key) is not None:
            values[key] = money(values[key])
    return values


def save(db, record):
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def owned(db, model, record_id, user_id, label):
    record = db.scalar(select(model).where(model.id == record_id, model.userId == user_id))
    if record is None:
        raise AppError(f"{label} não encontrada", 404)
    return record


def get_user(db, user_id):
    user = db.get(User, user_id)
    if user is None:
        raise AppError("Usuário não encontrado", 404)
    return user


def register(db, data):
    if db.scalar(select(User).where(User.email == str(data.email))):
        raise AppError("Este e-mail já está cadastrado", 409)
    user = save(db, User(name=data.name, email=str(data.email), passwordHash=hash_password(data.password)))
    return auth_response(user)


def login(db, data):
    user = db.scalar(select(User).where(User.email == str(data.email)))
    if not user or not verify_password(data.password, user.passwordHash):
        raise AppError("E-mail ou senha inválidos", 401)
    return auth_response(user)


def update_profile(db, user_id, data):
    user = get_user(db, user_id)
    values = data_dict(data)
    if "email" in values and db.scalar(select(User).where(User.email == str(values["email"]), User.id != user_id)):
        raise AppError("Este e-mail já está em uso por outra conta", 409)
    for key, value in values.items():
        setattr(user, key, value)
    return profile(save(db, user))


def change_password(db, user_id, data):
    user = get_user(db, user_id)
    if not verify_password(data.currentPassword, user.passwordHash):
        raise AppError("Senha atual incorreta", 401)
    user.passwordHash = hash_password(data.newPassword)
    save(db, user)


def save_category(db, user_id, data, record_id=None):
    category = owned(db, Category, record_id, user_id, "Categoria") if record_id else Category(userId=user_id)
    values = data_dict(data)
    if "name" in values:
        query = select(Category).where(Category.userId == user_id, Category.name == values["name"])
        if record_id:
            query = query.where(Category.id != record_id)
        if db.scalar(query):
            raise AppError("Você já possui uma categoria com esse nome", 409)
    for key, value in values.items():
        setattr(category, key, value)
    return save(db, category)


def delete_category(db, user_id, record_id):
    category = owned(db, Category, record_id, user_id, "Categoria")
    if db.scalar(select(func.count()).select_from(Transaction).where(Transaction.categoryId == record_id)):
        raise AppError("Esta categoria possui transações vinculadas e não pode ser excluída", 409)
    db.delete(category)
    db.commit()


def transaction_query(user_id, filters):
    query = select(Transaction).where(Transaction.userId == user_id)
    for name in ("type", "categoryId"):
        value = getattr(filters, name, None)
        if value is not None:
            query = query.where(getattr(Transaction, name) == str(value))
    if filters.search:
        # Escape wildcard characters: Prisma contains uses literal substrings.
        text = filters.search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.where(Transaction.description.ilike(f"%{text}%", escape="\\"))
    if filters.startDate:
        query = query.where(Transaction.date >= filters.startDate)
    if filters.endDate:
        query = query.where(Transaction.date <= filters.endDate)
    return query


def list_transactions(db, user_id, filters):
    query = transaction_query(user_id, filters)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.order_by(Transaction.date.desc()).offset((filters.page - 1) * filters.pageSize).limit(filters.pageSize)).all()
    return {"items": serialize(list(items)), "pagination": {"page": filters.page, "pageSize": filters.pageSize, "total": total, "totalPages": (total + filters.pageSize - 1) // filters.pageSize}}


def save_transaction(db, user_id, data, record_id=None):
    record = owned(db, Transaction, record_id, user_id, "Transação") if record_id else Transaction(userId=user_id)
    values = data_dict(data)
    if "categoryId" in values:
        if not db.scalar(select(Category).where(Category.id == values["categoryId"], Category.userId == user_id)):
            raise AppError("Categoria informada não existe ou não pertence a este usuário", 422)
    if values.get("type", record.type) == "INCOME":
        values["paymentMethod"] = None
    for key, value in values.items():
        setattr(record, key, value)
    save(db, record)
    result = serialize(record)
    if record.type == "EXPENSE":
        from .dashboard import period, budget_progress, MONTHS
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


def save_investment(db, user_id, data, record_id=None):
    record = owned(db, Investment, record_id, user_id, "Reserva") if record_id else Investment(userId=user_id)
    for key, value in data_dict(data).items():
        setattr(record, key, value)
    return save(db, record)


def delete_record(db, model, user_id, record_id, label):
    db.delete(owned(db, model, record_id, user_id, label))
    db.commit()
