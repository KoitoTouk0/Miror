/* Miror intake: a few short steps that make the map personal.
 *
 * Researchers: who → level → general expertise → skills & hobbies → topic → materials
 * Kids:        who → age → things you love → topic
 *
 * The answers (and any attached files) go to the AI, which turns them into a map that starts
 * from the person's own strengths. Usage:
 *   ExplorerIntake.open({ mode, kidsStyle, aiOn, recheck, onMode, onWorld, onClose, onSample, onSubmit })
 * recheck() resolves whether the AI is on now; the final button calls it if the AI was off.
 * onSubmit(payload) returns a promise; reject or resolve { error } to show a message.
 */
(function () {
  "use strict";

  // 10 MB when running locally; hosted functions (e.g. Netlify) accept ~6 MB per request, so ~4 MB of files.
  const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
  const MAX_TOTAL_BYTES = (LOCAL ? 10 : 4) * 1024 * 1024;
  const LIMIT_TEXT = LOCAL ? "10 MB" : "4 MB";
  const MAX_FILES = 5;

  const OPTIONS = {
    level: ["High school", "Undergraduate", "Master's student", "PhD student", "Postdoc", "Faculty / PI", "Industry professional", "Self-learner"],
    fields: ["Engineering", "Physics", "Chemistry", "Materials science", "Life sciences", "Medicine & health",
      "Computer science", "Mathematics & statistics", "Earth & environment", "Arts & design", "Humanities",
      "Social sciences", "Business & economics", "Education"],
    skills: ["💻 Coding", "📊 Data analysis", "🧪 Lab work", "✍️ Writing", "🎤 Teaching", "🎨 Drawing", "🎵 Music",
      "⚽ Sports", "🍰 Baking & cooking", "🌱 Gardening", "🎮 Gaming", "📷 Photography", "🔧 Building & DIY", "♟️ Strategy games"],
    knownLevel: ["Nothing yet", "A little", "A fair amount"],
    purpose: ["🤝 Collaboration", "🧭 My own exploration", "💼 Work or a project", "✨ Pure interest"],
    spark: ["📄 A paper", "📋 A project or proposal", "💬 A conversation", "📰 News", "🎓 A course"],
    loves: ["🐶 Animals", "🚀 Space", "⚽ Sports", "🎨 Drawing", "🎵 Music", "🍪 Baking", "🧱 Building", "🌳 Nature",
      "🚂 Trains & cars", "🎮 Games", "📚 Stories", "🔬 Experiments"],
    ages: ["5", "6", "7", "8", "9", "10", "11", "12", "12+"],
    researchTopics: ["Machine learning interatomic potentials", "Single-cell RNA sequencing", "Protein structure prediction", "Battery degradation"],
    kidTopics: ["🌋 Volcanoes", "🌈 Rainbows", "🦕 Dinosaurs", "🧲 Magnets", "🌙 The Moon", "🐝 Bees"]
  };

  const STEPS = {
    researcher: ["who", "level", "fields", "skills", "topic", "materials"],
    kids: ["who", "age", "loves", "topic"]
  };

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plain = (s) => String(s).replace(/^\p{Extended_Pictographic}️?\s*/u, "");
  const sizeText = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

  // Answers live for the whole session, so reopening the intake keeps what you typed.
  const a = {
    mode: "researcher", level: "", fields: [], fieldOther: "", expertise: "", skills: [], skillOther: "",
    topic: "", knownLevel: "", knownText: "", purpose: [], spark: "", notes: "", files: [],
    age: "8", loves: [], world: "garden"
  };
  let opts = {};
  let step = 0;
  let busy = false;

  const card = () => document.getElementById("exploreCard");
  // opts.aiOn may be a function, so a late "AI is available" answer still counts.
  const aiReady = () => (typeof opts.aiOn === "function" ? opts.aiOn() : opts.aiOn);
  const HOSTED = !LOCAL && location.protocol !== "file:";
  const offlineText = () => (HOSTED ? "The AI isn't reachable right now. Please try again in a moment."
    : a.mode === "kids" ? "The map-maker is asleep 😴 Ask a grown-up to double-click “Start Miror” in the project folder, then tap again."
    : "Your map needs the AI server. Double-click “Start Miror.command” in the project folder (or run npm start), then press again.");
  const steps = () => STEPS[a.mode];

  function open(o) {
    opts = o;
    a.mode = o.mode || a.mode;
    a.world = o.kidsStyle || a.world;
    step = o.startAt === "topic" ? steps().indexOf("topic") : 0;
    busy = false;
    render();
  }

  // ---------- small building blocks ----------
  function choices(key, list, multi, extraClass) {
    const on = (v) => (multi ? a[key].includes(v) : a[key] === v);
    return `<div class="choices ${extraClass || ""}" data-key="${key}" data-multi="${multi ? 1 : 0}">${list
      .map((v) => `<button type="button" class="choice${on(v) ? " on" : ""}" data-val="${esc(v)}" aria-pressed="${on(v)}">${esc(v)}</button>`)
      .join("")}</div>`;
  }

  const field = (key, label, placeholder, multiline) => `<label class="set-label" for="in-${key}">${label}</label>${multiline
    ? `<textarea id="in-${key}" data-field="${key}" rows="3" maxlength="${key === "notes" ? 4000 : 600}" placeholder="${esc(placeholder)}">${esc(a[key])}</textarea>`
    : `<input type="text" id="in-${key}" data-field="${key}" maxlength="160" autocomplete="off" placeholder="${esc(placeholder)}" value="${esc(a[key])}">`}`;

  function filesHTML() {
    const total = a.files.reduce((s, f) => s + f.size, 0);
    return `<ul class="file-list">${a.files.map((f, i) => `<li><span>📄 ${esc(f.name)}</span><span class="muted">${sizeText(f.size)}</span>
      <button type="button" class="file-x" data-remove="${i}" aria-label="Remove ${esc(f.name)}">×</button></li>`).join("")}</ul>
      <p class="muted file-total">${a.files.length ? `${sizeText(total)} of ${LIMIT_TEXT} used` : `PDF, TXT or Markdown · up to 5 files · ${LIMIT_TEXT} in total`}</p>`;
  }

  // ---------- the steps ----------
  const VIEWS = {
    who: () => ({
      badge: "Welcome to Miror",
      title: "Who's exploring today?",
      sub: "Information is everywhere now. What matters is a path through it that starts from what you already have. Tell Miror a little about yourself, and it maps the few questions that matter most for you.",
      body: `<div class="who-cards">
          <button type="button" class="who-card${a.mode === "researcher" ? " on" : ""}" data-mode="researcher">
            <span class="who-ico">🔭</span><b>Researcher or learner</b><span>Move into a new field, starting from your own strengths</span></button>
          <button type="button" class="who-card${a.mode === "kids" ? " on" : ""}" data-mode="kids">
            <span class="who-ico">🌼</span><b>Young explorer</b><span>Ages 5–12: follow your curiosity and grow a garden of questions</span></button>
        </div>
        <button type="button" class="link-btn" data-act="sample">Or look around a sample map first</button>`,
      next: "Let's start →",
      valid: () => true
    }),

    level: () => ({
      badge: "About you · 1 of 5",
      title: "Where are you right now?",
      sub: "This sets the depth: Miror won't explain what you already know.",
      body: choices("level", OPTIONS.level, false),
      valid: () => (a.level ? true : "Pick the one that fits best.")
    }),

    fields: () => ({
      badge: "About you · 2 of 5",
      title: "What's your general expertise?",
      sub: "Pick as many as you like. These are the strengths new questions will build on.",
      body: choices("fields", OPTIONS.fields, true) +
        field("fieldOther", "Something else?", "e.g. Architecture") +
        field("expertise", "Your specific expertise <span class=\"muted\">(optional, but it sharpens the map)</span>", "e.g. thin-film XRD, Bayesian hierarchical models, UX research"),
      valid: () => (a.fields.length || a.fieldOther.trim() || a.expertise.trim()) ? true : "Pick at least one area, or type your own."
    }),

    skills: () => ({
      badge: "About you · 3 of 5",
      title: "Skills and hobbies",
      sub: "Hobbies count too: a baker already knows a lot about chemistry and timing. Miror uses them for analogies.",
      body: choices("skills", OPTIONS.skills, true) + field("skillOther", "Anything else you're good at or love doing?", "e.g. rock climbing, chess, knitting"),
      valid: () => true
    }),

    topic: () => (a.mode === "kids" ? {
      badge: "Last step!",
      title: "What are you curious about?",
      sub: "Anything at all! Miror grows your own map of questions about it.",
      body: field("topic", "I want to find out about…", "e.g. volcanoes") +
        `<div class="idea-chips">${OPTIONS.kidTopics.map((t) => `<button type="button" class="chip" data-topic="${esc(t)}">${esc(t)}</button>`).join("")}</div>
        <span class="set-label">Grow it as a…</span>
        <div class="choices" data-key="world" data-multi="0">
          <button type="button" class="choice${a.world === "garden" ? " on" : ""}" data-val="garden">🌼 Flower garden</button>
          <button type="button" class="choice${a.world === "tree" ? " on" : ""}" data-val="tree">🌳 Growing tree</button>
        </div>`,
      next: "🌱 Grow my map!",
      final: true,
      valid: () => (a.topic.trim().length >= 3 ? true : "Tell Miror what you're curious about.")
    } : {
      badge: "Your topic · 4 of 5",
      title: "What do you want to explore?",
      sub: "A field, a method, a collaborator's area, a skill: anything you want to understand.",
      body: field("topic", "Topic", "e.g. machine learning interatomic potentials") +
        `<div class="idea-chips">${OPTIONS.researchTopics.map((t) => `<button type="button" class="chip" data-topic="${esc(t)}">${esc(t)}</button>`).join("")}</div>
        <span class="set-label">How much do you know about it already?</span>${choices("knownLevel", OPTIONS.knownLevel, false)}` +
        field("knownText", "What you already know or think about it <span class=\"muted\">(optional)</span>", "e.g. I've read two papers and know it's used to speed up MD, but not how training works.", true) +
        `<span class="set-label">Why? <span class="muted">(pick any)</span></span>${choices("purpose", OPTIONS.purpose, true)}
        <span class="set-label">What sparked it? <span class="muted">(optional)</span></span>${choices("spark", OPTIONS.spark, false)}`,
      valid: () => (a.topic.trim().length >= 3 ? true : "Tell Miror which topic to map.")
    }),

    materials: () => ({
      badge: "Your materials · 5 of 5",
      title: "Anything to start from?",
      sub: "Optional. Add papers or notes about the topic (a collaborator's paper, a proposal, lecture notes). Miror reads them and points you to what matters most for you.",
      body: `<label class="drop" for="in-files" tabindex="0">
          <input type="file" id="in-files" multiple accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" hidden>
          <span class="drop-ico">📎</span><b>Drop files here or click to choose</b>
        </label>
        <div id="fileArea">${filesHTML()}</div>` +
        field("notes", "Or paste text <span class=\"muted\">(abstracts, notes, a collaborator's bio…)</span>", "Paste anything useful here", true),
      next: "✦ Build my map",
      final: true,
      valid: () => true
    }),

    age: () => ({
      badge: "Hello, explorer! · 1 of 3",
      title: "How old are you?",
      sub: "So Miror can talk just right for you.",
      body: choices("age", OPTIONS.ages, false, "big"),
      valid: () => true
    }),

    loves: () => ({
      badge: "About you · 2 of 3",
      title: "What do you love?",
      sub: "Pick as many as you like! Miror uses them to explain things in ways you'll enjoy.",
      body: choices("loves", OPTIONS.loves, true, "big"),
      valid: () => true
    })
  };

  // ---------- render & behaviour ----------
  function render() {
    const name = steps()[step];
    const v = VIEWS[name]();
    const kids = a.mode === "kids";
    const dots = steps().map((s, i) => `<i class="${i === step ? "on" : i < step ? "done" : ""}"></i>`).join("");
    const aiNote = v.final && !aiReady() ? offlineText() : "";
    card().innerHTML = `
      <button type="button" class="close" data-act="close" aria-label="Close">×</button>
      <div class="step-dots" aria-hidden="true">${dots}</div>
      <div class="badge" style="--c: var(--accent)">${esc(v.badge)}</div>
      <h2 id="exploreTitle">${esc(v.title)}</h2>
      <p class="explore-sub">${esc(v.sub)}</p>
      <div class="step-body">${v.body}</div>
      <p class="asker-note" id="intakeNote" aria-live="polite">${esc(aiNote)}</p>
      <div class="step-nav">
        ${step > 0 ? `<button type="button" class="ghost" data-act="back">← Back</button>` : "<span></span>"}
        <button type="button" class="primary" data-act="next">${esc(v.next || (kids ? "Next →" : "Next →"))}</button>
      </div>`;
    bind(v);
    if (opts.onStep) opts.onStep(step, name, items(step));
    const first = card().querySelector("input[type=text], textarea");
    if (first && name !== "materials") first.focus({ preventScroll: true });
    card().scrollTop = 0;
  }

  function note(text) {
    const el = document.getElementById("intakeNote");
    if (el) el.textContent = text;
  }

  function bind(v) {
    const c = card();
    c.querySelectorAll(".choices").forEach((group) => {
      const key = group.dataset.key, multi = group.dataset.multi === "1";
      group.querySelectorAll(".choice").forEach((btn) => btn.addEventListener("click", () => {
        const val = btn.dataset.val;
        if (multi) {
          a[key] = a[key].includes(val) ? a[key].filter((x) => x !== val) : a[key].concat(val);
        } else {
          a[key] = a[key] === val && key !== "age" && key !== "world" ? "" : val;
        }
        group.querySelectorAll(".choice").forEach((b) => {
          const on = multi ? a[key].includes(b.dataset.val) : a[key] === b.dataset.val;
          b.classList.toggle("on", on);
          b.setAttribute("aria-pressed", String(on));
        });
        if (key === "world" && opts.onWorld) opts.onWorld(a.world);
        note("");
      }));
    });
    c.querySelectorAll("[data-field]").forEach((inp) => inp.addEventListener("input", () => {
      a[inp.dataset.field] = inp.value;
      note("");
    }));
    c.querySelectorAll("[data-topic]").forEach((chip) => chip.addEventListener("click", () => {
      a.topic = plain(chip.dataset.topic);
      const t = c.querySelector('[data-field="topic"]');
      t.value = a.topic;
      t.focus();
    }));
    c.querySelectorAll(".who-card").forEach((w) => w.addEventListener("click", () => {
      a.mode = w.dataset.mode;
      if (opts.onMode) opts.onMode(a.mode);
      // The app shows the opening scene first, then calls resume() when it's clicked.
      if (opts.onWho) return opts.onWho(a.mode);
      step = 1;
      render();
    }));
    c.querySelector('[data-act="close"]').addEventListener("click", () => opts.onClose && opts.onClose());
    const sample = c.querySelector('[data-act="sample"]');
    if (sample) sample.addEventListener("click", () => opts.onSample && opts.onSample());
    const back = c.querySelector('[data-act="back"]');
    // Back from the first real step returns to the opening picture (the app's chooser), not the old card.
    if (back) back.addEventListener("click", () => {
      if (step === 1 && opts.onRestart) return opts.onRestart();
      step = Math.max(0, step - 1);
      render();
    });
    c.querySelector('[data-act="next"]').addEventListener("click", () => advance(v));
    c.querySelectorAll('input[type="text"]').forEach((inp) => inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        advance(v);
      }
    }));

    // Files: drop or pick; read as base64, enforce type, count and the 10 MB total.
    const drop = c.querySelector(".drop");
    if (drop) {
      const input = c.querySelector("#in-files");
      input.addEventListener("change", () => addFiles(input.files));
      drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
      drop.addEventListener("dragleave", () => drop.classList.remove("over"));
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("over");
        addFiles(e.dataTransfer.files);
      });
      drop.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          input.click();
        }
      });
      bindFileList();
    }
  }

  function bindFileList() {
    card().querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => {
      a.files.splice(Number(b.dataset.remove), 1);
      document.getElementById("fileArea").innerHTML = filesHTML();
      bindFileList();
    }));
  }

  function readBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  async function addFiles(list) {
    const problems = [];
    for (const f of Array.from(list)) {
      const used = a.files.reduce((s, x) => s + x.size, 0);
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      if (a.files.length >= MAX_FILES) { problems.push(`Up to ${MAX_FILES} files.`); break; }
      if (!["pdf", "txt", "md"].includes(ext)) { problems.push(`${f.name}: only PDF, TXT or Markdown files.`); continue; }
      if (used + f.size > MAX_TOTAL_BYTES) { problems.push(`${f.name} would go over the ${LIMIT_TEXT} total.`); continue; }
      if (a.files.some((x) => x.name === f.name && x.size === f.size)) continue;
      try {
        const type = ext === "pdf" ? "application/pdf" : ext === "md" ? "text/markdown" : "text/plain";
        a.files.push({ name: f.name, size: f.size, type, data: await readBase64(f) });
      } catch (e) {
        problems.push(`${f.name} couldn't be read.`);
      }
    }
    document.getElementById("fileArea").innerHTML = filesHTML();
    bindFileList();
    note(problems.join(" "));
  }

  async function advance(v) {
    if (busy) return;
    const ok = v.valid();
    if (ok !== true) return note(ok);
    if (steps()[step] === "who" && opts.onWho) return opts.onWho(a.mode);
    if (!v.final) {
      step++;
      return render();
    }
    busy = true;
    const btn = card().querySelector('[data-act="next"]');
    btn.disabled = true;
    try {
      // The AI may have come up since this step opened (e.g. the server was just started).
      if (!aiReady() && !(opts.recheck && await opts.recheck())) return note(offlineText());
      note("");
      const result = await opts.onSubmit(payload());
      if (result && result.error) note(result.error);
    } finally {
      busy = false;
      if (btn.isConnected) btn.disabled = false;
    }
  }

  // What each answered step looks like in the scene: a star label (researcher) or a part of the plant (kids).
  function itemOf(key) {
    const more = (l, n) => l.slice(0, n).join(" · ") + (l.length > n ? ` +${l.length - n}` : "");
    const extra = (x) => (x.trim() ? [x.trim()] : []);
    if (key === "level") return a.level ? { key, label: a.level } : null;
    if (key === "fields") {
      const l = a.fields.concat(extra(a.fieldOther));
      const label = l.length ? more(l, 2) : a.expertise.trim();
      return label ? { key, label } : null;
    }
    if (key === "skills") {
      const l = a.skills.map(plain).concat(extra(a.skillOther));
      return l.length ? { key, label: more(l, 3) } : null;
    }
    if (key === "topic") return a.topic.trim() ? { key, label: a.topic.trim() } : null;
    if (key === "materials") {
      if (a.files.length) return { key, label: `📎 ${a.files.length} file${a.files.length > 1 ? "s" : ""}${a.notes.trim() ? " + notes" : ""}` };
      return a.notes.trim() ? { key, label: "📝 Your notes" } : null;
    }
    if (key === "age") return { key, label: a.age === "12+" ? "12 or older" : `${a.age} years old` };
    if (key === "loves") return { key, label: "", parts: a.loves.map((l) => (l.match(/^\p{Extended_Pictographic}\uFE0F?/u) || [""])[0]).filter(Boolean) };
    return null;
  }

  // Items for the steps before index `upto` (the "who" step has none).
  function items(upto) {
    return steps().slice(1, upto).map(itemOf).filter(Boolean);
  }

  function resume(name) {
    const i = steps().indexOf(name);
    step = i > 0 ? i : 1;
    render();
  }

  function payload() {
    const list = (arr, other) => arr.map(plain).concat(other.trim() ? [other.trim()] : []);
    if (a.mode === "kids") {
      return { mode: "kids", topic: a.topic.trim(), world: a.world, items: items(steps().length), profile: { age: a.age === "12+" ? 13 : Number(a.age), loves: a.loves.map(plain) } };
    }
    return {
      mode: "researcher",
      topic: a.topic.trim(),
      items: items(steps().length),
      profile: {
        level: a.level,
        fields: list(a.fields, a.fieldOther),
        expertise: a.expertise.trim(),
        skills: list(a.skills, a.skillOther),
        knownLevel: a.knownLevel,
        knownText: a.knownText.trim(),
        purpose: a.purpose.map(plain),
        spark: plain(a.spark || ""),
        notes: a.notes.trim(),
        materialNames: a.files.map((f) => f.name)
      },
      files: a.files.map((f) => ({ name: f.name, type: f.type, data: f.data }))
    };
  }

  window.ExplorerIntake = { open, resume };
})();
