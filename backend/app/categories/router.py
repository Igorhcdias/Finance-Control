from ..serialization import serialize
from fastapi import APIRouter, Response
from ..common.dependencies import Db, Owner
from . import service as services
from . import schemas as s

router = APIRouter()


@router.get("/categories")
def categories(user: Owner, db: Db):
    return services.list_categories(db, user)


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
