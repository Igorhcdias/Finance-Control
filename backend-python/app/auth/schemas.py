from ..common.schemas import Input, Name, Email
from pydantic import Field


class Register(Input):
    name: Name
    email: Email
    password: str = Field(min_length=6, max_length=100)


class Login(Input):
    email: Email
    password: str = Field(min_length=1)
