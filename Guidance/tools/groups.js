// Group lands check (kids): two separate browsers act as two children.
// Mia makes a land and shares her tree; Leo joins with the code, shares his garden, visits Mia's tree
// and comes back to his own. Usage: node groups.js <outDir>
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || "http://localhost:8787/";
const out = process.argv[2];

(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const errors = [];
  const log = (step, x) => console.log(JSON.stringify({ step, ...x }));
  async function child(world) {
    const ctx = await b.createBrowserContext();
    const p = await ctx.newPage();
    await p.setViewport(process.env.PHONE ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
    await p.goto(`${BASE}?mode=kids&kids=${world}`, { waitUntil: "networkidle0" });
    await sleep(1200);
    await p.keyboard.press("Escape");
    await sleep(1000);
    return p;
  }
  const state = (p) => p.evaluate(() => {
    const all = [...document.querySelectorAll("g.node")].map((g) => g.__data__);
    return { title: document.querySelector("#mapTitle").textContent, progress: document.querySelector("#litCount").textContent + "/" + document.querySelector("#totalCount").textContent,
      lit: all.filter((n) => n.state === "lit" && n.kind !== "fact").length, facts: all.filter((n) => n.kind === "fact").length,
      skin: document.querySelector("#graph").dataset.skin, visiting: document.documentElement.classList.contains("visiting") };
  });
  async function answer(p) {
    await p.evaluate(() => document.querySelector("g.node.is-suggested").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await sleep(1200);
    await p.evaluate(() => document.querySelector('[data-correct="1"]').click());
    await sleep(2500);
    await p.keyboard.press("Escape");
    await sleep(800);
  }
  const act = (p, a) => p.evaluate((a) => document.querySelector(`#landCard [data-act="${a}"]`).click(), a);
  const text = (p) => p.evaluate(() => document.querySelector("#landCard").innerText.replace(/\s+/g, " ").slice(0, 400));

  // Mia: grows two flowers and a fun fact on the sample tree, makes a land, shares.
  const mia = await child("tree");
  await answer(mia); await answer(mia);
  await mia.click("#fertBtn"); await sleep(300); await mia.click("#fertGo"); await sleep(6500); await mia.keyboard.press("Escape"); await sleep(800);
  log("mia before", await state(mia));
  await mia.click("#groupBtn"); await sleep(600);
  await mia.screenshot({ path: `${out}/1-setup.png` });
  await mia.type("#landNick", "Mia");
  await mia.evaluate(() => document.querySelector('[data-avatar="🦊"]').click());
  await mia.type("#landName", "Hogwarts Grade IV");
  await act(mia, "create"); await sleep(1200);
  const code = await mia.$eval(".land-code b", (e) => e.textContent);
  log("land made", { code, card: await text(mia) });
  await mia.screenshot({ path: `${out}/2-empty-land.png` });
  await act(mia, "ask-share"); await sleep(300);
  await mia.screenshot({ path: `${out}/3-confirm.png` });
  await act(mia, "share"); await sleep(1500);
  log("mia shared", { card: await text(mia) });

  // Leo: grows one flower in his garden, joins with the code, shares, visits Mia.
  const leo = await child("garden");
  await answer(leo);
  await leo.click("#groupBtn"); await sleep(600);
  await leo.type("#landNick", "Leo");
  await leo.evaluate(() => document.querySelector('[data-avatar="🐢"]').click());
  await leo.type("#landCode", code.toLowerCase());
  await act(leo, "join"); await sleep(1500);
  await act(leo, "ask-share"); await sleep(300); await act(leo, "share"); await sleep(1500);
  log("leo shared", { card: await text(leo) });
  await leo.screenshot({ path: `${out}/4-two-gardens.png` });
  const leoBefore = await state(leo);
  const miaId = await leo.evaluate(() => [...document.querySelectorAll(".plot")].find((x) => x.textContent.includes("Mia")).querySelector("[data-visit]").dataset.visit);
  await leo.evaluate((id) => document.querySelector(`[data-visit="${id}"]`).click(), miaId);
  await sleep(2500);
  log("leo visiting mia", await state(leo));
  await leo.screenshot({ path: `${out}/5-visiting.png` });
  // Open Mia's fun fact while visiting.
  await leo.evaluate(() => document.querySelector("g.node.kind-fact").dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await sleep(1500);
  log("mia's fact, seen by leo", { panel: await leo.evaluate(() => document.querySelector("#panelBody").innerText.replace(/\s+/g, " ").slice(0, 200)) });
  await leo.screenshot({ path: `${out}/6-visiting-fact.png` });
  await leo.keyboard.press("Escape"); await sleep(600);
  await leo.click("#visitBack"); await sleep(2000);
  const leoAfter = await state(leo);
  log("leo back home", { before: leoBefore, after: leoAfter, same: leoBefore.lit === leoAfter.lit && leoBefore.progress === leoAfter.progress && leoAfter.skin === "garden" });

  // Mia sees Leo's garden, then takes hers away.
  await mia.evaluate(() => document.querySelector('#landCard [data-act="close"]').click());
  await mia.click("#groupBtn"); await sleep(1200);
  log("mia sees", { card: await text(mia) });
  await act(mia, "unshare"); await sleep(1500);
  log("mia took hers away", { card: await text(mia) });
  console.log(JSON.stringify({ errors }));
  await b.close();
})();
