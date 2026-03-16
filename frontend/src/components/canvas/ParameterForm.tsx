"use client";

import { Node } from "@xyflow/react";
import { BlockType, getBlockMeta, ValidationError, TakeProfitLevel } from "@/types/canvas";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getParamConfigs, ParamConfig } from "@/lib/param-configs";
import InfoIcon from "@/components/InfoIcon";
import { paramToGlossaryId, getTooltip } from "@/lib/tooltip-content";

interface ParameterFormProps {
  node: Node;
  onParamsChange: (nodeId: string, params: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  validationErrors: ValidationError[];
  isMobileMode?: boolean;
  compact?: boolean;
}

export default function ParameterForm({
  node,
  onParamsChange,
  onDeleteNode,
  validationErrors,
  isMobileMode = false,
  compact = false,
}: ParameterFormProps) {
  const blockType = node.type as BlockType;
  const blockMeta = getBlockMeta(blockType);
  const params = (node.data?.params as Record<string, unknown>) || {};
  const nodeErrors = validationErrors.filter((e) => e.block_id === node.id);

  const handleChange = (key: string, value: unknown) => {
    onParamsChange(node.id, { ...params, [key]: value });
  };

  const paramConfigs = getParamConfigs(blockType);

  const renderParamInput = (key: string, value: unknown, config: ParamConfig) => {
    if (config.type === "number" && config.presets) {
      return (
        <div className="space-y-2">
          <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-4")}>
            {config.presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleChange(key, preset)}
                className={cn(
                  "rounded border px-3 text-sm font-medium transition-colors",
                  isMobileMode ? "py-2.5" : "py-2",
                  Number(value) === preset
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                )}
              >
                {preset}
              </button>
            ))}
          </div>
          <Input
            type="number"
            value={Number(value)}
            onChange={(e) => handleChange(key, Number(e.target.value))}
            min={config.min}
            max={config.max}
            step={config.step || 1}
            className={cn("h-10", isMobileMode && "h-12 text-base")}
          />
        </div>
      );
    }

    if (config.type === "number") {
      return (
        <Input
          type="number"
          value={Number(value)}
          onChange={(e) => handleChange(key, Number(e.target.value))}
          min={config.min}
          max={config.max}
          step={config.step || 1}
          className={cn("h-10", isMobileMode && "h-12 text-base")}
        />
      );
    }

    if (config.type === "select") {
      const selectedValue = String(
        value ?? config.defaultValue ?? (config.options?.[0]?.value ?? "")
      );
      return (
        <Select value={selectedValue} onValueChange={(val) => handleChange(key, val)}>
          <SelectTrigger
            className={cn(
              "w-full",
              isMobileMode ? "h-12 text-base" : "h-10"
            )}
          >
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {config.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return null;
  };

  const renderTakeProfitLevels = () => {
    let levels: TakeProfitLevel[];
    if (params.levels && Array.isArray(params.levels)) {
      levels = params.levels as TakeProfitLevel[];
    } else if (typeof params.take_profit_pct === "number") {
      levels = [{ profit_pct: params.take_profit_pct, close_pct: 100 }];
    } else {
      levels = [{ profit_pct: 10, close_pct: 100 }];
    }

    const updateLevels = (newLevels: TakeProfitLevel[]) => {
      onParamsChange(node.id, { levels: newLevels });
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

    const totalClose = levels.reduce((sum, l) => sum + l.close_pct, 0);
    const profitsAscending = levels.every((l, i) => i === 0 || l.profit_pct > levels[i - 1].profit_pct);

    return (
      <div className="space-y-3">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">TP Ladder Levels</div>
        {levels.map((level, i) => (
          <div key={i} className="flex items-center gap-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 dark:text-gray-400">Profit %</label>
              <input
                type="number"
                value={level.profit_pct}
                min={0.1}
                max={1000}
                step={0.1}
                onChange={(e) => updateLevel(i, "profit_pct", Number(e.target.value))}
                className={cn(
                  "w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-900",
                  isMobileMode && "h-10 text-base"
                )}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 dark:text-gray-400">Close %</label>
              <input
                type="number"
                value={level.close_pct}
                min={1}
                max={100}
                step={1}
                onChange={(e) => updateLevel(i, "close_pct", Number(e.target.value))}
                className={cn(
                  "w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm bg-white dark:bg-gray-900",
                  isMobileMode && "h-10 text-base"
                )}
              />
            </div>
            {levels.length > 1 && (
              <button
                onClick={() => removeLevel(i)}
                className="mt-4 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {levels.length < 3 && (
          <button
            onClick={addLevel}
            className="w-full rounded border border-dashed border-gray-300 dark:border-gray-600 py-2 text-xs text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            + Add Level
          </button>
        )}
        {totalClose > 100 && (
          <p className="text-[10px] text-red-500 dark:text-red-400">Total close % exceeds 100%</p>
        )}
        {!profitsAscending && (
          <p className="text-[10px] text-red-500 dark:text-red-400">Profit targets must be ascending</p>
        )}
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          Total: {totalClose}% of position
        </p>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", compact ? "p-3" : "p-4")}>
      {/* Header */}
      <div className={cn("flex items-center justify-between", compact && "pb-2 border-b border-gray-200 dark:border-gray-700")}>
        <div>
          <h3 className={cn("font-semibold text-gray-900 dark:text-gray-100", compact ? "text-xs" : "text-sm")}>
            {compact ? (blockMeta?.label || blockType) : "Inspector"}
          </h3>
          {!compact && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {blockMeta?.label || blockType}
            </p>
          )}
        </div>
        <button
          onClick={() => onDeleteNode(node.id)}
          className={cn(
            "flex items-center gap-1.5 rounded border border-red-200 dark:border-red-800 px-3 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors",
            isMobileMode ? "h-10" : "h-8",
            compact && "h-7 px-2"
          )}
        >
          <Trash2 className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
          {!compact && "Delete"}
        </button>
      </div>

      {/* Validation Errors */}
      {nodeErrors.length > 0 && (
        <div className="space-y-2">
          {nodeErrors.map((error, i) => (
            <div key={i} className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3">
              <p className="text-xs text-red-600 dark:text-red-400">
                {error.user_message || error.message}
              </p>
              {error.help_link && (
                <a
                  href={error.help_link}
                  className="mt-1 inline-block text-xs text-red-700 dark:text-red-300 underline hover:text-red-900 dark:hover:text-red-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Parameters */}
      {blockType === "take_profit" ? (
        renderTakeProfitLevels()
      ) : paramConfigs.length > 0 ? (
        <div className={cn("space-y-4", compact && "space-y-3")}>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Parameters</div>
          {paramConfigs.map((config) => {
            const tooltip = getTooltip(paramToGlossaryId(config.key));
            return (
              <div key={config.key} className="space-y-2">
                <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300">
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
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{config.help}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No configurable parameters
          </p>
        </div>
      )}

      {/* Block Metadata - only in full mode */}
      {!compact && blockMeta && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
            {blockMeta.inputs.length > 0 && (
              <p>
                <span className="font-medium">Inputs:</span> {blockMeta.inputs.join(", ")}
              </p>
            )}
            {blockMeta.outputs.length > 0 && (
              <p>
                <span className="font-medium">Outputs:</span> {blockMeta.outputs.join(", ")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
