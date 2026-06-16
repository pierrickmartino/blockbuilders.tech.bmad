import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LessonView } from "@/app/lessons/[module]/[lesson]/_components/LessonView";
import type { LessonResponse, ModuleResponse } from "@/types/curriculum";

const mockLesson: LessonResponse = {
  id: "lesson-1-rsi",
  title: "RSI Oversold Bounce",
  description:
    "Understand momentum indicators and how oversold/overbought zones signal reversals.",
  template_name: "RSI Oversold Bounce",
  difficulty: "beginner",
  order: 1,
};

const mockModule: ModuleResponse = {
  id: "module-1-foundations",
  title: "Foundations",
  description: "Learn the core patterns.",
  order: 1,
  lessons: [mockLesson],
};

describe("LessonView — public lesson page (#692)", () => {
  it("renders a home link rather than an auth-gated dashboard link", () => {
    render(<LessonView lesson={mockLesson} module={mockModule} />);

    const homeLink = screen.getByRole("link", { name: /blockbuilders/i });
    expect(homeLink).toHaveAttribute("href", "/");

    expect(
      screen.queryByRole("link", { name: /dashboard/i })
    ).not.toBeInTheDocument();
  });

  it("renders the lesson title as the main heading", () => {
    render(<LessonView lesson={mockLesson} module={mockModule} />);

    expect(
      screen.getByRole("heading", { name: "RSI Oversold Bounce" })
    ).toBeInTheDocument();
  });

  it("renders the lesson description", () => {
    render(<LessonView lesson={mockLesson} module={mockModule} />);

    expect(
      screen.getByText(/understand momentum indicators/i)
    ).toBeInTheDocument();
  });

  it("shows a 'sign in to test' CTA that links to /login", () => {
    render(<LessonView lesson={mockLesson} module={mockModule} />);

    const cta = screen.getByRole("link", { name: /sign in to test/i });
    expect(cta).toHaveAttribute("href", "/login");
  });

  it("renders the difficulty badge", () => {
    render(<LessonView lesson={mockLesson} module={mockModule} />);

    expect(screen.getByText("beginner")).toBeInTheDocument();
  });

  it("links back to the module page", () => {
    render(<LessonView lesson={mockLesson} module={mockModule} />);

    const backLink = screen.getByRole("link", { name: /foundations/i });
    expect(backLink).toHaveAttribute(
      "href",
      "/lessons/module-1-foundations"
    );
  });
});
