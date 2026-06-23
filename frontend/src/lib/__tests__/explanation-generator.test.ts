import { describe, it, expect } from "vitest";
import { generateExplanation } from "../explanation-generator";
import type { StrategyDefinition } from "@/types/canvas";

// ── helpers ──────────────────────────────────────────────────────────────────

function entry(blockId: string, sourceBlockId: string, sourcePort = "output") {
  return {
    id: `conn-entry-${blockId}`,
    from_port: { block_id: sourceBlockId, port: sourcePort },
    to_port: { block_id: blockId, port: "signal" },
  };
}

function conn(fromId: string, fromPort: string, toId: string, toPort: string) {
  return {
    id: `conn-${fromId}-${fromPort}-${toId}-${toPort}`,
    from_port: { block_id: fromId, port: fromPort },
    to_port: { block_id: toId, port: toPort },
  };
}

function block(id: string, type: string, params: Record<string, unknown> = {}) {
  return { id, type, params, position: { x: 0, y: 0 } };
}

// ── Cycle 1: price block renders source explicitly (intentional delta) ────────

describe("price block — intentional wording change", () => {
  it("renders close source as 'close price'", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("price-1", "price", { source: "close" }),
        block("cmp-1", "compare", { operator: ">" }),
        block("sma-1", "sma", { period: 20 }),
        block("entry-1", "entry_signal"),
        block("exit-1", "exit_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("price-1", "output", "cmp-1", "left"),
        conn("sma-1", "output", "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
        conn("cmp-1", "output", "exit-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.status).toBe("valid");
    expect(result.entry).toBe(
      "This strategy enters long when close price is above the 20-day SMA."
    );
  });

  it("renders open source as 'open price'", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("price-1", "price", { source: "open" }),
        block("cmp-1", "compare", { operator: ">" }),
        block("sma-1", "sma", { period: 10 }),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("price-1", "output", "cmp-1", "left"),
        conn("sma-1", "output", "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.entry).toContain("open price is above the 10-day SMA");
  });
});

// ── Cycle 2: single-output indicators ────────────────────────────────────────

describe("single-output indicators", () => {
  function makeSimpleCompareEntry(
    indicatorBlock: ReturnType<typeof block>,
    indicatorPort = "output"
  ): StrategyDefinition {
    return {
      blocks: [
        block("price-1", "price", { source: "close" }),
        indicatorBlock,
        block("cmp-1", "compare", { operator: ">" }),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("price-1", "output", "cmp-1", "left"),
        conn(indicatorBlock.id, indicatorPort, "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
      ],
    };
  }

  it("formats SMA with period param", () => {
    const def = makeSimpleCompareEntry(block("sma-1", "sma", { period: 14 }));
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when close price is above the 14-day SMA."
    );
  });

  it("formats EMA with period param", () => {
    const def = makeSimpleCompareEntry(block("ema-1", "ema", { period: 9 }));
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when close price is above the 9-day EMA."
    );
  });

  it("formats RSI with period param", () => {
    const def = makeSimpleCompareEntry(
      block("rsi-1", "rsi", { period: 14 }),
      "output"
    );
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when close price is above RSI(14)."
    );
  });

  it("formats ATR with period param", () => {
    const def = makeSimpleCompareEntry(block("atr-1", "atr", { period: 14 }));
    const result = generateExplanation(def);
    expect(result.entry).toContain("ATR(14)");
  });

  it("formats OBV (no params)", () => {
    const def = makeSimpleCompareEntry(block("obv-1", "obv", {}));
    const result = generateExplanation(def);
    expect(result.entry).toContain("OBV");
  });

  it("formats volume source (no params)", () => {
    const def = makeSimpleCompareEntry(block("vol-1", "volume", {}));
    const result = generateExplanation(def);
    expect(result.entry).toContain("volume");
  });

  it("formats constant with value param", () => {
    const def = makeSimpleCompareEntry(block("c-1", "constant", { value: 30 }));
    const result = generateExplanation(def);
    expect(result.entry).toContain("30");
  });

  it("formats yesterday's close (no params)", () => {
    const def = makeSimpleCompareEntry(block("yc-1", "yesterday_close", {}));
    const result = generateExplanation(def);
    expect(result.entry).toContain("yesterday's close");
  });

  it("formats price variation % (no params)", () => {
    const def = makeSimpleCompareEntry(
      block("pv-1", "price_variation_pct", {})
    );
    const result = generateExplanation(def);
    expect(result.entry).toContain("price variation %");
  });

  it("uses catalogue default period when param is absent from stored block", () => {
    const def = makeSimpleCompareEntry(block("sma-1", "sma", {}));
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when close price is above the 20-day SMA."
    );
  });
});

