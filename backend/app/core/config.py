from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Blockbuilders API"
    app_version: str = "0.1.0"
    database_url: str = "postgresql://postgres:postgres@db:5432/blockbuilders"
    redis_url: str = "redis://redis:6379/0"

    class Config:
        env_file = ".env"


settings = Settings()
