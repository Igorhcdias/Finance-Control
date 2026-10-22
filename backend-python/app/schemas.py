from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, BeforeValidator, EmailStr, Field, model_validator


def trim(value):
    return value.strip() if isinstance(value, str) else value


Name = Annotated[str, BeforeValidator(trim), Field(min_length=2, max_length=100)]
Email = Annotated[EmailStr, BeforeValidator(trim), Field(max_length=150)]
Money = Annotated[Decimal, Field(gt=0, le=Decimal("9999999999.99"), allow_inf_nan=False)]
Kind = Literal["INCOME", "EXPENSE"]
Payment = Literal["DEBIT", "CREDIT"]


def calendar_date(value):
    if isinstance(value, str) and "T" in value:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.astimezone(timezone.utc).date() if parsed.tzinfo else parsed.date()
    return value


CalendarDate = Annotated[date, BeforeValidator(calendar_date)]


class Input(BaseModel):
    @model_validator(mode="before")
    @classmethod
    def reject_explicit_nulls(cls, values):
        if isinstance(values, dict):
            for key, value in values.items():
                if key in cls.model_fields and value is None and key != "budgetLimit":
                    raise ValueError(f"{key} não pode ser nulo")
        return values


class Register(Input):
    name: Name
    email: Email
    password: str = Field(min_length=6, max_length=100)


class Login(Input):
    email: Email
    password: str = Field(min_length=1)


class ProfileUpdate(Input):
    name: Name | None = None
    email: Email | None = None


class PasswordUpdate(Input):
    currentPassword: str = Field(min_length=1)
    newPassword: str = Field(min_length=6)


CategoryName = Annotated[str, BeforeValidator(trim), Field(min_length=2, max_length=50)]
Color = Annotated[str, Field(pattern=r"^#[0-9A-Fa-f]{6}$")]


class CategoryCreate(Input):
    name: CategoryName
    color: Color
    budgetLimit: Money | None = None


class CategoryUpdate(Input):
    name: CategoryName | None = None
    color: Color | None = None
    budgetLimit: Money | None = None


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


class InvestmentInput(Input):
    description: Annotated[str, BeforeValidator(trim), Field(min_length=1, max_length=255)]
    amount: Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
    date: date


class TransactionQuery(BaseModel):
    type: Kind | None = None
    categoryId: UUID | None = None
    search: Annotated[str, BeforeValidator(trim)] | None = None
    startDate: CalendarDate | None = None
    endDate: CalendarDate | None = None
    page: int = Field(default=1, gt=0)
    pageSize: int = Field(default=20, gt=0, le=100)
