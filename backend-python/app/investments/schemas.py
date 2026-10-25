from ..common.schemas import Input, trim
from datetime import date
from decimal import Decimal
from typing import Annotated
from pydantic import BeforeValidator, Field


class InvestmentInput(Input):
    description: Annotated[str, BeforeValidator(trim), Field(min_length=1, max_length=255)]
    amount: Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
    date: date
