import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LessonView } from "@/app/lessons/[module]/[lesson]/_components/LessonView";
import type { LessonResponse, ModuleResponse } from "@/types/curriculum";

vi.mock(
  "@/app/lessons/[module]/[lesson]/_components/TestThisIdeaButton",
  () => ({
    TestThisIdeaButton: ({ templateId }: { templateId: string | null }) => (
      <div data-testid="test-this-idea-button" data-template-id={templateId ?? ""}>
        TestThisIdeaButton
      </div>
    ),
  })
);

const mockLesson: LessonResponse = {
  id: "lesson-1-rsi",
  title: "RSI Oversold Bounce",
  description:
    "Understand momentum indicators and how oversold/overbought zones signal reversals.",
  template_name: "RSI Oversold Bounce",
  template_id: "tmpl-rsi-uuid",
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

  it("renders TestThisIdeaButton with the lesson template_id", () => {
    render(<LessonView lesson={mockLesson} module={mockModule} />);

    const button = screen.getByTestId("test-this-idea-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-template-id", "tmpl-rsi-uuid");
  });

  it("passes null template_id to TestThisIdeaButton when template_id is null", () => {
    const lessonWithoutTemplate: LessonResponse = { ...mockLesson, template_id: null };
    render(<LessonView lesson={lessonWithoutTemplate} module={mockModule} />);

    const button = screen.getByTestId("test-this-idea-button");
    expect(button).toHaveAttribute("data-template-id", "");
  });
});
