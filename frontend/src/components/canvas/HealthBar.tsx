"use client";

import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { evaluateHealthBar, type SegmentStatus } from "@/lib/health-bar-evaluator";

const SEGMENT_CONFIG: Record<
  "entry" | "exit" | "risk",
  Record<SegmentStatus, { icon: React.ReactNode; label: string; className: string }>
> = {
  entry: {
    complete: {
      icon: <CheckIcon />,
      label: "Entry ready",
      className:
        "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800",
    },
    incomplete: {
      icon: <XIcon />,
      label: "Entry needed",
      className:
        "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800",
    },
    warning: {
      icon: <WarningIcon />,
      label: "Entry issue",
      className:
        "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
    },
  },
  exit: {
    complete: {
      icon: <CheckIcon />,
      label: "Exit ready",
      className:
        "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800",
    },
    incomplete: {
      icon: <XIcon />,
      label: "Exit needed",
      className:
        "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800",
    },
    warning: {
      icon: <WarningIcon />,
      label: "Exit issue",
      className:
        "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
    },
  },
  risk: {
    complete: {
      icon: <CheckIcon />,
      label: "Risk managed",
      className:
        "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800",
    },
    incomplete: {
      icon: <XIcon />,
      label: "Risk needed",
      className:
        "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800",
    },
    warning: {
      icon: <WarningIcon />,
      label: "No risk management",
      className:
        "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
    },
  },
};

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface HealthBarProps {
  nodes: Node[];
  edges: Edge[];
}

export function HealthBar({ nodes, edges }: HealthBarProps) {
  const state = useMemo(() => evaluateHealthBar(nodes, edges), [nodes, edges]);

  const segments: Array<"entry" | "exit" | "risk"> = ["entry", "exit", "risk"];

  return (
    <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm transition-all duration-200 ease-in-out dark:border-slate-700 dark:bg-slate-900/90">
      {segments.map((key) => {
        const config = SEGMENT_CONFIG[key][state[key]];
        return (
          <div
            key={key}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-all duration-200 ease-in-out ${config.className}`}
          >
            {config.icon}
            <span>{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}
