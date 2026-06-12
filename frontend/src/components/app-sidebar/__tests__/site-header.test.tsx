import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SiteHeader } from "../site-header";
import { SidebarProvider } from "@/components/ui/sidebar";

const mockPathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

vi.mock("@/components/NotificationBell", () => ({
  default: () => null,
}));

describe("SiteHeader", () => {
  it("does not show 'How It Works' as the breadcrumb title for the Trust page route", () => {
    mockPathname.mockReturnValue("/how-backtests-work");

    render(
      <SidebarProvider>
        <SiteHeader />
      </SidebarProvider>
    );

    expect(screen.queryByText("How It Works")).not.toBeInTheDocument();
  });

  it("still shows the page title for known in-app routes", () => {
    mockPathname.mockReturnValue("/dashboard");

    render(
      <SidebarProvider>
        <SiteHeader />
      </SidebarProvider>
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
