import { describe, it, expect } from "vitest";
import { getFeltDollarDelta } from "@/lib/felt-delta";

describe("getFeltDollarDelta", () => {
  it("returns null when the delta is within the small band (|delta| < 1)", () => {
    expect(getFeltDollarDelta(10.0, 10.5, 10_000)).toBeNull();
  });

  it("returns 'made you $X more' (positive) when strategy is up and beat the hold", () => {
    expect(getFeltDollarDelta(15.0, 10.0, 10_000)).toEqual({
      amountUsd: "$500",
      direction: "positive",
      phrasing: "made you {amount} more than simply holding",
    });
  });

  it("returns 'cost you $X versus' (negative) when strategy is up but lagged the hold", () => {
    expect(getFeltDollarDelta(5.0, 20.0, 10_000)).toEqual({
      amountUsd: "$1,500",
      direction: "negative",
      phrasing: "cost you {amount} versus simply holding",
    });
  });

  it("returns 'saved you $X' (positive) when strategy is down but lost less than the hold", () => {
    expect(getFeltDollarDelta(-10.0, -30.0, 10_000)).toEqual({
      amountUsd: "$2,000",
      direction: "positive",
      phrasing: "saved you {amount} — it lost less than holding would have",
    });
  });

  it("returns 'cost you $X more' (negative) when strategy is down and lost more than the hold", () => {
    expect(getFeltDollarDelta(-10.0, 5.0, 10_000)).toEqual({
      amountUsd: "$1,500",
      direction: "negative",
      phrasing: "cost you {amount} more than simply holding",
    });
  });

  it("treats a delta exactly at the 1-point boundary as outside the small band", () => {
    expect(getFeltDollarDelta(11.0, 10.0, 10_000)).toEqual({
      amountUsd: "$100",
      direction: "positive",
      phrasing: "made you {amount} more than simply holding",
    });
  });
});
