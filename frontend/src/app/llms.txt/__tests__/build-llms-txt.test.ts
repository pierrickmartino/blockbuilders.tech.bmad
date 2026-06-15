import { describe, it, expect } from "vitest";
import { buildLlmsTxt } from "../build-llms-txt";

describe("buildLlmsTxt", () => {
  const origin = "https://app.blockbuilders.tech";

  it("starts with the product name as an H1 heading", () => {
    const output = buildLlmsTxt(origin);

    expect(output).toMatch(/^# Blockbuilders\b/);
  });

  it("states the trust invariants so an assistant cannot misrepresent the product", () => {
    const output = buildLlmsTxt(origin);

    expect(output).toMatch(/signals-only/i);
    expect(output).toMatch(/never takes custody/i);
    expect(output).toMatch(/never trades/i);
    expect(output).toMatch(/OHLCV/);
    expect(output).toMatch(/no look-ahead/i);
    expect(output).toMatch(/next-candle-open/i);
  });

  it("links the landing page and methodology page as absolute URLs derived from the origin", () => {
    const output = buildLlmsTxt(origin);

    expect(output).toMatch(/^## Docs$/m);
    expect(output).toContain(`(${origin}/)`);
    expect(output).toContain(`(${origin}/how-backtests-work)`);
  });

  it("excludes auth-gated surfaces and any sign-in CTA", () => {
    const output = buildLlmsTxt(origin);

    expect(output).not.toContain("/metrics-glossary");
    expect(output).not.toContain("/strategy-guide");
    expect(output).not.toContain("/login");
  });
});
