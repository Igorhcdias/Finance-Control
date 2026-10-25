from fastapi import APIRouter
from ..common.dependencies import Db
from . import service as services
from . import schemas as s

router = APIRouter()


@router.post("/auth/register", status_code=201)
def register(data: s.Register, db: Db):
    return services.register(db, data)


@router.post("/auth/login")
def login(data: s.Login, db: Db):
    return services.login(db, data)
