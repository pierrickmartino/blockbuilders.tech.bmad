"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <p className="text-gray-500">Loading...</p>
    </main>
  );
}
