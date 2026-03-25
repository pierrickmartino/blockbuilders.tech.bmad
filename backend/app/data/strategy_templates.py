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
