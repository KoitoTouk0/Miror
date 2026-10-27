// Builds the finished video from one voice recording and the clips in Video_clips/.
//   node make-final.js <voice file>          one recording (m4a, mp3, wav, aiff, mov…), with ~3 s of
//                                            silence between the 8 parts of the final script
//   node make-final.js <folder>              or a folder holding 8 recordings, one per part, whose
//                                            names sort in order (e.g. part1.m4a … part8.m4a)
// The recording is split into its parts (silence at the start and end of each part is trimmed); each clip is sped up or slowed down to fit its part; the
// chatbot card (part 7) and an end card are drawn; everything is joined into Miror_video.mp4.
const path = require("path");
const fs = require("fs");
const { execFileSync, spawnSync } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const puppeteer = require("puppeteer-core");

const ROOT = path.resolve(__dirname, "../..");
const CLIPS = path.join(ROOT, "Video_clips");
const WORK = path.join(CLIPS, "work");
const OUT = path.join(ROOT, "Miror_video.mp4");
const voice = path.resolve(process.argv[2] || "");
const LINK = "https://explorer-mindflow.netlify.app";
const PAUSE = 0.5;   // seconds of quiet kept between parts
const END = 4;       // seconds of end card after the last word
if (!fs.existsSync(voice)) {
  console.error("Usage: node make-final.js <voice recording or folder of 8 recordings>");
  process.exit(1);
}
fs.mkdirSync(WORK, { recursive: true });
const run = (args) => execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...args]);
const duration = (file) => {
  const out = spawnSync(ffmpeg, ["-i", file], { encoding: "utf8" }).stderr;
  const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
};

// 1. Find the pauses between parts: the 7 longest silences of 1.6 s or more.
function splitVoice() {
  const log = spawnSync(ffmpeg, ["-i", voice, "-af", "silencedetect=noise=-38dB:d=1.6", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  const total = duration(voice);
  let gaps = starts.map((s, i) => ({ s, e: ends[i] ?? total })).filter((g) => g.s > 0.5 && g.e < total - 0.5);
  if (gaps.length < 7) {
    console.error(`Found only ${gaps.length + 1} parts. Leave a clear 3-second pause between the 8 parts and try again.`);
    process.exit(1);
  }
  gaps = gaps.sort((a, b) => (b.e - b.s) - (a.e - a.s)).slice(0, 7).sort((a, b) => a.s - b.s);
  const lead = starts[0] === 0 || starts[0] < 0.05 ? ends[0] : 0;
  const tail = starts.length && (ends[starts.length - 1] === undefined) ? starts[starts.length - 1] : total;
  const parts = [];
  let from = Math.max(0, lead - 0.2);
  gaps.forEach((g) => { parts.push([from, g.s + 0.25]); from = g.e - 0.25; });
  parts.push([from, Math.min(total, tail + 0.25)]);
  parts.forEach(([a, b], i) => {
    run(["-ss", a.toFixed(3), "-to", b.toFixed(3), "-i", voice, "-af", `apad=pad_dur=${PAUSE}`, "-ac", "1", "-ar", "48000", path.join(WORK, `v${i + 1}.wav`)]);
  });
  return parts.map((_, i) => duration(path.join(WORK, `v${i + 1}.wav`)));
}

// 2. Cards drawn as web pages (the same fonts as the app).
async function cards() {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080 });
  // Web fonts if they load within a few seconds, system fonts otherwise.
  const settle = () => Promise.race([p.evaluate(() => document.fonts.ready.then(() => true)), new Promise((r) => setTimeout(r, 4000))]);
  const page = (body) => `<!doctype html><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>body{margin:0;width:1920px;height:1080px;display:grid;place-items:center;background:radial-gradient(120% 90% at 50% 0%,#14224f,#04060f 70%);color:#eef2fb;font-family:Inter,-apple-system,Helvetica,sans-serif}
    h1{font:600 76px Fraunces,Georgia,serif;margin:0 0 50px;text-align:center}.cols{display:grid;grid-template-columns:1fr 1fr;gap:60px;width:1500px}
    .col{padding:44px 50px;border-radius:32px;background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.12)}.col.me{border-color:#e8b64a;background:rgba(232,182,74,.08)}
    h2{font:600 46px Fraunces,Georgia,serif;margin:0 0 26px}.me h2{color:#ffd36b}li{font-size:38px;line-height:1.5;margin:10px 0}ul{padding-left:40px;margin:0}
    .end{text-align:center}.end h1{font-size:150px;margin:0}.end p{font-size:44px;margin:24px 0 0;color:#ffd36b}.end small{display:block;margin-top:40px;font-size:34px;color:#c3cbea}</style><body>${body}`;
  await p.setContent(page(`<div><h1>Why not just a chatbot?</h1><div class="cols">
    <div class="col"><h2>A chatbot</h2><ul><li>You must know what to ask</li><li>A scroll of text</li><li>Generic answers</li></ul></div>
    <div class="col me"><h2>Miror</h2><ul><li>It asks you first</li><li>Guided by your interests or strengths</li><li>A map that grows</li></ul></div></div></div>`), { waitUntil: "domcontentloaded" });
  await settle();
  await p.screenshot({ path: path.join(WORK, "card-chatbot.png") });
  await p.setContent(page(`<div class="end"><h1>Miror</h1><p>${LINK.replace("https://", "")}</p><small>Interest for kids · strengths for researchers</small></div>`), { waitUntil: "domcontentloaded" });
  await settle();
  await p.screenshot({ path: path.join(WORK, "card-end.png") });
  await b.close();
}

