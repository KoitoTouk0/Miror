// Shared by the local server (server.mjs) and the Netlify functions.

// A visitor's own API key arrives in this header (researcher mode). It is used for that request only,
// and never stored or logged.
export const KEY_HEADER = "x-explorer-key";

export function keyFrom(value) {
  const key = String(value || "").trim();
  return key.length >= 20 && key.length <= 300 && /^[\x21-\x7e]+$/.test(key) ? key : "";
}

// A failed request → a status and a short code the page can explain to the visitor.
export function failure(e) {
  if (e.message === "body too large") return { status: 413, error: "too_large" };
  if (e.status === 401 || e.status === 403) return { status: 401, error: "bad_key" };
  if (/credit balance/i.test(e.message || "")) return { status: 402, error: "no_credit" };
  return { status: 502, error: "ai_unavailable" };
}
