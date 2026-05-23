"""Block catalogue — registry of all catalogue-managed block handlers.

Discovery is via explicit imports (not autodiscovery).
"""
from __future__ import annotations

from app.backtest.catalogue.logic.and_ import AndHandler
from app.backtest.catalogue.logic.compare import CompareHandler
from app.backtest.catalogue.logic.crossover import CrossoverHandler
from app.backtest.catalogue.logic.not_ import NotHandler
from app.backtest.catalogue.logic.or_ import OrHandler
from app.backtest.catalogue.indicators.adx import AdxHandler
from app.backtest.catalogue.indicators.atr import AtrHandler
from app.backtest.catalogue.indicators.bollinger import BollingerHandler
from app.backtest.catalogue.indicators.ema import EmaHandler
from app.backtest.catalogue.indicators.fibonacci import FibonacciHandler
from app.backtest.catalogue.indicators.ichimoku import IchimokuHandler
from app.backtest.catalogue.indicators.macd import MacdHandler
from app.backtest.catalogue.indicators.obv import ObvHandler
from app.backtest.catalogue.indicators.price_variation_pct import PriceVariationPctHandler
from app.backtest.catalogue.indicators.rsi import RsiHandler
from app.backtest.catalogue.indicators.sma import SmaHandler
from app.backtest.catalogue.indicators.stochastic import StochasticHandler
from app.backtest.catalogue.sources.constant import ConstantHandler
from app.backtest.catalogue.sources.price import PriceHandler
from app.backtest.catalogue.sources.volume import VolumeHandler
from app.backtest.catalogue.sources.yesterday_close import YesterdayCloseHandler
from app.backtest.catalogue.types import BlockHandler

CATALOGUE: dict[str, BlockHandler] = {
    "price": PriceHandler(),
    "volume": VolumeHandler(),
    "constant": ConstantHandler(),
    "yesterday_close": YesterdayCloseHandler(),
    "sma": SmaHandler(),
    "ema": EmaHandler(),
    "rsi": RsiHandler(),
    "atr": AtrHandler(),
    "obv": ObvHandler(),
    "price_variation_pct": PriceVariationPctHandler(),
    "macd": MacdHandler(),
    "bollinger": BollingerHandler(),
    "stochastic": StochasticHandler(),
    "adx": AdxHandler(),
    "ichimoku": IchimokuHandler(),
    "fibonacci": FibonacciHandler(),
    "compare": CompareHandler(),
    "crossover": CrossoverHandler(),
    "and": AndHandler(),
    "or": OrHandler(),
    "not": NotHandler(),
}


def lookup(block_type: str) -> BlockHandler | None:
    return CATALOGUE.get(block_type)
