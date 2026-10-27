// Shared helpers for the recordable demos: a visible full-screen Chrome with a fake mouse cursor
// that glides to each thing before clicking it, so a screen recording looks like a person using it.
const puppeteer = require("puppeteer-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CURSOR = `
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.id = "demoCursor";
    c.style.cssText = "position:fixed;left:50%;top:60%;width:22px;height:22px;margin:-3px 0 0 -3px;z-index:2147483647;pointer-events:none;transition:left .6s cubic-bezier(.3,.8,.3,1),top .6s cubic-bezier(.3,.8,.3,1)";
    c.innerHTML = '<svg viewBox="0 0 22 22" width="22" height="22"><path d="M3,2 L3,18 L7.5,14 L10.5,20.5 L13,19.5 L10,13 L16,13Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
  });`;

async function start(url, opts = {}) {
  const headless = Boolean(process.env.HEADLESS || opts.record);
  const view = opts.record ? { width: 1920, height: 1080 } : { width: 1440, height: 900 };
  const b = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    // HEADLESS=1 runs it invisibly at 1440×900 (for testing the script itself).
    headless: headless ? "new" : false,
    defaultViewport: headless ? view : null,
    ignoreDefaultArgs: ["--enable-automation"],
    args: ["--kiosk", "--no-first-run", "--no-default-browser-check", "--disable-infobars"]
  });
  const [p] = await b.pages();
  p.setDefaultTimeout(90000);
  await p.evaluateOnNewDocument(CURSOR);
  if (opts.beforeLoad) await opts.beforeLoad(p);
  if (url) await p.goto(url, { waitUntil: "domcontentloaded" });

  async function pointAt(box) {
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await p.evaluate((x, y) => { const c = document.getElementById("demoCursor"); if (c) { c.style.left = x + "px"; c.style.top = y + "px"; } }, x, y);
    await p.mouse.move(x, y, { steps: 12 });
    await sleep(500);
    return [x, y];
  }
  async function clickHandle(h) {
    await h.evaluate((el) => el.scrollIntoView({ block: "nearest" }));
    const box = await h.boundingBox();
    if (!box) throw new Error("nothing to click");
    const [x, y] = await pointAt(box);
    await p.mouse.click(x, y);
    await sleep(250);
  }
  const click = async (sel) => clickHandle(await p.waitForSelector(sel, { visible: true }));
  // Click the first element matching sel whose text contains `text`.
  const clickText = async (sel, text) => {
    const h = await p.evaluateHandle((sel, text) => [...document.querySelectorAll(sel)].find((x) => x.textContent.includes(text)), sel, text);
    if (!h.asElement()) throw new Error(`no ${sel} with "${text}"`);
    await clickHandle(h.asElement());
  };
  // Click a map node chosen by a test on its data (written as a function body over n).
  const clickNode = async (test) => {
    const h = await p.evaluateHandle((test) => {
      const f = new Function("n", `return (${test});`);
      return [...document.querySelectorAll("g.node")].find((g) => g.__data__ && f(g.__data__));
    }, test);
    if (!h.asElement()) return false;
    // The node's own centre (its label makes its box lopsided).
    const [x, y] = await h.evaluate((g) => { const m = g.getScreenCTM(); return [m.e, m.f]; });
    await pointAt({ x, y, width: 0, height: 0 });
    await p.mouse.click(x, y);
    await sleep(250);
    return true;
  };
  const type = async (sel, text, delay = 55) => {
    await click(sel);
    // Start from an empty box (the intake remembers answers between journeys).
    await p.$eval(sel, (el) => { el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); });
    await p.type(sel, text, { delay });
  };
  const choose = (text) => clickText(".choice, .chip", text);
  const next = () => click('[data-act="next"]');
  const waitMap = () => p.waitForFunction(() => !document.querySelector("#scene").classList.contains("on"), { timeout: 90000 });
  const esc = async () => { await p.keyboard.press("Escape"); await sleep(700); };
  // SHOTS=<dir>: save a screenshot at each named moment (testing only).
  let shotN = 0;
  const shot = async (name) => { if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/${String(++shotN).padStart(2, "0")}-${name}.png` }); };
  p.on("pageerror", (e) => console.error("page error:", e.message));
  return { b, p, sleep, shot, pointAt, clickHandle, click, clickText, clickNode, type, choose, next, waitMap, esc };
}

module.exports = { start, sleep };
