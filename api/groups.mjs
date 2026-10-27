// Group lands (kids): a class, family or friend group shares their gardens and trees.
// No accounts: a group is reached by its 6-letter code, and a browser proves it owns a shared
// garden with a random secret (only its hash is stored). Shared gardens are text only: the map's
// questions, which ones are grown, fun facts, a nickname and an emoji.
//   POST /api/group  { action: "create" | "get" | "share" | "map" | "remove", ... }
// The storage is passed in: a folder of JSON files locally, Netlify Blobs when hosted.
import { createHash, randomBytes, randomInt } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import path from "node:path";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const MAX_MAPS = 60;
const MAX_NODES = 160;
export const AVATARS = ["🦄", "🐱", "🐶", "🦊", "🐼", "🐸", "🦉", "🐢", "🐝", "🦋", "🐙", "🦖"];

const clip = (s, n) => {
  const t = String(s == null ? "" : s).replace(/[\u0000-\u001f]/g, " ").trim().replace(/\s+/g, " ");
  return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + "…";
};
const hash = (s) => createHash("sha256").update(String(s)).digest("hex");
const bad = (msg) => Object.assign(new Error(msg), { status: 400, expose: true });

// ---------- storage ----------
// A store keeps JSON values under keys like "K7QM4P/meta" and "K7QM4P/maps/m-1a2b3c".
export function fileStore(dir) {
  const file = (key) => path.join(dir, ...key.split("/")) + ".json";
  return {
    async get(key) {
      try {
        return JSON.parse(await readFile(file(key), "utf8"));
      } catch {
        return null;
      }
    },
    async set(key, value) {
      await mkdir(path.dirname(file(key)), { recursive: true });
      await writeFile(file(key), JSON.stringify(value));
    },
    async del(key) {
      await rm(file(key), { force: true });
    },
    async list(prefix) {
      try {
        const names = await readdir(path.join(dir, ...prefix.split("/").filter(Boolean)));
        return names.filter((n) => n.endsWith(".json")).map((n) => prefix + n.slice(0, -5));
      } catch {
        return [];
      }
    }
  };
}

export function blobStore(store) {
  return {
    get: (key) => store.get(key, { type: "json" }),
    set: (key, value) => store.setJSON(key, value),
    del: (key) => store.delete(key),
    async list(prefix) {
      const { blobs } = await store.list({ prefix });
      return blobs.map((b) => b.key);
    }
  };
}

// ---------- what a shared garden may contain ----------
function cleanTask(t) {
  if (!t || typeof t !== "object") return undefined;
  if (Array.isArray(t.options) && t.options.length === 3) {
    const answer = Number(t.answer);
    return {
      prompt: clip(t.prompt, 160),
      options: t.options.map((o) => clip(o, 110)),
      answer: answer >= 0 && answer < 3 ? Math.floor(answer) : 0,
      explain: clip(t.explain, 300)
    };
  }
  return { type: "wonder", explain: clip(t.explain, 300) };
}

function cleanNode(n) {
  const out = {
    id: String(n.id),
    parent: n.parent ? String(n.parent) : undefined,
    kind: n.kind === "fact" ? "fact" : undefined,
    label: clip(n.label, 40),
    emoji: clip(n.emoji, 4),
    question: clip(n.question, 200),
    life: clip(n.life, 400),
    text: n.kind === "fact" ? clip(n.text, 360) : undefined,
    love: n.kind === "fact" ? clip(n.love, 40) : undefined,
    own: n.own ? true : undefined,
    lit: n.kind === "fact" ? true : undefined,
    color: /^#[0-9a-fA-F]{3,8}$/.test(n.color || "") ? n.color : undefined,
    task: n.kind === "fact" ? undefined : cleanTask(n.task)
  };
  Object.keys(out).forEach((k) => (out[k] === undefined || out[k] === "") && delete out[k]);
  return out;
}

