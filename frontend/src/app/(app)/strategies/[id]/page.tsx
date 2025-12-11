"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Strategy, StrategyVersion, StrategyVersionDetail } from "@/types/strategy";

interface Props {
  params: Promise<{ id: string }>;
}

export default function StrategyEditorPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [versions, setVersions] = useState<StrategyVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<StrategyVersionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable name state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Save version state
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadVersionDetail = useCallback(async (versionNumber: number) => {
    try {
      const data = await apiFetch<StrategyVersionDetail>(
        `/strategies/${id}/versions/${versionNumber}`
      );
      setSelectedVersion(data);
    } catch {
      // Failed to load version detail
    }
  }, [id]);

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
      }
    } catch {
      // Versions are optional, don't show error
    }
  }, [id, loadVersionDetail]);

  useEffect(() => {
    loadStrategy();
    loadVersions();
  }, [loadStrategy, loadVersions]);

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
    try {
      // For now, save an empty definition (Epic 3 will add canvas logic)
      const definition = selectedVersion?.definition_json || {};
      await apiFetch(`/strategies/${id}/versions`, {
        method: "POST",
        body: JSON.stringify({ definition }),
      });
      await loadVersions();
      await loadStrategy(); // Refresh updated_at
      setSaveMessage("Version saved successfully");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save version");
    } finally {
      setIsSavingVersion(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading strategy...</div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Strategy not found</p>
        <Link href="/strategies" className="mt-4 text-blue-600 hover:text-blue-800">
          Back to strategies
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/strategies"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to strategies
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {saveMessage && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-600">
          {saveMessage}
        </div>
      )}

      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
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
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-xl font-bold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleNameSave}
                  disabled={isSavingName}
                  className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSavingName ? "..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNameInput(strategy.name);
                  }}
                  className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h1
                className="cursor-pointer text-2xl font-bold text-gray-900 hover:text-blue-600"
                onClick={() => setEditingName(true)}
                title="Click to edit name"
              >
                {strategy.name}
              </h1>
            )}

            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="rounded bg-gray-100 px-2 py-1">
                {strategy.asset}
              </span>
              <span className="rounded bg-gray-100 px-2 py-1">
                {strategy.timeframe}
              </span>
              {strategy.is_archived && (
                <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-700">
                  Archived
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {versions.length > 0 && (
              <select
                value={selectedVersion?.version_number || ""}
                onChange={(e) => loadVersionDetail(Number(e.target.value))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.version_number}>
                    v{v.version_number} – {formatDate(v.created_at)}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleSaveVersion}
              disabled={isSavingVersion}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSavingVersion ? "Saving..." : "Save Version"}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas placeholder - Epic 3 will implement this */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <div className="text-gray-500">
          <p className="text-lg font-medium">Strategy Canvas</p>
          <p className="mt-2 text-sm">
            The visual block-based strategy builder will be implemented in Epic 3.
          </p>
          {selectedVersion && (
            <div className="mt-6 text-left">
              <p className="text-xs font-medium text-gray-400">Current definition (JSON):</p>
              <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-100 p-4 text-xs text-gray-600">
                {JSON.stringify(selectedVersion.definition_json, null, 2) || "{}"}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
