# Explorer — Revised Outline (v2)

> Working copy built from `Intact_drive_undecorated.md`. The original stays untouched; only you edit it, by hand.
> **Deadline:** Thu 22 Oct 2026, 19:00. **Submit:** a link + a 4-minute video.
> Updated Wed 21 Oct, 13:50, so about 29 hours left.
> **Split of work:** you own the interface, the experience and the video; Claude writes the code.

---

## 1. Pitch

> Most learning tools tell you what you're missing. Explorer also shows you what you bring.

Answer a question and its node lights up, then your map grows. Researchers see their own expertise light the way into a new field. Kids watch a garden bloom as they find out how the world works.

## 2. What makes it different from chatting with an LLM

1. **Dynamic visualisation.** You don't scroll a transcript; you watch a map light up and grow. At a glance you see what you already own, what's next, and how far you've come.
2. **Directional, thought-provoking guidance.** The tool asks *you* questions in a deliberate order and always marks one as **Next**. Every question is tied to your background, so it feels like a guide rather than a search box.

| Plain LLM chat | Explorer |
|---|---|
| You must know what to ask | It asks you, in a sequence designed to build interest |
| A scroll of text | A map that lights up and grows as you answer |
| Generic explanations | Each question bridged to your own background or everyday life |
| Lists what you lack | Also surfaces what you bring (researcher mode) |

## 3. Two modes, one engine

| | Researcher | Kids |
|---|---|---|
| **Intake** | Full form: background, level, region, purpose, origin, materials (§4) | Only age + what you're curious about. **No background check** |
| **Map look** | A constellation: "your world" glows on the left, the new region lights up to the right | Two worlds to choose from in Settings. **Flower garden:** buds bloom into smiling flowers. **Growing tree:** sprouts grow into leafy branches with fruit |
| **Questions** | Thought-provoking: quick checks, "your thought" reflections, and strengths to claim | Simple picks with emoji, built on life examples and metaphors |
| **Goal** | Make the most of your strengths: gold **Your strength** nodes come from your background and materials | Curiosity and fun: answer, bloom, sprout |
| **Rewards** | Strengths discovered → a "What you bring" summary | Flowers with faces, butterflies, confetti |

**Theme and colours** are personal preference, so they live in **Settings** (Black & Gold / Blue & White) and work in both modes. In kids mode the same switch becomes a night garden or a sunny day.

## 4. Researcher intake (the form)

| Step | Asks | Input style |
|---|---|---|
| 1. About you | Skill sets; level (high school / undergrad / grad / PhD / postdoc / faculty / industry); home field | Chips + dropdown |
| 2. Where you're heading | The region you're interested in; what you already know about it | Text + "none / some / a lot" |
| 3. Purpose | Collaboration or your own exploration? Interest or work? | Two toggles |
| 4. What sparked it | A paper / a project or proposal / a casual talk / news / other, plus your thought | Cards + short text |
| 5. Materials | Collaborators' papers (paste an abstract or upload), collaborator name & paper, their expertise, plus your thoughts | Paste box + fields |

How each answer shapes the map:

- **Skills** → pre-lit "Already yours" nodes. The map is never empty on day one.
- **Region** → the tree of questions in the new field.
- **Purpose** → order and tone. Collaboration adds "what they need from you" and "questions for your next meeting".
- **What sparked it** → the very first question.
- **Materials** → paper-specific nodes (e.g. "Read your groupmate's paper as an experimentalist") and most of the **Your strength** nodes.

**Kids intake:** an age picker (5–12) and "What are you curious about?" (cards such as planes, magnets, dinosaurs, space, or type your own). Nothing else.

## 5. The light-up map (core interaction)

- **Node states:** hidden → **open** (a glowing "?" or bud) → **lit** (filled and glowing, or a bloomed flower). Lighting a node reveals 1–3 new questions, and the guide tags one **Next**.
- **Ways to light a node:** a quick check (multiple choice, with gentle retry), **your thought** (one sentence of reflection), or **claim** a strength.
- **Researcher node kinds:** Already yours · Core question · Bridge from your world · Your strength (gold star) · Frontier. Dashed blue lines link a new question to the skill of yours it builds on.
- **The camera** zooms in when you click a node, pulls back after you answer so the new nodes are in view, and zooms out again when you close the panel. New nodes glide out of their parent. Both zooms can be turned off in Settings.
- **Curiosity lenses** (from v1) stay as the question generator's checklist: mechanism · origin · limits · optimisation · history · life & culture · value & career.
- **Ask your own question (built).** Kids tap the watering can with a "?", type or say a question, and water the plant. The camera flies to the most relevant branch, the can pours, and a new bud or branch grows there, with dotted links to related nodes. Researchers press **✦ Ask**: a comet streaks in, lands on the closest star, and a new star is born. A question that's already on the map isn't duplicated; the map reveals and opens it instead. Your own questions have a dashed outline and a "Your question" tag.

## 5b. Water and fertilizer: two ways to feed the map (proposal)

