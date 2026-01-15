const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  const response = await fetch(`${getApiBase()}${endpoint}`, {
    ...options,
    headers,
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
}

/**
 * Fetch JSON data from the API. Use for GET, POST, PUT requests that return data.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchWithAuth(endpoint, options);

  if (response.status === 204) {
    // No content - this is unexpected for apiFetch, use apiFetchVoid instead
    throw new Error("Unexpected 204 response. Use apiFetchVoid for no-content requests.");
  }

  return response.json();
}

/**
 * Fetch from the API for requests that return no content (204).
 * Use for DELETE or other void operations.
 */
export async function apiFetchVoid(
  endpoint: string,
  options: RequestInit = {}
): Promise<void> {
  await fetchWithAuth(endpoint, options);
}

export async function fetchDataQuality(
  asset: string,
  timeframe: string,
  dateFrom: string,
  dateTo: string
) {
  // Convert date strings (YYYY-MM-DD) to ISO datetime strings for backend
  const dateFromISO = `${dateFrom}T00:00:00Z`;
  const dateToISO = `${dateTo}T23:59:59Z`;

  return apiFetch(
    `/backtests/data-quality?asset=${encodeURIComponent(asset)}&timeframe=${timeframe}&date_from=${dateFromISO}&date_to=${dateToISO}`
  );
}

export async function fetchDataCompleteness(
  asset: string,
  timeframe: string
) {
  return apiFetch(
    `/backtests/data-completeness?asset=${encodeURIComponent(asset)}&timeframe=${timeframe}`
  );
}
