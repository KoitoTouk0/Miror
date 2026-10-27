// Fun-fact fertilizer on a real AI map (kids): build a map through the intake, sprinkle facts,
// then answer questions to check branches with a fact on them still grow.
// Usage: node funfact-ai.js <outDir> [Growing tree|Flower garden]
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || "http://localhost:8787/";
const [out, world = "Flower garden"] = process.argv.slice(2);
const tag = world.startsWith("Flower") ? "garden" : "tree";

(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  p.setDefaultTimeout(90000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  p.on("response", (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  const pick = (l) => p.evaluate((l) => {
    const el = [...document.querySelectorAll(".choice, .who-card, .chip")].find((x) => x.textContent.includes(l));
    if (!el) throw new Error("no choice " + l);
    el.click();
  }, l);
  const next = () => p.evaluate(() => document.querySelector('[data-act="next"]').click());
  const count = () => p.evaluate(() => {
    const all = [...document.querySelectorAll("g.node")].map((g) => g.__data__);
    return { questions: all.filter((n) => n.kind !== "fact").length, facts: all.filter((n) => n.kind === "fact").length,
      progress: document.querySelector("#litCount").textContent + "/" + document.querySelector("#totalCount").textContent };
  });
  const panel = () => p.evaluate(() => document.querySelector("#panel.open") ? document.querySelector("#panelBody").innerText.replace(/\s+/g, " ").slice(0, 320) : "(closed)");
  const log = [];

  await p.goto(BASE + "?theme=gold");
  await sleep(2500);
  await pick("Young explorer"); await sleep(1500);
  await p.click("#scene"); await sleep(3200);
  await pick("8"); await next(); await sleep(1800);
  await pick("Animals"); await pick("Space"); await next(); await sleep(1800);
  await pick("Magnets"); await pick(world);
  await next();
  await p.waitForFunction(() => !document.querySelector("#scene").classList.contains("on"));
  await sleep(2500);
  log.push({ step: "map built", ...(await count()) });

  async function sprinkle(name) {
    await p.click("#fertBtn"); await sleep(400);
    const sub = await p.$eval("#fertSub", (e) => e.textContent);
    const t = Date.now();
    await p.click("#fertGo");
    await p.waitForFunction(() => document.querySelector("#panel.open .fact-badge"), { timeout: 40000 });
    await sleep(800);
    log.push({ step: name, sub, seconds: Math.round((Date.now() - t) / 100) / 10, panel: await panel(), ...(await count()) });
    await p.screenshot({ path: `${out}/ai-${tag}-${name}.png` });
    await p.keyboard.press("Escape"); await sleep(1200);
  }

  async function answerSuggested(i) {
    await p.evaluate(() => {
      const g = document.querySelector("g.node.is-suggested");
      g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await sleep(1500);
    await p.evaluate(() => { const o = document.querySelector('[data-correct="1"], [data-act="wonder"]'); if (o) o.click(); });
    await sleep(14000);
    log.push({ step: `answered q${i}`, ...(await count()) });
    await p.keyboard.press("Escape"); await sleep(1000);
  }

  await sprinkle("fact1");
  await sprinkle("fact2");
  await answerSuggested(1);
  await answerSuggested(2);
  await sprinkle("fact3");
  await p.evaluate(() => document.querySelector("#fitBtn").click()); await sleep(1800);
  await p.screenshot({ path: `${out}/ai-${tag}-overview.png` });
  console.log(JSON.stringify({ log, errors }, null, 1));
  await b.close();
})();
