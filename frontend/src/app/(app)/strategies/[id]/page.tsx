"use client";

import { useEffect, useState, use, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Node, Edge, ReactFlowInstance } from "@xyflow/react";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useDisplay } from "@/context/display";
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
} from "@/lib/canvas-utils";
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
import StrategyCanvas from "@/components/canvas/StrategyCanvas";
import BlockPalette from "@/components/canvas/BlockPalette";
import BlockLibrarySheet from "@/components/canvas/BlockLibrarySheet";
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
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { isInputElement } from "@/lib/keyboard-shortcuts";

interface Props {
  params: Promise<{ id: string }>;
}

export default function StrategyEditorPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { timezone, mobileCanvasMode, setMobileCanvasMode, isMobileCanvasMode, nodeDisplayMode } = useDisplay();

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

  // History state
  const [history, setHistory] = useState<HistoryState>(() => resetHistory([], []));
  const snapshotTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isApplyingHistoryRef = useRef(false);

  // Mobile drawer state
  const [showProperties, setShowProperties] = useState(false);

  // ReactFlow instance ref for block library sheet
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);

  // Editable name state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Save version state
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
  const [isLoadingAlert, setIsLoadingAlert] = useState(true);
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

          // Generate explanation for default definition
          const result = generateExplanation(defaultDef);
          setExplanation(result);
        }
        setValidationErrors([]);
      } catch {
        // Failed to load version detail
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

  const loadVersions = useCallback(async () => {
    try {
      const data = await apiFetch<StrategyVersion[]>(`/strategies/${id}/versions`);
      setVersions(data);
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
    } catch {
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
        setIsLoadingAlert(false);
      } finally {
        setIsLoadingAlert(false);
      }
    };
    fetchAlert();
  }, [id, resetAlertForm]);

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
    if (!nameInput.trim() || nameInput === strategy?.name) {
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
      setSaveMessage("Version saved successfully");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save version");
    } finally {
      setIsSavingVersion(false);
    }
  }, [isSavingVersion, nodes, edges, id, loadVersions, loadStrategy]);

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

  // Debounced snapshot for history
  const scheduleSnapshot = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    if (isApplyingHistoryRef.current) return;

    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }

    snapshotTimerRef.current = setTimeout(() => {
      snapshotTimerRef.current = null;
      if (isApplyingHistoryRef.current) return;
      setHistory((h) => pushSnapshot(h, newNodes, newEdges));
    }, 500);
  }, []);

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
    let updatedNodes: Node[] = [];
    let updatedEdges: Edge[] = [];

    setNodes((currentNodes) => {
      updatedNodes = currentNodes.filter((node) => node.id !== nodeId);
      return updatedNodes;
    });
    setEdges((currentEdges) => {
      updatedEdges = currentEdges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );
      return updatedEdges;
    });

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

  // Handle nodes change
  const handleNodesChange = (newNodes: Node[]) => {
    setNodes(newNodes);
    scheduleSnapshot(newNodes, edges);
  };

  // Handle edges change
  const handleEdgesChange = (newEdges: Edge[]) => {
    setEdges(newEdges);
    scheduleSnapshot(nodes, newEdges);
  };

  // Handle undo
  const handleUndo = useCallback(() => {
    if (!canUndo(history)) return;

    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
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

      // Run backtest: Cmd/Ctrl+R (navigate to backtest tab)
      if (isMod && key === "r" && !e.shiftKey) {
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

      // Copy: Cmd/Ctrl+C
      if (isMod && key === "c") {
        e.preventDefault();
        copyToClipboard(selectedNodeIds, nodes, edges);
        return;
      }

      // Paste: Cmd/Ctrl+V
      if (isMod && key === "v") {
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
      setError(err instanceof Error ? err.message : "Failed to update auto-update setting");
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

  const handleCopyExplanation = () => {
    if (!explanation) return;
    const text = [explanation.entry, explanation.exit, explanation.risk]
      .filter(Boolean)
      .join(" ");
    navigator.clipboard.writeText(text);
    setSaveMessage("Explanation copied to clipboard");
    setTimeout(() => setSaveMessage(null), 2000);
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
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading strategy...</div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Strategy not found</p>
          <Link href="/strategies" className="mt-4 text-blue-600 hover:text-blue-800">
            Back to strategies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Compact Top Bar */}
      <div className="flex-shrink-0 border-b bg-white px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Back + Name + Badges */}
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/strategies" className="flex-shrink-0 text-muted-foreground hover:text-foreground">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
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
                  className="h-7 w-32 text-sm font-semibold sm:w-40"
                  autoFocus
                />
                <Button size="sm" className="h-7 px-2" onClick={handleNameSave} disabled={isSavingName}>
                  {isSavingName ? "..." : "OK"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
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
                className="min-w-0 truncate text-sm font-semibold text-foreground hover:text-primary"
                onClick={() => setEditingName(true)}
                title="Click to edit name"
              >
                {strategy.name}
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
                  <Badge key={tag.id} variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                    {tag.name}
                  </Badge>
                ))}
                {strategy.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">+{strategy.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>

          {/* Right: Version + Actions */}
          <div className="flex flex-shrink-0 items-center gap-2">
            {/* Version selector */}
            {versions.length > 0 && (
              <Select
                value={String(selectedVersion?.version_number || "")}
                onValueChange={(v) => loadVersionDetail(Number(v))}
              >
                <SelectTrigger className="h-8 w-[110px] text-xs sm:w-[140px]">
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={String(v.version_number)}>
                      v{v.version_number} - {formatDateTime(v.created_at, timezone).split(" ")[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Save button */}
            <Button size="sm" className="h-8" onClick={handleSaveVersion} disabled={isSavingVersion}>
              {isSavingVersion ? "..." : "Save"}
            </Button>

            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
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
                  {strategy.auto_update_enabled ? "Disable" : "Enable"} Auto-update
                </DropdownMenuItem>
                {strategy.auto_update_enabled && (
                  <>
                    <DropdownMenuItem onClick={() => handleLookbackChange(90)} disabled={isUpdatingAutoUpdate}>
                      Lookback: 90 days {strategy.auto_update_lookback_days === 90 && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleLookbackChange(180)} disabled={isUpdatingAutoUpdate}>
                      Lookback: 180 days {strategy.auto_update_lookback_days === 180 && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleLookbackChange(365)} disabled={isUpdatingAutoUpdate}>
                      Lookback: 365 days {strategy.auto_update_lookback_days === 365 && "✓"}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings Sheet (Tags, Alerts, Summary) */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full overflow-y-auto sm:w-[400px] sm:max-w-[400px]">
                <SheetHeader>
                  <SheetTitle>Strategy Settings</SheetTitle>
                  <SheetDescription>
                    Configure tags, alerts, and view strategy summary.
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Strategy Summary */}
                  {explanation && explanation.status === "valid" && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-700">Strategy Summary</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-blue-600"
                          onClick={handleCopyExplanation}
                        >
                          Copy
                        </Button>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-gray-700">
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
                            <Badge key={tag.id} variant="outline" className="bg-purple-50 text-purple-700">
                              {tag.name}
                              <button
                                onClick={() => handleRemoveTag(tag.id)}
                                disabled={isSavingTags}
                                className="ml-1 text-purple-500 hover:text-purple-700 disabled:opacity-50"
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
                          className="h-8 bg-purple-600 hover:bg-purple-700"
                          onClick={() => handleAddTag(tagInput)}
                          disabled={!tagInput.trim() || isSavingTags || (strategy?.tags?.length || 0) >= 20}
                        >
                          {isSavingTags ? "..." : "Add"}
                        </Button>
                      </div>

                      <datalist id="available-tags">
                        {availableTags.map((tag) => (
                          <option key={tag.id} value={tag.name} />
                        ))}
                      </datalist>

                      {strategy.tags && strategy.tags.length >= 20 && (
                        <p className="text-xs text-destructive">Maximum 20 tags</p>
                      )}
                    </div>
                  </div>

                  {/* Performance Alerts Section */}
                  <div>
                    <h4 className="text-sm font-semibold">Performance Alerts</h4>
                    <p className="text-xs text-muted-foreground">
                      Get notified on scheduled re-backtest conditions.
                    </p>

                    {isLoadingAlert ? (
                      <div className="mt-2 text-sm text-muted-foreground">Loading...</div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {isEditingAlert ? (
                          <>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={alertEnabled}
                                onChange={(e) => setAlertEnabled(e.target.checked)}
                                className="rounded border-input"
                              />
                              Enable alerts
                            </label>

                            {alertEnabled && (
                              <>
                                <div>
                                  <label className="block text-xs text-muted-foreground">
                                    Drawdown threshold (%)
                                  </label>
                                  <Input
                                    type="number"
                                    min="0.1"
                                    max="100"
                                    step="0.1"
                                    placeholder="Optional"
                                    value={alertThreshold ?? ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setAlertThreshold(value === "" ? null : Number(value));
                                    }}
                                    className="mt-1 h-8 w-24"
                                  />
                                </div>

                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={alertOnEntry}
                                    onChange={(e) => setAlertOnEntry(e.target.checked)}
                                    className="rounded border-input"
                                  />
                                  Alert on entry signal
                                </label>

                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={alertOnExit}
                                    onChange={(e) => setAlertOnExit(e.target.checked)}
                                    className="rounded border-input"
                                  />
                                  Alert on exit signal
                                </label>

                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={notifyEmail}
                                    onChange={(e) => setNotifyEmail(e.target.checked)}
                                    className="rounded border-input"
                                  />
                                  Also email me
                                </label>
                              </>
                            )}

                            <div className="flex gap-2">
                              <Button size="sm" className="h-8" onClick={handleAlertSave} disabled={isSavingAlert}>
                                {isSavingAlert ? "..." : "Save Alert"}
                              </Button>
                              {alertRule && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => {
                                    resetAlertForm(alertRule);
                                    setAlertError(null);
                                    setIsEditingAlert(false);
                                  }}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {alertRule ? (alertRule.is_active ? "Alerts enabled" : "Alerts disabled") : "No alert configured"}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                onClick={() => setIsEditingAlert(true)}
                              >
                                {alertRule ? "Edit" : "Create"}
                              </Button>
                            </div>

                            {alertRule && (
                              <div className="grid gap-1 text-sm text-muted-foreground">
                                <div>Drawdown: {alertRule.threshold_pct ? `${alertRule.threshold_pct}%` : "Not set"}</div>
                                <div>Entry: {alertRule.alert_on_entry ? "On" : "Off"} | Exit: {alertRule.alert_on_exit ? "On" : "Off"}</div>
                                <div>Email: {alertRule.notify_email ? "On" : "Off"}</div>
                              </div>
                            )}

                            {alertRule?.last_triggered_at && (
                              <div className="text-xs text-muted-foreground">
                                Last triggered: {new Date(alertRule.last_triggered_at).toLocaleString()}
                              </div>
                            )}
                          </>
                        )}

                        {alertError && <div className="text-sm text-destructive">{alertError}</div>}
                      </div>
                    )}
                  </div>

                  {/* Canvas Mode */}
                  <div>
                    <h4 className="text-sm font-semibold">Canvas Mode</h4>
                    <p className="text-xs text-muted-foreground">
                      Mobile mode uses tap-to-connect instead of dragging
                    </p>
                    <Select value={mobileCanvasMode} onValueChange={setMobileCanvasMode}>
                      <SelectTrigger className="mt-2 h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (based on screen size)</SelectItem>
                        <SelectItem value="mobile">Always mobile mode</SelectItem>
                        <SelectItem value="desktop">Always desktop mode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Auto-update Status */}
                  <div>
                    <h4 className="text-sm font-semibold">Auto-update</h4>
                    <p className="text-sm text-muted-foreground">
                      {strategy.auto_update_enabled
                        ? `Enabled (${strategy.auto_update_lookback_days} days lookback)`
                        : "Disabled"}
                    </p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Tabs row */}
        <div className="mt-1">
          <StrategyTabs strategyId={id} activeTab="build" />
        </div>

        {/* Compact error/success messages */}
        {error && (
          <div className="mt-1 rounded border border-destructive/50 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            {error}
            {validationErrors.length > 0 && (
              <span className="ml-1 text-muted-foreground">
                ({validationErrors.length} error{validationErrors.length > 1 ? "s" : ""})
              </span>
            )}
          </div>
        )}
        {saveMessage && (
          <div className="mt-1 rounded border border-green-200 bg-green-50 px-2 py-1.5 text-xs text-green-600">
            {saveMessage}
          </div>
        )}
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Block Palette (hidden on mobile, drawer) */}
        <div className="hidden w-64 flex-shrink-0 border-r lg:block">
          <BlockPalette onDragStart={handlePaletteDragStart} isMobileMode={isMobileCanvasMode} />
        </div>

        {/* Center - Canvas */}
        <div className="relative flex-1">
          {/* Mobile floating buttons */}
          <div className="absolute left-4 top-4 z-10 flex gap-2">
            <BlockLibrarySheet
              onDragStart={handlePaletteDragStart}
              onAddNode={handleAddNode}
              reactFlowInstance={reactFlowRef}
              isMobileMode={isMobileCanvasMode}
            />
          </div>
          <div className="absolute right-4 top-4 z-10 lg:hidden">
            <button
              onClick={() => setShowProperties(true)}
              className="rounded-full bg-white p-2 shadow-md"
              disabled={!selectedNode}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          <StrategyCanvas
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
          />
        </div>

        {/* Right Panel - Inspector (hidden on mobile, drawer) */}
        <div className="hidden w-72 flex-shrink-0 border-l lg:block">
          <InspectorPanel
            selectedNode={selectedNode}
            onParamsChange={handleParamsChange}
            onDeleteNode={handleDeleteNode}
            validationErrors={validationErrors}
            isMobileMode={isMobileCanvasMode}
          />
        </div>

        {/* Mobile Inspector Sheet */}
        <Sheet open={showProperties} onOpenChange={setShowProperties}>
          <SheetContent side="bottom" className="max-h-[70vh] p-0 lg:hidden">
            <InspectorPanel
              selectedNode={selectedNode}
              onParamsChange={handleParamsChange}
              onDeleteNode={handleDeleteNode}
              validationErrors={validationErrors}
              isMobileMode={true}
            />
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
