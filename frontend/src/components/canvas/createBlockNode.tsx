import { ReactNode } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import BaseNode from "./BaseNode";
import { cn } from "@/lib/utils";
import { BLOCK_REGISTRY, BlockCategory, BlockType } from "@/types/canvas";

const HANDLE_Y_POSITIONS: Record<number, number[]> = {
  1: [50],
  2: [38, 66],
  3: [32, 52, 72],
  4: [24, 42, 60, 78],
};

export function distributeHandleY(count: number): number[] {
  return HANDLE_Y_POSITIONS[count] ?? [50];
}

export const CATEGORY_HANDLE_COLOR: Record<BlockCategory, string> = {
  input: "!bg-purple-500",
  indicator: "!bg-blue-500",
  logic: "!bg-amber-500",
  signal: "!bg-green-500",
  risk: "!bg-red-500",
};

function titleCase(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PresentationOptions {
  paramLabels?: Record<string, string>;
  body?: (params: Record<string, unknown>) => ReactNode;
}

export function createBlockNode(type: BlockType, presentation?: PresentationOptions) {
  const meta = BLOCK_REGISTRY.find((b) => b.type === type);
  if (!meta) {
    throw new Error(`createBlockNode: unknown block type "${type}"`);
  }

  const { category, label: registryLabel, inputs, outputs, defaultParams } = meta;
  const handleColor = CATEGORY_HANDLE_COLOR[category];
  const inputPositions = distributeHandleY(inputs.length);
  const outputPositions = distributeHandleY(outputs.length);
  const paramKeys = Object.keys(defaultParams);

  function BlockNode({ data, selected }: NodeProps) {
    const label = typeof data?.label === "string" ? data.label : registryLabel;
    const hasError = typeof data?.hasError === "boolean" ? data.hasError : false;
    const validationMessage =
      typeof data?.validationMessage === "string" ? data.validationMessage : undefined;
    const helpLink =
      typeof data?.helpLink === "string" ? data.helpLink : undefined;
    const isMobileMode =
      typeof data?.isMobileMode === "boolean" ? data.isMobileMode : false;
    const isCompact =
      typeof data?.isCompact === "boolean" ? data.isCompact : false;
    const isExpanded =
      typeof data?.isExpanded === "boolean" ? data.isExpanded : false;
    const summary =
      typeof data?.summary === "string" ? data.summary : undefined;
    const params = (data?.params ?? {}) as Record<string, unknown>;
    const handleSize = isMobileMode ? "!h-[18px] !w-[18px]" : "!h-[11px] !w-[11px]";

    const bodyContent: ReactNode = presentation?.body
      ? presentation.body(params)
      : paramKeys.length > 0
        ? (
            <div className="space-y-0.5 text-xs text-gray-600">
              {paramKeys.map((key) => {
                const displayLabel =
                  presentation?.paramLabels?.[key] ?? titleCase(key);
                const value = params[key] ?? defaultParams[key];
                return (
                  <div key={key}>
                    {displayLabel}: {String(value)}
                  </div>
                );
              })}
            </div>
          )
        : null;

    return (
      <BaseNode
        label={label}
        selected={selected}
        category={category}
        blockType={type}
        hasError={hasError}
        validationMessage={validationMessage}
        helpLink={helpLink}
        isMobileMode={isMobileMode}
        isCompact={isCompact}
        isExpanded={isExpanded}
        summary={summary}
      >
        {inputs.map((id, i) => (
          <Handle
            key={id}
            type="target"
            position={Position.Left}
            id={id}
            style={inputs.length > 1 ? { top: `${inputPositions[i]}%` } : undefined}
            className={cn(handleSize, handleColor)}
          />
        ))}
        {bodyContent}
        {outputs.map((id, i) => (
          <Handle
            key={id}
            type="source"
            position={Position.Right}
            id={id}
            style={outputs.length > 1 ? { top: `${outputPositions[i]}%` } : undefined}
            className={cn(handleSize, handleColor)}
          />
        ))}
      </BaseNode>
    );
  }

  const pascal = type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  BlockNode.displayName = `${pascal}Node`;

  return BlockNode;
}