Your idea, refined. The map gets two kinds of input that match the two halves of the ambition:

| | Water 💧 | Fertilizer 🌱 |
|---|---|---|
| What you add | Questions: what you want to know | What you already know and have: skills, notes, papers, a collaborator's work |
| What it does | Grows **new** branches where the question fits | **Changes existing** ones: questions you already know turn lit, explanations adapt to your level, new bridges and strengths (fruit) appear |
| Half of the ambition | "Things you need" | "Things you're good at" |

- **The intake form *is* the first bag of fertilizer.** That's one mechanism, not two features: you can fertilize again any time, e.g. by dropping in a new paper next week.
- **Always show what changed** after each feed, e.g. "3 questions turned green · 1 new strength · 2 new bridges". The map should never change silently.
- **Kids:** water only. Kids mode has no background check, though an optional "I already know…" could come later.
- **Needs the AI step** to read real papers. For the video, use 1–2 prepared sample papers so the effect is reliable.
- **Privacy:** unpublished papers should stay in the browser, or be clearly marked as sent to the model.

## 5c. Researcher visual: two options (decision needed)

- **A. Keep the constellation (built).** Ask = a comet (built). Fertilizer = "starlight": drop a paper and your star brightens, a light wave spreads, and the questions it covers turn lit. *Pros:* already done, and the Black & Gold look fits 3Blue1Brown. *Cons:* water and fertilizer don't belong in the sky, so the video has to explain two metaphors.
- **B. Roots & crown, a research tree (recommended).** The same tree engine, drawn as elegant gold line-art. **Your expertise is the roots** (each skill a labelled root), the new field is the crown, your strengths are golden fruit, questions are water, and papers are fertilizer in the soil. *Pros:* one metaphor across both modes, and the ambition is literally visible: roots feed the growth, fruit is what you bring. *Cons:* about 2–3 hours of work. The constellation can stay as an alternative view.

## 6. Built today: the light-up prototype (`demo/`)

Open `demo/index.html` in Chrome (double-click). Nothing to install.

- Researcher sample: *you*, an experimental materials scientist joining a simulation group. 4 skills already yours, 13 questions to light, 3 strengths to discover.
- Kids sample: *How do planes fly?* with 9 questions, shown as a flower garden or a growing tree (with a wooden sign, branch leaves, and an owl at night).
- Settings (⚙): mode, kids world (garden / tree), theme, animation speed (Slow for recording), zoom in on click, zoom out to show new nodes, reset.
- Click-to-zoom camera: flies into the clicked node, then pulls back to show what grew.
- Ask your own question: watering can for kids (with 🎤 voice input in Chrome), ✦ Ask with a comet for researchers. An offline matcher picks the branch. Answers come from a small hand-checked bank (6 kids, 4 researcher questions). Any other question becomes a "wonder" node until the AI step can answer it.
- **Tour** (▶) auto-plays the exploration: it opens questions, answers them, types thoughts and claims strengths. Built for recording.
- Finale screens: "Your map is lit" with your strengths; "Your garden is in full bloom!" with confetti.
- Works on phones too: the side panel becomes a bottom sheet.
- URL shortcuts for setting up shots: `?mode=kids`, `?kids=tree`, `?theme=blue`, `?speed=slow`, `?light=all`, `?light=q1,q2`, `?open=q2`, `?tour=1`.

## 7. How the rest gets built

**Approach:** a static website (HTML/CSS/JavaScript with D3). No server, no install. That makes the **link** easy: drag the folder onto Netlify Drop or push it to GitHub Pages.

**Screens:** Welcome (pick a mode) → Intake (researcher form / kids picker) → "Building your map…" animation → Map (built) → Summary ("What you bring", shareable).

**The AI only does text; every visual is preset.** The model returns small JSON in the same shape as the sample data: a node's label, explanation, bridge, quiz, which branch it belongs to, and related nodes. All animations, layouts and effects are fixed in the front end, so visuals never depend on model output and the banks and samples remain an offline fallback.

**API access.** A Claude Pro subscription doesn't include API usage; the API is billed separately (prepaid credits in the Claude Console, with a spend limit). A key must never be visible in the public page: a tiny serverless function (e.g. a Netlify Function) holds it for the judges' link, and the "bring your own key" field in Settings covers subscribers who want their own model. Per-question cost at ~1.5K input / ~1K output tokens: Haiku 5.5 ≈ $0.0007, Sonnet 5.5 ≈ $0.013, Opus 5.5 ≈ $0.026.

**Where the map comes from:**

1. **Sample maps** (always available): hand-checked JSON in the same shape as `demo/data/*.js`. The public link and the video both work with no API key.
2. **Live generation** (stretch goal): one LLM call turns intake answers into a map JSON in that same shape. A static site can't hide an API key, so live generation uses a **"bring your own key"** field in Settings. That is also your model-choice feature: subscribers pick their own model. If the call fails, fall back to the closest sample map.

