import { Strategy } from "@/types/strategy";

export type NextActionKind =
  | "review-backtest"
  | "continue-editing"
  | "run-backtest"
  | "create-strategy";

export interface NextAction {
  kind: NextActionKind;
  label: string;
  href: string;
  strategy?: Strategy;
}

export interface LastRunSignal {
  strategyId: string;
  name: string;
  returnPct: number | null;
  drawdownPct: number | null;
  runAt: string;
}

export interface DashboardSignals {
  draftsCount: number;
  lastRun: LastRunSignal | null;
  freshness: { mostRecentRunAt: string | null };
}

export function selectNextAction(strategies: Strategy[]): NextAction {
  const active = strategies.filter((s) => !s.is_archived);

  if (active.length === 0) {
    return { kind: "create-strategy", label: "Create a strategy", href: "/strategies" };
  }

  // Rule 1: strategy whose last_run_at is newer than its updated_at
  const reviewCandidate = active
    .filter(
      (s) =>
        s.last_run_at != null &&
        new Date(s.last_run_at) > new Date(s.updated_at)
    )
    .sort(
      (a, b) =>
        new Date(b.last_run_at!).getTime() - new Date(a.last_run_at!).getTime()
    )[0];

  if (reviewCandidate) {
    return {
      kind: "review-backtest",
      label: "Review last backtest",
      href: `/strategies/${reviewCandidate.id}/backtest`,
      strategy: reviewCandidate,
    };
  }

  // Rule 2: strategy with no backtest run — most recently updated draft
  const draftCandidate = active
    .filter((s) => s.last_run_at == null)
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];

  if (draftCandidate) {
    return {
      kind: "continue-editing",
      label: `Continue editing ${draftCandidate.name}`,
      href: `/strategies/${draftCandidate.id}`,
      strategy: draftCandidate,
    };
  }

  // Rule 3: all strategies have been run — link most recently updated
  const runCandidate = active.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0];

  return {
    kind: "run-backtest",
    label: "Run a backtest",
    href: `/strategies/${runCandidate.id}/backtest`,
    strategy: runCandidate,
  };
}

export function computeSignals(strategies: Strategy[]): DashboardSignals {
  const active = strategies.filter((s) => !s.is_archived);

  const draftsCount = active.filter((s) => s.last_run_at == null).length;

  const withRuns = active
    .filter((s) => s.last_run_at != null)
    .sort(
      (a, b) =>
        new Date(b.last_run_at!).getTime() - new Date(a.last_run_at!).getTime()
    );

  const mostRecentRun = withRuns[0] ?? null;

  const lastRun: LastRunSignal | null = mostRecentRun
    ? {
        strategyId: mostRecentRun.id,
        name: mostRecentRun.name,
        returnPct: mostRecentRun.latest_total_return_pct ?? null,
        drawdownPct: mostRecentRun.latest_max_drawdown_pct ?? null,
        runAt: mostRecentRun.last_run_at!,
      }
    : null;

  // Most recent last_run_at or last_auto_run_at across the workspace
  const allRunAts = active
    .flatMap((s) =>
      ([s.last_run_at, s.last_auto_run_at] as (string | null | undefined)[])
        .filter((v): v is string => v != null)
    )
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return {
    draftsCount,
    lastRun,
    freshness: { mostRecentRunAt: allRunAts[0] ?? null },
  };
}
