// "Our land" entry from the kids' opening: Mia shares a garden; Leo picks Young explorer, sees the
// signpost next to the seed, joins, visits Mia, goes back, plants a new seed. Usage: node land-entry.js <outDir>
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || "http://localhost:8787/";
const out = process.argv[2];

(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const errors = [];
  const log = (step, x) => console.log(JSON.stringify({ step, ...x }));
  async function page(q) {
    const ctx = await b.createBrowserContext();
    const p = await ctx.newPage();
    await p.setViewport(process.env.PHONE ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
    await p.goto(BASE + q, { waitUntil: "networkidle0" });
    await sleep(1200);
    return p;
  }
  const act = (p, a) => p.evaluate((a) => document.querySelector(`#landCard [data-act="${a}"]`).click(), a);
  const screen = (p) => p.evaluate(() => ({
    scene: document.querySelector("#scene").classList.contains("on"), sign: Boolean(document.querySelector("#scene .s-sign")),
    land: !document.querySelector("#land").hidden, explore: !document.querySelector("#explore").hidden,
    visiting: document.documentElement.classList.contains("visiting"), step: (document.querySelector("#exploreCard h2") || {}).textContent
  }));

  // Mia shares her sample tree with one branch grown.
  const mia = await page("?mode=kids&kids=tree");
  await mia.keyboard.press("Escape"); await sleep(800);
  await mia.evaluate(() => document.querySelector("g.node.is-suggested").dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await sleep(1000); await mia.evaluate(() => document.querySelector('[data-correct="1"]').click()); await sleep(2500);
  await mia.keyboard.press("Escape"); await sleep(500);
  await mia.click("#groupBtn"); await sleep(500);
  await mia.type("#landNick", "Mia"); await mia.type("#landName", "Hogwarts Grade IV");
  await act(mia, "create"); await sleep(1000);
  const code = await mia.$eval(".land-code b", (e) => e.textContent);
  await act(mia, "ask-share"); await sleep(200); await act(mia, "share"); await sleep(1200);

  // Leo: welcome card → Young explorer → the seed, with the signpost.
  const leo = await page("?kids=garden");
  await leo.evaluate(() => [...document.querySelectorAll(".who-card")].find((x) => x.textContent.includes("Young explorer")).click());
  await sleep(1800);
  log("after Young explorer", await screen(leo));
  await leo.screenshot({ path: `${out}/1-seed-and-sign.png` });
  await leo.evaluate(() => document.querySelector("#scene .s-sign").dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await sleep(800);
  log("after the sign", await screen(leo));
  await leo.type("#landNick", "Leo"); await leo.type("#landCode", code);
  await act(leo, "join"); await sleep(1200);
  await leo.screenshot({ path: `${out}/2-land-from-sign.png` });
  log("leo's land", { text: await leo.evaluate(() => document.querySelector("#landCard").innerText.replace(/\s+/g, " ").slice(0, 300)) });
  await leo.evaluate(() => document.querySelector("[data-visit]").click()); await sleep(2500);
  log("visiting from the sign", await screen(leo));
  await leo.screenshot({ path: `${out}/3-visiting.png` });
  await leo.click("#visitBack"); await sleep(1500);
  log("back", await screen(leo));
  // Plant a new seed from the land.
  await leo.click("#groupBtn"); await sleep(1000);
  await act(leo, "plant"); await sleep(1800);
  log("plant a new seed", await screen(leo));
  await leo.evaluate(() => document.querySelector("#scene").dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await sleep(2600);
  log("tapped the seed", await screen(leo));
  await leo.screenshot({ path: `${out}/4-planting.png` });
  console.log(JSON.stringify({ errors }));
  await b.close();
})();
