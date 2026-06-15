import { describe, it, expect } from "vitest";
import { buildEquitySparklinePath } from "../build-equity-sparkline-path";
import type { EquityCurvePoint } from "@/types/backtest";

const DIMENSIONS = { width: 200, height: 100 };

function makeCurve(equities: number[]): EquityCurvePoint[] {
  return equities.map((equity, index) => ({
    timestamp: `2025-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
    equity,
  }));
}

describe("buildEquitySparklinePath", () => {
  it("returns no path for an empty equity curve", () => {
    const path = buildEquitySparklinePath([], DIMENSIONS);

    expect(path).toBe("");
  });

  it("renders a flat midline for a single-point curve without crashing", () => {
    const path = buildEquitySparklinePath(makeCurve([10000]), DIMENSIONS);

    expect(path).toBe("M0.00,50.00 L200.00,50.00");
  });

  it("maps coordinates monotonically within the given dimensions", () => {
    const path = buildEquitySparklinePath(
      makeCurve([10000, 9000, 11000, 12000]),
      DIMENSIONS
    );
    const commands = path.split(" ");

    expect(commands).toHaveLength(4);
    expect(commands[0]).toBe("M0.00,66.67");
    expect(commands[1]).toBe("L66.67,100.00");
    expect(commands[2]).toBe("L133.33,33.33");
    expect(commands[3]).toBe("L200.00,0.00");

    // x increases monotonically across the curve
    const xs = commands.map((c) => parseFloat(c.slice(1).split(",")[0]));
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    }

    // y stays within the drawable height
    const ys = commands.map((c) => parseFloat(c.slice(1).split(",")[1]));
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(DIMENSIONS.height);
    }
  });

  it("downsamples an oversized curve to the target point budget", () => {
    const equities = Array.from({ length: 500 }, (_, i) => 10000 + i);
    const path = buildEquitySparklinePath(makeCurve(equities), DIMENSIONS);
    const commands = path.split(" ");

    expect(commands).toHaveLength(60);
    expect(commands[0]).toMatch(/^M0\.00,/);
    expect(commands[59]).toMatch(/^L200\.00,/);
  });
});
