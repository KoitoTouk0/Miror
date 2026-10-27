// Recordable research demo (~1 min): accelerated intake with an uploaded file, then Your path,
// Principle, Application and the gold "interlink" strength. Start a screen recording, then run:
//   node demo-research.js            (local, http://localhost:8787)
// Chrome opens full screen and stays open at the end; quit it with Cmd+Q.
const path = require("path");
const { start } = require("./demo-lib");
const BASE = process.env.BASE || "http://localhost:8787/";
const FILE = path.resolve(__dirname, "../../samples/demo/group-onboarding-notes.txt");

(async () => {
  const d = await start(BASE + "?theme=gold");
  const { p, sleep } = d;
  await sleep(1800);
  await d.click(".c-intro rect").catch(() => {});
  await sleep(1500);
  await d.click(".c-sky .c-title-sky").catch(() => d.click(".c-sky"));
  await sleep(2200);
  await d.click('[data-intro="start"]');
  await sleep(3300);
  // Intake, quickly: level, background, skills, target, materials.
  await d.choose("PhD student"); await d.next(); await sleep(1300);
  await d.choose("Materials science");
  await d.type('[data-field="expertise"]', "Experimental: thin films, XRD, SEM, annealing", 18);
  await d.next(); await sleep(1300);
  await d.choose("Lab work"); await d.choose("Data analysis"); await d.choose("Baking");
  await d.next(); await sleep(1300);
  await d.type('[data-field="topic"]', "DFT simulation of materials", 22);
  await d.choose("A little");
  await d.type('[data-field="knownText"]', "I know DFT predicts energies and structures, but not how to set up or trust a calculation.", 10);
  await d.choose("A project or proposal");
  await d.next(); await sleep(1500);
  const input = await p.$("#in-files");
  await input.uploadFile(FILE);
  await sleep(1200);
  await d.shot("upload");
  await d.type('[data-field="notes"]', "I just moved from an experimental lab into a simulation group.", 14);
  await sleep(800);
  await d.next();
  await d.waitMap();
  // Your path opens by itself.
  await sleep(6500);
  await d.shot("your-path");
  await d.esc();
  await sleep(800);
  if (await d.clickNode('n.depth === 1 && /^Principle/i.test(n.d.label)')) { await sleep(4500); await d.esc(); }
  if (await d.clickNode('n.depth === 1 && /^Application/i.test(n.d.label)')) { await sleep(4500); await d.esc(); }
  // The gold interlink: what you bring, and gold lines from your skills to the new field.
  if (await d.clickNode('n.kind === "edge" && n.state !== "hidden"')) {
    await sleep(6000);
    await d.shot("interlink");
    await d.click('[data-act="claim"]').catch(() => {});
    await sleep(3500);
  }
  console.log("Research demo finished. Chrome stays open: stop the recording, then Cmd+Q.");
  if (process.env.HEADLESS) await d.b.close(); else d.b.disconnect();
})().catch((e) => { console.error("Demo stopped:", e.message); process.exit(1); });
