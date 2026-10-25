from sqlalchemy import select, func
from ..models import Transaction


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


def list_page(db, user_id, filters):
    query = transaction_query(user_id, filters)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = db.scalars(query.order_by(Transaction.date.desc()).offset((filters.page - 1) * filters.pageSize).limit(filters.pageSize)).all()
    return total, items
