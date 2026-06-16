# Strategy template definitions for seeding
# Each template includes complete block/connection definitions following the wizard pattern

TEMPLATES = [
    {
        "name": "RSI Oversold Bounce",
        "description": "Buy when RSI drops below 30 (oversold), sell when it rises above 70 (overbought). Classic mean-reversion strategy.",
        "logic_summary": "Enters long positions when RSI indicates oversold conditions and exits when overbought",
        "teaches_description": "Learn how RSI measures momentum and how oversold/overbought zones signal potential reversals. This is the simplest indicator-based strategy pattern.",
        "difficulty": "beginner",
        "sort_order": 1,
        "use_cases": [
            "Sideways or ranging markets",
            "High volatility altcoins",
            "Mean-reversion trading on daily timeframes"
        ],
        "parameter_ranges": {
            "RSI Period": "10-20 (default: 14)",
            "Oversold Threshold": "20-35 (default: 30)",
            "Overbought Threshold": "65-80 (default: 70)"
        },
        "asset": "BTC/USDT",
        "timeframe": "1d",
        "definition_json": {
            "blocks": [
                {
                    "id": "rsi-1",
                    "type": "rsi",
                    "label": "RSI (14)",
                    "position": {"x": 100, "y": 200},
                    "params": {"period": 14, "source": "close"}
                },
                {
                    "id": "const-oversold",
                    "type": "constant",
                    "label": "Oversold (30)",
                    "position": {"x": 100, "y": 100},
                    "params": {"value": 30}
                },
                {
                    "id": "const-overbought",
                    "type": "constant",
                    "label": "Overbought (70)",
                    "position": {"x": 100, "y": 300},
                    "params": {"value": 70}
                },
                {
                    "id": "compare-entry",
                    "type": "compare",
                    "label": "RSI < 30",
                    "position": {"x": 300, "y": 150},
                    "params": {"operator": "<"}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 500, "y": 150},
                    "params": {}
                },
                {
                    "id": "compare-exit",
                    "type": "compare",
                    "label": "RSI > 70",
                    "position": {"x": 300, "y": 300},
                    "params": {"operator": ">"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 500, "y": 300},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "rsi-1", "port": "output"},
                    "to_port": {"block_id": "compare-entry", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-oversold", "port": "output"},
                    "to_port": {"block_id": "compare-entry", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "rsi-1", "port": "output"},
                    "to_port": {"block_id": "compare-exit", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-overbought", "port": "output"},
                    "to_port": {"block_id": "compare-exit", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-exit", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    },
    {
        "name": "MA Crossover",
        "description": "Buy when fast moving average crosses above slow moving average, sell on opposite crossover. Classic trend-following strategy.",
        "logic_summary": "Enters when fast SMA (10) crosses above slow SMA (30), exits on reverse crossover",
        "teaches_description": "Understand how moving average crossovers identify trend changes. This foundational pattern is the basis of most trend-following strategies.",
        "difficulty": "beginner",
        "sort_order": 2,
        "use_cases": [
            "Trending markets with clear directional moves",
            "Medium to long-term trend following",
            "Works well on major pairs with sustained trends"
        ],
        "parameter_ranges": {
            "Fast MA Period": "5-20 (default: 10)",
            "Slow MA Period": "20-50 (default: 30)",
            "MA Type": "SMA or EMA"
        },
        "asset": "ETH/USDT",
        "timeframe": "1d",
        "definition_json": {
            "blocks": [
                {
                    "id": "sma-fast",
                    "type": "sma",
                    "label": "Fast SMA (10)",
                    "position": {"x": 100, "y": 100},
                    "params": {"period": 10, "source": "close"}
                },
                {
                    "id": "sma-slow",
                    "type": "sma",
                    "label": "Slow SMA (30)",
                    "position": {"x": 100, "y": 300},
                    "params": {"period": 30, "source": "close"}
                },
                {
                    "id": "crossover-entry",
                    "type": "crossover",
                    "label": "Entry Crossover",
                    "position": {"x": 300, "y": 100},
                    "params": {"direction": "crosses_above"}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 500, "y": 100},
                    "params": {}
                },
                {
                    "id": "crossover-exit",
                    "type": "crossover",
                    "label": "Exit Crossover",
                    "position": {"x": 300, "y": 300},
                    "params": {"direction": "crosses_below"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 500, "y": 300},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "sma-fast", "port": "output"},
                    "to_port": {"block_id": "crossover-entry", "port": "fast"}
                },
                {
                    "from_port": {"block_id": "sma-slow", "port": "output"},
                    "to_port": {"block_id": "crossover-entry", "port": "slow"}
                },
                {
                    "from_port": {"block_id": "crossover-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "sma-fast", "port": "output"},
                    "to_port": {"block_id": "crossover-exit", "port": "fast"}
                },
                {
                    "from_port": {"block_id": "sma-slow", "port": "output"},
                    "to_port": {"block_id": "crossover-exit", "port": "slow"}
                },
                {
                    "from_port": {"block_id": "crossover-exit", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    },
    # -------------------------------------------------------------------------
    # Module 1, Lesson 4 — EMA Trend Following
    # -------------------------------------------------------------------------
    {
        "name": "EMA Trend Following",
        "description": "Buy when fast EMA crosses above slow EMA, sell on opposite crossover. Like MA Crossover but with exponential weighting that reacts faster to recent price changes.",
        "logic_summary": "Enters when EMA(9) crosses above EMA(21), exits on reverse crossover",
        "teaches_description": "Discover the difference between Simple and Exponential Moving Averages. EMA weighs recent prices more heavily, so crossovers happen sooner — but also produce more false signals. Compare the trade timing to the SMA Crossover lesson to see the trade-off.",
        "difficulty": "intermediate",
        "sort_order": 4,
        "use_cases": [
            "Trending markets where speed of signal matters",
            "Pairs with frequent short-term trend changes",
            "Comparing EMA vs SMA lag in live backtests"
        ],
        "parameter_ranges": {
            "Fast EMA Period": "5-15 (default: 9)",
            "Slow EMA Period": "15-30 (default: 21)",
        },
        "asset": "BTC/USDT",
        "timeframe": "1d",
        "definition_json": {
            "blocks": [
                {
                    "id": "ema-fast",
                    "type": "ema",
                    "label": "Fast EMA (9)",
                    "position": {"x": 100, "y": 100},
                    "params": {"period": 9, "source": "close"}
                },
                {
                    "id": "ema-slow",
                    "type": "ema",
                    "label": "Slow EMA (21)",
                    "position": {"x": 100, "y": 300},
                    "params": {"period": 21, "source": "close"}
                },
                {
                    "id": "crossover-entry",
                    "type": "crossover",
                    "label": "EMA Cross Up",
                    "position": {"x": 300, "y": 100},
                    "params": {"direction": "crosses_above"}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 500, "y": 100},
                    "params": {}
                },
                {
                    "id": "crossover-exit",
                    "type": "crossover",
                    "label": "EMA Cross Down",
                    "position": {"x": 300, "y": 300},
                    "params": {"direction": "crosses_below"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 500, "y": 300},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "ema-fast", "port": "output"},
                    "to_port": {"block_id": "crossover-entry", "port": "fast"}
                },
                {
                    "from_port": {"block_id": "ema-slow", "port": "output"},
                    "to_port": {"block_id": "crossover-entry", "port": "slow"}
                },
                {
                    "from_port": {"block_id": "crossover-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "ema-fast", "port": "output"},
                    "to_port": {"block_id": "crossover-exit", "port": "fast"}
                },
                {
                    "from_port": {"block_id": "ema-slow", "port": "output"},
                    "to_port": {"block_id": "crossover-exit", "port": "slow"}
                },
                {
                    "from_port": {"block_id": "crossover-exit", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    },
    # -------------------------------------------------------------------------
    # Module 2, Lesson 5 — MACD Histogram Cross
    # -------------------------------------------------------------------------
    {
        "name": "MACD Histogram Cross",
        "description": "Enter when the MACD histogram crosses above zero (bullish momentum), exit when it crosses back below zero.",
        "logic_summary": "Enters when MACD histogram > 0, exits when MACD histogram < 0",
        "teaches_description": "Learn how MACD (Moving Average Convergence Divergence) measures the gap between two EMAs. The histogram crossing zero is a momentum shift — positive means bullish acceleration, negative means bearish. Run this and compare its trade timing to a plain EMA crossover.",
        "difficulty": "intermediate",
        "sort_order": 5,
        "use_cases": [
            "Momentum confirmation before entering trend trades",
            "Filtering out weak crossover signals",
            "Medium-term trend markets with clear momentum cycles"
        ],
        "parameter_ranges": {
            "Fast Period": "8-16 (default: 12)",
            "Slow Period": "20-30 (default: 26)",
            "Signal Period": "7-12 (default: 9)"
        },
        "asset": "ETH/USDT",
        "timeframe": "4h",
        "definition_json": {
            "blocks": [
                {
                    "id": "macd-1",
                    "type": "macd",
                    "label": "MACD (12, 26, 9)",
                    "position": {"x": 100, "y": 200},
                    "params": {"source": "close", "fast_period": 12, "slow_period": 26, "signal_period": 9}
                },
                {
                    "id": "const-zero",
                    "type": "constant",
                    "label": "Zero",
                    "position": {"x": 100, "y": 350},
                    "params": {"value": 0}
                },
                {
                    "id": "compare-entry",
                    "type": "compare",
                    "label": "Histogram > 0",
                    "position": {"x": 300, "y": 150},
                    "params": {"operator": ">"}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 500, "y": 150},
                    "params": {}
                },
                {
                    "id": "compare-exit",
                    "type": "compare",
                    "label": "Histogram < 0",
                    "position": {"x": 300, "y": 350},
                    "params": {"operator": "<"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 500, "y": 350},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "macd-1", "port": "histogram"},
                    "to_port": {"block_id": "compare-entry", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-zero", "port": "output"},
                    "to_port": {"block_id": "compare-entry", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "macd-1", "port": "histogram"},
                    "to_port": {"block_id": "compare-exit", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-zero", "port": "output"},
                    "to_port": {"block_id": "compare-exit", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-exit", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    },
    # -------------------------------------------------------------------------
    # Module 2, Lesson 6 — Stochastic Oversold Bounce
    # -------------------------------------------------------------------------
    {
        "name": "Stochastic Oversold Bounce",
        "description": "Buy when Stochastic %K drops below 20 (oversold), sell when it rises above 80 (overbought). Similar to the RSI lesson but with a range-based oscillator.",
        "logic_summary": "Enters when %K < 20 (oversold zone), exits when %K > 80 (overbought zone)",
        "teaches_description": "The Stochastic Oscillator measures where today's close sits within the recent high-low range as a percentage. Unlike RSI (which compares gains to losses), Stochastic focuses purely on price position. Run both RSI and Stochastic lessons side-by-side to see how different oscillators disagree on entry timing.",
        "difficulty": "intermediate",
        "sort_order": 6,
        "use_cases": [
            "Short-term mean-reversion in ranging markets",
            "Oscillator comparison studies (vs RSI)",
            "4-hour crypto pairs with clear swing cycles"
        ],
        "parameter_ranges": {
            "K Period": "10-20 (default: 14)",
            "D Period": "2-5 (default: 3)",
            "Smooth": "2-5 (default: 3)",
            "Oversold": "15-25 (default: 20)",
            "Overbought": "75-85 (default: 80)"
        },
        "asset": "BTC/USDT",
        "timeframe": "4h",
        "definition_json": {
            "blocks": [
                {
                    "id": "stoch-1",
                    "type": "stochastic",
                    "label": "Stochastic (14, 3, 3)",
                    "position": {"x": 100, "y": 200},
                    "params": {"k_period": 14, "d_period": 3, "smooth": 3}
                },
                {
                    "id": "const-oversold",
                    "type": "constant",
                    "label": "Oversold (20)",
                    "position": {"x": 100, "y": 100},
                    "params": {"value": 20}
                },
                {
                    "id": "const-overbought",
                    "type": "constant",
                    "label": "Overbought (80)",
                    "position": {"x": 100, "y": 300},
                    "params": {"value": 80}
                },
                {
                    "id": "compare-entry",
                    "type": "compare",
                    "label": "%K < 20",
                    "position": {"x": 300, "y": 150},
                    "params": {"operator": "<"}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 500, "y": 150},
                    "params": {}
                },
                {
                    "id": "compare-exit",
                    "type": "compare",
                    "label": "%K > 80",
                    "position": {"x": 300, "y": 300},
                    "params": {"operator": ">"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 500, "y": 300},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "stoch-1", "port": "k"},
                    "to_port": {"block_id": "compare-entry", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-oversold", "port": "output"},
                    "to_port": {"block_id": "compare-entry", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "stoch-1", "port": "k"},
                    "to_port": {"block_id": "compare-exit", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-overbought", "port": "output"},
                    "to_port": {"block_id": "compare-exit", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-exit", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    },
    # -------------------------------------------------------------------------
    # Module 2, Lesson 7 — ADX Directional Filter
    # -------------------------------------------------------------------------
    {
        "name": "ADX Directional Filter",
        "description": "Enter long when ADX's +DI line exceeds -DI (bullish pressure dominates), exit when -DI crosses back above +DI.",
        "logic_summary": "Enters when +DI > -DI (bullish directional dominance), exits when -DI > +DI",
        "teaches_description": "ADX separates trend strength (the ADX line) from trend direction (+DI vs -DI). This lesson ignores the ADX strength value entirely and trades pure directional signals. After running it, add a constant threshold on ADX itself to see how filtering for strong trends changes the trade count and quality.",
        "difficulty": "intermediate",
        "sort_order": 7,
        "use_cases": [
            "Filtering directional bias before entering positions",
            "Markets with alternating sustained up/down trends",
            "Learning to separate trend strength from trend direction"
        ],
        "parameter_ranges": {
            "ADX Period": "10-20 (default: 14)"
        },
        "asset": "BTC/USDT",
        "timeframe": "1d",
        "definition_json": {
            "blocks": [
                {
                    "id": "adx-1",
                    "type": "adx",
                    "label": "ADX (14)",
                    "position": {"x": 100, "y": 200},
                    "params": {"period": 14}
                },
                {
                    "id": "compare-entry",
                    "type": "compare",
                    "label": "+DI > -DI",
                    "position": {"x": 300, "y": 150},
                    "params": {"operator": ">"}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 500, "y": 150},
                    "params": {}
                },
                {
                    "id": "compare-exit",
                    "type": "compare",
                    "label": "-DI > +DI",
                    "position": {"x": 300, "y": 350},
                    "params": {"operator": ">"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 500, "y": 350},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "adx-1", "port": "plus_di"},
                    "to_port": {"block_id": "compare-entry", "port": "left"}
                },
                {
                    "from_port": {"block_id": "adx-1", "port": "minus_di"},
                    "to_port": {"block_id": "compare-entry", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "adx-1", "port": "minus_di"},
                    "to_port": {"block_id": "compare-exit", "port": "left"}
                },
                {
                    "from_port": {"block_id": "adx-1", "port": "plus_di"},
                    "to_port": {"block_id": "compare-exit", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-exit", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    },
    # -------------------------------------------------------------------------
    # Module 2, Lesson 8 — Price Variation Momentum
    # -------------------------------------------------------------------------
    {
        "name": "Price Variation Momentum",
        "description": "Enter when today's close-to-close return exceeds a threshold (strong upward momentum), exit on a sharp down day.",
        "logic_summary": "Enters when daily price change % > 1.5%, exits when daily price change % < -1.0%",
        "teaches_description": "Price Variation % is the simplest momentum signal: what percentage did price move since yesterday's close? A large positive reading flags explosive buying interest; a large negative reading signals panic selling. This lesson uses the raw signal directly — no smoothing, no lag — and exposes the noise that comes with it.",
        "difficulty": "intermediate",
        "sort_order": 8,
        "use_cases": [
            "Catching large single-day breakout moves",
            "Teaching raw momentum vs smoothed indicators",
            "Comparison baseline for MACD and RSI lessons"
        ],
        "parameter_ranges": {
            "Entry Threshold %": "1.0-3.0 (default: 1.5)",
            "Exit Threshold %": "-0.5 to -2.0 (default: -1.0)"
        },
        "asset": "ETH/USDT",
        "timeframe": "1d",
        "definition_json": {
            "blocks": [
                {
                    "id": "pvar-1",
                    "type": "price_variation_pct",
                    "label": "Price Variation %",
                    "position": {"x": 100, "y": 200},
                    "params": {}
                },
                {
                    "id": "const-entry-thr",
                    "type": "constant",
                    "label": "Entry Threshold (1.5%)",
                    "position": {"x": 100, "y": 100},
                    "params": {"value": 1.5}
                },
                {
                    "id": "const-exit-thr",
                    "type": "constant",
                    "label": "Exit Threshold (-1.0%)",
                    "position": {"x": 100, "y": 300},
                    "params": {"value": -1.0}
                },
                {
                    "id": "compare-entry",
                    "type": "compare",
                    "label": "Variation > 1.5%",
                    "position": {"x": 300, "y": 150},
                    "params": {"operator": ">"}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 500, "y": 150},
                    "params": {}
                },
                {
                    "id": "compare-exit",
                    "type": "compare",
                    "label": "Variation < -1.0%",
                    "position": {"x": 300, "y": 300},
                    "params": {"operator": "<"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 500, "y": 300},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "pvar-1", "port": "output"},
                    "to_port": {"block_id": "compare-entry", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-entry-thr", "port": "output"},
                    "to_port": {"block_id": "compare-entry", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "pvar-1", "port": "output"},
                    "to_port": {"block_id": "compare-exit", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-exit-thr", "port": "output"},
                    "to_port": {"block_id": "compare-exit", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-exit", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    },
    # -------------------------------------------------------------------------
    # Module 3, Lesson 9 — Stochastic + RSI Double Oversold
    # -------------------------------------------------------------------------
    {
        "name": "Stochastic + RSI Double Oversold",
        "description": "Enter only when both the Stochastic %K and RSI are in oversold territory simultaneously. Exit when RSI recovers above 60.",
        "logic_summary": "Enters when stochastic %K < 20 AND RSI < 40 (double oversold confirmation); exits when RSI > 60",
        "teaches_description": "Two oversold signals firing at once reduces false entries compared to using either alone. This lesson introduces the AND block, which is your first multi-condition gate. Notice how the trade count drops when you require both signals — and how that affects win rate and missed opportunities.",
        "difficulty": "advanced",
        "sort_order": 9,
        "use_cases": [
            "Mean-reversion with double confirmation to reduce whipsaws",
            "Understanding the AND logic gate in strategy design",
            "High-conviction oversold setups only"
        ],
        "parameter_ranges": {
            "Stochastic K Period": "10-20 (default: 14)",
            "Stochastic Oversold": "15-25 (default: 20)",
            "RSI Period": "10-20 (default: 14)",
            "RSI Oversold Entry": "30-45 (default: 40)",
            "RSI Exit": "55-70 (default: 60)"
        },
        "asset": "BTC/USDT",
        "timeframe": "1d",
        "definition_json": {
            "blocks": [
                {
                    "id": "stoch-1",
                    "type": "stochastic",
                    "label": "Stochastic (14, 3, 3)",
                    "position": {"x": 100, "y": 100},
                    "params": {"k_period": 14, "d_period": 3, "smooth": 3}
                },
                {
                    "id": "const-stoch-os",
                    "type": "constant",
                    "label": "Stoch Oversold (20)",
                    "position": {"x": 100, "y": 0},
                    "params": {"value": 20}
                },
                {
                    "id": "rsi-1",
                    "type": "rsi",
                    "label": "RSI (14)",
                    "position": {"x": 100, "y": 300},
                    "params": {"period": 14, "source": "close"}
                },
                {
                    "id": "const-rsi-os",
                    "type": "constant",
                    "label": "RSI Oversold (40)",
                    "position": {"x": 100, "y": 400},
                    "params": {"value": 40}
                },
                {
                    "id": "const-rsi-exit",
                    "type": "constant",
                    "label": "RSI Exit (60)",
                    "position": {"x": 100, "y": 500},
                    "params": {"value": 60}
                },
                {
                    "id": "compare-stoch",
                    "type": "compare",
                    "label": "%K < 20",
                    "position": {"x": 300, "y": 100},
                    "params": {"operator": "<"}
                },
                {
                    "id": "compare-rsi-entry",
                    "type": "compare",
                    "label": "RSI < 40",
                    "position": {"x": 300, "y": 300},
                    "params": {"operator": "<"}
                },
                {
                    "id": "and-entry",
                    "type": "and",
                    "label": "Both Oversold",
                    "position": {"x": 450, "y": 200},
                    "params": {}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 600, "y": 200},
                    "params": {}
                },
                {
                    "id": "compare-rsi-exit",
                    "type": "compare",
                    "label": "RSI > 60",
                    "position": {"x": 300, "y": 500},
                    "params": {"operator": ">"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 600, "y": 500},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "stoch-1", "port": "k"},
                    "to_port": {"block_id": "compare-stoch", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-stoch-os", "port": "output"},
                    "to_port": {"block_id": "compare-stoch", "port": "right"}
                },
                {
                    "from_port": {"block_id": "rsi-1", "port": "output"},
                    "to_port": {"block_id": "compare-rsi-entry", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-rsi-os", "port": "output"},
                    "to_port": {"block_id": "compare-rsi-entry", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-stoch", "port": "output"},
                    "to_port": {"block_id": "and-entry", "port": "a"}
                },
                {
                    "from_port": {"block_id": "compare-rsi-entry", "port": "output"},
                    "to_port": {"block_id": "and-entry", "port": "b"}
                },
                {
                    "from_port": {"block_id": "and-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "rsi-1", "port": "output"},
                    "to_port": {"block_id": "compare-rsi-exit", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-rsi-exit", "port": "output"},
                    "to_port": {"block_id": "compare-rsi-exit", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-rsi-exit", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    },
    # -------------------------------------------------------------------------
    # Module 3, Lesson 10 — Bollinger + RSI Reversal
    # -------------------------------------------------------------------------
    {
        "name": "Bollinger + RSI Reversal",
        "description": "Enter when price breaks below the lower Bollinger Band AND RSI is oversold. Exit when price recovers above the middle band.",
        "logic_summary": "Enters when price < Bollinger lower band AND RSI < 35; exits when price > Bollinger middle band",
        "teaches_description": "Bollinger Bands define volatility-adjusted price extremes; RSI confirms the momentum is truly exhausted. Requiring both removes many false signals that appear when only one fires. The exit at the middle band (SMA) turns the trade into a 'revert to mean' play — pay attention to how quickly price tends to return there.",
        "difficulty": "advanced",
        "sort_order": 10,
        "use_cases": [
            "High-confidence mean-reversion in volatile markets",
            "Learning how two different indicator families combine",
            "Studying how fast Bollinger bands adapt to volatility changes"
        ],
        "parameter_ranges": {
            "Bollinger Period": "15-25 (default: 20)",
            "Bollinger StdDev": "1.5-2.5 (default: 2.0)",
            "RSI Period": "10-20 (default: 14)",
            "RSI Oversold Threshold": "25-40 (default: 35)"
        },
        "asset": "BTC/USDT",
        "timeframe": "4h",
        "definition_json": {
            "blocks": [
                {
                    "id": "price-1",
                    "type": "price",
                    "label": "Close Price",
                    "position": {"x": 100, "y": 200},
                    "params": {"source": "close"}
                },
                {
                    "id": "bollinger-1",
                    "type": "bollinger",
                    "label": "Bollinger Bands (20, 2.0)",
                    "position": {"x": 100, "y": 350},
                    "params": {"period": 20, "std_dev": 2.0, "source": "close"}
                },
                {
                    "id": "rsi-1",
                    "type": "rsi",
                    "label": "RSI (14)",
                    "position": {"x": 100, "y": 50},
                    "params": {"period": 14, "source": "close"}
                },
                {
                    "id": "const-rsi-os",
                    "type": "constant",
                    "label": "RSI Oversold (35)",
                    "position": {"x": 100, "y": 0},
                    "params": {"value": 35}
                },
                {
                    "id": "compare-price-lower",
                    "type": "compare",
                    "label": "Price < Lower Band",
                    "position": {"x": 300, "y": 250},
                    "params": {"operator": "<"}
                },
                {
                    "id": "compare-rsi",
                    "type": "compare",
                    "label": "RSI < 35",
                    "position": {"x": 300, "y": 50},
                    "params": {"operator": "<"}
                },
                {
                    "id": "and-entry",
                    "type": "and",
                    "label": "Band + RSI",
                    "position": {"x": 450, "y": 150},
                    "params": {}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 600, "y": 150},
                    "params": {}
                },
                {
                    "id": "compare-price-middle",
                    "type": "compare",
                    "label": "Price > Middle Band",
                    "position": {"x": 300, "y": 450},
                    "params": {"operator": ">"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 600, "y": 450},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "price-1", "port": "output"},
                    "to_port": {"block_id": "compare-price-lower", "port": "left"}
                },
                {
                    "from_port": {"block_id": "bollinger-1", "port": "lower"},
                    "to_port": {"block_id": "compare-price-lower", "port": "right"}
                },
                {
                    "from_port": {"block_id": "rsi-1", "port": "output"},
                    "to_port": {"block_id": "compare-rsi", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-rsi-os", "port": "output"},
                    "to_port": {"block_id": "compare-rsi", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-price-lower", "port": "output"},
                    "to_port": {"block_id": "and-entry", "port": "a"}
                },
                {
                    "from_port": {"block_id": "compare-rsi", "port": "output"},
                    "to_port": {"block_id": "and-entry", "port": "b"}
                },
                {
                    "from_port": {"block_id": "and-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "price-1", "port": "output"},
                    "to_port": {"block_id": "compare-price-middle", "port": "left"}
                },
                {
                    "from_port": {"block_id": "bollinger-1", "port": "middle"},
                    "to_port": {"block_id": "compare-price-middle", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-price-middle", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    },
    # -------------------------------------------------------------------------
    # Module 3, Lesson 11 — EMA + RSI Confirmation
    # -------------------------------------------------------------------------
    {
        "name": "EMA + RSI Confirmation",
        "description": "Enter when the fast EMA crosses above the slow EMA AND RSI is below 60 (not yet overbought). Exit when RSI exceeds 70.",
        "logic_summary": "Enters when EMA(9) crosses above EMA(21) AND RSI(14) < 60; exits when RSI > 70",
        "teaches_description": "Adding an RSI filter to a crossover system prevents entering when a trend is already overextended. This lesson shows how a momentum gate can improve a trend entry — but also how it sometimes causes you to miss a valid crossover that fires near an overbought reading. The trade-off is yours to measure.",
        "difficulty": "advanced",
        "sort_order": 11,
        "use_cases": [
            "Trend entries that avoid overbought conditions",
            "Learning how AND filters reduce signal count",
            "Hybrid oscillator + trend systems"
        ],
        "parameter_ranges": {
            "Fast EMA": "7-12 (default: 9)",
            "Slow EMA": "18-26 (default: 21)",
            "RSI Period": "10-20 (default: 14)",
            "RSI Entry Cap": "55-65 (default: 60)",
            "RSI Exit": "65-75 (default: 70)"
        },
        "asset": "ETH/USDT",
        "timeframe": "1d",
        "definition_json": {
            "blocks": [
                {
                    "id": "ema-fast",
                    "type": "ema",
                    "label": "Fast EMA (9)",
                    "position": {"x": 100, "y": 100},
                    "params": {"period": 9, "source": "close"}
                },
                {
                    "id": "ema-slow",
                    "type": "ema",
                    "label": "Slow EMA (21)",
                    "position": {"x": 100, "y": 250},
                    "params": {"period": 21, "source": "close"}
                },
                {
                    "id": "rsi-1",
                    "type": "rsi",
                    "label": "RSI (14)",
                    "position": {"x": 100, "y": 400},
                    "params": {"period": 14, "source": "close"}
                },
                {
                    "id": "const-rsi-cap",
                    "type": "constant",
                    "label": "RSI Cap (60)",
                    "position": {"x": 100, "y": 500},
                    "params": {"value": 60}
                },
                {
                    "id": "const-rsi-exit",
                    "type": "constant",
                    "label": "RSI Exit (70)",
                    "position": {"x": 100, "y": 600},
                    "params": {"value": 70}
                },
                {
                    "id": "crossover-entry",
                    "type": "crossover",
                    "label": "EMA Cross Up",
                    "position": {"x": 300, "y": 150},
                    "params": {"direction": "crosses_above"}
                },
                {
                    "id": "compare-rsi-entry",
                    "type": "compare",
                    "label": "RSI < 60",
                    "position": {"x": 300, "y": 450},
                    "params": {"operator": "<"}
                },
                {
                    "id": "and-entry",
                    "type": "and",
                    "label": "Cross + RSI OK",
                    "position": {"x": 450, "y": 300},
                    "params": {}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 600, "y": 300},
                    "params": {}
                },
                {
                    "id": "compare-rsi-exit",
                    "type": "compare",
                    "label": "RSI > 70",
                    "position": {"x": 300, "y": 600},
                    "params": {"operator": ">"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 600, "y": 600},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "ema-fast", "port": "output"},
                    "to_port": {"block_id": "crossover-entry", "port": "fast"}
                },
                {
                    "from_port": {"block_id": "ema-slow", "port": "output"},
                    "to_port": {"block_id": "crossover-entry", "port": "slow"}
                },
                {
                    "from_port": {"block_id": "crossover-entry", "port": "output"},
                    "to_port": {"block_id": "and-entry", "port": "a"}
                },
                {
                    "from_port": {"block_id": "rsi-1", "port": "output"},
                    "to_port": {"block_id": "compare-rsi-entry", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-rsi-cap", "port": "output"},
                    "to_port": {"block_id": "compare-rsi-entry", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-rsi-entry", "port": "output"},
                    "to_port": {"block_id": "and-entry", "port": "b"}
                },
                {
                    "from_port": {"block_id": "and-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "rsi-1", "port": "output"},
                    "to_port": {"block_id": "compare-rsi-exit", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-rsi-exit", "port": "output"},
                    "to_port": {"block_id": "compare-rsi-exit", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-rsi-exit", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    },
    # -------------------------------------------------------------------------
    # Module 3, Lesson 12 — MACD + ADX Dual Filter
    # -------------------------------------------------------------------------
    {
        "name": "MACD + ADX Dual Filter",
        "description": "Enter when MACD histogram is positive AND the ADX confirms a strong trend above 25. Exit when MACD histogram turns negative.",
        "logic_summary": "Enters when MACD histogram > 0 AND ADX > 25 (momentum in a trending market); exits when MACD histogram < 0",
        "teaches_description": "MACD catches momentum shifts; ADX tells you whether the market is actually trending strongly enough to trust them. Together they aim for a rare event: real momentum inside a genuine trend. The trade count will be low — use this lesson to study precision over frequency, and to see which condition filters out more trades.",
        "difficulty": "advanced",
        "sort_order": 12,
        "use_cases": [
            "High-precision trend + momentum entry filter",
            "Studying indicator agreement in trending vs choppy markets",
            "Building multi-indicator confirmation systems"
        ],
        "parameter_ranges": {
            "MACD Fast": "8-16 (default: 12)",
            "MACD Slow": "20-30 (default: 26)",
            "MACD Signal": "7-12 (default: 9)",
            "ADX Period": "10-20 (default: 14)",
            "ADX Trend Threshold": "20-30 (default: 25)"
        },
        "asset": "BTC/USDT",
        "timeframe": "1d",
        "definition_json": {
            "blocks": [
                {
                    "id": "macd-1",
                    "type": "macd",
                    "label": "MACD (12, 26, 9)",
                    "position": {"x": 100, "y": 100},
                    "params": {"source": "close", "fast_period": 12, "slow_period": 26, "signal_period": 9}
                },
                {
                    "id": "adx-1",
                    "type": "adx",
                    "label": "ADX (14)",
                    "position": {"x": 100, "y": 300},
                    "params": {"period": 14}
                },
                {
                    "id": "const-zero",
                    "type": "constant",
                    "label": "Zero",
                    "position": {"x": 100, "y": 200},
                    "params": {"value": 0}
                },
                {
                    "id": "const-adx-thr",
                    "type": "constant",
                    "label": "ADX Threshold (25)",
                    "position": {"x": 100, "y": 400},
                    "params": {"value": 25}
                },
                {
                    "id": "compare-macd-pos",
                    "type": "compare",
                    "label": "Histogram > 0",
                    "position": {"x": 300, "y": 100},
                    "params": {"operator": ">"}
                },
                {
                    "id": "compare-adx",
                    "type": "compare",
                    "label": "ADX > 25",
                    "position": {"x": 300, "y": 350},
                    "params": {"operator": ">"}
                },
                {
                    "id": "and-entry",
                    "type": "and",
                    "label": "MACD + ADX",
                    "position": {"x": 450, "y": 225},
                    "params": {}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 600, "y": 225},
                    "params": {}
                },
                {
                    "id": "compare-macd-neg",
                    "type": "compare",
                    "label": "Histogram < 0",
                    "position": {"x": 300, "y": 500},
                    "params": {"operator": "<"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 600, "y": 500},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "macd-1", "port": "histogram"},
                    "to_port": {"block_id": "compare-macd-pos", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-zero", "port": "output"},
                    "to_port": {"block_id": "compare-macd-pos", "port": "right"}
                },
                {
                    "from_port": {"block_id": "adx-1", "port": "adx"},
                    "to_port": {"block_id": "compare-adx", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-adx-thr", "port": "output"},
                    "to_port": {"block_id": "compare-adx", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-macd-pos", "port": "output"},
                    "to_port": {"block_id": "and-entry", "port": "a"}
                },
                {
                    "from_port": {"block_id": "compare-adx", "port": "output"},
                    "to_port": {"block_id": "and-entry", "port": "b"}
                },
                {
                    "from_port": {"block_id": "and-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "macd-1", "port": "histogram"},
                    "to_port": {"block_id": "compare-macd-neg", "port": "left"}
                },
                {
                    "from_port": {"block_id": "const-zero", "port": "output"},
                    "to_port": {"block_id": "compare-macd-neg", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-macd-neg", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    },
    {
        "name": "Bollinger Breakout",
        "description": "Buy when price breaks above upper Bollinger Band, sell when it crosses back below the middle band. Momentum/breakout strategy.",
        "logic_summary": "Enters on upper band breakout (volatility expansion), exits on return to middle band",
        "teaches_description": "Explore how Bollinger Bands measure volatility and how breakouts above the bands can signal strong momentum moves.",
        "difficulty": "intermediate",
        "sort_order": 3,
        "use_cases": [
            "Volatility breakouts in consolidating markets",
            "Momentum trading during high-volume periods",
            "Works on 4-hour timeframe for active trading"
        ],
        "parameter_ranges": {
            "Bollinger Period": "15-30 (default: 20)",
            "Bollinger StdDev": "1.5-2.5 (default: 2.0)",
            "Entry": "Price > Upper Band",
            "Exit": "Price < Middle Band"
        },
        "asset": "BTC/USDT",
        "timeframe": "4h",
        "definition_json": {
            "blocks": [
                {
                    "id": "price-1",
                    "type": "price",
                    "label": "Close Price",
                    "position": {"x": 100, "y": 200},
                    "params": {"source": "close"}
                },
                {
                    "id": "bollinger-1",
                    "type": "bollinger",
                    "label": "Bollinger Bands (20, 2.0)",
                    "position": {"x": 100, "y": 350},
                    "params": {"period": 20, "std_dev": 2.0, "source": "close"}
                },
                {
                    "id": "compare-entry",
                    "type": "compare",
                    "label": "Price > Upper",
                    "position": {"x": 300, "y": 150},
                    "params": {"operator": ">"}
                },
                {
                    "id": "entry-1",
                    "type": "entry_signal",
                    "label": "Entry Signal",
                    "position": {"x": 500, "y": 150},
                    "params": {}
                },
                {
                    "id": "compare-exit",
                    "type": "compare",
                    "label": "Price < Middle",
                    "position": {"x": 300, "y": 350},
                    "params": {"operator": "<"}
                },
                {
                    "id": "exit-1",
                    "type": "exit_signal",
                    "label": "Exit Signal",
                    "position": {"x": 500, "y": 350},
                    "params": {}
                }
            ],
            "connections": [
                {
                    "from_port": {"block_id": "price-1", "port": "output"},
                    "to_port": {"block_id": "compare-entry", "port": "left"}
                },
                {
                    "from_port": {"block_id": "bollinger-1", "port": "upper"},
                    "to_port": {"block_id": "compare-entry", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-entry", "port": "output"},
                    "to_port": {"block_id": "entry-1", "port": "signal"}
                },
                {
                    "from_port": {"block_id": "price-1", "port": "output"},
                    "to_port": {"block_id": "compare-exit", "port": "left"}
                },
                {
                    "from_port": {"block_id": "bollinger-1", "port": "middle"},
                    "to_port": {"block_id": "compare-exit", "port": "right"}
                },
                {
                    "from_port": {"block_id": "compare-exit", "port": "output"},
                    "to_port": {"block_id": "exit-1", "port": "signal"}
                }
            ],
            "meta": {}
        }
    }
]
