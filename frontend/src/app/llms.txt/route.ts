import { getCurriculumView } from "@/lib/curriculum/get-curriculum-view";
import { buildLlmsTxt } from "./build-llms-txt";

// Deliberately public-only (PRD #682 / ACTIONS #14 / ACTIONS #15): the auth-gated
// /metrics-glossary and /strategy-guide routes are excluded — an agent following
// those links would hit /login. The public /lessons pages added here are the
// mirrored, publicly-reachable surfaces introduced in issue #692.
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export async function GET() {
  const curriculum = await getCurriculumView();

  return new Response(buildLlmsTxt(FRONTEND_URL, curriculum), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
