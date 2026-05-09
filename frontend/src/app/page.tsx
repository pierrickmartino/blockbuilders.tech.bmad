import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Blocks,
  TrendingUp,
  Shield,
  BarChart2,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Blockbuilders — Visual crypto strategy builder & backtester",
  description:
    "No-code strategy lab for retail crypto traders. Drag blocks onto a canvas, backtest against real historical BTC/USDT and ETH/USDT data, and iterate without writing code.",
  openGraph: {
    title: "Blockbuilders — Visual crypto strategy builder & backtester",
    description:
      "Drag blocks onto a canvas, backtest against real historical data, and iterate until your crypto strategy makes sense — no code required.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blockbuilders — Visual crypto strategy builder & backtester",
    description:
      "No-code strategy lab for retail crypto traders. Backtest visually against real historical data.",
  },
};

// ── Canvas node color map (CSS custom property names) ────────────────────────
const CANVAS_COLORS = {
  input: "--canvas-node-input",
  indicator: "--canvas-node-indicator",
  logic: "--canvas-node-logic",
  signal: "--canvas-node-signal",
  risk: "--canvas-node-risk",
} as const;

type CanvasNodeType = keyof typeof CANVAS_COLORS;

// ── Sub-components (server, no client JS needed) ─────────────────────────────

interface CanvasNodeProps {
  type: CanvasNodeType;
  label: string;
  detail: string;
}

function CanvasNode({ type, label, detail }: CanvasNodeProps) {
  const cssVar = CANVAS_COLORS[type];
  return (
    <div
      className="overflow-hidden rounded-lg border bg-background text-xs shadow-sm"
      style={{ borderColor: `hsl(var(${cssVar}) / 0.35)` }}
    >
      {/* Colored header band */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5"
        style={{ background: `hsl(var(${cssVar}) / 0.12)` }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: `hsl(var(${cssVar}))` }}
        />
        <span
          className="font-mono text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: `hsl(var(${cssVar}))` }}
        >
          {label}
        </span>
      </div>
      {/* Body */}
      <div className="px-3 py-2 font-mono font-medium text-foreground">
        {detail}
      </div>
    </div>
  );
}

// Backtest metrics for social proof strip
const backtestMetrics = [
  { label: "Total return", value: "+47.3%", positive: true },
  { label: "Win rate", value: "58%", positive: null },
  { label: "Max drawdown", value: "−18.4%", positive: false },
  { label: "Trades", value: "84", positive: null },
] as const;

// Secondary features (4 items → clean 2×2 grid)
const secondaryFeatures = [
  {
    icon: TrendingUp,
    title: "Instant Backtesting",
    description:
      "Run your strategy against years of BTC/USDT and ETH/USDT data in seconds.",
  },
  {
    icon: Shield,
    title: "Built-in Risk Controls",
    description:
      "Stop-loss, take-profit, and position sizing live on the canvas — never an afterthought.",
  },
  {
    icon: BarChart2,
    title: "Clear Performance Metrics",
    description:
      "Equity curve, win rate, max drawdown, and a full trade list in plain language.",
  },
  {
    icon: Zap,
    title: "Strategy Monitoring",
    description:
      "Save strategies and get automatic daily re-runs so you always know how they hold up.",
  },
];

// Steps for "How it works"
const steps = [
  {
    number: "01",
    label: "Input",
    title: "Pick your blocks",
    description:
      "Choose from indicators like MA, EMA, RSI, and MACD. Add logic blocks to define entry and exit conditions.",
    numColor: "text-violet-600 dark:text-violet-400",
    labelColor: "text-violet-500 dark:text-violet-500",
  },
  {
    number: "02",
    label: "Configure",
    title: "Connect & configure",
    description:
      "Wire blocks together on a visual canvas. Set parameters with a single click — no typing required.",
    numColor: "text-sky-600 dark:text-sky-400",
    labelColor: "text-sky-500 dark:text-sky-500",
  },
  {
    number: "03",
    label: "Signal",
    title: "Run & iterate",
    description:
      "Hit backtest. Review your equity curve and metrics. Adjust blocks and run again until it makes sense.",
    numColor: "text-emerald-600 dark:text-emerald-400",
    labelColor: "text-emerald-500 dark:text-emerald-500",
  },
];

