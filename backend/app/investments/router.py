from ..serialization import serialize
from fastapi import APIRouter, Response
from ..common.dependencies import Db, Owner
from . import service as services
from . import schemas as s

router = APIRouter()


@router.get("/investments")
def investments(user: Owner, db: Db):
    return services.list_investments(db, user)


@router.post("/investments", status_code=201)
def create_investment(data: s.InvestmentInput, user: Owner, db: Db):
    return serialize(services.save_investment(db, user, data))


@router.put("/investments/{record_id}", status_code=204)
def update_investment(record_id: str, data: s.InvestmentInput, user: Owner, db: Db):
    services.save_investment(db, user, data, record_id)
    return Response(status_code=204)


@router.delete("/investments/{record_id}", status_code=204)
def delete_investment(record_id: str, user: Owner, db: Db):
    services.delete_investment(db, user, record_id)
    return Response(status_code=204)
