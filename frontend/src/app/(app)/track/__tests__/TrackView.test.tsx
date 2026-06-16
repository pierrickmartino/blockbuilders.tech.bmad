import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TrackView } from "@/app/(app)/track/_components/TrackView";
import type { TrackView as TrackViewType } from "@/types/track";

const mockTrack: TrackViewType = {
  modules: [
    {
      id: "module-1-foundations",
      title: "Foundations",
      order: 1,
      lessons: [
        {
          id: "lesson-1-rsi",
          title: "RSI Oversold Bounce",
          order: 1,
          completed: true,
        },
        {
          id: "lesson-2-ma-crossover",
          title: "MA Crossover",
          order: 2,
          completed: false,
        },
      ],
      completed_count: 1,
      total_count: 2,
      percent_complete: 50,
    },
    {
      id: "module-2-risk-drawdown",
      title: "Risk & Drawdown",
      order: 2,
      lessons: [
        {
          id: "lesson-5-macd-histogram",
          title: "MACD Histogram Cross",
          order: 1,
          completed: false,
        },
      ],
      completed_count: 0,
      total_count: 1,
      percent_complete: 0,
    },
  ],
  total_lessons: 3,
  completed_lessons: 1,
  percent_complete: 33.3,
  resume_lesson_id: "lesson-2-ma-crossover",
};

describe("TrackView component", () => {
  it("renders the track heading", () => {
    render(<TrackView track={mockTrack} />);
    expect(screen.getByRole("heading", { name: /literacy track/i })).toBeInTheDocument();
  });

  it("renders each module title", () => {
    render(<TrackView track={mockTrack} />);
    expect(screen.getByText("Foundations")).toBeInTheDocument();
    expect(screen.getByText("Risk & Drawdown")).toBeInTheDocument();
  });

  it("renders all lesson titles", () => {
    render(<TrackView track={mockTrack} />);
    expect(screen.getByText("RSI Oversold Bounce")).toBeInTheDocument();
    expect(screen.getByText("MA Crossover")).toBeInTheDocument();
    expect(screen.getByText("MACD Histogram Cross")).toBeInTheDocument();
  });

  it("marks completed lessons visually", () => {
    render(<TrackView track={mockTrack} />);
    const completedLesson = screen.getByTestId("lesson-lesson-1-rsi");
    expect(completedLesson).toHaveAttribute("data-completed", "true");
  });

  it("marks incomplete lessons as not completed", () => {
    render(<TrackView track={mockTrack} />);
    const incompleteLesson = screen.getByTestId("lesson-lesson-2-ma-crossover");
    expect(incompleteLesson).toHaveAttribute("data-completed", "false");
  });

  it("renders all lessons as navigable links", () => {
    render(<TrackView track={mockTrack} />);
    const links = screen.getAllByRole("link");
    const lessonLinks = links.filter((l) => l.getAttribute("href")?.includes("/lessons/"));
    expect(lessonLinks.length).toBe(3);
  });

  it("shows overall completion percentage", () => {
    render(<TrackView track={mockTrack} />);
    expect(screen.getAllByText(/33/).length).toBeGreaterThan(0);
  });

  it("shows module completion fraction", () => {
    render(<TrackView track={mockTrack} />);
    expect(screen.getByText(/1.*\/.*2|1 of 2/i)).toBeInTheDocument();
  });

  it("highlights the resume lesson", () => {
    render(<TrackView track={mockTrack} />);
    const resumeLesson = screen.getByTestId("lesson-lesson-2-ma-crossover");
    expect(resumeLesson).toHaveAttribute("data-resume", "true");
  });

  it("does not highlight non-resume lessons as resume", () => {
    render(<TrackView track={mockTrack} />);
    const nonResume = screen.getByTestId("lesson-lesson-1-rsi");
    expect(nonResume).toHaveAttribute("data-resume", "false");
  });
});
