// Drives the Explorer demo in real Chrome and saves screenshots.
// Usage: node shoot.js <outDir> [scenario...]
const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = require("url").pathToFileURL(require("path").resolve(__dirname, "../../demo/index.html")).href;
const out = process.argv[2];
const wanted = process.argv.slice(3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickNode(page, id) {
  await page.evaluate((id) => {
    const el = [...document.querySelectorAll("g.node")].find((g) => g.__data__ && g.__data__.id === id);
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, id);
}

// Open the suggested node and answer it (correct option, a typed thought, or a claim).
async function answerSuggested(page) {
  const id = await page.evaluate(() => {
    const g = document.querySelector("g.node.is-suggested");
    return g && g.__data__.id;
  });
  if (!id) return console.log("  (no suggested node)");
  await clickNode(page, id);
  await sleep(1500);
  await page.evaluate(() => {
    const opt = document.querySelector('[data-correct="1"]');
    if (opt) return opt.click();
    const ta = document.querySelector("#thought");
    if (ta) {
      ta.value = "It connects to what I measure in the lab.";
      ta.dispatchEvent(new Event("input"));
      return document.querySelector('[data-act="reflect"]').click();
    }
    const b = document.querySelector('[data-act="claim"], [data-act="wonder"]');
    if (b) b.click();
  });
}

// Full sample run on the live server: build a map, explore three steps, ask an own question,
// screenshot each stage and save every generated node as JSON.
async function sampleRun(page, shot, o) {
  const fs = require("fs");
  page.setDefaultTimeout(90000);
  const t0 = Date.now();
  const log = [];
  const mark = (what) => log.push({ what, seconds: Math.round((Date.now() - t0) / 100) / 10 });
  await page.goto(`http://localhost:8787/?${o.url}&explore=1`);
  await sleep(1500);
  await page.type("#topicInput", o.topic);
  if (o.bg) await page.type("#bgInput", o.bg);
  if (o.age) await page.select("#ageSel", String(o.age));
  await shot(`${o.name}-1-topic`);
  await page.click("#exploreGo");
  await sleep(1800);
  await shot(`${o.name}-2-building`);
  await page.waitForSelector("#explore", { hidden: true });
  mark("map built");
  await sleep(2500);
  await shot(`${o.name}-3-first-map`);
  for (let i = 0; i < 3; i++) {
    await answerSuggested(page);
    if (i === 0) {
      await sleep(400);
      await shot(`${o.name}-4-answering`);
    }
    await sleep(11000);
  }
  mark("3 questions answered");
  await page.click("#panelClose").catch(() => {});
  await sleep(1500);
  await shot(`${o.name}-5-grown`);
  await page.click(o.url.includes("kids") ? "#canBtn" : "#askBtn");
  await sleep(400);
  await page.type("#askInput", o.ask);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector("g.node.own"), { timeout: 60000 }).catch(() => {});
  mark("own question added");
  await sleep(4000);
  const ownId = await page.evaluate(() => { const g = document.querySelector("g.node.own"); return g && g.__data__.id; });
  if (ownId) {
    await clickNode(page, ownId);
    await sleep(1600);
  }
  await shot(`${o.name}-6-own-question`);
  const nodes = await page.evaluate(() => [...document.querySelectorAll("g.node")].map((g) => {
    const n = g.__data__;
    return { id: n.id, parent: n.parent, depth: n.depth, kind: n.kind, state: n.state, own: !!n.own, d: n.d };
  }));
  const title = await page.$eval("#mapTitle", (e) => e.textContent);
  fs.writeFileSync(path.join(out, `${o.name}.json`), JSON.stringify({ topic: o.topic, background: o.bg, age: o.age, ask: o.ask, title, timings: log, nodes }, null, 2));
  console.log(`  ${o.name}: "${title}", ${nodes.length} nodes,`, log.map((l) => `${l.what} @${l.seconds}s`).join(", "));
}

const scenarios = {
  async researcherFlow(page, shot) {
    await page.goto(`${BASE}?mode=researcher&theme=gold`);
    await sleep(1500);
    await shot("a1-initial");
    await clickNode(page, "q1");
    await sleep(900);
    await page.type("#thought", "How oxygen vacancies move while I anneal my films.");
    await shot("a2-panel");
    await page.click('[data-act="reflect"]');
    await sleep(520);
    await shot("a3-burst");
    await sleep(2600);
    await shot("a4-revealed");
    await clickNode(page, "q2");
    await sleep(800);
    await page.click('.opt[data-correct="0"]');
    await sleep(500);
    await shot("a5-wrong");
    await page.click('.opt[data-correct="1"]');
    await sleep(3200);
    await shot("a6-after-q2");
  },
  async researcherAll(page, shot) {
    await page.goto(`${BASE}?mode=researcher&theme=gold&light=all`);
    await sleep(3200);
    await shot("b1-all-finale");
    await page.click('[data-act="close"]');
    await sleep(600);
    await clickNode(page, "k_cryst");
    await sleep(1400);
    await shot("b2-known-panel");
    await clickNode(page, "you");
    await sleep(1400);
    await shot("b3-you-panel");
  },
  async researcherBlue(page, shot) {
    await page.goto(`${BASE}?mode=researcher&theme=blue&light=q1,q2,q5,q4`);
    await sleep(1200);
    await clickNode(page, "e1");
    await sleep(1400);
    await shot("c1-blue-edge");
    await page.click('[data-act="claim"]');
    await sleep(2400);
    await shot("c2-blue-claimed");
  },
  async kidsDay(page, shot) {
    await page.goto(`${BASE}?mode=kids&theme=blue`);
    await sleep(1400);
    await shot("d1-kids-initial");
    await clickNode(page, "seed");
    await sleep(1000);
    await shot("d2-kids-panel");
    await page.click('.kid-opt[data-correct="1"]');
    await sleep(1500);
    await shot("d3-kids-bloom");
    await sleep(2200);
    await shot("d4-kids-sprouted");
  },
  async kidsNightAll(page, shot) {
    await page.goto(`${BASE}?mode=kids&theme=gold&light=all`);
    await sleep(2400);
    await shot("e1-night-finale");
    await page.click('[data-act="close"]');
    await sleep(800);
    await shot("e2-night-garden");
  },
  async tour(page, shot) {
    await page.goto(`${BASE}?mode=researcher&theme=gold`);
    await sleep(1200);
    await page.click("#tourBtn");
    await sleep(9000);
    await shot("g1-tour-9s");
    await sleep(14000);
    await shot("g2-tour-23s");
    const lit = await page.$eval("#litCount", (e) => e.textContent);
    console.log(`  tour lit after 23s: ${lit}`);
    await page.click("#tourBtn");
    await page.click("#settingsBtn");
    await sleep(400);
    await shot("g3-settings");
    await page.click('#modeSeg [data-mode="kids"]');
    await sleep(1500);
    await shot("g4-switched-kids");
    await page.click("#settingsBtn");
    await sleep(300);
    await page.select("#themeSel", "gold");
    await page.click('#modeSeg [data-mode="researcher"]');
  },
  async treeDay(page, shot) {
    await page.goto(`${BASE}?mode=kids&kids=tree&theme=blue`);
    await sleep(1400);
    await shot("t1-tree-initial");
    await clickNode(page, "seed");
    await sleep(1300);
    await shot("t2-tree-zoomed-in");
    await page.click('.kid-opt[data-correct="1"]');
    await sleep(1500);
    await shot("t3-tree-crown");
    await sleep(2600);
    await shot("t4-tree-zoomed-out");
    await clickNode(page, "wings");
    await sleep(1300);
    await page.click('.kid-opt[data-correct="1"]');
    await sleep(4200);
    await shot("t5-tree-two");
  },
  async treeNightAll(page, shot) {
    await page.goto(`${BASE}?mode=kids&kids=tree&theme=gold&light=all`);
    await sleep(2600);
    await shot("t6-tree-finale");
    await page.click('[data-act="close"]');
    await sleep(900);
    await shot("t7-tree-night");
    await page.goto(`${BASE}?mode=kids&kids=tree&theme=blue&light=all`);
    await sleep(2600);
    await page.click('[data-act="close"]');
    await sleep(900);
    await shot("t8-tree-day-all");
  },
  async zoomResearcher(page, shot) {
    await page.goto(`${BASE}?mode=researcher&theme=gold&light=q1`);
    await sleep(1200);
    await clickNode(page, "q2");
    await sleep(1300);
    await shot("z1-zoomed-in");
    await page.click('.opt[data-correct="1"]');
    await sleep(3000);
    await shot("z2-zoomed-out");
    await page.click("#panelClose");
    await sleep(1300);
    await shot("z3-closed");
  },
  async askKidsTree(page, shot) {
    await page.goto(`${BASE}?mode=kids&kids=tree&theme=blue&light=seed`);
    await sleep(1200);
    await page.click("#canBtn");
    await sleep(500);
    await page.type("#askInput", "How do helicopters fly?");
    await shot("k1-asker");
    await page.click("#askGo");
    await sleep(1900);
    await shot("k2-watering");
    await sleep(3000);
    await shot("k3-grown");
    const id = await page.evaluate(() => [...document.querySelectorAll("g.node.own")][0].__data__.id);
    await clickNode(page, id);
    await sleep(1300);
    await shot("k4-own-panel");
  },
  async askKidsWonder(page, shot) {
    await page.goto(`${BASE}?mode=kids&kids=garden&theme=gold&light=seed,wings`);
    await sleep(1200);
    await page.click("#canBtn");
    await sleep(400);
    await page.type("#askInput", "Do birds get tired when they fly?");
    await page.keyboard.press("Enter");
    await sleep(5200);
    await shot("k5-wonder-grown");
    const id = await page.evaluate(() => [...document.querySelectorAll("g.node.own")][0].__data__.id);
    await clickNode(page, id);
    await sleep(1300);
    await shot("k6-wonder-panel");
    await page.click('[data-act="wonder"]');
    await sleep(2500);
    await shot("k7-wonder-lit");
  },
  async askKidsExisting(page, shot) {
    await page.goto(`${BASE}?mode=kids&kids=tree&theme=blue&light=seed`);
    await sleep(1200);
    await page.click("#canBtn");
    await sleep(400);
    await page.type("#askInput", "How high can planes go?");
    await page.keyboard.press("Enter");
    await sleep(3500);
    await shot("k8-existing");
  },
  async askResearcher(page, shot) {
    await page.goto(`${BASE}?mode=researcher&theme=gold&light=q1,q2`);
    await sleep(1200);
    await page.click("#askBtn");
    await sleep(400);
    await page.type("#askInput", "How long does a DFT calculation take?");
    await shot("r1-asker");
    await page.click("#askGo");
    await sleep(1700);
    await shot("r2-comet");
    await sleep(3400);
    await shot("r3-new-star");
    const id = await page.evaluate(() => [...document.querySelectorAll("g.node.own")][0].__data__.id);
    await clickNode(page, id);
    await sleep(1400);
    await shot("r4-own-panel");
    await page.click("#panelClose");
    await sleep(500);
    await page.click("#askBtn");
    await sleep(300);
    await page.type("#askInput", "How do I find a mentor in the department?");
    await page.keyboard.press("Enter");
    await sleep(5200);
    await shot("r5-fallback");
  },
  async ship(page, shot) {
    await page.goto(`${BASE}?mode=researcher&theme=gold&light=q1,q2`);
    await sleep(1500);
    await shot("s1-docked");
    await clickNode(page, "q5");
    await sleep(550);
    await shot("s2-flying");
    await sleep(1300);
    await shot("s3-arrived");
    await page.goto(`${BASE}?mode=researcher&theme=blue&light=q1,q2`);
    await sleep(1200);
    await clickNode(page, "q3");
    await sleep(600);
    await shot("s4-blue-flying");
  },
  async aiMock(page, shot) {
    // Real local server, but /api/* replies are faked so no API key or credit is used.
    let sent = null;
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      if (r.url().endsWith("/api/health")) return r.respond({ contentType: "application/json", body: JSON.stringify({ ai: true, model: "claude-haiku-5-5" }) });
      if (r.url().endsWith("/api/ask")) {
        sent = JSON.parse(r.postData());
        return setTimeout(() => r.respond({ contentType: "application/json", body: JSON.stringify({
          safe: true, parentId: "birds", related: ["wings"], ai: "mock",
          spec: { label: "Why do birds fly in a V?", emoji: "🪿", question: "Why do some birds fly in a V shape?",
            life: "Riding your bike right behind a friend feels easier, doesn't it?",
            task: { prompt: "Why does the V help the birds?", options: ["🌬️ Each bird gets a lift from the air behind the one in front", "🎨 It looks pretty", "📏 They like letters"], answer: 0, explain: "Each bird rides the swirling air from the bird ahead, so flying is easier!" } }
        }) }), 900);
      }
      r.continue();
    });
    await page.goto("http://localhost:8787/?mode=kids&kids=tree&theme=blue&light=seed");
    await sleep(1500);
    await page.click("#settingsBtn");
    await sleep(300);
    await shot("m1-settings-ai-on");
    await page.click("#settingsBtn");
    await page.click("#canBtn");
    await sleep(400);
    await page.type("#askInput", "Why do geese fly in a V?");
    await page.keyboard.press("Enter");
    await sleep(700);
    await shot("m2-thinking");
    await sleep(4600);
    await shot("m3-ai-node");
    console.log("  sent nodes:", sent && sent.nodes.length, "root:", sent && sent.rootId, "mode:", sent && sent.mode);
    const id = await page.evaluate(() => [...document.querySelectorAll("g.node.own")][0].__data__.id);
    await clickNode(page, id);
    await sleep(1300);
    await shot("m4-ai-panel");
  },
  async aiOff(page, shot) {
    await page.goto("http://localhost:8787/?mode=researcher&theme=gold&light=q1");
    await sleep(1500);
    await page.click("#askBtn");
    await sleep(300);
    await page.type("#askInput", "How do I find a mentor in the department?");
    await page.keyboard.press("Enter");
    await sleep(5000);
    await shot("o1-fallback-node");
    const n = await page.$$eval("g.node.own", (a) => a.length);
    console.log("  own nodes:", n, "status:", await page.$eval("#aiStatus", (e) => e.textContent));
  },
  async exploreR(page, shot) {
    page.setDefaultTimeout(60000);
    await page.goto("http://localhost:8787/?mode=researcher&theme=gold&explore=1");
    await sleep(1500);
    await page.type("#topicInput", "Machine learning interatomic potentials");
    await page.type("#bgInput", "Experimental materials PhD student: XRD, SEM, thin-film synthesis, annealing. Some Python.");
    await shot("x1-card");
    await page.click("#exploreGo");
    await sleep(2500);
    await shot("x2-building");
    await page.waitForSelector("#explore", { hidden: true });
    await sleep(2500);
    await shot("x3-map");
    await answerSuggested(page);
    await sleep(14000);
    await shot("x4-grown");
    await answerSuggested(page);
    await sleep(14000);
    await shot("x5-grown2");
    console.log("  nodes:", await page.evaluate(() => document.querySelectorAll("g.node").length), "progress:", await page.$eval("#progress", (e) => e.textContent.replace(/\s+/g, " ")));
  },
  async exploreK(page, shot) {
    page.setDefaultTimeout(60000);
    await page.goto("http://localhost:8787/?mode=kids&kids=tree&theme=blue&explore=1");
    await sleep(1500);
    await page.type("#topicInput", "volcanoes");
    await page.click("#exploreGo");
    await sleep(2000);
    await shot("y1-building");
    await page.waitForSelector("#explore", { hidden: true });
    await sleep(2500);
    await shot("y2-map");
    await answerSuggested(page);
    await sleep(5000);
    await answerSuggested(page);
    await sleep(14000);
    await shot("y3-grown");
    await page.click("#canBtn");
    await sleep(400);
    await page.type("#askInput", "Do volcanoes exist on other planets?");
    await page.keyboard.press("Enter");
    await sleep(16000);
    await shot("y4-own");
  },
  sampleRainbow: (page, shot) => sampleRun(page, shot, {
    name: "kids-rainbow", url: "mode=kids&kids=garden&theme=blue", topic: "rainbow", age: 7,
    ask: "Can you touch a rainbow?"
  }),
  sampleSnow: (page, shot) => sampleRun(page, shot, {
    name: "kids-snow", url: "mode=kids&kids=tree&theme=gold", topic: "snow", age: 9,
    ask: "Why is snow white?"
  }),
  sampleResearcher: (page, shot) => sampleRun(page, shot, {
    name: "researcher-protein", url: "mode=researcher&theme=gold", topic: "Protein structure prediction (AlphaFold)",
    bg: "Statistician, postdoc: Bayesian hierarchical models, MCMC, time series, R and some Python.",
    ask: "How is the confidence score of a predicted structure calibrated?"
  }),
  async intakeR(page, shot) {
    page.setDefaultTimeout(120000);
    const pick = (label) => page.evaluate((l) => {
      const b = [...document.querySelectorAll(".choice, .who-card")].find((x) => x.textContent.includes(l));
      if (!b) throw new Error("no choice " + l);
      b.click();
    }, label);
    const next = () => page.click('[data-act="next"]');
    await page.goto("http://localhost:8787/");
    await sleep(1800);
    await shot("r-0-welcome");
    await pick("Researcher or learner");
    await sleep(500);
    await pick("PhD student");
    await shot("r-1-level");
    await next(); await sleep(400);
    await pick("Materials science"); await pick("Chemistry");
    await page.type('[data-field="expertise"]', "thin-film growth, XRD, SEM, annealing studies");
    await shot("r-2-expertise");
    await next(); await sleep(400);
    await pick("Coding"); await pick("Baking"); await pick("Strategy games");
    await shot("r-3-skills");
    await next(); await sleep(400);
    await page.type('[data-field="topic"]', "Machine learning interatomic potentials");
    await pick("A little");
    await page.type('[data-field="knownText"]', "I know they replace DFT to run bigger MD, but not how they are trained or how far to trust them.");
    await pick("Collaboration"); await pick("A paper");
    await shot("r-4-topic");
    await next(); await sleep(400);
    const input = await page.$("#in-files");
    await input.uploadFile(require("path").resolve(__dirname, "../../samples/demo/group-onboarding-notes.txt"));
    await sleep(800);
    await page.type('[data-field="notes"]', "A groupmate will present this at group meeting next week; I want to ask good questions.");
    await shot("r-5-materials");
    await next();
    await sleep(2500);
    await shot("r-6-building");
    await page.waitForSelector("#explore", { hidden: true });
    await sleep(3000);
    await shot("r-7-your-path");
    await answerSuggested(page);
    await sleep(13000);
    await page.click("#panelClose").catch(() => {});
    await sleep(1500);
    await shot("r-8-grown");
    const prof = await page.evaluate(() => {
      const you = [...document.querySelectorAll("g.node")].map((g) => g.__data__).find((n) => n.kind === "you");
      return [...document.querySelectorAll("g.node")].map((g) => `${g.__data__.kind}: ${g.__data__.d.label}`);
    });
    console.log("  nodes:\n   " + prof.join("\n   "));
  },
  async intakeK(page, shot) {
    page.setDefaultTimeout(90000);
    const pick = (label) => page.evaluate((l) => {
      const b = [...document.querySelectorAll(".choice, .who-card")].find((x) => x.textContent.includes(l));
      if (!b) throw new Error("no choice " + l);
      b.click();
    }, label);
    const next = () => page.click('[data-act="next"]');
    await page.goto("http://localhost:8787/");
    await sleep(1800);
    await pick("Young explorer");
    await sleep(800);
    await pick("7");
    await shot("k-1-age");
    await next(); await sleep(400);
    await pick("Animals"); await pick("Drawing"); await pick("Baking");
    await shot("k-2-loves");
    await next(); await sleep(400);
    await page.type('[data-field="topic"]', "rainbows");
    await pick("Growing tree");
    await sleep(800);
    await shot("k-3-topic");
    await next();
    await page.waitForSelector("#explore", { hidden: true });
    await sleep(2500);
    await shot("k-4-map");
    await answerSuggested(page);
    await sleep(12000);
    await shot("k-5-grown");
    const n = await page.evaluate(() => [...document.querySelectorAll("g.node")].map((g) => g.__data__.d.label + " | " + (g.__data__.d.life || "")));
    console.log("  kids nodes:\n   " + n.join("\n   "));
  },
  async sampleStillWorks(page, shot) {
    await page.goto("http://localhost:8787/?sample=1&mode=researcher&theme=gold");
    await sleep(1500);
    console.log("  intake hidden on sample link:", await page.$eval("#explore", (e) => e.hidden));
  },
  async journeyR(page, shot) {
    page.setDefaultTimeout(120000);
    const pick = (label) => page.evaluate((l) => {
      const b = [...document.querySelectorAll(".choice, .who-card")].find((x) => x.textContent.includes(l));
      if (!b) throw new Error("no choice " + l);
      b.click();
    }, label);
    const next = () => page.click('[data-act="next"]');
    await page.goto("http://localhost:8787/");
    await sleep(1500);
    await pick("Researcher or learner");
    await sleep(1200);
    await shot("jr-1-opening");
    await page.click("#scene");
    await sleep(700);
    await shot("jr-2-zooming");
    await sleep(2200);
    await shot("jr-3-earth");
    await pick("PhD student"); await next(); await sleep(2200);
    await shot("jr-4-first-star");
    await pick("Materials science"); await pick("Chemistry"); await next(); await sleep(2000);
    await pick("Coding"); await pick("Baking"); await next(); await sleep(2200);
    await shot("jr-5-three-stars");
    await page.type('[data-field="topic"]', "Machine learning interatomic potentials");
    await pick("A little"); await pick("Collaboration");
    await next(); await sleep(2400);
    await shot("jr-6-topic-star");
    await page.click('[data-act="back"]'); await sleep(900);
    await shot("jr-7-after-back");
    await next(); await sleep(2000);
    await next();
    await sleep(3500);
    await shot("jr-8-building");
    await page.waitForFunction(() => !document.querySelector("#scene").classList.contains("on"));
    await sleep(1800);
    await shot("jr-9-map-with-earth");
  },
  async journeyK(page, shot) {
    page.setDefaultTimeout(120000);
    const pick = (label) => page.evaluate((l) => {
      const b = [...document.querySelectorAll(".choice, .who-card")].find((x) => x.textContent.includes(l));
      if (!b) throw new Error("no choice " + l);
      b.click();
    }, label);
    const next = () => page.click('[data-act="next"]');
    await page.goto("http://localhost:8787/?kids=garden&theme=blue");
    await sleep(1500);
    await pick("Young explorer");
    await sleep(1200);
    await shot("jk-1-opening");
    await page.click("#scene");
    await sleep(3000);
    await shot("jk-2-seed");
    await pick("7"); await next(); await sleep(1800);
    await shot("jk-3-sprout");
    await pick("Animals"); await pick("Space"); await pick("Baking"); await next(); await sleep(1800);
    await shot("jk-4-leaves");
    await page.type('[data-field="topic"]', "snow");
    await next();
    await sleep(2500);
    await shot("jk-5-bud-building");
    await page.waitForFunction(() => !document.querySelector("#scene").classList.contains("on"));
    await sleep(1800);
    await shot("jk-6-map");
  },
  async openingTree(page, shot) {
    await page.goto("http://localhost:8787/?kids=tree&theme=gold");
    await sleep(1500);
    await page.evaluate(() => [...document.querySelectorAll(".who-card")][1].click());
    await sleep(1400);
    await shot("jt-1-tree-opening-night");
  },
  async mobile(page, shot) {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`${BASE}?mode=researcher&theme=gold&light=q1,q2`);
    await sleep(1200);
    await clickNode(page, "q5");
    await sleep(1400);
    await shot("f1-mobile");
  }
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"] });
  const names = wanted.length ? wanted : Object.keys(scenarios);
  for (const name of names) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => console.log(`[${name}] PAGE ERROR: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(`[${name}] console.${m.type()}: ${m.text()}`); });
    const shot = (file) => page.screenshot({ path: path.join(out, `${file}.png`) });
    try {
      await scenarios[name](page, shot);
      console.log(`${name}: ok`);
    } catch (e) {
      console.log(`${name}: FAILED ${e.message}`);
    }
    await page.close();
  }
  await browser.close();
})();
