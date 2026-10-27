# Explorer — sample runs (22 Oct 2026)

Live runs with the real AI (Claude Haiku 5.5) on the local server. Every map, question, answer and quiz below was generated, not hand-written. Screenshots and the full generated content (`*.json`) are in this folder.

Each run: build a map → answer the suggested question three times (the next layer grows each time) → add one question of your own.

| Run | Mode / look | Map built | 3 questions answered | Total AI calls |
|---|---|---|---|---|
| Rainbow | Kids, flower garden, day | 8 s | 49 s | 6 |
| Snow | Kids, growing tree, night | 9 s | 50 s | 5 |
| Protein structure (AlphaFold) | Researcher, Black & Gold | 10 s | 51 s | 6 |
| Intake + PDF (ML potentials) | Researcher, full intake, 1 attached PDF | 15 s | — | 3 |
| Intake (rainbows) | Kids, full intake (age 7, loves animals, drawing, baking) | 6 s | — | 2 |

Cost of all runs together: about 3 US cents.

---

## 1. Kids · "rainbow" (age 7, flower garden)

Screenshots: `kids-rainbow-1-topic.png` … `kids-rainbow-6-own-question.png`

**What grew:**

- 🌈 *How does a rainbow appear?* — "Imagine shining a flashlight through a glass of water…"
  - 🎨 *What colors are inside?* → 🌈 *Why do colors split apart?* → 💧 *Why do raindrops bend light?* · 🌈 *Do all colors bend the same?* · 🐢 *Why does light slow down?*
  - 📏 *How big is a rainbow?* — "a rainbow is really a full circle; we usually see only the top half"
  - ☀️ *Where do rainbows come from?* — "the sun shines from behind us"
- **Own question (watering can):** "Can you touch a rainbow?" grew from the root, with a correct, kind answer: "A rainbow is made of light, so you can't touch it."

**Observations**

