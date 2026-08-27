// In development Vite proxies this path to Flask. In production it targets the
// same host unless a separately deployed API URL is explicitly configured.
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE = (configuredApiUrl || "/api").replace(/\/$/, "");
const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function api(path, { token, ...options } = {}) {
  let response;
  // Vite starts Flask with the dev server. Give Flask a moment to finish
  // booting so an early click on Register/Login does not fail spuriously.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });
      break;
    } catch (cause) {
      if (attempt === 11) {
        throw new Error(
          "Cannot reach the Vetty API. Stop and restart npm run dev so it can start Flask, or set VITE_API_URL to your deployed API URL."
        );
      }
      await delay(250);
    }
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.msg || "Request failed.");
  return body;
}

export { API_BASE };
