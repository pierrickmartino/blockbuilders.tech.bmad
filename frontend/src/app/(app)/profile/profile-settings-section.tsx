"use client";

import { useState, useEffect, useCallback } from "react";
import { ApiError } from "@/lib/api";
import { UsersApiClient } from "@/lib/api/users-client";
import { toast } from "sonner";
import { ProfileSettings, ProfileUpdateRequest } from "@/types/profile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface ProfileSettingsSectionProps {
  onSettingsLoad?: (displayName: string | null) => void;
}

export function ProfileSettingsSection({ onSettingsLoad }: ProfileSettingsSectionProps) {
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    handle?: string;
    displayName?: string;
    bio?: string;
  }>({});

  const applySettings = useCallback((data: ProfileSettings) => {
    setSettings(data);
    setIsPublic(data.is_public);
    setHandle(data.handle || "");
    setDisplayName(data.display_name || "");
    setBio(data.bio || "");
    setShowStrategies(data.show_strategies);
    setShowContributions(data.show_contributions);
    setShowBadges(data.show_badges);
    onSettingsLoad?.(data.display_name);
  }, [onSettingsLoad]);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const data = await UsersApiClient.getProfileSettings();
      applySettings(data);
    } catch {
      setLoadFailed(true);
      toast.error("Failed to load profile settings");
    } finally {
      setIsLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const isDirty =
    settings !== null &&
    (isPublic !== settings.is_public ||
      handle !== (settings.handle ?? "") ||
      displayName !== (settings.display_name ?? "") ||
      bio !== (settings.bio ?? "") ||
      showStrategies !== settings.show_strategies ||
      showContributions !== settings.show_contributions ||
      showBadges !== settings.show_badges);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = validateProfileFields(handle, displayName, bio);
    setFieldErrors(nextErrors);
    if (nextErrors.handle || nextErrors.displayName || nextErrors.bio) {
      toast.error("Check the highlighted profile fields before saving.");
      return;
    }

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
      const updated = await UsersApiClient.updateProfileSettings(data);
      applySettings(updated);
      toast.success("Profile settings saved");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Failed to save settings"
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="Loading profile settings">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="min-w-0 break-words">
          Failed to load profile settings
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchSettings}
          className="min-h-11 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 sm:min-h-0"
        >
          Retry
        </Button>
      </div>
    );
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const profileUrl =
    handle.trim().length >= 3 && isPublic
      ? `${origin}/u/${handle.trim()}`
      : null;

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-4">
      {/* Public toggle — always visible */}
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <label htmlFor="is_public" className="text-sm font-medium">
            Make my profile public
          </label>
          <p id="public-profile-desc" className="mt-1 text-xs text-muted-foreground">
            When enabled, others can view your profile at your unique URL.
          </p>
        </div>
        <Switch
          id="is_public"
          checked={isPublic}
          onCheckedChange={setIsPublic}
          aria-describedby="public-profile-desc"
        />
      </div>

      <div aria-live="polite" className="sr-only">
        {isPublic
          ? "Public profile fields expanded. Enter your handle, display name, and bio."
          : ""}
      </div>

      {/* Progressive disclosure — profile fields only when public is on */}
      {isPublic ? (
        <>
          {/* Handle */}
          <div>
            <label htmlFor="handle" className="mb-2 block text-sm font-medium">
              Handle (unique username)
            </label>
            <Input
              id="handle"
              type="text"
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                setFieldErrors((prev) => ({ ...prev, handle: undefined }));
              }}
              placeholder="e.g., trendbuilder"
              maxLength={30}
              autoCapitalize="none"
              autoCorrect="off"
              aria-invalid={Boolean(fieldErrors.handle)}
              aria-describedby={
                fieldErrors.handle ? "handle-error" : "handle-help"
              }
            />
            <p id="handle-help" className="mt-1 text-xs text-muted-foreground">
              3–30 characters, letters, numbers, underscores only
            </p>
            {fieldErrors.handle && (
              <p id="handle-error" className="mt-1 text-xs text-destructive">
                {fieldErrors.handle}
              </p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label
              htmlFor="display_name"
              className="mb-2 block text-sm font-medium"
            >
              Display Name
            </label>
            <Input
              id="display_name"
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setFieldErrors((prev) => ({
                  ...prev,
                  displayName: undefined,
                }));
              }}
              placeholder="Your Name"
              maxLength={100}
              aria-invalid={Boolean(fieldErrors.displayName)}
              aria-describedby={
                fieldErrors.displayName
                  ? "display-name-error"
                  : "display-name-help"
              }
            />
            <p
              id="display-name-help"
              className="mt-1 text-xs text-muted-foreground"
            >
              Optional. Maximum 100 characters.
            </p>
            {fieldErrors.displayName && (
              <p
                id="display-name-error"
                className="mt-1 text-xs text-destructive"
              >
                {fieldErrors.displayName}
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="mb-2 block text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setFieldErrors((prev) => ({ ...prev, bio: undefined }));
              }}
              placeholder="A short bio about your trading approach..."
              maxLength={160}
              rows={3}
              aria-invalid={Boolean(fieldErrors.bio)}
              aria-describedby={fieldErrors.bio ? "bio-error" : "bio-count"}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus-ring aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive"
            />
            <p id="bio-count" className="mt-1 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">{bio.length}/160</span>{" "}
              characters
            </p>
            {fieldErrors.bio && (
              <p id="bio-error" className="mt-1 text-xs text-destructive">
                {fieldErrors.bio}
              </p>
            )}
          </div>

          {/* Visibility toggles */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Show on public profile:</p>
            <div className="flex flex-col gap-1">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 text-sm">
                <Checkbox
                  id="show-strategies"
                  checked={showStrategies}
                  onCheckedChange={(checked) =>
                    setShowStrategies(checked === true)
                  }
                  aria-describedby="show-strategies-desc"
                />
                <span className="min-w-0 break-words">
                  Published strategies
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="ml-auto shrink-0 rounded text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label="About published strategies"
                    >
                      <HelpCircle className="size-3.5" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent id="show-strategies-desc" side="right">
                    Strategies you have marked as public will appear on your
                    profile page.
                  </TooltipContent>
                </Tooltip>
              </label>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 text-sm">
                <Checkbox
                  id="show-contributions"
                  checked={showContributions}
                  onCheckedChange={(checked) =>
                    setShowContributions(checked === true)
                  }
                  aria-describedby="show-contributions-desc"
                />
                <span className="min-w-0 break-words">Contribution stats</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="ml-auto shrink-0 rounded text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label="About contribution stats"
                    >
                      <HelpCircle className="size-3.5" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent id="show-contributions-desc" side="right">
                    Displays the total number of backtests you have run and
                    strategies you have published.
                  </TooltipContent>
                </Tooltip>
              </label>

              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 text-sm">
                <Checkbox
                  id="show-badges"
                  checked={showBadges}
                  onCheckedChange={(checked) =>
                    setShowBadges(checked === true)
                  }
                  aria-describedby="show-badges-desc"
                />
                <span className="min-w-0 break-words">Badges</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="ml-auto shrink-0 rounded text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label="About badges"
                    >
                      <HelpCircle className="size-3.5" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent id="show-badges-desc" side="right">
                    Achievement badges earned for milestones like early access,
                    top strategies, and community participation.
                  </TooltipContent>
                </Tooltip>
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
                className="break-all text-sm text-primary underline"
              >
                {profileUrl}
              </a>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Share your strategies with other traders. Enable your public profile
          to get a shareable link and showcase your published work.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
        {isDirty && (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        )}
      </div>
    </form>
  );
}

function validateProfileFields(
  handle: string,
  displayName: string,
  bio: string
) {
  const errors: {
    handle?: string;
    displayName?: string;
    bio?: string;
  } = {};
  const trimmedHandle = handle.trim();

  if (trimmedHandle && !/^[a-zA-Z0-9_]{3,30}$/.test(trimmedHandle)) {
    errors.handle =
      "Use 3–30 characters with letters, numbers, and underscores only.";
  }

  if (displayName.trim().length > 100) {
    errors.displayName = "Display name must be 100 characters or fewer.";
  }

  if (bio.trim().length > 160) {
    errors.bio = "Bio must be 160 characters or fewer.";
  }

  return errors;
}
