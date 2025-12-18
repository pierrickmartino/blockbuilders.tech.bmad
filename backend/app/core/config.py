from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Blockbuilders API"
    app_version: str = "0.1.0"
    database_url: str = "postgresql://postgres:postgres@db:5432/blockbuilders"
    redis_url: str = "redis://redis:6379/0"
    jwt_secret_key: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    # S3/MinIO settings
    s3_endpoint_url: str = "http://storage:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "blockbuilders"
    s3_region: str = "us-east-1"

    # CryptoCompare API settings
    cryptocompare_api_url: str = "https://min-api.cryptocompare.com/data/v2"
    cryptocompare_api_key: str = ""

    # Backtest defaults
    default_initial_balance: float = 10000.0
    default_fee_rate: float = 0.001
    default_slippage_rate: float = 0.0005
    max_gap_candles: int = 5

    # Scheduler settings
    scheduler_hour_utc: int = 2  # 02:00 UTC default
    scheduler_enabled: bool = True

    # Usage limits (soft caps for beta)
    default_max_strategies: int = 10
    default_max_backtests_per_day: int = 50

    cors_origins: str = "http://localhost:3000"  # Override in production

    class Config:
        env_file = ".env"


settings = Settings()
