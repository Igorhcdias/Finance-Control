from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Annotated, Literal
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
