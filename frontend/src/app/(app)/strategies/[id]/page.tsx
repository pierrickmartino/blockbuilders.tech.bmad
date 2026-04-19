"use client";

import { useEffect, useState, use, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Node, Edge, ReactFlowInstance } from "@xyflow/react";
import { apiFetch } from "@/lib/api";
import {
  trackEvent,
  ANALYTICS_CONSENT_CHANGED_EVENT,
  ANALYTICS_POSTHOG_INITIALIZED_EVENT,
} from "@/lib/analytics";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
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
import { autoArrangeLayout } from "@/lib/layout-algorithm";
import { copyToClipboard, pasteFromClipboard } from "@/lib/clipboard-utils";
import {
  resetHistory,
  pushSnapshot,
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
import InspectorPanel from "@/components/canvas/InspectorPanel";
import { StrategyTabs } from "@/components/StrategyTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft,
  MoreVertical,
  Settings as SettingsIcon,
  Clock,
  Check as CheckIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { isInputElement } from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";
import { getFeatureFlag, CANVAS_FLAGS } from "@/lib/feature-flags";

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
  const snapshotTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isApplyingHistoryRef = useRef(false);

  // Mobile drawer state
  const [showProperties, setShowProperties] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
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
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // Debounced snapshot for history + autosave
  const scheduleSnapshot = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    if (isApplyingHistoryRef.current) return;

    // Clear existing timers
    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    // Schedule history snapshot (500ms)
    snapshotTimerRef.current = setTimeout(() => {
      snapshotTimerRef.current = null;
      if (isApplyingHistoryRef.current) return;
      setHistory((h) => pushSnapshot(h, newNodes, newEdges));
    }, 500);

    // Schedule autosave (10 seconds)
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      if (isApplyingHistoryRef.current) return;
      triggerAutosave(newNodes, newEdges);
    }, 10000);
  }, [triggerAutosave]);

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
  const handleAutoArrange = useCallback(async (direction: "LR" | "TB") => {
    // Apply layout algorithm
    const newPositions = await autoArrangeLayout(nodes, edges, direction);

    // Update nodes with new positions
    const updatedNodes = nodes.map(node => ({
      ...node,
      position: newPositions.get(node.id) || node.position
    }));

    // Update state and history
    setNodes(updatedNodes);
    scheduleSnapshot(updatedNodes, edges);

    // Fit view with animation (respect reduced-motion preference)
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reactFlowRef.current?.fitView({ padding: 0.2, duration: reduceMotion ? 0 : 300 });

    // Close mobile sheet if open
    setShowLayoutMenu(false);
  }, [nodes, edges, scheduleSnapshot]);

  // Handle tidy connections
  const handleTidyConnections = useCallback(() => {
    const tidiedEdges = tidyConnections(edges);
    setEdges(tidiedEdges);
    scheduleSnapshot(nodes, tidiedEdges);
    setShowLayoutMenu(false);
  }, [nodes, edges, scheduleSnapshot]);

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
      {/* Compact Top Bar */}
      <div className="flex-shrink-0 border-b bg-background px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Back + Name + Badges */}
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/strategies"
              aria-label="Back to strategies"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:h-8 sm:w-8"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </Link>

            {editingName ? (
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNameSave();
                    if (e.key === "Escape") {
                      setEditingName(false);
                      setNameInput(strategy.name);
                    }
                  }}
                  className="h-9 min-w-[8rem] flex-1 text-sm font-semibold sm:h-8 sm:max-w-xs"
                  autoFocus
                />
                <Button size="sm" className="h-9 px-3 sm:h-8" onClick={handleNameSave} disabled={isSavingName}>
                  {isSavingName ? "Saving…" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 px-3 sm:h-8"
                  onClick={() => {
                    setEditingName(false);
                    setNameInput(strategy.name);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                className="group flex min-w-0 items-center gap-1 truncate rounded-md text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => setEditingName(true)}
                aria-label={`Edit strategy name (current: ${strategy.name})`}
              >
                <span className="truncate">{strategy.name}</span>
                <Pencil
                  className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60"
                  aria-hidden="true"
                />
              </button>
            )}

            <Badge variant="secondary" className="hidden flex-shrink-0 sm:inline-flex">
              {strategy.asset}
            </Badge>
            <Badge variant="secondary" className="hidden flex-shrink-0 sm:inline-flex">
              {strategy.timeframe}
            </Badge>

            {/* Tags preview (compact) */}
            {strategy.tags && strategy.tags.length > 0 && (
              <div className="hidden items-center gap-1 lg:flex">
                {strategy.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag.id} variant="outline" className="bg-primary/10 text-primary dark:bg-primary/20 text-xs">
                    {tag.name}
                  </Badge>
                ))}
                {strategy.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">+{strategy.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-shrink-0 items-center gap-2">
            {/* Autosave status */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {autosaveState === 'saving' && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  <span>Saving…</span>
                </>
              )}
              {autosaveState === 'saved' && lastSavedAt && (
                <>
                  <CheckIcon className="h-3 w-3 text-primary" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    Saved • <span className="data-text">{relativeTimestamp}</span>
                  </span>
                  <span className="sm:hidden">Saved</span>
                </>
              )}
              {autosaveState === 'error' && (
                <>
                  <AlertCircle className="h-3 w-3 text-destructive" aria-hidden="true" />
                  <span className="text-destructive">Save failed</span>
                  <button
                    type="button"
                    onClick={handleSaveVersion}
                    className="text-destructive underline underline-offset-2 hover:text-destructive/80"
                  >
                    Retry
                  </button>
                </>
              )}
            </div>

            {/* Save button */}
            <Button
              size="sm"
              className="h-9 sm:h-8"
              onClick={handleSaveVersion}
              disabled={isSavingVersion}
            >
              {isSavingVersion ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>

            {/* History Sheet (mobile only) */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-2 focus-visible:ring-1 focus-visible:ring-ring sm:h-8 lg:hidden"
                  aria-label="Version history"
                >
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">History</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full overflow-y-auto sm:w-[400px] sm:max-w-[400px]">
                <SheetHeader>
                  <SheetTitle>Version History</SheetTitle>
                  <SheetDescription>Load previous strategy versions.</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-2">
                  {versions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No saved versions yet.</p>
                  ) : (
                    versions.map((v) => (
                      <div
                        key={v.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3",
                          v.version_number === selectedVersion?.version_number &&
                            "border-primary bg-primary/5"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            Version <span className="data-text">{v.version_number}</span>
                            {v.version_number === selectedVersion?.version_number && (
                              <Badge variant="outline" className="ml-2 text-xs">Current</Badge>
                            )}
                          </div>
                          <div className="data-text text-xs text-muted-foreground">
                            {formatDateTime(v.created_at, timezone)}
                          </div>
                        </div>
                        {v.version_number !== selectedVersion?.version_number && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => confirmLoadVersion(v.version_number)}
                          >
                            Load
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-2 focus-visible:ring-1 focus-visible:ring-ring sm:h-8"
                  aria-label="More actions"
                >
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleAutoUpdateToggle(!strategy.auto_update_enabled)}
                  disabled={isUpdatingAutoUpdate}
                >
                  {strategy.auto_update_enabled
                    ? `Disable Strategy Monitor (${strategy.auto_update_lookback_days}d)`
                    : "Enable Strategy Monitor"}
                </DropdownMenuItem>
                {strategy.auto_update_enabled && (
                  <>
                    <DropdownMenuItem onClick={() => handleLookbackChange(90)} disabled={isUpdatingAutoUpdate}>
                      <span className="flex-1">Lookback: 90 days</span>
                      {strategy.auto_update_lookback_days === 90 && <CheckIcon className="ml-2 h-4 w-4 text-primary" aria-label="Selected" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleLookbackChange(180)} disabled={isUpdatingAutoUpdate}>
                      <span className="flex-1">Lookback: 180 days</span>
                      {strategy.auto_update_lookback_days === 180 && <CheckIcon className="ml-2 h-4 w-4 text-primary" aria-label="Selected" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleLookbackChange(365)} disabled={isUpdatingAutoUpdate}>
                      <span className="flex-1">Lookback: 365 days</span>
                      {strategy.auto_update_lookback_days === 365 && <CheckIcon className="ml-2 h-4 w-4 text-primary" aria-label="Selected" />}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="lg:hidden" />
                <DropdownMenuItem onClick={() => setShowSettings(true)} className="lg:hidden">
                  Settings...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings gear icon (desktop only) */}
            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 px-2 focus-visible:ring-1 focus-visible:ring-ring lg:inline-flex"
              onClick={() => setShowSettings(true)}
              aria-label="Strategy settings"
            >
              <SettingsIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Tabs row */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <StrategyTabs strategyId={id} activeTab="build" />
          {versions.length > 0 && (
            <Select
              value={String(selectedVersion?.version_number || "")}
              onValueChange={(v) => confirmLoadVersion(Number(v))}
            >
              <SelectTrigger className="hidden h-8 w-[110px] text-xs sm:w-[140px] lg:flex">
                <SelectValue placeholder="Version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={String(v.version_number)}>
                    <span className="data-text">
                      v{v.version_number} - {formatDateTime(v.created_at, timezone)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Compact error/success messages — Signal design system `alert` spec */}
        {error && (
          <div
            role="alert"
            className="mt-1 flex items-center gap-2.5 rounded border border-destructive/20 bg-destructive/[0.03] px-3.5 py-2.5 text-[13px] font-medium text-destructive dark:border-destructive/30 dark:bg-destructive/10"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{error}</span>
            {validationErrors.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 shrink-0 px-2 text-xs text-destructive hover:text-destructive/80"
                onClick={() => {
                  const firstErrorBlockId = validationErrors.find((e) => e.block_id)?.block_id;
                  if (firstErrorBlockId) {
                    setSelectedNodeId(firstErrorBlockId);
                    const node = nodes.find((n) => n.id === firstErrorBlockId);
                    if (node) {
                      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                      reactFlowRef.current?.setCenter(node.position.x, node.position.y, {
                        zoom: 1.2,
                        duration: reduceMotion ? 0 : 300,
                      });
                    }
                  }
                }}
              >
                Jump to error ({validationErrors.length})
              </Button>
            )}
            <button
              type="button"
              onClick={() => { setError(null); setValidationErrors([]); }}
              className="shrink-0 rounded-sm p-0.5 text-destructive/60 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Dismiss error"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
        {saveMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mt-1 flex items-center gap-2.5 rounded border border-success/20 bg-success/[0.03] px-3.5 py-2.5 text-[13px] font-medium text-success dark:border-success/30 dark:bg-success/10"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{saveMessage}</span>
            <button
              type="button"
              onClick={() => setSaveMessage(null)}
              className="shrink-0 rounded-sm p-0.5 text-success/60 hover:text-success focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Dismiss message"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Settings Sheet - controlled by showSettings state */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent className="w-full overflow-y-auto sm:w-[400px] sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Strategy Settings</SheetTitle>
            <SheetDescription>
              Configure tags, alerts, and view strategy summary.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Canvas Mode Section */}
            <div>
              <h4 className="text-sm font-semibold">Canvas Mode</h4>
              <p className="text-xs text-muted-foreground">
                Choose how nodes are displayed on the canvas.
              </p>
              <div className="mt-3">
                <label htmlFor="canvas-mode" className="sr-only">Canvas display mode</label>
                <Select
                  value={nodeDisplayMode}
                  onValueChange={(v) => setNodeDisplayMode(v as "expanded" | "compact")}
                >
                  <SelectTrigger id="canvas-mode" className="h-8 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expanded">Standard (Expanded by default)</SelectItem>
                    <SelectItem value="compact">Compact (Click to expand)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Strategy Summary */}
            {explanation && explanation.status === "valid" && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">Strategy Summary</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-primary"
                    onClick={handleCopyExplanation}
                  >
                    Copy
                  </Button>
                </div>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>{explanation.entry}</p>
                  <p>{explanation.exit}</p>
                  {explanation.risk && <p>{explanation.risk}</p>}
                </div>
              </div>
            )}
            {explanation && explanation.status === "fallback" && (
              <div className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
                {explanation.entry}
              </div>
            )}

            {/* Tags Section */}
            <div>
              <h4 className="text-sm font-semibold">Tags</h4>
              <p className="text-xs text-muted-foreground">
                Organize strategies with custom tags for filtering.
              </p>

              <div className="mt-3 space-y-3">
                {strategy.tags && strategy.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {strategy.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline" className="bg-primary/10 text-primary dark:bg-primary/20">
                        {tag.name}
                        <button
                          onClick={() => handleRemoveTag(tag.id)}
                          disabled={isSavingTags}
                          aria-label={`Remove tag ${tag.name}`}
                          className="ml-1 text-primary/70 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        handleAddTag(tagInput);
                      }
                    }}
                    disabled={isSavingTags || (strategy?.tags?.length || 0) >= 20}
                    className="h-8 flex-1"
                    list="available-tags"
                  />
                  <Button
                    size="sm"
                    className="h-8 bg-primary hover:bg-primary/90"
                    onClick={() => handleAddTag(tagInput)}
                    disabled={!tagInput.trim() || isSavingTags || (strategy?.tags?.length || 0) >= 20}
                  >
                    Add
                  </Button>
                </div>

                <datalist id="available-tags">
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={tag.name} />
                  ))}
                </datalist>

                {(strategy?.tags?.length || 0) >= 20 && (
                  <p className="text-xs text-muted-foreground">Maximum 20 tags per strategy.</p>
                )}
              </div>
            </div>

            {/* Performance Alerts Section */}
            <div>
              <h4 className="text-sm font-semibold">Performance Alerts</h4>
              <p className="text-xs text-muted-foreground">
                Get notified when your strategy performance changes significantly.
              </p>

              {isEditingAlert ? (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="alert-enabled" className="text-sm">Enable Alerts</label>
                    <Checkbox
                      id="alert-enabled"
                      checked={alertEnabled}
                      onCheckedChange={(checked) => setAlertEnabled(checked === true)}
                    />
                  </div>

                  {alertEnabled && (
                    <>
                      <div>
                        <label htmlFor="alert-threshold" className="text-sm">Performance Drop Threshold (%)</label>
                        <Input
                          id="alert-threshold"
                          type="number"
                          value={alertThreshold ?? ""}
                          onChange={(e) => setAlertThreshold(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="e.g., 5 for 5% drop"
                          min="0.1"
                          max="100"
                          step="0.1"
                          className="mt-1 h-8"
                        />
                      </div>

                      <fieldset>
                        <legend className="text-sm">Alert Triggers</legend>
                        <div className="mt-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="alert-entry"
                              checked={alertOnEntry}
                              onCheckedChange={(checked) => setAlertOnEntry(checked === true)}
                            />
                            <label htmlFor="alert-entry" className="text-sm">Entry signal detected</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="alert-exit"
                              checked={alertOnExit}
                              onCheckedChange={(checked) => setAlertOnExit(checked === true)}
                            />
                            <label htmlFor="alert-exit" className="text-sm">Exit signal detected</label>
                          </div>
                        </div>
                      </fieldset>

                      <div className="flex items-center justify-between">
                        <label htmlFor="notify-email" className="text-sm">Email notifications</label>
                        <Checkbox
                          id="notify-email"
                          checked={notifyEmail}
                          onCheckedChange={(checked) => setNotifyEmail(checked === true)}
                        />
                      </div>
                    </>
                  )}

                  {alertError && (
                    <p className="text-xs text-destructive">{alertError}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-9 sm:h-8"
                      onClick={handleAlertSave}
                      disabled={isSavingAlert}
                    >
                      {isSavingAlert ? "Saving..." : "Save Alerts"}
                    </Button>
                    {alertRule && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 sm:h-8"
                        onClick={() => {
                          setIsEditingAlert(false);
                          resetAlertForm(alertRule);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="text-sm">
                    <strong>Status:</strong> {alertRule?.is_active ? "Enabled" : "Disabled"}
                  </div>
                  {alertRule?.is_active && (
                    <>
                      {alertRule.threshold_pct !== null && (
                        <div className="text-sm">
                          <strong>Threshold:</strong> {alertRule.threshold_pct}% drop
                        </div>
                      )}
                      <div className="text-sm">
                        <strong>Triggers:</strong>{" "}
                        {alertRule.alert_on_entry && "Entry signal"}
                        {alertRule.alert_on_entry && alertRule.alert_on_exit && ", "}
                        {alertRule.alert_on_exit && "Exit signal"}
                      </div>
                      <div className="text-sm">
                        <strong>Email:</strong> {alertRule.notify_email ? "Yes" : "No"}
                      </div>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 sm:h-8"
                    onClick={() => setIsEditingAlert(true)}
                  >
                    Edit Alerts
                  </Button>
                </div>
              )}
            </div>

            {/* Strategy Monitor Status */}
            <div>
              <h4 className="text-sm font-semibold">Strategy Monitor</h4>
              <p className="text-xs text-muted-foreground mb-1">Automated daily re-testing of your strategy against the latest market data</p>
              <p className="text-sm text-muted-foreground">
                {strategy.auto_update_enabled
                  ? `Enabled (${strategy.auto_update_lookback_days} days lookback)`
                  : "Disabled"}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
            onTidyConnections={handleTidyConnections}
            onLayoutMenu={() => setShowLayoutMenu(true)}
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
                onClick={() => handleAutoArrange("LR")}
                className="w-full"
                variant="outline"
              >
                Arrange: Left → Right
              </Button>
              <Button
                onClick={() => handleAutoArrange("TB")}
                className="w-full"
                variant="outline"
              >
                Arrange: Top → Bottom
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
