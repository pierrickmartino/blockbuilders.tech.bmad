"use client";

import { useEffect, useState, use, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Node, Edge, ReactFlowInstance, ReactFlowProvider } from "@xyflow/react";
import { apiFetch } from "@/lib/api";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  ANALYTICS_POSTHOG_INITIALIZED_EVENT,
} from "@/lib/analytics";
import { useDisplay } from "@/context/display";
import { useAuth } from "@/context/auth";
import { CanvasStateProvider } from "@/context/CanvasStateContext";
import { Strategy, StrategyTag, StrategyVersion, StrategyVersionDetail, StrategyExportFile } from "@/types/strategy";
import {
  StrategyDefinition,
  ValidationError,
  BlockMeta,
  BlockType,
  getBlockMeta,
  ExplanationResult,
} from "@/types/canvas";
import {
  definitionToReactFlow,
  reactFlowToDefinition,
  createDefaultDefinition,
  generateBlockId,
  tidyConnections,
} from "@/lib/canvas-utils";
import { copyToClipboard, pasteFromClipboard } from "@/lib/clipboard-utils";
import { trackStrategyView } from "@/lib/recent-views";
import { generateExplanation } from "@/lib/explanation-generator";
import { generateNodeSummary } from "@/lib/node-summary";
import SmartCanvas, { CanvasEdge } from "@/components/canvas/SmartCanvas";
import BlockPalette from "@/components/canvas/BlockPalette";
import BlockLibrarySheet from "@/components/canvas/BlockLibrarySheet";
import { useIndicatorMode } from "@/hooks/useIndicatorMode";
import { useAutoArrange } from "@/hooks/use-auto-arrange";
import { useCanvasHistory } from "@/hooks/use-canvas-history";
import { useAutosave } from "@/hooks/use-autosave";
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
import { getFeatureFlag, CANVAS_FLAGS } from "@/lib/feature-flags";
import { StrategyHeader } from "./_components/StrategyHeader";
import { StrategySettingsSheet } from "./_components/StrategySettingsSheet";
import CommandPalette from "@/components/canvas/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { toast } from "sonner";

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

