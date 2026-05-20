import { describe, it, expect } from "vitest";
import { computePaletteInsertPosition, POSITION_JITTER_PX } from "../palette-position";

const JITTER = POSITION_JITTER_PX;

describe("computePaletteInsertPosition", () => {
  const stubScreenToFlow = (screenPt: { x: number; y: number }) => ({
    x: screenPt.x * 2,
    y: screenPt.y * 2,
  });

  it("returns a position within jitter envelope of the viewport centre in flow coords", () => {
    const screenCenter = { x: 600, y: 400 };
    const expectedFlow = stubScreenToFlow(screenCenter);

    const result = computePaletteInsertPosition(stubScreenToFlow, screenCenter);

    expect(result.x).toBeGreaterThanOrEqual(expectedFlow.x - JITTER);
    expect(result.x).toBeLessThanOrEqual(expectedFlow.x + JITTER);
    expect(result.y).toBeGreaterThanOrEqual(expectedFlow.y - JITTER);
    expect(result.y).toBeLessThanOrEqual(expectedFlow.y + JITTER);
  });

  it("passes screen centre to screenToFlowPosition", () => {
    const calls: { x: number; y: number }[] = [];
    const spy = (pt: { x: number; y: number }) => {
      calls.push(pt);
      return { x: pt.x, y: pt.y };
    };

    const screenCenter = { x: 320, y: 240 };
    computePaletteInsertPosition(spy, screenCenter);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(screenCenter);
  });

  it("applies independent jitter on x and y axes", () => {
    const screenCenter = { x: 0, y: 0 };
    const identity = (pt: { x: number; y: number }) => pt;

    const positions = Array.from({ length: 50 }, () =>
      computePaletteInsertPosition(identity, screenCenter)
    );

    const uniqueX = new Set(positions.map((p) => p.x)).size;
    const uniqueY = new Set(positions.map((p) => p.y)).size;

    expect(uniqueX).toBeGreaterThan(1);
    expect(uniqueY).toBeGreaterThan(1);
  });

  it("bounds jitter to ±POSITION_JITTER_PX on both axes", () => {
    const screenCenter = { x: 100, y: 100 };
    const identity = (pt: { x: number; y: number }) => pt;

    for (let i = 0; i < 200; i++) {
      const result = computePaletteInsertPosition(identity, screenCenter);
      expect(Math.abs(result.x - screenCenter.x)).toBeLessThanOrEqual(JITTER);
      expect(Math.abs(result.y - screenCenter.y)).toBeLessThanOrEqual(JITTER);
    }
  });
});
