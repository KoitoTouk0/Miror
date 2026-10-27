// Timed rehearsal of the video's interest demo on the live site: plant a random topic, open nodes,
// fun fact, ask your own question, Our land. Prints how long each AI wait takes. Usage: node rehearse.js <outDir>
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || "https://explorer-mindflow.netlify.app/";
const out = process.argv[2];
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const p = await (await b.createBrowserContext()).newPage();
  await p.setViewport({ width: 1440, height: 900 });
  p.setDefaultTimeout(90000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => { if (r.url().includes("/api/") && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  const t = () => Date.now();
  const log = (step, x) => console.log(JSON.stringify({ step, ...x }));
  const click = (sel) => p.evaluate((sel) => document.querySelector(sel).dispatchEvent(new MouseEvent("click", { bubbles: true })), sel);
  const pick = (l) => p.evaluate((l) => [...document.querySelectorAll(".choice, .chip")].find((x) => x.textContent.includes(l)).click(), l);
  const next = () => p.evaluate(() => document.querySelector('[data-act="next"]').click());
  const count = () => p.evaluate(() => [...document.querySelectorAll("g.node")].map((g) => g.__data__).filter((n) => n.kind !== "fact").length);

  await p.goto(BASE + "?theme=gold", { waitUntil: "domcontentloaded" }); await sleep(4200);
  await click(".c-land"); await sleep(700); await click('[data-intro="start"]'); await sleep(2800);
  await pick("8"); await next(); await sleep(1500);
  await pick("Animals"); await pick("Space"); await next(); await sleep(1500);
  await p.click('[data-field="topic"]'); await p.type('[data-field="topic"]', "Why do cats purr?");
  let t0 = t(); await next();
  await p.waitForFunction(() => !document.querySelector("#scene").classList.contains("on"));
  log("map built (from Grow my map to map on screen)", { seconds: (t() - t0) / 1000, nodes: await count(), title: await p.$eval("#mapTitle", (e) => e.textContent) });
  await sleep(2000); await p.screenshot({ path: `${out}/r1-map.png` });
  for (let i = 1; i <= 2; i++) {
    const before = await count();
    await p.evaluate(() => document.querySelector("g.node.is-suggested").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await sleep(1500);
    const q = await p.evaluate(() => document.querySelector("#panelBody").innerText.replace(/\s+/g, " ").slice(0, 140));
    t0 = t();
    await p.evaluate(() => { const o = document.querySelector('[data-correct="1"], [data-act="wonder"]'); o && o.click(); });
    await p.waitForFunction((b) => [...document.querySelectorAll("g.node")].map((g) => g.__data__).filter((n) => n.kind !== "fact").length > b, { timeout: 40000 }, before).catch(() => {});
    log(`node ${i}: answered → new branches visible`, { seconds: (t() - t0) / 1000, nodes: await count(), question: q });
    await sleep(1500); await p.keyboard.press("Escape"); await sleep(800);
  }
  t0 = t();
  await p.click("#fertBtn"); await sleep(300); await p.click("#fertGo");
  await p.waitForFunction(() => document.querySelector("#panel.open .fact-badge"), { timeout: 40000 });
  log("fun fact: Sprinkle it → fact on screen", { seconds: (t() - t0) / 1000, fact: await p.evaluate(() => document.querySelector("#panelBody").innerText.replace(/\s+/g, " ").slice(0, 200)) });
  await sleep(1000); await p.screenshot({ path: `${out}/r2-fact.png` }); await p.keyboard.press("Escape"); await sleep(800);
  const owns = () => p.evaluate(() => document.querySelectorAll("g.node.own").length);
  const o0 = await owns();
  await p.click("#canBtn"); await sleep(400);
  await p.type("#askInput", "Can cats see in the dark?");
  t0 = t(); await p.click("#askGo");
  await p.waitForFunction((o) => document.querySelectorAll("g.node.own").length > o, { timeout: 40000 }, o0).catch(() => {});
  log("ask: Water → new branch grown", { seconds: (t() - t0) / 1000, ownQuestions: await owns() });
  await sleep(1800); await p.screenshot({ path: `${out}/r3-asked.png` });
  t0 = t();
  await p.click("#groupBtn"); await sleep(500);
  await p.type("#landNick", "Leo"); await p.type("#landName", "Rehearsal land");
  await p.evaluate(() => document.querySelector('#landCard [data-act="create"]').click()); await sleep(1500);
  await p.evaluate(() => document.querySelector('#landCard [data-act="ask-share"]').click()); await sleep(300);
  await p.evaluate(() => document.querySelector('#landCard [data-act="share"]').click());
  await p.waitForFunction(() => document.querySelector("#landCard .plot.mine"), { timeout: 20000 });
  log("Our land: create + share", { seconds: (t() - t0) / 1000, code: await p.$eval(".land-code b", (e) => e.textContent) });
  await p.screenshot({ path: `${out}/r4-land.png` });
  console.log(JSON.stringify({ errors }));
  await b.close();
})();
