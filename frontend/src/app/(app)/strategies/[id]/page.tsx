"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Node, Edge, ReactFlowInstance, ReactFlowProvider } from "@xyflow/react";
import { StrategiesApiClient } from "@/lib/api/strategies-client";
import { StrategyTagsApiClient } from "@/lib/api/strategy-tags-client";
import { useDisplay } from "@/context/display";
import { CanvasStateProvider, useCanvasState } from "@/context/CanvasStateContext";
import { Strategy, StrategyTag, StrategyVersion, StrategyVersionDetail, StrategyExportFile } from "@/types/strategy";
import {
  StrategyDefinition,
  ValidationError,
  BlockMeta,
  ExplanationResult,
} from "@/types/canvas";
import {
  definitionToReactFlow,
  createDefaultDefinition,
} from "@/lib/canvas-utils";
import { copyToClipboard, pasteFromClipboard } from "@/lib/clipboard-utils";
import { trackStrategyView } from "@/lib/recent-views";
import { generateExplanation } from "@/lib/explanation-generator";
import StrategyCanvas, { CanvasEdge } from "@/components/canvas/StrategyCanvas";
import BlockPalette from "@/components/canvas/BlockPalette";
import BlockLibrarySheet from "@/components/canvas/BlockLibrarySheet";
import { useIndicatorMode } from "@/hooks/useIndicatorMode";
import { useStrategyDraft } from "@/hooks/use-strategy-draft";
import { useStrategyAlerts } from "@/hooks/use-strategy-alerts";
import InspectorPanel from "@/components/canvas/InspectorPanel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Settings as SettingsIcon,
  Loader2,
  Plus,
} from "lucide-react";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { isInputElement } from "@/lib/keyboard-shortcuts";
import { StrategyHeader } from "./_components/StrategyHeader";
import { StrategySettingsSheet } from "./_components/StrategySettingsSheet";
import CommandPalette from "@/components/canvas/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";

interface Props {
  params: Promise<{ id: string }>;
}

export default function StrategyEditorPage(props: Props) {
  return (
    <ReactFlowProvider>
      <StrategyEditorPageInner {...props} />
    </ReactFlowProvider>
  );
}

// ── Bridge: wires draft validation errors into context dispatch ───────────────

function CanvasBootstrapper({
  validationErrorsRef,
}: {
  validationErrorsRef: React.MutableRefObject<((errors: ValidationError[]) => void) | null>;
}) {
  const { dispatch } = useCanvasState();

  useEffect(() => {
    validationErrorsRef.current = (errors: ValidationError[]) => {
      dispatch({ type: "SET_VALIDATION_ERRORS", payload: errors });
    };
  });

  return null;
}

// ── Keyboard shortcuts that need canvas state ─────────────────────────────────

function CanvasKeyboardHandler({
  strategyId,
}: {
  strategyId: string;
}) {
  const router = useRouter();
  const { state, dispatch } = useCanvasState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (isInputElement(target)) return;

      const isMod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (isMod && key === "enter" && !e.shiftKey) {
        e.preventDefault();
        router.push(`/strategies/${strategyId}/backtest`);
        return;
      }

      if (isMod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }

      if ((isMod && e.shiftKey && key === "z") || (isMod && key === "y")) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }

      const hasTextSelection = !!window.getSelection()?.toString();

      if (isMod && key === "c" && !hasTextSelection) {
        e.preventDefault();
        copyToClipboard(new Set(state.selectedNodeIds), state.nodes, state.edges);
        return;
      }

      if (isMod && key === "v" && !hasTextSelection) {
        e.preventDefault();
        const result = pasteFromClipboard(state.nodes, state.edges);
        if (result) {
          dispatch({ type: "SET_NODES", payload: result.nodes });
          dispatch({ type: "SET_EDGES", payload: result.edges });
          dispatch({ type: "SET_VALIDATION_ERRORS", payload: [] });
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.selectedNodeIds, state.nodes, state.edges, dispatch, router, strategyId]);

  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

