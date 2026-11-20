from sqlalchemy import select, func
from ..models import Category, Transaction


def list_for_user(db, user_id):
    return list(db.scalars(select(Category).where(Category.userId == user_id).order_by(Category.name)).all())


def find_for_user(db, record_id, user_id):
    return db.scalar(select(Category).where(Category.id == record_id, Category.userId == user_id))


def find_ids_for_user(db, category_ids, user_id):
    if not category_ids:
        return set()
    return set(db.scalars(select(Category.id).where(Category.userId == user_id, Category.id.in_(category_ids))).all())


def find_by_name(db, user_id, name, excluding_id=None):
    query = select(Category).where(Category.userId == user_id, Category.name == name)
    if excluding_id:
        query = query.where(Category.id != excluding_id)
    return db.scalar(query)


def transaction_count(db, category_id):
    return db.scalar(select(func.count()).select_from(Transaction).where(Transaction.categoryId == category_id))
