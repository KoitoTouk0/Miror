// Miror's AI step. Text only: the model returns small structured answers; all visuals stay preset
// in the front end. Used by the local server (server.mjs) and the Netlify functions, so the API key
// never reaches the browser.
//   askExplorer  - a user's own question → one new node (best branch, or a new branch from the root)
//   startMap     - any topic → the starting map (root, what you already know, first questions)
//   expandNode   - a node → its next 2-3 questions, one layer deeper
//   funFact      - kids: a short surprising fact tied to what the child loves → one fruit/blossom on the map
import Anthropic from "@anthropic-ai/sdk";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

export const MODEL = "claude-haiku-5-5";

let client = null;

// A visitor's own API key (researcher mode), set by the server for one request; never stored or logged.
const visitorKey = new AsyncLocalStorage();
export const withKey = (key, fn) => (key ? visitorKey.run(key, fn) : fn());

// A visitor's key always goes straight to Anthropic. Hosts may point the default client elsewhere
// (Netlify's AI Gateway sets its own ANTHROPIC_BASE_URL and key), which would reject a real key.
const direct = (key, extra = {}) => new Anthropic({ apiKey: key, authToken: null, baseURL: "https://api.anthropic.com", ...extra });

function clientFor() {
  const key = visitorKey.getStore();
  if (key) return direct(key);
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  return (client = client || new Anthropic());
}

// Settings checks a visitor's key with a free call (looking up the model) before using it.
export async function checkKey() {
  const key = visitorKey.getStore();
  if (!key) throw Object.assign(new Error("no key given"), { status: 401 });
  await direct(key, { maxRetries: 0 }).models.retrieve(MODEL);
  return { ok: true, model: MODEL };
}

const clip = (s, n) => {
  const t = String(s || "").trim().replace(/\s+/g, " ");
  return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + "…";
};
const newId = () => `n-${randomUUID().slice(0, 8)}`;

// One structured call. `blocks` are extra content blocks (attached PDFs, text files) placed before the context.
async function call(system, context, schema, maxTokens = 16000, blocks = []) {
  const anthropic = clientFor();
  const request = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: [...blocks, { type: "text", text: JSON.stringify(context, null, 2) }] }],
    output_config: { effort: "low", format: zodOutputFormat(schema) }
  };
  let response;
  try {
    response = await anthropic.messages.parse(request);
  } catch (e) {
    // An answer that doesn't fit the shape (rare): ask once more. API errors (key, limits) still fail at once.
    if (!(e instanceof Anthropic.AnthropicError) || e instanceof Anthropic.APIError) throw e;
    console.warn("unreadable answer, retrying:", e.message.split("\n")[0]);
    response = await anthropic.messages.parse(request);
  }
  if (response.stop_reason === "refusal") return null;
  if (!response.parsed_output) throw new Error(`no structured answer (stop_reason: ${response.stop_reason})`);
  return response.parsed_output;
}

// ---------- the person: intake answers → a clean profile ----------
const MAX_MATERIAL_BYTES = 10 * 1024 * 1024;
const list = (x, n = 20) => (Array.isArray(x) ? x : []).map((v) => clip(v, 80)).filter(Boolean).slice(0, n);

// What we keep (and send back on later calls). Files are never stored, only their names and a summary.
function cleanProfile(p = {}, extra = {}) {
  const out = {
    level: clip(p.level, 60),
    fields: list(p.fields),
    expertise: clip(p.expertise, 300),
    skills: list(p.skills),
    knownLevel: clip(p.knownLevel, 40),
    knownText: clip(p.knownText, 600),
    purpose: list(p.purpose, 6),
    spark: clip(p.spark, 80),
    notes: clip(p.notes, 1500),
    materialNames: list(p.materialNames, 5),
    materialsSummary: clip(p.materialsSummary, 1200),
    strategy: clip(p.strategy, 700),
    background: clip(p.background, 600),
    age: p.age ? Math.min(13, Math.max(5, Number(p.age) || 9)) : undefined,
    loves: list(p.loves, 12),
    ...extra
  };
  Object.keys(out).forEach((k) => (out[k] === undefined || out[k] === "" || (Array.isArray(out[k]) && !out[k].length)) && delete out[k]);
  return out;
}