// A garden as the page sent it → a clean, self-consistent copy (one root, no orphans).
function cleanGarden(input) {
  const raw = Array.isArray(input && input.nodes) ? input.nodes : [];
  if (!raw.length || raw.length > MAX_NODES) throw bad("garden has no nodes or too many");
  const nodes = [];
  const ids = new Set();
  for (const n of raw) {
    if (!n || !ID_RE.test(String(n.id)) || ids.has(String(n.id))) continue;
    if (!nodes.length ? n.parent : !ids.has(String(n.parent))) continue;
    ids.add(String(n.id));
    nodes.push(cleanNode(n));
  }
  if (!nodes.length) throw bad("garden has no root");
  const lit = (Array.isArray(input.lit) ? input.lit : []).map(String).filter((id) => ids.has(id)).slice(0, MAX_NODES);
  return {
    title: clip(input.title, 60) || nodes[0].label || "My garden",
    style: input.style === "tree" ? "tree" : "garden",
    nodes,
    lit
  };
}

// ---------- the actions ----------
async function meta(store, code) {
  if (!CODE_RE.test(String(code || ""))) throw bad("that code doesn't look right");
  const m = await store.get(`${code}/meta`);
  if (!m) throw Object.assign(new Error("no such group"), { status: 404, expose: true, code: "no_group" });
  return m;
}

function summary(id, g) {
  const questions = g.nodes.filter((n) => n.kind !== "fact").length;
  return {
    id, nickname: g.nickname, avatar: g.avatar, title: g.title, style: g.style,
    grown: g.lit.length, questions, facts: g.nodes.length - questions, updatedAt: g.updatedAt
  };
}

async function create(store, input) {
  const name = clip(input.name, 40);
  if (name.length < 2) throw bad("please give the group a name");
  let code;
  for (let i = 0; i < 6 && !code; i++) {
    const c = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
    if (!(await store.get(`${c}/meta`))) code = c;
  }
  if (!code) throw new Error("couldn't find a free code");
  await store.set(`${code}/meta`, { code, name, createdAt: Date.now() });
  return { code, name };
}

async function get(store, input) {
  const m = await meta(store, input.code);
  const keys = await store.list(`${m.code}/maps/`);
  const gardens = (await Promise.all(keys.map((k) => store.get(k))))
    .filter(Boolean)
    .map((g) => summary(g.id, g))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return { code: m.code, name: m.name, gardens };
}

async function share(store, input) {
  const m = await meta(store, input.code);
  const secret = String(input.secret || "");
  if (secret.length < 16) throw bad("missing secret");
  const nickname = clip(input.nickname, 20);
  if (!nickname) throw bad("please choose a nickname");
  const garden = cleanGarden(input.garden || {});
  let id = String(input.id || "");
  if (id) {
    if (!ID_RE.test(id)) throw bad("bad id");
    const old = await store.get(`${m.code}/maps/${id}`);
    if (old && old.owner !== hash(secret)) throw Object.assign(new Error("not yours"), { status: 403, expose: true });
  } else {
    if ((await store.list(`${m.code}/maps/`)).length >= MAX_MAPS) throw bad("this land is full");
    id = `g-${randomBytes(5).toString("hex")}`;
  }
  const record = {
    id, owner: hash(secret), nickname, avatar: AVATARS.includes(input.avatar) ? input.avatar : AVATARS[0],
    ...garden, updatedAt: Date.now()
  };
  await store.set(`${m.code}/maps/${id}`, record);
  return { id, garden: summary(id, record) };
}

async function map(store, input) {
  const m = await meta(store, input.code);
  const id = String(input.id || "");
  const g = ID_RE.test(id) && (await store.get(`${m.code}/maps/${id}`));
  if (!g) throw Object.assign(new Error("garden not found"), { status: 404, expose: true });
  const { owner, ...rest } = g;
  return rest;
}

async function remove(store, input) {
  const m = await meta(store, input.code);
  const id = String(input.id || "");
  const g = ID_RE.test(id) && (await store.get(`${m.code}/maps/${id}`));
  if (!g) return { ok: true };
  if (g.owner !== hash(input.secret || "")) throw Object.assign(new Error("not yours"), { status: 403, expose: true });
  await store.del(`${m.code}/maps/${id}`);
  return { ok: true };
}

const ACTIONS = { create, get, share, map, remove };

// Runs one action. Problems the page can explain come back as { error, status }.
export async function groupAction(store, input = {}) {
  const fn = ACTIONS[input.action];
  if (!fn) return { status: 400, body: { error: "unknown action" } };
  try {
    return { status: 200, body: await fn(store, input) };
  } catch (e) {
    if (e.expose) return { status: e.status, body: { error: e.code || e.message } };
    throw e;
  }
}
