"""Market data package: PriceProvider protocol, PriceRouter, and provider implementations."""
from redis import Redis

from app.core.config import settings
from app.market_data.binance import BinanceProvider, SymbolMapper
from app.market_data.circuit_breaker import CircuitBreaker
from app.market_data.cryptocompare import CryptoCompareProvider
from app.market_data.router import PriceRouter

_redis = Redis.from_url(settings.redis_url)
_cryptocompare = CryptoCompareProvider()
_binance = BinanceProvider(SymbolMapper(_redis))

# ADR-0003: per-surface primaries. Spot is Binance-primary so the gated
# refresh job (ADR-0002) stops spending CryptoCompare quota on every tick;
# candles stay CryptoCompare-primary for its broader multi-exchange history,
# with Binance as backup when CryptoCompare is capped or down.
price_router = PriceRouter(
    [_cryptocompare, _binance],
    circuit_breaker=CircuitBreaker(_redis),
    spot_order=[_binance, _cryptocompare],
    candle_order=[_cryptocompare, _binance],
)
