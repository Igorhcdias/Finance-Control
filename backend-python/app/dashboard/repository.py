"""Read queries for dashboard aggregates; all reads are scoped to the owner."""
from sqlalchemy import select, func
from ..models import Category, Transaction, Investment


def total(db, user_id, kind, start, end):
    return db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(Transaction.userId == user_id, Transaction.type == kind, Transaction.date >= start, Transaction.date <= end))


def category_expenses(db, user_id, start, end):
    amount = func.sum(Transaction.amount)
    return db.execute(select(Category.id, Category.name, Category.color, amount).join(Transaction, Transaction.categoryId == Category.id).where(Transaction.userId == user_id, Transaction.type == "EXPENSE", Transaction.date >= start, Transaction.date <= end).group_by(Category.id, Category.name, Category.color).order_by(amount.desc())).all()


def budget_categories(db, user_id):
    return db.scalars(select(Category).where(Category.userId == user_id, Category.budgetLimit > 0).order_by(Category.name)).all()


def invested(db, user_id):
    return db.scalar(select(func.coalesce(func.sum(Investment.amount), 0)).where(Investment.userId == user_id))


def recent_transactions(db, user_id):
    return db.scalars(select(Transaction).where(Transaction.userId == user_id).order_by(Transaction.date.desc()).limit(5)).all()


def payment_totals(db, user_id, start, end):
    return db.execute(select(Transaction.paymentMethod, func.sum(Transaction.amount)).where(Transaction.userId == user_id, Transaction.type == "EXPENSE", Transaction.date >= start, Transaction.date <= end).group_by(Transaction.paymentMethod)).all()


def transactions_in_period(db, user_id, start, end):
    return db.scalars(select(Transaction).where(Transaction.userId == user_id, Transaction.date >= start, Transaction.date <= end).order_by(Transaction.date)).all()
