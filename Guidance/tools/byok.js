// Tests "use your own API key" in Settings against a server that has no key of its own.
// Usage: node byok.js <outDir> [baseUrl]   (the real key is read from the project's .env and never printed)
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = process.argv[2];
const BASE = process.argv[3] || "http://localhost:8788/";
const KEY = (fs.readFileSync(require("path").resolve(__dirname, "../../.env"), "utf8").match(/^ANTHROPIC_API_KEY=(.+)$/m) || [])[1].trim().replace(/^["']|["']$/g, "");
const hide = (s) => String(s).split(KEY).join("[KEY]");

(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  p.setDefaultTimeout(120000);
  p.on("pageerror", (e) => console.log("PAGEERROR", hide(e.message)));
  const say = async (label) => console.log(label, hide(JSON.stringify(await p.evaluate(() => ({
    status: document.querySelector("#aiStatus").textContent,
    keyText: document.querySelector("#keyText").textContent,
    note: document.querySelector("#keyNote").textContent,
    entryShown: !document.querySelector("#keyEntry").hidden,
    stored: { session: Boolean(sessionStorage.getItem("explorer-api-key")), local: Boolean(localStorage.getItem("explorer-api-key")) }
  })))));
  const openSettings = () => p.evaluate(() => { const s = document.querySelector("#settings"); if (s.hidden) document.querySelector('#settingsBtn').click(); });

  await p.goto(BASE + "?mode=researcher&sample=1");
  await sleep(2500);
  await openSettings();
  await sleep(500);
  await say("1 start (server has no key)");
  await p.screenshot({ path: `${out}/k-1-settings.png` });

  await p.type("#keyInput", "not-a-key");
  await p.click("#keyUse"); await sleep(400);
  await say("2 junk text");
  await p.$eval("#keyInput", (el) => { el.value = ""; });
  await p.type("#keyInput", ["sk", "ant", "api03", "this-is-not-a-real-key-000000000000"].join("-"));
  await p.click("#keyUse"); await sleep(3000);
  await say("3 wrong key");

  await p.$eval("#keyInput", (el) => { el.value = ""; });
  await p.type("#keyInput", KEY);
  await p.click("#keyUse"); await sleep(3000);
  await say("4 real key");
  await p.screenshot({ path: `${out}/k-2-key-in-use.png` });

  // Build a research map on the keyless server: only possible with the visitor's key.
  await p.evaluate(() => document.querySelector("#exploreBtn").click());
  await sleep(1200);
  const pick = (l) => p.evaluate((l) => [...document.querySelectorAll(".choice, .who-card")].find((x) => x.textContent.includes(l)).click(), l);
  const next = () => p.evaluate(() => document.querySelector('[data-act="next"]').click());
  await pick("Researcher or learner"); await sleep(1500);
  await p.click("#scene"); await sleep(3000);
  await pick("Postdoc"); await next(); await sleep(1500);
  await pick("Computer science"); await next(); await sleep(1500);
  await next(); await sleep(1500);
  await p.type('[data-field="topic"]', "Battery degradation"); await next(); await sleep(1500);
  const t = Date.now();
  await next();
  await p.waitForFunction(() => !document.querySelector("#scene").classList.contains("on"), { timeout: 90000 }).catch(() => {});
  await sleep(2500);
  console.log("5 map with own key:", Math.round((Date.now() - t) / 1000) + "s", hide(await p.evaluate(() => [...document.querySelectorAll("g.node")].map((g) => g.textContent.trim()).filter(Boolean).slice(0, 5).join(" | "))));
  console.log("  intake note:", hide(await p.evaluate(() => (document.querySelector("#intakeNote") || {}).textContent || "")));
  await p.screenshot({ path: `${out}/k-3-map.png` });

  // Kids mode never uses the visitor's key, and Settings hides the field there.
  await p.goto(BASE + "?mode=kids&sample=1"); await sleep(2500);
  await openSettings(); await sleep(400);
  console.log("6 kids:", hide(JSON.stringify(await p.evaluate(() => ({ status: document.querySelector("#aiStatus").textContent, fieldVisible: getComputedStyle(document.querySelector("#keyRow")).display !== "none" })))));

  // Remove the key.
  await p.goto(BASE + "?mode=researcher&sample=1"); await sleep(2500);
  await openSettings(); await sleep(400);
  await say("7 after reload (same tab)");
  await p.click("#keyRemove"); await sleep(300);
  await say("8 removed");
  await b.close();
})();
