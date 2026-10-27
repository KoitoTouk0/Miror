// Recordable interest demo (~2-2.5 min): the opening, the sample tree (a question + a fun fact), then a
// live random topic (plant, two questions, ask your own, a fun fact) and Our land. Start a screen
// recording, then run:  node demo-interest.js
// Options: TOPIC="Why do cats purr?" ASK="Can cats see in the dark?" NICK=Ryan LAND="Ryan's birthday garden"
const { start } = require("./demo-lib");
const BASE = process.env.BASE || "http://localhost:8787/";
const TOPIC = process.env.TOPIC || "Why do cats purr?";
const ASK = process.env.ASK || "Can cats see in the dark?";
const NICK = process.env.NICK || "Ryan";
const LAND = process.env.LAND || "Ryan's birthday garden";

(async () => {
  const d = await start(BASE + "?theme=gold");
  const { p, sleep } = d;
  const answer = async () => {
    if (!(await d.clickNode('n.state === "open" && n.kind !== "fact" && document.querySelector("g.node.is-suggested") && n.id === document.querySelector("g.node.is-suggested").__data__.id'))) return;
    await sleep(3500);
    await d.click('[data-correct="1"], [data-act="wonder"]').catch(() => {});
    await sleep(4500);
    await d.esc();
  };
  const funFact = async () => {
    await d.click("#fertBtn"); await sleep(1500);
    await d.click("#fertGo");
    await p.waitForFunction(() => document.querySelector("#panel.open .fact-badge"), { timeout: 45000 });
    await sleep(5000);
    await d.shot("fact");
    await d.esc();
  };
  // The opening plays, then the land's panel and the sample tree.
  await sleep(5200);
  await d.click(".c-land .c-title-land").catch(() => d.click(".c-land"));
  await sleep(3500);
  await d.click('[data-intro="sample"]');
  await sleep(2500);
  await answer();
  await funFact();
  // A live random topic.
  await d.click("#exploreBtn"); await sleep(2000);
  await d.click(".c-land .c-title-land").catch(() => d.click(".c-land"));
  await sleep(2000);
  await d.click('[data-intro="start"]'); await sleep(3200);
  await d.choose("8"); await d.next(); await sleep(2600);
  await d.choose("Animals"); await d.choose("Space"); await d.next(); await sleep(4200);
  await d.type('[data-field="topic"]', TOPIC, 70);
  await sleep(600);
  await d.next();
  await d.waitMap();
  await sleep(2500);
  await answer();
  await answer();
  const own = () => p.evaluate(() => document.querySelectorAll("g.node.own").length);
  const before = await own();
  await d.click("#canBtn"); await sleep(1000);
  await d.type("#askInput", ASK, 65);
  await d.click("#askGo");
  await p.waitForFunction((b) => document.querySelectorAll("g.node.own").length > b, { timeout: 45000 }, before).catch(() => {});
  await sleep(4500);
  await d.shot("asked");
  await d.esc();
  await funFact();
  // Our land: a garden for the family and friends.
  await d.click("#groupBtn"); await sleep(1500);
  await d.type("#landNick", NICK, 80);
  await d.click('[data-avatar="🦖"]');
  await d.type("#landName", LAND, 50);
  await d.click('#landCard [data-act="create"]'); await sleep(2500);
  await d.click('#landCard [data-act="ask-share"]'); await sleep(2500);
  await d.click('#landCard [data-act="share"]'); await sleep(5000);
  await d.shot("land");
  console.log("Interest demo finished. Chrome stays open: stop the recording, then Cmd+Q.");
  if (process.env.HEADLESS) await d.b.close(); else d.b.disconnect();
})().catch((e) => { console.error("Demo stopped:", e.message); process.exit(1); });
