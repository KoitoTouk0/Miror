// Fun-fact fertilizer check (kids): open the button, confirm, watch a fact grow, read the panel.
// Usage: node funfact.js <outDir> [tree|garden] [extra query, e.g. "&speed=slow"]
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || "http://localhost:8787/";
const [out, world = "tree", extra = ""] = process.argv.slice(2);

(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const p = await b.newPage();
  await p.setViewport(process.env.PHONE ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await p.goto(`${BASE}?mode=kids&kids=${world}${extra}`, { waitUntil: "networkidle0" });
  await sleep(1500);
  await p.keyboard.press("Escape");
  await sleep(1200);
  await p.screenshot({ path: `${out}/${world}-1-map.png` });
  const facts = [];
  for (let i = 0; i < 3; i++) {
    await p.click("#fertBtn");
    await sleep(500);
    if (i === 0) await p.screenshot({ path: `${out}/${world}-2-confirm.png` });
    const sub = await p.$eval("#fertSub", (e) => e.textContent);
    await p.click("#fertGo");
    await sleep(2600);
    if (i === 0) await p.screenshot({ path: `${out}/${world}-3-sprinkle.png` });
    await sleep(3800);
    const panel = await p.evaluate(() => document.querySelector("#panel.open") ? document.querySelector("#panelBody").innerText.replace(/\s+/g, " ") : "(panel closed)");
    if (i === 0) await p.screenshot({ path: `${out}/${world}-4-fact.png` });
    const state = await p.evaluate(() => ({
      facts: [...document.querySelectorAll("g.node.kind-fact")].length,
      progress: document.querySelector("#litCount").textContent + "/" + document.querySelector("#totalCount").textContent
    }));
    facts.push({ sub, panel: panel.slice(0, 300), ...state });
    await p.keyboard.press("Escape");
    await sleep(1200);
  }
  await p.screenshot({ path: `${out}/${world}-5-three-facts.png` });
  console.log(JSON.stringify({ world, facts, errors }, null, 1));
  await b.close();
})();
