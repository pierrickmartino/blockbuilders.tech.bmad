"use client";

import { Node } from "@xyflow/react";
import { BlockType, getBlockMeta, ValidationError } from "@/types/canvas";

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

        {paramConfigs.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-medium text-gray-500">Parameters</div>
            {paramConfigs.map((config) => (
              <div key={config.key}>
                <label className="mb-1 block text-xs text-gray-600">
                  {config.label}
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
            ))}
          </div>
        )}

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
      return [
        {
          key: "take_profit_pct",
          label: "Take Profit (%)",
          type: "number",
          defaultValue: 10,
          min: 0.1,
          max: 100,
          step: 0.1,
          help: "Exit when profit reaches this %",
        },
      ];
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
    default:
      return [];
  }
}