// How the model sees the person.
function aboutPerson(p = {}) {
  const c = cleanProfile(p);
  const out = {
    education_level: c.level,
    general_expertise: c.fields,
    specific_expertise: c.expertise,
    skills_and_hobbies: c.skills,
    already_knows_about_topic: [c.knownLevel, c.knownText].filter(Boolean).join(": ") || undefined,
    why_they_want_it: c.purpose,
    sparked_by: c.spark,
    their_notes: c.notes,
    summary_of_their_materials: c.materialsSummary,
    background: c.background
  };
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return Object.keys(out).length ? out : "(nothing given)";
}

// Attached files → content blocks: PDFs as documents, text files inline. Enforces the 10 MB total.
function materialBlocks(files) {
  const blocks = [];
  let total = 0;
  for (const f of (Array.isArray(files) ? files : []).slice(0, 5)) {
    const data = String(f.data || "");
    const bytes = Buffer.byteLength(data, "base64");
    total += bytes;
    if (total > MAX_MATERIAL_BYTES) {
      const e = new Error("materials over 10 MB");
      e.code = "too_large";
      throw e;
    }
    const name = clip(f.name, 120);
    if (f.type === "application/pdf") {
      blocks.push({ type: "text", text: `Attached material: ${name}` });
      blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    } else {
      const text = Buffer.from(data, "base64").toString("utf8").slice(0, 60000);
      blocks.push({ type: "text", text: `Attached material: ${name}\n\n${text}` });
    }
  }
  return blocks;
}

// Miror's core idea, shared by every researcher prompt.
const PHILOSOPHY = `Miror's philosophy: information is abundant; what people lack is a good path through it. Be selective, not comprehensive: choose the few highest-leverage questions for this person, in the order that builds understanding fastest. Start from their strengths: prefer entry points where their expertise, skills or even hobbies transfer, and use hobby analogies only when they are genuinely accurate. Match the depth to their level and to what they already know about the topic; skip basics they already have.`;

function cleanNodes(list) {
  return (Array.isArray(list) ? list : []).slice(0, 80).map((n) => ({
    id: String(n.id), label: clip(n.label, 90), kind: String(n.kind || ""), state: String(n.state || "")
  }));
}

// ---------- one node, as the model writes it ----------
// The enums fall back to a safe value instead of failing: one odd label must not sink a whole map.
const NodeOut = z.object({
  kind: z.enum(["core", "bridge", "edge", "frontier"]).catch("core"),
  label: z.string(),
  emoji: z.string(),
  question: z.string(),
  explanation: z.string(),
  bridge: z.string(),
  analogy_known_id: z.string(),
  analogy_label: z.string(),
  task_type: z.enum(["choice", "reflect", "claim"]).catch("reflect"),
  quiz_prompt: z.string(),
  quiz_options: z.array(z.string()),
  quiz_answer_index: z.number().int(),
  quiz_explain: z.string(),
  reflect_prompt: z.string()
});

// Interest exploration is for ages 5-12 and "12+" (sent as 13: a teen or an adult).
function reader(age) {
  return age >= 13 ? "a curious explorer aged 12 or older (a teen or an adult)" : `a curious child about ${age} years old`;
}

const KIDS_NODE_RULES = (age) => `Rules for every node (for ${reader(age)}):
- kind: "core". bridge, analogy_known_id, analogy_label, reflect_prompt: "".
- label: a short, friendly question of at most 32 characters. emoji: exactly one fitting emoji.
- question: the question as one friendly sentence.
- explanation: an "imagine" moment from everyday life that hints at the answer, in 1-2 short sentences that ${reader(age)} understands. Don't give the answer away yet.
- task_type: "choice". quiz_prompt: one simple question about the answer. quiz_options: exactly 3 short options, each starting with an emoji; exactly one is right, the other two clearly silly. quiz_answer_index: 0, 1 or 2. quiz_explain: the real answer in one cheerful sentence.
- Be accurate and never invent facts. Keep every sentence short and simple.`;

