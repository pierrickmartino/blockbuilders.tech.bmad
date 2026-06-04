import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hasBlocks,
  resolveBuilderDefinition,
  type BuilderLoadDeps,
} from "@/lib/strategy-builder-load";

const STRATEGY_ID = "strat-1";
const NON_EMPTY = { blocks: [{ id: "b1" }], connections: [], meta: {} };
const EMPTY = { blocks: [], connections: [], meta: {} };

function makeDeps(overrides: Partial<BuilderLoadDeps> = {}): BuilderLoadDeps {
  return {
    getDraft: vi.fn(async () => ({ definition_json: EMPTY })),
    listVersions: vi.fn(async () => []),
    getVersionDetail: vi.fn(async () => ({ definition_json: EMPTY })),
    putDraft: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("hasBlocks", () => {
  it("returns true when the definition has at least one block", () => {
    expect(hasBlocks(NON_EMPTY as never)).toBe(true);
  });

  it("returns false for empty, null, or undefined definitions", () => {
    expect(hasBlocks(EMPTY as never)).toBe(false);
    expect(hasBlocks(null)).toBe(false);
    expect(hasBlocks(undefined)).toBe(false);
  });
});

describe("resolveBuilderDefinition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the draft definition without fetching versions when the draft has blocks", async () => {
    const deps = makeDeps({
      getDraft: vi.fn(async () => ({ definition_json: NON_EMPTY })),
    });

    const result = await resolveBuilderDefinition(STRATEGY_ID, deps);

    expect(result).toBe(NON_EMPTY);
    expect(deps.listVersions).not.toHaveBeenCalled();
    expect(deps.putDraft).not.toHaveBeenCalled();
  });

  it("falls back to the latest version and seeds the draft when the draft is blank", async () => {
    const deps = makeDeps({
      getDraft: vi.fn(async () => ({ definition_json: EMPTY })),
      listVersions: vi.fn(async () => [{ version_number: 3 }, { version_number: 2 }]),
      getVersionDetail: vi.fn(async () => ({ definition_json: NON_EMPTY })),
    });

    const result = await resolveBuilderDefinition(STRATEGY_ID, deps);

    expect(result).toBe(NON_EMPTY);
    // Latest version (highest, listed first) is used.
    expect(deps.getVersionDetail).toHaveBeenCalledWith(STRATEGY_ID, 3);
    // Draft is seeded with the recovered definition (self-healing).
    expect(deps.putDraft).toHaveBeenCalledWith(STRATEGY_ID, NON_EMPTY);
  });

  it("returns the blank draft (no seeding) for a brand-new strategy with no versions", async () => {
    const deps = makeDeps({
      getDraft: vi.fn(async () => ({ definition_json: EMPTY })),
      listVersions: vi.fn(async () => []),
    });

    const result = await resolveBuilderDefinition(STRATEGY_ID, deps);

    expect(result).toBe(EMPTY);
    expect(deps.getVersionDetail).not.toHaveBeenCalled();
    expect(deps.putDraft).not.toHaveBeenCalled();
  });

  it("does not seed when the latest version is itself empty", async () => {
    const deps = makeDeps({
      getDraft: vi.fn(async () => ({ definition_json: EMPTY })),
      listVersions: vi.fn(async () => [{ version_number: 1 }]),
      getVersionDetail: vi.fn(async () => ({ definition_json: EMPTY })),
    });

    const result = await resolveBuilderDefinition(STRATEGY_ID, deps);

    expect(result).toBe(EMPTY);
    expect(deps.putDraft).not.toHaveBeenCalled();
  });

  it("recovers to the draft definition when version lookup throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = makeDeps({
      getDraft: vi.fn(async () => ({ definition_json: EMPTY })),
      listVersions: vi.fn(async () => {
        throw new Error("network");
      }),
    });

    const result = await resolveBuilderDefinition(STRATEGY_ID, deps);

    expect(result).toBe(EMPTY);
    expect(deps.putDraft).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
