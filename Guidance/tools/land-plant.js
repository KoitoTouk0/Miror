// Planting straight from a group land: a new land shows 2 sample gardens; "Plant my seed" goes straight
// to the kids' questions; the built garden appears in the land and updates as it grows.
// Usage: node land-plant.js <outDir> [gold|blue]
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || "http://localhost:8787/";
const [out, theme = "gold"] = process.argv.slice(2);

(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const errors = [];
  const log = (step, x) => console.log(JSON.stringify({ step, ...x }));
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  p.setDefaultTimeout(90000);
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
  await p.goto(`${BASE}?kids=garden&theme=${theme}`, { waitUntil: "networkidle0" });
  await sleep(1200);
  const pick = (l) => p.evaluate((l) => {
    const el = [...document.querySelectorAll(".choice, .who-card, .chip")].find((x) => x.textContent.includes(l));
    if (!el) throw new Error("no choice " + l);
    el.click();
  }, l);
  const next = () => p.evaluate(() => document.querySelector('[data-act="next"]').click());
  const act = (a) => p.evaluate((a) => document.querySelector(`#landCard [data-act="${a}"]`).click(), a);
  const card = () => p.evaluate(() => document.querySelector("#landCard").innerText.replace(/\s+/g, " ").slice(0, 420));
  const screen = () => p.evaluate(() => ({
    scene: document.querySelector("#scene").classList.contains("on"), land: !document.querySelector("#land").hidden,
    explore: !document.querySelector("#explore").hidden, step: (document.querySelector("#exploreCard h2") || {}).textContent,
    visiting: document.documentElement.classList.contains("visiting"), title: document.querySelector("#mapTitle").textContent
  }));

  await pick("Young explorer"); await sleep(1600);
  await p.evaluate(() => document.querySelector("#scene .s-sign").dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await sleep(600);
  await p.type("#landNick", "Leo");
  await p.evaluate(() => document.querySelector('[data-avatar="🐢"]').click());
  await p.type("#landName", "Hogwarts Grade IV");
  await act("create"); await sleep(1200);
  log("new land", { card: await card() });
  await p.screenshot({ path: `${out}/${theme}-1-new-land.png` });

  // Peek at a sample, then go back to the land from the visit bar.
  await p.evaluate(() => document.querySelector('[data-visit="sample-bees"]').click()); await sleep(2500);
  log("visiting sample", await screen());
  await p.screenshot({ path: `${out}/${theme}-2-sample.png` });
  await p.click("#visitLand"); await sleep(1000);

  // Plant straight from the land.
  await act("plant"); await sleep(3000);
  log("after Plant my seed", await screen());
  await p.screenshot({ path: `${out}/${theme}-3-planting.png` });
  await pick("8"); await next(); await sleep(1500);
  await pick("Animals"); await next(); await sleep(1500);
  await pick("Magnets"); await next();
  await p.waitForFunction(() => !document.querySelector("#scene").classList.contains("on"));
  await sleep(3500);
  log("built", { ...(await screen()), toasts: await p.evaluate(() => [...document.querySelectorAll(".toast")].map((t) => t.textContent)) });
  await p.click("#groupBtn"); await sleep(1200);
  log("land after planting", { card: await card() });
  await p.keyboard.press("Escape"); await sleep(500);

  // Grow a flower: the land copy should follow by itself.
  await p.evaluate(() => document.querySelector("g.node.is-suggested").dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await sleep(1200);
  await p.evaluate(() => { const o = document.querySelector('[data-correct="1"], [data-act="wonder"]'); if (o) o.click(); });
  await sleep(6000);
  await p.keyboard.press("Escape"); await sleep(500);
  await p.click("#groupBtn"); await sleep(1200);
  log("land after growing", { card: await card() });
  await p.screenshot({ path: `${out}/${theme}-4-land-after.png` });
  console.log(JSON.stringify({ errors }));
  await b.close();
})();
