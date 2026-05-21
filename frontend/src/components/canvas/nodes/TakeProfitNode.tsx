import { createBlockNode } from "../createBlockNode";

export default createBlockNode("take_profit", {
  body: (params) => {
    const p = params as {
      levels?: Array<{
        percent?: number;
        ratio?: number;
        profit_pct?: number;
        close_pct?: number;
      }>;
      take_profit_pct?: number;
    };
    const levels =
      Array.isArray(p.levels) && p.levels.length > 0
        ? p.levels.map((level) => ({
            percent: level.percent ?? level.profit_pct ?? 5,
            ratio: level.ratio ?? level.close_pct ?? 100,
          }))
        : typeof p.take_profit_pct === "number"
          ? [{ percent: p.take_profit_pct, ratio: 100 }]
          : [{ percent: 5, ratio: 100 }];
    return (
      <div className="space-y-0.5 text-xs text-gray-600">
        {levels.map((level, i) => (
          <div key={i}>
            Level {i + 1}: {level.percent}% @ {level.ratio}%
          </div>
        ))}
      </div>
    );
  },
});
