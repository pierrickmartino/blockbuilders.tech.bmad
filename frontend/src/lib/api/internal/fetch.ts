const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 30000;

function getApiBase(): string {
  if (typeof window === "undefined") {
    return RAW_API_BASE;
  }
  if (window.location.protocol === "https:" && RAW_API_BASE.startsWith("http://")) {
    return `https://${RAW_API_BASE.slice("http://".length)}`;
  }
  return RAW_API_BASE;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBase()}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = "Request failed";
      try {
        const data = await response.json();
        message = data.detail || message;
      } catch {
        // ignore parse error
      }
      throw new ApiError(response.status, message);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(0, "Request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchWithAuth(endpoint, options);

  if (response.status === 204) {
    throw new Error("Unexpected 204 response. Use apiFetchVoid for no-content requests.");
  }

  return response.json();
}

export async function apiFetchVoid(
  endpoint: string,
  options: RequestInit = {}
): Promise<void> {
  await fetchWithAuth(endpoint, options);
}
