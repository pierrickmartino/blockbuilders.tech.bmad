"use client";

import { useState } from "react";
import {
  METRICS_GLOSSARY,
  MetricGlossaryEntry,
} from "@/lib/metrics-glossary-content";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MetricsGlossaryPage() {
  const [search, setSearch] = useState("");

  const filteredMetrics = METRICS_GLOSSARY.filter((metric) => {
    if (!search) return true;
    const query = search.toLowerCase();
    const matchesName = metric.name.toLowerCase().includes(query);
    const matchesKeywords = metric.keywords?.some((kw) =>
      kw.toLowerCase().includes(query)
    );
    return matchesName || matchesKeywords;
  });

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <h1 className="text-2xl font-bold tracking-tight">
        Metrics Glossary
      </h1>
      <p className="mb-6 text-muted-foreground">
        Understand every performance metric shown in backtests. Search below to
        find definitions, formulas, and interpretation guidance.
      </p>

      <div className="mb-8 rounded-lg border bg-muted/30 p-2 dark:bg-muted/10">
        <Input
          type="text"
          placeholder="Search metrics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredMetrics.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No metrics match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ metric }: { metric: MetricGlossaryEntry }) {
  return (
    <Card id={metric.id} className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{metric.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <h3 className="mb-1 font-medium">Definition</h3>
          <p className="text-muted-foreground">{metric.definition}</p>
        </div>

        <div>
          <h3 className="mb-1 font-medium">Formula</h3>
          <p className="rounded bg-muted p-3 font-mono text-xs">
            {metric.formula}
          </p>
        </div>

        <div>
          <h3 className="mb-1 font-medium">Interpretation</h3>
          <p className="text-muted-foreground">{metric.interpretation}</p>
        </div>

        <div>
          <h3 className="mb-1 font-medium">
            Good vs Bad Ranges
          </h3>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <span className="font-medium text-green-600 dark:text-green-400">Good:</span> {metric.ranges.good}
            </li>
            {metric.ranges.acceptable && (
              <li>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">Acceptable:</span>{" "}
                {metric.ranges.acceptable}
              </li>
            )}
            <li>
              <span className="font-medium text-red-500 dark:text-red-400">Poor:</span> {metric.ranges.poor}
            </li>
            <li className="italic">
              Note: {metric.ranges.caveat}
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-1 font-medium">Example</h3>
          <p className="text-muted-foreground">{metric.example}</p>
        </div>
      </CardContent>
    </Card>
  );
}