- The path goes deeper in a clear chain (colors → splitting → bending → slowing down), so a 7-year-old ends up at refraction without ever seeing the word.
- The facts are correct (red bends least so it's on the outside; full-circle rainbows; sun behind you), and the silly quiz options keep it playful.
- **One weakness:** "How many colors are there?" partly repeats "What colors are inside?" (both quizzes are about seven colors). Duplicate checking could be stricter.

## 2. Kids · "snow" (age 9, growing tree, night)

Screenshots: `kids-snow-1-topic.png` … `kids-snow-6-own-question.png`

**What grew:**

- ❄️ *How does snow form?* — "Imagine blowing on a cold window and seeing tiny drops of fog appear…"
  - 🔍 *Why is each flake different?* → ⭐ *Why are flakes six-sided?* → 📷 *Who photographed snowflakes?* (Wilson Bentley, a Vermont farmer) → ❄ *Why does snow look white?*
  - 🪶 *Why do flakes fall slowly?* · 📏 *How big is a snowflake?* · 🌬️ *How far does snow fall?* · 🌍 *Where does snow come from?*
- **Own question:** "Why is snow white?" was **already on the map**, grown a moment earlier. Explorer recognised that and opened the existing question instead of adding a duplicate, which is the intended behaviour.

**Observations**

- It mixes science (six-sided crystals, scattering of light) with history (Wilson Bentley) and everyday life (falling as fast as a slow walk), the curiosity lenses we designed for.
- Analogies stay concrete and kid-sized: honeycomb blocks, broken glass that looks white, a feather vs. a rock.

## 3. Researcher · "Protein structure prediction (AlphaFold)" for a statistician

Background given: *"Statistician, postdoc: Bayesian hierarchical models, MCMC, time series, R and some Python."*
Screenshots: `researcher-protein-1-topic.png` … `researcher-protein-6-own-question.png`

**What grew:**

- **Already yours:** Bayesian hierarchical models · MCMC sampling · Time series analysis · R and Python
- *What information does a sequence really carry?* (core) → *How do multiple sequence alignments reveal coupling?* → *How does a Potts model fit couplings?* → *How does pseudolikelihood make Potts fitting tractable?* · *Can a full Bayesian posterior over couplings be sampled?* (frontier)
- *What does sampling a posterior have to do with folding?*: "Your MCMC intuition about multimodal targets and mixing maps directly onto why folding landscapes are hard to explore."
- *How well do predictions capture conformational uncertainty?* (frontier)
- **Own question:** "How is the confidence score of a predicted structure calibrated?" was placed under the uncertainty question, explaining pLDDT and predicted aligned error, with the bridge: "do the stated uncertainties match observed frequencies, which you would check with reliability diagrams".

**Observations**

- **The bridges are the highlight.** Every step translates the new field into the statistician's own language:
  - separating direct coupling from indirect correlation ≈ separating direct effects from confounding
  - pseudolikelihood ≈ the full conditionals used in Gibbs sampling
  - subsampling an alignment ≈ a power analysis
- **The path is selective:** it goes deep on the one route where a statistician has an edge (co-evolution → Potts models → inference), rather than covering all of structural biology.
- **The explanations are accurate**, e.g. the Anfinsen principle, pseudolikelihood avoiding the partition function, and pLDDT as predicted lDDT-Cα.

## 4. Full intake with materials · researcher

Screenshots: `intake/r-0-welcome.png` … `intake/r-8-grown.png`

**Answers given:**
- **Level:** PhD student
- **Expertise:** Materials science and Chemistry, specifically "thin-film growth, XRD, SEM, annealing studies"
- **Skills & hobbies:** coding, baking, strategy games
- **Topic:** ML interatomic potentials. **Already knows:** "a little: they replace DFT for bigger MD, but not how they're trained or how far to trust them."
- **Why:** collaboration. **Sparked by:** a paper.
- **Materials:** a 1-page seminar abstract (PDF), plus a note: "A groupmate will present this next week; I want to ask good questions."

**Result:**

- **Your path** (shown first): "Start with what an interatomic potential is fundamentally for, then focus on how it is trained and how you check it, since that is where the speaker's claims can be tested. Your XRD and annealing experience lets you judge the lattice-expansion validation directly, so spend your effort there. You can safely skip neural network architecture details for now…"
- **From your materials:** a faithful summary of the PDF (2,400 DFT configurations, active learning, held-out errors, XRD validation within 0.05%), ending with the open gaps "which are good questions to ask the speaker".
- **The first questions came from the paper itself:** *How is the training set built and why does it matter?*, *How do held-out errors relate to lattice expansion?*, and a strength: *annealing and XRD validation expertise*.

**Observation:** this is the core idea working end to end. Explorer doesn't summarise everything. It tells this person **what to focus on, what to skip, and which of their strengths to use**, grounded in their own materials and purpose.

## 5. Full intake · kids (age 7, loves animals, drawing, baking)

Screenshots: `intake/k-1-age.png` … `intake/k-5-grown.png`

The "imagine" moments picked up the child's interests, e.g. "When you bake cookies, the golden brown on top comes from heat changing the dough. Sunlight hides many colors that can split apart too."

---

## 6. Opening scene and journey (screenshots in `journey/`)

- **Researcher (`jr-*`):** night sky over Earth's horizon, with two people looking up and one pointing at a bright star (`jr-1`). Clicking flies the camera up to that star, and Earth appears with the spaceship circling it (`jr-3`). Each answer adds a star on a golden route and the ship flies there: "PhD student" → "Materials science · Chemistry" → "Coding · Baking & cooking" → the topic as a larger blue star (`jr-6`). Going **Back** removes the last star and the ship returns (`jr-7`). After building, the map opens with "You" drawn as Earth and the ship already in orbit (`jr-9`).
- **Kids (`jk-*`, `jt-1`):** a seed (garden) or bud (tree) on a grassy hill, in day or night (`jk-1`, `jt-1`). Each answer grows the plant: a stem for "7 years old" (`jk-3`), leaves with 🐶 🚀 🍪 for what the child loves (`jk-4`), then a bud labelled with the topic while the map is built (`jk-5`). The map opens on that same bud (`jk-6`).

## Overall conclusions

1. **It works for any topic:** 5/5 runs produced sensible, accurate, age- or level-appropriate maps, with no failures or broken output.
2. **Personalisation is real, not cosmetic:** the same engine produced statistics-flavoured bridges for a statistician, XRD-based strengths for a materials scientist, and baking analogies for a child who loves baking.
3. **Selective, not exhaustive:** maps go deep along the route where the person's strengths transfer, and the "Your path" strategy explicitly says what to skip. This is the key difference from asking a chatbot for "everything about X".
4. **Fast enough:** maps in 6–15 s; each next layer is prepared while you read, so after the first map there's usually no waiting.
5. **To improve:**
   - stricter duplicate checks (rainbow case)
   - a "please verify" note on AI answers in research mode
   - the hosted (Netlify) version caps uploads at about 4 MB, versus 10 MB locally, until uploads go through file storage
