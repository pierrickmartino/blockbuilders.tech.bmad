"use client";

import { useState, useEffect } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { ProfileSettings, ProfileUpdateRequest } from "@/types/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProfileSettingsSection() {
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [showStrategies, setShowStrategies] = useState(true);
  const [showContributions, setShowContributions] = useState(true);
  const [showBadges, setShowBadges] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await apiFetch<ProfileSettings>("/profiles/me/settings");
        setSettings(data);
        setIsPublic(data.is_public);
        setHandle(data.handle || "");
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
        setShowStrategies(data.show_strategies);
        setShowContributions(data.show_contributions);
        setShowBadges(data.show_badges);
      } catch {
        setMessage({ type: "error", text: "Failed to load profile settings" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setIsSaving(true);

    const data: ProfileUpdateRequest = {
      is_public: isPublic,
      handle: handle.trim() || null,
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      show_strategies: showStrategies,
      show_contributions: showContributions,
      show_badges: showBadges,
    };

    try {
      const updated = await apiFetch<ProfileSettings>("/profiles/me/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setSettings(updated);
      setMessage({ type: "success", text: "Profile settings saved" });
    } catch (err) {
      if (err instanceof ApiError) {
        setMessage({ type: "error", text: err.message });
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const profileUrl =
    settings?.handle && isPublic
      ? `${window.location.origin}/u/${settings.handle}`
      : null;

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-4">
      {message && (
        <div
          className={cn(
            "rounded border p-3 text-sm",
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-600 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
              : "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Public toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_public"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="is_public" className="text-sm font-medium">
          Make my profile public
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        When enabled, others can view your profile at your unique URL.
      </p>

      {/* Handle */}
      <div>
        <label htmlFor="handle" className="mb-2 block text-sm font-medium">
          Handle (unique username)
        </label>
        <Input
          id="handle"
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="e.g., trendbuilder"
          maxLength={30}
          pattern="[a-zA-Z0-9_]{3,30}"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          3-30 characters, letters, numbers, underscores only
        </p>
      </div>

      {/* Display Name */}
      <div>
        <label htmlFor="display_name" className="mb-2 block text-sm font-medium">
          Display Name
        </label>
        <Input
          id="display_name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your Name"
          maxLength={100}
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="mb-2 block text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A short bio about your trading approach..."
          maxLength={160}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {bio.length}/160 characters
        </p>
      </div>

      {/* Visibility toggles */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Show on public profile:</p>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showStrategies}
              onChange={(e) => setShowStrategies(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Published strategies
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showContributions}
              onChange={(e) => setShowContributions(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Contribution stats
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showBadges}
              onChange={(e) => setShowBadges(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Badges
          </label>
        </div>
      </div>

      {/* Profile URL preview */}
      {profileUrl && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Your public profile URL:
          </p>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            {profileUrl}
          </a>
        </div>
      )}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Profile Settings"}
      </Button>
    </form>
  );
}
