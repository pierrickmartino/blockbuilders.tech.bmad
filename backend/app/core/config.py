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
    cryptocompare_api_url: str = "https://min-api.cryptocompare.com/data"
    cryptocompare_api_key: str = ""

    # Backtest defaults
    default_initial_balance: float = 10000.0
    default_fee_rate: float = 0.001
    default_slippage_rate: float = 0.0005
    max_gap_candles: int = 5

    # Scheduler settings
    scheduler_hour_utc: int = 2  # 02:00 UTC default
    scheduler_enabled: bool = True

    # Data quality validation
    data_quality_lookback_days: int = 90
    data_quality_gap_threshold: float = 2.0
    data_quality_outlier_threshold: float = 0.25
    data_quality_volume_threshold: float = 95.0

    # Usage limits (soft caps for beta)
    default_max_strategies: int = 10
    default_max_backtests_per_day: int = 50

    cors_origins: str = "http://localhost:3000"  # Override in production

    # Password reset
    resend_api_key: str = ""
    reset_token_expire_hours: int = 1
    frontend_url: str = "http://localhost:3000"

    # OAuth - Google
    google_client_id: str = ""
    google_client_secret: str = ""

    # OAuth - GitHub
    github_client_id: str = ""
    github_client_secret: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_pro_monthly: str = ""
    stripe_price_pro_annual: str = ""
    stripe_price_premium_monthly: str = ""
    stripe_price_premium_annual: str = ""
    stripe_price_backtest_credits_50: str = ""
    stripe_price_strategy_slots_5: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
