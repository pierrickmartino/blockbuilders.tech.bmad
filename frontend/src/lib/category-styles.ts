import type { BlockCategory } from "@/types/canvas";

export interface CategoryStyle {
  iconBg: string;
  iconColor: string;
  border: string;
  borderSelected: string;
  borderHover: string;
  ringSelected: string;
  badgeText: string;
  badgeBg: string;
  label: string;
  selectedShadow: string;
  chipBg: string;
}

export const categoryStyles: Record<BlockCategory, CategoryStyle> = {
  input: {
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    iconColor: "text-violet-600 dark:text-violet-400",
    border: "border-gray-200 dark:border-slate-700",
    borderSelected: "border-violet-400 dark:border-violet-500",
    borderHover: "hover:border-violet-300 dark:hover:border-violet-600",
    ringSelected: "ring-1 ring-violet-200 dark:ring-violet-800",
    badgeText: "text-violet-700 dark:text-violet-300",
    badgeBg: "bg-violet-50 dark:bg-violet-900/30",
    label: "Input",
    selectedShadow: "shadow-[0_4px_16px_rgba(109,40,217,0.12)]",
    chipBg: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-300",
  },
  indicator: {
    iconBg: "bg-sky-100 dark:bg-sky-900/40",
    iconColor: "text-sky-600 dark:text-sky-400",
    border: "border-gray-200 dark:border-slate-700",
    borderSelected: "border-sky-400 dark:border-sky-500",
    borderHover: "hover:border-sky-300 dark:hover:border-sky-600",
    ringSelected: "ring-1 ring-sky-200 dark:ring-sky-800",
    badgeText: "text-sky-700 dark:text-sky-300",
    badgeBg: "bg-sky-50 dark:bg-sky-900/30",
    label: "Indicator",
    selectedShadow: "shadow-[0_4px_16px_rgba(2,132,199,0.12)]",
    chipBg: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-300",
  },
  logic: {
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    border: "border-gray-200 dark:border-slate-700",
    borderSelected: "border-amber-400 dark:border-amber-500",
    borderHover: "hover:border-amber-300 dark:hover:border-amber-600",
    ringSelected: "ring-1 ring-amber-200 dark:ring-amber-800",
    badgeText: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-50 dark:bg-amber-900/30",
    label: "Logic",
    selectedShadow: "shadow-[0_4px_16px_rgba(217,119,6,0.12)]",
    chipBg: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300",
  },
  signal: {
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    border: "border-gray-200 dark:border-slate-700",
    borderSelected: "border-emerald-400 dark:border-emerald-500",
    borderHover: "hover:border-emerald-300 dark:hover:border-emerald-600",
    ringSelected: "ring-1 ring-emerald-200 dark:ring-emerald-800",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-50 dark:bg-emerald-900/30",
    label: "Signal",
    selectedShadow: "shadow-[0_4px_16px_rgba(5,150,105,0.12)]",
    chipBg: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300",
  },
  risk: {
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
    iconColor: "text-rose-600 dark:text-rose-400",
    border: "border-gray-200 dark:border-slate-700",
    borderSelected: "border-rose-400 dark:border-rose-500",
    borderHover: "hover:border-rose-300 dark:hover:border-rose-600",
    ringSelected: "ring-1 ring-rose-200 dark:ring-rose-800",
    badgeText: "text-rose-700 dark:text-rose-300",
    badgeBg: "bg-rose-50 dark:bg-rose-900/30",
    label: "Risk",
    selectedShadow: "shadow-[0_4px_16px_rgba(225,29,72,0.12)]",
    chipBg: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-300",
  },
};
