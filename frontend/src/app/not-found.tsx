import type { Metadata } from "next";
import Link from "next/link";
import { Blocks, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found — Blockbuilders",
  description: "The page you're looking for doesn't exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Blocks aria-hidden="true" className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight">Blockbuilders</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-4 font-mono text-sm uppercase tracking-wider text-subtle">
            404 · Not found
          </p>
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            That page doesn&apos;t exist.
          </h1>
          <p className="mb-10 text-base leading-relaxed text-muted-foreground md:text-lg">
            The link you followed may be broken, or the page may have been moved.
            From here you can head back to the home page or jump straight into the app.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/">
                Back to home
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/login">Sign in to your strategies</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 px-4 py-8">
        <div className="container mx-auto max-w-6xl text-center text-xs text-muted-foreground">
          A no-code strategy lab for crypto traders.
        </div>
      </footer>
    </div>
  );
}
