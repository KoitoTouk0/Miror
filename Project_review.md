# Explorer: project review

> Thu 22 Oct 2026, 14:10. Deadline 19:00 today. Submission: link + 4-minute video.
> **Live link:** https://explorer-mindflow.netlify.app · **Video script:** `Video_script.docx`

---

## 1. Where things stand

- **The tool is finished and live.** I ran both modes end to end on the public link today, with real AI calls and screenshots at every step, as a materials PhD student learning DFT (your own story) and as an 8-year-old asking about magnets.
- **The walkthrough found five problems, and all are fixed and redeployed:**

  | What happened | Fix |
  |---|---|
  | About 1 in 6 map builds failed: the AI sometimes returned a map with no questions, or a node with an unexpected label | An odd label now falls back to a safe default, and an empty answer is asked again once |
  | A new layer could come back empty | Asked again once |
  | The same question sometimes appeared twice on a map | Near-identical questions are now dropped |
  | A long star label in the opening journey was drawn twice, overlapping | Fixed |
  | A "Powered by Netlify" badge covered the side panel | Turned off |

  An earlier fix today also matters here: the "Grow my map" and "Build my map" buttons no longer go dead when the page can't reach the AI.
- **Still to do today:** record and edit the video, remove the API key from your notes file, and submit.

## 2. The workflow, as tested today on the live link

| Step | Researcher | Kids | Measured |
|---|---|---|---|
| 1. Opening picture | Night sky over Earth's horizon; two people look up at a star | A seed (garden) or bud (tree) on a grassy hill | Instant |
| 2. Click to begin | The camera flies up; Earth appears with a spaceship circling it | The camera zooms into the seed or bud | ~3 s animation |
| 3. Intake | Level → expertise → skills & hobbies → topic (what you know, why, what sparked it) → papers or notes. Each answer adds a star and the ship flies there | Age → what you love → topic. Each answer grows a stem, leaves, then a bud | You set the pace |
| 4. Build | The ship circles the topic star | The bud breathes | 8–13 s |
| 5. First view | The map opens from Earth with your skills lit, and **"Your path"** opens first | The garden or tree opens from the same bud | |
| 6. Explore | A quick check, a one-line reflection, or claiming a strength lights a question; the next layer grows (up to 6) | "💡 Imagine…" plus one playful choice; buds bloom | Next layer 7–16 s, mostly prepared while you read |
| 7. Your own question | ✦ Ask: a comet lands on the closest star and a new star appears | Watering can (typed or spoken): a new branch grows where it fits | ~5–10 s, plus the animation |
| 8. Finale | "Your map is lit" with your strengths | "Your garden is in full bloom!" with confetti | |

**Example output from today's run (your persona).** "Your path" said:

> "Start by learning what the approximations mean and how to validate a calculation, since knowing when to trust DFT is your main gap. Skip deriving Kohn-Sham equations in depth for now and focus on convergence and benchmarking. Your experimental habits of calibrating, controlling variables and comparing to data will help most, and your colleagues can cover the mathematical detail."

Strength stars appeared for "lattice and strain from your XRD work" and "systematic controlled comparisons". That is your original ambition, produced by the tool.

## 3. The initial to-do list and progress

✅ done · ◐ partly · ✗ not done · ⏳ today

### From your original notes (`Intact_drive_undecorated.md`)

| Item | Status | Notes |
|---|---|---|
| Two modes: kids/explorer and researcher, researcher first | ✅ | One engine, two worlds |
| Enter your knowledge level and background on the region you're interested in | ✅ | Researcher intake, 5 short steps |
| Learn about collaborators' work and what they might want from you | ◐ | Upload their paper or notes, and pick "Collaboration" as the purpose; "Your path" and the first questions use them. No separate "what they need from you" view yet |
| Use the LLM's broad knowledge for research mode | ✅ | Claude Haiku 5.5, any topic, up to 6 layers |
| Automatically choose the best or most cost-effective model; bring your own subscription | ◐ | **Bring your own key: ✅** (researcher mode, ⚙ Settings, added 22 Oct). Model choice ✗: fixed on Haiku for cost |
| Switchable colours: Black & Gold / Blue & White | ✅ | In Settings |
| 3Blue1Brown-style, cartoon or animated demo | ◐ | Designed animations throughout; the video is yet to be recorded |
| Quick test or quiz on background knowledge | ◐ | Replaced by the intake plus quick checks along the map. No separate pre-test |
| Ambition: show what you need **and** your specific strengths | ✅ | "Your path", lit skills, gold strength stars, bridges from your world |
| Stand out from plain LLM chat: visualisation, "mind flow", pop-out quizzes, questions that spark interest | ✅ | The core of the product |
| Prioritise Haiku for budget | ✅ | Under 1 cent per map |
| Submission: link + 4-minute video | ⏳ | Link ✅ · script ✅ · video today |

