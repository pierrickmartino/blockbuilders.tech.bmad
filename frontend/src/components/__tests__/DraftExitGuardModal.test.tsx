import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DraftExitGuardModal } from "@/components/DraftExitGuardModal";

describe("DraftExitGuardModal", () => {
  it("does not render when closed", () => {
    render(<DraftExitGuardModal open={false} onKeep={vi.fn()} onDiscard={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders Keep, Discard, and Cancel actions when open", () => {
    render(<DraftExitGuardModal open={true} onKeep={vi.fn()} onDiscard={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole("button", { name: /keep/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /discard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls onKeep when Keep is clicked", () => {
    const onKeep = vi.fn();
    render(<DraftExitGuardModal open={true} onKeep={onKeep} onDiscard={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /keep/i }));

    expect(onKeep).toHaveBeenCalledOnce();
  });

  it("calls onDiscard when Discard is clicked", () => {
    const onDiscard = vi.fn();
    render(<DraftExitGuardModal open={true} onKeep={vi.fn()} onDiscard={onDiscard} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /discard/i }));

    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<DraftExitGuardModal open={true} onKeep={vi.fn()} onDiscard={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when the dialog is dismissed (e.g. Escape)", () => {
    const onCancel = vi.fn();
    render(<DraftExitGuardModal open={true} onKeep={vi.fn()} onDiscard={vi.fn()} onCancel={onCancel} />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onCancel).toHaveBeenCalled();
  });
});
