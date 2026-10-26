from functools import lru_cache
from importlib import import_module

try:
    settings_module = import_module("pydantic_settings")
    BaseSettings = settings_module.BaseSettings
    SettingsConfigDict = settings_module.SettingsConfigDict
except ModuleNotFoundError:
    from pydantic import BaseSettings

    SettingsConfigDict = None


class Settings(BaseSettings):
    if SettingsConfigDict is not None:
        model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8-sig", extra="ignore")
    else:
        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8-sig"
            extra = "ignore"

    database_url: str
    jwt_secret: str
    jwt_expires_in: str = "1d"
    frontend_url: str = "http://localhost:5173"
    port: int = 3333


@lru_cache
def get_settings() -> Settings:
    return Settings()
