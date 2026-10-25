from fastapi import APIRouter, Response
from ..common.dependencies import Db, Owner
from ..security import profile
from . import service as services
from . import schemas as s

router = APIRouter()


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
