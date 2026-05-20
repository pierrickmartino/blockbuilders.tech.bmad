import { describe, it, expect } from "vitest";
import { buildCommandList } from "../palette-commands";
import { BLOCK_REGISTRY, PLAIN_LABEL_MAP } from "@/types/canvas";
import type { BlockType } from "@/types/canvas";

const FULL_REGISTRY = BLOCK_REGISTRY;
const EMPTY: BlockType[] = [];

describe("buildCommandList", () => {
  describe("browse mode (empty query)", () => {
    it("returns 5 category groups when there are no recents or favorites", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: EMPTY,
        favorites: EMPTY,
        query: "",
      });

      const labels = groups.map((g) => g.groupLabel);
      expect(labels).toContain("Data");
      expect(labels).toContain("Indicators");
      expect(labels).toContain("Logic");
      expect(labels).toContain("Signals");
      expect(labels).toContain("Risk");
      expect(groups).toHaveLength(5);
    });

    it("prepends a Recents group (capped at 5) when query is empty", () => {
      const recents: BlockType[] = ["sma", "ema", "rsi", "macd", "bollinger", "atr", "price"];
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents,
        favorites: EMPTY,
        query: "",
      });

      const recentsGroup = groups.find((g) => g.groupLabel === "Recents");
      expect(recentsGroup).toBeDefined();
      expect(recentsGroup!.commands).toHaveLength(5);
      expect(recentsGroup!.commands[0].blockType).toBe("sma");
    });

    it("prepends a Favourites group when query is empty", () => {
      const favorites: BlockType[] = ["rsi", "price"];
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: EMPTY,
        favorites,
        query: "",
      });

      const favsGroup = groups.find((g) => g.groupLabel === "Favourites");
      expect(favsGroup).toBeDefined();
      expect(favsGroup!.commands).toHaveLength(2);
    });

    it("does not add Recents group when recents list is empty", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: EMPTY,
        favorites: EMPTY,
        query: "",
      });
      expect(groups.find((g) => g.groupLabel === "Recents")).toBeUndefined();
    });

    it("does not add Favourites group when favorites list is empty", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: EMPTY,
        favorites: EMPTY,
        query: "",
      });
      expect(groups.find((g) => g.groupLabel === "Favourites")).toBeUndefined();
    });
  });

  describe("search mode (non-empty query)", () => {
    it("hides Recents and Favourites groups when user types", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: ["sma", "rsi"],
        favorites: ["macd"],
        query: "rsi",
      });

      expect(groups.find((g) => g.groupLabel === "Recents")).toBeUndefined();
      expect(groups.find((g) => g.groupLabel === "Favourites")).toBeUndefined();
    });

    it("still includes category groups when there is a query", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: EMPTY,
        favorites: EMPTY,
        query: "sma",
      });
      expect(groups.some((g) => g.groupLabel === "Indicators")).toBe(true);
    });
  });

  describe("source annotation", () => {
    it("annotates items in Recents group with source=recents", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: ["sma"],
        favorites: EMPTY,
        query: "",
      });
      const recentsGroup = groups.find((g) => g.groupLabel === "Recents")!;
      expect(recentsGroup.commands[0].source).toBe("recents");
    });

    it("annotates items in Favourites group with source=favorites", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: EMPTY,
        favorites: ["ema"],
        query: "",
      });
      const favsGroup = groups.find((g) => g.groupLabel === "Favourites")!;
      expect(favsGroup.commands[0].source).toBe("favorites");
    });

    it("annotates category group items with source=browse when query is empty", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: EMPTY,
        favorites: EMPTY,
        query: "",
      });
      const indicatorsGroup = groups.find((g) => g.groupLabel === "Indicators")!;
      expect(indicatorsGroup.commands[0].source).toBe("browse");
    });

    it("annotates category group items with source=search when query is non-empty", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: EMPTY,
        favorites: EMPTY,
        query: "price",
      });
      const dataGroup = groups.find((g) => g.groupLabel === "Data")!;
      expect(dataGroup.commands[0].source).toBe("search");
    });
  });

  describe("keywords", () => {
    it("includes blockType, PLAIN_LABEL_MAP label, and category label as keywords", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: EMPTY,
        favorites: EMPTY,
        query: "",
      });
      const indicatorsGroup = groups.find((g) => g.groupLabel === "Indicators")!;
      const smaCmd = indicatorsGroup.commands.find((c) => c.blockType === "sma")!;

      expect(smaCmd.keywords).toContain("sma");
      expect(smaCmd.keywords).toContain(PLAIN_LABEL_MAP["sma"]);
      expect(smaCmd.keywords).toContain("Indicators");
    });

    it("omits undefined PLAIN_LABEL_MAP entry from keywords gracefully", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: EMPTY,
        favorites: EMPTY,
        query: "",
      });
      const dataGroup = groups.find((g) => g.groupLabel === "Data")!;
      const priceCmd = dataGroup.commands.find((c) => c.blockType === "price")!;

      expect(priceCmd.keywords.every((k) => k !== undefined)).toBe(true);
    });
  });

  describe("command shape", () => {
    it("each command has kind=insert", () => {
      const groups = buildCommandList({
        registry: FULL_REGISTRY,
        recents: EMPTY,
        favorites: EMPTY,
        query: "",
      });
      const allCommands = groups.flatMap((g) => g.commands);
      expect(allCommands.every((c) => c.kind === "insert")).toBe(true);
    });
  });
});
