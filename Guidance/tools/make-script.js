// Builds Video_script.docx: the 4-minute Explorer video, one labelled section per paragraph.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, LevelFormat, Footer, PageNumber, ExternalHyperlink
} = require("docx");

const OUT = process.argv[2];
const LINK = "https://explorer-mindflow.netlify.app";
const GOLD = "B8860B", GREY = "5F6368", INK = "1F2328";

const SECTIONS = [
  {
    n: "1", name: "Introduction", time: "0:00–0:23",
    screen: "The researcher opening picture: a night sky over Earth's horizon, two people looking up at a bright star. Title on screen: “Explorer · find your path, not more information”.",
    say: ["In the age of AI, information is everywhere. You can ask a chatbot anything. But when you step into a new field, the hard part isn't finding information. It's finding your path: what to focus on, what to skip, and how to use what you're already good at. This is Explorer."]
  },
  {
    n: "2", name: "My story", time: "0:23–0:50",
    screen: "Stay on the starry sky, or a simple text card: “Experimental lab → simulation group”, with three small labels: physics · math · computer science.",
    say: ["I know this from experience. I trained as an experimental materials scientist, then joined a fully simulation-based group for my PhD, and I struggled a lot. My groupmates came from physics, math and computer science, and they struggled too. We were so busy catching up on what we lacked that we forgot the strengths we brought with us."]
  },
  {
    n: "3", name: "The idea", time: "0:50–1:12",
    screen: "Text card made in your video editor: “One more fisher → one more catch” and “A sashimi expert → every catch is worth more”. Then: “Complementary strengths multiply.”",
    say: ["Think of a fishing team. Hiring one more fisher adds one more catch. But someone who prepares the fish for sashimi raises the value of everything the whole team catches. Complementary strengths multiply. So Explorer doesn't only show you what you're missing. It shows you what you bring."]
  },
  {
    n: "4", name: "Researcher mode: the journey", time: "1:12–1:40",
    screen: "Click the opening picture: the camera flies up and Earth appears with the spaceship circling it. Answer: PhD student → Materials science (+ “thin-film growth, XRD, SEM, annealing”) → Lab work, Data analysis → topic “DFT simulation of materials” → a short note. Each answer adds a star and the ship flies to it.",
    say: ["Here's researcher mode, with me as the explorer. Every journey starts from where you stand: Earth. I tell Explorer my level, my expertise, thin films, XRD and annealing, my skills and hobbies, and the topic I want to learn: DFT simulation. Each answer becomes a star, and my spaceship flies out to it. I can also add a paper or my own notes."]
  },
  {
    n: "5a", name: "Your path", time: "1:40–2:06",
    screen: "Keep one second of the building animation, then the map opens from Earth with your skills already lit. The “Your path” panel opens: hold on it for about three seconds.",
    note: "Each map is freshly written, so read the path your own map shows. The words below are from a real test run with your profile.",
    say: ["In about ten seconds, my map is ready. My skills are already lit, so I never start from zero. And first, Explorer gives me my path: focus on what DFT actually computes and how to set it up, skip the deep quantum mechanics for now, and use my experimental habit of checking results against references. That's my biggest advantage."]
  },
  {
    n: "5b", name: "Lighting up the map", time: "2:06–2:25",
    screen: "Click the suggested question (it pulses), show its bridge from your world, answer the quick check, and watch the next questions grow. Then click a gold star and press Claim.",
    say: ["Then I explore. Each question builds a bridge from my own world. A quick check or a one-line reflection lights it up, and the next layer of questions grows. The guide always points to what's next, and gold stars mark strengths I can claim."]
  },
  {
    n: "6", name: "Ask your own question", time: "2:25–2:43",
    screen: "Press ✦ Ask, type “How do I check whether a DFT result matches my XRD data?”, and send it. A comet flies in, lands on the closest star, and a new star appears with its answer.",
    say: ["When I have my own question, like how do I check a DFT result against my XRD data, I launch it like a comet. It lands on the closest star and grows a new one, answered at my level."]
  },
  {
    n: "7", name: "Kids mode", time: "2:43–3:22",
    screen: "Switch to kids mode (⚙ Settings → Kids, Growing tree). “Young explorer” → the bud on the grassy hill → age 8 → Animals, Space → Magnets. The tree grows. Open a bud: “💡 Imagine…” and a playful choice. Then tap the watering can, press 🎤 and say “Why do magnets stick to the fridge?”, and water the tree.",
    say: ["The same engine powers kids mode, built for curiosity instead of careers. There's no background check: just your age, what you love, and what you wonder about. A little bud appears, and every answer helps it grow. Here, an eight-year-old who loves animals and space asks about magnets. Each question starts with “Imagine…”, a picture from everyday life, then one playful choice, with no penalties. And kids can ask their own questions out loud: water the tree, and a new branch grows right where the question fits."]
  },
  {
    n: "8", name: "Why it's different", time: "3:22–3:47",
    screen: "Text card with two columns. Chatbot: you must know what to ask · a scroll of text · generic answers. Explorer: it asks you · a map you can see · built on your strengths. Or show the zoomed-out researcher map.",
    say: ["So how is this different from a chatbot? A chatbot waits for you to know what to ask. Explorer asks you, in a deliberate order, starting from your strengths, and leaves you with a map you can see. The AI, Claude Haiku, writes only the words, for less than a cent per map. Every animation is designed."]
  },
  {
    n: "9", name: "Closing", time: "3:47–4:00",
    screen: "The fully grown map (press ⤢ to see it all), then an end card: “Explorer”, the link " + LINK + ", and a small line: “Next: feed the map new papers · real citations · team maps”.",
    say: ["Explorer works for any topic, and it's live now. Start from where you stand, see what you bring, and enjoy finding out the rest."]
  }
];

