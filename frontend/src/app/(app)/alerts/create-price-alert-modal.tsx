"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { ALLOWED_ASSETS, AllowedAsset } from "@/types/strategy";
import { AlertRule, Direction } from "@/types/alert";
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
  onCreated: (alert: AlertRule) => void;
}

export default function CreatePriceAlertModal({ open, onOpenChange, onCreated }: Props) {
  const [asset, setAsset] = useState<string>(ALLOWED_ASSETS[0]);
  const [direction, setDirection] = useState<Direction>("above");
  const [thresholdPrice, setThresholdPrice] = useState<string>("");
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifyWebhook, setNotifyWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setAsset(ALLOWED_ASSETS[0]);
    setDirection("above");
    setThresholdPrice("");
    setNotifyEmail(false);
    setNotifyWebhook(false);
    setWebhookUrl("");
    setExpiresAt("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const price = parseFloat(thresholdPrice);
    if (!thresholdPrice || isNaN(price) || price <= 0) {
      setError("Please enter a valid price greater than 0");
      return;
    }

    if (!ALLOWED_ASSETS.includes(asset as AllowedAsset)) {
      setError("Please select a valid asset from the list");
      return;
    }

    if (notifyWebhook && !webhookUrl.trim()) {
      setError("Webhook URL is required when webhook notification is enabled");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const alert = await apiFetch<AlertRule>("/alerts/", {
        method: "POST",
        body: JSON.stringify({
          alert_type: "price",
          asset,
          direction,
          threshold_price: price,
          notify_email: notifyEmail,
          notify_webhook: notifyWebhook,
          webhook_url: notifyWebhook ? webhookUrl.trim() : undefined,
          expires_at: expiresAt || undefined,
          is_active: true,
        }),
      });
      onCreated(alert);
      resetForm();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Failed to create alert");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Price Alert</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="asset" className="text-sm font-medium">
              Asset
            </label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger>
                <SelectValue />
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
            <label htmlFor="direction" className="text-sm font-medium">
              Condition
            </label>
            <Select value={direction} onValueChange={(v) => setDirection(v as Direction)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="above">Price goes above</SelectItem>
                <SelectItem value="below">Price goes below</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="threshold" className="text-sm font-medium">
              Threshold Price (USD)
            </label>
            <Input
              id="threshold"
              type="number"
              step="any"
              min="0"
              value={thresholdPrice}
              onChange={(e) => setThresholdPrice(e.target.value)}
              placeholder="e.g., 50000"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Notifications</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Email notification
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={notifyWebhook}
                  onChange={(e) => setNotifyWebhook(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Webhook notification
              </label>
            </div>
            {notifyWebhook && (
              <Input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-webhook-url.com"
              />
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="expires" className="text-sm font-medium">
              Expiration (optional)
            </label>
            <Input
              id="expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for no expiration. Alert will deactivate after triggering.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
