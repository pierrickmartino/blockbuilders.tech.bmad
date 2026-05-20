import type { BlockMeta, BlockType, BlockCategory } from "@/types/canvas";
import { PLAIN_LABEL_MAP } from "@/types/canvas";

export type PaletteCommandSource = "recents" | "favorites" | "search" | "browse";

export interface PaletteCommand {
  kind: "insert";
  blockType: BlockType;
  label: string;
  category: BlockCategory;
  keywords: string[];
  source: PaletteCommandSource;
}

export interface PaletteCommandGroup {
  groupLabel: string;
  commands: PaletteCommand[];
}

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  input: "Data",
  indicator: "Indicators",
  logic: "Logic",
  signal: "Signals",
  risk: "Risk",
};

const CATEGORY_ORDER: BlockCategory[] = ["input", "indicator", "logic", "signal", "risk"];
const RECENTS_CAP = 5;

function toCommand(meta: BlockMeta, source: PaletteCommandSource): PaletteCommand {
  const plainLabel = PLAIN_LABEL_MAP[meta.type as keyof typeof PLAIN_LABEL_MAP];
  const keywords: string[] = [meta.type, CATEGORY_LABELS[meta.category]];
  if (plainLabel) keywords.push(plainLabel);
  return {
    kind: "insert",
    blockType: meta.type,
    label: plainLabel ?? meta.label,
    category: meta.category,
    keywords,
    source,
  };
}

function buildRecentsGroup(
  registry: BlockMeta[],
  recents: BlockType[]
): PaletteCommandGroup | null {
  const capped = recents.slice(0, RECENTS_CAP);
  const commands = capped.flatMap((type) => {
    const meta = registry.find((b) => b.type === type);
    return meta ? [toCommand(meta, "recents")] : [];
  });
  return commands.length ? { groupLabel: "Recents", commands } : null;
}

function buildFavouritesGroup(
  registry: BlockMeta[],
  favorites: BlockType[]
): PaletteCommandGroup | null {
  const commands = favorites.flatMap((type) => {
    const meta = registry.find((b) => b.type === type);
    return meta ? [toCommand(meta, "favorites")] : [];
  });
  return commands.length ? { groupLabel: "Favourites", commands } : null;
}

function buildCategoryGroups(
  registry: BlockMeta[],
  source: PaletteCommandSource
): PaletteCommandGroup[] {
  return CATEGORY_ORDER.map((cat) => ({
    groupLabel: CATEGORY_LABELS[cat],
    commands: registry
      .filter((b) => b.category === cat)
      .map((meta) => toCommand(meta, source)),
  })).filter((g) => g.commands.length > 0);
}

export function buildCommandList(params: {
  registry: BlockMeta[];
  recents: BlockType[];
  favorites: BlockType[];
  query: string;
}): PaletteCommandGroup[] {
  const { registry, recents, favorites, query } = params;
  const isSearching = query.trim().length > 0;
  const source: PaletteCommandSource = isSearching ? "search" : "browse";

  const groups: PaletteCommandGroup[] = [];

  if (!isSearching) {
    const recentsGroup = buildRecentsGroup(registry, recents);
    if (recentsGroup) groups.push(recentsGroup);

    const favsGroup = buildFavouritesGroup(registry, favorites);
    if (favsGroup) groups.push(favsGroup);
  }

  groups.push(...buildCategoryGroups(registry, source));
  return groups;
}
