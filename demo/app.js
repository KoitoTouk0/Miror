/* Miror demo: UI around the graph (panel, quizzes, settings, progress, tour).
 *
 * URL options, handy for setting up video shots:
 *   ?mode=kids|researcher   ?kids=garden|tree   ?theme=gold|blue   ?speed=slow
 *   ?light=q1,q2 or ?light=all   ?open=q2   ?tour=1
 */
(function () {
  "use strict";

  const DATA = window.EXPLORER_DATA;
  const root = document.documentElement;
  const $ = (s) => document.querySelector(s);

  const KIND_LABEL = {
    you: "That's you",
    known: "Already yours",
    core: "Core question",
    bridge: "Bridge from your world",
    edge: "Your strength",
    frontier: "Frontier"
  };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // ---------- settings ----------
  const params = new URLSearchParams(location.search);
  const saved = readSaved();
  const settings = {
    mode: pick(params.get("mode"), saved.mode, ["researcher", "kids"], "researcher"),
    theme: pick(params.get("theme"), saved.theme, ["gold", "blue"], "gold"),
    speed: pick(params.get("speed"), saved.speed, ["normal", "slow"], "normal"),
    kidsStyle: pick(params.get("kids"), saved.kidsStyle, ["garden", "tree"], "garden"),
    zoomClick: saved.zoomClick !== false,
    autoFit: saved.autoFit !== false
  };

  // Wording that changes with the kids world (flower garden vs growing tree).
  function kidsText() {
    const tree = settings.kidsStyle === "tree";
    return {
      word: tree ? "grown" : "bloomed",
      hint: tree ? "🌱 Tap a sprout to grow the tree!" : "🌱 Tap a bud to make it bloom!",
      sprouted: (k) => (tree ? `🌿 ${k} new ${k === 1 ? "branch" : "branches"} grew!` : `🌱 ${plural(k, "new bud")} sprouted!`),
      unlocked: tree ? "New branches grew" : "New buds sprouted",
      leafDone: tree ? "This branch is all grown! Try this sprout next:" : "This flower is all grown! Try this bud next:",
      done: tree ? "🍎" : "🌸",
      finaleIcon: tree ? "🌳" : "🌻",
      finaleTitle: tree ? "Your tree is all grown!" : "Your garden is in full bloom!",
      again: tree ? "🌱 Grow a new tree" : "🌱 Plant a new garden",
      water: tree ? "💧 Water the tree" : "💧 Water the garden",
      askSub: tree
        ? "Type it or say it, then water the tree. A new branch grows where your question fits best!"
        : "Type it or say it, then water the garden. A new flower grows where your question fits best!",
      grew: tree ? "🌱 Your question grew a new branch!" : "🌱 Your question sprouted a new flower!"
    };
  }

  function pick(fromUrl, fromSave, allowed, fallback) {
    if (allowed.includes(fromUrl)) return fromUrl;
    if (allowed.includes(fromSave)) return fromSave;
    return fallback;
  }

  function readSaved() {
    try {
      return JSON.parse(localStorage.getItem("explorer.settings") || "{}");
    } catch (e) {
      return {};
    }
  }

  function save() {
    try {
      localStorage.setItem("explorer.settings", JSON.stringify(settings));
    } catch (e) { /* storage blocked: settings just won't persist */ }
  }

  const speedFactor = () => (settings.speed === "slow" ? 1.6 : 1);
  const wait = (t) => new Promise((r) => setTimeout(r, t * speedFactor()));
  const sleepRaw = (t) => new Promise((r) => setTimeout(r, t));

  // ---------- state ----------
  const panel = $("#panel");
  const body = $("#panelBody");
  let currentId = null;
  let answers = {};
  let touring = false;
  let finaleShown = false;

  const graph = ExplorerGraph.create($("#graph"), {
    onNodeClick: (n) => {
      stopTour();
      openPanel(n);
    },
    onReveal,
    onChange: updateProgress
  });

  // ---------- mode / theme ----------
  function applyLook() {
    root.dataset.mode = settings.mode;
    root.dataset.theme = settings.theme;
    graph.setSpeed(speedFactor());
    graph.setAutoFit(settings.autoFit);
    buildSky();
    syncSettingsUI();
    save();
  }

  // A map built from your own topic (via the AI) replaces the sample map for its mode.
  const MAX_LAYERS = 6;
  let custom = null;
  // A group member's garden you're visiting (kids), shown in place of your own until you go back.
  let visiting = null;
  const mapData = () => visiting || (custom && custom.mode === settings.mode ? custom : DATA[settings.mode]);

  // lit: ids to light at once (a garden restored or visited, with its progress).
  function loadMode(lit) {
    stopTour();
    closeAsker();
    closeFert();
    closePanel();
    hideFinale();
    answers = {};
    finaleShown = false;
    pending.clear();
    growing.clear();
    const data = mapData();
    const kids = settings.mode === "kids";
    $("#mapTitle").textContent = data.title;
    document.title = `Miror · ${data.title}`;
    $("#progressWord").textContent = kids ? kidsText().word : "lit";
    $("#hint").textContent = kids
      ? kidsText().hint
      : "Click a glowing question to light it up · drag to move · scroll to zoom";
    $("#hint").classList.remove("gone");
    graph.setInsets(insets());
    graph.load(data, { skin: kids ? data.style || settings.kidsStyle : "constellation" });
    if (Array.isArray(lit) && lit.length) graph.lightInstant(lit);
    $("#sampleBtn").hidden = !(custom && data === custom);
    if (custom && data === custom) prefetch(graph.node(graph.suggested()));
  }

  // ---------- growing custom maps, one layer at a time ----------
  // When you open a question, its next questions are requested in the background,
  // so they're usually ready by the time you've answered.
  const pending = new Map();
  const growing = new Set();

  // Fun-fact fruits hang on a branch without stopping it from growing its next questions.
  const questionsOf = (n) => n.children.filter((c) => c.kind !== "fact");

  function canGrow(n) {
    return Boolean(custom && mapData() === custom && aiReady() && n && !questionsOf(n).length &&
      n.depth < MAX_LAYERS - 1 && !["you", "known", "edge"].includes(n.kind));
  }

  function prefetch(n) {
    if (!n || pending.has(n.id) || !canGrow(n)) return pending.get(n && n.id);
    const map = custom;
    growing.add(n.id);
    const p = expandAI(n).then((specs) => {
      growing.delete(n.id);
      if (custom !== map) return [];
      const made = specs && specs.length ? graph.addChildren(n.id, specs) : [];
      if (!made.length) pending.delete(n.id);
      if (currentId === n.id) renderPanel(graph.node(n.id));
      return made;
    });
    pending.set(n.id, p);
    return p;
  }

  function expandAI(n) {
    const path = [];
    for (let c = n; c; c = graph.node(c.parent)) path.unshift(c.d.label);
    const profile = custom.profile || {};
    return post("/api/expand", {
      mode: settings.mode,
      topic: custom.topic,
      background: profile.background,
      age: profile.age,
      profile,
      known: graph.nodes().filter((k) => k.kind === "known").map((k) => ({ id: k.id, label: k.d.label, kind: "known" })),
      node: { label: n.d.label, question: n.d.question },
      path,
      depth: n.depth,
      maxLayers: MAX_LAYERS,
      existing: graph.nodes().map((x) => x.d.label)
    }, 40000).then((r) => {
      if (r && r.error) keyProblem(r.error);
      return (r && r.children) || [];
    });
  }

  // JSON POST to our server with a timeout. Resolves the answer, { error } for problems the page can
  // explain (a key that doesn't work, files too large), or null on any other failure.
  async function post(url, body, timeoutMs, key = keyInUse()) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const headers = { "content-type": "application/json" };
    if (key) headers["x-explorer-key"] = key;
    try {
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal });
      if (r.ok) return await r.json();
      const err = await r.json().catch(() => null);
      return err && err.error ? err : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function buildSky() {
    const sky = $("#sky");
    sky.innerHTML = "";
    const add = (cls, style) => {
      const el = document.createElement("i");
      el.className = cls;
      Object.assign(el.style, style);
      sky.appendChild(el);
      return el;
    };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const night = settings.theme === "gold";
    if (night) {
      const count = settings.mode === "kids" ? 70 : 130;
      for (let i = 0; i < count; i++) {
        const s = rnd(0.8, 2.2);
        add("star", {
          left: rnd(0, 100) + "%",
          top: rnd(0, settings.mode === "kids" ? 60 : 100) + "%",
          width: s + "px",
          height: s + "px",
          animationDelay: rnd(-6, 0) + "s",
          "--dur": rnd(3, 7) + "s"
        });
      }
    }
    if (settings.mode === "kids" && night) {
      add("moon", {});
      for (let i = 0; i < 16; i++) {
        add("firefly", {
          left: rnd(5, 95) + "%",
          top: rnd(35, 90) + "%",
          animationDelay: `${rnd(-9, 0)}s, ${rnd(-3, 0)}s`,
          "--dur": rnd(7, 13) + "s",
          "--dx": rnd(-80, 80) + "px",
          "--dy": rnd(-60, 40) + "px"
        });
      }
    }
    if (settings.mode === "kids" && !night) {
      add("sun", {});
      for (let i = 0; i < 5; i++) {
        add("cloud", {
          top: rnd(4, 38) + "%",
          left: 0,
          "--w": rnd(110, 220) + "px",
          "--dur": rnd(55, 95) + "s",
          animationDelay: rnd(-90, 0) + "s"
        });
      }
    }
  }

  // ---------- layout insets ----------
  function isNarrow() {
    return window.innerWidth <= 760;
  }

  function insets() {
    const open = panel.classList.contains("open");
    const top = isNarrow() ? 110 : 76;
    if (isNarrow()) return { top, right: 0, bottom: open ? panel.offsetHeight + 16 : 50, left: 0 };
    return { top, right: open ? panel.offsetWidth + 32 : 0, bottom: 64, left: 0 };
  }

  // ---------- panel ----------
  function openPanel(n) {
    currentId = n.id;
    const linking = settings.mode === "researcher" && n.kind === "edge";
    panel.classList.toggle("interlink", linking);
    graph.interlink(linking ? n.id : null);
    renderPanel(n);
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    graph.select(n.id);
    graph.setInsets(insets());
    graph.flyTo(n.id);
    if (settings.zoomClick) graph.zoomTo(n.id);
    if (n.state !== "lit") prefetch(n);
    else graph.focus(n.id);
  }

  // Closing the panel zooms back out to the whole map.
  function closePanel() {
    const wasOpen = panel.classList.contains("open");
    if (panel.classList.contains("interlink")) {
      panel.classList.remove("interlink");
      graph.interlink(null);
    }
    currentId = null;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    graph.select(null);
    graph.setInsets(insets());
    if (wasOpen && settings.zoomClick) graph.fit(900);
  }

  function renderPanel(n) {
    body.innerHTML = settings.mode === "kids" ? kidsPanel(n) : researcherPanel(n);
    body.style.animation = "none";
    void body.offsetWidth;
    body.style.animation = "";
    wirePanel(n);
  }

  // A gold strength star: everything you bring to the new field, and how it links in.
  function interlinkHTML(n) {
    const p = mapData().profile || {};
    const shown = graph.nodes().filter((x) => x.state !== "hidden");
    const strengths = shown.filter((x) => x.kind === "edge");
    const bridges = [];
    shown.forEach((x) => graph.analogiesOf(x.id).forEach(({ other, label }) => {
      if (other.kind === "known" && x.kind !== "known") bridges.push(`<b>${esc(other.d.label)}</b> → ${esc(x.d.label)}${label ? ` <span class="muted">(${esc(label)})</span>` : ""}`);
    }));
    shown.filter((x) => x.kind === "bridge" && x.d.bridge).forEach((x) => bridges.push(`<b>${esc(x.d.label)}</b>: ${esc(x.d.bridge)}`));
    const yours = [].concat(p.fields || [], p.skills || []).slice(0, 8);
    return `<section class="block"><h3>🔗 Interlink: the strengths you bring</h3>
        <ul class="interlink-list">${strengths.map((x) => `<li><b>✦ ${esc(x.d.label)}</b>${x.d.why ? `<br>${esc(x.d.why)}` : ""}</li>`).join("")}</ul></section>
      ${bridges.length ? `<section class="block"><h3>Your skills → the new field</h3><ul class="interlink-list">${[...new Set(bridges)].slice(0, 6).map((b) => `<li>${b}</li>`).join("")}</ul></section>` : ""}
      ${yours.length ? `<section class="block"><h3>What you're building on</h3><div class="chips">${yours.map((s) => `<span class="chip static">${esc(s)}</span>`).join("")}</div></section>` : ""}`;
  }

  function researcherPanel(n) {
    const d = n.d;
    let html = n.own
      ? `<div class="badge" style="--c: var(--accent)">Your question</div>`
      : `<div class="badge" style="--c: var(--k-${n.kind})">${KIND_LABEL[n.kind] || ""}</div>`;
    if (n.kind === "you") return html + youHTML();
    if (n.kind === "known") return html + knownHTML(n);
    if (n.kind === "edge") html += interlinkHTML(n);
    html += `<h2 class="q">${esc(d.question || d.label)}</h2>`;
    if (d.why) html += `<section class="block"><h3>${n.kind === "edge" ? "Why it's a strength" : "Why this matters to you"}</h3><p>${esc(d.why)}</p></section>`;
    if (d.bridge) html += `<section class="block bridge"><h3>From your world</h3><p>${esc(d.bridge)}</p></section>`;
    html += `<section class="block task">${taskHTML(n)}</section>`;
    if (n.state === "lit") html += `<section class="block">${unlocksHTML(n)}</section>`;
    return html;
  }

  function taskHTML(n) {
    const t = n.d.task || { type: "claim" };
    if (n.state === "lit") {
      if (t.type === "claim") return `<div class="done gold">✦ Claimed and added to “What you bring”</div>`;
      if (t.type === "reflect") return `<div class="done">✓ Lit</div><h3>Your thought</h3><blockquote class="your-thought">${esc(answers[n.id] || t.sample || "")}</blockquote>`;
      return `<div class="done">✓ Lit</div><p>${esc(t.explain || "")}</p>`;
    }
    if (t.type === "claim") {
      return `<h3>Claim it</h3><p class="prompt">Claiming adds this to your “What you bring” summary, ready to share with collaborators.</p>
        <button type="button" class="primary gold" data-act="claim">✦ Claim this strength</button>`;
    }
    if (t.type === "reflect") {
      return `<h3>Your thought</h3><p class="prompt">${esc(t.prompt)}</p>
        <textarea id="thought" placeholder="One sentence is enough…" aria-label="Your thought"></textarea>
        <button type="button" class="primary" data-act="reflect" disabled>Light it up</button>`;
    }
    return `<h3>Quick check</h3><p class="prompt">${esc(t.prompt)}</p>
      <div class="options">${optionsHTML(n, "opt")}</div>
      <p class="feedback" aria-live="polite"></p>`;
  }

  // Options are shuffled per node (stable), so the right answer isn't always first.
  function optionsHTML(n, cls) {
    const t = n.d.task;
    const order = t.options.map((_, i) => i);
    let seed = [...n.id].reduce((a, c) => a + c.charCodeAt(0), 7);
    for (let i = order.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = Math.floor((seed / 233280) * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order.map((i) => `<button type="button" class="${cls}" data-correct="${i === t.answer ? 1 : 0}">${esc(t.options[i])}</button>`).join("");
  }

  // The suggested next node gets a "Next" tag: the guide always points somewhere.
  function chip(c) {
    const color = settings.mode === "kids" ? c.color : `var(--k-${c.kind})`;
    const next = c.id === graph.suggested();
    return `<button type="button" class="chip${next ? " next" : ""}" data-go="${esc(c.id)}"><i class="dot" style="--c: ${color}"></i>${esc(c.d.emoji ? c.d.emoji + " " + c.d.label : c.d.label)}${next ? `<span class="tag">Next</span>` : ""}</button>`;
  }

  function unlocksHTML(n) {
    const kids = questionsOf(n);
    const next = graph.suggested() && graph.node(graph.suggested());
    if (kids.length) {
      const title = settings.mode === "kids" ? kidsText().unlocked : "This unlocked";
      return `<h3 class="eyebrow">${title}</h3><div class="chips">${kids.map(chip).join("")}</div>`;
    }
    if (growing.has(n.id)) {
      return `<h3 class="eyebrow">Next</h3><p class="muted growing">${settings.mode === "kids" ? "🌱 New branches are growing…" : "💭 New questions are growing from this one…"}</p>`;
    }
    if (!next) return "";
    let lead = settings.mode === "kids" ? kidsText().leafDone : "End of this branch. Suggested next:";
    if (custom && mapData() === custom && n.depth >= MAX_LAYERS - 1) {
      lead = `You reached the edge of this map (${MAX_LAYERS} layers). Ask your own question to keep going, or try:`;
    }
    return `<h3 class="eyebrow">Next</h3><p class="muted" style="margin:0 0 10px">${lead}</p><div class="chips">${chip(next)}</div>`;
  }

  function youHTML() {
    const p = mapData().profile || {};
    const claimed = graph.nodes().filter((n) => n.kind === "edge" && n.state === "lit");
    const chips = (list) => `<div class="chips">${list.map((s) => `<span class="chip static">${esc(s)}</span>`).join("")}</div>`;
    const strengths = `<section class="block"><h3>What you bring so far</h3>
        ${claimed.length
          ? `<ul class="strength-list">${claimed.map((n) => `<li>${esc(n.d.label)}</li>`).join("")}</ul>`
          : `<p class="muted">Gold stars are strengths you bring to this field. Claim them as you explore and they'll collect here.</p>`}
      </section>`;
    if (mapData().custom) {
      const row = (label, value) => (value ? `<dt>${label}</dt><dd>${value}</dd>` : "");
      const list = (arr) => (arr && arr.length ? chips(arr) : "");
      const next = graph.suggested() && graph.node(graph.suggested());
      return `<h2 class="q">Your starting point</h2>
        ${p.strategy ? `<section class="block bridge path"><h3>Your path</h3><p>${esc(p.strategy)}</p></section>` : ""}
        ${next ? `<div class="chips" style="margin: -4px 0 20px">${chip(next)}</div>` : ""}
        ${p.materialsSummary ? `<section class="block"><h3>From your materials</h3><p>${esc(p.materialsSummary)}</p></section>` : ""}
        <dl class="profile">
          ${row("Exploring", esc(mapData().topic))}
          ${row("Level", esc(p.level))}
          ${row("Expertise", list((p.fields || []).concat(p.expertise ? [p.expertise] : [])))}
          ${row("Skills & hobbies", list(p.skills))}
          ${row("Already know", esc([p.knownLevel, p.knownText].filter(Boolean).join(": ")))}
          ${row("Why", esc((p.purpose || []).join(" · ")))}
          ${row("Sparked by", esc(p.spark))}
          ${row("Materials", esc((p.materialNames || []).join(" · ")))}
          ${row("Background", esc(p.background))}
          ${row("Depth", `Grows up to ${MAX_LAYERS} layers`)}
        </dl>${strengths}`;
    }
    return `<h2 class="q">Your starting point</h2>
      <p class="lead">This map was built from your intake answers. Every question in it is anchored to what you already know.</p>
      <dl class="profile">
        <dt>Level</dt><dd>${esc(p.level)}</dd>
        <dt>Skills</dt><dd>${chips(p.skills)}</dd>
        <dt>Exploring</dt><dd>${esc(p.region)}</dd>
        <dt>Purpose</dt><dd>${esc(p.purpose)}</dd>
        <dt>Sparked by</dt><dd>${esc(p.origin)}</dd>
        <dt>Your thought</dt><dd><i>“${esc(p.thoughts)}”</i></dd>
        <dt>Materials</dt><dd>${esc(p.materials.join(" · "))}</dd>
      </dl>
      <section class="block"><h3>What you bring so far</h3>
        ${claimed.length
          ? `<ul class="strength-list">${claimed.map((n) => `<li>${esc(n.d.label)}</li>`).join("")}</ul>`
          : `<p class="muted">Gold stars are strengths you bring to this field. Claim them as you explore and they'll collect here.</p>`}
      </section>`;
  }

  function knownHTML(n) {
    const bridges = graph.analogiesOf(n.id);
    const found = bridges.filter((b) => b.other.state !== "hidden");
    const waiting = bridges.length - found.length;
    let html = `<h2 class="q">${esc(n.d.label)}</h2>
      <p class="lead">${mapData().custom ? "It comes from your background" : "You listed this in your intake"}, so it's lit from the start. Your map isn't empty on day one.</p>`;
    if (bridges.length) {
      html += `<section class="block"><h3>Bridges into the new region</h3>`;
      if (found.length) html += `<div class="chips">${found.map((b) => chip(b.other)).join("")}</div>`;
      if (waiting) html += `<p class="muted" style="margin-top:10px">${plural(waiting, "more bridge")} waiting to be discovered.</p>`;
      html += `</section>`;
    }
    return html;
  }

  function kidsPanel(n) {
    if (n.kind === "fact") return factPanel(n);
    const d = n.d, t = d.task;
    let html = `${n.own ? `<div class="badge" style="--c: var(--accent); display: flex; margin-bottom: 10px">💭 Your question</div>` : ""}
      <div class="kid-emoji">${esc(d.emoji || "🌱")}</div>
      <h2 class="kid-q">${esc(d.question)}</h2>
      <div class="kid-life"><b>💡 Imagine</b><p>${esc(d.life)}</p></div>`;
    if (n.state === "lit") {
      html += `<p class="kid-feedback good" style="margin-top:18px">${kidsText().done} ${esc(t.explain)}</p>
        <section class="block" style="margin-top:18px">${unlocksHTML(n)}</section>`;
    } else if (t.type === "wonder") {
      html += `<p class="kid-prompt">What do you think the answer is? Say it out loud, or ask a grown-up!</p>
        <button type="button" class="primary" data-act="wonder">🌟 I'll find out!</button>`;
    } else {
      html += `<p class="kid-prompt">${esc(t.prompt)}</p>
        <div class="kid-options">${optionsHTML(n, "kid-opt")}</div>
        <p class="kid-feedback" aria-live="polite"></p>`;
    }
    return html;
  }

  function factPanel(n) {
    const d = n.d, parent = graph.node(n.parent);
    const owner = visiting && visiting.owner;
    const why = d.love ? `<p class="kid-feedback good fact-love">💛 ${owner ? `Picked for ${esc(owner)}, who loves` : "Picked for you because you love"} ${esc(d.love)}!</p>` : "";
    const where = parent ? `<p class="muted" style="margin:16px 0 8px">${graph.skin() === "tree" ? "🍎 It grew on this branch:" : "🌼 It bloomed next to this question:"}</p><div class="chips">${chip(parent)}</div>` : "";
    return `<div class="badge fact-badge" style="--c: #f0a500; display: flex; margin-bottom: 10px">✨ Fun fact</div>
      <div class="kid-emoji">${esc(d.emoji || "✨")}</div>
      <h2 class="kid-q">${esc(d.label)}</h2>
      <div class="kid-life fact-box"><b>🤩 Wow!</b><p>${esc(d.text)}</p></div>
      ${why}
      ${where}
      ${owner ? "" : `<button type="button" class="primary" data-act="fact-again" style="margin-top:18px">✨ Another fun fact!</button>`}`;
  }

  function wirePanel(n) {
    body.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => {
      stopTour();
      const target = graph.node(b.dataset.go);
      if (target) openPanel(target);
    }));

    body.querySelectorAll(".opt, .kid-opt").forEach((b) => b.addEventListener("click", () => {
      const kids = settings.mode === "kids";
      const feedback = body.querySelector(kids ? ".kid-feedback" : ".feedback");
      if (b.dataset.correct === "1") {
        b.classList.add("correct");
        body.querySelectorAll(".opt, .kid-opt").forEach((o) => { o.disabled = true; });
        feedback.textContent = kids ? `🎉 ${n.d.task.explain}` : `✓ ${n.d.task.explain || "Correct."}`;
        lightNode(n, 650);
      } else {
        b.classList.remove("wrong");
        void b.offsetWidth;
        b.classList.add("wrong");
        feedback.textContent = kids ? "🤔 Not quite! Try another one." : "Not quite. Have another look.";
      }
    }));

    const ta = body.querySelector("#thought");
    const reflectBtn = body.querySelector('[data-act="reflect"]');
    if (ta && reflectBtn) {
      ta.addEventListener("input", () => { reflectBtn.disabled = ta.value.trim().length < 3; });
      reflectBtn.addEventListener("click", () => {
        answers[n.id] = ta.value.trim();
        reflectBtn.disabled = true;
        ta.readOnly = true;
        lightNode(n, 150);
      });
    }

    const wonderBtn = body.querySelector('[data-act="wonder"]');
    if (wonderBtn) wonderBtn.addEventListener("click", () => {
      wonderBtn.disabled = true;
      lightNode(n, 100);
    });

    const againBtn = body.querySelector('[data-act="fact-again"]');
    if (againBtn) againBtn.addEventListener("click", () => {
      againBtn.disabled = true;
      growFact();
    });

    const claimBtn = body.querySelector('[data-act="claim"]');
    if (claimBtn) claimBtn.addEventListener("click", () => {
      claimBtn.disabled = true;
      lightNode(n, 100);
      const stat = $("#strengthStat");
      stat.classList.remove("bump");
      void stat.offsetWidth;
      stat.classList.add("bump");
    });
  }

  function lightNode(n, delay) {
    setTimeout(() => {
      graph.light(n.id);
      $("#hint").classList.add("gone");
      // Custom maps: if the next questions are still being written, say so until they grow in.
      const next = prefetch(graph.node(n.id));
      if (next && growing.has(n.id)) {
        const done = toast(settings.mode === "kids" ? "🌱 Growing new branches…" : "💭 Growing new questions…", "thinking", true);
        next.then(done, done);
      }
      setTimeout(() => {
        if (currentId === n.id) renderPanel(graph.node(n.id));
      }, 900 * speedFactor());
    }, delay * speedFactor());
  }

  // ---------- progress, toasts, finale ----------
  function updateProgress() {
    // Custom maps keep growing, so count only what's visible and skip the finale.
    const growingMap = Boolean(mapData().custom);
    const goals = graph.nodes().filter((n) => !n.d.lit && (!growingMap || n.state !== "hidden"));
    const lit = goals.filter((n) => n.state === "lit").length;
    $("#litCount").textContent = lit;
    $("#totalCount").textContent = goals.length;
    $("#bar").style.width = goals.length ? `${(100 * lit) / goals.length}%` : "0";
    $("#strengthCount").textContent = graph.nodes().filter((n) => n.kind === "edge" && n.state === "lit").length;
    scheduleSync();
    if (lit > 0) $("#hint").classList.add("gone");
    if (!growingMap && goals.length && lit === goals.length && !finaleShown) {
      finaleShown = true;
      setTimeout(showFinale, 1700 * speedFactor());
    }
  }

  function onReveal(kids) {
    // Custom maps: start writing the next layer for the newly suggested question.
    if (mapData().custom) setTimeout(() => prefetch(graph.node(graph.suggested())), 400);
    if (settings.mode === "kids") {
      toast(kidsText().sprouted(kids.length));
      return;
    }
    kids.filter((c) => c.kind === "edge").forEach((c, i) => {
      setTimeout(() => toast(`✦ Strength discovered: ${c.d.label}`, "gold"), i * 400);
    });
    const questions = kids.filter((c) => c.kind !== "edge").length;
    if (questions) toast(`+${plural(questions, "new question")}`);
  }

  // A sticky toast stays until its dismiss function is called (e.g. while waiting for the AI).
  function toast(text, cls, sticky) {
    const el = document.createElement("div");
    el.className = `toast ${cls || ""}`;
    el.textContent = text;
    $("#toasts").appendChild(el);
    const dismiss = () => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 400);
    };
    if (!sticky) setTimeout(dismiss, 2800 * speedFactor());
    return dismiss;
  }

  function showFinale() {
    const f = $("#finale");
    if (settings.mode === "kids") {
      const t = kidsText();
      f.innerHTML = `<div class="finale-card"><div class="big">${t.finaleIcon}</div>
        <h2>${t.finaleTitle}</h2>
        <p>You found out how planes fly, from wings and engines all the way to the Wright brothers.</p>
        <div class="row"><button type="button" class="primary" data-act="again">${t.again}</button>
        <button type="button" class="ghost" data-act="close">Keep looking</button></div></div>`;
      confetti();
    } else {
      const nodes = graph.nodes();
      const strengths = nodes.filter((n) => n.kind === "edge");
      const known = nodes.filter((n) => n.kind === "known").length;
      const answered = nodes.filter((n) => !n.d.lit && n.kind !== "edge").length;
      f.innerHTML = `<div class="finale-card"><div class="badge" style="--c: var(--accent)">Map complete</div>
        <h2>Your map is lit.</h2>
        <p>You started with ${plural(known, "skill")} and worked through ${plural(answered, "question")}. Here's what you bring to the group:</p>
        <ul class="strength-list">${strengths.map((n) => `<li>${esc(n.d.label)}</li>`).join("")}</ul>
        <div class="row"><button type="button" class="primary" data-act="close">Keep exploring</button>
        <button type="button" class="ghost" data-act="again">Start over</button></div></div>`;
    }
    f.hidden = false;
    f.querySelector('[data-act="close"]').addEventListener("click", hideFinale);
    f.querySelector('[data-act="again"]').addEventListener("click", loadMode);
  }

  function hideFinale() {
    $("#finale").hidden = true;
    document.querySelectorAll(".confetti").forEach((c) => c.remove());
  }

  function confetti() {
    const box = document.createElement("div");
    box.className = "confetti";
    const colors = ["#ff6fa3", "#ffb703", "#9d6bff", "#4cc9f0", "#57cc99", "#ff8c42"];
    for (let i = 0; i < 90; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.8 + "s";
      p.style.setProperty("--dur", 2.4 + Math.random() * 1.8 + "s");
      p.style.setProperty("--dx", (Math.random() - 0.5) * 240 + "px");
      p.style.setProperty("--rot", Math.random() * 900 + "deg");
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 5000);
  }

  // ---------- tour (auto-play for recording) ----------
  async function runTour() {
    touring = true;
    updateTourBtn();
    closeSettings();
    hideFinale();
    while (touring) {
      const id = graph.suggested();
      if (!id) break;
      const n = graph.node(id);
      openPanel(n);
      await wait(1700);
      if (!touring) break;
      await autoAnswer(n);
      if (!touring) break;
      await wait(n.children.length ? 2700 : 2100);
    }
    touring = false;
    updateTourBtn();
  }

  async function autoAnswer(n) {
    const t = n.d.task || { type: "claim" };
    const opt = body.querySelector('[data-correct="1"]');
    if (opt) {
      opt.classList.add("hover");
      await wait(650);
      if (touring) opt.click();
      return;
    }
    if (t.type === "reflect") {
      const ta = body.querySelector("#thought");
      ta.focus({ preventScroll: true });
      for (const ch of t.sample || "Interesting.") {
        if (!touring) return;
        ta.value += ch;
        ta.dispatchEvent(new Event("input"));
        await wait(26);
      }
      await wait(450);
      if (touring) body.querySelector('[data-act="reflect"]').click();
      return;
    }
    const button = body.querySelector('[data-act="claim"], [data-act="wonder"]');
    if (button) {
      await wait(500);
      if (touring) button.click();
    }
  }

  // ---------- ask your own question ----------
  const asker = $("#asker");
  const askInput = $("#askInput");
  const askGo = $("#askGo");
  const micBtn = $("#micBtn");
  const askNote = (text) => { $("#askNote").textContent = text; };
  $("#canIcon").innerHTML = ExplorerGraph.CAN_SVG;

  function openAsker() {
    stopTour();
    closeFert();
    closePanel();
    closeSettings();
    const kids = settings.mode === "kids";
    const data = mapData();
    $("#askerTitle").textContent = kids ? "What do you wonder? 💭" : "Ask your own question";
    $("#askerSub").textContent = kids
      ? kidsText().askSub
      : "It joins your map as a new star, next to the question it relates to most, with links to related ideas.";
    askInput.placeholder = kids ? "Type your question here…" : "e.g. How long does a DFT calculation take?";
    askInput.value = "";
    askNote("");
    askGo.disabled = true;
    askGo.textContent = kids ? kidsText().water : "✦ Add it to my map";
    const chips = (data.bank || []).slice(0, 3)
      .map((b) => `<button type="button" class="chip" data-q="${esc(b.label)}">${b.emoji ? b.emoji + " " : ""}${esc(b.label)}</button>`)
      .join("");
    $("#askChips").innerHTML = chips ? `<span class="muted" style="width:100%;font-size:12.5px">${kids ? "Or try one of these:" : "Try one:"}</span>${chips}` : "";
    $("#askChips").querySelectorAll("[data-q]").forEach((c) => c.addEventListener("click", () => {
      askInput.value = c.dataset.q;
      askInput.dispatchEvent(new Event("input"));
    }));
    asker.hidden = false;
    askInput.focus();
  }

  function closeAsker() {
    stopMic();
    asker.hidden = true;
  }

  async function submitAsk() {
    const text = askInput.value.trim();
    if (text.length < 3) return;
    closeAsker();
    const kids = settings.mode === "kids";
    let plan = ExplorerAsk.plan(text, mapData(), graph);
    $("#hint").classList.add("gone");

    // Not in the built-in bank: ask the AI (via our server) for the text, keep the offline plan as fallback.
    if (plan.type === "new" && !plan.fromBank && aiReady()) {
      const done = toast(kids ? "💭 Let me think…" : "💭 Thinking…", "thinking", true);
      const ai = await askAI(text);
      done();
      if (ai && ai.error) keyProblem(ai.error);
      if (ai && ai.safe === false) {
        toast(kids ? "🙈 That's one to ask a grown-up about!" : "Miror can't help with that question.");
        return;
      }
      if (ai && ai.onTopic === false) {
        toast(kids ? "🤔 That's a different topic! Tap 🧭 to grow a new map for it." : "That's outside this map's topic. Use 🧭 New topic to explore it.");
        return;
      }
      if (ai && ai.spec && graph.node(ai.parentId)) {
        plan = {
          type: "new",
          parentId: ai.parentId,
          related: ai.related || [],
          spec: Object.assign({}, ai.spec, { id: plan.spec.id, own: true, asked: text })
        };
      }
    }

    if (plan.type === "existing") {
      const n = graph.node(plan.id);
      if (n.kind === "known") toast("That's already in your world ✓");
      else toast(kids ? "🌼 That question is already on your map!" : "That question is already on your map");
      if (n.state === "hidden") await sleepRaw(graph.revealPath(n.id) + 900);
      openPanel(graph.node(plan.id));
      return;
    }

    // Fly to the most relevant node, water it (kids) or send a comet (researcher), then grow.
    graph.zoomTo(plan.parentId);
    await wait(1000);
    if (kids) await graph.water(plan.parentId);
    else await graph.comet(plan.parentId);
    graph.addNode(plan.spec, plan.parentId, plan.related, kids ? "" : "related");
    toast(kids ? kidsText().grew : "✦ Your question joined the map");
  }

  // ---------- fun-fact fertilizer (kids) ----------
  // Interest first: a short surprising fact tied to what the child loves grows as a fruit or blossom
  // on the branch it fits best. The AI writes it; sample gardens use their built-in facts.
  const fertAsk = $("#fertAsk");
  let factBusy = false;
  $("#fertIcon").innerHTML = ExplorerGraph.FERT_SVG;

  function lovesOf(data) {
    const p = data.profile || {};
    return Array.isArray(p.loves) ? p.loves.filter(Boolean) : [];
  }

  function listWords(items) {
    return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  }

  function openFert() {
    stopTour();
    closeAsker();
    closePanel();
    closeSettings();
    const data = mapData();
    const loves = lovesOf(data).slice(0, 3);
    const about = loves.length ? listWords(loves) : (data.topic || data.title);
    $("#fertSub").textContent = `Sprinkle it on your ${settings.kidsStyle === "tree" ? "tree" : "garden"} and a surprise fun fact about ${about} will grow!`;
    $("#fertGo").disabled = factBusy;
    fertAsk.hidden = false;
    $("#fertGo").focus();
  }

  function closeFert() {
    fertAsk.hidden = true;
  }

  // A built-in fact for this map that hasn't been told yet, on a branch that's already showing.
  function bankFact(data, told) {
    const shown = (id) => graph.node(id) && graph.node(id).state !== "hidden" && graph.node(id).kind !== "fact";
    const root = graph.nodes().find((n) => n.isRoot);
    const pool = (data.facts || []).filter((f) => !told.includes(f.text));
    if (!pool.length) return null;
    const f = pool[Math.floor(Math.random() * pool.length)];
    return { parentId: shown(f.parent) ? f.parent : root.id, fact: { label: f.label, emoji: f.emoji, text: f.text, love: f.love || "" } };
  }

  function factAI(told) {
    const data = mapData();
    const nodes = graph.nodes().filter((n) => n.state !== "hidden" && n.kind !== "fact")
      .map((n) => ({ id: n.id, label: n.d.label, kind: n.kind, state: n.state }));
    const root = graph.nodes().find((n) => n.isRoot);
    return post("/api/fact", {
      mode: "kids",
      topic: data.topic || data.title,
      title: data.title,
      age: data.profile && data.profile.age,
      loves: lovesOf(data),
      rootId: root && root.id,
      nodes,
      told
    }, 25000);
  }

  async function growFact() {
    if (factBusy) return;
    factBusy = true;
    closeFert();
    closePanel();
    stopTour();
    $("#hint").classList.add("gone");
    try {
      const data = mapData();
      const told = graph.nodes().filter((n) => n.kind === "fact").map((n) => n.d.text);
      // Sample gardens use their built-in facts first; your own maps ask the AI.
      let got = bankFact(data, told);
      if (!got && aiReady()) {
        const done = toast("✨ Mixing the fertilizer…", "thinking", true);
        const r = await factAI(told);
        done();
        if (r && r.safe && r.fact && graph.node(r.parentId)) got = r;
      }
      if (!got) {
        toast(aiReady() ? "🌧️ No fun fact grew this time. Try again!" : "🌧️ The fertilizer needs the AI helper to grow new facts.");
        return;
      }
      graph.zoomTo(got.parentId);
      await wait(1000);
      await graph.fertilize(got.parentId);
      const n = graph.addFact(Object.assign({ id: `fact-${Date.now().toString(36)}` }, got.fact), got.parentId);
      if (!n) return;
      toast(settings.kidsStyle === "tree" ? "🍎 A fun-fact fruit grew!" : "🌼 A fun-fact flower bloomed!");
      await wait(1400);
      openPanel(graph.node(n.id));
    } finally {
      factBusy = false;
    }
  }

  $("#fertBtn").addEventListener("click", () => {
    if (fertAsk.hidden) openFert();
    else closeFert();
  });
  $("#fertClose").addEventListener("click", closeFert);
  $("#fertGo").addEventListener("click", growFact);

  // ---------- group lands (kids): share your garden, visit others' ----------
  // Your map as plain data: every question and fact, plus which ones are grown.
  function exportMap() {
    const data = mapData();
    const nodes = graph.nodes().map((n) => {
      const d = Object.assign({}, n.d, { id: n.id, color: n.color });
      if (n.parent) d.parent = n.parent;
      else delete d.parent;
      if (n.kind === "fact") d.kind = "fact";
      return d;
    });
    const lit = graph.nodes().filter((n) => n.state === "lit" && !n.d.lit).map((n) => n.id);
    return { dataset: Object.assign({}, data, { nodes }), lit };
  }

  // While you visit someone, your own garden waits in `home`. Sharing always sends your own.
  // shareKey ties this map to its shared copy, so sharing again updates it instead of adding another.
  let home = null;
  function myGarden() {
    if (!home && !mapData().shareKey) mapData().shareKey = `garden-${Date.now().toString(36)}`;
    const saved = home ? home.map : exportMap();
    if (!saved.dataset.shareKey) saved.dataset.shareKey = `garden-${Date.now().toString(36)}`;
    return { key: saved.dataset.shareKey, title: saved.dataset.title, style: settings.kidsStyle, nodes: saved.dataset.nodes, lit: saved.lit };
  }

  function visitGarden(g) {
    stopTour();
    closePanel();
    closeAsker();
    closeFert();
    if (!visiting) home = { wasCustom: Boolean(custom && mapData() === custom), map: exportMap() };
    closeExplore();
    visiting = { mode: "kids", custom: true, owner: g.nickname, title: g.title, style: g.style, nodes: g.nodes, links: [] };
    root.classList.add("visiting");
    $("#visitWho").textContent = `${g.avatar} ${g.nickname}'s ${g.style === "tree" ? "tree" : "garden"}`;
    $("#visitBar").hidden = false;
    loadMode(g.lit);
    $("#hint").classList.add("gone");
    toast(`👀 Welcome to ${g.nickname}'s ${g.style === "tree" ? "tree" : "garden"}!`);
  }

  function endVisit() {
    if (!visiting) return;
    visiting = null;
    root.classList.remove("visiting");
    $("#visitBar").hidden = true;
    const back = home;
    home = null;
    if (back.wasCustom) custom = back.map.dataset;
    else DATA[settings.mode] = back.map.dataset;
    loadMode(back.map.lit);
  }

  $("#visitBack").addEventListener("click", () => {
    endVisit();
    toast(settings.kidsStyle === "tree" ? "🌳 Back to your tree" : "🌻 Back to your garden");
  });

  const groups = ExplorerGroups.create({
    garden: myGarden,
    visit: visitGarden,
    // A brand-new garden planted from a land: straight into the seed and the kids' questions;
    // once it's built it goes into that land.
    plant: (code) => {
      if (settings.mode !== "kids") setMode("kids");
      openExplore();
      plantIn = code;
      startJourney("kids");
      scene.begin();
    },
    toast,
    before: () => { stopTour(); closePanel(); closeAsker(); closeFert(); closeSettings(); }
  });
  $("#groupBtn").addEventListener("click", () => groups.open());
  $("#visitLand").addEventListener("click", () => groups.open());

  // A garden that's shared in a land keeps its copy there up to date as it grows.
  let plantIn = null, syncTimer = null;
  function scheduleSync() {
    if (visiting || settings.mode !== "kids") return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => groups.sync(), 2500);
  }

  async function plantedInLand(code) {
    const r = await groups.shareTo(code);
    if (!r.error) toast(`🏡 Planted in ${groups.landName(code)}! It grows there as you explore.`);
  }

  // ---------- AI step (server-side; the key never reaches the browser) ----------
  let aiOn = false, serverUp = false, aiText = "";
  const LOCAL_APP = "http://localhost:8787";
  // The AI can answer: the server has a key, or (researcher mode) you added your own.
  const aiReady = () => aiOn || Boolean(serverUp && keyInUse());

  async function health(base) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
      const r = await fetch(base + "/api/health", { cache: "no-store", signal: ctrl.signal });
      const h = r.ok ? await r.json() : null;
      return h && "ai" in h ? h : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // Resolves whether the AI is on. A copy opened as a file (or through another preview server) can't
  // reach the AI, so if Miror's own server is running it moves there, keeping the URL's options.
  async function checkAI() {
    const h = location.protocol === "file:" ? null : await health("");
    serverUp = Boolean(h);
    if (h) {
      setAIStatus(Boolean(h.ai), h.ai ? `AI answers on (${h.model})` : "AI key not set: built-in answers only.");
      return aiReady();
    }
    const local = location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
    if (local && location.origin !== LOCAL_APP && await health(LOCAL_APP)) {
      location.replace(LOCAL_APP + "/" + location.search + location.hash);
      return false;
    }
    setAIStatus(false, local ? "AI server not running: double-click “Start Miror” in the project folder." : "AI server not reachable: built-in answers only.");
    return aiReady();
  }

  function setAIStatus(on, text) {
    aiOn = on;
    aiText = text;
    renderAIStatus();
  }

  function renderAIStatus() {
    $("#aiStatus").textContent = serverUp && keyInUse() ? "🟢 AI answers on, using your own key" : `${aiOn ? "🟢" : "⚪"} ${aiText}`;
  }

  // ---------- your own API key (researcher mode) ----------
  // Kept in this browser only (for this tab, or remembered if you tick the box) and sent only with your
  // own research requests; the server uses it for that request and never stores it.
  const KEY_STORE = "explorer-api-key";
  const KEY_NOTE = "Research maps then run on your own Anthropic account. The key stays in this browser and goes only with your own requests; Miror never stores it.";
  let userKey = readKey();

  function readKey() {
    try {
      return sessionStorage.getItem(KEY_STORE) || localStorage.getItem(KEY_STORE) || "";
    } catch (e) {
      return "";
    }
  }

  function saveKey(key, remember) {
    try {
      sessionStorage.removeItem(KEY_STORE);
      localStorage.removeItem(KEY_STORE);
      if (key) (remember ? localStorage : sessionStorage).setItem(KEY_STORE, key);
    } catch (e) { /* storage blocked: the key lasts until the page closes */ }
  }

  function keyInUse() {
    return settings.mode === "researcher" ? userKey : "";
  }

  function renderKey(note) {
    $("#keyEntry").hidden = Boolean(userKey);
    $("#keyOn").hidden = !userKey;
    $("#keyText").textContent = userKey ? `✓ Using your key …${userKey.slice(-4)}` : "";
    if (userKey) {
      try { $("#keyRemember").checked = Boolean(localStorage.getItem(KEY_STORE)); } catch (e) { /* storage blocked */ }
    }
    $("#keyNote").textContent = note || KEY_NOTE;
    renderAIStatus();
  }

  async function useKey() {
    const key = $("#keyInput").value.trim();
    if (!/^sk-ant-\S{20,}$/.test(key)) return renderKey("That doesn't look like an Anthropic API key. It starts with sk-ant-.");
    $("#keyUse").disabled = true;
    $("#keyNote").textContent = "Checking your key…";
    const r = await post("/api/check-key", {}, 15000, key);
    $("#keyUse").disabled = false;
    if (!r || !r.ok) {
      return renderKey(r && r.error === "bad_key" ? "That key didn't work. Check it in the Claude Console and try again."
        : "Couldn't check the key right now. Please try again.");
    }
    userKey = key;
    saveKey(key, $("#keyRemember").checked);
    $("#keyInput").value = "";
    renderKey("✓ Your key works. New research maps, layers and questions now use it.");
  }

  function removeKey() {
    userKey = "";
    saveKey("");
    renderKey();
  }

  // A request with your key failed: say why, once per kind of problem.
  const keyWarned = new Set();
  function keyProblem(code) {
    if (!keyInUse() || !["bad_key", "no_credit"].includes(code) || keyWarned.has(code)) return;
    keyWarned.add(code);
    toast(KEY_ERRORS[code]);
  }
  const KEY_ERRORS = {
    bad_key: "Your API key didn't work. Check it in ⚙ Settings.",
    no_credit: "Your API account is out of credit. Top it up in the Claude Console, or remove your key in ⚙ Settings."
  };

  $("#keyUse").addEventListener("click", useKey);
  $("#keyInput").addEventListener("keydown", (e) => { if (e.key === "Enter") useKey(); });
  $("#keyRemove").addEventListener("click", removeKey);
  $("#keyRemember").addEventListener("change", (e) => { if (userKey) saveKey(userKey, e.target.checked); });
  renderKey();

  async function askAI(text) {
    const data = mapData();
    const nodes = graph.nodes().filter((n) => n.state !== "hidden")
      .map((n) => ({ id: n.id, label: n.d.label, kind: n.kind, state: n.state }));
    const root = graph.nodes().find((n) => n.isRoot);
    return post("/api/ask", {
      mode: settings.mode,
      question: text,
      topic: data.topic || data.title,
      title: data.title,
      age: data.profile && data.profile.age,
      profile: settings.mode === "kids" ? undefined : data.profile,
      rootId: root && root.id,
      nodes
    }, 25000);
  }


  checkAI();

  askInput.addEventListener("input", () => { askGo.disabled = askInput.value.trim().length < 3; });
  askInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!askGo.disabled) submitAsk();
    }
  });
  askGo.addEventListener("click", submitAsk);
  $("#askerClose").addEventListener("click", closeAsker);
  $("#askBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    if (asker.hidden) openAsker();
    else closeAsker();
  });
  $("#canBtn").addEventListener("click", () => {
    if (asker.hidden) openAsker();
    else closeAsker();
  });

  // Voice input via the browser's speech recognition (Chrome, Edge, Safari). Hidden where unsupported.
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer = null;
  if (Speech) micBtn.hidden = false;

  function stopMic() {
    if (!recognizer) return;
    try {
      recognizer.stop();
    } catch (e) { /* already stopped */ }
  }

  micBtn.addEventListener("click", () => {
    if (recognizer) return stopMic();
    try {
      recognizer = new Speech();
      recognizer.lang = "en-US";
      recognizer.interimResults = true;
      recognizer.onresult = (e) => {
        askInput.value = Array.from(e.results).map((r) => r[0].transcript).join("");
        askInput.dispatchEvent(new Event("input"));
      };
      recognizer.onerror = (e) => {
        askNote(e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "🎤 The microphone isn't allowed here. You can type instead!"
          : "🎤 Didn't catch that. Try again, or type it!");
      };
      recognizer.onend = () => {
        recognizer = null;
        micBtn.classList.remove("on");
        if ($("#askNote").textContent.startsWith("🎤 Listening")) askNote("");
      };
      recognizer.start();
      micBtn.classList.add("on");
      askNote("🎤 Listening…");
    } catch (e) {
      recognizer = null;
      askNote("🎤 Voice isn't available here. You can type instead!");
    }
  });

  function stopTour() {
    if (!touring) return;
    touring = false;
    updateTourBtn();
  }

  function updateTourBtn() {
    $("#tourBtn").classList.toggle("on", touring);
    $("#tourIco").textContent = touring ? "■" : "▶";
    $("#tourTxt").textContent = touring ? "Stop" : "Tour";
  }

  // ---------- settings UI ----------
  function syncSettingsUI() {
    document.querySelectorAll("#modeSeg button").forEach((b) => b.classList.toggle("on", b.dataset.mode === settings.mode));
    document.querySelectorAll("#kidsSeg button").forEach((b) => b.classList.toggle("on", b.dataset.kids === settings.kidsStyle));
    $("#themeSel").value = settings.theme;
    $("#speedSel").value = settings.speed;
    $("#zoomChk").checked = settings.zoomClick;
    $("#autoFitChk").checked = settings.autoFit;
  }

  function closeSettings() {
    $("#settings").hidden = true;
    $("#settingsBtn").setAttribute("aria-expanded", "false");
  }

  $("#settingsBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const s = $("#settings");
    s.hidden = !s.hidden;
    $("#settingsBtn").setAttribute("aria-expanded", String(!s.hidden));
  });
  $("#settings").addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", closeSettings);

  function setMode(mode) {
    if (settings.mode === mode) return;
    endVisit();
    settings.mode = mode;
    applyLook();
    renderAIStatus();
    loadMode();
  }

  document.querySelectorAll("#modeSeg button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

  // ---------- your own map: the intake, then the AI builds it ----------
  const BUILD_STEPS = {
    kids: ["🌱 Planting the seed…", "💧 Watering…", "🌿 Growing the first buds…"],
    researcher: ["Reading about you…", "Finding the strengths you bring…", "Choosing the few questions that matter most…", "Charting your path…"]
  };

  // The opening scene: a seed or bud (kids) / people on Earth looking up (researcher).
  // Clicking it zooms in, and each intake answer then grows the plant or sends the ship to a new star.
  const scene = ExplorerScene.create($("#scene"));

  // Without startAt: the opening picture (sky = research extension, land = interest exploration).
  // intro: play the stars-to-Earth zoom first (on page load).
  function openExplore(startAt, intro) {
    endVisit();
    plantIn = null;
    stopTour();
    closePanel();
    closeAsker();
    closeFert();
    closeSettings();
    closeIntro();
    scene.hide();
    $("#explore").classList.remove("journey");
    $("#building").hidden = true;
    $("#exploreCard").hidden = false;
    openIntake(startAt);
    if (startAt) $("#explore").hidden = false;
    else {
      $("#explore").hidden = true;
      scene.choose({ intro, onPick: openIntro });
    }
  }

  function openIntake(startAt) {
    ExplorerIntake.open({
      mode: settings.mode,
      kidsStyle: settings.kidsStyle,
      aiOn: aiReady,
      recheck: checkAI,
      startAt,
      onMode: setMode,
      onWho: startJourney,
      onStep: (i, name, items) => scene.setProgress(items),
      onWorld: (style) => {
        settings.kidsStyle = style;
        applyLook();
        scene.setWorld(style);
      },
      onClose: closeExplore,
      onRestart: () => openExplore(),
      onSample: () => {
        custom = null;
        closeExplore();
        loadMode();
        toast("This is a sample map. Tap 🧭 New topic to make your own.");
      },
      onSubmit: buildMap
    });
  }

  // After "who's exploring": hide the card, show the opening picture, wait for the click.
  function startJourney(mode) {
    $("#explore").hidden = true;
    scene.show(mode, settings.kidsStyle, () => {
      $("#explore").classList.add("journey");
      $("#explore").hidden = false;
      ExplorerIntake.resume(mode === "kids" ? "age" : "level");
    }, mode === "kids" ? () => groups.open() : null);
  }

  // ---------- the side panel of the opening picture: what each side is, samples, start ----------
  const INTRO = {
    researcher: {
      icon: "🔭", title: "Research extension",
      lead: "Find your strengths. Moving into a new field, or starting a collaboration? Miror starts from what you already know, shows the strengths you bring, and maps the few questions that matter most for you.",
      points: [
        ["🧭", "<b>Your path</b>: what to focus on first, what to skip, and which strengths will help most"],
        ["✦", "<b>Your strengths</b> light up as gold stars, with bridges from what you already know"],
        ["🌌", "<b>Principles and applications</b> first, then deeper layers and open frontiers as you answer"],
        ["📎", "Add your <b>papers or notes</b> (optional), and ask your own questions any time"]
      ],
      samples: [["🔬", DATA.researcher.title, "Sample map · an experimentalist moving into simulation", "sample"]],
      start: "✦ Build my research map"
    },
    kids: {
      icon: "🌼", title: "Interest exploration",
      lead: "Interest first. For curious minds aged 5–12, and 12+ too: start from what you love and wonder about, and grow a garden of questions that's all yours.",
      points: [
        ["💡", "<b>Imagine</b> moments from everyday life, and a quick fun check for every question"],
        ["✨", "<b>Fun-fact fertilizer</b>: surprise facts about the things you love"],
        ["💧", "<b>Ask your own</b> questions with the watering can, by typing or talking"],
        ["🏡", "<b>Our land</b>: share gardens with your family, friends or class"]
      ],
      samples: [
        ["✈️", "How do planes fly?", "A sample tree to explore", "sample", "tree"],
        ["🐝", "How do bees make honey?", "Bea's flower garden", "bees", "flowers"],
        ["🏡", "Our land", "Everyone's gardens: start one for your class or family", "land", "land"]
      ],
      start: "🌱 Plant my seed"
    }
  };

  function openIntro(mode) {
    const t = INTRO[mode];
    const box = $("#intro");
    box.className = `intro ${mode}`;
    const head = `<div class="intro-icon">${t.icon}</div>
      <h2 id="introTitle">${t.title}</h2>
      <p class="intro-lead">${t.lead}</p>`;
    const points = `<ul class="intro-points">${t.points.map(([i, p]) => `<li><span>${i}</span><p>${p}</p></li>`).join("")}</ul>`;
    const start = `<button type="button" class="intro-start" data-intro="start">${t.start} →</button>`;
    // Interest samples are pictures to tap, shown first; research keeps one sample card under the start button.
    $("#introBody").innerHTML = mode === "kids"
      ? `${head}<h3>Tap a garden to peek inside</h3>
        <div class="intro-pics">${t.samples.map(([i, title, sub, act, art]) => `<button type="button" class="intro-pic${art === "land" ? " wide" : ""}" data-intro="${act}" aria-label="${esc(title)}: ${esc(sub)}">
          ${pictureOf(art)}<span class="intro-pic-cap"><b>${i} ${esc(title)}</b><small>${esc(sub)}</small></span></button>`).join("")}</div>
        <div class="intro-gap"></div>${start}<h3>What you can do</h3>${points}`
      : `${head}${points}${start}<h3>Or look around a sample</h3>
        <div class="intro-samples">${t.samples.map(([i, title, sub, act]) => `<button type="button" class="intro-sample" data-intro="${act}">
          <span class="intro-sample-icon">${i}</span><span><b>${esc(title)}</b><small>${esc(sub)}</small></span></button>`).join("")}</div>`;
    box.hidden = false;
    box.querySelectorAll("[data-intro]").forEach((b) => b.addEventListener("click", () => introAction(mode, b.dataset.intro)));
    box.scrollTop = 0;
    box.querySelector(mode === "kids" ? ".intro-pic" : ".intro-start").focus({ preventScroll: true });
  }

  function closeIntro() {
    $("#intro").hidden = true;
  }

  // Little pictures for the interest-mode samples: a fruit tree, a flower field, a land of gardens.
  function pictureOf(kind) {
    const w = kind === "land" ? 420 : 200;
    const flowerAt = (x, y, c, k = 1) => `<g class="pic-sway" style="animation-delay:${(-x % 7) / 3}s"><g transform="translate(${x},${y}) scale(${k})">
      <path d="M0,0 C-2,-8 2,-14 0,-22" stroke="#2f7d3a" stroke-width="2.5" fill="none"/>
      ${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(Math.sin((a * Math.PI) / 180) * 6).toFixed(1)}" cy="${(-26 - Math.cos((a * Math.PI) / 180) * 6).toFixed(1)}" r="5.5" fill="${c}"/>`).join("")}
      <circle cx="0" cy="-26" r="4" fill="#ffd447" stroke="#f0a500"/></g></g>`;
    const treeAt = (x, y, k = 1) => `<g class="pic-sway"><g transform="translate(${x},${y}) scale(${k})">
      <path d="M-6,0 L-3,-56 Q0,-60 3,-56 L6,0Z" fill="#8a5a2b"/>
      <circle cx="-20" cy="-60" r="22" fill="#3f9a4f"/><circle cx="22" cy="-62" r="23" fill="#3f9a4f"/>
      <circle cx="0" cy="-82" r="26" fill="#2f8a42"/><circle cx="0" cy="-56" r="24" fill="#57b25f"/>
      <circle cx="-14" cy="-66" r="5" fill="#ff6b6b"/><circle cx="14" cy="-78" r="5" fill="#ff6b6b"/>
      <circle cx="18" cy="-54" r="5" fill="#ff6b6b"/><circle cx="-6" cy="-48" r="5" fill="#ffd447"/></g></g>`;
    let art = `<rect width="${w}" height="130" fill="#d7f0ff"/><ellipse cx="${w / 2}" cy="168" rx="${w * 0.75}" ry="62" fill="#6cc070"/>`;
    if (kind === "tree") {
      art += `<text class="pic-fly" x="26" y="36" font-size="22">✈️</text>${treeAt(100, 118)}<text x="152" y="116" font-size="20">🦉</text>`;
    } else if (kind === "flowers") {
      const colors = ["#ff6fa3", "#ffd447", "#9d6bff", "#ffffff", "#ff8c42"];
      [[30, 120], [58, 112], [86, 122], [112, 110], [140, 121], [166, 113], [44, 128], [128, 128], [182, 126]]
        .forEach(([x, y], i) => { art += flowerAt(x, y, colors[i % 5], 1.1); });
      art += `<text class="pic-bee" x="120" y="44" font-size="22">🐝</text>`;
    } else {
      art += `<text x="22" y="104" font-size="44">🏡</text>`;
      [[150, 118], [250, 120], [350, 118]].forEach(([x, y]) => { art += `<ellipse cx="${x}" cy="${y + 2}" rx="38" ry="8" fill="#8a5a33" opacity="0.55"/>`; });
      art += treeAt(150, 118, 0.85);
      [[228, 120, "#ff6fa3"], [244, 116, "#ffd447"], [260, 121, "#9d6bff"], [276, 117, "#ff8c42"]].forEach(([x, y, c]) => { art += flowerAt(x, y, c, 1); });
      art += `<text x="336" y="118" font-size="26">🌱</text><text class="pic-fly" x="380" y="40" font-size="20">🦋</text>`;
    }
    return `<svg viewBox="0 0 ${w} 130" aria-hidden="true">${art}</svg>`;
  }

  function introAction(mode, act) {
    closeIntro();
    if (act === "land") {
      if (settings.mode !== "kids") setMode("kids");
      return groups.open();
    }
    closeExplore();
    if (settings.mode !== mode) setMode(mode);
    if (act === "start") {
      openIntake();
      startJourney(mode);
      scene.begin();
    } else if (act === "bees") {
      visitGarden(DATA.landSamples[1]);
    } else {
      custom = null;
      // The interest sample is shown as a fruit tree in the panel, so open it as one.
      if (mode === "kids" && settings.kidsStyle !== "tree") {
        settings.kidsStyle = "tree";
        applyLook();
      }
      loadMode();
      toast(mode === "kids" ? "This is a sample garden. Tap 🧭 New topic to plant your own." : "This is a sample map. Use 🧭 New topic to make your own.");
    }
  }

  $("#introClose").addEventListener("click", closeIntro);

  function closeExplore() {
    closeIntro();
    $("#explore").hidden = true;
    $("#explore").classList.remove("journey");
    scene.hide();
  }

  async function buildMap(input) {
    const kids = input.mode === "kids";
    $("#exploreCard").hidden = true;
    $("#building").hidden = false;
    if (scene.isOn()) scene.building(input.items || []);
    const steps = BUILD_STEPS[input.mode];
    let i = 0;
    $("#buildText").textContent = steps[0];
    const ticker = setInterval(() => { $("#buildText").textContent = steps[Math.min(++i, steps.length - 1)]; }, 3500);
    const r = await post("/api/map", input, (input.files || []).length ? 120000 : 60000);
    clearInterval(ticker);
    $("#building").hidden = true;
    $("#exploreCard").hidden = false;
    if (!r || !r.dataset) {
      scene.stopBuilding();
      if (r && r.safe === false) return { error: kids ? "🙈 Let's pick a different topic!" : "Miror can't build a map for that topic." };
      if (r && r.error === "too_large") return { error: "The files are too large. Please keep them under 10 MB in total." };
      if (r && keyInUse() && KEY_ERRORS[r.error]) return { error: KEY_ERRORS[r.error] };
      return { error: "Couldn't build the map this time. Please try again." };
    }
    custom = r.dataset;
    const landCode = plantIn;
    plantIn = null;
    // Load the real map behind the scene, then zoom into its start (the bud, or Earth) and fade.
    $("#explore").hidden = true;
    loadMode();
    if (landCode) plantedInLand(landCode);
    if (scene.isOn()) await scene.finish();
    closeExplore();
    if (kids) {
      toast(settings.kidsStyle === "tree" ? "🌱 Your tree is planted!" : "🌱 Your garden is planted!");
    } else {
      toast("✦ Your map is ready");
      // Start with "Your path": the strategy is the point, not the amount of information.
      const you = graph.nodes().find((n) => n.kind === "you");
      if (you) setTimeout(() => openPanel(you), 700);
    }
    return null;
  }

  $("#exploreBtn").addEventListener("click", () => openExplore());
  $("#sampleBtn").addEventListener("click", () => {
    endVisit();
    custom = null;
    closeSettings();
    loadMode();
  });
  document.querySelectorAll("#kidsSeg button").forEach((b) => b.addEventListener("click", () => {
    if (settings.kidsStyle === b.dataset.kids) return;
    settings.kidsStyle = b.dataset.kids;
    applyLook();
    if (settings.mode === "kids") loadMode();
  }));
  $("#zoomChk").addEventListener("change", (e) => {
    settings.zoomClick = e.target.checked;
    applyLook();
  });
  $("#themeSel").addEventListener("change", (e) => {
    settings.theme = e.target.value;
    applyLook();
  });
  $("#speedSel").addEventListener("change", (e) => {
    settings.speed = e.target.value;
    applyLook();
  });
  $("#autoFitChk").addEventListener("change", (e) => {
    settings.autoFit = e.target.checked;
    applyLook();
  });
  $("#resetBtn").addEventListener("click", () => {
    closeSettings();
    loadMode();
  });

  $("#panelClose").addEventListener("click", closePanel);
  $("#fitBtn").addEventListener("click", () => graph.fit(800));
  $("#tourBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    if (touring) stopTour();
    else runTour();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    if (!$("#intro").hidden) return closeIntro();
    stopTour();
    closeExplore();
    closeSettings();
    closeAsker();
    closeFert();
    closePanel();
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      graph.setInsets(insets());
      graph.fit(400);
    }, 150);
  });

  // ---------- start ----------
  applyLook();
  loadMode();

  const preLight = params.get("light");
  if (preLight) graph.lightInstant(preLight === "all" ? "all" : preLight.split(","));
  const preOpen = params.get("open") && graph.node(params.get("open"));
  if (preOpen) openPanel(preOpen);
  if (params.get("tour") === "1") setTimeout(runTour, 1200);
  // First visit opens the intake; URL set-ups for recording (light/open/tour/sample) go straight to a sample map.
  const sampleShot = ["light", "open", "tour", "sample"].some((k) => params.has(k));
  if (params.get("explore") === "1" || !sampleShot) openExplore(undefined, true);
})();