const RESEARCHER_NODE_RULES = `Rules for every node:
- kind: "core" (a central question of the field), "bridge" (builds directly on something the researcher already knows), "edge" (a strength: a place where their background gives them a real advantage; the label names the strength), or "frontier" (an open problem).
- label: at most 46 characters; a short question (for "edge": the strength itself). emoji: "".
- question: the full question in one sentence (for "edge": "Strength: ..." in one sentence).
- explanation: why this matters to this researcher, plus the core answer, in 2-4 plain sentences. Be accurate; where details vary, say what is typical and how to check.
- bridge: one sentence connecting it to the researcher's own background (an analogy or transferable skill), or "".
- analogy_known_id: the id of one listed "known" item this builds on, or "". analogy_label: 2-4 words such as "≈ annealing", or "".
- task_type: "choice" for a quick check, "reflect" for a one-sentence reflection, "claim" only for kind "edge".
- For "choice": quiz_prompt, exactly 3 quiz_options with exactly one correct, quiz_answer_index (0-2), quiz_explain (one sentence). For "reflect": reflect_prompt, and leave quiz fields empty ([] options, index 0). For "claim": leave quiz fields and reflect_prompt empty.`;

// Model output → the node spec the front end draws (validated, trimmed, with safe defaults).
function toSpec(o, kids, knownIds = new Set()) {
  const quizOk = o.task_type === "choice" && o.quiz_options.length === 3 &&
    o.quiz_answer_index >= 0 && o.quiz_answer_index < 3 && o.quiz_prompt;
  const options = o.quiz_options.map((x) => clip(x, 110));
  if (kids) {
    return {
      label: clip(o.label, 34),
      emoji: clip(o.emoji, 4) || "💭",
      question: clip(o.question || o.label, 200),
      life: clip(o.explanation, 400),
      task: quizOk
        ? { prompt: clip(o.quiz_prompt, 160), options, answer: o.quiz_answer_index, explain: clip(o.quiz_explain, 300) }
        : { type: "wonder", explain: clip(o.quiz_explain, 300) || "Asking questions is what real explorers do!" }
    };
  }
  const kind = o.kind === "edge" && o.task_type !== "claim" ? "core" : o.kind;
  const spec = {
    kind,
    label: clip(o.label, 54),
    question: clip(o.question || o.label, 240),
    why: clip(o.explanation, 900),
    bridge: clip(o.bridge, 400),
    task: kind === "edge"
      ? { type: "claim" }
      : quizOk
        ? { type: "choice", prompt: clip(o.quiz_prompt, 200), options, answer: o.quiz_answer_index, explain: clip(o.quiz_explain, 300) }
        : { type: "reflect", prompt: clip(o.reflect_prompt, 200) || "What's your current guess, or why does this matter to you?" }
  };
  if (knownIds.has(o.analogy_known_id)) spec.analogy = { from: o.analogy_known_id, label: clip(o.analogy_label, 40) };
  return spec;
}

// ---------- startMap: intake answers (+ materials) → a starting map ----------
const MapOut = z.object({
  safe: z.boolean(),
  title: z.string(),
  subtitle: z.string(),
  you_label: z.string(),
  known: z.array(z.object({ id: z.string(), label: z.string() })),
  strategy: z.string(),
  materials_summary: z.string(),
  root: NodeOut,
  first: z.array(NodeOut)
});

const KIDS_MAP_SYSTEM = (age, loves) => `You are Miror. You plant the start of a picture-book knowledge map for ${reader(age)}. The topic is what the child wants to explore.${loves ? ` The child loves: ${loves}. When it fits naturally, build the "imagine" moments from these.` : ""}
- safe: false if the topic is not suitable for a young child. Otherwise true.
- title: the topic as a short, fun question of at most 40 characters. subtitle: "Your own garden · age ${age >= 13 ? "12+" : age}". you_label: "". known: []. strategy: "". materials_summary: "".
- root: the big starting question (the same as the title).
- first: exactly 3 next questions that explore different sides of the topic, such as how it works, how big, far or fast it goes, where it comes from, or how it shows up in everyday life.
${KIDS_NODE_RULES(age)}`;

