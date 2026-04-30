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
import { Check, Copy, Loader2 } from "lucide-react";

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
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      try {
        const input = document.getElementById("share-url") as HTMLInputElement;
        input?.select();
        document.execCommand("copy");
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch {
        setError("Could not copy automatically. Select the URL and press Ctrl+C (or Cmd+C).");
      }
    }
  };

  const handleSelectAll = (e: React.MouseEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).select();
  };

  const handleBack = () => {
    setShareUrl(null);
    setError(null);
  };

  const handleClose = () => {
    setShareUrl(null);
    setError(null);
    setExpiration("7d");
    setCopySuccess(false);
    onOpenChange(false);
  };

  const expirationLabel =
    expiration === "never"
      ? "This link never expires."
      : `This link expires in ${EXPIRATION_OPTIONS[expiration].label}.`;

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
                <label
                  htmlFor="share-expiration"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Link expiration
                </label>
                <Select
                  value={expiration}
                  onValueChange={(v) => setExpiration(v as ExpirationOption)}
                >
                  <SelectTrigger id="share-expiration">
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
                <div className="rounded border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Link"
                )}
              </Button>
            </>
          ) : (
            <>
              <div>
                <label
                  htmlFor="share-url"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Share URL
                </label>
                <div className="flex gap-2">
                  <Input
                    id="share-url"
                    value={shareUrl}
                    readOnly
                    onClick={handleSelectAll}
                    className="flex-1 bg-muted/50 cursor-text"
                  />
                  <Button onClick={handleCopy} variant="outline">
                    {copySuccess ? (
                      <>
                        <Check className="mr-1.5 h-4 w-4 text-success" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded border border-success/20 bg-success/5 px-3 py-2 text-sm text-success">
                Link created successfully. {expirationLabel} Anyone with this
                URL can view your results.
              </div>

              {error && (
                <div className="rounded border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button variant="ghost" size="sm" onClick={handleBack}>
                Generate a different link
              </Button>
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
