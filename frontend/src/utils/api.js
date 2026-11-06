// Use the same origin for API requests and private images (Vite proxies /api).
export const API_BASE_URL = "";

// Forget the logged-in user and their cached plan, so the next person on this browser sees nothing.
export function clearLocalAccountData() {
  localStorage.removeItem("user");
  Object.keys(localStorage)
    .filter((key) => key.startsWith("cutsmart_latest_plan_"))
    .forEach((key) => localStorage.removeItem(key));
}

export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers);
  const method = (options.method || "GET").toUpperCase();
  if (!["GET", "HEAD"].includes(method)) {
    headers.set("X-CutSmart-Request", "1");
    if (!["/api/login", "/api/register"].includes(url)) {
      const session = await fetch("/api/session", { credentials: "same-origin" });
      if (!session.ok) {
        clearLocalAccountData();
        window.location.assign("/login");
        throw new Error("Please log in again");
      }
      headers.set("X-CSRF-Token", (await session.json()).csrf_token);
    }
  }
  const response = await fetch(url, { ...options, headers, credentials: "same-origin" });
  if (response.status === 401 && url !== "/api/login") {
    clearLocalAccountData();
    window.location.assign("/login");
  }
  return response;
}
