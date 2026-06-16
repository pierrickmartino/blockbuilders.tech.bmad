import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ModuleView } from "@/app/lessons/[module]/_components/ModuleView";
import type { ModuleResponse } from "@/types/curriculum";

const mockModule: ModuleResponse = {
  id: "module-1-foundations",
  title: "Foundations",
  description: "Learn the core strategy patterns.",
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
      id: "lesson-3-bollinger",
      title: "Bollinger Breakout",
      description: "Explore volatility bands.",
      template_name: "Bollinger Breakout",
      template_id: null,
      difficulty: "intermediate",
      order: 3,
    },
  ],
};

describe("ModuleView — public module page (#692)", () => {
  it("renders a home link, not an auth-gated dashboard link", () => {
    render(<ModuleView module={mockModule} />);

    const homeLink = screen.getByRole("link", { name: /blockbuilders/i });
    expect(homeLink).toHaveAttribute("href", "/");

    expect(
      screen.queryByRole("link", { name: /dashboard/i })
    ).not.toBeInTheDocument();
  });

  it("renders the module title as the page heading", () => {
    render(<ModuleView module={mockModule} />);

    expect(
      screen.getByRole("heading", { name: "Foundations" })
    ).toBeInTheDocument();
  });

  it("renders lesson cards with links to each lesson", () => {
    render(<ModuleView module={mockModule} />);

    const rsiLink = screen.getByRole("link", {
      name: /RSI Oversold Bounce/i,
    });
    expect(rsiLink).toHaveAttribute(
      "href",
      "/lessons/module-1-foundations/lesson-1-rsi"
    );

    const bollingerLink = screen.getByRole("link", {
      name: /Bollinger Breakout/i,
    });
    expect(bollingerLink).toHaveAttribute(
      "href",
      "/lessons/module-1-foundations/lesson-3-bollinger"
    );
  });

  it("renders difficulty badges for each lesson", () => {
    render(<ModuleView module={mockModule} />);

    expect(screen.getByText("beginner")).toBeInTheDocument();
    expect(screen.getByText("intermediate")).toBeInTheDocument();
  });

  it("links back to the lessons index", () => {
    render(<ModuleView module={mockModule} />);

    const backLink = screen.getByRole("link", { name: /all lessons/i });
    expect(backLink).toHaveAttribute("href", "/lessons");
  });
});
