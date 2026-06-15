import { buildLlmsTxt } from "./build-llms-txt";

// Deliberately thin and public-only (PRD #682 / ACTIONS #14): the curated
// link set in buildLlmsTxt covers only "/" and "/how-backtests-work" because
// those are the genuinely public, content-rich surfaces. The metrics-glossary
// and strategy-guide sit behind the (app) auth gate — an agent following a
// link there would hit /login — so they are excluded on purpose, and no
// sign-in CTA is added (descriptive, not promotional). Do not "helpfully"
// add those links back without first making the pages public.
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export function GET() {
  return new Response(buildLlmsTxt(FRONTEND_URL), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