### From the plan (`Revised_outline.md`, sections 8 and 9)

| Item | Status | Notes |
|---|---|---|
| Light-up map in both modes, ask your own question, Settings, Tour | ✅ | |
| Welcome screen, researcher intake, kids picker | ✅ | Became the opening journey |
| "Building your map" transition, summary/finale screens | ✅ | |
| Sample maps that work offline | ✅ | Plus the built-in answer bank |
| Public link | ✅ | Netlify, free plan |
| Researcher visual decision (constellation or research tree) | ✅ | Constellation, plus Earth and a spaceship |
| AI step (was the "stretch" goal) | ✅ | Went beyond the plan: any topic, 6 layers, reads PDFs |
| Fertilizer: new papers change an existing map | ✗ | The intake and materials act as the first feed. Feeding later is on the roadmap |
| "Please verify" note, real citations | ✗ | Roadmap |
| Model picker, accounts, saved progress, team maps | ✗ | Roadmap |
| Stop adding features at 15:00 Thu | ⏳ | Today's walkthrough fixes are the last changes |

## 4. What changed from the original plan, and why

| Plan on Wednesday | Now | Why |
|---|---|---|
| A static site with hand-made sample maps; live AI only as "bring your own key" | A hosted app whose AI runs on a private server, so the key never reaches the browser | Live maps for *any* topic are the real value. With Haiku, a map costs under a cent |
| Preset personas and topics | An open intake for anyone and any topic | Your feedback: presets felt fake for a real tool |
| A plain welcome screen | A cinematic opening: people on Earth looking up (researcher) or a seed on a hill (kids). Every answer grows the scene | Your idea: the journey starts from the first click |
| Constellation or research tree | Constellation, with Earth as "You" and a spaceship flying star to star | Your choice. It reads as an exploration |
| Kids' own questions answered only from a vetted bank | The AI answers with strict, kid-safe structured output; the bank is the fallback | Any question can now grow the tree |
| Upload via Netlify Drop | Netlify functions, deployed from this Mac | Drop can't run the AI |
| Headline: "shows you what you bring" | Headline: **"a path, not information"**, with "what you bring" as its core | Your highlight: in the AI era, the amount of information isn't the point |

## 5. Evaluation

### Strengths

1. **A clear, personal idea.** It comes from your real experience, and there's a crisp contrast with chatbots: a chatbot answers what you ask, while Explorer designs the path and starts from your strengths.
2. **Experience and visuals.**
   - Two distinct, polished worlds.
   - A continuous journey from the first click to the map.
   - Consistent motion: stars light up, buds bloom, the ship flies, comets land, the tree is watered.

   This is what will stand out in a video.
3. **AI quality where it counts.**
   - "Your path" is specific and honest: it says what to skip.
   - Bridges and strengths connect accurately to the person's own background.
   - Kids' explanations start from everyday life, with playful, safe quizzes.
4. **Practical engineering.**
   - Answers usually arrive in 8–13 s and cost under a cent.
   - The key is kept private.
   - It falls back to built-in content, retries hiccups, and was tested end to end on the live link.

### Weaknesses and risks (honest)

