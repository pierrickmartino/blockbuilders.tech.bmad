"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function OAuthCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { completeOAuth } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setError("Invalid callback parameters");
      return;
    }

    // Get provider from localStorage (set during OAuth start)
    const provider = localStorage.getItem("oauth_provider");
    if (!provider) {
      setError("OAuth session not found. Please try signing in again.");
      return;
    }
    localStorage.removeItem("oauth_provider");

    completeOAuth(provider, code, state)
      .then(() => {
        router.push("/dashboard");
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Authentication failed. Please try again.");
        }
      });
  }, [searchParams, router, completeOAuth]);

  if (error) {
    return (
      <Card className="p-8">
        <h1 className="mb-4 text-center text-2xl font-bold tracking-tight">
          Authentication failed
        </h1>
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
        <Button asChild className="w-full">
          <Link href="/?mode=login">Back to sign in</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </Card>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </Card>
      }
    >
      <OAuthCallbackHandler />
    </Suspense>
  );
}