## 8. What to expect in ~29 hours

| Confidence | What |
|---|---|
| **Will be solid** | Light-up map in both modes (done) · ask your own question (done) · welcome screen · researcher intake form · kids picker · "building your map" transition · summary screen · settings · tour for recording · 2–3 hand-checked sample maps · public link |
| **Likely** | Fertilizer: intake and a dropped-in sample paper visibly change the map · the researcher visual you choose in §5c |
| **Stretch** | AI step with your own key: answers any asked question, reads real papers as fertilizer, generates maps; falls back to the banks and samples |
| **Sample only in the video** | Real PDF reading (paste an abstract instead) · model picker · "go deeper" expansion |
| **Roadmap slide** | Automatic cost-aware model choice · real citations (OpenAlex / Semantic Scholar) · accounts and saved progress · team map of a whole group · 3Blue1Brown-style animations |

## 9. Timeline

| When | Goal |
|---|---|
| Wed 14:00–16:00 | ✓ Done: tree world, click-to-zoom, ask your own question (watering can / comet, voice) |
| Wed 16:00–19:00 | Your §5c choice (research tree if B) + fertilizer with a sample paper |
| Wed 19:30–23:00 | **The skeleton:** welcome screen + researcher intake (= first fertilizer) + kids picker, wired to the maps; summary screen; first public link |
| Thu 09:00–12:00 | AI step with your own key (stretch); visual polish from your feedback |
| Thu 12:00–15:00 | Bug fixes and polish. **Stop adding features at 15:00** |
| Thu 15:00–18:00 | Record (Slow speed + Tour), edit the 4-minute video, final link, submit |
| Thu 18:00–19:00 | Buffer |

## 10. Video script (4 min)

| Time | Beat |
|---|---|
| 0:00 | Story: experimental undergrad → simulation PhD; groupmates from physics, math and CS all struggled |
| 0:30 | Problem + fishing math: hiring another fisher adds 5; a sashimi processor adds 1.5n, which wins once the team has 4 or more |
| 1:00 | Researcher intake: skills, level, purpose, what sparked it, a collaborator's paper |
| 1:30 | The map builds: your world glows, and the first question waits on the frontier |
| 1:50 | Light it up: a thought, a quick check, nodes bloom outward, the **Next** guide |
| 2:30 | A strength appears: gold star, bridge line back to your XRD skill; claim it |
| 2:40 | Feed the map: drop in a paper (fertilizer), and questions you already know turn lit |
| 2:55 | Finale: "What you bring" |
| 3:10 | Kids mode: "How do planes fly?" tree, a wrong answer then a bloom; a child says "How do helicopters fly?" into the watering can, and a new branch grows |
| 3:45 | Roadmap + pitch line + link |

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Wrong science in sample maps | Hand-check every sample node; label generated content "AI-generated, please verify" |
| Live LLM output breaks the map | Schema check + fall back to a sample map; the video doesn't depend on it |
| Scope creep | Follow §8; no new features after 15:00 Thu |
| Link doesn't work for judges | Static site with no key needed; test it in a private window and on a phone |
| Kids mode content safety | Kids' own questions are answered only from a vetted bank or, later, a kid-safe AI prompt with filtering; there's no open chat |

## 12. Open decisions

- [ ] **Researcher visual (§5c):** A, keep the constellation, or B, the roots & crown tree?
- [ ] What does the **link** point to: the live tool, a repo, or both? (The plan assumes the live tool.)
- [ ] Do you have an LLM API key for the live-generation stretch goal? Needed by Thu morning.
- [ ] A second researcher persona for the demo: a CS, physics or math groupmate?
- [ ] Name: "Explorer" works. Alternatives: *Bridgehead*, *Common Ground*, *Polymath Map*.
- [ ] Original note, Detailed Functions item 1, stops mid-sentence ("When an researcher ."). What was the rest?

---

## Appendix: where each idea went

| Source | Now |
|---|---|
| Two modes (kids / researcher), researcher first | §3, §9 |
| Knowledge level, background, collaborators' work | §4 intake |
| LLM-powered research mode | §7 (sample maps first, live generation as stretch) |
| Model choice / free models | §7 bring-your-own key, §8 roadmap |
| Black & gold / blue & white | §3 Settings (done) |
| 3Blue1Brown-style demo | §5 animated camera and growth; full animations on the roadmap |
| Quiz / background check | §5 quick checks (researcher); no check in kids mode (§3) |
| Ambition: strengths, not just gaps; fishing metaphor | §1, §3, §10 |
| Q1: stand out from plain chat | §2: dynamic visualisation + directional guidance |
| Knowledge graph, interlinks, hierarchy | §5, §6 |
| Pop-out quizzes along the graph | §5 |
| Curiosity questions (planes, magnetism) | §5 lenses; kids sample = planes |
| v2 guidance: intake fields, light-up map, kids = age + curiosity only | §3, §4, §5 |
| Submission: link + 4-minute video | §7 static site, §10 script |
