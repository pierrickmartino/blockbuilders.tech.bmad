"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import NotificationBell from "@/components/NotificationBell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold text-gray-900">
              Blockbuilders
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              href="/strategies"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Strategies
            </Link>
            <Link
              href="/profile"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Profile
            </Link>
            <Link
              href="/how-backtests-work"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              How It Works
            </Link>
            <Link
              href="/metrics-glossary"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Metrics
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
