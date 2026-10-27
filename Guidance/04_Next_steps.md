# 04 · Next steps

## A. Pending Claude task: the new opening page (designed, NOT started)

**The user's request (Thu 15:00):**

> "Opening page: people looking up to a vast, deep-blue sky with an occasional meteor or comet (represents researcher mode), and they are standing on grassland, with the flowers and tree (for kid mode). Click to confirm sides. Also use different fonts for the 2 modes, as you already did, but apply them to the opening page directly."

**Rules:** build and test **locally only**. Do not deploy until the user says "redeploy".

### Design (agreed plan)

One combined picture replaces the "Who's exploring today?" card and the two separate per-mode opening pictures. It's drawn in `demo/scene.js` in the 1440×900 viewBox (slice).

**Sky = researcher side** (top ~65%, its own clickable group `.c-side.c-sky`):
- **Sky:** a deep-blue gradient (≈ `#030a24` → `#0a1f57` → `#173f8f` → `#2a5db0` near the horizon), a starfield, a faint Milky Way, and a soft horizon glow.
- **Zoom target:** a bright pulsing star at about (935, 285), the one the adult points at.
- **Meteors:** every ~1.4–3.8 s a meteor streaks diagonally (head plus a gradient tail on a thin triangle path, ~0.7–1.1 s). About 1 in 4 is a slower **comet** with a bigger glowing head and a long bluish tail (~3–4 s). Meteors stay behind the hills. Skip them if the system asks for reduced motion.
- **Label in the researcher font:** title "Researcher or learner" (Fraunces, `--font-display`, ~48px, near white); sub-line "Explore a new field, starting from your own strengths" (Inter); hint "✦ Click the sky" (small caps).

**Grassland = kids side** (`.c-side.c-grass`):
- **The land:** back hills, then a cartoon **tree** on the right (trunk, round foliage, a few fruits) at about x=1190, then the front hill (feet line ≈ y 700).
- **Details:** grass tufts and about 20 swaying cartoon **flowers** (5 petals, pink, yellow, purple, white and orange; use a fixed seed so the layout is stable for the video), plus a few fireflies.
- **Zoom target:** a small glowing **sprout** at about (520, 748).
- **Label in the kids font:** title "Young explorer" (Fredoka, `--font-kids`, ~44px, cream with a dark-green outline); sub-line "Ages 5–12 · grow a garden of questions!"; hint "🌼 Tap the grass".

**The people:** two silhouettes (an adult pointing up, a child looking up) standing on the front hill, centre-left. Reuse the existing silhouette paths, scaled about 1.5×, dark navy, not clickable.

**Top line:** "Who's exploring today?" plus a small tagline ("Information is everywhere. Explorer finds your path through it."). Top-right: "Look around a sample map →" and a ✕ close (Escape also closes). Place them inside the visible area on phones (compute the visible part of the viewBox).

**Interaction:**
- **Hover or focus:** the side highlights (the sky title glows; the grass title grows slightly, hills brighten).
- **Click or Enter:** picks the side, which calls `onPick(mode)` (the app runs `setMode`). The camera zooms to that side's target (sky star k≈9, sprout k≈7), then the existing `spaceJourney()` or `kidsJourney()` starts and `onBegin(mode)` is called.
- **Phones:** smaller title sizes through a media query.

### Code changes

- **`scene.js`:**
  - Add `choose(kidsWorld, { onPick, onBegin, onSample, onClose })`, a `reset()` helper, the chooser drawing, meteors (timer cleared in `stop()`), and `pick(mode)`.
  - Remove the old `show()`, `kidsOpening()`, `spaceOpening()` and `begin()`.
  - Keep `starfield`, `tufts`, both journeys, `setProgress`, `building`, `finish` and `hide`.
  - Update the header comment.
- **`app.js`:**
  - `openExplore(startAt)`: with `startAt`, open the intake card directly (as now). Without it, show `scene.choose(...)`; `onBegin` adds `.journey` and opens the intake at `"level"` or `"age"`.
  - Move the `ExplorerIntake.open({...})` call into `openIntake(startAt)`, adding `onRestart: () => openExplore()` and `onWho: () => openExplore()`.
  - Share the sample-map handler. Delete `startJourney`.
- **`intake.js`:**
  - `open()` should accept any `startAt` step (`steps().indexOf(startAt)`, falling back to 0).
  - **Back** from the first real step calls `opts.onRestart()`, returning to the chooser.
- **`explore.css`:**
  - Add `c-*` styles: sides, labels per mode font, hover, meteors, flowers swaying with `transform-box: fill-box`, fireflies.
  - Remove unused opening styles (`s-caption`, `s-sub`, `s-cloud`, `s-bob`, `s-seed-shine`, `s-sprout`, `s-sparkle`, `s-horizon`, `s-atmo*`, `.scene.clickable`).
  - **Don't touch `.opt`.**

### Check before handing back (locally)

1. Use `Guidance/tools` against http://localhost:8787:
   - the chooser renders at 1440×900
   - hovering highlights each side
   - clicking the sky starts the researcher journey, which builds into the map
   - clicking the grass starts the kids journey, which builds into the map
   - Back from the first step returns to the chooser
   - the sample link and ✕ work
   - the phone layout (390×844) works
   - there are no console errors
2. Take screenshots into `samples/journey/` and look at them.
3. Update the "On screen" notes for sections 1, 4 and 7 in `Video_script.docx` (generator in `Guidance/tools/make-script.js`), and the opening descriptions in `Conclusion_outline.md`, `Project_review.md` and `samples/Sample_runs.md`.

## B. Today's checklist (deadline 19:00)

| When | Who | What |
|---|---|---|
| Now | User | Remove the API key from line 12 of `Intact_drive_undecorated.md`; check the key's spending limit in the Claude Console |
| Now (optional) | User → Claude | Add `ANTHROPIC_API_KEY` in Netlify's environment variables (scope Functions, secret), then say "redeploy". This avoids the AI Gateway's ~10 requests/minute limit |
| After the opening page | User | Decide whether to publish it ("redeploy") before recording; the video can also be recorded locally |
| ~15:30–17:00 | User | Record. ⚙ Speed → Slow; Black & Gold for researcher, Growing tree for kids; full-screen browser; voice recorded separately |
| ~17:00–18:00 | User | Edit: cut the waits; text cards (story, fishing team, chatbot vs Explorer); end card with the link |
| ~18:00–18:30 | User | Watch once; test the link in a private window and on a phone; **submit by 18:30** |

**Submission text tip:** "Best on a laptop in Chrome. AI-generated content: please verify important details."

## C. Open decisions

- Put the user's own key on Netlify (recommended) or stay on the AI Gateway?
- Publish the new opening page before judging, or keep the current one live?
- What the submission link points to: the live tool (assumed).

## D. Roadmap (after the hackathon)

1. **Trust:** a "please verify" label and real citations (OpenAlex, Semantic Scholar).
2. **Fertilizer:** drop in a new paper and watch the existing map change (known questions turn lit; new strengths appear).
3. **Collaborator view:** "what they need from you" and "questions for your next meeting".
4. **Smarter duplicate checks:** compare meaning (model or embeddings), not just words.
5. **Save and share maps;** team maps that combine strengths (the fishing team, made visible).
6. **Model choice** for own-key users (Haiku, Sonnet, Opus; mind Netlify's 30 s limit); a per-visitor limit on the public link.
7. **Speed:** stream the map so the first star appears in about 2 s.
8. **Phones:** keep the journey visible above the question card.
