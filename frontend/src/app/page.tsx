"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Blocks, TrendingUp, Shield } from "lucide-react";

type AuthMode = "login" | "signup";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const features = [
  {
    icon: Blocks,
    title: "Visual Strategy Builder",
    description: "Drag-and-drop blocks to create trading strategies without code",
  },
  {
    icon: TrendingUp,
    title: "Instant Backtesting",
    description: "Test strategies against historical data in seconds",
  },
  {
    icon: Shield,
    title: "Risk Management",
    description: "Built-in stop-loss, take-profit, and position sizing",
  },
];

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, login, signup, startOAuth } = useAuth();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const urlMode = searchParams.get("mode") === "signup" ? "signup" : "login";
    setMode(urlMode);
  }, [searchParams]);

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  function validateEmail(value: string): string {
    if (!value) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email format";
    return "";
  }

  function validatePassword(value: string): string {
    if (!value) return "Password is required";
    if (mode === "signup" && value.length < 8) return "Password must be at least 8 characters";
    return "";
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else if (field === "password") {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }));
      setPasswordFocused(false);
    }
  }

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setError("");
    setFieldErrors({});
    setTouched({});
    const url = new URL(window.location.href);
    url.searchParams.set("mode", newMode);
    window.history.replaceState({}, "", url.toString());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setFieldErrors({ email: emailError, password: passwordError });
    setTouched({ email: true, password: true });

    if (emailError || passwordError) return;

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLogin = mode === "login";
  const title = isLogin ? "Welcome back" : "Create your account";
  const subtitle = isLogin
    ? "Sign in to your strategy workspace"
    : "Start building strategies in minutes";
  const submitText = isLogin ? "Sign in" : "Create account";
  const submittingText = isLogin ? "Signing in..." : "Creating account...";

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      {/* Background gradient effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      {/* Brand panel — hidden on mobile */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-indigo-600 lg:flex">
        {/* Decorative circles */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative z-10 max-w-md px-12">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <Blocks className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Blockbuilders
              </h1>
              <p className="text-sm text-white/70">Strategy Lab</p>
            </div>
          </div>

          <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-white">
            Visual Strategy Lab
            <br />
            <span className="text-white/80">for Crypto Traders</span>
          </h2>

          <p className="mb-10 text-base leading-relaxed text-white/60">
            Build, backtest, and iterate on trading strategies using an
            intuitive visual builder. No coding required.
          </p>

          <div className="space-y-5">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                  <feature.icon className="h-5 w-5 text-white/90" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/50">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auth form panel */}
      <div className="relative flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Blocks className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Blockbuilders</h1>
              <p className="text-xs text-muted-foreground">Strategy Lab</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {/* OAuth buttons — shown first for quick access */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 transition-colors hover:bg-accent"
              onClick={() => startOAuth("google")}
            >
              <GoogleIcon />
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 transition-colors hover:bg-accent"
              onClick={() => startOAuth("github")}
            >
              <GitHubIcon />
              GitHub
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur("email")}
                autoComplete="email"
                required
                placeholder="name@example.com"
                className={`h-11 ${touched.email && fieldErrors.email ? "border-destructive" : ""}`}
              />
              {touched.email && fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                {isLogin && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => router.push("/forgot-password")}
                  >
                    Forgot password?
                  </Button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => handleBlur("password")}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={mode === "signup" ? 8 : undefined}
                placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                className={`h-11 ${touched.password && fieldErrors.password ? "border-destructive" : ""}`}
              />
              {touched.password && fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
              {mode === "signup" && passwordFocused && !fieldErrors.password && (
                <p className="text-xs text-muted-foreground">Use at least 8 characters</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="h-11 w-full">
              {isSubmitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isSubmitting ? submittingText : submitText}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            No credit card required. We never share your data.
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                Don&apos;t have an account?{" "}
                <Button variant="link" className="h-auto p-0 text-sm" onClick={() => switchMode("signup")}>
                  Create one
                </Button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Button variant="link" className="h-auto p-0 text-sm" onClick={() => switchMode("login")}>
                  Sign in
                </Button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-primary/5 lg:block" />
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-[400px]">
          <div className="animate-pulse space-y-6">
            <div>
              <div className="mb-2 h-8 w-48 rounded bg-muted" />
              <div className="h-4 w-64 rounded bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-11 rounded-md bg-muted" />
              <div className="h-11 rounded-md bg-muted" />
            </div>
            <div className="space-y-4">
              <div className="h-11 rounded-md bg-muted" />
              <div className="h-11 rounded-md bg-muted" />
              <div className="h-11 rounded-md bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <AuthForm />
    </Suspense>
  );
}
