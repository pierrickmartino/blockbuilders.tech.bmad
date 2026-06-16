import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurriculumView } from "@/lib/curriculum/get-curriculum-view";
import type { CurriculumResponse } from "@/types/curriculum";

const mockCurriculum: CurriculumResponse = {
  modules: [
    {
      id: "module-1-foundations",
      title: "Foundations",
      description: "Learn the core patterns.",
      order: 1,
      lessons: [
        {
          id: "lesson-1-rsi",
          title: "RSI Oversold Bounce",
          description: "Understand momentum indicators.",
          template_name: "RSI Oversold Bounce",
          difficulty: "beginner",
          order: 1,
        },
      ],
    },
  ],
};

describe("getCurriculumView", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fetches from the /curriculum endpoint", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCurriculum,
    });

    await getCurriculumView();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/curriculum"),
      expect.any(Object)
    );
  });

  it("returns parsed curriculum data on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCurriculum,
    });

    const result = await getCurriculumView();

    expect(result).toEqual(mockCurriculum);
  });

  it("returns null when the request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await getCurriculumView();

    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const result = await getCurriculumView();

    expect(result).toBeNull();
  });
});
