// Local server for Miror: serves demo/ and the AI endpoint, keeping the API key out of the browser.
// Run with `npm start` (reads ANTHROPIC_API_KEY from .env), then open http://localhost:8787
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { askExplorer, startMap, expandNode, funFact, checkKey, withKey, MODEL } from "./api/explorer-ai.mjs";
import { KEY_HEADER, keyFrom, failure } from "./api/http.mjs";
import { groupAction, fileStore } from "./api/groups.mjs";

const ROUTES = { "/api/ask": askExplorer, "/api/map": startMap, "/api/expand": expandNode, "/api/fact": funFact, "/api/check-key": checkKey };

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "demo");
// Group lands are saved as small JSON files here (outside demo/, so they're never served directly).
const groups = fileStore(path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "groups"));
const PORT = Number(process.env.PORT) || 8787;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon"
};

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

async function readBody(req, limit = 64 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/health") {
    // Readable from any page, so a copy opened as a file can find this server (it only says whether AI is on).
    res.setHeader("access-control-allow-origin", "*");
    return send(res, 200, { ai: Boolean(process.env.ANTHROPIC_API_KEY), model: MODEL });
  }
  if (url.pathname === "/api/group") {
    if (req.method !== "POST") return send(res, 405, { error: "POST only" });
    try {
      const r = await groupAction(groups, await readBody(req, 256 * 1024));
      return send(res, r.status, r.body);
    } catch (e) {
      console.error("/api/group failed:", e.message);
      return send(res, e.message === "body too large" ? 413 : 500, { error: e.message === "body too large" ? "too_large" : "unavailable" });
    }
  }
  const handler = ROUTES[url.pathname];
  if (handler) {
    if (req.method !== "POST") return send(res, 405, { error: "POST only" });
    try {
      const started = Date.now();
      // The map request may carry up to 10 MB of materials (about 13.4 MB as base64).
      const limit = url.pathname === "/api/map" ? 15 * 1024 * 1024 : 256 * 1024;
      const body = await readBody(req, limit);
      const out = await withKey(keyFrom(req.headers[KEY_HEADER]), () => handler(body));
      console.log(`${url.pathname} ok in ${Date.now() - started} ms`);
      return send(res, 200, out);
    } catch (e) {
      console.error(`${url.pathname} failed:`, e.message);
      const f = failure(e);
      return send(res, f.status, { error: f.error });
    }
  }
  // Static files from demo/, never outside it.
  const file = path.join(ROOT, path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "") || "index.html");
  if (!file.startsWith(ROOT)) return send(res, 403, "Forbidden", "text/plain");
  try {
    const target = file === ROOT ? path.join(ROOT, "index.html") : file;
    const data = await readFile(target);
    send(res, 200, data, TYPES[path.extname(target)] || "application/octet-stream");
  } catch {
    send(res, 404, "Not found", "text/plain");
  }
}).listen(PORT, () => {
  console.log(`Miror running at http://localhost:${PORT}`);
  console.log(process.env.ANTHROPIC_API_KEY
    ? `AI answers on (${MODEL}).`
    : "No ANTHROPIC_API_KEY found: AI answers off, built-in answers only. Add it to .env and restart.");
});