function StrategyEditorPageInner({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { timezone, isMobileCanvasMode, nodeDisplayMode, setNodeDisplayMode } = useDisplay();

  // Strategy metadata state
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [versions, setVersions] = useState<StrategyVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<StrategyVersionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout state (≤5 canvas-layout concerns)
  const [showProperties, setShowProperties] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // Editable name state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Settings sheet
  const [showSettings, setShowSettings] = useState(false);

  // Explanation state
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null);

  // Auto-update state
  const [isUpdatingAutoUpdate, setIsUpdatingAutoUpdate] = useState(false);

  // Tags state
  const [availableTags, setAvailableTags] = useState<StrategyTag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSavingTags, setIsSavingTags] = useState(false);

  // Keyboard shortcuts modal
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Transient UI feedback (e.g. "Explanation copied to clipboard")
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Indicator palette mode (essentials vs all)
  const { mode: indicatorMode, toggle: toggleIndicatorMode } = useIndicatorMode([]);

  // Command palette (⌘K)
  const { open: paletteOpen, setOpen: setPaletteOpen, openWithTrigger: openPalette } =
    useCommandPalette({ isMobileMode: isMobileCanvasMode, nodeCount: 0 });

  // ReactFlow instance ref (forwarded via onInit for jumpToError)
  const reactFlowRef = useRef<ReactFlowInstance<Node, CanvasEdge> | null>(null);

  // Canvas container ref (for arrange transitions)
  const canvasContainerRef = useRef<HTMLElement | null>(null);

  // Validation errors — dual-written to both canvas context and page state.
  // Canvas context owns the on-canvas display; page state drives StrategyHeader.
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Bridge: validation errors → context dispatch + page state
  const validationErrorCallbackRef = useRef<((errors: ValidationError[]) => void) | null>(null);

  // Bridge: context dispatch for loading version data
  const contextDispatchRef = useRef<((action: { type: string; payload?: unknown }) => void) | null>(null);
  const contextResetHistoryRef = useRef<((nodes: Node[], edges: Edge[]) => void) | null>(null);

  // Bridge: read current canvas state from context
  const contextNodesRef = useRef<Node[]>([]);
  const contextEdgesRef = useRef<Edge[]>([]);

  // --- Draft persist + publish (background save + explicit publish action) ---
  const draft = useStrategyDraft({
    strategyId: id,
    onPublishSuccess: () => loadVersions({ loadDetail: false }),
    onValidationErrors: (errors) => {
      validationErrorCallbackRef.current?.(errors);
      setValidationErrors(errors);
    },
  });

  // --- Data loading ---

  function loadStrategy() {
    (async () => {
      try {
        const data = await StrategiesApiClient.get(id);
        setStrategy(data);
        setNameInput(data.name);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.message.includes("404")) {
          router.push("/strategies");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load strategy");
      } finally {
        setIsLoading(false);
      }
    })();
  }

  const loadVersionDetailRef = useRef<((versionNumber: number) => Promise<void>) | undefined>(undefined);

  function loadVersions(options?: { loadDetail?: boolean }) {
    const shouldLoadDetail = options?.loadDetail ?? true;
    (async () => {
      try {
        const data = await StrategiesApiClient.listVersions(id);
        setVersions(data);
        if (!shouldLoadDetail) return;
        if (data.length > 0) {
          loadVersionDetailRef.current?.(data[0].version_number);
        } else {
          const defaultDef = createDefaultDefinition();
          const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(defaultDef);
          contextDispatchRef.current?.({ type: "SET_NODES", payload: newNodes });
          contextDispatchRef.current?.({ type: "SET_EDGES", payload: newEdges });
          contextResetHistoryRef.current?.(newNodes, newEdges);
        }
      } catch (err) {
        if (!shouldLoadDetail) {
          console.error("Failed to load versions:", err);
          return;
        }
        const defaultDef = createDefaultDefinition();
        const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(defaultDef);
        contextDispatchRef.current?.({ type: "SET_NODES", payload: newNodes });
        contextDispatchRef.current?.({ type: "SET_EDGES", payload: newEdges });
        contextResetHistoryRef.current?.(newNodes, newEdges);
      }
    })();
  }

  const loadVersionDetail = useCallback(
    async (versionNumber: number) => {
      try {
        const data = await StrategiesApiClient.getVersionDetail(id, versionNumber);
        setSelectedVersion(data);

        const definition = data.definition_json as unknown as StrategyDefinition | null;
        const { nodes: newNodes, edges: newEdges } =
          definition?.blocks?.length
            ? definitionToReactFlow(definition)
            : definitionToReactFlow(createDefaultDefinition());

        contextDispatchRef.current?.({ type: "SET_NODES", payload: newNodes });
        contextDispatchRef.current?.({ type: "SET_EDGES", payload: newEdges });
        contextResetHistoryRef.current?.(newNodes, newEdges);

        const result = generateExplanation(
          (definition?.blocks?.length ? definition : createDefaultDefinition()) as StrategyDefinition
        );
        setExplanation(result);
        contextDispatchRef.current?.({ type: "SET_VALIDATION_ERRORS", payload: [] });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load version detail");
      }
    },
    [id]
  );

  loadVersionDetailRef.current = loadVersionDetail;

  // --- Strategy alerts ---
  const alerts = useStrategyAlerts({ strategyId: id });

  // --- Draft load: try GET /draft first; fall back to latest published version ---
  const loadDraftOrLatestVersion = useCallback(async () => {
    try {
      const draftData = await StrategiesApiClient.getDraft(id);
      // Draft found — load it onto the canvas
      const definition = draftData.definition_json as unknown as StrategyDefinition | null;
      const { nodes: newNodes, edges: newEdges } =
        definition && (definition as { blocks?: unknown[] }).blocks?.length
          ? definitionToReactFlow(definition)
          : definitionToReactFlow(createDefaultDefinition());
      contextDispatchRef.current?.({ type: "SET_NODES", payload: newNodes });
      contextDispatchRef.current?.({ type: "SET_EDGES", payload: newEdges });
      contextResetHistoryRef.current?.(newNodes, newEdges);
    } catch {
      // No draft (404) or error — fall back to latest published version
      loadVersions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- Initial data loading ---
  useEffect(() => {
    loadStrategy();
    loadDraftOrLatestVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (strategy) trackStrategyView(id);
  }, [id, strategy]);

  useEffect(() => {
    StrategyTagsApiClient.list()
      .then(setAvailableTags)
      .catch((err) => console.error("Failed to load tags:", err));
  }, []);

  // Warn the user before leaving while a draft persist is in-flight.
  const hasUnsavedChanges = draft.draftStatus === "persisting";

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // --- Handlers ---

  const handleNameSave = async () => {
    if (!nameInput.trim()) {
      setError("Strategy name is required.");
      return;
    }
    if (nameInput === strategy?.name) {
      setEditingName(false);
      setNameInput(strategy?.name || "");
      return;
    }
    setIsSavingName(true);
    try {
      const updated = await StrategiesApiClient.update(id, { name: nameInput.trim() });
      setStrategy(updated);
      setEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
      setNameInput(strategy?.name || "");
    } finally {
      setIsSavingName(false);
    }
  };

  // Draft-overwrite confirmation is now handled inside StrategyHeader (AlertDialog).
  // This callback simply loads the version once the user has confirmed.
  const confirmLoadVersion = useCallback((versionNumber: number) => {
    loadVersionDetail(versionNumber);
  }, [loadVersionDetail]);

  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim() || !strategy) return;
    setIsSavingTags(true);
    try {
      const tag = await StrategyTagsApiClient.create(tagName.trim());
      const updatedTagIds = [...(strategy.tags?.map((t) => t.id) || []), tag.id];
      const updated = await StrategiesApiClient.update(id, { tag_ids: updatedTagIds });
      setStrategy(updated);
      setTagInput("");
      if (!availableTags.find((t) => t.id === tag.id)) {
        setAvailableTags([...availableTags, tag]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!strategy) return;
    setIsSavingTags(true);
    try {
      const updatedTagIds = strategy.tags?.filter((t) => t.id !== tagId).map((t) => t.id) || [];
      const updated = await StrategiesApiClient.update(id, { tag_ids: updatedTagIds });
      setStrategy(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove tag");
    } finally {
      setIsSavingTags(false);
    }
  };

  const handlePaletteDragStart = (event: React.DragEvent, blockMeta: BlockMeta) => {
    event.dataTransfer.setData("application/blockMeta", JSON.stringify(blockMeta));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleAddNode = useCallback((node: Node) => {
    contextDispatchRef.current?.({ type: "ADD_NODE", payload: node });
  }, []);

  const handleAutoUpdateToggle = async (enabled: boolean) => {
    if (!strategy) return;
    setIsUpdatingAutoUpdate(true);
    try {
      const updated = await StrategiesApiClient.update(id, { auto_update_enabled: enabled });
      setStrategy(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update Strategy Monitor setting");
    } finally {
      setIsUpdatingAutoUpdate(false);
    }
  };

  const handleLookbackChange = async (days: number) => {
    if (!strategy) return;
    setIsUpdatingAutoUpdate(true);
    try {
      const updated = await StrategiesApiClient.update(id, { auto_update_lookback_days: days });
      setStrategy(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lookback period");
    } finally {
      setIsUpdatingAutoUpdate(false);
    }
  };

  const handleCopyExplanation = async () => {
    if (!explanation) return;
    const text = [explanation.entry, explanation.exit, explanation.risk].filter(Boolean).join(" ");
    try {
      await navigator.clipboard.writeText(text);
      setSaveMessage("Explanation copied to clipboard");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      setError("Could not access clipboard. Try selecting and copying the text manually.");
    }
  };

  const handleArchiveVersion = useCallback(async (versionNumber: number) => {
    try {
      await StrategiesApiClient.archiveVersion(id, versionNumber);
      // Version disappears from the list — refresh without reloading canvas
      loadVersions({ loadDetail: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive version");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleExport = async () => {
    if (!strategy) return;
    setError(null);
    try {
      const versionsData = await StrategiesApiClient.listVersions(id);
      if (versionsData.length === 0) {
        setError("Cannot export strategy without a saved version");
        return;
      }
      let versionDetail = selectedVersion;
      if (!versionDetail || versionDetail.version_number !== versionsData[0].version_number) {
        versionDetail = await StrategiesApiClient.getVersionDetail(
          id,
          versionsData[0].version_number,
        );
      }
      const exportFile: StrategyExportFile = {
        schema_version: 1,
        exported_at: new Date().toISOString(),
        strategy: {
          name: strategy.name,
          asset: strategy.asset,
          timeframe: strategy.timeframe,
        },
        definition_json: versionDetail.definition_json,
      };
      const blob = new Blob([JSON.stringify(exportFile, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `strategy-${strategy.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export strategy");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col" aria-busy="true" aria-live="polite">
        <div className="flex-shrink-0 border-b bg-background px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-muted" />
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-8 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center bg-muted/20">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Loading strategy…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Strategy not found</p>
          <Link
            href="/strategies"
            className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
          >
            Back to strategies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <StrategyHeader
        strategy={strategy}
        strategyId={id}
        versions={versions}
        selectedVersion={selectedVersion}
        timezone={timezone}
        editingName={editingName}
        nameInput={nameInput}
        isSavingName={isSavingName}
        onEditingNameChange={setEditingName}
        onNameChange={setNameInput}
        onNameSave={handleNameSave}
        draftStatus={draft.draftStatus}
        lastPersistedAt={draft.lastPersistedAt}
        relativeTimestamp={draft.relativeTimestamp}
        hasDraft={draft.hasDraft}
        onPublish={draft.publishDraft}
        onLoadVersion={confirmLoadVersion}
        onArchiveVersion={handleArchiveVersion}
        isUpdatingAutoUpdate={isUpdatingAutoUpdate}
        onExport={handleExport}
        onAutoUpdateToggle={handleAutoUpdateToggle}
        onLookbackChange={handleLookbackChange}
        onSettingsOpen={() => setShowSettings(true)}
        error={error}
        validationErrors={validationErrors}
        saveMessage={saveMessage}
        onErrorDismiss={() => setError(null)}
        onMessageDismiss={() => setSaveMessage(null)}
        onJumpToError={(blockId) => {
          contextDispatchRef.current?.({ type: "SELECT_NODE", payload: blockId });
          reactFlowRef.current?.setCenter(0, 0, { zoom: 1.2, duration: 300 });
        }}
      />

      <StrategySettingsSheet
        open={showSettings}
        strategy={strategy}
        explanation={explanation}
        nodeDisplayMode={nodeDisplayMode}
        availableTags={availableTags}
        tagInput={tagInput}
        isSavingTags={isSavingTags}
        alertRule={alerts.alertRule}
        alertEnabled={alerts.alertEnabled}
        alertThreshold={alerts.alertThreshold}
        alertOnEntry={alerts.alertOnEntry}
        alertOnExit={alerts.alertOnExit}
        notifyEmail={alerts.notifyEmail}
        alertError={alerts.alertError}
        isSavingAlert={alerts.isSavingAlert}
        isEditingAlert={alerts.isEditingAlert}
        onOpenChange={setShowSettings}
        onNodeDisplayModeChange={setNodeDisplayMode}
        onCopyExplanation={handleCopyExplanation}
        onTagInputChange={setTagInput}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        onAlertSave={alerts.save}
        onAlertEditStart={alerts.startEditing}
        onAlertEditCancel={alerts.cancelEditing}
        onAlertEnabledChange={alerts.setAlertEnabled}
        onAlertThresholdChange={alerts.setAlertThreshold}
        onAlertOnEntryChange={alerts.setAlertOnEntry}
        onAlertOnExitChange={alerts.setAlertOnExit}
        onNotifyEmailChange={alerts.setNotifyEmail}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        {isLeftPanelOpen && (
          <div className="hidden w-64 flex-shrink-0 border-r lg:block">
            <BlockPalette
              onDragStart={handlePaletteDragStart}
              isMobileMode={isMobileCanvasMode}
              indicatorMode={indicatorMode}
              onToggleIndicatorMode={toggleIndicatorMode}
            />
          </div>
        )}

        {/* Center + Right — wrapped by CanvasStateProvider */}
        <CanvasStateProvider onStable={draft.persistDraft}>
          {/* Bridges: wire draft validation errors + canvas state into context */}
          <CanvasBootstrapper validationErrorsRef={validationErrorCallbackRef} />
          <ContextDispatchBridge
            dispatchRef={contextDispatchRef}
            resetHistoryRef={contextResetHistoryRef}
            nodesRef={contextNodesRef}
            edgesRef={contextEdgesRef}
          />

          {/* Keyboard shortcuts that need canvas state */}
          <CanvasKeyboardHandler
            strategyId={id}
          />

          {/* Command palette */}
          {!isMobileCanvasMode && (
            <CommandPalette
              open={paletteOpen}
              onOpenChange={setPaletteOpen}
              onAddNode={handleAddNode}
            />
          )}

          <div className="relative flex-1">
            {/* Desktop side panel toggles */}
            <div className="pointer-events-none absolute left-4 top-16 z-20 hidden flex-col items-start gap-2 lg:flex">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="pointer-events-auto rounded-full bg-background/95 shadow-md backdrop-blur"
                onClick={() => setIsLeftPanelOpen((c) => !c)}
                aria-label={isLeftPanelOpen ? "Collapse block palette" : "Expand block palette"}
                title={isLeftPanelOpen ? "Collapse block palette" : "Expand block palette"}
                aria-pressed={isLeftPanelOpen}
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="pointer-events-auto rounded-full bg-background/95 shadow-md backdrop-blur"
                onClick={() => setIsRightPanelOpen((c) => !c)}
                aria-label={isRightPanelOpen ? "Collapse inspector panel" : "Expand inspector panel"}
                title={isRightPanelOpen ? "Collapse inspector panel" : "Expand inspector panel"}
                aria-pressed={isRightPanelOpen}
              >
                <SettingsIcon className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            {/* Mobile floating buttons */}
            <div className="absolute left-4 top-16 z-10 flex flex-col gap-2 lg:hidden">
              <BlockLibrarySheet
                onDragStart={handlePaletteDragStart}
                onAddNode={handleAddNode}
                indicatorMode={indicatorMode}
                onToggleIndicatorMode={toggleIndicatorMode}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowProperties(true)}
                className="rounded-full bg-background shadow-md lg:hidden"
                aria-label="Edit block properties"
              >
                <SettingsIcon className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <StrategyCanvas
              onContainerMount={(el) => { canvasContainerRef.current = el; }}
              onOpenCommandPalette={isMobileCanvasMode ? undefined : () => openPalette("chip-click")}
              onInit={(instance) => { reactFlowRef.current = instance; }}
            />
          </div>

          {/* Right Panel — Inspector */}
          {isRightPanelOpen && (
            <div className="hidden w-72 flex-shrink-0 border-l lg:block">
              <InspectorPanel />
            </div>
          )}

          {/* Mobile Inspector Sheet */}
          <Sheet open={showProperties} onOpenChange={setShowProperties}>
            <SheetContent side="bottom" className="max-h-[70vh] p-0 lg:hidden">
              <SheetHeader className="sr-only">
                <SheetTitle>Block Properties</SheetTitle>
                <SheetDescription>Edit parameters for the selected block.</SheetDescription>
              </SheetHeader>
              <InspectorPanel />
            </SheetContent>
          </Sheet>

          {/* Keyboard Shortcuts Modal */}
          <KeyboardShortcutsModal
            open={showShortcutsModal}
            onOpenChange={setShowShortcutsModal}
          />
        </CanvasStateProvider>
      </div>
    </div>
  );
}

// ── Expose context dispatch to parent via refs ────────────────────────────────

function ContextDispatchBridge({
  dispatchRef,
  resetHistoryRef,
  nodesRef: parentNodesRef,
  edgesRef: parentEdgesRef,
}: {
  dispatchRef: React.MutableRefObject<((action: { type: string; payload?: unknown }) => void) | null>;
  resetHistoryRef: React.MutableRefObject<((nodes: Node[], edges: Edge[]) => void) | null>;
  nodesRef: React.MutableRefObject<Node[]>;
  edgesRef: React.MutableRefObject<Edge[]>;
}) {
  const { dispatch, resetHistory, state } = useCanvasState();

  useEffect(() => {
    dispatchRef.current = dispatch as (action: { type: string; payload?: unknown }) => void;
    resetHistoryRef.current = resetHistory;
  });

  useEffect(() => {
    parentNodesRef.current = state.nodes;
    parentEdgesRef.current = state.edges;
  });

  return null;
}
