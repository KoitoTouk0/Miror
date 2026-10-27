// Checks the "Grow my map" / "Build my map" button wherever the page is opened from.
// Usage: node grow.js <phase> [outDir]   phase: down | file | port | build
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FILE = require("url").pathToFileURL(require("path").resolve(__dirname, "../../demo/index.html")).href;
const phase = process.argv[2];
const out = process.argv[3] || ".";

(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  p.setDefaultTimeout(90000);
  p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  const pick = (label) => p.evaluate((l) => {
    const el = [...document.querySelectorAll(".choice, .who-card")].find((x) => x.textContent.includes(l));
    if (!el) throw new Error("no choice " + l);
    el.click();
  }, label);
  const next = () => p.evaluate(() => document.querySelector('[data-act="next"]').click());
  const state = async (label) => console.log(label, JSON.stringify(await p.evaluate(() => ({
    url: location.href.replace(/^.*Hackathon/, "…"),
    status: document.querySelector("#aiStatus").textContent,
    title: document.querySelector("#exploreTitle") && document.querySelector("#exploreTitle").textContent,
    button: document.querySelector('[data-act="next"]') && document.querySelector('[data-act="next"]').textContent,
    disabled: document.querySelector('[data-act="next"]') && document.querySelector('[data-act="next"]').disabled,
    note: document.querySelector("#intakeNote") && document.querySelector("#intakeNote").textContent
  }))));
  const toKidsTopic = async () => {
    await pick("Young explorer"); await sleep(1200);
    await p.click("#scene"); await sleep(2800);
    await pick("7"); await next(); await sleep(900);
    await pick("Animals"); await next(); await sleep(900);
    await p.type('[data-field="topic"]', "volcanoes");
  };
  const toResearchFinal = async () => {
    await pick("Researcher"); await sleep(1200);
    await p.click("#scene"); await sleep(2800);
    await pick("PhD"); await next(); await sleep(700);
    await pick("Engineering"); await next(); await sleep(700);
    await next(); await sleep(700);
    await p.type('[data-field="topic"]', "battery degradation"); await next(); await sleep(700);
  };

  const start = { down: FILE, file: FILE, port: "http://127.0.0.1:5500/", build: "http://localhost:8787/" }[phase];
  await p.goto(start);
  await sleep(3500);
  await state(`[${phase}] after load`);

  if (phase === "down") {
    await toKidsTopic();
    await state("[down] kids final step");
    await next(); await sleep(3500);
    await state("[down] after pressing Grow");
    await p.screenshot({ path: `${out}/g-1-kids-asleep.png` });
  }
  if (phase === "build") {
    await toResearchFinal();
    await state("[build] researcher final step");
    await p.goto("http://localhost:8787/"); await sleep(2000);
    await toKidsTopic();
    await state("[build] kids final step");
    await next();
    await p.waitForFunction(() => !document.querySelector("#scene").classList.contains("on"));
    await sleep(1800);
    console.log("[build] map:", await p.evaluate(() => [...document.querySelectorAll("g.node")].map((g) => g.textContent.trim()).filter(Boolean).slice(0, 6).join(" | ")));
    await p.screenshot({ path: `${out}/g-2-kids-grown.png` });
  }
  await b.close();
})();
