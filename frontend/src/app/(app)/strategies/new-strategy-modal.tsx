"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/context/auth";
import {
  Strategy,
  ALLOWED_ASSETS,
  ALLOWED_TIMEFRAMES,
  AllowedAsset,
} from "@/types/strategy";

interface Props {
  onClose: () => void;
  onCreated: (strategy: Strategy) => void;
  onOpenWizard: () => void;
}

export default function NewStrategyModal({ onClose, onCreated, onOpenWizard }: Props) {
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

    // Validate asset selection
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">New Strategy</h2>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Strategy"
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label htmlFor="asset" className="mb-1 block text-sm font-medium text-gray-700">
              Asset
            </label>
            <input
              id="asset"
              type="text"
              list="asset-list"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              placeholder="Search or select asset (e.g., BTC/USDT)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <datalist id="asset-list">
              {ALLOWED_ASSETS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          <div className="mb-6">
            <label htmlFor="timeframe" className="mb-1 block text-sm font-medium text-gray-700">
              Timeframe
            </label>
            <select
              id="timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ALLOWED_TIMEFRAMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>

        <div className="mt-4 border-t pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenWizard();
            }}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700"
          >
            Or use guided wizard to build your first strategy →
          </button>
        </div>
      </div>
    </div>
  );
}
