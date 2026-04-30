import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Blocks, TrendingUp, Shield, BarChart2, Zap, ArrowRight } from "lucide-react";
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

const features = [
  {
    icon: Blocks,
    title: "Visual Strategy Builder",
    description:
      "Drag and drop indicator, logic, and signal blocks onto a canvas. Connect them visually — no code, no formulas.",
  },
  {
    icon: TrendingUp,
    title: "Instant Backtesting",
    description:
      "Run your strategy against years of historical BTC/USDT and ETH/USDT data in seconds. See results immediately.",
  },
  {
    icon: Shield,
    title: "Built-in Risk Controls",
    description:
      "Set stop-loss, take-profit, and position sizing right on the canvas. Your risk rules are part of your strategy.",
  },
  {
    icon: BarChart2,
    title: "Clear Performance Metrics",
    description:
      "Equity curve, win rate, max drawdown, and a full trade list — all presented in plain language you can act on.",
  },
  {
    icon: Zap,
    title: "Strategy Monitoring",
    description:
      "Save your strategies and get automatic daily re-runs so you always know how they perform on fresh data.",
  },
];

const steps = [
  {
    number: "01",
    title: "Pick your blocks",
    description:
      "Choose from indicators like MA, EMA, RSI, and MACD. Add logic blocks to define entry and exit conditions.",
  },
  {
    number: "02",
    title: "Connect & configure",
    description:
      "Wire blocks together on a visual canvas. Set parameters with a single click — no typing required.",
  },
  {
    number: "03",
    title: "Run & iterate",
    description:
      "Hit backtest. Review your equity curve and metrics. Adjust blocks and run again until it makes sense.",
  },
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
      {/* Skip to main content (keyboard/AT users) */}
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
            {/* Hidden < sm to avoid header overflow on 320px viewports.
                The hero subhead provides a Sign-in affordance below `sm:`. */}
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
        {/* ── Hero — asymmetric on lg+, single-column on mobile ── */}
        <section
          aria-labelledby="hero-title"
          className="px-4 pb-20 pt-16 md:pb-24 md:pt-20"
        >
          <div className="container mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
              <div>
                <h1
                  id="hero-title"
                  className="mb-6 text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-[3.5rem]"
                >
                  Build crypto strategies{" "}
                  <em className="font-normal italic">visually</em>.
                </h1>
                <p className="mb-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                  Blockbuilders is a no-code strategy lab for retail crypto traders.
                  Drag blocks onto a canvas, backtest against real historical data,
                  and iterate until your strategy makes sense — without writing a
                  single line of code.
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

              {/* Stylized canvas preview — illustrative, not interactive. */}
              <div
                aria-hidden="true"
                className="hidden rounded-xl border border-border bg-surface-elevated p-6 shadow-sm lg:block"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-subtle">
                    untitled-strategy.bb
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span className="font-mono text-xs text-subtle">ready</span>
                  </div>
                </div>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-info" />
                    <span className="text-muted-foreground">indicator</span>
                    <span className="ml-auto font-medium text-foreground">EMA(12)</span>
                  </div>
                  <div className="ml-3 h-3 border-l border-border" />
                  <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-info" />
                    <span className="text-muted-foreground">indicator</span>
                    <span className="ml-auto font-medium text-foreground">EMA(26)</span>
                  </div>
                  <div className="ml-3 h-3 border-l border-border" />
                  <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                    <span className="text-muted-foreground">logic</span>
                    <span className="ml-auto font-medium text-foreground">crossOver</span>
                  </div>
                  <div className="ml-3 h-3 border-l border-border" />
                  <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span className="text-muted-foreground">signal</span>
                    <span className="ml-auto font-medium text-foreground">
                      BUY · BTC/USDT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
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

            <ol className="grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <li
                  key={step.number}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div
                    aria-hidden="true"
                    className="mb-4 font-mono text-xs uppercase tracking-wider text-subtle"
                  >
                    Step {step.number}
                  </div>
                  <h3 className="mb-2 text-base font-semibold">
                    <span className="sr-only">Step {step.number}: </span>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Features ── */}
        <section
          aria-labelledby="features-title"
          className="border-t border-border/60 px-4 py-24"
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

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
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

        {/* ── CTA ── */}
        <section
          aria-labelledby="cta-title"
          className="border-t border-border/60 px-4 pb-24 pt-12"
        >
          <div className="container mx-auto max-w-2xl text-center">
            <div className="rounded-2xl border border-border bg-surface-elevated px-8 py-12">
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
            </div>
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
          <nav aria-label="Footer" className="flex items-center gap-4 text-xs text-muted-foreground">
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
