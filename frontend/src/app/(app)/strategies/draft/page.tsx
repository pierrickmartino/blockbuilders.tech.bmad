"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { ApiError } from "@/lib/api";
import { StrategiesApiClient } from "@/lib/api/strategies-client";
import { trackEvent } from "@/lib/analytics";
import { resolveCohort } from "@/lib/cohort-resolver";
import { useAuth } from "@/context/auth";
import { ALLOWED_ASSETS, ALLOWED_TIMEFRAMES } from "@/types/strategy";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type DraftStatus = { kind: "declined" | "disabled"; message: string } | null;

export default function DraftFromNlPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [nlText, setNlText] = useState("");
  const [asset, setAsset] = useState<string>(ALLOWED_ASSETS[0]);
  const [timeframe, setTimeframe] = useState<string>(ALLOWED_TIMEFRAMES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DraftStatus>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlText.trim()) {
      setError("Describe your strategy first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setStatus(null);

    try {
      const result = await StrategiesApiClient.draftFromNl({
        nl_text: nlText.trim(),
        asset,
        timeframe,
      });

      if (result.outcome === "disabled") {
        setStatus({
          kind: "disabled",
          message: "Generating a strategy from a description is not available yet.",
        });
        return;
      }

      if (result.outcome === "declined") {
        setStatus({
          kind: "declined",
          message: result.reason ?? "Couldn't generate a strategy from that description.",
        });
        return;
      }

      trackEvent(
        "strategy_created",
        { asset, timeframe, source: "nl_wedge", ...resolveCohort("nl_wedge") },
        user?.id
      );
      router.push(`/strategies/${result.strategy_id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to generate a strategy"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/strategies">Strategies</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Generate from description</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generate a strategy from a description</h1>
        <p className="text-muted-foreground">
          Describe the strategy you want in plain English. We&apos;ll build a starting point you can
          refine on the canvas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nl_text">Describe your strategy</Label>
          <Textarea
            id="nl_text"
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            placeholder="e.g. Buy when RSI drops below 30 and sell when it rises above 70"
            rows={5}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="asset">Asset</Label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger id="asset">
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_ASSETS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeframe">Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger id="timeframe">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_TIMEFRAMES.map((tf) => (
                  <SelectItem key={tf} value={tf}>
                    {tf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {status && (
          <div
            role="alert"
            className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
          >
            {status.message}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Generate Strategy
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
