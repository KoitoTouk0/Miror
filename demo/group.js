/* Miror: group lands (kids mode).
 *
 * A class, family or friend group shares one "land": everyone can put their own garden or tree
 * there, and visit everyone else's. No accounts: a land is joined with its 6-letter code, and this
 * browser keeps a random secret that proves which shared gardens are yours.
 * ExplorerGroups.create({ garden, visit, plant, toast, before }) → { open(), shareTo(code), sync() }
 *   garden(): your current garden { key, title, style, nodes, lit }
 *   visit(g): show a shared garden { nickname, avatar, title, style, nodes, lit }
 *   plant(code): start a brand-new garden from a seed; it goes into that land once it's built
 * A garden you've shared keeps itself up to date there: the app calls sync() as it grows.
 */
(function () {
  "use strict";

  const AVATARS = ["🦄", "🐱", "🐶", "🦊", "🐼", "🐸", "🦉", "🐢", "🐝", "🦋", "🐙", "🦖"];
  const STORE = "explorer.groups";
  const FLOWERS = ["🌷", "🌼", "🌸", "🌻", "🌺"];
  // Shown in a land that has no gardens yet, so it never looks empty.
  const SAMPLES = (window.EXPLORER_DATA && window.EXPLORER_DATA.landSamples) || [];
  const statsOf = (g) => ({ grown: g.lit.length, facts: g.nodes.filter((n) => n.kind === "fact").length });
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function randomSecret() {
    const a = new Uint8Array(24);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // What this browser remembers: who you are, your lands, and which shared gardens are yours.
  function load() {
    let s = {};
    try {
      s = JSON.parse(localStorage.getItem(STORE) || "{}");
    } catch (e) { /* storage blocked: lasts until the page closes */ }
    return Object.assign({ secret: randomSecret(), nickname: "", avatar: AVATARS[0], lands: [], current: "", mine: {} }, s);
  }

  function create(hooks) {
    const me = load();
    const land = $("#land");
    const card = $("#landCard");
    let view = "land";
    let info = null;
    let confirming = false;

    function save() {
      try {
        localStorage.setItem(STORE, JSON.stringify(me));
      } catch (e) { /* storage blocked */ }
    }
    save();

    async function call(body) {
      try {
        const r = await fetch("/api/group", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const out = await r.json().catch(() => ({}));
        return r.ok ? out : { error: out.error || "unavailable", status: r.status };
      } catch (e) {
        return { error: "offline" };
      }
    }

    function message(text) {
      const el = card.querySelector(".land-msg");
      if (el) el.textContent = text;
    }

    const ERRORS = {
      no_group: "We couldn't find a land with that code. Check the letters?",
      offline: "Can't reach Miror right now. Is it running?",
      "this land is full": "This land is full (60 gardens).",
      "that code doesn't look right": "Codes have 6 letters and numbers, like K7QM4P."
    };
    const explain = (r) => ERRORS[r.error] || "Something went wrong. Please try again.";

    async function open() {
      hooks.before();
      land.hidden = false;
      confirming = false;
      if (!me.lands.length || !me.nickname) return showSetup();
      await showLand(me.current || me.lands[0].code);
    }

    function close() {
      land.hidden = true;
    }

    // ---------- join or start a land ----------
    function showSetup() {
      view = "setup";
      card.innerHTML = `
        <button type="button" class="close" data-act="close" aria-label="Close">×</button>
        <div class="land-eyebrow">🏡 Our land</div>
        <h2 id="landTitle">Grow gardens together</h2>
        <p class="land-sub">Make a land for your class, family or friends. Everyone can put their own garden or tree there, and visit each other's!</p>
        <section class="land-box">
          <h3>Your nickname</h3>
          <input id="landNick" maxlength="20" placeholder="e.g. Mia" value="${esc(me.nickname)}" autocomplete="off">
          <p class="land-note">Use a nickname, not your full name.</p>
          <div class="avatars">${AVATARS.map((a) => `<button type="button" class="avatar${a === me.avatar ? " on" : ""}" data-avatar="${a}" aria-label="Pick ${a}">${a}</button>`).join("")}</div>
        </section>
        <div class="land-two">
          <section class="land-box">
            <h3>Join a land</h3>
            <p class="land-note">Got a code from someone?</p>
            <input id="landCode" maxlength="7" placeholder="e.g. K7QM4P" autocomplete="off" spellcheck="false">
            <button type="button" class="primary" data-act="join">Join →</button>
          </section>
          <section class="land-box">
            <h3>Start a new land</h3>
            <p class="land-note">Then tell everyone its code.</p>
            <input id="landName" maxlength="40" placeholder="e.g. Hogwarts Grade IV" autocomplete="off">
            <button type="button" class="primary" data-act="create">Create ✨</button>
          </section>
        </div>
        <p class="land-msg" aria-live="polite"></p>
        ${me.lands.length && me.nickname ? `<button type="button" class="land-link" data-act="back">← Back to my land</button>` : ""}`;
      card.querySelectorAll("[data-avatar]").forEach((b) => b.addEventListener("click", () => {
        me.avatar = b.dataset.avatar;
        card.querySelectorAll("[data-avatar]").forEach((x) => x.classList.toggle("on", x === b));
        save();
      }));
      wire();
    }

    function readNick() {
      const nick = $("#landNick").value.trim().slice(0, 20);
      if (!nick) {
        message("First, pick a nickname!");
        $("#landNick").focus();
        return false;
      }
      me.nickname = nick;
      save();
      return true;
    }

    async function join() {
      if (!readNick()) return;
      const code = $("#landCode").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length !== 6) return message(ERRORS["that code doesn't look right"]);
      message("Looking for that land…");
      const r = await call({ action: "get", code });
      if (r.error) return message(explain(r));
      remember(r.code, r.name);
      await showLand(r.code, r);
      hooks.toast(`🏡 You joined ${r.name}!`);
    }

    async function start() {
      if (!readNick()) return;
      const name = $("#landName").value.trim();
      if (name.length < 2) return message("Give your land a name, like “Hogwarts Grade IV”.");
      message("Making your land…");
      const r = await call({ action: "create", name });
      if (r.error) return message(explain(r));
      remember(r.code, r.name);
      await showLand(r.code);
      hooks.toast(`✨ ${r.name} is ready! Its code is ${r.code}`);
    }

    function remember(code, name) {
      me.lands = me.lands.filter((l) => l.code !== code);
      me.lands.unshift({ code, name });
      me.current = code;
      save();
    }

    // ---------- the land: everyone's plots ----------
    async function showLand(code, got) {
      view = "land";
      me.current = code;
      save();
      card.innerHTML = `<div class="land-eyebrow">🏡 Our land</div><p class="land-sub">Opening the land…</p>`;
      const r = got || (await call({ action: "get", code }));
      if (r.error) {
        if (r.error === "no_group") {
          me.lands = me.lands.filter((l) => l.code !== code);
          me.current = "";
          save();
        }
        showSetup();
        return message(explain(r));
      }
      info = r;
      const entry = me.lands.find((l) => l.code === code);
      if (entry) entry.name = r.name;
      save();
      render();
    }

    function mineIds() {
      return me.mine[info.code] || {};
    }

    function render() {
      const g = hooks.garden();
      const mine = mineIds();
      const myId = mine[g.key];
      const shared = myId && info.gardens.some((x) => x.id === myId);
      const word = g.style === "tree" ? "tree" : "garden";
      const lands = me.lands.length > 1
        ? `<select id="landPick" aria-label="Your lands">${me.lands.map((l) => `<option value="${esc(l.code)}"${l.code === info.code ? " selected" : ""}>${esc(l.name)}</option>`).join("")}</select>`
        : "";
      const ownIds = new Set(Object.values(mine));
      const plantCard = `<div class="plot plant">
          <div class="plot-art" aria-hidden="true">🌱</div>
          <div class="plot-who">Plant a new seed</div>
          <div class="plot-title">Grow your own ${word} right here in ${esc(info.name)}</div>
          <button type="button" class="primary" data-act="plant">🌱 Plant my seed</button>
        </div>`;
      const plots = plantCard + (info.gardens.length
        ? info.gardens.map((x) => plotHTML(x, ownIds.has(x.id))).join("")
        : SAMPLES.map((x) => plotHTML(Object.assign({ id: x.id, sample: true }, x, statsOf(x)), false)).join(""));
      const samplesNote = info.gardens.length ? "" : `<p class="land-note">No gardens here yet, so here are two sample ones to peek at. Plant yours to be the first!</p>`;
      card.innerHTML = `
        <button type="button" class="close" data-act="close" aria-label="Close">×</button>
        <div class="land-eyebrow">🏡 Our land</div>
        <div class="land-head"><h2 id="landTitle">${esc(info.name)}</h2>${lands}</div>
        <p class="land-code">Code <b>${esc(info.code)}</b> <button type="button" class="chip" data-act="copy">Copy</button>
          <span class="muted">Tell your family or class this code so they can join.</span></p>
        <div class="land-share">${!g.lit.length && !shared ? "" : confirming ? confirmHTML(g, word) : shared
          ? `<span>✓ Your ${word} “${esc(g.title)}” is here, and it grows here as you explore.</span>
             <button type="button" class="land-link" data-act="unshare">Take it away</button>`
          : `<button type="button" class="primary" data-act="ask-share">🌱 Share my ${word} here</button>
             <span class="muted">“${esc(g.title)}”</span>`}</div>
        ${samplesNote}
        <div class="plots">${plots}</div>
        <p class="land-msg" aria-live="polite"></p>
        <div class="land-foot">
          <span>You are ${esc(me.avatar)} <b>${esc(me.nickname)}</b></span>
          <button type="button" class="land-link" data-act="setup">Change name · join or start another land</button>
        </div>`;
      const pick = $("#landPick");
      if (pick) pick.addEventListener("change", () => showLand(pick.value));
      wire();
    }

    function plotArt(x) {
      if (!x.grown && !x.facts) return "🌱";
      if (x.style === "tree") return `<span class="plot-tree">🌳</span>${"🍎".repeat(Math.min(x.facts, 4))}`;
      const n = Math.max(1, Math.min(x.grown, 7));
      return Array.from({ length: n }, (_, i) => FLOWERS[i % FLOWERS.length]).join("") + (x.facts ? "✨" : "");
    }

    function plotHTML(x, own) {
      return `<div class="plot${own ? " mine" : ""}">
        <div class="plot-art" aria-hidden="true">${plotArt(x)}</div>
        <div class="plot-who">${esc(x.avatar)} ${esc(x.nickname)}${own ? ` <i class="tag">you</i>` : x.sample ? ` <i class="tag sample">sample</i>` : ""}</div>
        <div class="plot-title">${esc(x.title)}</div>
        <div class="plot-stats">${x.style === "tree" ? "🌿" : "🌸"} ${x.grown} grown · ✨ ${x.facts} fun ${x.facts === 1 ? "fact" : "facts"}</div>
        <button type="button" class="primary" data-visit="${esc(x.id)}">Visit 👀</button>
      </div>`;
    }

    function confirmHTML(g, word) {
      return `<div class="land-confirm">
        <p><b>Share your ${word} “${esc(g.title)}” with ${esc(info.name)}?</b><br>
        Everyone with the code can visit it. Only the questions on your map, what you've grown, your fun facts,
        your nickname and your emoji are shared. You can take it away any time.</p>
        <button type="button" class="primary" data-act="share">✓ Yes, share it</button>
        <button type="button" class="land-link" data-act="no-share">Not now</button>
      </div>`;
    }

    // Puts your current garden into a land (or updates the copy that's already there).
    async function shareTo(code, g = hooks.garden()) {
      const mine = me.mine[code] || {};
      const body = {
        action: "share", code, secret: me.secret, nickname: me.nickname, avatar: me.avatar,
        garden: { title: g.title, style: g.style, nodes: g.nodes, lit: g.lit }
      };
      let r = await call(Object.assign({ id: mine[g.key] }, body));
      if (r.error === "not yours") r = await call(body);
      if (r.error) return r;
      me.mine[code] = Object.assign({}, me.mine[code], { [g.key]: r.id });
      save();
      return r;
    }

    async function share() {
      message("Planting your garden in the land…");
      const g = hooks.garden();
      const r = await shareTo(info.code, g);
      if (r.error) return message(explain(r));
      confirming = false;
      await showLand(info.code);
      hooks.toast(`🌱 Your ${g.style === "tree" ? "tree" : "garden"} is in ${info.name}!`);
    }

    // Your garden grew: update its copy in every land where you've shared it.
    const synced = {};
    async function sync() {
      const g = hooks.garden();
      const sig = `${g.lit.length}/${g.nodes.length}`;
      for (const l of me.lands) {
        const id = (me.mine[l.code] || {})[g.key];
        if (!id || synced[id] === sig) continue;
        const r = await shareTo(l.code, g);
        if (!r.error) synced[r.id] = sig;
      }
    }

    async function unshare() {
      const g = hooks.garden();
      const mine = mineIds();
      const id = mine[g.key];
      if (!id) return;
      const r = await call({ action: "remove", code: info.code, id, secret: me.secret });
      if (r.error) return message(explain(r));
      delete mine[g.key];
      save();
      await showLand(info.code);
      hooks.toast("Taken away. Only you can see it now.");
    }

    async function visit(id) {
      const sample = SAMPLES.find((x) => x.id === id);
      if (sample) {
        close();
        return hooks.visit(sample);
      }
      message("Walking over…");
      const r = await call({ action: "map", code: info.code, id });
      if (r.error) return message("That garden isn't here any more.");
      close();
      hooks.visit(r);
    }

    function wire() {
      card.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
        const act = b.dataset.act;
        if (act === "close") close();
        else if (act === "join") join();
        else if (act === "create") start();
        else if (act === "back") showLand(me.current || me.lands[0].code);
        else if (act === "setup") showSetup();
        else if (act === "ask-share") { confirming = true; render(); }
        else if (act === "no-share") { confirming = false; render(); }
        else if (act === "share") share();
        else if (act === "unshare") unshare();
        else if (act === "plant") { close(); hooks.plant(info.code); }
        else if (act === "copy") {
          (navigator.clipboard ? navigator.clipboard.writeText(info.code) : Promise.reject())
            .then(() => hooks.toast(`📋 Copied ${info.code}`), () => message(`The code is ${info.code}`));
        }
      }));
      card.querySelectorAll("[data-visit]").forEach((b) => b.addEventListener("click", () => visit(b.dataset.visit)));
      const enter = (sel, fn) => { const el = card.querySelector(sel); if (el) el.addEventListener("keydown", (e) => { if (e.key === "Enter") fn(); }); };
      enter("#landCode", join);
      enter("#landName", start);
    }

    land.addEventListener("click", (e) => { if (e.target === land) close(); });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || land.hidden) return;
      e.preventDefault();
      close();
    });

    return {
      open, close, shareTo, sync, isOpen: () => !land.hidden,
      landName: (code) => (me.lands.find((l) => l.code === code) || {}).name || ""
    };
  }

  window.ExplorerGroups = { create };
})();
