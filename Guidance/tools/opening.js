// The new opening: intro zoom (stars → spinning Earth → picture), the one-page picture (sky = research
// extension, land = interest exploration), side panels, start, Back, samples. Usage: node opening.js <outDir>
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || "http://localhost:8787/";
const out = process.argv[2];

(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const errors = [];
  const log = (step, x) => console.log(JSON.stringify({ step, ...x }));
  const page = async (phone) => {
    const p = await (await b.createBrowserContext()).newPage();
    await p.setViewport(phone ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
    await p.goto(BASE + "?theme=gold", { waitUntil: "domcontentloaded" });
    return p;
  };
  const state = (p) => p.evaluate(() => ({
    scene: document.querySelector("#scene").dataset.scene, sceneOn: document.querySelector("#scene").classList.contains("on"),
    intro: document.querySelector("#intro").hidden ? null : document.querySelector("#introTitle").textContent,
    explore: !document.querySelector("#explore").hidden, step: (document.querySelector("#exploreCard h2") || {}).textContent,
    mode: document.documentElement.dataset.mode, land: !document.querySelector("#land").hidden,
    visiting: document.documentElement.classList.contains("visiting"), title: document.querySelector("#mapTitle").textContent
  }));
  const click = (p, sel) => p.evaluate((sel) => document.querySelector(sel).dispatchEvent(new MouseEvent("click", { bubbles: true })), sel);

  const p = await page(false);
  for (const [t, n] of [[700, "0a-stars"], [1700, "0b-earth"], [2900, "0c-dive"], [4600, "1-picture"]]) {
    await sleep(t - (t === 700 ? 0 : [700, 1700, 2900, 4600][[700, 1700, 2900, 4600].indexOf(t) - 1]));
    await p.screenshot({ path: `${out}/${n}.png` });
  }
  log("picture", await state(p));
  await click(p, ".c-sky"); await sleep(700);
  log("sky clicked", await state(p));
  await p.screenshot({ path: `${out}/2-research-panel.png` });
  await click(p, ".c-land"); await sleep(700);
  log("land clicked", await state(p));
  await p.screenshot({ path: `${out}/3-interest-panel.png` });
  await click(p, '[data-intro="start"]'); await sleep(3200);
  log("interest start", { ...(await state(p)), ages: await p.evaluate(() => [...document.querySelectorAll(".choice")].map((c) => c.textContent.trim()).join(" ")) });
  await p.screenshot({ path: `${out}/4-age-step.png` });
  await p.evaluate(() => document.querySelector('[data-act="back"]').click()); await sleep(1200);
  log("back from age", await state(p));
  await click(p, ".c-sky"); await sleep(600);
  await click(p, '[data-intro="start"]'); await sleep(3600);
  log("research start", await state(p));
  // Samples
  await p.goto(BASE + "?theme=gold", { waitUntil: "domcontentloaded" }); await sleep(4600);
  await click(p, ".c-land"); await sleep(600); await click(p, '[data-intro="bees"]'); await sleep(2500);
  log("bees sample", await state(p));
  await p.goto(BASE + "?theme=gold", { waitUntil: "domcontentloaded" }); await sleep(4600);
  await click(p, ".c-land"); await sleep(600); await click(p, '[data-intro="land"]'); await sleep(800);
  log("our land from panel", await state(p));
  await p.keyboard.press("Escape"); await sleep(500);
  log("escape from land keeps picture", await state(p));
  await p.goto(BASE + "?theme=gold", { waitUntil: "domcontentloaded" }); await sleep(4600);
  await click(p, ".c-sky"); await sleep(600); await click(p, '[data-intro="sample"]'); await sleep(1500);
  log("research sample", await state(p));

  const ph = await page(true);
  await sleep(4800);
  await ph.screenshot({ path: `${out}/5-phone-picture.png` });
  await click(ph, ".c-land"); await sleep(700);
  await ph.screenshot({ path: `${out}/6-phone-panel.png` });
  console.log(JSON.stringify({ errors }));
  await b.close();
})();
