"use client";

import { useEffect, useState, use, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Node, Edge, ReactFlowInstance, useNodesInitialized } from "@xyflow/react";
import { apiFetch } from "@/lib/api";
import {
  trackEvent,
  ANALYTICS_CONSENT_CHANGED_EVENT,
  ANALYTICS_POSTHOG_INITIALIZED_EVENT,
} from "@/lib/analytics";
import { formatRelativeTime } from "@/lib/format";
import { useDisplay } from "@/context/display";
import { useAuth } from "@/context/auth";
import { Strategy, StrategyTag, StrategyVersion, StrategyVersionDetail, StrategyExportFile } from "@/types/strategy";
import { AlertRule } from "@/types/alert";
import {
  StrategyDefinition,
  ValidationError,
  ValidationResponse,
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
import { arrangeNodes } from "@/lib/layout-algorithm";
import { copyToClipboard, pasteFromClipboard } from "@/lib/clipboard-utils";
import {
  resetHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  type HistoryState,
} from "@/lib/history-manager";
import { trackStrategyView } from "@/lib/recent-views";
import { generateExplanation } from "@/lib/explanation-generator";
import { generateNodeSummary } from "@/lib/node-summary";
import SmartCanvas, { CanvasEdge } from "@/components/canvas/SmartCanvas";
import BlockPalette from "@/components/canvas/BlockPalette";
import BlockLibrarySheet from "@/components/canvas/BlockLibrarySheet";
import { useIndicatorMode } from "@/hooks/useIndicatorMode";
import { useSnapshotScheduler } from "@/hooks/use-snapshot-scheduler";
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

export default function StrategyEditorPage({ params }: Props) {
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

  // History state
  const [history, setHistory] = useState<HistoryState>(() => resetHistory([], []));
  const isApplyingHistoryRef = useRef(false);

  // Mobile drawer state
  const [showProperties, setShowProperties] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [isArranging, setIsArranging] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  // ReactFlow instance ref for block library sheet
  const reactFlowRef = useRef<ReactFlowInstance<Node, CanvasEdge> | null>(null);

  // Editable name state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Save version state
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const isSavingVersionRef = useRef(false);

  // Autosave state
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autosaveStateRef = useRef<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedNodesSnapshot, setLastSavedNodesSnapshot] = useState<string>('');
  const [lastSavedEdgesSnapshot, setLastSavedEdgesSnapshot] = useState<string>('');
  const [relativeTimestamp, setRelativeTimestamp] = useState<string>('');

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

  // Alert state
  const [alertRule, setAlertRule] = useState<AlertRule | null>(null);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState<number | null>(null);
  const [alertOnEntry, setAlertOnEntry] = useState(false);
  const [alertOnExit, setAlertOnExit] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [isSavingAlert, setIsSavingAlert] = useState(false);
  const [isEditingAlert, setIsEditingAlert] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  // Keyboard shortcuts modal state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  const resetAlertForm = useCallback((rule: AlertRule | null) => {
    setAlertEnabled(rule?.is_active ?? false);
    setAlertThreshold(rule?.threshold_pct ?? null);
    setAlertOnEntry(rule?.alert_on_entry ?? false);
    setAlertOnExit(rule?.alert_on_exit ?? false);
    setNotifyEmail(rule?.notify_email ?? false);
  }, []);

  useEffect(() => {
    isSavingVersionRef.current = isSavingVersion;
  }, [isSavingVersion]);

  useEffect(() => {
    autosaveStateRef.current = autosaveState;
  }, [autosaveState]);

  const loadVersionDetail = useCallback(
    async (versionNumber: number) => {
      try {
        const data = await apiFetch<StrategyVersionDetail>(
          `/strategies/${id}/versions/${versionNumber}`
        );
        setSelectedVersion(data);

        // Convert definition to React Flow format
        const definition = data.definition_json as unknown as StrategyDefinition | null;
        if (definition && definition.blocks && definition.blocks.length > 0) {
          const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(definition);
          setNodes(newNodes);
          setEdges(newEdges);
          setHistory(resetHistory(newNodes, newEdges));
          setLastSavedNodesSnapshot(JSON.stringify(newNodes));
          setLastSavedEdgesSnapshot(JSON.stringify(newEdges));

          // Generate explanation
          const result = generateExplanation(definition);
          setExplanation(result);
        } else {
          // Create default canvas with pre-placed blocks
          const defaultDef = createDefaultDefinition();
          const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(defaultDef);
          setNodes(newNodes);
          setEdges(newEdges);
          setHistory(resetHistory(newNodes, newEdges));
          setLastSavedNodesSnapshot(JSON.stringify(newNodes));
          setLastSavedEdgesSnapshot(JSON.stringify(newEdges));

          // Generate explanation for default definition
          const result = generateExplanation(defaultDef);
          setExplanation(result);
        }
        setValidationErrors([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load version detail");
      }
    },
    [id]
  );

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

  const loadVersions = useCallback(async (options?: { loadDetail?: boolean }) => {
    const shouldLoadDetail = options?.loadDetail ?? true;
    try {
      const data = await apiFetch<StrategyVersion[]>(`/strategies/${id}/versions`);
      setVersions(data);
      if (!shouldLoadDetail) {
        return;
      }
      if (data.length > 0) {
        loadVersionDetail(data[0].version_number);
      } else {
        // No versions yet, create default canvas
        const defaultDef = createDefaultDefinition();
        const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(defaultDef);
        setNodes(newNodes);
        setEdges(newEdges);
        setHistory(resetHistory(newNodes, newEdges));
      }
    } catch (err) {
      if (!shouldLoadDetail) {
        console.error("Failed to load versions:", err);
        return;
      }
      // Versions are optional, create default canvas
      const defaultDef = createDefaultDefinition();
      const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(defaultDef);
      setNodes(newNodes);
      setEdges(newEdges);
      setHistory(resetHistory(newNodes, newEdges));
    }
  }, [id, loadVersionDetail]);

  useEffect(() => {
    loadStrategy();
    loadVersions();
  }, [loadStrategy, loadVersions]);

  // Track strategy view for recently viewed section
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

  // Load alert rule for this strategy
  useEffect(() => {
    const fetchAlert = async () => {
      try {
        const alerts = await apiFetch<AlertRule[]>("/alerts/");
        const rule = alerts.find((a) => a.strategy_id === id);
        if (rule) {
          setAlertRule(rule);
          resetAlertForm(rule);
        }
        setIsEditingAlert(!rule);
      } catch (err) {
        console.error("Failed to load alert", err);
      } finally {
      }
    };
    fetchAlert();
  }, [id, resetAlertForm]);

  // Update relative timestamp for autosave status
  useEffect(() => {
    if (!lastSavedAt) {
      setRelativeTimestamp('');
      return;
    }

    const updateTimestamp = () => {
      setRelativeTimestamp(formatRelativeTime(lastSavedAt));
    };

    updateTimestamp(); // Initial update
    const interval = setInterval(updateTimestamp, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, [lastSavedAt]);

  // Enrich nodes with mobile mode flag and compact mode data
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

  const hasUnsavedChanges = useMemo(() => {
    if (!lastSavedNodesSnapshot && !lastSavedEdgesSnapshot) return false;
    return JSON.stringify(nodes) !== lastSavedNodesSnapshot ||
           JSON.stringify(edges) !== lastSavedEdgesSnapshot;
  }, [nodes, edges, lastSavedNodesSnapshot, lastSavedEdgesSnapshot]);

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
      // Clear validation state when no errors
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
    if (isSavingVersion) {
      return;
    }

    // Clear pending autosave
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    setIsSavingVersion(true);
    setSaveMessage(null);
    setValidationErrors([]);

    try {
      // Convert canvas state to our JSON format
      const definition = reactFlowToDefinition(nodes, edges);

      // Validate first
      const validation = await apiFetch<ValidationResponse>(
        `/strategies/${id}/validate`,
        {
          method: "POST",
          body: JSON.stringify(definition),
        }
      );

      if (validation.status === "invalid") {
        setValidationErrors(validation.errors);
        setError("Strategy has validation errors. Please fix the issues and try again.");
        setIsSavingVersion(false);
        return;
      }

      // Save the version
      await apiFetch(`/strategies/${id}/versions`, {
        method: "POST",
        body: JSON.stringify({ definition }),
      });
      await loadVersions();
      await loadStrategy();

      // Update autosave state
      const now = new Date();
      setLastSavedAt(now);
      setLastSavedNodesSnapshot(JSON.stringify(nodes));
      setLastSavedEdgesSnapshot(JSON.stringify(edges));
      setAutosaveState('saved');

      trackEvent("strategy_saved", { strategy_id: id }, user?.id);
      setSaveMessage("Version saved successfully");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save version");
    } finally {
      setIsSavingVersion(false);
    }
  }, [isSavingVersion, nodes, edges, id, loadVersions, loadStrategy, user?.id]);

  const triggerAutosave = useCallback(async (currentNodes: Node[], currentEdges: Edge[]) => {
    // Skip if already saving
    if (isSavingVersionRef.current || autosaveStateRef.current === 'saving') return;

    // Deduplication: skip if no changes since last save
    const currentNodesJSON = JSON.stringify(currentNodes);
    const currentEdgesJSON = JSON.stringify(currentEdges);

    if (currentNodesJSON === lastSavedNodesSnapshot &&
        currentEdgesJSON === lastSavedEdgesSnapshot) {
      return; // No changes, skip save
    }

    setAutosaveState('saving');
    setValidationErrors([]);

    try {
      // Convert canvas to definition
      const definition = reactFlowToDefinition(currentNodes, currentEdges);

      // Validate (reuse existing endpoint)
      const validation = await apiFetch<ValidationResponse>(
        `/strategies/${id}/validate`,
        { method: "POST", body: JSON.stringify(definition) }
      );

      if (validation.status === "invalid") {
        setValidationErrors(validation.errors);
        setAutosaveState('error');
        return;
      }

      // Save version (reuse existing endpoint)
      await apiFetch(`/strategies/${id}/versions`, {
        method: "POST",
        body: JSON.stringify({ definition }),
      });

      // Update success state
      const now = new Date();
      setLastSavedAt(now);
      setLastSavedNodesSnapshot(currentNodesJSON);
      setLastSavedEdgesSnapshot(currentEdgesJSON);
      setAutosaveState('saved');

      // Refresh versions list (non-blocking)
      loadVersions({ loadDetail: false });
      loadStrategy();
    } catch (err) {
      setAutosaveState('error');
    }
  }, [lastSavedNodesSnapshot, lastSavedEdgesSnapshot, id, loadVersions, loadStrategy]);

  const handleAlertSave = async () => {
    // Client-side validation
    if (alertThreshold !== null && (alertThreshold < 0.1 || alertThreshold > 100)) {
      setAlertError("Threshold must be between 0.1 and 100");
      return;
    }
    if (alertEnabled && !alertOnEntry && !alertOnExit && alertThreshold === null) {
      setAlertError("Enable at least one alert condition");
      return;
    }

    setIsSavingAlert(true);
    setAlertError(null);
    try {
      if (!alertRule) {
        // Create
        const created = await apiFetch<AlertRule>("/alerts/", {
          method: "POST",
          body: JSON.stringify({
            alert_type: "performance",
            strategy_id: id,
            threshold_pct: alertThreshold ?? null,
            alert_on_entry: alertOnEntry,
            alert_on_exit: alertOnExit,
            notify_email: notifyEmail,
            is_active: alertEnabled,
          }),
        });
        setAlertRule(created);
        resetAlertForm(created);
      } else {
        // Update
        const updated = await apiFetch<AlertRule>(`/alerts/${alertRule.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            threshold_pct: alertThreshold ?? null,
            alert_on_entry: alertOnEntry,
            alert_on_exit: alertOnExit,
            notify_email: notifyEmail,
            is_active: alertEnabled,
          }),
        });
        setAlertRule(updated);
        resetAlertForm(updated);
      }
      setIsEditingAlert(false);
    } catch (err) {
      setAlertError(err instanceof Error ? err.message : "Failed to save alert");
    } finally {
      setIsSavingAlert(false);
    }
  };

  // Tag management functions
  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim() || !strategy) return;

    setIsSavingTags(true);
    try {
      // Create or get existing tag
      const tag = await apiFetch<StrategyTag>("/strategy-tags", {
        method: "POST",
        body: JSON.stringify({ name: tagName.trim() }),
      });

      // Update strategy with new tag list
      const updatedTagIds = [...(strategy.tags?.map((t) => t.id) || []), tag.id];
      const updated = await apiFetch<Strategy>(`/strategies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ tag_ids: updatedTagIds }),
      });

      setStrategy(updated);
      setTagInput("");

      // Refresh available tags if needed
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

  const {
    scheduleSnapshot,
    flushSnapshot,
    commitSnapshot,
    snapshotTimerRef,
    autosaveTimerRef,
  } = useSnapshotScheduler(isApplyingHistoryRef, setHistory, triggerAutosave);

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
      scheduleSnapshot(updatedNodes, edges);
      return updatedNodes;
    });
    // Clear validation errors when user makes changes
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
    scheduleSnapshot(updatedNodes, updatedEdges);
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
            scheduleSnapshot(
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
      // Track all selected nodes for copy/paste
      setSelectedNodeIds(new Set(selectedNodes.map((n) => n.id)));

      // Properties panel still gets single selection only
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
      position: { x: 400, y: 300 }, // Center-ish position
      data: {
        text: "",
      },
    };
    setNodes((currentNodes) => {
      const updatedNodes = [...currentNodes, newNote];
      scheduleSnapshot(updatedNodes, edges);
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
    scheduleSnapshot(newNodes, edgesRef.current);
  };

  // Handle edges change
  const handleEdgesChange = (newEdges: Edge[]) => {
    setEdges(newEdges);
    scheduleSnapshot(nodesRef.current, newEdges);
  };

  // Handle undo
  const handleUndo = useCallback(() => {
    if (!canUndo(history)) return;

    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const { history: newHistory, snapshot } = undo(history);
    if (snapshot) {
      isApplyingHistoryRef.current = true;
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setHistory(newHistory);
      setTimeout(() => {
        isApplyingHistoryRef.current = false;
      }, 0);
    }
  }, [history]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (!canRedo(history)) return;

    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const { history: newHistory, snapshot } = redo(history);
    if (snapshot) {
      isApplyingHistoryRef.current = true;
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      setHistory(newHistory);
      setTimeout(() => {
        isApplyingHistoryRef.current = false;
      }, 0);
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

  // Handle auto-arrange layout
  const handleAutoArrange = useCallback(async () => {
    setIsArranging(true);
    try {
      const dims = new Map<string, { width: number; height: number }>();
      for (const node of nodes) {
        const internal = reactFlowRef.current?.getInternalNode(node.id);
        const measured = internal?.measured;
        if (measured?.width && measured?.height) {
          dims.set(node.id, { width: measured.width, height: measured.height });
        }
      }

      const newPositions = await arrangeNodes(nodes, edges, dims);
      const updatedNodes = nodes.map(node => ({
        ...node,
        position: newPositions.get(node.id) || node.position,
      }));

      flushSnapshot();
      commitSnapshot(updatedNodes, edges);
      setNodes(updatedNodes);

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      reactFlowRef.current?.fitView({ padding: 0.2, duration: reduceMotion ? 0 : 300 });

      setShowLayoutMenu(false);
    } finally {
      setIsArranging(false);
    }
  }, [nodes, edges, flushSnapshot, commitSnapshot]);

  // Handle tidy connections
  const handleTidyConnections = useCallback(() => {
    const tidiedEdges = tidyConnections(edges);
    flushSnapshot();
    commitSnapshot(nodes, tidiedEdges);
    setEdges(tidiedEdges);
    setShowLayoutMenu(false);
  }, [nodes, edges, flushSnapshot, commitSnapshot]);

  // Update expanded nodes when display mode changes
  useEffect(() => {
    if (nodeDisplayMode === "compact") {
      // Collapse all nodes when entering compact mode
      setExpandedNodeIds(new Set());
    } else {
      // Expand all nodes when exiting compact mode
      setExpandedNodeIds((prev) => {
        // Only expand if not already expanded
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
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (isInputElement(target)) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Save: Cmd/Ctrl+S
      if (isMod && key === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSaveVersion();
        return;
      }

      // Run backtest: Cmd/Ctrl+Enter (navigate to backtest tab).
      // We deliberately do NOT override Cmd/Ctrl+R, which is the universal browser refresh shortcut.
      if (isMod && key === "enter" && !e.shiftKey) {
        e.preventDefault();
        router.push(`/strategies/${id}/backtest`);
        return;
      }

      // Undo: Cmd/Ctrl+Z
      if (isMod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y
      if ((isMod && e.shiftKey && key === "z") || (isMod && key === "y")) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Don't hijack copy/paste when the user has text selected on the page.
      const hasTextSelection = !!window.getSelection()?.toString();

      // Copy: Cmd/Ctrl+C
      if (isMod && key === "c" && !hasTextSelection) {
        e.preventDefault();
        copyToClipboard(selectedNodeIds, nodes, edges);
        return;
      }

      // Paste: Cmd/Ctrl+V
      if (isMod && key === "v" && !hasTextSelection) {
        e.preventDefault();
        const result = pasteFromClipboard(nodes, edges);
        if (result) {
          setNodes(result.nodes);
          setEdges(result.edges);
          scheduleSnapshot(result.nodes, result.edges);
          setValidationErrors([]);
          setError(null);
        }
        return;
      }

      // Show shortcuts: ?
      if (key === "?" && !isMod) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeIds, nodes, edges, handleUndo, handleRedo, scheduleSnapshot, handleSaveVersion, router, id]);

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
      setSaveMessage("Explanation copied to clipboard");
      setTimeout(() => setSaveMessage(null), 2000);
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

      // Reuse selectedVersion if it's the latest, otherwise fetch
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

      // Trigger download
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
        autosaveState={autosaveState}
        lastSavedAt={lastSavedAt}
        relativeTimestamp={relativeTimestamp}
        isSavingVersion={isSavingVersion}
        onSaveVersion={handleSaveVersion}
        onLoadVersion={confirmLoadVersion}
        isUpdatingAutoUpdate={isUpdatingAutoUpdate}
        onExport={handleExport}
        onAutoUpdateToggle={handleAutoUpdateToggle}
        onLookbackChange={handleLookbackChange}
        onSettingsOpen={() => setShowSettings(true)}
        error={error}
        validationErrors={validationErrors}
        saveMessage={saveMessage}
        onErrorDismiss={() => { setError(null); setValidationErrors([]); }}
        onMessageDismiss={() => setSaveMessage(null)}
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
        alertRule={alertRule}
        alertEnabled={alertEnabled}
        alertThreshold={alertThreshold}
        alertOnEntry={alertOnEntry}
        alertOnExit={alertOnExit}
        notifyEmail={notifyEmail}
        alertError={alertError}
        isSavingAlert={isSavingAlert}
        isEditingAlert={isEditingAlert}
        onOpenChange={setShowSettings}
        onNodeDisplayModeChange={setNodeDisplayMode}
        onCopyExplanation={handleCopyExplanation}
        onTagInputChange={setTagInput}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        onAlertSave={handleAlertSave}
        onAlertEditStart={() => setIsEditingAlert(true)}
        onAlertEditCancel={() => { setIsEditingAlert(false); resetAlertForm(alertRule); }}
        onAlertEnabledChange={setAlertEnabled}
        onAlertThresholdChange={setAlertThreshold}
        onAlertOnEntryChange={setAlertOnEntry}
        onAlertOnExitChange={setAlertOnExit}
        onNotifyEmailChange={setNotifyEmail}
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
            canUndo={canUndo(history)}
            canRedo={canRedo(history)}
            globalValidationErrors={globalValidationErrors}
            isMobileMode={isMobileCanvasMode}
            onInit={(instance) => (reactFlowRef.current = instance)}
            onNodeClick={handleNodeClick}
            onAutoArrange={handleAutoArrange}
            isArranging={isArranging}
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
