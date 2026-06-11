import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DraftReviewControls } from "@/components/backtest/DraftReviewControls";

describe("DraftReviewControls", () => {
  it("renders Accept and Edit actions", () => {
    render(<DraftReviewControls onAccept={vi.fn()} onEdit={vi.fn()} />);

    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });

  it("calls onAccept when Accept is clicked", () => {
    const onAccept = vi.fn();
    render(<DraftReviewControls onAccept={onAccept} onEdit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /accept/i }));

    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("calls onEdit when Edit is clicked", () => {
    const onEdit = vi.fn();
    render(<DraftReviewControls onAccept={vi.fn()} onEdit={onEdit} />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledOnce();
  });
});
