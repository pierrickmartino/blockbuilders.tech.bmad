"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/context/auth";
import { Strategy, ALLOWED_ASSETS, ALLOWED_TIMEFRAMES, AllowedAsset } from "@/types/strategy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (strategy: Strategy) => void;
  onOpenWizard: () => void;
}

export default function NewStrategyModal({ open, onOpenChange, onCreated, onOpenWizard }: Props) {
  const { refreshUsage } = useAuth();
  const [name, setName] = useState("");
  const [asset, setAsset] = useState<string>(ALLOWED_ASSETS[0]);
  const [timeframe, setTimeframe] = useState<string>(ALLOWED_TIMEFRAMES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!ALLOWED_ASSETS.includes(asset as AllowedAsset)) {
      setError("Please select a valid asset from the list");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const strategy = await apiFetch<Strategy>("/strategies/", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), asset, timeframe }),
      });
      refreshUsage();
      onCreated(strategy);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(
          "You've reached the maximum number of strategies. Archive some existing strategies to create new ones."
        );
      } else {
        setError(err instanceof Error ? err.message : "Failed to create strategy");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenWizard = () => {
    onOpenChange(false);
    onOpenWizard();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Strategy</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Strategy"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="asset" className="text-sm font-medium">
              Asset
            </label>
            <Input
              id="asset"
              type="text"
              list="asset-list"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              placeholder="Search or select asset (e.g., BTC/USDT)"
            />
            <datalist id="asset-list">
              {ALLOWED_ASSETS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <label htmlFor="timeframe" className="text-sm font-medium">
              Timeframe
            </label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_TIMEFRAMES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>

        <div className="border-t pt-4">
          <Button type="button" variant="link" className="w-full" onClick={handleOpenWizard}>
            Or use guided wizard to build your first strategy →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