// ── Cycle 3: multi-output indicators ─────────────────────────────────────────

describe("multi-output indicators", () => {
  it("formats MACD line port", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("macd-1", "macd", { fast_period: 12, slow_period: 26, signal_period: 9 }),
        block("c-1", "constant", { value: 0 }),
        block("cmp-1", "compare", { operator: ">" }),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("macd-1", "macd", "cmp-1", "left"),
        conn("c-1", "output", "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when MACD(12,26,9) is above 0."
    );
  });

  it("formats MACD signal port", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("macd-1", "macd", { fast_period: 12, slow_period: 26, signal_period: 9 }),
        block("c-1", "constant", { value: 0 }),
        block("cmp-1", "compare", { operator: ">" }),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("macd-1", "signal", "cmp-1", "left"),
        conn("c-1", "output", "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when MACD signal(12,26,9) is above 0."
    );
  });

  it("formats MACD histogram port", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("macd-1", "macd", { fast_period: 12, slow_period: 26, signal_period: 9 }),
        block("c-1", "constant", { value: 0 }),
        block("cmp-1", "compare", { operator: ">" }),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("macd-1", "histogram", "cmp-1", "left"),
        conn("c-1", "output", "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when MACD histogram(12,26,9) is above 0."
    );
  });

  it("formats Bollinger upper band", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("price-1", "price", { source: "close" }),
        block("bb-1", "bollinger", { period: 20 }),
        block("cmp-1", "compare", { operator: ">" }),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("price-1", "output", "cmp-1", "left"),
        conn("bb-1", "upper", "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when close price is above upper Bollinger Band (20)."
    );
  });

  it("formats Bollinger lower band", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("price-1", "price", { source: "close" }),
        block("bb-1", "bollinger", { period: 20 }),
        block("cmp-1", "compare", { operator: "<" }),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("price-1", "output", "cmp-1", "left"),
        conn("bb-1", "lower", "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when close price is below lower Bollinger Band (20)."
    );
  });

  it("formats ADX adx port", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("adx-1", "adx", { period: 14 }),
        block("c-1", "constant", { value: 25 }),
        block("cmp-1", "compare", { operator: ">" }),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("adx-1", "adx", "cmp-1", "left"),
        conn("c-1", "output", "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when ADX(14) is above 25."
    );
  });

  it("formats Stochastic %K port", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("stoch-1", "stochastic", { k_period: 14, d_period: 3, smooth: 3 }),
        block("c-1", "constant", { value: 20 }),
        block("cmp-1", "compare", { operator: "<" }),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("stoch-1", "k", "cmp-1", "left"),
        conn("c-1", "output", "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when Stochastic %K(14,3,3) is below 20."
    );
  });

  it("formats Fibonacci 61.8% level port", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("price-1", "price", { source: "close" }),
        block("fib-1", "fibonacci", { lookback: 50 }),
        block("cmp-1", "compare", { operator: ">" }),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("price-1", "output", "cmp-1", "left"),
        conn("fib-1", "level_618", "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when close price is above Fib 61.8%(50)."
    );
  });
});

// ── Cycle 4: graph composition (unchanged logic blocks) ───────────────────────

