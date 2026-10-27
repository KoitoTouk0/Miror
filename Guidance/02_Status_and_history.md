# 02 · Status, history, barriers

## What's built (all working; tested locally and live on 22 Oct)

- **Opening journey (current version).**
  - The "Who's exploring" card leads to an opening picture for the chosen mode:
    - researcher: two people on Earth's horizon under a night sky
    - kids: a seed or bud on a grassy hill
  - Clicking zooms in. Each intake answer then grows the scene: a new star the ship flies to, or a stem, leaves and a bud.
  - Building zooms into Earth or the bud, and the map opens from there.
  - *The user has asked to redesign this; see `04_Next_steps.md`.*
- **Opening (redesigned Thu 17:15, replaces the "Who's exploring today?" card and the 04_Next_steps plan):** on load, stars and constellations turn and zoom into a spinning Earth, then dive down to **one picture**: a vast constellation sky with meteors and comets = **Research extension**; a cartoon land with swaying flowers, two fruit trees and two people looking up = **Interest exploration** (ages 5–12 and **12+**). Clicking a side opens a **side panel** with a concrete introduction, a big start button and large sample cards (research: the sample map card; interest, since 17:28: **pictures to tap**, shown first: a fruit tree = the planes sample in tree style, a flower field with a buzzing bee = Bea's garden, a little land with a house and plots = Our land). Deployed 17:22 and 17:28. Start goes straight into that mode's journey; Back from the first question returns to the picture. "12+" is sent as age 13 and the AI writes for "a teen or an adult".
- **Thu 17:35–18:05, LOCAL ONLY (not deployed yet):** family silhouette (dad, mum, boy, girl holding hands) on the opening; kids' own questions about the same subject count as on-topic ("Can cats see in the dark?" on a cat map); researcher **interlink**: the map's third first question is always a gold strength star; clicking it turns the panel semi-transparent, lists the strengths you bring and every skill → new-field bridge, and draws gold lines from all your known items to it. Recordable demos: `Guidance/tools/demo-interest.js` and `demo-research.js` (visible full-screen Chrome with a gliding cursor; demo file `samples/demo/group-onboarding-notes.txt`).
- **Intake journey (redesigned Thu 17:05):** kids answers *prepare the ground* (age → dig a hole with a shovel; loves → rake and water the soil, love-emoji bubbles; topic → a seed hops from the seed bag into the hole and the spot gets the topic's name). The plant grows **only after "Grow my map"**, once the seed has landed. Researcher answers *build the ship* at a dock beside Earth (level → materials crates, expertise → hull, skills → engines and fins, topic → course to the topic star, materials → fuel), with a build log of pills. After "Build my map": countdown, launch, the ship circles Earth and **dark stars** appear: **Principles**, **Applications** and three "?". The researcher map prompt now makes Principle and Application the default orientations of the first questions (the third builds on strengths).
- **Intake:**
  - **Steps:** researcher in 5 short steps, kids in 3.
  - **Materials:** PDF, TXT or MD files are sent to the AI (≤10 MB locally, 4 MB hosted).
  - **Navigation:** Back works, and the "Grow my map" / "Build my map" button never goes dead.
- **The AI builds any topic** (Claude Haiku 5.5).
  - **Start:** the first map, including "Your path" and a materials summary, in 8–13 s.
  - **Growth:** the next layer grows as you answer, up to 6 layers, prefetched while you read (7–16 s each).
  - **Off-script questions:** a question that's on the topic but fits no branch becomes a new branch from the root; an off-topic question is redirected to a new map.
- **The map:** a light-up knowledge graph.
  - **Node states:** hidden → open → lit.
  - **Interaction:** click to zoom; a Next guide; quick checks, reflections and claimable strengths.
  - **Endings:** finale screens; a Tour that plays the exploration for recording.
- **Own questions:**
  - **Asking:** a comet (researcher), or a watering can with voice input in Chrome (kids).
  - **Placement:** duplicates open the existing node instead of adding a new one.
  - **Offline fallback:** a built-in answer bank.
- **Researcher extras:** Earth as "You"; a spaceship orbiting and flying between stars; **your own API key** in ⚙ Settings (checked first, stays in the browser, sent straight to Anthropic, researcher mode only).
- **Kids extras:** two worlds (garden or tree); day or night; smiling flowers, butterflies, an owl, confetti.
- **Fun-fact fertilizer (kids, LOCAL ONLY so far, added Thu ~15:40):** a sack with "?" next to the watering can → confirm → the AI writes a true 1–3 sentence fact tied to what the child loves, and it grows as a golden "!" fruit (tree) or blossom (garden) on the most relevant branch. The panel shows the fact, "💛 Picked for you because you love …" (only when the fact really is about that interest) and "Another fun fact!". Facts don't count toward progress and don't block a branch from growing. The sample garden uses 7 built-in facts first. ~4–6 s per AI fact.
- **Group lands "🏡 Our land" (kids, LOCAL ONLY so far, added Thu ~16:00):** a class, family or friend group shares one land, joined by a 6-letter code (e.g. "Hogwarts Grade IV"). Everyone picks a nickname + emoji (no accounts, no real names), chooses whether to share their garden/tree (a confirm says exactly what's shared), can update or take it away, and can **visit** anyone's garden: it opens in their world with their grown flowers and fun facts, a "Visiting Mia's tree · Back to mine" bar, and your own garden comes back exactly as it was. Ask and Fun-fact buttons rest while visiting. Made as a gift idea for the user's younger cousin. **Entry:** after "Young explorer", the seed-on-the-hill opening has a wooden signpost "🏡 Our land · See everyone's gardens" (tap the seed = plant your own); the topbar 🏡 button also opens it. **Inside a land (16:45):** the first plot is "🌱 Plant my seed", which goes straight to the age question (no opening page); a garden planted there joins the land once built, and any shared garden **updates itself** in the land as it grows (debounced). An empty land shows 2 **sample gardens** (🦉 Ollie's planes tree, 🐝 Bea's hand-written "How do bees make honey?" garden in `data/kids.js` → `landSamples`). The visiting bar has "🏡 Land" and "🌱 Back to mine". Plots are light cards with dark text; the code sits on a light badge (yellow text was hard to read).
- **Settings:** mode, kids world, theme, animation speed (Slow for recording), zoom options, reset, sample map, AI status.
- **Robustness:**
  - **Odd AI labels** fall back to safe defaults.
  - **Empty maps or layers** are asked again once.
  - **Near-identical questions** are dropped.
  - **Opened as a file or another preview?** The page moves itself to the local server.
  - **Phones:** works (bottom-sheet panel), but best on a laptop.
- **Docs:** `Conclusion_outline.md`, `Project_review.md`, `How_to_run.md`, `samples/Sample_runs.md`, `Video_script.docx`.
- **Screenshots:** `samples/` (sample runs), `samples/journey/` (opening journey), `samples/review/` (the full walkthrough from 22 Oct).

## Decision history (short)

| When | Decision |
|---|---|
| Wed 21 Oct | Two modes on one engine; light-up map first. Settings hold personal preferences (theme etc.) |
| Wed | Kids: garden plus a growing-tree option; click-to-zoom; watering can (+ voice) for own questions |
| Wed | Researcher visual: **keep the constellation**, add a **spaceship** flying star to star (the "research tree" idea was dropped) |
| Wed | AI: **Claude Haiku 5.5** through a small server; the key stays server-side. A Claude Pro subscription doesn't include API usage |
| Wed | Explore **any topic**, max **6 layers**; unfitting on-topic questions start a new branch |
| Wed evening | Presets felt fake, so an **open intake** (level, expertise, skills & hobbies, topic, materials ≤10 MB; kids: age, loves, topic) |
| Thu morning | Opening journey: seed/bud for kids; people on Earth looking up for researchers; answers grow the scene |
| Thu 13:00 | Public link on **Netlify** (free plan), chosen over Vercel, Render and others: already set up, no GitHub needed, no sleeping |
| Thu 14:00 | Full walkthrough: fixed flaky map builds, empty layers, duplicate questions, a garbled label; removed the Netlify badge |
| Thu 14:30 | Researcher mode: **use your own API key** |
| Thu 14:50 | **Rule:** test locally; change the live site only when asked |
| Thu 15:00 | Requested: **new combined opening page** (pending) |
| Thu 15:20 | **Story focus:** researcher mode = **strengths**; kids mode = **interest**. Added the kids' **Fun-fact fertilizer** (local only) |
| Thu 16:00 | Requested: **group lands** (class/family/friends share gardens). Built locally: code-based, nickname only, opt-in sharing, owner-only update/remove |
| Thu 15:20 | **Rule restated:** everything local first; Netlify only when the user says "update"/"redeploy" |

## To-do vs progress (condensed)

✅ done · ◐ partly · ✗ not done

- ✅ Two modes · intake (level, background, region, purpose, materials) · light-up map · ask your own question · themes · Haiku for budget · any topic with the AI · public link · video script
- ◐ **Collaborator angle:** materials plus the "Collaboration" purpose shape the path; no separate "what they need from you" view yet.
- ◐ **Model choice:** own API key ✅; picking the model ✗.
- ◐ **3Blue1Brown-style video:** the script is ready; the video isn't recorded yet.
- ◐ **Background quiz:** replaced by the intake plus quick checks along the map.
- ✗ **Fertilizer after the build** (new papers changing an existing map) · "please verify" note and citations · saved or shared maps · team maps.

## Barriers met and lessons learned

1. **Netlify AI Gateway (important).**
   - **What it does:** Netlify injects its own `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL` into functions when the site has no key of its own. The live AI therefore runs on **Netlify credits**, not the user's key.
   - **Cost:** $1 of AI usage costs 180 credits, so about 0.3 credits per map, against 300 credits a month on the free plan. Each production deploy costs about 15 credits.
   - **Limit:** about **10 AI requests a minute** on the free plan, shared by all visitors.
   - **Effect on own keys:** visitor keys must use `baseURL: https://api.anthropic.com`, or the gateway rejects them with "401 (no body)".
   - **Recommended:** the user adds their own `ANTHROPIC_API_KEY` in Netlify → Project configuration → Environment variables (scope: Functions, secret), then asks for a redeploy.
   - *An earlier statement that "the deploy copied the key from `.env`" was wrong and was corrected.*
2. **Flaky AI output.** Structured output sometimes came back with an invalid enum value or an empty `first` or `children` array (about 1 in 6 maps on 22 Oct). Fixed with `.catch()` defaults on enums, one retry on parse errors, and one retry on empty maps or layers.
3. **Duplicate questions.** A word-overlap check now drops near-identical ones. Questions that mean the same thing in different words can still slip through.
4. **Netlify specifics:**
   - **Visitor login:** it was on by default for the team; switched off for this site.
   - **Badge:** "Powered by Netlify" covered the panel; switched off.
   - **Limits:** 30 s per function call and a ~6 MB request body, hence the 4 MB hosted upload limit.
5. **The page opened as a file had no AI.** The page now detects this and moves to localhost:8787 when the server runs. `Start Explorer.command` starts everything.
6. **Earlier:**
   - The API key was once pasted into `demo/styles.css` and moved to `.env`. The user was advised to rotate it.
   - **The key is still on line 12 of the intact notes file:** the user should remove it by hand.
7. **Safety check:** Claude can't write secrets to third-party stores (Netlify env vars), so the user does that step.

## Measured (22 Oct)

| Measure | Result |
|---|---|
| Map build | 8–13 s |
| Next layer | 7–16 s (mostly hidden by prefetch) |
| Own question | ~5–10 s plus animation |
| Cost | Haiku ≈ $0.001–0.002 per call; all testing so far cost a few cents |
