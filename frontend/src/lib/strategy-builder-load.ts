/**
 * Builder load resolution (ADR-0005).
 *
 * The Builder reads the working copy (draft) as its source of truth. When the
 * draft is blank but the strategy has frozen versions (e.g. a template clone
 * seeded before the working-copy fix, or a backtested strategy whose draft
 * never received content), we self-heal by falling back to the latest version
 * so the canvas never appears empty for a strategy that has real content.
 *
 * Seeding the draft back is non-destructive (an empty draft has nothing to
 * overwrite) and keeps future backtests consistent with what's on the canvas.
 */

import type { StrategyDefinition } from "@/types/canvas";

/** True when a strategy definition actually contains blocks (i.e. is non-empty). */
export function hasBlocks(
  definition: StrategyDefinition | null | undefined
): boolean {
  return Boolean((definition as { blocks?: unknown[] } | null)?.blocks?.length);
}

/** Minimal API surface needed to resolve the Builder's initial definition. */
export interface BuilderLoadDeps {
  getDraft: (id: string) => Promise<{ definition_json: unknown }>;
  listVersions: (id: string) => Promise<Array<{ version_number: number }>>;
  getVersionDetail: (
    id: string,
    versionNumber: number
  ) => Promise<{ definition_json: unknown }>;
  putDraft: (id: string, definition: Record<string, unknown>) => Promise<void>;
}

/**
 * Resolve which definition the Builder should render for a strategy.
 *
 * Returns the draft definition when it has blocks; otherwise falls back to the
 * latest frozen version (seeding the draft with it) when one exists. Returns
 * `null` when there is nothing to show, so the caller can render the default
 * blank canvas. Version recovery is best-effort: any failure resolves to the
 * draft definition (or `null`) rather than throwing.
 */
export async function resolveBuilderDefinition(
  id: string,
  deps: BuilderLoadDeps
): Promise<StrategyDefinition | null> {
  const draft = await deps.getDraft(id);
  const draftDefinition = draft.definition_json as StrategyDefinition | null;

  if (hasBlocks(draftDefinition)) {
    return draftDefinition;
  }

  try {
    const versions = await deps.listVersions(id);
    if (versions.length === 0) {
      return draftDefinition;
    }

    const detail = await deps.getVersionDetail(id, versions[0].version_number);
    const versionDefinition = detail.definition_json as StrategyDefinition | null;

    if (hasBlocks(versionDefinition)) {
      await deps.putDraft(
        id,
        versionDefinition as unknown as Record<string, unknown>
      );
      return versionDefinition;
    }

    return draftDefinition;
  } catch (err) {
    // Best-effort recovery — fall back to whatever the draft was.
    console.error("Failed to seed working copy from latest version:", err);
    return draftDefinition;
  }
}