describe("graph composition — logic blocks unchanged", () => {
  it("AND block combines two conditions", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("price-1", "price", { source: "close" }),
        block("sma-1", "sma", { period: 20 }),
        block("rsi-1", "rsi", { period: 14 }),
        block("cmp-1", "compare", { operator: ">" }),
        block("cmp-2", "compare", { operator: "<" }),
        block("and-1", "and", {}),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
        block("c-1", "constant", { value: 70 }),
      ],
      connections: [
        conn("price-1", "output", "cmp-1", "left"),
        conn("sma-1", "output", "cmp-1", "right"),
        conn("rsi-1", "output", "cmp-2", "left"),
        conn("c-1", "output", "cmp-2", "right"),
        conn("cmp-1", "output", "and-1", "a"),
        conn("cmp-2", "output", "and-1", "b"),
        conn("and-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.status).toBe("valid");
    expect(result.entry).toBe(
      "This strategy enters long when close price is above the 20-day SMA and RSI(14) is below 70."
    );
  });

  it("crossover entry generates correct phrase", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("sma-1", "sma", { period: 10 }),
        block("sma-2", "sma", { period: 20 }),
        block("xover-1", "crossover", { direction: "crosses_above" }),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("sma-1", "output", "xover-1", "fast"),
        conn("sma-2", "output", "xover-1", "slow"),
        conn("xover-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when the 10-day SMA crosses above the 20-day SMA."
    );
  });

  it("NOT block wraps its child phrase", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("price-1", "price", { source: "close" }),
        block("sma-1", "sma", { period: 20 }),
        block("cmp-1", "compare", { operator: ">" }),
        block("not-1", "not", {}),
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [
        conn("price-1", "output", "cmp-1", "left"),
        conn("sma-1", "output", "cmp-1", "right"),
        conn("cmp-1", "output", "not-1", "input"),
        conn("not-1", "output", "entry-1", "signal"),
      ],
    };
    const result = generateExplanation(def);
    expect(result.entry).toBe(
      "This strategy enters long when not (close price is above the 20-day SMA)."
    );
  });
});

// ── Cycle 5: risk exit blocks (unchanged, inline-configured) ─────────────────

describe("risk exit blocks remain client-formatted", () => {
  function makeRiskOnlyStrategy(riskBlock: ReturnType<typeof block>): StrategyDefinition {
    return {
      blocks: [
        block("price-1", "price", { source: "close" }),
        block("sma-1", "sma", { period: 20 }),
        block("cmp-1", "compare", { operator: ">" }),
        block("entry-1", "entry_signal"),
        riskBlock,
      ],
      connections: [
        conn("price-1", "output", "cmp-1", "left"),
        conn("sma-1", "output", "cmp-1", "right"),
        conn("cmp-1", "output", "entry-1", "signal"),
      ],
    };
  }

  it("stop_loss exit", () => {
    const result = generateExplanation(
      makeRiskOnlyStrategy(block("sl-1", "stop_loss", { stop_loss_pct: 5 }))
    );
    expect(result.exit).toBe("It exits when a stop loss of 5% is hit.");
  });

  it("take_profit exit", () => {
    const result = generateExplanation(
      makeRiskOnlyStrategy(
        block("tp-1", "take_profit", {
          levels: [{ profit_pct: 10, close_pct: 100 }],
        })
      )
    );
    expect(result.exit).toBe("It exits when take profit at 10%.");
  });

  it("trailing_stop exit", () => {
    const result = generateExplanation(
      makeRiskOnlyStrategy(
        block("ts-1", "trailing_stop", { trail_pct: 3 })
      )
    );
    expect(result.exit).toBe("It exits when a trailing stop of 3% is hit.");
  });

  it("time_exit exit", () => {
    const result = generateExplanation(
      makeRiskOnlyStrategy(block("te-1", "time_exit", { bars: 10 }))
    );
    expect(result.exit).toBe("It exits when after 10 bars in a trade.");
  });

  it("max_drawdown exit", () => {
    const result = generateExplanation(
      makeRiskOnlyStrategy(
        block("md-1", "max_drawdown", { max_drawdown_pct: 15 })
      )
    );
    expect(result.exit).toBe(
      "It exits when max drawdown of 15% is reached."
    );
  });
});

// ── Cycle 6: fallback paths ───────────────────────────────────────────────────

describe("fallback paths", () => {
  it("returns fallback when entry block is missing", () => {
    const def: StrategyDefinition = {
      blocks: [block("sl-1", "stop_loss", { stop_loss_pct: 5 })],
      connections: [],
    };
    const result = generateExplanation(def);
    expect(result.status).toBe("fallback");
  });

  it("returns 'an unspecified condition' when connection is missing", () => {
    const def: StrategyDefinition = {
      blocks: [
        block("entry-1", "entry_signal"),
        block("sl-1", "stop_loss", { stop_loss_pct: 5 }),
      ],
      connections: [],
    };
    const result = generateExplanation(def);
    expect(result.entry).toContain("an unspecified condition");
  });
});