const words = (s) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const total = SECTIONS.reduce((sum, s) => sum + s.say.reduce((a, p) => a + words(p), 0), 0);

const label = (text, color) => new TextRun({ text: text + "  ", bold: true, size: 18, color, characterSpacing: 20 });

const children = [];
children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Explorer: 4-minute video script")] }));
children.push(new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text: `About ${total} spoken words, read at a calm pace (about 140 words a minute), so roughly 3:50 of speech plus title and end cards. Live link: `, color: GREY }),
    new ExternalHyperlink({ link: LINK, children: [new TextRun({ text: LINK, style: "Hyperlink" })] })]
}));
children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("How to read this script")] }));
[
  "Each section has a label (number, name and time), what is ON SCREEN, and what you SAY. Only the SAY paragraphs are spoken.",
  "The times are targets. If a section runs long, trim the screen action, not the story.",
  "Your map's wording changes every time it is built. In section 5a, read the path your own map shows."
].forEach((t) => children.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun(t)] })));

SECTIONS.forEach((s) => {
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun(`Section ${s.n} · ${s.name}`), new TextRun({ text: `   ${s.time}`, color: GOLD })]
  }));
  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [label("ON SCREEN", GREY), new TextRun({ text: s.screen, italics: true, color: GREY })]
  }));
  if (s.note) {
    children.push(new Paragraph({
      spacing: { after: 100 },
      children: [label("NOTE", GOLD), new TextRun({ text: s.note, color: GREY })]
    }));
  }
  s.say.forEach((p) => children.push(new Paragraph({
    spacing: { after: 160, line: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 10 } },
    indent: { left: 200 },
    children: [label(`SAY · ${s.n}`, GOLD), new TextRun({ text: p, size: 26, color: INK })]
  })));
});

// Appendix: timing table, recording checklist, alternative openings.
children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun("Appendix A · Timing at a glance")] }));
const W = [1300, 4460, 1900, 1700];
const cell = (text, w, head) => new TableCell({
  width: { size: w, type: WidthType.DXA },
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: "F3EAD3" } : undefined,
  children: [new Paragraph({ children: [new TextRun({ text, bold: !!head, size: 20 })] })]
});
children.push(new Table({
  width: { size: W.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: W,
  rows: [
    new TableRow({ tableHeader: true, children: ["Section", "Name", "Time", "Words"].map((t, i) => cell(t, W[i], true)) }),
    ...SECTIONS.map((s) => new TableRow({ children: [s.n, s.name, s.time, String(s.say.reduce((a, p) => a + words(p), 0))].map((t, i) => cell(t, W[i])) })),
    new TableRow({ children: ["", "Total", "4:00", String(total)].map((t, i) => cell(t, W[i], true)) })
  ]
}));

children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Appendix B · Recording checklist")] }));
[
  "Do one practice run in each mode first, so you know what your maps will say.",
  "⚙ Settings: Speed → Slow. Researcher: Black & Gold. Kids: Growing tree. Keep “Zoom in on click” on.",
  "Use the live link, or double-click Start Explorer and use http://localhost:8787. Browser in full screen (Ctrl+Cmd+F), bookmarks bar hidden.",
  "Cut the waits in editing: keep about one second of each building animation and of each comet or watering.",
  "Record your voice separately in a quiet room, then lay it over the screen recording. Aim for 3:50 of speech.",
  "For the spoken kids question, use Chrome and allow the microphone when asked."
].forEach((t) => children.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun(t)] })));

children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Appendix C · Alternative openings for Section 1")] }));
[
  "“Have you ever joined a new field and felt like a beginner again, even though you were an expert yesterday? That was me. This is Explorer.”",
  "“AI can tell you everything about a new field. Explorer tells you where to start, what to skip, and what you already bring.”"
].forEach((t) => children.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: t, italics: true })] })));

const doc = new Document({
  creator: "Explorer team",
  title: "Explorer: 4-minute video script",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22, color: INK } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { font: "Georgia", size: 44, bold: true, color: INK }, paragraph: { spacing: { after: 120 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Georgia", size: 28, bold: true, color: INK }, paragraph: { spacing: { before: 320, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Georgia", size: 24, bold: true, color: INK }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 1 } }
    ]
  },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1260, bottom: 1260, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Explorer · video script · page ", color: GREY, size: 16 }), new TextRun({ children: [PageNumber.CURRENT], color: GREY, size: 16 })] })] }) },
    children
  }]
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log(`wrote ${OUT} · ${total} spoken words`);
});
