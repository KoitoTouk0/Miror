const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  const out = process.argv[2];
  const pick = (l) => p.evaluate((l) => [...document.querySelectorAll(".choice, .who-card")].find((x) => x.textContent.includes(l)).click(), l);
  const next = () => p.evaluate(() => document.querySelector('[data-act="next"]').click());
  await p.goto("https://explorer-mindflow.netlify.app/", { waitUntil: "networkidle2" });
  await sleep(1500); await p.screenshot({ path: `${out}/m-1-welcome.png` });
  await pick("Researcher or learner"); await sleep(1500); await p.screenshot({ path: `${out}/m-2-opening.png` });
  await p.tap("#scene"); await sleep(3200); await p.screenshot({ path: `${out}/m-3-earth-intake.png` });
  await pick("PhD student"); await next(); await sleep(2000); await p.screenshot({ path: `${out}/m-4-first-star.png` });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log("horizontal overflow:", overflow);
  await b.close();
})();