| Issue | Impact | Mitigation now |
|---|---|---|
| AI answers carry no "please verify" note or citations | Researchers will ask "is it correct?" | Say it in the video as next step; keep a "please verify" line in the submission text |
| Questions that mean the same thing in different words can still both appear | Occasional repetition | The word-based check catches near-identical ones only |
| Waits of 8–13 s for a map and 5–10 s for your own question | Fine live (there's animation), slow on video | Cut the waits when editing |
| Fertilizer after the build isn't built | The "what you bring" side grows only from the intake | Roadmap slide |
| The collaborator angle is implicit | Part of your original goal | Mention "a collaborator's paper" in the demo |
| On phones, the journey's stars sit behind the question card; the opening caption is tight | Phone viewers miss part of the opening | Say "best on a laptop" in the submission |
| Dense researcher maps: analogy labels can overlap | Minor clutter | Zoom in when filming |
| The public link's AI runs on Netlify's AI Gateway: your Netlify credits, and about 10 requests a minute on the free plan | Several judges at once could hit the limit | Add your own `ANTHROPIC_API_KEY` in Netlify's settings and redeploy (see `How_to_run.md`). Visitors can also use their own key |

**Overall:** a strong hackathon entry. The concept and visuals are above typical, it works live for any topic, and the remaining gaps are standard roadmap items you can name honestly. The biggest lever now is the video.

## 6. Highlights to show judges

1. **"A path, not a pile."** "Your path" says what to focus on, what to skip, and which strengths to use, in your own words.
2. **Strengths, not just gaps.** Your skills are lit from day one; gold stars mark where your background is an advantage, with bridges back to your world.
3. **A journey from the first click.** Earth and a spaceship, or a seed that grows with every answer.
4. **One engine, two audiences.** Researchers moving between fields, and kids asking "why?".
5. **Your own questions grow the map.** A comet, or a watering can you can talk to.
6. **Any topic, live, under a cent per map,** with the key kept private.

## 7. Your story

**One line:** *"I switched from experimental materials science to simulation and struggled, until I realised my experimental habits were a strength. Explorer helps anyone entering a new field find that path."*

**The arc for the video:**

1. **Origin.** You trained as an experimentalist and joined a fully simulation-based PhD group. You struggled, and so did groupmates from physics, math and CS. Everyone chased what they lacked and forgot what they brought.
2. **Insight.** In the AI era, information isn't scarce; a good path is. A team gains most from complementary strengths: one more fisher adds a catch, a sashimi expert multiplies the value of every catch.
3. **Tool.** Explorer starts from where you stand, designs the path, and shows you what you bring.
4. **Proof.** Your own profile. Explorer tells you that your habit of calibrating and comparing to data is your biggest advantage in DFT. That's the insight you wished you'd had.
5. **Wider.** The same idea for kids: curiosity grows a tree, and their own questions become new branches.
6. **Vision.** Feed the map new papers, add real citations, build maps for whole teams.

## 8. Suggestions

### Today, before 19:00 (feature freeze now)

| When | What |
|---|---|
| 14:30–15:00 | Remove the API key from line 12 of `Intact_drive_undecorated.md`. Check that the key has a spending limit in the Claude Console. Do one practice run per mode and note what your "Your path" says |
| 15:00–16:45 | Record. ⚙ Speed → Slow; Black & Gold for researcher, Growing tree for kids; full-screen browser. Record your voice separately |
| 16:45–17:45 | Edit: cut the waits, add three text cards (your story, the fishing team, chatbot vs Explorer), and an end card with the link |
| 17:45–18:15 | Watch it once end to end. Open the link in a private window and on your phone |
| 18:15–18:30 | **Submit.** Leave 30 minutes of buffer |

**Submission text tip:** add one line: "Best on a laptop in Chrome. AI-generated content: please verify important details."

### After the hackathon

1. **Trust:** a "please verify" label and real citations (OpenAlex, Semantic Scholar) on research answers.
2. **Fertilizer:** drop in a new paper and watch questions you already know turn lit and new strengths appear.
3. **Collaborator view:** "what they need from you" and "questions for your next meeting", from a collaborator's paper.
4. **Smarter duplicate checks:** let the model or embeddings compare meaning, not just words.
5. **Save and share maps;** team maps that combine everyone's strengths (your fishing team, made visible).
6. **Model choice and cost controls:** let people with their own key pick the model (Haiku, Sonnet or Opus), and add a per-visitor limit on the public link.
7. **Speed:** stream the map as it's written, so the first star appears in about 2 s.
8. **Phones:** keep the journey's stars visible above the question card.

## 9. The 4-minute video

**Concept: "From where you stand."**
- One continuous journey that mirrors the product: the night sky, your story, the idea, your own map, kids mode, the close.
- Calm narration, one idea per scene, Black & Gold. The tool's own motion does the 3Blue1Brown-style animation.
- Three simple text cards made in your editor: your story, the fishing team, chatbot vs Explorer.

| Time | Section | On screen |
|---|---|---|
| 0:00–0:23 | 1 · Introduction | The researcher opening picture; title "Explorer · find your path, not more information" |
| 0:23–0:50 | 2 · My story | Starry sky, or a card: "Experimental lab → simulation group" |
| 0:50–1:12 | 3 · The idea | Card: one more fisher vs a sashimi expert → "Complementary strengths multiply" |
| 1:12–1:40 | 4 · Researcher journey | Click → Earth and ship; your answers become stars |
| 1:40–2:06 | 5a · Your path | The map opens from Earth; hold on "Your path" |
| 2:06–2:25 | 5b · Lighting up | Answer a question; the next layer grows; claim a gold strength |
| 2:25–2:43 | 6 · Your own question | ✦ Ask → comet → new star |
| 2:43–3:22 | 7 · Kids mode | Bud → age, loves → magnets tree → "Imagine…" → spoken question → watering |
| 3:22–3:47 | 8 · Why it's different | Card: chatbot vs Explorer, or the zoomed-out map |
| 3:47–4:00 | 9 · Closing | Full map → end card with the link |

**How to open the video:**

> "In the age of AI, information is everywhere. You can ask a chatbot anything. But when you step into a new field, the hard part isn't finding information. It's finding your path: what to focus on, what to skip, and how to use what you're already good at. This is Explorer."

The full narration, labelled by section with on-screen cues, a timing table, a recording checklist and two alternative openings, is in **`Video_script.docx`**.
