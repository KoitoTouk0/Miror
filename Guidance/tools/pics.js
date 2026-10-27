// Interest samples as pictures: the panel shows a tree, a flower field and a land; each opens its sample.
// Usage: node pics.js <outDir>
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || "http://localhost:8787/";
const out = process.argv[2];
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const errors = [];
  const p = await (await b.createBrowserContext()).newPage();
  await p.setViewport({ width: 1440, height: 900 });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
  const click = (sel) => p.evaluate((sel) => document.querySelector(sel).dispatchEvent(new MouseEvent("click", { bubbles: true })), sel);
  const state = () => p.evaluate(() => ({ sceneOn: document.querySelector("#scene").classList.contains("on"), land: !document.querySelector("#land").hidden,
    visiting: document.documentElement.classList.contains("visiting"), skin: document.querySelector("#graph").dataset.skin, title: document.querySelector("#mapTitle").textContent }));
  for (const act of ["sample", "bees", "land"]) {
    await p.goto(BASE + "?theme=gold", { waitUntil: "domcontentloaded" });
    await sleep(4600);
    await click(".c-land"); await sleep(800);
    if (act === "sample") {
      await p.hover('[data-intro="sample"]'); await sleep(500);
      await p.screenshot({ path: `${out}/pics-panel.png` });
    }
    await click(`[data-intro="${act}"]`); await sleep(2200);
    console.log(JSON.stringify({ act, ...(await state()) }));
  }
  console.log(JSON.stringify({ errors }));
  await b.close();
})();
