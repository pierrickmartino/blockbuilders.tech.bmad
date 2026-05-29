export { ApiError } from "@/lib/api/internal/fetch";

export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

    if (parsed.hostname.endsWith(".stripe.com")) {
      return true;
    }

    if (parsed.origin === currentOrigin) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function safeRedirect(url: string): void {
  if (!isValidRedirectUrl(url)) {
    console.error("Blocked redirect to untrusted URL:", url);
    throw new Error("Cannot redirect to untrusted URL");
  }
  window.location.href = url;
}
