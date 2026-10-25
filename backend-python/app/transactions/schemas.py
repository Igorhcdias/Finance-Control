from ..common.schemas import Input, Money, Kind, Payment, CalendarDate, trim
from typing import Annotated
from uuid import UUID
from pydantic import BaseModel, BeforeValidator, Field

Description = Annotated[str, BeforeValidator(trim), Field(min_length=2, max_length=255)]


class TransactionCreate(Input):
    description: Description
    amount: Money
    type: Kind
    paymentMethod: Payment | None = None
    date: CalendarDate
    categoryId: UUID


class TransactionUpdate(Input):
    description: Description | None = None
    amount: Money | None = None
    type: Kind | None = None
    paymentMethod: Payment | None = None
    date: CalendarDate | None = None
    categoryId: UUID | None = None


class TransactionQuery(BaseModel):
    type: Kind | None = None
    categoryId: UUID | None = None
    search: Annotated[str, BeforeValidator(trim)] | None = None
    startDate: CalendarDate | None = None
    endDate: CalendarDate | None = None
    page: int = Field(default=1, gt=0)
    pageSize: int = Field(default=20, gt=0, le=100)
