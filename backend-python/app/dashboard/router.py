from fastapi import APIRouter
from ..common.dependencies import Db, Owner
from . import service as services
from ..common import schemas as s

router = APIRouter()


@router.get("/dashboard/summary")
def summary(user: Owner, db: Db, startDate: s.CalendarDate | None = None, endDate: s.CalendarDate | None = None):
    return services.summary(db, user, startDate, endDate)


@router.get("/dashboard/chart")
def chart(user: Owner, db: Db, startDate: s.CalendarDate | None = None, endDate: s.CalendarDate | None = None):
    return services.chart(db, user, startDate, endDate)


@router.get("/dashboard/monthly-comparison")
def comparison(user: Owner, db: Db, month1: str | None = None, month2: str | None = None):
    return services.comparison(db, user, month1, month2)
