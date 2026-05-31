"""Market data package: PriceProvider protocol, PriceRouter, and provider implementations."""
from redis import Redis

from app.core.config import settings
from app.market_data.binance import BinanceProvider, SymbolMapper
from app.market_data.circuit_breaker import CircuitBreaker
from app.market_data.cryptocompare import CryptoCompareProvider
from app.market_data.router import PriceRouter

_redis = Redis.from_url(settings.redis_url)
price_router = PriceRouter(
    [CryptoCompareProvider(), BinanceProvider(SymbolMapper(_redis))],
    circuit_breaker=CircuitBreaker(_redis),
)
