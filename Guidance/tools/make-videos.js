// Records the video's screen clips by itself, one MP4 per part of Video_script_final.docx, into
// Video_clips/ (1920×1080, no screen-recording permission needed). Uses the local server.
//   node make-videos.js
// Waits for the AI stay in (cut them in your editor). NICK = your nickname in the family land.
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const { start, sleep } = require("./demo-lib");
const BASE = process.env.BASE || "http://localhost:8787/";
const OUT = path.resolve(__dirname, "../../Video_clips");
const FILE = path.resolve(__dirname, "../../samples/demo/group-onboarding-notes.txt");
const NICK = process.env.NICK || "Big cousin";
fs.mkdirSync(OUT, { recursive: true });

const api = (u, b) => fetch(new URL(u, BASE), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then((r) => r.json());

// The family land with Ryan's tree in it, made through the API before recording.
async function makeLand() {
  const land = await api("/api/group", { action: "create", name: "Our family land" });
  const m = await api("/api/map", { mode: "kids", topic: "Could I ever have an invisibility cloak?", profile: { age: 8, loves: ["Space", "Stories"] } });
  const nodes = m.dataset.nodes;
  const f = await api("/api/fact", { mode: "kids", topic: m.dataset.topic, age: 8, loves: ["Space", "Stories"], rootId: "root",
    nodes: nodes.map((n) => ({ id: n.id, label: n.label, kind: "core", state: "open" })), told: [] });
  if (f.fact) nodes.push(Object.assign({ id: "fact-ryan", parent: f.parentId, kind: "fact", lit: true }, f.fact));
  await api("/api/group", { action: "share", code: land.code, secret: "ryan-".padEnd(32, "x"), nickname: "Ryan", avatar: "🦖",
    garden: { title: m.dataset.title, style: "tree", nodes, lit: nodes.filter((n) => n.kind !== "fact").slice(0, 3).map((n) => n.id) } });
  return land;
}

// ONLY=part6 (comma-separated) re-records just those clips.
const want = (n) => !process.env.ONLY || process.env.ONLY.split(",").some((o) => n.startsWith(o));

(async () => {
  const land = want("part5") ? await makeLand() : { code: "", name: "" };
  if (land.code) console.log(`Family land ready: ${land.name} (${land.code}), with Ryan's tree.`);
  const d = await start(null, {
    record: true,
    beforeLoad: (p) => p.evaluateOnNewDocument((land, nick) => {
      if (!localStorage.getItem("explorer.groups")) {
        localStorage.setItem("explorer.groups", JSON.stringify({ secret: "me-".padEnd(32, "y"), nickname: nick, avatar: "🦉",
          lands: [{ code: land.code, name: land.name }], current: land.code, mine: {} }));
      }
    }, land, NICK)
  });
  const { p } = d;
  let rec = null, name = "";
  const clip = async (n) => { name = n; rec = await p.screencast({ path: path.join(OUT, `${n}.webm`), ffmpegPath: ffmpeg }); console.log("recording", n); };
  const cut = async () => {
    await rec.stop();
    const webm = path.join(OUT, `${name}.webm`), mp4 = path.join(OUT, `${name}.mp4`);
    execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "veryfast", "-r", "30", mp4]);
    fs.unlinkSync(webm);
    console.log("saved", mp4);
  };
  const answer = async () => {
    if (!(await d.clickNode('n.state === "open" && n.id === document.querySelector("g.node.is-suggested").__data__.id'))) return;
    await sleep(3500);
    await d.click('[data-correct="1"], [data-act="wonder"]').catch(() => {});
    await sleep(4500);
    await d.esc();
  };

  if (!want("part1")) {
    await p.goto(BASE + "?theme=gold&kids=tree", { waitUntil: "domcontentloaded" });
    await sleep(6000);
  }
  const at = async (sel) => { const b = await (await p.$(sel)).boundingBox(); await d.pointAt(b); };
  // Parts 1-3: the opening, then hovering the land and the sky.
  if (want("part1")) {
  await p.goto("about:blank");
  await clip("part1-3_opening");
  await p.goto(BASE + "?theme=gold&kids=tree", { waitUntil: "domcontentloaded" });
  await sleep(13000);
  await at(".c-land .c-title-land"); await sleep(3500);
  await at(".c-sky .c-title-sky"); await sleep(3500);
  await at(".c-land .c-title-land"); await sleep(1500);
  await cut();
  }

  // Part 4: interest exploration with a live topic.
  if (want("part4")) {
  await clip("part4_interest");
  await d.click(".c-land .c-title-land"); await sleep(3000);
  await d.click('[data-intro="start"]'); await sleep(3200);
  await d.choose("8"); await d.next(); await sleep(2600);
  await d.choose("Animals"); await d.choose("Stories"); await d.choose("Experiments"); await d.next(); await sleep(4300);
  await d.choose("Rainbows"); await sleep(400); await d.choose("Growing tree"); await sleep(800);
  await d.next();
  await d.waitMap(); await sleep(2500);
  await answer();
  const own = () => p.evaluate(() => document.querySelectorAll("g.node.own").length);
  const before = await own();
  await d.click("#canBtn"); await sleep(1000);
  await d.type("#askInput", "Can I wear a rainbow as a scarf?", 65);
  await d.click("#askGo");
  await p.waitForFunction((b) => document.querySelectorAll("g.node.own").length > b, { timeout: 45000 }, before).catch(() => {});
  await sleep(5000); await d.esc();
  await d.click("#fertBtn"); await sleep(1500); await d.click("#fertGo");
  await p.waitForFunction(() => document.querySelector("#panel.open .fact-badge"), { timeout: 45000 }).catch(() => {});
  await sleep(6000); await d.esc();
  await cut();
  }

  // Part 5: our family land, visiting Ryan's tree.
  if (want("part5")) {
  await clip("part5_land");
  await d.click("#groupBtn"); await sleep(2500);
  await d.click('#landCard [data-act="ask-share"]').catch(() => {}); await sleep(2500);
  await d.click('#landCard [data-act="share"]').catch(() => {}); await sleep(3500);
  await d.clickHandle((await p.evaluateHandle(() => [...document.querySelectorAll(".plot")].find((x) => x.textContent.includes("Ryan")).querySelector("[data-visit]"))).asElement());
  await sleep(4000);
  await d.clickNode('n.kind === "fact"'); await sleep(5000); await d.esc();
  await d.click("#visitBack"); await sleep(3000);
  await cut();
  }

  // Part 6: research extension.
  if (want("part6")) {
  await clip("part6_research");
  await d.click("#exploreBtn"); await sleep(2500);
  await d.click(".c-sky .c-title-sky"); await sleep(3000);
  await d.click('[data-intro="start"]'); await sleep(3300);
  await d.choose("PhD student"); await d.next(); await sleep(1800);
  await d.choose("Materials science");
  await d.type('[data-field="expertise"]', "Experimental: thin films, XRD, SEM, annealing", 25);
  await d.next(); await sleep(1800);
  await d.choose("Lab work"); await d.choose("Data analysis"); await d.next(); await sleep(1800);
  await d.type('[data-field="topic"]', "DFT simulation of materials", 30);
  await d.choose("A little"); await d.choose("A project or proposal");
  await d.next(); await sleep(1800);
  await (await p.$("#in-files")).uploadFile(FILE); await sleep(1500);
  await d.type('[data-field="notes"]', "I just moved from an experimental lab into a simulation group.", 18);
  await d.next();
  await d.waitMap();
  await sleep(7000); await d.esc();
  if (await d.clickNode('n.depth === 1 && /^Principle/i.test(n.d.label)')) { await sleep(4500); await d.esc(); }
  if (await d.clickNode('n.depth === 1 && /^Application/i.test(n.d.label)')) { await sleep(4500); await d.esc(); }
  if (await d.clickNode('n.kind === "edge" && n.state !== "hidden"')) {
    await sleep(7000);
    await d.click('[data-act="claim"]').catch(() => {}); await sleep(4000);
  }
  await d.esc();
  await cut();
  }

  // Part 8: the whole map, then the ending: a fresh seed ready for Ryan.
  if (want("part8")) {
  await clip("part8_ending");
  await d.click("#fitBtn"); await sleep(4000);
  await d.click("#exploreBtn"); await sleep(2500);
  await d.click(".c-land .c-title-land"); await sleep(2500);
  await d.click('[data-intro="start"]'); await sleep(3500);
  await at(".choice"); await sleep(5000);
  await cut();
  }

  await d.b.close();
  console.log("All clips are in", OUT);
})().catch(async (e) => { console.error("stopped:", e.message); process.exit(1); });
