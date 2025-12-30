import { TOOLTIP_CONTENT, TooltipContent } from "@/lib/tooltip-content";

export default function GlossaryPage() {
  const byCategory = {
    blocks: Object.entries(TOOLTIP_CONTENT).filter(
      ([, v]) => v.category === "block"
    ),
    metrics: Object.entries(TOOLTIP_CONTENT).filter(
      ([, v]) => v.category === "metric"
    ),
    params: Object.entries(TOOLTIP_CONTENT).filter(
      ([, v]) => v.category === "param"
    ),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold text-gray-900">Glossary</h1>

      <p className="mb-8 text-sm text-gray-600">
        Quick reference for all blocks, metrics, and parameters in
        Blockbuilders.
      </p>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Strategy Blocks
        </h2>
        <div className="space-y-3">
          {byCategory.blocks.map(([id, content]) => (
            <GlossaryEntry key={id} id={id} content={content} />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Backtest Metrics
        </h2>
        <div className="space-y-3">
          {byCategory.metrics.map(([id, content]) => (
            <GlossaryEntry key={id} id={id} content={content} />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Parameters
        </h2>
        <div className="space-y-3">
          {byCategory.params.map(([id, content]) => (
            <GlossaryEntry key={id} id={id} content={content} />
          ))}
        </div>
      </section>
    </div>
  );
}

interface GlossaryEntryProps {
  id: string;
  content: TooltipContent;
}

function GlossaryEntry({ id, content }: GlossaryEntryProps) {
  const label = id
    .split("-")
    .slice(1)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div
      id={id}
      className="scroll-mt-4 rounded border border-gray-200 bg-white p-4"
    >
      <h3 className="mb-2 font-semibold text-gray-900">{label}</h3>
      <p className="text-sm text-gray-700">{content.long || content.short}</p>
    </div>
  );
}
