from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    telegram_api_id: int | None = None
    telegram_api_hash: str | None = None
    telegram_bot_token: str | None = None
    database_url: str | None = None
    allowed_user_id: int | None = None
    allowed_origins: str = "http://localhost:5173"

    model_config = {"env_file": "../.env", "extra": "ignore"}

    @field_validator("telegram_api_id", "allowed_user_id", mode="before")
    @classmethod
    def empty_string_to_none(cls, v):
        if v == "":
            return None
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