// 3. A clip sped up or slowed down to last exactly `secs`.
const V = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "veryfast", "-r", "30", "-an"];
function fit(clip, secs, out) {
  const factor = secs / duration(path.join(CLIPS, clip));
  run(["-i", path.join(CLIPS, clip), "-vf", `setpts=${factor.toFixed(5)}*PTS,scale=1920:1080`, "-t", secs.toFixed(3), ...V, out]);
  return factor;
}
function still(png, secs, out) {
  run(["-loop", "1", "-i", png, "-vf", "scale=1920:1080,fade=t=in:st=0:d=0.5", "-t", secs.toFixed(3), ...V, out]);
}

// The part number in a file name: "section 2-31s.m4a" → 2, "hkt-section1 0-030.m4a" → 1, "part3.m4a" → 3.
const partNo = (f) => +((f.match(/(?:section|part)\s*(\d+)/i) || f.match(/(\d+)/) || [0, 99])[1]);

// 1b. Eight separate recordings: trim the quiet at both ends of each, keep a short pause after it.
function partsFromFolder() {
  const files = fs.readdirSync(voice).filter((f) => /\.(m4a|mp3|wav|aiff?|mov|mp4|caf|aac)$/i.test(f))
    .sort((a, b) => partNo(a) - partNo(b) || a.localeCompare(b, undefined, { numeric: true }));
  if (files.length !== 8) {
    console.error(`Found ${files.length} recordings in ${voice}; expected 8 (one per part): ${files.join(", ")}`);
    process.exit(1);
  }
  console.log("Parts in order:", files.join(", "));
  const trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15";
  return files.map((f, i) => {
    const out = path.join(WORK, `v${i + 1}.wav`);
    run(["-i", path.join(voice, f), "-af", `${trim},areverse,${trim},areverse,apad=pad_dur=${PAUSE}`, "-ac", "1", "-ar", "48000", out]);
    return duration(out);
  });
}

(async () => {
  let d = fs.statSync(voice).isDirectory() ? partsFromFolder() : splitVoice();
  // Too long for the target? Speed the voice up evenly (pitch stays the same).
  const target = Number(process.env.TARGET) || 240;
  const speech = d.reduce((a, b) => a + b, 0);
  if (speech + END > target) {
    const tempo = Math.min(1.25, speech / (target - END));
    console.log(`Voice ${speech.toFixed(1)} s → speeding up ×${tempo.toFixed(3)} to fit ${target} s`);
    d = d.map((_, i) => {
      const src = path.join(WORK, `v${i + 1}.wav`), tmp = path.join(WORK, `t${i + 1}.wav`);
      run(["-i", src, "-af", `atempo=${tempo.toFixed(4)}`, tmp]);
      fs.renameSync(tmp, src);
      return duration(src);
    });
  }
  console.log("Voice parts (s):", d.map((x) => x.toFixed(1)).join(" · "), "· total", d.reduce((a, b) => a + b, 0).toFixed(1));
  await cards();
  const seg = [
    ["part1-3_opening.mp4", d[0] + d[1] + d[2]],
    ["part4_interest.mp4", d[3]],
    ["part5_land.mp4", d[4]],
    ["part6_research.mp4", d[5]],
    ["card-chatbot.png", d[6]],
    ["part8_ending.mp4", d[7]],
    ["card-end.png", END]
  ];
  const files = seg.map(([src, secs], i) => {
    const out = path.join(WORK, `s${i}.mp4`);
    if (src.endsWith(".png")) still(path.join(WORK, src), secs, out);
    else console.log(`${src}: ${secs.toFixed(1)} s, speed ×${(1 / fit(src, secs, out)).toFixed(2)}`);
    return out;
  });
  fs.writeFileSync(path.join(WORK, "list.txt"), files.map((f) => `file '${f}'`).join("\n"));
  run(["-f", "concat", "-safe", "0", "-i", path.join(WORK, "list.txt"), "-c", "copy", path.join(WORK, "video.mp4")]);
  // The voice: the 8 parts joined, a soft fade at the end, loudness evened out.
  fs.writeFileSync(path.join(WORK, "alist.txt"), d.map((_, i) => `file '${path.join(WORK, `v${i + 1}.wav`)}'`).join("\n"));
  run(["-f", "concat", "-safe", "0", "-i", path.join(WORK, "alist.txt"), "-af", `loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=${END}`, "-ar", "48000", path.join(WORK, "voice.wav")]);
  run(["-i", path.join(WORK, "video.mp4"), "-i", path.join(WORK, "voice.wav"), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT]);
  console.log(`Done: ${OUT} (${duration(OUT).toFixed(1)} s)`);
})().catch((e) => { console.error("Stopped:", e.message); process.exit(1); });
