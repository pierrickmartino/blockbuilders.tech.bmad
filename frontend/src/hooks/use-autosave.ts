import { useCallback, useEffect, useRef, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import { apiFetch } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import { reactFlowToDefinition } from "@/lib/canvas-utils";
import type { ValidationError, ValidationResponse } from "@/types/canvas";

interface UseAutosaveOptions {
  strategyId: string;
  userId?: string;
  onValidationErrors: (errors: ValidationError[]) => void;
  onError: (message: string) => void;
  onStrategyRefresh: () => void;
  onVersionsRefresh: (options?: { loadDetail?: boolean }) => void;
}

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export function useAutosave({
  strategyId,
  userId,
  onValidationErrors,
  onError,
  onStrategyRefresh,
  onVersionsRefresh,
}: UseAutosaveOptions) {
  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const autosaveStateRef = useRef<AutosaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [relativeTimestamp, setRelativeTimestamp] = useState("");
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const isSavingVersionRef = useRef(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const lastSavedDefinitionRef = useRef("");

  useEffect(() => {
    isSavingVersionRef.current = isSavingVersion;
  }, [isSavingVersion]);

  useEffect(() => {
    autosaveStateRef.current = autosaveState;
  }, [autosaveState]);

  useEffect(() => {
    if (!lastSavedAt) {
      setRelativeTimestamp("");
      return;
    }
    const update = () => setRelativeTimestamp(formatRelativeTime(lastSavedAt));
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  const markSaved = useCallback((nodes: Node[], edges: Edge[]) => {
    const now = new Date();
    setLastSavedAt(now);
    lastSavedDefinitionRef.current = JSON.stringify(reactFlowToDefinition(nodes, edges));
    setAutosaveState("saved");
  }, []);

  const hasUnsavedChanges = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      if (!lastSavedDefinitionRef.current) return false;
      return JSON.stringify(reactFlowToDefinition(nodes, edges)) !== lastSavedDefinitionRef.current;
    },
    []
  );

  const triggerAutosave = useCallback(
    async (currentNodes: Node[], currentEdges: Edge[]) => {
      if (isSavingVersionRef.current || autosaveStateRef.current === "saving") return;

      const currentDefinition = JSON.stringify(reactFlowToDefinition(currentNodes, currentEdges));
      if (currentDefinition === lastSavedDefinitionRef.current) {
        return;
      }

      setAutosaveState("saving");
      onValidationErrors([]);

      try {
        const definition = reactFlowToDefinition(currentNodes, currentEdges);

        const validation = await apiFetch<ValidationResponse>(
          `/strategies/${strategyId}/validate`,
          { method: "POST", body: JSON.stringify(definition) }
        );

        if (validation.status === "invalid") {
          onValidationErrors(validation.errors);
          setAutosaveState("error");
          return;
        }

        await apiFetch(`/strategies/${strategyId}/versions`, {
          method: "POST",
          body: JSON.stringify({ definition }),
        });

        markSaved(currentNodes, currentEdges);
        onVersionsRefresh({ loadDetail: false });
        onStrategyRefresh();
      } catch {
        setAutosaveState("error");
      }
    },
    [strategyId, onValidationErrors, onVersionsRefresh, onStrategyRefresh, markSaved]
  );

  const saveVersion = useCallback(
    async (nodes: Node[], edges: Edge[], clearAutosaveTimer?: () => void) => {
      if (isSavingVersion) return;

      clearAutosaveTimer?.();
      setIsSavingVersion(true);
      setSaveMessage(null);
      onValidationErrors([]);

      try {
        const definition = reactFlowToDefinition(nodes, edges);

        const validation = await apiFetch<ValidationResponse>(
          `/strategies/${strategyId}/validate`,
          { method: "POST", body: JSON.stringify(definition) }
        );

        if (validation.status === "invalid") {
          onValidationErrors(validation.errors);
          onError("Strategy has validation errors. Please fix the issues and try again.");
          setIsSavingVersion(false);
          return;
        }

        await apiFetch(`/strategies/${strategyId}/versions`, {
          method: "POST",
          body: JSON.stringify({ definition }),
        });

        await onVersionsRefresh();
        await onStrategyRefresh();

        markSaved(nodes, edges);
        trackEvent("strategy_saved", { strategy_id: strategyId }, userId);
        setSaveMessage("Version saved successfully");
        setTimeout(() => setSaveMessage(null), 3000);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to save version");
      } finally {
        setIsSavingVersion(false);
      }
    },
    [isSavingVersion, strategyId, userId, onValidationErrors, onError, onVersionsRefresh, onStrategyRefresh, markSaved]
  );

  const initSavedSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    lastSavedDefinitionRef.current = JSON.stringify(reactFlowToDefinition(nodes, edges));
  }, []);

  return {
    autosaveState,
    lastSavedAt,
    relativeTimestamp,
    isSavingVersion,
    saveMessage,
    setSaveMessage,
    hasUnsavedChanges,
    triggerAutosave,
    saveVersion,
    initSavedSnapshot,
    markSaved,
  };
}