const RESEARCHER_MAP_SYSTEM = `You are Miror. You design the starting point of a personal knowledge map for someone exploring a topic. The map is a tree of thought-provoking questions: they answer a question to light it up, and deeper questions appear afterwards.
${PHILOSOPHY}
If materials are attached (papers, notes), read them: ground the questions in them and point to what in them matters most for this person.
- safe: false only if building this map would be harmful. Otherwise true.
- title: a short, inviting map title of at most 60 characters. subtitle: "Your map · <their background in 2-4 words> → <topic in 2-4 words>".
- you_label: "You · " plus 1-2 words describing them (at most 24 characters in total), e.g. "You · experimentalist" or "You · baker & coder".
- known: up to 5 things they already have that matter for this topic, from their expertise, skills, hobbies or what they already know about the topic. Ids "known-1", "known-2", ... in order; labels of at most 30 characters. [] if nothing fits.
- strategy: 2-3 sentences of personal advice, addressed as "you": what to focus on first, what you can safely skip for now, and which of your strengths will help most.
- materials_summary: if materials are attached, what in them matters for this person's path, in at most 5 short sentences (900 characters); otherwise "".
- root: not shown; fill it with a "core" node restating the topic.
- first: exactly 3 entry questions, ordered so the first is the most foundational for this person. By default they cover two orientations: a **principle** question (the core mechanism: how and why it works; kind "core", its label may start with "Principle:") and an **application** question (where it is used, what it is good for, and what it could do in their own work; its label may start with "Application:"). The third is always an "edge" node (task_type "claim"): the interlink, naming the biggest strength their background gives them in this field (label: the strength itself, e.g. "Strength: calibrating against data"), with analogy_known_id set to the known item it draws on most.
${RESEARCHER_NODE_RULES}`;

// Now and then the model answers within seconds with no first questions: ask once more before giving up.
async function callMap(system, context, blocks = []) {
  const out = await call(system, context, MapOut, 16000, blocks);
  if (!out || !out.safe || out.first.length) return out;
  console.warn("map came back without questions, retrying");
  return call(system, context, MapOut, 16000, blocks);
}

