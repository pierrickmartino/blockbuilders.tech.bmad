import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RestoreSnapshotButton } from "@/components/backtest/RestoreSnapshotButton";

describe("RestoreSnapshotButton", () => {
  it("renders the restore button", () => {
    render(<RestoreSnapshotButton versionNumber={3} onRestore={vi.fn()} isRestoring={false} />);
    expect(screen.getByRole("button", { name: /restore/i })).toBeInTheDocument();
  });

  it("opens a confirmation dialog when clicked", () => {
    render(<RestoreSnapshotButton versionNumber={3} onRestore={vi.fn()} isRestoring={false} />);
    fireEvent.click(screen.getByRole("button", { name: /restore/i }));
    expect(screen.getByText(/unsaved edits will be replaced/i)).toBeInTheDocument();
  });

  it("calls onRestore when confirm is clicked", async () => {
    const onRestore = vi.fn().mockResolvedValue(undefined);
    render(<RestoreSnapshotButton versionNumber={3} onRestore={onRestore} isRestoring={false} />);

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(onRestore).toHaveBeenCalledOnce());
  });

  it("does not call onRestore when cancel is clicked", () => {
    const onRestore = vi.fn();
    render(<RestoreSnapshotButton versionNumber={3} onRestore={onRestore} isRestoring={false} />);

    fireEvent.click(screen.getByRole("button", { name: /restore/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onRestore).not.toHaveBeenCalled();
  });

  it("shows the version number in the dialog title", () => {
    render(<RestoreSnapshotButton versionNumber={5} onRestore={vi.fn()} isRestoring={false} />);
    fireEvent.click(screen.getByRole("button", { name: /restore/i }));
    expect(screen.getByRole("heading", { name: /v5/i })).toBeInTheDocument();
  });

  it("disables the restore button when isRestoring is true", () => {
    render(<RestoreSnapshotButton versionNumber={3} onRestore={vi.fn()} isRestoring={true} />);
    expect(screen.getByRole("button", { name: /restoring/i })).toBeDisabled();
  });
});
