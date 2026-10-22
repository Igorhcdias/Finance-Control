import calendar
import re
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import select, func
from .models import Category, Transaction, Investment
from .serialization import serialize
from .errors import AppError

ZERO = Decimal(0)
MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
SHORT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."]


def today():
    return datetime.now(timezone.utc).date()


def period(day):
    return day.replace(day=1), day.replace(day=calendar.monthrange(day.year, day.month)[1])


def shift_month(day, offset):
    index = day.year * 12 + day.month - 1 + offset
    return date(index // 12, index % 12 + 1, 1)


def rounded(value):
    return float(value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


def total(db, user_id, kind, start, end):
    return db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(Transaction.userId == user_id, Transaction.type == kind, Transaction.date >= start, Transaction.date <= end))


def category_expenses(db, user_id, start, end):
    amount = func.sum(Transaction.amount)
    rows = db.execute(select(Category.id, Category.name, Category.color, amount).join(Transaction, Transaction.categoryId == Category.id).where(Transaction.userId == user_id, Transaction.type == "EXPENSE", Transaction.date >= start, Transaction.date <= end).group_by(Category.id, Category.name, Category.color).order_by(amount.desc())).all()
    overall = sum((r[3] for r in rows), ZERO)
    return [{"categoryId": r[0], "categoryName": r[1], "categoryColor": r[2], "amount": r[3], "percentage": rounded(r[3] / overall * 100) if overall else 0} for r in rows]


def budget_progress(db, user_id, start, end):
    categories = db.scalars(select(Category).where(Category.userId == user_id, Category.budgetLimit > 0).order_by(Category.name)).all()
    spent = {c["categoryId"]: c["amount"] for c in category_expenses(db, user_id, start, end)}
    result = []
    for c in categories:
        amount = spent.get(c.id, ZERO)
        result.append({"categoryId": c.id, "categoryName": c.name, "categoryColor": c.color, "budgetLimit": c.budgetLimit, "amountSpent": amount, "spentPercentage": rounded(amount / c.budgetLimit * 100), "status": "exceeded" if amount >= c.budgetLimit else "warning" if amount >= c.budgetLimit * Decimal("0.8") else "normal"})
    return result


def numbers(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, list):
        return [numbers(v) for v in value]
    if isinstance(value, dict):
        return {k: numbers(v) for k, v in value.items()}
    return value


def summary(db, user_id, start=None, end=None):
    default_start, default_end = period(today())
    start, end = start or default_start, end or default_end
    income, expense = total(db, user_id, "INCOME", start, end), total(db, user_id, "EXPENSE", start, end)
    invested = db.scalar(select(func.coalesce(func.sum(Investment.amount), 0)).where(Investment.userId == user_id))
    # Preserve the original Node all-time range.
    balance = total(db, user_id, "INCOME", date(2000, 1, 1), date(2100, 1, 1)) - total(db, user_id, "EXPENSE", date(2000, 1, 1), date(2100, 1, 1)) - invested
    recent = db.scalars(select(Transaction).where(Transaction.userId == user_id).order_by(Transaction.date.desc()).limit(5)).all()
    methods = {"debit": ZERO, "credit": ZERO, "unspecified": ZERO}
    rows = db.execute(select(Transaction.paymentMethod, func.sum(Transaction.amount)).where(Transaction.userId == user_id, Transaction.type == "EXPENSE", Transaction.date >= start, Transaction.date <= end).group_by(Transaction.paymentMethod)).all()
    for method, amount in rows:
        methods[{"DEBIT": "debit", "CREDIT": "credit"}.get(method, "unspecified")] = amount
    return numbers({"balance": balance, "periodIncome": income, "periodExpense": expense, "periodTotal": income - expense, "recentTransactions": serialize(list(recent)), "expensesByCategory": category_expenses(db, user_id, start, end), "expensesByPaymentMethod": methods, "budgetProgress": budget_progress(db, user_id, start, end)})


def month_label(day):
    return f"{SHORT[day.month - 1]} de {day.year % 100:02d}"


def chart(db, user_id, start=None, end=None):
    if not start or not end:
        points = []
        for offset in range(-5, 1):
            first, last = period(shift_month(today(), offset))
            points.append({"label": month_label(first), "income": total(db, user_id, "INCOME", first, last), "expense": total(db, user_id, "EXPENSE", first, last)})
        return numbers(points)
    daily = abs((end - start).days) <= 31
    def label(day):
        return f"{day.day:02d} de {SHORT[day.month - 1]}" if daily else month_label(day)
    points = {}
    cursor = start if daily else start.replace(day=1)
    while cursor <= end:
        points[label(cursor)] = {"income": ZERO, "expense": ZERO}
        if cursor == date.max:
            break
        if not daily and cursor.year == 9999 and cursor.month == 12:
            break
        cursor = cursor + timedelta(days=1) if daily else shift_month(cursor, 1)
    rows = db.scalars(select(Transaction).where(Transaction.userId == user_id, Transaction.date >= start, Transaction.date <= end).order_by(Transaction.date)).all()
    for t in rows:
        point = points.setdefault(label(t.date), {"income": ZERO, "expense": ZERO})
        point["income" if t.type == "INCOME" else "expense"] += t.amount
    return numbers([{"label": key, **value} for key, value in points.items()])


def percentage(current, baseline):
    return rounded((current - baseline) / baseline * 100) if baseline else (0 if current == 0 else None)


def comparison(db, user_id, month1=None, month2=None):
    def parse(value, offset):
        if value is None:
            return shift_month(today(), offset)
        if not re.fullmatch(r"[1-9]\d{3}-(0[1-9]|1[0-2])", value):
            raise AppError("Informe um mês válido no formato AAAA-MM", 400)
        return date.fromisoformat(value + "-01")
    m1, m2 = parse(month1, 0), parse(month2, -1)
    c1 = category_expenses(db, user_id, *period(m1))
    c2 = category_expenses(db, user_id, *period(m2))
    lookup = {}
    for key, rows in (("month1Amount", c1), ("month2Amount", c2)):
        for row in rows:
            item = lookup.setdefault(row["categoryId"], {k: row[k] for k in ("categoryId", "categoryName", "categoryColor")} | {"month1Amount": ZERO, "month2Amount": ZERO})
            item[key] = row["amount"]
    for item in lookup.values():
        item["difference"] = item["month1Amount"] - item["month2Amount"]
        item["percentageChange"] = percentage(item["month1Amount"], item["month2Amount"])
    t1, t2 = sum((r["amount"] for r in c1), ZERO), sum((r["amount"] for r in c2), ZERO)
    def month(day, amount):
        return {"yearMonth": day.strftime("%Y-%m"), "label": f"{MONTHS[day.month-1].capitalize()} de {day.year}", "totalExpense": amount}
    return numbers({"month1": month(m1, t1), "month2": month(m2, t2), "difference": t1 - t2, "percentageChange": percentage(t1, t2), "categories": sorted(lookup.values(), key=lambda c: max(c["month1Amount"], c["month2Amount"]), reverse=True)})
