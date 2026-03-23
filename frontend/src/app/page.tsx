import Link from "next/link";
import { Blocks, TrendingUp, Shield, BarChart2, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/3 -top-1/4 h-[700px] w-[700px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* ── Nav ── */}
      <header className="relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Blocks className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight">Blockbuilders</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/login?mode=signup">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 px-4 pb-20 pt-20 md:pb-28 md:pt-28">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-6 text-xs font-medium">
            No coding required
          </Badge>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Build crypto strategies{" "}
            <span className="text-gradient-primary">visually</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Blockbuilders is a no-code strategy lab for retail crypto traders. Drag
            blocks onto a canvas, backtest against real historical data, and iterate
            until your strategy makes sense — all without writing a single line of code.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/login?mode=signup">
                Start building free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card required. Free to start.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">
              How it works
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">
              From idea to backtest in three steps
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="mb-4 text-3xl font-bold text-primary/30">
                  {step.number}
                </div>
                <h3 className="mb-2 text-base font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">
              Everything you need to test your ideas
            </h2>
            <p className="text-sm text-muted-foreground md:text-base">
              Built for traders who think visually, not programmatically
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30 hover:bg-accent/30"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-sm font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 px-4 py-20">
        <div className="container mx-auto max-w-2xl text-center">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-8 py-12">
            <h2 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
              Ready to test your first strategy?
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-muted-foreground md:text-base">
              Join traders who use Blockbuilders to validate their ideas before
              putting real money on the line.
            </p>
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/login?mode=signup">
                Get started — it&apos;s free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border/40 px-4 py-8">
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Blocks className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">Blockbuilders</span>
          </div>
          <p className="text-xs text-muted-foreground">
            A no-code strategy lab for crypto traders.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/login?mode=signup" className="hover:text-foreground transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
