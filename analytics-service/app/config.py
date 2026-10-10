import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    internal_api_key: str


def get_settings() -> Settings:
    return Settings(
        internal_api_key=os.getenv("INTERNAL_API_KEY", "")
    )
