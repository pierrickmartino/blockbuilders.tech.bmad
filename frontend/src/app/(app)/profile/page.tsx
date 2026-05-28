"use client";

import { useState, useEffect, useCallback } from "react";
import { UsersApiClient } from "@/lib/api/users-client";
import { ProfileResponse } from "@/types/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileSettingsSection } from "./profile-settings-section";
import { Globe, Sparkles, User } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicDisplayName, setPublicDisplayName] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await UsersApiClient.getProfile();
      setProfile(data);
    } catch {
      setError("Couldn't load your profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6">
        <div className="mb-6">
          <Skeleton className="mb-2 h-8 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
        {[1, 2].map((i) => (
          <Card key={i} className="mb-6">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6">
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="min-w-0 break-words">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProfile}
            className="min-h-11 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 sm:min-h-0"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const avatarInitial =
    (publicDisplayName ?? profile?.email ?? "")[0]?.toUpperCase() ?? "";

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      </div>

      <div className="space-y-6">
        {/* Account */}
        <Card id="account">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Account</CardTitle>
            </div>
            <CardDescription>
              Your email address, plan tier, and account status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"
                aria-hidden="true"
              >
                <span className="text-sm font-semibold text-primary">
                  {avatarInitial}
                </span>
              </div>
              <div className="min-w-0">
                <p className="break-all text-sm font-medium">
                  {profile?.email}
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {profile?.plan.tier} plan
                </p>
              </div>
            </div>

            {profile?.settings.user_tier === "beta" && (
              <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <Badge variant="default" className="mb-1.5">
                    Founding Member Perks
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-mono tabular-nums">+10</span>{" "}
                    strategies and{" "}
                    <span className="font-mono tabular-nums">+50</span>{" "}
                    backtests/day are already applied to your limits.{" "}
                    <a
                      href="/plan#billing"
                      className="font-medium text-primary underline"
                    >
                      20% off paid plans
                    </a>
                    .
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Public Profile */}
        <Card id="public-profile">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Public Profile</CardTitle>
            </div>
            <CardDescription>
              Make your profile visible to others and showcase your published
              strategies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileSettingsSection onSettingsLoad={setPublicDisplayName} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
