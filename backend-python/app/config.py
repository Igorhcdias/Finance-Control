from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8-sig", extra="ignore")
    database_url: str
    jwt_secret: str
    jwt_expires_in: str = "1d"
    frontend_url: str = "http://localhost:5173"
    port: int = 3333


@lru_cache
def get_settings() -> Settings:
    return Settings()
