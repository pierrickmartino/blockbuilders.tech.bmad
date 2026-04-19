import { AlertTriangle } from 'lucide-react';
import { EntryExplanation, ExitExplanation } from '@/types/backtest';

interface TradeExplanationProps {
  entry?: EntryExplanation | null;
  exit?: ExitExplanation | null;
  partial?: boolean;
}

function formatExitSummary(exit: ExitExplanation): string {
  const details = exit.details ?? {};
  const tpPrice = typeof details.tp_price === 'number' ? details.tp_price : null;
  const slPrice = typeof details.sl_price === 'number' ? details.sl_price : null;

  switch (exit.reason_type) {
    case 'tp':
      return tpPrice !== null ? `Take profit hit at ${tpPrice.toFixed(2)}` : 'Take profit triggered';
    case 'sl':
      return slPrice !== null ? `Stop loss hit at ${slPrice.toFixed(2)}` : 'Stop loss triggered';
    case 'signal':
      return 'Exit signal triggered';
    case 'end_of_data':
      return 'Backtest period ended';
    case 'trailing_stop':
      return 'Trailing stop triggered';
    case 'time_exit':
      return 'Time-based exit: maximum hold duration reached';
    case 'max_dd':
    case 'max_drawdown':
      return 'Max drawdown threshold hit';
    default: {
      const summary = exit.summary.trim();
      if (!summary) return 'Exit triggered';
      if (!summary.startsWith('Exit:')) return summary;

      const reason = summary
        .slice('Exit:'.length)
        .trim()
        .replace(/_/g, ' ');

      if (!reason) return 'Exit triggered';
      return `Exit triggered by ${reason}`;
    }
  }
}

function isNegativeExit(reasonType: string): boolean {
  return ['sl', 'max_dd', 'max_drawdown'].includes(reasonType);
}

function isPositiveExit(reasonType: string): boolean {
  return reasonType === 'tp';
}

export default function TradeExplanation({ entry, exit, partial }: TradeExplanationProps) {
  if (partial) {
    return (
      <div className="flex items-center gap-2.5 rounded border border-warning/20 bg-warning/5 p-3 text-sm text-warning">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        Trade explanation unavailable. Core trade details shown below.
      </div>
    );
  }

  if (!entry && !exit) {
    return null;
  }

  const exitText = exit ? formatExitSummary(exit) : '';
  const exitConditions = exitText.trim().length > 0 ? [exitText.trim()] : [];

  const exitBg = exit
    ? isNegativeExit(exit.reason_type)
      ? 'bg-destructive/5'
      : isPositiveExit(exit.reason_type)
        ? 'bg-success/5'
        : 'bg-muted'
    : 'bg-muted';

  const exitIcon = exit
    ? isNegativeExit(exit.reason_type)
      ? '×'
      : isPositiveExit(exit.reason_type)
        ? '✓'
        : '—'
    : '—';

  const exitIconColor = exit
    ? isNegativeExit(exit.reason_type)
      ? 'text-destructive'
      : isPositiveExit(exit.reason_type)
        ? 'text-success'
        : 'text-muted-foreground'
    : 'text-muted-foreground';

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Trade Logic</h3>

      {entry && (
        <div className="rounded bg-success/5 p-3">
          <div className="text-xs font-medium text-success mb-1">Entry</div>
          {entry.conditions.length === 0 && entry.summary.trim().length > 0 && (
            <div className="text-sm text-foreground">{entry.summary}</div>
          )}
          {entry.conditions.length > 0 && (
            <div className="mt-2 space-y-1">
              {entry.conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-success font-medium">✓</span>
                  <span>{cond}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {exit && (
        <div className={`rounded p-3 ${exitBg}`}>
          <div className="text-xs font-medium text-muted-foreground mb-1">Exit</div>
          {exitConditions.length === 0 && exit.summary.trim().length > 0 && (
            <div className="text-sm text-foreground">{exit.summary}</div>
          )}
          {exitConditions.length > 0 && (
            <div className="mt-2 space-y-1">
              {exitConditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={`${exitIconColor} font-medium`}>{exitIcon}</span>
                  <span>{cond}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
