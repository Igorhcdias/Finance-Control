from ..common.schemas import Input, Name, Email
from pydantic import Field


class ProfileUpdate(Input):
    name: Name | None = None
    email: Email | None = None


class PasswordUpdate(Input):
    currentPassword: str = Field(min_length=1)
    newPassword: str = Field(min_length=6)
