import { describe, it, expect } from "vitest";
import { resolveCohort } from "@/lib/cohort-resolver";

describe("resolveCohort", () => {
  it("maps nl_wedge to the nl authoring mode", () => {
    expect(resolveCohort("nl_wedge")).toEqual({
      entry_path: "nl_wedge",
      authoring_mode: "nl",
    });
  });

  it.each(["wizard", "blank_canvas", "template_clone"] as const)(
    "maps %s to the manual authoring mode, passing the path through unchanged",
    (entryPath) => {
      expect(resolveCohort(entryPath)).toEqual({
        entry_path: entryPath,
        authoring_mode: "manual",
      });
    }
  );

  it("maps a null persisted entry_path to the unknown cohort", () => {
    expect(resolveCohort(null)).toEqual({
      entry_path: "unknown",
      authoring_mode: "unknown",
    });
  });

  it.each(["manual", "MANUAL", "wizardd", "", "  wizard  ", "<script>"])(
    "maps the unrecognised value %j to the unknown cohort instead of passing it through",
    (garbage) => {
      const result = resolveCohort(garbage);

      expect(result).toEqual({ entry_path: "unknown", authoring_mode: "unknown" });
      expect(result.entry_path).not.toBe(garbage);
    }
  );
});
