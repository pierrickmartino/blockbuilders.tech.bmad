"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { PublicProfile } from "@/types/profile";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function PublicProfilePage() {
  const params = useParams();
  const handle = params.handle as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await apiFetch<PublicProfile>(`/profiles/${handle}`);
        setProfile(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError("Profile not found or not public");
        } else {
          setError("Failed to load profile");
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [handle]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
        {error || "Profile not found"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-2xl font-bold">
          {profile.display_name || `@${profile.handle}`}
        </h1>
        {profile.display_name && (
          <p className="text-muted-foreground">@{profile.handle}</p>
        )}
        {profile.bio && (
          <p className="mt-3 text-muted-foreground">{profile.bio}</p>
        )}
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-2xl font-bold">{profile.follower_count}</p>
          <p className="text-sm text-muted-foreground">Followers</p>
        </div>
        {profile.contributions && (
          <>
            <div>
              <p className="text-2xl font-bold">
                {profile.contributions.published_strategies}
              </p>
              <p className="text-sm text-muted-foreground">
                Published Strategies
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {profile.contributions.completed_backtests}
              </p>
              <p className="text-sm text-muted-foreground">Backtests Run</p>
            </div>
          </>
        )}
      </div>

      {/* Badges */}
      {profile.badges && profile.badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map((badge) => (
                <Badge key={badge.key} variant="secondary">
                  {badge.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Published Strategies */}
      {profile.published_strategies &&
        profile.published_strategies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Published Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {profile.published_strategies.map((strategy) => (
                  <li key={strategy.id}>
                    <Link
                      href={`/strategies/${strategy.id}`}
                      className="text-primary hover:underline"
                    >
                      {strategy.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

      {/* Empty state */}
      {(!profile.published_strategies ||
        profile.published_strategies.length === 0) &&
        (!profile.badges || profile.badges.length === 0) && (
          <p className="text-center text-muted-foreground">
            No public content to display yet.
          </p>
        )}
    </div>
  );
}
