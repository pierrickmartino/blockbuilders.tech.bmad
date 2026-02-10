import { EntryExplanation, ExitExplanation } from '@/types/backtest';

interface TradeExplanationProps {
  entry?: EntryExplanation | null;
  exit?: ExitExplanation | null;
  partial?: boolean;
}

export default function TradeExplanation({ entry, exit, partial }: TradeExplanationProps) {
  if (partial) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Trade explanation unavailable. Core trade details shown below.
      </div>
    );
  }

  if (!entry && !exit) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Trade Logic</h3>

      {entry && (
        <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950">
          <div className="text-xs font-medium text-green-800 mb-1 dark:text-green-200">Entry</div>
          <div className="text-sm text-gray-900 dark:text-gray-100">{entry.summary}</div>
          {entry.conditions.length > 0 && (
            <div className="mt-2 space-y-1">
              {entry.conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span className="text-green-600 font-medium dark:text-green-400">✓</span>
                  <span>{cond}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {exit && (
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
          <div className="text-xs font-medium text-gray-800 mb-1 dark:text-gray-300">Exit</div>
          <div className="text-sm text-gray-900 dark:text-gray-100">{exit.summary}</div>
        </div>
      )}
    </section>
  );
}