export async function startMap(input) {
  const kids = input.mode === "kids";
  const topic = clip(input.topic, 160);
  if (topic.length < 3) throw new Error("topic is required");
  const profileIn = Object.assign({}, input.profile || {}, input.background ? { background: input.background } : {});

  let out;
  if (kids) {
    const age = Math.min(13, Math.max(5, Number(profileIn.age || input.age) || 9));
    const loves = list(profileIn.loves, 12).join(", ");
    out = await callMap(KIDS_MAP_SYSTEM(age, loves), { topic });
    if (!out || !out.safe) return { safe: false };
    const first = out.first.slice(0, 3);
    if (!first.length) throw new Error("no first questions");
    const dataset = {
      mode: "kids", custom: true, topic,
      title: clip(out.title, 48) || topic, subtitle: clip(out.subtitle, 80) || `Your own garden · age ${age >= 13 ? "12+" : age}`,
      profile: cleanProfile({ age, loves: profileIn.loves }, { curiosity: topic }),
      nodes: [
        Object.assign({ id: "root" }, toSpec(out.root, true)),
        ...first.map((f) => Object.assign({ id: newId(), parent: "root" }, toSpec(f, true)))
      ],
      links: []
    };
    dataset.nodes[0].label = clip(out.title, 34) || dataset.nodes[0].label;
    return { safe: true, dataset, ai: MODEL };
  }

  let blocks;
  try {
    blocks = materialBlocks(input.files);
  } catch (e) {
    if (e.code === "too_large") return { safe: true, error: "too_large" };
    throw e;
  }
  out = await callMap(RESEARCHER_MAP_SYSTEM, { topic, about_the_person: aboutPerson(profileIn) }, blocks);
  if (!out || !out.safe) return { safe: false };
  const first = out.first.slice(0, 3);
  if (!first.length) throw new Error("no first questions");

  const known = out.known.slice(0, 5).map((k, i) => ({ modelId: k.id, id: `known-${i + 1}`, label: clip(k.label, 40) }));
  const knownIds = new Set(known.map((k) => k.modelId));
  const remap = new Map(known.map((k) => [k.modelId, k.id]));
  const firstNodes = first.map((f) => {
    const n = Object.assign({ id: newId(), parent: "you" }, toSpec(f, false, knownIds));
    if (n.analogy) n.analogy.from = remap.get(n.analogy.from);
    return n;
  });
  const dataset = {
    mode: "researcher", custom: true, topic,
    title: clip(out.title, 64) || topic, subtitle: clip(out.subtitle, 100) || `Your map · ${topic}`,
    regions: { home: "Your world", away: `New region · ${clip(topic, 40)}` },
    profile: cleanProfile(profileIn, { topic, strategy: clip(out.strategy, 700), materialsSummary: clip(out.materials_summary, 1200) }),
    nodes: [
      { id: "you", kind: "you", label: clip(out.you_label, 34) || "You", lit: true },
      ...known.map((k) => ({ id: k.id, kind: "known", parent: "you", label: k.label, lit: true })),
      ...firstNodes
    ],
    links: firstNodes.filter((n) => n.analogy && n.analogy.from)
      .map((n) => ({ source: n.analogy.from, target: n.id, label: n.analogy.label }))
  };
  return { safe: true, dataset, ai: MODEL };
}

// ---------- expandNode: the next layer under one node ----------
const ExpandOut = z.object({ children: z.array(NodeOut) });

const KIDS_EXPAND_SYSTEM = (age, loves) => `You are Miror, growing a picture-book knowledge map for ${reader(age)}.${loves ? ` The child loves: ${loves}; use these for "imagine" moments when it fits naturally.` : ""} The child has just explored the given question. Write the next 2-3 questions that grow from it: one step deeper, or a fun side path (how it works, how big or fast, where it comes from, everyday life, a surprising fact). Never repeat or rephrase a question that already exists on the map.
${KIDS_NODE_RULES(age)}`;

const RESEARCHER_EXPAND_SYSTEM = `You are Miror, growing a person's knowledge map one layer at a time. They have just engaged with the given question. Write the next 2-3 questions that grow from it: one step deeper, or to a closely related side topic. Only write questions that move this person forward; prefer depth over breadth. Never repeat or rephrase a question that already exists on the map.
${PHILOSOPHY}
Include at most one "edge" node, and only when their background clearly gives them an advantage at this point. Use "frontier" for genuine open problems, more often in the deeper layers. Use "bridge" when a question builds on something they already have.
${RESEARCHER_NODE_RULES}`;

export async function expandNode(input) {
  const kids = input.mode === "kids";
  const node = input.node || {};
  const profile = Object.assign({}, input.profile || {}, input.background && !(input.profile || {}).background ? { background: input.background } : {});
  const known = cleanNodes(input.known);
  const knownIds = new Set(known.map((k) => k.id));
  const layer = Number(input.depth) + 2;
  const maxLayers = Number(input.maxLayers) || 6;
  const context = {
    topic: clip(input.topic, 160),
    ...(kids ? {} : { about_the_person: aboutPerson(profile), known }),
    path_from_root: (Array.isArray(input.path) ? input.path : []).slice(-6).map((p) => clip(p, 90)),
    question_to_grow_from: { label: clip(node.label, 90), question: clip(node.question, 240) },
    new_layer: `${layer} of ${maxLayers}${layer >= maxLayers ? " (the last layer: prefer practical next steps or open problems)" : ""}`,
    existing_questions: (Array.isArray(input.existing) ? input.existing : []).slice(0, 80).map((e) => clip(e, 90))
  };
  const age = Math.min(13, Math.max(5, Number(profile.age || input.age) || 9));
  const loves = list(profile.loves, 12).join(", ");
  const system = kids ? KIDS_EXPAND_SYSTEM(age, loves) : RESEARCHER_EXPAND_SYSTEM;
  let out = await call(system, context, ExpandOut);
  if (out && !out.children.length) {
    console.warn("expand came back empty, retrying");
    out = await call(system, context, ExpandOut);
  }
  if (!out) return { children: [] };
  // Drop questions that repeat one already on the map (the model sometimes re-asks its parent).
  const seen = (Array.isArray(input.existing) ? input.existing : []).map(String);
  const fresh = [];
  out.children.slice(0, 3).forEach((c) => {
    if (seen.some((e) => similar(e, c.label))) return;
    seen.push(c.label);
    fresh.push(c);
  });
  return {
    children: (fresh.length ? fresh : out.children.slice(0, 3)).map((c) => Object.assign({ id: newId() }, toSpec(c, kids, knownIds))),
    ai: MODEL
  };
}

