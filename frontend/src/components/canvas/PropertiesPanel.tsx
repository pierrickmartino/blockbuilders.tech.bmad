"use client";

import { Node } from "@xyflow/react";
import { BlockType, getBlockMeta, ValidationError, TakeProfitLevel } from "@/types/canvas";
import InfoIcon from "@/components/InfoIcon";
import { paramToGlossaryId, getTooltip } from "@/lib/tooltip-content";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onParamsChange: (nodeId: string, params: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  validationErrors: ValidationError[];
}

export default function PropertiesPanel({
  selectedNode,
  onParamsChange,
  onDeleteNode,
  validationErrors,
}: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-4 text-center text-sm text-gray-500">
        <div>
          <p className="font-medium">No block selected</p>
          <p className="mt-1 text-xs">Click a block to view its properties</p>
        </div>
      </div>
    );
  }

  const blockType = selectedNode.type as BlockType;
  const blockMeta = getBlockMeta(blockType);
  const params = (selectedNode.data?.params as Record<string, unknown>) || {};
  const nodeErrors = validationErrors.filter((e) => e.block_id === selectedNode.id);

  const handleChange = (key: string, value: unknown) => {
    onParamsChange(selectedNode.id, { ...params, [key]: value });
  };

  // TP Levels editor for take_profit block
  const renderTakeProfitLevels = () => {
    // Support both legacy and new format
    let levels: TakeProfitLevel[];
    if (params.levels && Array.isArray(params.levels)) {
      levels = params.levels as TakeProfitLevel[];
    } else if (typeof params.take_profit_pct === "number") {
      levels = [{ profit_pct: params.take_profit_pct, close_pct: 100 }];
    } else {
      levels = [{ profit_pct: 10, close_pct: 100 }];
    }

    const updateLevels = (newLevels: TakeProfitLevel[]) => {
      onParamsChange(selectedNode.id, { levels: newLevels });
    };

    const updateLevel = (index: number, field: "profit_pct" | "close_pct", value: number) => {
      const newLevels = [...levels];
      newLevels[index] = { ...newLevels[index], [field]: value };
      updateLevels(newLevels);
    };

    const addLevel = () => {
      if (levels.length >= 3) return;
      const lastProfit = levels[levels.length - 1]?.profit_pct || 10;
      updateLevels([...levels, { profit_pct: lastProfit + 20, close_pct: 25 }]);
    };

    const removeLevel = (index: number) => {
      if (levels.length <= 1) return;
      updateLevels(levels.filter((_, i) => i !== index));
    };

    // Validation
    const totalClose = levels.reduce((sum, l) => sum + l.close_pct, 0);
    const profitsAscending = levels.every((l, i) => i === 0 || l.profit_pct > levels[i - 1].profit_pct);

    return (
      <div className="space-y-3">
        <div className="text-xs font-medium text-gray-500">TP Ladder Levels</div>
        {levels.map((level, i) => (
          <div key={i} className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 p-2">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500">Profit %</label>
              <input
                type="number"
                value={level.profit_pct}
                min={0.1}
                max={1000}
                step={0.1}
                onChange={(e) => updateLevel(i, "profit_pct", Number(e.target.value))}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500">Close %</label>
              <input
                type="number"
                value={level.close_pct}
                min={1}
                max={100}
                step={1}
                onChange={(e) => updateLevel(i, "close_pct", Number(e.target.value))}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
            {levels.length > 1 && (
              <button
                onClick={() => removeLevel(i)}
                className="mt-4 text-xs text-red-500 hover:text-red-700"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {levels.length < 3 && (
          <button
            onClick={addLevel}
            className="w-full rounded border border-dashed border-gray-300 py-1 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
          >
            + Add Level
          </button>
        )}
        {totalClose > 100 && (
          <p className="text-[10px] text-red-500">Total close % exceeds 100%</p>
        )}
        {!profitsAscending && (
          <p className="text-[10px] text-red-500">Profit targets must be ascending</p>
        )}
        <p className="text-[10px] text-gray-400">
          Total: {totalClose}% of position
        </p>
      </div>
    );
  };

  const renderParamInput = (key: string, value: unknown, config: ParamConfig) => {
    if (config.type === "select") {
      return (
        <select
          value={String(value)}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
        >
          {config.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (config.type === "number") {
      return (
        <input
          type="number"
          value={Number(value)}
          min={config.min}
          max={config.max}
          step={config.step || 1}
          onChange={(e) => handleChange(key, Number(e.target.value))}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
        />
      );
    }

    return null;
  };

  const paramConfigs = getParamConfigs(blockType);

  return (
    <div className="h-full overflow-y-auto bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Properties</h3>
        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Block Type</label>
          <div className="mt-1 text-sm font-medium text-gray-900">
            {blockMeta?.label || blockType}
          </div>
        </div>

        {nodeErrors.length > 0 && (
          <div className="rounded border border-red-200 bg-red-50 p-2">
            {nodeErrors.map((error, i) => (
              <p key={i} className="text-xs text-red-600">
                {error.message}
              </p>
            ))}
          </div>
        )}

        {blockType === "take_profit" ? (
          renderTakeProfitLevels()
        ) : paramConfigs.length > 0 ? (
          <div className="space-y-3">
            <div className="text-xs font-medium text-gray-500">Parameters</div>
            {paramConfigs.map((config) => {
              const tooltip = getTooltip(paramToGlossaryId(config.key));
              return (
                <div key={config.key}>
                  <label className="mb-1 flex items-center gap-1 text-xs text-gray-600">
                    <span title={tooltip?.short}>{config.label}</span>
                    <InfoIcon
                      tooltip={tooltip}
                      className="flex-shrink-0"
                    />
                  </label>
                  {renderParamInput(
                    config.key,
                    params[config.key] ?? config.defaultValue,
                    config
                  )}
                  {config.help && (
                    <p className="mt-0.5 text-[10px] text-gray-400">{config.help}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {blockMeta && (
          <div className="border-t pt-3">
            <div className="text-xs text-gray-400">
              {blockMeta.inputs.length > 0 && (
                <p>Inputs: {blockMeta.inputs.join(", ")}</p>
              )}
              {blockMeta.outputs.length > 0 && (
                <p>Outputs: {blockMeta.outputs.join(", ")}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ParamConfig {
  key: string;
  label: string;
  type: "number" | "select";
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  help?: string;
}

function getParamConfigs(blockType: BlockType): ParamConfig[] {
  switch (blockType) {
    case "price":
      return [
        {
          key: "source",
          label: "Price Source",
          type: "select",
          defaultValue: "close",
          options: [
            { value: "open", label: "Open" },
            { value: "high", label: "High" },
            { value: "low", label: "Low" },
            { value: "close", label: "Close" },
          ],
        },
      ];
    case "constant":
      return [
        {
          key: "value",
          label: "Value",
          type: "number",
          defaultValue: 0,
          min: -1000000,
          max: 1000000,
          step: 0.01,
          help: "Fixed numeric value (-1M to 1M)",
        },
      ];
    case "sma":
    case "ema":
      return [
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: 20,
          min: 1,
          max: 500,
          help: "Number of candles (1-500)",
        },
      ];
    case "rsi":
      return [
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: 14,
          min: 2,
          max: 100,
          help: "RSI period (2-100)",
        },
      ];
    case "macd":
      return [
        {
          key: "fast_period",
          label: "Fast Period",
          type: "number",
          defaultValue: 12,
          min: 1,
          max: 50,
        },
        {
          key: "slow_period",
          label: "Slow Period",
          type: "number",
          defaultValue: 26,
          min: 1,
          max: 200,
        },
        {
          key: "signal_period",
          label: "Signal Period",
          type: "number",
          defaultValue: 9,
          min: 1,
          max: 50,
        },
      ];
    case "bollinger":
      return [
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: 20,
          min: 1,
          max: 500,
        },
        {
          key: "stddev",
          label: "Std Dev",
          type: "number",
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
      ];
    case "atr":
      return [
        {
          key: "period",
          label: "Period",
          type: "number",
          defaultValue: 14,
          min: 1,
          max: 500,
        },
      ];
    case "compare":
      return [
        {
          key: "operator",
          label: "Operator",
          type: "select",
          defaultValue: ">",
          options: [
            { value: ">", label: "> (Greater than)" },
            { value: "<", label: "< (Less than)" },
            { value: ">=", label: ">= (Greater or equal)" },
            { value: "<=", label: "<= (Less or equal)" },
          ],
        },
      ];
    case "crossover":
      return [
        {
          key: "direction",
          label: "Direction",
          type: "select",
          defaultValue: "crosses_above",
          options: [
            { value: "crosses_above", label: "Crosses Above" },
            { value: "crosses_below", label: "Crosses Below" },
          ],
        },
      ];
    case "position_size":
      return [
        {
          key: "value",
          label: "Position Size (%)",
          type: "number",
          defaultValue: 5,
          min: 1,
          max: 100,
          help: "% of equity per trade",
        },
      ];
    case "take_profit":
      // Handled by custom renderTakeProfitLevels
      return [];
    case "stop_loss":
      return [
        {
          key: "stop_loss_pct",
          label: "Stop Loss (%)",
          type: "number",
          defaultValue: 5,
          min: 0.1,
          max: 100,
          step: 0.1,
          help: "Exit when loss reaches this %",
        },
      ];
    case "yesterday_close":
      // No params - zero config
      return [];
    case "max_drawdown":
      return [
        {
          key: "max_drawdown_pct",
          label: "Max Drawdown (%)",
          type: "number",
          defaultValue: 10,
          min: 0.1,
          max: 100,
          step: 0.1,
          help: "Exit when equity drawdown exceeds this %",
        },
      ];
    case "time_exit":
      return [
        {
          key: "bars",
          label: "Bars in Trade",
          type: "number",
          defaultValue: 10,
          min: 1,
          max: 1000,
          step: 1,
          help: "Exit after N bars in position",
        },
      ];
    case "trailing_stop":
      return [
        {
          key: "trail_pct",
          label: "Trail (%)",
          type: "number",
          defaultValue: 5,
          min: 0.1,
          max: 100,
          step: 0.1,
          help: "Exit when price drops by % from highest close",
        },
      ];
    default:
      return [];
  }
}