// Hero feature bullets
const primaryFeaturePoints = [
  "Drag indicator, logic, and signal blocks onto a live canvas",
  "Connect blocks visually — no code, no formulas, no boilerplate",
  "Backtest instantly against years of real BTC/USDT & ETH/USDT data",
];

interface LandingPageSearchParams {
  mode?: string | string[];
}

interface LandingPageProps {
  searchParams?: Promise<LandingPageSearchParams> | LandingPageSearchParams;
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const mode = Array.isArray(resolvedSearchParams.mode)
    ? resolvedSearchParams.mode[0]
    : resolvedSearchParams.mode;

  if (mode === "login") {
    redirect("/login");
  }

  if (mode === "signup") {
    redirect("/login?mode=signup");
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Skip to main content */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-focus-ring"
      >
        Skip to main content
      </a>

      {/* ── Nav ── */}
      <header className="border-b border-border/60 bg-background">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Blocks aria-hidden="true" className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight">Blockbuilders</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/login?mode=signup">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ── Hero ── white bg ── */}
        <section
          aria-labelledby="hero-title"
          className="px-4 pb-20 pt-16 md:pb-24 md:pt-20"
        >
          <div className="container mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
              {/* Copy */}
              <div>
                <h1
                  id="hero-title"
                  className="mb-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-[3.5rem]"
                >
                  Build crypto strategies{" "}
                  <em className="font-normal italic">visually</em>.
                </h1>
                <p className="mb-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                  Blockbuilders is a no-code strategy lab for retail crypto
                  traders. Drag blocks onto a canvas, backtest against real
                  historical data, and iterate until your strategy makes sense —
                  without writing a single line of code.
                </p>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <Button size="lg" asChild>
                    <Link href="/login?mode=signup">
                      Start building free
                      <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    No credit card required.{" "}
                    <Link
                      href="/login"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>

              {/* ── Canvas mockup (desktop) ── */}
              <div
                aria-hidden="true"
                className="hidden rounded-xl border border-border bg-surface-elevated p-5 shadow-sm lg:block"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-subtle">
                    ema-crossover.bb
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span className="font-mono text-xs text-subtle">ready</span>
                  </div>
                </div>

                {/*
                  Node graph: two indicator inputs + one logic → one signal output.
                  Layout: [left col: 3 nodes] [SVG bezier connector] [right col: signal node]
                  Each node is ~70px tall (24px header + 46px body) with gap-2 (8px).
                  Left col total ≈ 3×70 + 2×8 = 226px.
                  Node vertical centers: y=35, y=113, y=191.
                  Signal node centered at y=113.
                  SVG viewBox="0 0 36 226", bezier paths meet at x=36,y=113.
                */}
                <div className="flex items-center gap-0">
                  {/* Left: inputs + logic */}
                  <div className="flex flex-1 flex-col gap-2">
                    <CanvasNode type="indicator" label="indicator" detail="EMA(12)" />
                    <CanvasNode type="indicator" label="indicator" detail="EMA(26)" />
                    <CanvasNode type="logic" label="logic" detail="crossOver ↑" />
                  </div>

                  {/* SVG connector */}
                  <svg
                    width="36"
                    height="226"
                    viewBox="0 0 36 226"
                    fill="none"
                    className="shrink-0"
                    aria-hidden="true"
                  >
                    {/* Node 1 (y=35) → signal center (y=113) */}
                    <path
                      d="M0,35 C18,35 18,113 36,113"
                      stroke="hsl(var(--border))"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    {/* Node 2 (y=113) → signal center (straight) */}
                    <path
                      d="M0,113 L36,113"
                      stroke="hsl(var(--border))"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    {/* Node 3 (y=191) → signal center (y=113) */}
                    <path
                      d="M0,191 C18,191 18,113 36,113"
                      stroke="hsl(var(--border))"
                      strokeWidth="1.5"
                      fill="none"
                    />
                    {/* Arrival dot */}
                    <circle
                      cx="36"
                      cy="113"
                      r="2.5"
                      fill="hsl(var(--canvas-node-signal))"
                    />
                  </svg>

