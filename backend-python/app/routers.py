from typing import Annotated
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session
from . import schemas as s, services, dashboard
from .database import get_db
from .security import current_user, profile
from .models import Category, Transaction, Investment
from .serialization import serialize

Db = Annotated[Session, Depends(get_db)]
Owner = Annotated[str, Depends(current_user)]
router = APIRouter(prefix="/api")


@router.post("/auth/register", status_code=201)
def register(data: s.Register, db: Db):
    return services.register(db, data)


@router.post("/auth/login")
def login(data: s.Login, db: Db):
    return services.login(db, data)


@router.get("/users/me")
def me(user: Owner, db: Db):
    return profile(services.get_user(db, user))


@router.put("/users/me")
def update_profile(data: s.ProfileUpdate, user: Owner, db: Db):
    return services.update_profile(db, user, data)


@router.put("/users/me/password", status_code=204)
def change_password(data: s.PasswordUpdate, user: Owner, db: Db):
    services.change_password(db, user, data)
    return Response(status_code=204)


@router.get("/categories")
def categories(user: Owner, db: Db):
    return serialize(list(db.scalars(select(Category).where(Category.userId == user).order_by(Category.name)).all()))


@router.post("/categories", status_code=201)
def create_category(data: s.CategoryCreate, user: Owner, db: Db):
    return serialize(services.save_category(db, user, data))


@router.put("/categories/{record_id}")
def update_category(record_id: str, data: s.CategoryUpdate, user: Owner, db: Db):
    return serialize(services.save_category(db, user, data, record_id))


@router.delete("/categories/{record_id}", status_code=204)
def delete_category(record_id: str, user: Owner, db: Db):
    services.delete_category(db, user, record_id)
    return Response(status_code=204)


@router.get("/transactions")
def transactions(user: Owner, db: Db, filters: Annotated[s.TransactionQuery, Depends()]):
    return services.list_transactions(db, user, filters)


@router.post("/transactions", status_code=201)
def create_transaction(data: s.TransactionCreate, user: Owner, db: Db):
    return services.save_transaction(db, user, data)


@router.put("/transactions/{record_id}")
def update_transaction(record_id: str, data: s.TransactionUpdate, user: Owner, db: Db):
    return services.save_transaction(db, user, data, record_id)


@router.delete("/transactions/{record_id}", status_code=204)
def delete_transaction(record_id: str, user: Owner, db: Db):
    services.delete_record(db, Transaction, user, record_id, "Transação")
    return Response(status_code=204)


@router.get("/investments")
def investments(user: Owner, db: Db):
    return serialize(list(db.scalars(select(Investment).where(Investment.userId == user).order_by(Investment.date.desc(), Investment.createdAt.desc())).all()))


@router.post("/investments", status_code=201)
def create_investment(data: s.InvestmentInput, user: Owner, db: Db):
    return serialize(services.save_investment(db, user, data))


@router.put("/investments/{record_id}", status_code=204)
def update_investment(record_id: str, data: s.InvestmentInput, user: Owner, db: Db):
    services.save_investment(db, user, data, record_id)
    return Response(status_code=204)


@router.delete("/investments/{record_id}", status_code=204)
def delete_investment(record_id: str, user: Owner, db: Db):
    services.delete_record(db, Investment, user, record_id, "Reserva")
    return Response(status_code=204)


@router.get("/dashboard/summary")
def summary(user: Owner, db: Db, startDate: s.CalendarDate | None = None, endDate: s.CalendarDate | None = None):
    return dashboard.summary(db, user, startDate, endDate)


@router.get("/dashboard/chart")
def chart(user: Owner, db: Db, startDate: s.CalendarDate | None = None, endDate: s.CalendarDate | None = None):
    return dashboard.chart(db, user, startDate, endDate)


@router.get("/dashboard/monthly-comparison")
def comparison(user: Owner, db: Db, month1: str | None = None, month2: str | None = None):
    return dashboard.comparison(db, user, month1, month2)
