from typing import Annotated
from fastapi import APIRouter, Depends, Response
from ..common.dependencies import Db, Owner
from . import service as services
from . import schemas as s

router = APIRouter()


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
    services.delete_transaction(db, user, record_id)
    return Response(status_code=204)
