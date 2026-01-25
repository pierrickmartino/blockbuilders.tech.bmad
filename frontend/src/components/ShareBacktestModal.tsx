"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

interface ShareBacktestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string;
}

interface ShareLinkResponse {
  url: string;
  token: string;
  expires_at: string | null;
}

type ExpirationOption = "7d" | "30d" | "never";

const EXPIRATION_OPTIONS: Record<
  ExpirationOption,
  { label: string; days: number | null }
> = {
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
  never: { label: "Never", days: null },
};

export function ShareBacktestModal({
  open,
  onOpenChange,
  runId,
}: ShareBacktestModalProps) {
  const [expiration, setExpiration] = useState<ExpirationOption>("7d");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const option = EXPIRATION_OPTIONS[expiration];
      let expiresAt: string | null = null;

      if (option.days !== null) {
        const date = new Date();
        date.setDate(date.getDate() + option.days);
        expiresAt = date.toISOString();
      }

      const response = await apiFetch<ShareLinkResponse>(
        `/backtests/${runId}/share-links`,
        {
          method: "POST",
          body: JSON.stringify({ expires_at: expiresAt }),
        }
      );

      setShareUrl(response.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate share link"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch {
        setError("Failed to copy to clipboard");
      }
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setError(null);
    setExpiration("7d");
    setCopySuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Results</DialogTitle>
          <DialogDescription>
            Generate a read-only link to share your backtest metrics and equity
            curve. Strategy logic remains private.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!shareUrl ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link expiration
                </label>
                <Select
                  value={expiration}
                  onValueChange={(v) => setExpiration(v as ExpirationOption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPIRATION_OPTIONS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? "Generating..." : "Generate Link"}
              </Button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Share URL
                </label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="flex-1" />
                  <Button onClick={handleCopy} variant="outline">
                    {copySuccess ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                Link created successfully. Anyone with this URL can view your
                results.
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
