import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DraftReviewControls } from "@/components/backtest/DraftReviewControls";

describe("DraftReviewControls", () => {
  it("renders Accept, Edit, and Reject actions", () => {
    render(<DraftReviewControls onAccept={vi.fn()} onEdit={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("calls onAccept when Accept is clicked", () => {
    const onAccept = vi.fn();
    render(<DraftReviewControls onAccept={onAccept} onEdit={vi.fn()} onReject={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /accept/i }));

    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("calls onEdit when Edit is clicked", () => {
    const onEdit = vi.fn();
    render(<DraftReviewControls onAccept={vi.fn()} onEdit={onEdit} onReject={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("calls onReject when Reject is clicked, with no confirmation dialog", () => {
    const onReject = vi.fn();
    render(<DraftReviewControls onAccept={vi.fn()} onEdit={vi.fn()} onReject={onReject} />);

    fireEvent.click(screen.getByRole("button", { name: /reject/i }));

    expect(onReject).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
