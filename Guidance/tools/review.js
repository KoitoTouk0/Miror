// Full end-to-end walkthrough on the live site, both modes, for the project review.
// Usage: node review.js <outDir> [researcher|kids]
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || "http://localhost:8787/";
const out = process.argv[2];
const only = process.argv[3];
const log = [];
const t0 = Date.now();
const mark = (what, extra) => { const e = { t: Math.round((Date.now() - t0) / 100) / 10, what, ...extra }; log.push(e); console.log(JSON.stringify(e)); };

async function run(mode) {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  p.setDefaultTimeout(120000);
  p.on("pageerror", (e) => mark("PAGEERROR", { msg: e.message }));
  p.on("console", (m) => { if (m.type() === "error") mark("CONSOLE", { msg: m.text() }); });
  p.on("request", (r) => { if (r.url().includes("/api/")) mark("REQ", { url: r.url().replace(/^https?:\/\/[^/]+/, ""), bytes: (r.postData() || "").length }); if (r.url().includes("/api/map")) require("fs").writeFileSync(out + "/map-payload.json", r.postData() || ""); });
  p.on("response", async (r) => { if (r.url().includes("/api/") || r.status() >= 400) mark("RES", { url: r.url().replace(/^https?:\/\/[^/]+/, ""), status: r.status(), body: r.status() >= 400 ? (await r.text().catch(() => "")).slice(0, 200) : undefined }); });
  const shot = async (n) => p.screenshot({ path: `${out}/${n}.png` });
  const pick = (l) => p.evaluate((l) => {
    const el = [...document.querySelectorAll(".choice, .who-card, .chip")].find((x) => x.textContent.includes(l));
    if (!el) throw new Error("no choice " + l);
    el.click();
  }, l);
  const next = () => p.evaluate(() => document.querySelector('[data-act="next"]').click());
  const typeField = async (f, text) => { await p.click(`[data-field="${f}"]`); await p.type(`[data-field="${f}"]`, text); };
  const nodeCount = () => p.evaluate(() => [...document.querySelectorAll("g.node")].filter((g) => getComputedStyle(g).opacity !== "0" && !g.classList.contains("is-hidden")).length);
  const panelText = () => p.evaluate(() => { const el = document.querySelector("#panel"); return el ? el.innerText.replace(/\s+/g, " ").slice(0, 700) : ""; });

  async function answerSuggested(i) {
    const id = await p.evaluate(() => { const g = document.querySelector("g.node.is-suggested"); return g && g.__data__.id; });
    if (!id) return mark("no suggested node");
    await p.evaluate((id) => {
      const el = [...document.querySelectorAll("g.node")].find((g) => g.__data__ && g.__data__.id === id);
      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }, id);
    await sleep(1600);
    const q = await panelText();
    await shot(`${mode[0]}-q${i}-open`);
    const how = await p.evaluate(() => {
      const opt = document.querySelector('[data-correct="1"]');
      if (opt) { opt.click(); return "quiz"; }
      const ta = document.querySelector("#thought");
      if (ta) {
        ta.value = "It reminds me of checking a measurement against a reference sample.";
        ta.dispatchEvent(new Event("input"));
        document.querySelector('[data-act="reflect"]').click();
        return "reflect";
      }
      const c = document.querySelector('[data-act="claim"], [data-act="wonder"]');
      if (c) { c.click(); return "claim"; }
      return "none";
    });
    const before = await nodeCount();
    await sleep(9000);
    mark(`answered q${i}`, { how, nodesBefore: before, nodesAfter: await nodeCount(), panel: q.slice(0, 260) });
    await shot(`${mode[0]}-q${i}-grown`);
    await p.evaluate(() => { const c = document.querySelector("#panelClose"); if (c) c.click(); });
    await sleep(1200);
  }

  async function ask(text) {
    await p.evaluate(() => (document.querySelector("#askBtn:not([hidden])") && getComputedStyle(document.querySelector("#askBtn")).display !== "none" ? document.querySelector("#askBtn") : document.querySelector("#canBtn")).click());
    await sleep(900);
    await p.type("#askInput", text);
    await shot(`${mode[0]}-ask-typed`);
    const before = await nodeCount();
    const t = Date.now();
    await p.click("#askGo");
    await sleep(2500);
    await shot(`${mode[0]}-ask-flying`);
    await sleep(14000);
    mark("own question", { text, seconds: Math.round((Date.now() - t) / 1000), nodesBefore: before, nodesAfter: await nodeCount(), toast: await p.evaluate(() => [...document.querySelectorAll(".toast")].map((x) => x.textContent).join(" / ")) });
    await shot(`${mode[0]}-ask-grown`);
    await sleep(1500);
    mark("own question panel", { panel: (await panelText()).slice(0, 500) });
    await shot(`${mode[0]}-ask-panel`);
  }

  await p.goto(BASE + (mode === "kids" ? "?kids=tree&theme=gold" : "?theme=gold"));
  await sleep(2500);
  mark(`${mode}: loaded`, { status: await p.evaluate(() => document.querySelector("#aiStatus").textContent) });
  await shot(`${mode[0]}-00-welcome`);

  if (mode === "researcher") {
    await pick("Researcher or learner"); await sleep(1500); await shot("r-01-opening");
    await p.click("#scene"); await sleep(3200); await shot("r-02-earth");
    await pick("PhD student"); await next(); await sleep(2200);
    await pick("Materials science");
    await typeField("expertise", "experimental: thin-film growth, XRD, SEM, annealing");
    await next(); await sleep(2200);
    await pick("Lab work"); await pick("Data analysis"); await pick("Baking"); await next(); await sleep(2200);
    await typeField("topic", "DFT simulation of materials");
    await pick("A little");
    await typeField("knownText", "I know DFT computes energies and structures, but not how to set up a calculation or when to trust it.");
    await pick("Work or a project"); await pick("A project or proposal");
    await shot("r-03-topic-step");
    await next(); await sleep(2400);
    await typeField("notes", "I just moved from an experimental lab into a simulation group. My groupmates come from physics, math and CS.");
    await shot("r-04-materials-stars");
    const tb = Date.now();
    await next(); await sleep(3500); await shot("r-05-building");
    try {
      await p.waitForFunction(() => !document.querySelector("#scene").classList.contains("on"), { timeout: 60000 });
    } catch (e) {
      mark("build stuck", { note: await p.evaluate(() => (document.querySelector("#intakeNote") || {}).textContent) });
      await shot("r-05b-stuck");
      throw e;
    }
    mark("map built", { seconds: Math.round((Date.now() - tb) / 1000) });
    await sleep(2500);
    mark("your path panel", { panel: await panelText() });
    await shot("r-06-your-path");
    await p.evaluate(() => { const c = document.querySelector("#panelClose"); if (c) c.click(); });
    await sleep(1500); await shot("r-07-map");
    for (let i = 1; i <= 3; i++) await answerSuggested(i);
    await ask("How do I check whether a DFT result matches my XRD data?");
    await p.evaluate(() => document.querySelector("#fitBtn").click()); await sleep(1800); await shot("r-99-overview");
  } else {
    await pick("Young explorer"); await sleep(1500); await shot("k-01-opening");
    await p.click("#scene"); await sleep(3200); await shot("k-02-bud");
    await pick("8"); await next(); await sleep(1800);
    await pick("Animals"); await pick("Space"); await next(); await sleep(1800);
    await pick("Magnets"); await pick("Growing tree"); await shot("k-03-topic");
    const tb = Date.now();
    await next(); await sleep(3000); await shot("k-04-building");
    await p.waitForFunction(() => !document.querySelector("#scene").classList.contains("on"));
    mark("map built", { seconds: Math.round((Date.now() - tb) / 1000) });
    await sleep(2200); await shot("k-05-tree");
    for (let i = 1; i <= 3; i++) await answerSuggested(i);
    await ask("Why do magnets stick to the fridge but not to wood?");
    await p.evaluate(() => document.querySelector("#fitBtn").click()); await sleep(1800); await shot("k-99-overview");
  }
  await b.close();
}

(async () => {
  for (const m of only ? [only] : ["researcher", "kids"]) {
    try { await run(m); } catch (e) { mark(`${m} FAILED`, { msg: e.message }); }
  }
  fs.writeFileSync(`${out}/log.json`, JSON.stringify(log, null, 2));
})();
