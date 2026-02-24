import { loadEnvConfig } from "@next/env";
import path from "path";
import type { NextConfig } from "next";

// Load environment variables from the repository root.
// Next.js only loads .env from the frontend/ directory by default,
// but all env vars (including NEXT_PUBLIC_*) live in the root .env.
loadEnvConfig(path.resolve(process.cwd(), ".."));

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
