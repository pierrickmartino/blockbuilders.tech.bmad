import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppSidebar } from "../app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("@/context/auth", () => ({
  useAuth: () => ({ user: { email: "test@example.com" }, logout: vi.fn() }),
}));

describe("AppSidebar", () => {
  it("does not render a Trust page link in the Resources nav", () => {
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    );

    expect(
      screen.queryByRole("link", { name: /how it works/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /how-backtests-work/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /metrics glossary/i })
    ).toBeInTheDocument();
  });
});
