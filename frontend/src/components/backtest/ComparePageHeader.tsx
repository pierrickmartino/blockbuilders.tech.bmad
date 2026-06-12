import { HowBacktestsWorkLink } from "@/components/HowBacktestsWorkLink";

/** Header for the run-comparison page (ADR-0017: linked from every result). */
export function ComparePageHeader() {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold tracking-tight">Compare Backtests</h2>
      <HowBacktestsWorkLink />
    </div>
  );
}
