import type { CurriculumResponse } from "@/types/curriculum";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

export async function getCurriculumView(): Promise<CurriculumResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/curriculum`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CurriculumResponse;
  } catch {
    return null;
  }
}
