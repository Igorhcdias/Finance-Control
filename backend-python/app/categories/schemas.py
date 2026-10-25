from ..common.schemas import Input, Money, trim
from typing import Annotated
from pydantic import BeforeValidator, Field

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
