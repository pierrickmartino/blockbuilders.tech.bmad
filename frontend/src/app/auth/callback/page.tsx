"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth";
import { ApiError } from "@/lib/api";

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
      <div className="rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
          Authentication failed
        </h1>
        <div className="mb-6 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
        <Link
          href="/?mode=login"
          className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-8 shadow-md">
      <div className="flex flex-col items-center gap-4">
        <svg
          className="h-8 w-8 animate-spin text-blue-600"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg bg-white p-8 shadow-md">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="h-8 w-8 animate-spin text-blue-600"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <OAuthCallbackHandler />
    </Suspense>
  );
}
