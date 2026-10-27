// Calls the Netlify function handlers directly with web Requests, as Netlify would.
const root = new URL("../../netlify/functions/", import.meta.url).pathname;
const load = async (n) => (await import(root + n + ".mjs"));
const req = (body) => new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const t = Date.now();
const health = await load("health");
console.log("health", health.config.path, await (await health.default(new Request("http://x"))).json());
const map = await load("map");
const r = await map.default(req({ mode: "kids", topic: "why cats purr", age: "8", profile: { age: "8", loves: ["🐶 Animals"] }, items: [] }));
const m = await r.json();
console.log("map", map.config.path, r.status, `${Date.now() - t} ms`, m.safe, m.dataset && m.dataset.nodes.map((n) => n.label).join(" | "));
const exp = await load("expand");
const root0 = m.dataset.nodes.find((n) => n.parent && n.parent !== "root") || m.dataset.nodes[1];
const t2 = Date.now();
const e = await (await exp.default(req({ mode: "kids", topic: "why cats purr", age: "8", node: { id: root0.id, label: root0.label }, path: [root0.label], depth: 2, maxLayers: 6, existing: m.dataset.nodes.map((n) => n.label) }))).json();
console.log("expand", exp.config.path, `${Date.now() - t2} ms`, (e.children || []).map((c) => c.label || (c.spec && c.spec.label)).join(" | "), e.error || "");
const ask = await load("ask");
console.log("ask", ask.config.path, (await ask.default(new Request("http://x", { method: "GET" }))).status);