// Two questions are near-duplicates when they share most of their meaningful words, or one
// (e.g. a label shortened on the map) is almost entirely contained in the other.
const STOP = new Set("a actually an and are be can do does for how in is it its look looks of on or really seem seems the this to what when where which who why with you your".split(" "));
const wordSet = (s) => new Set((String(s).toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || []).filter((w) => !STOP.has(w)));
export function similar(a, b) {
  const x = wordSet(a), y = wordSet(b);
  if (!x.size || !y.size) return false;
  let both = 0;
  x.forEach((w) => { if (y.has(w)) both++; });
  const small = Math.min(x.size, y.size);
  return both / (x.size + y.size - both) >= 0.7 || (small >= 4 && both / small >= 0.9);
}

// ---------- askExplorer: one question → one new node ----------
const AskOut = z.object({
  safe: z.boolean(),
  on_topic: z.boolean(),
  parent_id: z.string(),
  related_ids: z.array(z.string()),
  node: NodeOut
});

const ASK_PLACEMENT = `Placing the question:
- safe: false if the question is harmful.
- on_topic: false if the question has nothing to do with the map's topic. Otherwise true.
- parent_id: the id of the existing node this question fits under best (never a node of kind "known"). If it is about the topic but not related to any existing node, use the root id: it becomes a new branch.
- related_ids: up to 2 other listed ids that are clearly related, otherwise [].`;

export async function askExplorer(input) {
  const kids = input.mode === "kids";
  const question = clip(input.question, 300);
  const nodes = cleanNodes(input.nodes);
  const ids = new Set(nodes.map((n) => n.id));
  const rootId = ids.has(input.rootId) ? input.rootId : nodes[0] && nodes[0].id;
  if (!question || !rootId) throw new Error("question and nodes are required");
  const age = Math.min(13, Math.max(5, Number(input.age) || 9));
  const knownList = nodes.filter((n) => n.kind === "known");
  const system = kids
    ? `You are Miror, a friendly guide in a picture-book knowledge map for ${reader(age)}. They have asked their own question.
${ASK_PLACEMENT}
- For a child, safe is also false for adult topics, personal information or dangerous activities.
- Be generous with on_topic: a question about the same subject, animal, thing or place as the map counts (for a map about why cats purr, "Can cats see in the dark?" is on topic). Only a question about something else entirely is off topic.
Then write the question as one new node.
${KIDS_NODE_RULES(age)}`
    : `You are Miror, a guide for a researcher exploring a topic from their own background. The researcher has asked their own question.
${ASK_PLACEMENT}
Then write the question as one new node (kind "core" or "bridge", or "frontier" for an open problem; not "edge").
${RESEARCHER_NODE_RULES}`;
  const out = await call(system, {
    map_topic: clip(input.topic || input.title, 160),
    root_id: rootId,
    ...(kids ? {} : { about_the_person: aboutPerson(input.profile), known: knownList }),
    existing_nodes: nodes,
    question
  }, AskOut);

  if (!out || !out.safe) return { safe: false };
  if (!out.on_topic) return { safe: true, onTopic: false };
  const known = new Set(knownList.map((n) => n.id));
  const parentId = ids.has(out.parent_id) && !known.has(out.parent_id) ? out.parent_id : rootId;
  const related = [...new Set(out.related_ids)].filter((id) => ids.has(id) && id !== parentId).slice(0, 2);
  const spec = toSpec(Object.assign({}, out.node, { kind: out.node.kind === "edge" ? "core" : out.node.kind }), kids, known);
  return { safe: true, onTopic: true, parentId, related, spec, ai: MODEL };
}

