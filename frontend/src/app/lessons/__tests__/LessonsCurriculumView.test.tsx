import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LessonsCurriculumView } from "@/app/lessons/_components/LessonsCurriculumView";
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
          template_id: null,
          difficulty: "beginner",
          order: 1,
        },
        {
          id: "lesson-2-ma-crossover",
          title: "MA Crossover",
          description: "Learn moving average crossovers.",
          template_name: "MA Crossover",
          template_id: null,
          difficulty: "beginner",
          order: 2,
        },
      ],
    },
  ],
};

describe("LessonsCurriculumView — public curriculum index (#692)", () => {
  it("renders a home link rather than an auth-gated dashboard link", () => {
    render(<LessonsCurriculumView curriculum={mockCurriculum} />);

    const homeLink = screen.getByRole("link", { name: /blockbuilders/i });
    expect(homeLink).toHaveAttribute("href", "/");

    expect(
      screen.queryByRole("link", { name: /dashboard/i })
    ).not.toBeInTheDocument();
  });

  it("renders the page heading", () => {
    render(<LessonsCurriculumView curriculum={mockCurriculum} />);

    expect(
      screen.getByRole("heading", { name: /learn strategy literacy/i })
    ).toBeInTheDocument();
  });

  it("renders each module title", () => {
    render(<LessonsCurriculumView curriculum={mockCurriculum} />);

    expect(screen.getByText("Foundations")).toBeInTheDocument();
  });

  it("renders links to each lesson", () => {
    render(<LessonsCurriculumView curriculum={mockCurriculum} />);

    const rsiLink = screen.getByRole("link", { name: /RSI Oversold Bounce/i });
    expect(rsiLink).toHaveAttribute(
      "href",
      "/lessons/module-1-foundations/lesson-1-rsi"
    );

    const maLink = screen.getByRole("link", { name: /MA Crossover/i });
    expect(maLink).toHaveAttribute(
      "href",
      "/lessons/module-1-foundations/lesson-2-ma-crossover"
    );
  });

  it("renders difficulty badges", () => {
    render(<LessonsCurriculumView curriculum={mockCurriculum} />);

    expect(screen.getAllByText(/beginner/i).length).toBeGreaterThan(0);
  });
});