                  {/* Right: signal output */}
                  <div className="flex flex-1 flex-col justify-center">
                    <CanvasNode type="signal" label="signal" detail="BUY · BTC/USDT" />
                  </div>
                </div>
              </div>

              {/* ── Canvas mockup (mobile) — simplified 3-node chain ── */}
              <div
                aria-hidden="true"
                className="rounded-xl border border-border bg-surface-elevated p-5 shadow-sm lg:hidden"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-subtle">
                    ema-crossover.bb
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span className="font-mono text-xs text-subtle">ready</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <CanvasNode type="indicator" label="indicator" detail="EMA(12)" />
                  <div className="ml-4 h-3 border-l border-border" />
                  <CanvasNode type="logic" label="logic" detail="crossOver ↑" />
                  <div className="ml-4 h-3 border-l border-border" />
                  <CanvasNode type="signal" label="signal" detail="BUY · BTC/USDT" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Social proof — real backtest result ── bg-surface-elevated ── */}
        <section
          aria-labelledby="proof-title"
          className="border-t border-border/60 bg-surface-elevated px-4 py-16"
        >
          <div className="container mx-auto max-w-6xl">
            <div className="mb-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-subtle">
                Real backtest result
              </p>
            </div>
            <h2
              id="proof-title"
              className="mb-8 text-center text-xl font-bold tracking-tight md:text-2xl"
            >
              EMA Crossover — BTC/USDT · 3 years of daily data
            </h2>

            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm md:p-8">
              <div className="grid gap-8 md:grid-cols-[1fr_auto]">
                {/* Metrics */}
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {backtestMetrics.map((m) => (
                    <div key={m.label} className="flex flex-col gap-1">
                      <dt className="text-xs text-muted-foreground">{m.label}</dt>
                      <dd
                        className={`font-mono text-2xl font-bold tabular-nums ${
                          m.positive === true
                            ? "text-success"
                            : m.positive === false
                              ? "text-destructive"
                              : "text-foreground"
                        }`}
                      >
                        {m.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Equity curve sparkline */}
                <div className="flex items-end">
                  <svg
                    width="240"
                    height="72"
                    viewBox="0 0 240 72"
                    aria-label="Equity curve — upward trend over 3 years"
                    role="img"
                    className="shrink-0"
                  >
                    {/* Area fill */}
                    <path
                      d="M0,62 L24,56 L45,48 L58,52 L72,42 L92,32 L108,38 L122,26 L140,18 L156,28 L172,20 L190,12 L210,8 L240,10 L240,72 L0,72 Z"
                      fill="hsl(var(--success) / 0.08)"
                    />
                    {/* Line */}
                    <polyline
                      points="0,62 24,56 45,48 58,52 72,42 92,32 108,38 122,26 140,18 156,28 172,20 190,12 210,8 240,10"
                      fill="none"
                      stroke="hsl(var(--success))"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Simulated backtest on historical data. Past performance is not indicative of future results. No fees or slippage modelled.
              </p>
            </div>
          </div>
        </section>

        {/* ── How it works — white bg — editorial style ── */}
        <section
          aria-labelledby="how-it-works-title"
          className="border-t border-border/60 px-4 py-20"
        >
          <div className="container mx-auto max-w-6xl">
            <div className="mb-12 max-w-2xl">
              <h2
                id="how-it-works-title"
                className="mb-3 text-2xl font-bold tracking-tight md:text-3xl"
              >
                How it works
              </h2>
              <p className="text-sm text-muted-foreground md:text-base">
                From idea to backtest in three steps.
              </p>
            </div>

            <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
              {steps.map((step) => (
                <li key={step.number} className="flex flex-col gap-4">
                  <div>
                    <div
                      aria-hidden="true"
                      className={`mb-1 font-mono text-xs font-semibold uppercase tracking-widest ${step.labelColor}`}
                    >
                      {step.label}
                    </div>
                    <div
                      aria-hidden="true"
                      className={`font-mono text-6xl font-bold leading-none tabular-nums ${step.numColor}`}
                    >
                      {step.number}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-base font-semibold">
                      <span className="sr-only">Step {step.number}: </span>
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Features — bg-surface-elevated — asymmetric layout ── */}
        <section
          aria-labelledby="features-title"
          className="border-t border-border/60 bg-surface-elevated px-4 py-24"
        >
          <div className="container mx-auto max-w-6xl">
            <div className="mb-14 max-w-2xl">
              <h2
                id="features-title"
                className="mb-3 text-3xl font-bold tracking-tight md:text-4xl"
              >
                Everything you need to test your ideas
              </h2>
              <p className="text-sm text-muted-foreground md:text-base">
                Built for traders who think visually, not programmatically.
              </p>
            </div>

            {/* Hero feature card — full width, 2-col interior on md+ */}
            <div className="mb-6 rounded-2xl border border-border bg-card p-8 transition-colors hover:border-foreground/20 hover:bg-accent md:p-10">
              <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-info-soft">
                    <Blocks aria-hidden="true" className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold tracking-tight">
                    Visual Strategy Builder
                  </h3>
                  <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                    Drag and drop indicator, logic, and signal blocks onto a canvas.
                    Connect them visually — no code, no formulas, no configuration files.
                  </p>
                  <ul className="space-y-2">
                    {primaryFeaturePoints.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm">
                        <Check
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Block palette preview */}
                <div
                  aria-hidden="true"
                  className="hidden rounded-xl border border-border bg-background p-4 md:block"
                >
                  <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-subtle">
                    Block palette
                  </p>
                  <div className="space-y-1.5 text-xs">
                    {(
                      [
                        { type: "indicator", label: "Indicators", count: "12" },
                        { type: "logic", label: "Logic", count: "8" },
                        { type: "signal", label: "Signals", count: "4" },
                        { type: "risk", label: "Risk", count: "6" },
                      ] as { type: CanvasNodeType; label: string; count: string }[]
                    ).map(({ type, label, count }) => (
                      <div
                        key={type}
                        className="flex items-center justify-between gap-6 rounded-md border px-3 py-1.5"
                        style={{
                          borderColor: `hsl(var(${CANVAS_COLORS[type]}) / 0.3)`,
                          background: `hsl(var(${CANVAS_COLORS[type]}) / 0.06)`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: `hsl(var(${CANVAS_COLORS[type]}))` }}
                          />
                          <span className="font-mono text-[11px] font-medium text-foreground">
                            {label}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-subtle">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary features — 2×2 grid */}
            <ul className="grid gap-4 sm:grid-cols-2">
              {secondaryFeatures.map((feature) => (
                <li
                  key={feature.title}
                  className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/20 hover:bg-accent"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-info-soft">
                    <feature.icon aria-hidden="true" className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-sm font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── CTA — white bg — no card wrapper ── */}
        <section
          aria-labelledby="cta-title"
          className="border-t border-border/60 px-4 py-24"
        >
          <div className="container mx-auto max-w-2xl text-center">
            <h2
              id="cta-title"
              className="mb-4 text-2xl font-bold tracking-tight md:text-3xl"
            >
              Ready to test your first strategy?
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-muted-foreground md:text-base">
              Validate your ideas against years of real historical data before
              putting real money on the line.
            </p>
            <Button size="lg" asChild>
              <Link href="/login?mode=signup">
                Get started — it&apos;s free
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 px-4 py-8">
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Blocks aria-hidden="true" className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">Blockbuilders</span>
          </div>
          <p className="text-xs text-muted-foreground">
            A no-code strategy lab for crypto traders.
          </p>
          <nav
            aria-label="Footer"
            className="flex items-center gap-4 text-xs text-muted-foreground"
          >
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/contact" className="transition-colors hover:text-foreground">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
