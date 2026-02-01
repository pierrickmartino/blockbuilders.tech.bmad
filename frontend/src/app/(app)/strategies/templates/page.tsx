"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StrategyTemplate } from "@/types/strategy-template";
import type { Strategy } from "@/types/strategy";

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
        <h1 className="text-2xl font-bold">Strategy Templates</h1>
        <p className="text-muted-foreground">
          Start with a proven strategy and customize it to your needs
        </p>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
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
            <Card key={template.id} className="flex flex-col">
              <CardContent className="flex-1 p-6">
                <h3 className="font-semibold text-lg mb-3">{template.name}</h3>

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

                <div className="mb-6">
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
