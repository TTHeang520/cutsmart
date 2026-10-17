// Use the same origin for API requests and private images (Vite proxies /api).
export const API_BASE_URL = "";

export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers);
  const method = (options.method || "GET").toUpperCase();
  if (!["GET", "HEAD"].includes(method)) {
    headers.set("X-CutSmart-Request", "1");
    if (!["/api/login", "/api/register"].includes(url)) {
      const session = await fetch("/api/session", { credentials: "same-origin" });
      if (!session.ok) {
        localStorage.removeItem("user");
        window.location.assign("/login");
        throw new Error("Please log in again");
      }
      headers.set("X-CSRF-Token", (await session.json()).csrf_token);
    }
  }
  const response = await fetch(url, { ...options, headers, credentials: "same-origin" });
  if (response.status === 401 && url !== "/api/login") {
    localStorage.removeItem("user");
    window.location.assign("/login");
  }
  return response;
}
