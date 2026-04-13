"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import type { StrategyTemplate } from "@/types/strategy-template";
import type { Strategy } from "@/types/strategy";

type DifficultyKey = "beginner" | "intermediate" | "advanced";

const DIFFICULTY_CONFIG: Record<
  DifficultyKey,
  { tier: string; tagline: string; badgeClass: string; dotClass: string }
> = {
  beginner: {
    tier: "Beginner",
    tagline: "Start Here",
    badgeClass:
      "border-green-500/30 text-green-700 dark:text-green-400 bg-green-500/5",
    dotClass: "bg-green-500",
  },
  intermediate: {
    tier: "Intermediate",
    tagline: "Level Up",
    badgeClass:
      "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/5",
    dotClass: "bg-amber-500",
  },
  advanced: {
    tier: "Advanced",
    tagline: "Deep Dive",
    badgeClass:
      "border-red-500/30 text-red-700 dark:text-red-400 bg-red-500/5",
    dotClass: "bg-red-500",
  },
};

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function TemplateCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex-1 space-y-3 p-6">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </CardContent>
      <CardFooter className="gap-2 p-6 pt-0">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 flex-1" />
      </CardFooter>
    </Card>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneErrors, setCloneErrors] = useState<Record<string, string>>({});
  const [previewTemplate, setPreviewTemplate] =
    useState<StrategyTemplate | null>(null);

  // Filters
  const [difficulty, setDifficulty] = useState<"all" | DifficultyKey>("all");
  const [asset, setAsset] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("all");
  const [query, setQuery] = useState("");

  const loadTemplates = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<StrategyTemplate[]>("/strategy-templates/");
      setTemplates(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load templates"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleClone = async (templateId: string) => {
    setCloningId(templateId);
    setCloneErrors((prev) => {
      const next = { ...prev };
      delete next[templateId];
      return next;
    });

    try {
      const strategy = await apiFetch<Strategy>(
        `/strategy-templates/${templateId}/clone`,
        { method: "POST" }
      );
      router.push(`/strategies/${strategy.id}`);
    } catch (err) {
      setCloneErrors((prev) => ({
        ...prev,
        [templateId]:
          err instanceof Error ? err.message : "Failed to clone template",
      }));
      setCloningId(null);
    }
  };

  const { assets, timeframes } = useMemo(() => {
    const a = new Set<string>();
    const t = new Set<string>();
    templates.forEach((tpl) => {
      a.add(tpl.asset);
      t.add(tpl.timeframe);
    });
    return {
      assets: Array.from(a).sort(),
      timeframes: Array.from(t).sort(),
    };
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (difficulty !== "all" && tpl.difficulty !== difficulty) return false;
      if (asset !== "all" && tpl.asset !== asset) return false;
      if (timeframe !== "all" && tpl.timeframe !== timeframe) return false;
      if (q) {
        const hay =
          `${tpl.name} ${tpl.description} ${tpl.logic_summary}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [templates, difficulty, asset, timeframe, query]);

  const hasActiveFilters =
    difficulty !== "all" ||
    asset !== "all" ||
    timeframe !== "all" ||
    query.trim().length > 0;

  const clearFilters = () => {
    setDifficulty("all");
    setAsset("all");
    setTimeframe("all");
    setQuery("");
  };

  const difficultyChips: Array<{ key: "all" | DifficultyKey; label: string }> =
    [
      { key: "all", label: "All" },
      { key: "beginner", label: "Beginner" },
      { key: "intermediate", label: "Intermediate" },
      { key: "advanced", label: "Advanced" },
    ];

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/strategies">Strategies</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Templates</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Strategy Templates</h1>
        <p className="text-muted-foreground">
          Start with a proven strategy and customize it to your needs
        </p>
      </div>

      {/* Filter bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {difficultyChips.map((chip) => {
            const active = difficulty === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setDifficulty(chip.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search templates..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
              aria-label="Search templates"
            />
          </div>
          <Select value={asset} onValueChange={setAsset}>
            <SelectTrigger className="w-[160px]" aria-label="Filter by asset">
              <SelectValue placeholder="Asset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assets</SelectItem>
              {assets.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger
              className="w-[160px]"
              aria-label="Filter by timeframe"
            >
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All timeframes</SelectItem>
              {timeframes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <span>{loadError}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTemplates}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Try again
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No templates available yet</p>
            <p className="text-sm text-muted-foreground">
              Templates will appear here once published. You can still build a
              strategy from scratch.
            </p>
          </div>
          <Button asChild>
            <Link href="/strategies/new">
              <Plus className="mr-2 h-4 w-4" />
              Create from scratch
            </Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <p className="font-medium">No templates match your filters</p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const diff = DIFFICULTY_CONFIG[template.difficulty as DifficultyKey];
            const isCloning = cloningId === template.id;
            const cloneError = cloneErrors[template.id];
            return (
              <Card
                key={template.id}
                className="flex flex-col transition-colors hover:border-primary/30"
              >
                <CardContent className="flex-1 space-y-3 p-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {template.name}
                    </h3>
                    {diff && (
                      <Badge
                        variant="outline"
                        className={cn("shrink-0 gap-1.5", diff.badgeClass)}
                        title={diff.tagline}
                      >
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", diff.dotClass)}
                          aria-hidden="true"
                        />
                        {diff.tier}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAsset(template.asset)}
                      className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-md"
                      aria-label={`Filter by asset ${template.asset}`}
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                      >
                        {template.asset}
                      </Badge>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeframe(template.timeframe)}
                      className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-md"
                      aria-label={`Filter by timeframe ${template.timeframe}`}
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                      >
                        {template.timeframe}
                      </Badge>
                    </button>
                  </div>

                  <p className="line-clamp-3 text-sm text-foreground/90">
                    {template.description}
                  </p>

                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Logic
                    </p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {template.logic_summary}
                    </p>
                  </div>

                  {cloneError && (
                    <div
                      role="alert"
                      className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive"
                    >
                      {cloneError}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="gap-2 p-6 pt-0">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    Preview
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleClone(template.id)}
                    disabled={isCloning}
                    aria-busy={isCloning}
                  >
                    {isCloning ? (
                      <>
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        Cloning...
                      </>
                    ) : (
                      "Clone"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog
        open={previewTemplate !== null}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {previewTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <DialogTitle className="text-xl">
                    {previewTemplate.name}
                  </DialogTitle>
                  {DIFFICULTY_CONFIG[
                    previewTemplate.difficulty as DifficultyKey
                  ] && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 gap-1.5",
                        DIFFICULTY_CONFIG[
                          previewTemplate.difficulty as DifficultyKey
                        ].badgeClass
                      )}
                    >
                      {
                        DIFFICULTY_CONFIG[
                          previewTemplate.difficulty as DifficultyKey
                        ].tier
                      }
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-left text-foreground/90">
                  {previewTemplate.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{previewTemplate.asset}</Badge>
                  <Badge variant="secondary">{previewTemplate.timeframe}</Badge>
                </div>

                <section>
                  <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Logic
                  </h4>
                  <p className="text-sm text-foreground/90">
                    {previewTemplate.logic_summary}
                  </p>
                </section>

                <section>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Use cases
                  </h4>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
                    {previewTemplate.use_cases.map((useCase, i) => (
                      <li key={i}>{useCase}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Parameter ranges
                  </h4>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    {Object.entries(previewTemplate.parameter_ranges).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between gap-3 border-b border-border/50 pb-1"
                        >
                          <dt className="font-medium text-foreground">
                            {humanizeKey(key)}
                          </dt>
                          <dd className="text-muted-foreground">{value}</dd>
                        </div>
                      )
                    )}
                  </dl>
                </section>

                {previewTemplate.teaches_description && (
                  <section className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="mb-1 text-xs font-medium text-primary">
                      What this teaches
                    </p>
                    <p className="text-sm text-foreground/90">
                      {previewTemplate.teaches_description}
                    </p>
                  </section>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewTemplate(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const id = previewTemplate.id;
                    setPreviewTemplate(null);
                    handleClone(id);
                  }}
                  disabled={cloningId === previewTemplate.id}
                  aria-busy={cloningId === previewTemplate.id}
                >
                  {cloningId === previewTemplate.id ? (
                    <>
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Cloning...
                    </>
                  ) : (
                    "Clone this template"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
