"use client";

import { useState } from "react";
import {
  METRICS_GLOSSARY,
  MetricGlossaryEntry,
} from "@/lib/metrics-glossary-content";

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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">
        Metrics Glossary
      </h1>
      <p className="mb-6 text-gray-600">
        Understand every performance metric shown in backtests. Search below to
        find definitions, formulas, and interpretation guidance.
      </p>

      <input
        type="text"
        placeholder="Search metrics..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-8 w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {filteredMetrics.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">No metrics match your search.</p>
        </div>
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
    <div
      id={metric.id}
      className="scroll-mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        {metric.name}
      </h2>

      <div className="space-y-4 text-sm text-gray-700">
        <div>
          <h3 className="mb-1 font-medium text-gray-900">Definition</h3>
          <p>{metric.definition}</p>
        </div>

        <div>
          <h3 className="mb-1 font-medium text-gray-900">Formula</h3>
          <p className="rounded bg-gray-50 p-3 font-mono text-xs">
            {metric.formula}
          </p>
        </div>

        <div>
          <h3 className="mb-1 font-medium text-gray-900">Interpretation</h3>
          <p>{metric.interpretation}</p>
        </div>

        <div>
          <h3 className="mb-1 font-medium text-gray-900">
            Good vs Bad Ranges
          </h3>
          <ul className="mt-2 space-y-1">
            <li>
              <span className="font-medium">Good:</span> {metric.ranges.good}
            </li>
            {metric.ranges.acceptable && (
              <li>
                <span className="font-medium">Acceptable:</span>{" "}
                {metric.ranges.acceptable}
              </li>
            )}
            <li>
              <span className="font-medium">Poor:</span> {metric.ranges.poor}
            </li>
            <li className="italic text-gray-600">
              Note: {metric.ranges.caveat}
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-1 font-medium text-gray-900">Example</h3>
          <p>{metric.example}</p>
        </div>
      </div>
    </div>
  );
}
