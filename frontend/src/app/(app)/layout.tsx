"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  getConsent,
  trackEvent,
} from "@/lib/analytics";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar, SiteHeader } from "@/components/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(() =>
    getConsent()
  );

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const syncConsent = () => setConsent(getConsent());

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent);
    window.addEventListener("storage", syncConsent);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  const prevPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    if (consent !== "accepted") return;
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;
    trackEvent("page_view", { path: pathname }, user.id);
  }, [consent, pathname, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
