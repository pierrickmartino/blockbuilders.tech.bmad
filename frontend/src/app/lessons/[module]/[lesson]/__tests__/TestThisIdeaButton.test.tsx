import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TestThisIdeaButton } from "@/app/lessons/[module]/[lesson]/_components/TestThisIdeaButton";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/context/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useTestThisIdea", () => ({
  useTestThisIdea: vi.fn(),
}));

import { useAuth } from "@/context/auth";
import { useTestThisIdea } from "@/hooks/useTestThisIdea";

const mockUseAuth = vi.mocked(useAuth);
const mockUseTestThisIdea = vi.mocked(useTestThisIdea);

describe("TestThisIdeaButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTestThisIdea.mockReturnValue({
      trigger: vi.fn(),
      isLoading: false,
      error: null,
    });
  });

  it("renders a 'Sign in to test' link for unauthenticated users", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false } as ReturnType<typeof useAuth>);

    render(<TestThisIdeaButton templateId="tmpl-1" />);

    const link = screen.getByRole("link", { name: /sign in to test/i });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("renders a 'Test this idea' button for authenticated users", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "u@test.com" },
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    render(<TestThisIdeaButton templateId="tmpl-1" />);

    expect(screen.getByRole("button", { name: /test this idea/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in to test/i })).not.toBeInTheDocument();
  });

  it("calls trigger() when the button is clicked", async () => {
    const mockTrigger = vi.fn().mockResolvedValue(undefined);
    mockUseTestThisIdea.mockReturnValue({
      trigger: mockTrigger,
      isLoading: false,
      error: null,
    });
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "u@test.com" },
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    render(<TestThisIdeaButton templateId="tmpl-1" />);

    fireEvent.click(screen.getByRole("button", { name: /test this idea/i }));
    expect(mockTrigger).toHaveBeenCalledTimes(1);
  });

  it("shows a loading state while the flow is in progress", () => {
    mockUseTestThisIdea.mockReturnValue({
      trigger: vi.fn(),
      isLoading: true,
      error: null,
    });
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "u@test.com" },
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    render(<TestThisIdeaButton templateId="tmpl-1" />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("shows an error message when the flow fails", () => {
    mockUseTestThisIdea.mockReturnValue({
      trigger: vi.fn(),
      isLoading: false,
      error: "Something went wrong",
    });
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "u@test.com" },
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    render(<TestThisIdeaButton templateId="tmpl-1" />);

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("does not show the button if templateId is null (renders sign-in link as fallback)", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "u@test.com" },
      isLoading: false,
    } as ReturnType<typeof useAuth>);

    render(<TestThisIdeaButton templateId={null} />);

    expect(screen.queryByRole("button", { name: /test this idea/i })).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: /sign in to test/i });
    expect(link).toHaveAttribute("href", "/login");
  });
});
