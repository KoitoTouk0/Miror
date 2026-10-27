// Intake journeys: kids prepare the ground (plant grows only after "build"); researchers build the ship
// (it launches only after the last step). Screenshots at each stage. Usage: node journey.js <outDir> [kids|researcher]
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || "http://localhost:8787/";
const [out, only] = process.argv.slice(2);

(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const errors = [];
  for (const mode of only ? [only] : ["kids", "researcher"]) {
    const p = await (await b.createBrowserContext()).newPage();
    await p.setViewport({ width: 1440, height: 900 });
    p.setDefaultTimeout(90000);
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
    await p.goto(BASE + "?theme=gold&kids=tree", { waitUntil: "networkidle0" });
    await sleep(1000);
    const pick = (l) => p.evaluate((l) => {
      const el = [...document.querySelectorAll(".choice, .who-card, .chip")].find((x) => x.textContent.includes(l));
      if (!el) throw new Error("no choice " + l);
      el.click();
    }, l);
    const next = () => p.evaluate(() => document.querySelector('[data-act="next"]').click());
    const typeField = async (f, t) => { await p.click(`[data-field="${f}"]`); await p.type(`[data-field="${f}"]`, t); };
    const shot = (n) => p.screenshot({ path: `${out}/${mode[0]}-${n}.png` });
    const t0 = Date.now();
    if (mode === "kids") {
      await pick("Young explorer"); await sleep(1500);
      await p.evaluate(() => document.querySelector("#scene").dispatchEvent(new MouseEvent("click", { bubbles: true })));
      await sleep(2800);
      await pick("8"); await next(); await sleep(1400); await shot("1-dig");
      await pick("Animals"); await pick("Space"); await next(); await sleep(2600); await shot("2-water");
      await pick("Magnets"); await sleep(400);
      const grownBefore = await p.evaluate(() => document.querySelectorAll("#scene .grown").length);
      await next(); await sleep(1500); await shot("3-seed-planted");
      await sleep(2500); await shot("4-growing");
      errors.push(...[]);
      console.log(JSON.stringify({ mode, grownBeforeBuild: grownBefore }));
    } else {
      await pick("Researcher or learner"); await sleep(1500);
      await p.evaluate(() => document.querySelector("#scene").dispatchEvent(new MouseEvent("click", { bubbles: true })));
      await sleep(3200);
      await pick("PhD student"); await next(); await sleep(1800); await shot("1-materials");
      await pick("Materials science"); await typeField("expertise", "experimental: thin films, XRD, SEM"); await next(); await sleep(1800);
      await pick("Lab work"); await pick("Baking"); await next(); await sleep(1800); await shot("2-engines");
      await typeField("topic", "DFT simulation of materials"); await pick("A little"); await pick("A project or proposal");
      await next(); await sleep(2000); await shot("3-course");
      const launchedEarly = await p.evaluate(() => document.querySelectorAll("#scene .s-dark").length);
      await next(); await sleep(2400); await shot("4-countdown");
      await sleep(3000); await shot("5-launched");
      console.log(JSON.stringify({ mode, darkStarsBeforeLaunch: launchedEarly, darkStarsAfter: await p.evaluate(() => [...document.querySelectorAll("#scene .s-dark-label")].map((t) => t.textContent)) }));
    }
    await p.waitForFunction(() => !document.querySelector("#scene").classList.contains("on"));
    await sleep(2500);
    await shot("6-map");
    const firsts = await p.evaluate(() => [...document.querySelectorAll("g.node")].map((g) => g.__data__).filter((n) => n.depth === 1 && !["known"].includes(n.kind)).map((n) => `${n.kind}: ${n.d.label}`));
    console.log(JSON.stringify({ mode, seconds: Math.round((Date.now() - t0) / 1000), firstQuestions: firsts }));
  }
  console.log(JSON.stringify({ errors }));
  await b.close();
})();
