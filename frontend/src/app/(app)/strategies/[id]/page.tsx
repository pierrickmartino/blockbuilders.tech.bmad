"use client";

import { useEffect, useState, use, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Node, Edge } from "@xyflow/react";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useDisplay } from "@/context/display";
import { Strategy, StrategyVersion, StrategyVersionDetail, StrategyExportFile } from "@/types/strategy";
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
import { generateExplanation } from "@/lib/explanation-generator";
import StrategyCanvas from "@/components/canvas/StrategyCanvas";
import BlockPalette from "@/components/canvas/BlockPalette";
import PropertiesPanel from "@/components/canvas/PropertiesPanel";
import { StrategyTabs } from "@/components/StrategyTabs";

interface Props {
  params: Promise<{ id: string }>;
}

export default function StrategyEditorPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { timezone } = useDisplay();

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [versions, setVersions] = useState<StrategyVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<StrategyVersionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Canvas state
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Mobile drawer state
  const [showPalette, setShowPalette] = useState(false);
  const [showProperties, setShowProperties] = useState(false);

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

          // Generate explanation
          const result = generateExplanation(definition);
          setExplanation(result);
        } else {
          // Create default canvas with pre-placed blocks
          const defaultDef = createDefaultDefinition();
          const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(defaultDef);
          setNodes(newNodes);
          setEdges(newEdges);

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
      }
    } catch {
      // Versions are optional, create default canvas
      const defaultDef = createDefaultDefinition();
      const { nodes: newNodes, edges: newEdges } = definitionToReactFlow(defaultDef);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [id, loadVersionDetail]);

  useEffect(() => {
    loadStrategy();
    loadVersions();
  }, [loadStrategy, loadVersions]);

  // Load alert rule for this strategy
  useEffect(() => {
    const fetchAlert = async () => {
      try {
        const alerts = await apiFetch<AlertRule[]>("/alerts");
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
  }, [id]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
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
              validationMessage: nodeErrors[0]?.message,
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

  const handleSaveVersion = async () => {
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
  };

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
        const created = await apiFetch<AlertRule>("/alerts", {
          method: "POST",
          body: JSON.stringify({
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

  // Handle drag start from palette
  const handlePaletteDragStart = (event: React.DragEvent, blockMeta: BlockMeta) => {
    event.dataTransfer.setData("application/blockMeta", JSON.stringify(blockMeta));
    event.dataTransfer.effectAllowed = "move";
  };

  // Handle parameter changes from properties panel
  const handleParamsChange = (nodeId: string, params: Record<string, unknown>) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
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
      })
    );
    // Clear validation errors when user makes changes
    setValidationErrors([]);
    setError(null);
  };

  // Handle node deletion from properties panel
  const handleDeleteNode = (nodeId: string) => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    );
    setSelectedNodeId(null);
    setValidationErrors([]);
    setError(null);
  };

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
    setNodes((currentNodes) => [...currentNodes, newNote]);
    setSelectedNodeId(noteId);
  };

  // Handle nodes change
  const handleNodesChange = (newNodes: Node[]) => {
    setNodes(newNodes);
  };

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
      {/* Top Bar */}
      <div className="border-b bg-white px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/strategies" className="text-gray-500 hover:text-gray-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>

            {editingName ? (
              <div className="flex items-center gap-2">
                <input
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
                  className="w-48 rounded border border-gray-300 px-2 py-1 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleNameSave}
                  disabled={isSavingName}
                  className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSavingName ? "..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNameInput(strategy.name);
                  }}
                  className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h1
                className="cursor-pointer text-lg font-semibold text-gray-900 hover:text-blue-600"
                onClick={() => setEditingName(true)}
                title="Click to edit name"
              >
                {strategy.name}
              </h1>
            )}

            <span className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 sm:inline">
              {strategy.asset}
            </span>
            <span className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 sm:inline">
              {strategy.timeframe}
            </span>

            {/* Auto-update toggle section */}
            <div className="ml-2 hidden items-center gap-2 border-l pl-4 sm:flex">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={strategy.auto_update_enabled}
                  onChange={(e) => handleAutoUpdateToggle(e.target.checked)}
                  disabled={isUpdatingAutoUpdate}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
                Auto-update daily
              </label>
              {strategy.auto_update_enabled && (
                <select
                  value={strategy.auto_update_lookback_days}
                  onChange={(e) => handleLookbackChange(Number(e.target.value))}
                  disabled={isUpdatingAutoUpdate}
                  className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                >
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>365 days</option>
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {versions.length > 0 && (
              <select
                value={selectedVersion?.version_number || ""}
                onChange={(e) => loadVersionDetail(Number(e.target.value))}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.version_number}>
                    v{v.version_number} – {formatDateTime(v.created_at, timezone)}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleSaveVersion}
              disabled={isSavingVersion}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSavingVersion ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleExport}
              className="rounded border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Export
            </button>
          </div>
        </div>

        <StrategyTabs strategyId={id} activeTab="build" />

        {/* Performance Alerts Card */}
        <section className="mt-2 rounded-lg bg-white p-4 shadow-sm sm:p-6">
          <h3 className="text-sm font-semibold text-gray-900 sm:text-base">Performance Alerts</h3>
          <p className="text-xs text-gray-500">
            Get notified when scheduled re-backtests meet conditions. Drawdown threshold is optional.
          </p>

          {isLoadingAlert ? (
            <div className="mt-2 text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="mt-3 space-y-3">
              {isEditingAlert ? (
                <>
                  {/* Enable toggle */}
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={alertEnabled}
                      onChange={(e) => setAlertEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Enable alerts
                  </label>

                  {alertEnabled && (
                    <>
                      {/* Drawdown threshold */}
                      <div>
                        <label className="block text-xs text-gray-600">
                          Alert when drawdown exceeds (%)
                        </label>
                        <input
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
                          className="mt-1 w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>

                      {/* Entry/Exit checkboxes */}
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={alertOnEntry}
                          onChange={(e) => setAlertOnEntry(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Alert on entry signal
                      </label>

                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={alertOnExit}
                          onChange={(e) => setAlertOnExit(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Alert on exit signal
                      </label>

                      {/* Email notification */}
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Also email me
                      </label>
                    </>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAlertSave}
                      disabled={isSavingAlert}
                      className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSavingAlert ? "Saving..." : "Save Alert"}
                    </button>
                    {alertRule && (
                      <button
                        onClick={() => {
                          resetAlertForm(alertRule);
                          setAlertError(null);
                          setIsEditingAlert(false);
                        }}
                        className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">
                      {alertRule ? (alertRule.is_active ? "Alerts enabled" : "Alerts disabled") : "No alert configured"}
                    </div>
                    <button
                      onClick={() => setIsEditingAlert(true)}
                      className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {alertRule ? "Edit" : "Create"}
                    </button>
                  </div>

                  {alertRule && (
                    <div className="grid gap-1 text-sm text-gray-600">
                      <div>
                        Drawdown threshold:{" "}
                        {alertRule.threshold_pct ? `${alertRule.threshold_pct}%` : "Not set"}
                      </div>
                      <div>Entry signal: {alertRule.alert_on_entry ? "On" : "Off"}</div>
                      <div>Exit signal: {alertRule.alert_on_exit ? "On" : "Off"}</div>
                      <div>Email notification: {alertRule.notify_email ? "On" : "Off"}</div>
                    </div>
                  )}

                  {/* Last triggered */}
                  {alertRule?.last_triggered_at && (
                    <div className="text-xs text-gray-500">
                      Last triggered: {new Date(alertRule.last_triggered_at).toLocaleString()}
                    </div>
                  )}
                </>
              )}

              {/* Error message */}
              {alertError && <div className="text-sm text-red-600">{alertError}</div>}
            </div>
          )}
        </section>

        {/* Error/Success Messages */}
        {error && (
          <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            <div>{error}</div>
            {validationErrors.length > 0 && (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-red-700">
                {validationErrors.map((err, index) => {
                  const blockLabel =
                    err.block_id &&
                    nodes.find((node) => node.id === err.block_id)?.data?.label;
                  const prefix = blockLabel ? `${blockLabel}: ` : "";
                  return (
                    <li key={`${err.code}-${err.block_id || index}`}>
                      {prefix}
                      {err.message}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        {saveMessage && (
          <div className="mt-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-600">
            {saveMessage}
          </div>
        )}

        {/* Strategy Explanation */}
        {explanation && explanation.status === "valid" && (
          <div className="mt-2 rounded border border-blue-100 bg-blue-50 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700">Strategy Summary</span>
              <button
                onClick={handleCopyExplanation}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Copy
              </button>
            </div>
            <div className="mt-1 space-y-1 text-sm text-gray-700">
              <p>{explanation.entry}</p>
              <p>{explanation.exit}</p>
              {explanation.risk && <p>{explanation.risk}</p>}
            </div>
          </div>
        )}
        {explanation && explanation.status === "fallback" && (
          <div className="mt-2 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {explanation.entry}
          </div>
        )}
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Block Palette (hidden on mobile, drawer) */}
        <div className="hidden w-64 flex-shrink-0 border-r lg:block">
          <BlockPalette onDragStart={handlePaletteDragStart} />
        </div>

        {/* Mobile Palette Drawer */}
        {showPalette && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowPalette(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="font-semibold">Blocks</span>
                <button onClick={() => setShowPalette(false)} className="text-gray-500">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <BlockPalette onDragStart={handlePaletteDragStart} />
            </div>
          </div>
        )}

        {/* Center - Canvas */}
        <div className="relative flex-1">
          {/* Mobile floating buttons */}
          <div className="absolute left-4 top-4 z-10 flex gap-2 lg:hidden">
            <button
              onClick={() => setShowPalette(true)}
              className="rounded-full bg-white p-2 shadow-md"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
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
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={setEdges}
            onNodeSelect={(node) => setSelectedNodeId(node?.id ?? null)}
            onAddNote={handleAddNote}
            globalValidationErrors={globalValidationErrors}
          />
        </div>

        {/* Right Panel - Properties (hidden on mobile, drawer) */}
        <div className="hidden w-72 flex-shrink-0 border-l lg:block">
          <PropertiesPanel
            selectedNode={selectedNode}
            onParamsChange={handleParamsChange}
            onDeleteNode={handleDeleteNode}
            validationErrors={validationErrors}
          />
        </div>

        {/* Mobile Properties Drawer */}
        {showProperties && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowProperties(false)} />
            <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="font-semibold">Properties</span>
                <button onClick={() => setShowProperties(false)} className="text-gray-500">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <PropertiesPanel
                selectedNode={selectedNode}
                onParamsChange={handleParamsChange}
                onDeleteNode={handleDeleteNode}
                validationErrors={validationErrors}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