// ---------- funFact: kids' fun-fact fertilizer → one fact on the most relevant branch ----------
const FactOut = z.object({
  safe: z.boolean(),
  parent_id: z.string(),
  emoji: z.string(),
  label: z.string(),
  fact: z.string(),
  about_love: z.boolean()
});

// A random angle keeps repeated sprinkles from landing on the same fact.
const FACT_ANGLES = ["a record-breaker (biggest, fastest, oldest, smallest)", "an animal surprise", "how it works inside",
  "a surprising number", "something from history", "something about the human body", "a sound, colour or smell",
  "something in nature", "something from space or the sky", "an everyday thing kids never noticed"];

export async function funFact(input) {
  const nodes = cleanNodes(input.nodes).filter((n) => n.kind !== "fact");
  const ids = new Set(nodes.map((n) => n.id));
  const rootId = ids.has(input.rootId) ? input.rootId : nodes[0] && nodes[0].id;
  if (!rootId) throw new Error("nodes are required");
  const age = Math.min(13, Math.max(5, Number(input.age) || 9));
  const loves = list(input.loves, 12);
  const told = (Array.isArray(input.told) ? input.told : []).slice(-12).map((t) => clip(t, 200));
  // Take turns through what the child loves, starting somewhere random, so every interest gets its fruit.
  const love = loves.length ? loves[(told.length + Math.floor(Math.random() * 2)) % loves.length] : "";
  const angle = FACT_ANGLES[Math.floor(Math.random() * FACT_ANGLES.length)];
  const system = `You are Miror, a friendly guide in a picture-book knowledge map for ${reader(age)}. They sprinkled "fun-fact fertilizer" on their map: grow one surprising, TRUE fun fact that makes them say "wow!".
- It must be a real fact, not an analogy or a comparison ("like a…" doesn't count as a fact).
- Best: a true fact where the map's topic and ${love ? `what the child loves (this time: ${love})` : "the child's everyday life"} really meet. If no real fact links them, give a true fact about ${love ? love : "the topic"} that touches the topic (for example the same science, place or animal), or else a surprising fact about the topic itself.
- If it fits, lean toward this angle: ${angle}.
- Only well-established facts that a children's encyclopedia would print. No invented numbers; if unsure, pick a more famous fact.
- fact: 1-3 short, cheerful sentences, at most 45 words, that ${reader(age)} understands. Start with the surprise itself, not with "Did you know" or "Wow".
- about_love: true only if the fact really is about ${love ? love : "something the child loves"}; otherwise false.
- Never repeat or closely rephrase a fact in already_told.
- parent_id: the id of the existing node this fact relates to most (any listed id).
- label: a tiny title of at most 28 characters, like "Owls can't roll their eyes". emoji: exactly one fitting emoji.
- safe: false only if no child-friendly fact fits; otherwise true.`;
  const out = await call(system, {
    map_topic: clip(input.topic || input.title, 160),
    child_loves: loves,
    root_id: rootId,
    existing_nodes: nodes,
    already_told: told
  }, FactOut, 4000);
  if (!out || !out.safe || !out.fact.trim()) return { safe: false };
  return {
    safe: true,
    parentId: ids.has(out.parent_id) ? out.parent_id : rootId,
    fact: { label: clip(out.label, 30), emoji: clip(out.emoji, 4) || "✨", text: clip(out.fact, 360), love: out.about_love ? love : "" },
    ai: MODEL
  };
}
