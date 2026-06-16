"use client";

import { useCallback, useEffect, useState } from "react";
import { TrackApiClient } from "@/lib/api/track-client";
import { TrackView } from "./_components/TrackView";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { TrackView as TrackViewType } from "@/types/track";

export default function TrackPage() {
  const [track, setTrack] = useState<TrackViewType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrack = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await TrackApiClient.getTrack();
      setTrack(data);
    } catch {
      setError("Couldn't load your track progress. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrack();
  }, [fetchTrack]);

  if (isLoading) {
    return (
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-2 w-full" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTrack}
            className="self-start sm:self-auto"
          >
            Retry
          </Button>
        </div>
      </main>
    );
  }

  if (!track) {
    return null;
  }

  return <TrackView track={track} />;
}