function StrategyEditorPageInner({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { timezone, isMobileCanvasMode, nodeDisplayMode, setNodeDisplayMode } = useDisplay();

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [versions, setVersions] = useState<StrategyVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<StrategyVersionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Canvas state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  // Indicator palette mode (essentials vs all)
  const { mode: indicatorMode, toggle: toggleIndicatorMode } = useIndicatorMode(nodes);

  // Command palette (⌘K)
  const { open: paletteOpen, setOpen: setPaletteOpen, openWithTrigger: openPalette } =
    useCommandPalette({ isMobileMode: isMobileCanvasMode, nodeCount: nodes.length });

  // Inline popover feature flag
  const [inlinePopoverEnabled, setInlinePopoverEnabled] = useState(false);
  useEffect(() => {
    const refresh = () => setInlinePopoverEnabled(getFeatureFlag(CANVAS_FLAGS.inlinePopover));
    refresh();
    window.addEventListener(ANALYTICS_POSTHOG_INITIALIZED_EVENT, refresh);
    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(ANALYTICS_POSTHOG_INITIALIZED_EVENT, refresh);
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, refresh);
    };
  }, []);

  // Mobile drawer state
  const [showProperties, setShowProperties] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // ReactFlow instance ref for block library sheet
  const reactFlowRef = useRef<ReactFlowInstance<Node, CanvasEdge> | null>(null);

  // Canvas container ref (forwarded from StrategyCanvas for arrange transitions)
  const canvasContainerRef = useRef<HTMLElement | null>(null);

  // Editable name state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Settings Sheet control state
  const [showSettings, setShowSettings] = useState(false);

  // Explanation state
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null);

  // Auto-update state
  const [isUpdatingAutoUpdate, setIsUpdatingAutoUpdate] = useState(false);

  // Tags state
  const [availableTags, setAvailableTags] = useState<StrategyTag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSavingTags, setIsSavingTags] = useState(false);

  // Keyboard shortcuts modal state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // --- Data loading callbacks (defined before hooks that reference them) ---

  const loadStrategy = useCallback(async () => {
    try {
      const data = await apiFetch<Strategy>(`/strategies/${id}`);
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
  }, [id, router]);

  const loadVersionDetailRef = useRef<((versionNumber: number) => Promise<void>) | undefined>(undefined);

  const loadVersions = useCallback(async (options?: { loadDetail?: boolean }) => {
    const shouldLoadDetail = options?.loadDetail ?? true;
    try {
      const data = await apiFetch<StrategyVersion[]>(`/strategies/${id}/versions`);
      setVersions(data);
      if (!shouldLoadDetail) {
        return;
      }
      if (data.length > 0) {
        loadVersionDetailRef.current?.(data[0].version_number);
      } else {
        const defaultDef = createDefaultDefinition();
        const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(defaultDef);
        setNodes(newNodes);
        setEdges(newEdges);
        historyRef.current.reset(newNodes, newEdges);
      }
    } catch (err) {
      if (!shouldLoadDetail) {
        console.error("Failed to load versions:", err);
        return;
      }
      const defaultDef = createDefaultDefinition();
      const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(defaultDef);
      setNodes(newNodes);
      setEdges(newEdges);
      historyRef.current.reset(newNodes, newEdges);
    }
  }, [id]);

  // --- Autosave hook ---

  const autosave = useAutosave({
    strategyId: id,
    userId: user?.id,
    onValidationErrors: setValidationErrors,
    onError: setError,
    onStrategyRefresh: loadStrategy,
    onVersionsRefresh: loadVersions,
  });

  // --- Canvas history hook ---

  const history = useCanvasHistory({
    onStable: autosave.triggerAutosave,
  });

  // Keep a stable ref so loadVersions/loadVersionDetail can call reset without circular deps
  const historyRef = useRef(history);
  historyRef.current = history;

  const loadVersionDetail = useCallback(
    async (versionNumber: number) => {
      try {
        const data = await apiFetch<StrategyVersionDetail>(
          `/strategies/${id}/versions/${versionNumber}`
        );
        setSelectedVersion(data);

        const definition = data.definition_json as unknown as StrategyDefinition | null;
        if (definition && definition.blocks && definition.blocks.length > 0) {
          const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(definition);
          setNodes(newNodes);
          setEdges(newEdges);
          historyRef.current.reset(newNodes, newEdges);
          autosave.initSavedSnapshot(newNodes, newEdges);

          const result = generateExplanation(definition);
          setExplanation(result);
        } else {
          const defaultDef = createDefaultDefinition();
          const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(defaultDef);
          setNodes(newNodes);
          setEdges(newEdges);
          historyRef.current.reset(newNodes, newEdges);
          autosave.initSavedSnapshot(newNodes, newEdges);

          const result = generateExplanation(defaultDef);
          setExplanation(result);
        }
        setValidationErrors([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load version detail");
      }
    },
    [id, autosave]
  );

  // Wire up the ref so loadVersions can call loadVersionDetail
  loadVersionDetailRef.current = loadVersionDetail;

  // --- Strategy alerts hook ---

  const alerts = useStrategyAlerts({ strategyId: id });

  // --- Initial data loading ---

  useEffect(() => {
    loadStrategy();
    loadVersions();
  }, [loadStrategy, loadVersions]);

  useEffect(() => {
    if (strategy) {
      trackStrategyView(id);
    }
  }, [id, strategy]);

  // Load available tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const data = await apiFetch<StrategyTag[]>("/strategy-tags");
        setAvailableTags(data);
      } catch (err) {
        console.error("Failed to load tags:", err);
      }
    };
    loadTags();
  }, []);

  // --- Derived state ---

  const nodesWithMobileMode = useMemo(
    () =>
      nodes.map((node) => {
        const isCompact = nodeDisplayMode === "compact";
        const isExpanded = expandedNodeIds.has(node.id);
        const summary = generateNodeSummary(
          node.type || "",
          (node.data?.params as Record<string, unknown>) || {},
          String(node.data?.label || "")
        );

        return {
          ...node,
          data: {
            ...node.data,
            isMobileMode: isMobileCanvasMode,
            isCompact,
            isExpanded,
            summary,
          },
        };
      }),
    [nodes, isMobileCanvasMode, nodeDisplayMode, expandedNodeIds]
  );

  const selectedNode = useMemo(
    () => nodesWithMobileMode.find((node) => node.id === selectedNodeId) || null,
    [nodesWithMobileMode, selectedNodeId]
  );

  const globalValidationErrors = useMemo(
    () => validationErrors.filter((e) => !e.block_id),
    [validationErrors]
  );

  const hasUnsavedChanges = useMemo(
    () => autosave.hasUnsavedChanges(nodes, edges),
    [autosave, nodes, edges]
  );

  // Warn before closing/navigating away with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const confirmLoadVersion = useCallback((versionNumber: number) => {
    if (hasUnsavedChanges && !window.confirm("You have unsaved changes. Loading a different version will replace your current canvas. Continue?")) {
      return;
    }
    loadVersionDetail(versionNumber);
  }, [hasUnsavedChanges, loadVersionDetail]);

  useEffect(() => {
    if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  // Regenerate explanation when canvas changes
  useEffect(() => {
    const definition = reactFlowToDefinition(nodes, edges);
    const result = generateExplanation(definition);
    setExplanation(result);
  }, [nodes, edges]);

  // Map validation errors to node data
  useEffect(() => {
    if (validationErrors.length > 0) {
      setNodes((nodes) =>
        nodes.map((node) => {
          const nodeErrors = validationErrors.filter((e) => e.block_id === node.id);
          return {
            ...node,
            data: {
              ...node.data,
              hasError: nodeErrors.length > 0,
              validationMessage: nodeErrors[0]?.user_message || nodeErrors[0]?.message,
              helpLink: nodeErrors[0]?.help_link,
            },
          };
        })
      );
    } else {
      setNodes((nodes) =>
        nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            hasError: false,
            validationMessage: undefined,
            helpLink: undefined,
          },
        }))
      );
    }
  }, [validationErrors, setNodes]);

  // --- Auto-arrange ---

  const {
    isArranging,
    handleAutoArrange,
  } = useAutoArrange({
    nodes,
    edges,
    strategyId: id,
    userId: user?.id,
    reactFlowRef,
    canvasContainerRef,
    flushSnapshot: history.flushSnapshot,
    commitSnapshot: history.commitSnapshot,
    setNodes,
    setShowLayoutMenu,
  });

  // --- Event handlers ---

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
      const updated = await apiFetch<Strategy>(`/strategies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      setStrategy(updated);
      setEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
      setNameInput(strategy?.name || "");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveVersion = useCallback(async () => {
    const clearStableTimer = () => {
      if (history.stableTimerRef.current) {
        clearTimeout(history.stableTimerRef.current);
        history.stableTimerRef.current = null;
      }
    };
    await autosave.saveVersion(nodes, edges, clearStableTimer);
  }, [nodes, edges, autosave, history.stableTimerRef]);

  // Tag management functions
  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim() || !strategy) return;

    setIsSavingTags(true);
    try {
      const tag = await apiFetch<StrategyTag>("/strategy-tags", {
        method: "POST",
        body: JSON.stringify({ name: tagName.trim() }),
      });

      const updatedTagIds = [...(strategy.tags?.map((t) => t.id) || []), tag.id];
      const updated = await apiFetch<Strategy>(`/strategies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ tag_ids: updatedTagIds }),
      });

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
      const updated = await apiFetch<Strategy>(`/strategies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ tag_ids: updatedTagIds }),
      });
      setStrategy(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove tag");
    } finally {
      setIsSavingTags(false);
    }
  };

  // Handle drag start from palette
  const handlePaletteDragStart = (event: React.DragEvent, blockMeta: BlockMeta) => {
    event.dataTransfer.setData("application/blockMeta", JSON.stringify(blockMeta));
    event.dataTransfer.effectAllowed = "move";
  };

  // Handle adding node from block library sheet (tap-to-place)
  const handleAddNode = useCallback(
    (node: Node) => {
      setNodes((prevNodes) => [...prevNodes, node]);
    },
    []
  );

  // Handle parameter changes from properties panel
  const handleParamsChange = (nodeId: string, params: Record<string, unknown>) => {
    setNodes((currentNodes) => {
      const updatedNodes = currentNodes.map((node) => {
        if (node.id === nodeId) {
          const blockMeta = getBlockMeta(node.type as BlockType);
          return {
            ...node,
            data: {
              ...node.data,
              params,
              label: blockMeta?.label || node.data?.label,
            },
          };
        }
        return node;
      });
      history.scheduleSnapshot(updatedNodes, edges);
      return updatedNodes;
    });
    setValidationErrors([]);
    setError(null);
  };

  // Handle node deletion from properties panel
  const handleDeleteNode = (nodeId: string) => {
    const deletedNode = nodes.find((node) => node.id === nodeId);
    const deletedEdges = edges.filter(
      (edge) => edge.source === nodeId || edge.target === nodeId
    );
    const updatedNodes = nodes.filter((node) => node.id !== nodeId);
    const updatedEdges = edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId
    );

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    history.scheduleSnapshot(updatedNodes, updatedEdges);
    setSelectedNodeId(null);
    setValidationErrors([]);
    setError(null);

    if (deletedNode) {
      const label = (deletedNode.data?.label as string | undefined) ?? "Block";
      toast(`"${label}" deleted`, {
        action: {
          label: "Undo",
          onClick: () => {
            setNodes((prev) => [...prev, deletedNode]);
            setEdges((prev) => [...prev, ...deletedEdges]);
            history.scheduleSnapshot(
              [...updatedNodes, deletedNode],
              [...updatedEdges, ...deletedEdges]
            );
          },
        },
        duration: 5000,
      });
    }
  };

  // Handle selection changes (multi-select and single-select)
  const handleSelectionChange = useCallback(
    (selectedNodes: Node[]) => {
      setSelectedNodeIds(new Set(selectedNodes.map((n) => n.id)));
      setSelectedNodeId(selectedNodes.length === 1 ? selectedNodes[0].id : null);
    },
    []
  );

  // Handle adding a floating note
  const handleAddNote = () => {
    const noteId = generateBlockId();
    const newNote: Node = {
      id: noteId,
      type: "note",
      position: { x: 400, y: 300 },
      data: {
        text: "",
      },
    };
    setNodes((currentNodes) => {
      const updatedNodes = [...currentNodes, newNote];
      history.scheduleSnapshot(updatedNodes, edges);
      return updatedNodes;
    });
    setSelectedNodeId(noteId);
  };

  // Refs for latest state to avoid stale closures in change handlers
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  // Handle nodes change
  const handleNodesChange = (newNodes: Node[]) => {
    setNodes(newNodes);
    history.scheduleSnapshot(newNodes, edgesRef.current);
  };

  // Handle edges change
  const handleEdgesChange = (newEdges: Edge[]) => {
    setEdges(newEdges);
    history.scheduleSnapshot(nodesRef.current, newEdges);
  };

  // Handle undo
  const handleUndo = useCallback(() => {
    const snapshot = history.undo();
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
    }
  }, [history]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const snapshot = history.redo();
    if (snapshot) {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
    }
  }, [history]);

  // Handle node click for compact mode expand/collapse
  const handleNodeClick = useCallback((nodeId: string) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle tidy connections
  const handleTidyConnections = useCallback(() => {
    const tidiedEdges = tidyConnections(edges);
    history.flushSnapshot();
    history.commitSnapshot(nodes, tidiedEdges);
    setEdges(tidiedEdges);
    setShowLayoutMenu(false);
  }, [nodes, edges, history]);

  // Update expanded nodes when display mode changes
  useEffect(() => {
    if (nodeDisplayMode === "compact") {
      setExpandedNodeIds(new Set());
    } else {
      setExpandedNodeIds((prev) => {
        if (prev.size === 0) {
          return new Set(nodes.map(n => n.id));
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeDisplayMode]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (isInputElement(target)) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (isMod && key === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSaveVersion();
        return;
      }

      if (isMod && key === "enter" && !e.shiftKey) {
        e.preventDefault();
        router.push(`/strategies/${id}/backtest`);
        return;
      }

      if (isMod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if ((isMod && e.shiftKey && key === "z") || (isMod && key === "y")) {
        e.preventDefault();
        handleRedo();
        return;
      }

      const hasTextSelection = !!window.getSelection()?.toString();

      if (isMod && key === "c" && !hasTextSelection) {
        e.preventDefault();
        copyToClipboard(selectedNodeIds, nodes, edges);
        return;
      }

      if (isMod && key === "v" && !hasTextSelection) {
        e.preventDefault();
        const result = pasteFromClipboard(nodes, edges);
        if (result) {
          setNodes(result.nodes);
          setEdges(result.edges);
          history.scheduleSnapshot(result.nodes, result.edges);
          setValidationErrors([]);
          setError(null);
        }
        return;
      }

      if (key === "?" && !isMod) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeIds, nodes, edges, handleUndo, handleRedo, history, handleSaveVersion, router, id]);

  const handleAutoUpdateToggle = async (enabled: boolean) => {
    if (!strategy) return;
    setIsUpdatingAutoUpdate(true);
    try {
      const updated = await apiFetch<Strategy>(`/strategies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ auto_update_enabled: enabled }),
      });
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
      const updated = await apiFetch<Strategy>(`/strategies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ auto_update_lookback_days: days }),
      });
      setStrategy(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lookback period");
    } finally {
      setIsUpdatingAutoUpdate(false);
    }
  };

  const handleCopyExplanation = async () => {
    if (!explanation) return;
    const text = [explanation.entry, explanation.exit, explanation.risk]
      .filter(Boolean)
      .join(" ");
    try {
      await navigator.clipboard.writeText(text);
      autosave.setSaveMessage("Explanation copied to clipboard");
      setTimeout(() => autosave.setSaveMessage(null), 2000);
    } catch {
      setError("Could not access clipboard. Try selecting and copying the text manually.");
    }
  };

  const handleExport = async () => {
    if (!strategy) return;
    setError(null);

    try {
      const versionsData = await apiFetch<StrategyVersion[]>(`/strategies/${id}/versions`);

      if (versionsData.length === 0) {
        setError("Cannot export strategy without a saved version");
        return;
      }

      let versionDetail = selectedVersion;
      if (!versionDetail || versionDetail.version_number !== versionsData[0].version_number) {
        versionDetail = await apiFetch<StrategyVersionDetail>(
          `/strategies/${id}/versions/${versionsData[0].version_number}`
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

      const blob = new Blob([JSON.stringify(exportFile, null, 2)], {
        type: "application/json",
      });
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
        autosaveState={autosave.autosaveState}
        lastSavedAt={autosave.lastSavedAt}
        relativeTimestamp={autosave.relativeTimestamp}
        isSavingVersion={autosave.isSavingVersion}
        onSaveVersion={handleSaveVersion}
        onLoadVersion={confirmLoadVersion}
        isUpdatingAutoUpdate={isUpdatingAutoUpdate}
        onExport={handleExport}
        onAutoUpdateToggle={handleAutoUpdateToggle}
        onLookbackChange={handleLookbackChange}
        onSettingsOpen={() => setShowSettings(true)}
        error={error}
        validationErrors={validationErrors}
        saveMessage={autosave.saveMessage}
        onErrorDismiss={() => { setError(null); setValidationErrors([]); }}
        onMessageDismiss={() => autosave.setSaveMessage(null)}
        onJumpToError={(blockId) => {
          setSelectedNodeId(blockId);
          const node = nodes.find((n) => n.id === blockId);
          if (node) {
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            reactFlowRef.current?.setCenter(node.position.x, node.position.y, {
              zoom: 1.2,
              duration: reduceMotion ? 0 : 300,
            });
          }
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

      {!isMobileCanvasMode && (
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onAddNode={handleAddNode}
          reactFlowInstance={reactFlowRef.current}
        />
      )}

      {/* Main Content - Three Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Block Palette (hidden on mobile, drawer) */}
        {isLeftPanelOpen && (
          <div className="hidden w-64 flex-shrink-0 border-r lg:block">
            <BlockPalette onDragStart={handlePaletteDragStart} isMobileMode={isMobileCanvasMode} indicatorMode={indicatorMode} onToggleIndicatorMode={toggleIndicatorMode} />
          </div>
        )}

        {/* Center - Canvas */}
        <CanvasStateProvider onStable={autosave.triggerAutosave}>
        <div className="relative flex-1">
          {/* Desktop side panel toggles */}
          <div className="pointer-events-none absolute left-4 top-16 z-20 hidden flex-col items-start gap-2 lg:flex">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="pointer-events-auto rounded-full bg-background/95 shadow-md backdrop-blur"
              onClick={() => setIsLeftPanelOpen((current) => !current)}
              aria-label={isLeftPanelOpen ? "Collapse block palette" : "Expand block palette"}
              title={isLeftPanelOpen ? "Collapse block palette" : "Expand block palette"}
              aria-pressed={isLeftPanelOpen}
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </Button>
            {!inlinePopoverEnabled && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="pointer-events-auto rounded-full bg-background/95 shadow-md backdrop-blur"
                onClick={() => setIsRightPanelOpen((current) => !current)}
                aria-label={isRightPanelOpen ? "Collapse inspector panel" : "Expand inspector panel"}
                title={isRightPanelOpen ? "Collapse inspector panel" : "Expand inspector panel"}
                aria-pressed={isRightPanelOpen}
              >
                <SettingsIcon className="h-5 w-5" aria-hidden="true" />
              </Button>
            )}
          </div>

          {/* Mobile floating buttons */}
          <div className="absolute left-4 top-16 z-10 flex flex-col gap-2 lg:hidden">
            <BlockLibrarySheet
              onDragStart={handlePaletteDragStart}
              onAddNode={handleAddNode}
              reactFlowInstance={reactFlowRef}
              isMobileMode={isMobileCanvasMode}
              indicatorMode={indicatorMode}
              onToggleIndicatorMode={toggleIndicatorMode}
            />
            {!inlinePopoverEnabled && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowProperties(true)}
                className="rounded-full bg-background shadow-md lg:hidden"
                disabled={!selectedNode}
                aria-label="Edit block properties"
              >
                <SettingsIcon className="h-5 w-5" aria-hidden="true" />
              </Button>
            )}
          </div>

          <SmartCanvas
            nodes={nodesWithMobileMode}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onSelectionChange={handleSelectionChange}
            onAddNote={handleAddNote}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            globalValidationErrors={globalValidationErrors}
            isMobileMode={isMobileCanvasMode}
            onInit={(instance) => (reactFlowRef.current = instance)}
            onNodeClick={handleNodeClick}
            onAutoArrange={handleAutoArrange}
            isArranging={isArranging}
            onContainerMount={(el) => { canvasContainerRef.current = el; }}
            onTidyConnections={handleTidyConnections}
            onLayoutMenu={() => setShowLayoutMenu(true)}
            onOpenCommandPalette={isMobileCanvasMode ? undefined : () => openPalette("chip-click")}
            inlinePopoverEnabled={inlinePopoverEnabled}
            popoverNodeId={inlinePopoverEnabled ? selectedNodeId : null}
            onPopoverParamsChange={inlinePopoverEnabled ? handleParamsChange : undefined}
            onPopoverDeleteNode={inlinePopoverEnabled ? handleDeleteNode : undefined}
            onPopoverClose={inlinePopoverEnabled ? () => setSelectedNodeId(null) : undefined}
            popoverValidationErrors={inlinePopoverEnabled ? validationErrors : undefined}
          />
        </div>
        </CanvasStateProvider>

        {/* Right Panel - Inspector (hidden on mobile, drawer) — hidden when inline popover is active */}
        {!inlinePopoverEnabled && isRightPanelOpen && (
          <div className="hidden w-72 flex-shrink-0 border-l lg:block">
            <InspectorPanel
              selectedNode={selectedNode}
              onParamsChange={handleParamsChange}
              onDeleteNode={handleDeleteNode}
              validationErrors={validationErrors}
              isMobileMode={isMobileCanvasMode}
            />
          </div>
        )}

        {/* Mobile Inspector Sheet — hidden when inline popover is active */}
        {!inlinePopoverEnabled && (
          <Sheet open={showProperties} onOpenChange={setShowProperties}>
            <SheetContent side="bottom" className="max-h-[70vh] p-0 lg:hidden">
              <SheetHeader className="sr-only">
                <SheetTitle>Block Properties</SheetTitle>
                <SheetDescription>Edit parameters for the selected block.</SheetDescription>
              </SheetHeader>
              <InspectorPanel
                selectedNode={selectedNode}
                onParamsChange={handleParamsChange}
                onDeleteNode={handleDeleteNode}
                validationErrors={validationErrors}
                isMobileMode={true}
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Mobile Layout Menu */}
        <Sheet open={showLayoutMenu} onOpenChange={setShowLayoutMenu}>
          <SheetContent side="bottom" className="lg:hidden">
            <SheetHeader>
              <SheetTitle>Layout Options</SheetTitle>
              <SheetDescription>Rearrange and tidy your canvas layout.</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              <Button
                onClick={handleAutoArrange}
                className="w-full"
                variant="outline"
                disabled={isArranging}
              >
                {isArranging ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Arranging…</>
                ) : (
                  "Auto-arrange"
                )}
              </Button>
              <Button
                onClick={handleTidyConnections}
                className="w-full"
                variant="outline"
              >
                Tidy connections
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal
          open={showShortcutsModal}
          onOpenChange={setShowShortcutsModal}
        />
      </div>
    </div>
  );
}
