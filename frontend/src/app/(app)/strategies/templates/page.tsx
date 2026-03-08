"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StrategyTemplate } from "@/types/strategy-template";
import type { Strategy } from "@/types/strategy";

const DIFFICULTY_CONFIG: Record<string, { label: string; className: string }> = {
  beginner: {
    label: "Start Here",
    className: "border-green-500/30 text-green-600 dark:text-green-400",
  },
  intermediate: {
    label: "Level Up",
    className: "border-amber-500/30 text-amber-600 dark:text-amber-400",
  },
  advanced: {
    label: "Deep Dive",
    className: "border-red-500/30 text-red-600 dark:text-red-400",
  },
};

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await apiFetch<StrategyTemplate[]>("/strategy-templates/");
        setTemplates(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load templates"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const handleClone = async (templateId: string) => {
    setCloningId(templateId);
    setError(null);

    try {
      const strategy = await apiFetch<Strategy>(
        `/strategy-templates/${templateId}/clone`,
        {
          method: "POST",
        }
      );
      router.push(`/strategies/${strategy.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to clone template"
      );
      setCloningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl p-4 md:p-6">
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Strategy Templates</h1>
        <p className="text-muted-foreground">
          Start with a proven strategy and customize it to your needs
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          No templates available yet
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group flex flex-col transition-all duration-200 hover:border-primary/20 hover:shadow-md">
              <CardContent className="flex-1 p-6">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-lg font-semibold tracking-tight">{template.name}</h3>
                  {DIFFICULTY_CONFIG[template.difficulty] && (
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${DIFFICULTY_CONFIG[template.difficulty].className}`}
                    >
                      {DIFFICULTY_CONFIG[template.difficulty].label}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 mb-3">
                  <Badge variant="secondary">{template.asset}</Badge>
                  <Badge variant="secondary">{template.timeframe}</Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {template.description}
                </p>

                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Logic:</p>
                  <p className="text-sm text-muted-foreground">
                    {template.logic_summary}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Use cases:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {template.use_cases.map((useCase, i) => (
                      <li key={i} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Parameter ranges:</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {Object.entries(template.parameter_ranges).map(
                      ([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {value}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {template.teaches_description && (
                  <div className="mb-6 rounded-lg border border-primary/10 bg-primary/5 p-3">
                    <p className="text-xs font-medium text-primary mb-1">What this teaches</p>
                    <p className="text-sm text-muted-foreground">
                      {template.teaches_description}
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => handleClone(template.id)}
                  disabled={cloningId === template.id}
                >
                  {cloningId === template.id
                    ? "Cloning..."
                    : "Clone Template"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
