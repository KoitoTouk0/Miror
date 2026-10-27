# Explorer — Conclusion

> **Most learning tools tell you what you're missing. Explorer also shows you what you bring.**

Explorer turns learning a new field into exploring a map that lights up as you answer. It has one engine and two modes: **researchers** moving into a neighbouring field, and **kids** following their curiosity about the world.

> **The core idea:** in the AI era, the amount of information is not the problem. What people lack is a good *path* through it: knowing what to focus on, what to skip, and how to use the strengths they already have. Explorer designs that path for each person.

---

## In one minute

- **A journey from the very first click.** Researchers start on Earth, looking up at the night sky; kids start with a seed on a grassy hill. Every intake answer visibly grows the scene: a new star the spaceship flies to, or a stem, leaves and a bud. The finished map opens from that same Earth or bud.
- **A map, not a chat.** Every answer lights a node and grows the next questions, so you always see where you are, what you already own, and what's next.
- **Guided, not passive.** Explorer asks *you* thought-provoking questions in a deliberate order and always points to a **Next** step.
- **Built from where you stand.** New ideas are tied to what you already know, through your skills for researchers or everyday life for kids.
- **Starts from you, not from a preset.** A short intake asks for your level, general expertise, skills and hobbies, the topic and what you already know about it, why you want it, and (optionally) your papers or notes, up to 10 MB. Kids just give their age, what they love, and what they're curious about.
- **A path, not a pile.** Each map comes with "Your path": what to focus on first, what you can safely skip for now, and which of your strengths will help most. The questions are chosen to be few and high-leverage, not comprehensive.
- **Explore any topic.** Explorer builds the starting map in about 6–15 seconds, then grows it one layer at a time as you answer, up to 6 layers deep.
- **Your own questions grow the map.** Water the tree (kids) or launch a question (researchers), and it grows on the most relevant branch, with links to related ideas.
- **AI for words, design for wonder.** A fast, low-cost model (Claude Haiku 5.5) writes the text; every animation is pre-designed, so the experience stays smooth and reliable.

## What makes it different from asking an AI chatbot

| Chatbot | Explorer |
|---|---|
| You must know what to ask | It asks you, in an order designed to build interest |
| A scroll of text that's quickly lost | A persistent map that lights up and grows |
| Generic explanations | Each idea bridged to your own background or everyday life |
| Lists what you lack | Also surfaces what you bring |

---

## Researcher mode

**For:** a researcher with deep expertise in one area who is moving into another, or starting to collaborate with people from it. Example: an experimental materials scientist joining a simulation group.

### Main strengths

- **"Your path", first.** The map opens with a personal strategy built from your intake and materials. In a live test with a collaborator's seminar abstract it said to focus on how the model is trained and validated ("that is where the speaker's claims can be tested"), to skip network architecture for now, and to use the researcher's XRD experience to judge the paper's lattice-expansion check.
- **Your materials, read for you.** Attach papers or notes (PDF, TXT, Markdown). Explorer grounds the first questions in them and summarises what matters for *you*, including the open gaps worth asking about.
- **Your world, lit from day one.** Your existing skills appear as lit stars, so the map is never empty and you start from confidence, not from a reading list.
- **Bridges from what you know.** Each new concept comes with an analogy from your own field, e.g. *structure relaxation ≈ annealing*, *convergence tests ≈ repeat measurements*. Dashed lines show which of your skills each idea builds on.
- **Strengths you can claim.** Gold stars mark where your background is an *advantage* in the new field, e.g. matching simulated structures to real XRD data, or knowing where idealised models break.
- **Guided path.** Quick checks and one-sentence reflections light each node, and the guide always marks the next question.
- **Any field, built from your background.** 🧭 New topic turns a topic plus a few lines about you into a personal map: your skills become lit stars, the first questions bridge from them, and strengths appear where your background gives you an edge. In a live test, "ML interatomic potentials" for an experimental materials scientist produced a bridge comparing model fitting to calibrating an XRD diffractometer.
- **Your own questions, answered in context.** ✦ Ask sends a comet to the most related star; the AI answers at your level and links it back to your background. In a live test, a question about phonons was tied to the Debye-Waller effect in the researcher's own XRD data.
- **A vivid sense of journey.** A small spaceship flies from star to star as you explore, and the camera zooms into each question.

### Main gains

- **Faster, less painful onboarding** into a new field: you learn what matters for *your* work, in an order that makes sense.
- **Confidence instead of impostor feeling:** you see concretely what transfers and where you're ahead.
- **Better collaboration:** you know what your collaborators need from you and which questions to ask them, and you have a clear "What you bring" summary to share.
- **Stronger teams:** complementary skills multiply rather than add. Hiring another fisher adds 5; a sashimi processor adds 1.5n, which wins once the team has 4 or more.

---

## Kids mode

**For:** curious children of about 6–12, with parents or teachers alongside. There's no background check: just age and what they're curious about.

### Main strengths

- **Two playful worlds:** a flower garden where buds bloom into smiling flowers, or a growing tree where sprouts become leafy branches with fruit. Each has a night version (fireflies, an owl) and a day version (sun, clouds).
- **Explained through what they love.** Kids pick what they love (animals, space, baking…), and the "imagine" moments use it: a child who loves baking learns about rainbow colours through cookies browning in the oven.
- **Life examples first.** Every question starts with "💡 Imagine…", e.g. a hand out of a car window to explain lift. Then comes one simple pick, with gentle retries and no penalties.
- **Any topic a child picks:** "volcanoes" grows a tree of questions (what's inside, how hot lava is, where volcanoes are), adding new branches as the child answers.
- **The watering can.** Kids type or *say* their own question, water the tree, and a new branch grows where it fits best. The AI writes a kid-level answer and quiz.
- **Safe by design.** The AI only fills in short, structured text; unsuitable questions get a gentle "that's one to ask a grown-up about"; there's no open chat.
- **Joyful feedback:** blooms, butterflies, birds and confetti, with progress shown as flowers grown rather than scores.

### Main gains

- **Curiosity is rewarded, not tested:** a child's own questions literally grow their tree.
- **Understanding through everyday life:** principles become memorable because they're tied to things kids have felt and seen.
- **A habit of asking "why?":** each answer opens new buds, and the guide always suggests what to wonder about next.
- **For parents and teachers:** the grown tree is a visible record of what the child explored and wondered about, and a natural conversation starter.

---

## How it's built

- **Static web app** (HTML/CSS/JavaScript + D3) with hand-checked sample maps that work offline and on phones, plus maps generated live for any topic.
- **AI step** through a tiny server that keeps the API key private: Claude Haiku 5.5 returns structured text only, checked before it reaches the map. A new map takes about 7–14 seconds, and each further layer about 4–10 seconds (requested in the background while you read). Each call costs roughly $0.001–0.002.
- **Graceful fallback:** a built-in answer bank, so the demo never breaks if the network or AI is unavailable.
- **Your own API key (researcher mode):** in ⚙ Settings, a researcher can use their own Anthropic account. Explorer checks the key first. It stays in their browser and goes straight to Anthropic with their own requests only.

## Honest limits and next steps

- **Planned, not built yet:** **fertilizer** after the map is built (adding papers and notes changes the map: known questions turn lit, new strengths appear). Saved progress and team maps are on the roadmap.
- **AI answers can be wrong:** they should carry a "please verify" note in research mode, and later be grounded with real citations.
- **Maps are capped at 6 layers** to keep exploration focused and costs predictable; questions on the topic that fit no branch start a new branch from the root, and off-topic questions are politely redirected to a new map.

> **Explorer: start from where you stand, see what you bring, and enjoy finding out the rest.**
