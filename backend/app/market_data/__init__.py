"""Market data package: PriceProvider protocol, PriceRouter, and provider implementations."""
from app.market_data.cryptocompare import CryptoCompareProvider
from app.market_data.router import PriceRouter

price_router = PriceRouter([CryptoCompareProvider()])
