# 03 · Technical guide

## Architecture

```
Browser (demo/: HTML/CSS/JS + D3 v7, no build step)
   │  POST /api/map | /api/expand | /api/ask | /api/fact | /api/group | /api/check-key,  GET /api/health
   │  (header x-explorer-key = visitor's own key, researcher mode only)
   ▼
Local: server.mjs (port 8787, serves demo/ too)    Hosted: netlify/functions/*.mjs (same logic)
   ▼
api/explorer-ai.mjs → Claude Haiku 5.5 (claude-haiku-5-5), structured JSON only
```

The AI writes only text in a fixed JSON shape. All visuals, layouts and animations are preset in the front end, and built-in sample maps and answer banks are the offline fallback.

## File map

| Path | Role |
|---|---|
| `Intact_drive_undecorated.md` | The user's raw notes. **Never edit.** Line 12 still holds a key: the user removes it by hand |
| `Revised_outline.md` · `Conclusion_outline.md` · `Project_review.md` · `How_to_run.md` | Plan (Wed) · pitch · review (Thu) · run and deploy guide |
| `Video_script.docx` | 4-minute narration by section (generator: `Guidance/tools/make-script.js`) |
| `Start Explorer.command` | Double-click: installs if needed, starts the server, opens the browser |
| `server.mjs` | Local server: static `demo/` (path-traversal guard) + API routes. Body limit 15 MB for `/api/map`, 256 KB otherwise. `/api/health` sends CORS `*` |
| `api/explorer-ai.mjs` | All AI logic: `startMap`, `expandNode`, `askExplorer`, `funFact` (kids fun facts; rotates through `loves`, returns `about_love`), `checkKey`, `withKey`, `similar` |
| `api/groups.mjs` | Group lands: `groupAction(store, {action: create\|get\|share\|map\|remove})`. Cleans every shared garden (whitelisted text fields, one root, ≤160 nodes, ≤60 gardens per land). Ownership = sha256 of a browser secret. Stores: `fileStore(dir)` locally (`data/groups/`, gitignored), `blobStore()` on Netlify |
| `api/http.mjs` | Shared: `KEY_HEADER`, `keyFrom()` (sanity-checks a key), `failure()` (maps errors to a status and code) |
| `netlify/functions/{map,expand,ask,fact,check-key,health}.mjs` | Netlify versions, each with `config.path` `/api/...` (`fact.mjs` and `group.mjs` are new and not deployed yet; `group.mjs` uses Netlify Blobs store `explorer-groups`, strong consistency, untested on Netlify until the first deploy) |
| `netlify.toml` | Publishes `demo/`, functions in `netlify/functions`, esbuild bundler |
| `package.json` | `"type":"module"`; `npm start` = `node --env-file-if-exists=.env server.mjs`; deps `@anthropic-ai/sdk` ^1.1.0, `zod` ^4 |
| `.env` (600, gitignored) · `.env.example` · `.gitignore` | `ANTHROPIC_API_KEY=…`; never print it |
| `demo/index.html` | Topbar (🧭 New topic, ✦ Ask, Tour, Fit, ⚙), Settings (incl. the own-key field), panel, legend, watering can, asker dialog, `#scene` svg, `#explore` card. Scripts: d3, data/researcher.js, data/kids.js, graph.js, scene.js, ask.js, intake.js, app.js |
| `demo/styles.css` | Main styles + theme variables. **The user has edited this file: read it before editing** |
| `demo/explore.css` | Intake card, scene/journey styles (`s-*`), own-key field styles |
| `demo/graph.js` | `ExplorerGraph.create`: D3 force layout with tidy-tree targets; skins `constellation` / `garden` / `tree`; light, reveal, zoom, flyTo, water, comet, Earth node, ship; exports `SHIP_SVG`, `CAN_SVG` |
| `demo/scene.js` | `ExplorerScene.create(svg)`: opening picture + intake journey. API: `show(mode, kidsWorld, onBegin, onLand)` (kids: `onLand` adds the "Our land" signpost), `setProgress`, `building`, `stopBuilding`, `finish()`, `hide`, `setWorld`, `isOn` |
| `demo/intake.js` | `ExplorerIntake.open(opts)` and `resume(step)`. Steps: researcher `who, level, fields, skills, topic, materials`; kids `who, age, loves, topic`. Options: `mode, kidsStyle, aiOn(fn), recheck(fn), startAt, onMode, onWho, onStep, onWorld, onClose, onSample, onSubmit` |
| `demo/app.js` | Wiring: settings, maps, panel, prefetch/growth (`MAX_LAYERS = 6`), `post()`, ask flow, AI status (`checkAI`, `aiReady`), own key (`keyInUse`, `useKey`, sessionStorage/localStorage `explorer-api-key`), `openExplore`, `startJourney`, `buildMap`, tour |
| `demo/group.js` | `ExplorerGroups.create({ garden, visit, plant, toast, before })` → `{ open, shareTo(code), sync() }`: the land screen (join/create, plots, share/update/remove, visit). Remembers nickname, emoji, lands, secret and your shared ids in localStorage `explorer.groups` |
| `demo/ask.js` | Offline matcher `ExplorerAsk.plan` (duplicates, answer bank, best parent) |
| `demo/data/*.js` | Sample maps + answer banks (researcher persona; kids "How do planes fly?") |
| `samples/` | Sample-run screenshots and JSON, `journey/`, `review/` |
| `Guidance/` | This handoff; `tools/` holds test scripts |

## AI module details (`api/explorer-ai.mjs`)

- **The call:** `client.messages.parse({ model, max_tokens, system, messages, output_config: { effort: "low", format: zodOutputFormat(schema) } })`.
- **Schemas:**
  - `NodeOut`: kind (`core`/`bridge`/`edge`/`frontier`; `.catch("core")`), label, emoji, question, explanation, bridge, analogy, task_type (`.catch("reflect")`), quiz fields, reflect_prompt.
  - `MapOut`: strategy (the "Your path" text), materials summary, known items, root, first.
- **Robustness:** one retry on unreadable output; `callMap` retries an empty `first`; `expandNode` retries empty children and drops near-duplicates with `similar()` (word Jaccard ≥ 0.7, or containment ≥ 0.9 with at least 4 words).
- **Visitor keys:** `withKey(key, fn)` keeps the key in AsyncLocalStorage for that request only. `clientFor()` uses `direct(key)` = `new Anthropic({ apiKey, authToken: null, baseURL: "https://api.anthropic.com" })`. Without a visitor key it uses the environment (local `.env`, or Netlify's AI Gateway).
- **Errors:** 401 `bad_key` · 402 `no_credit` · 413 `too_large` · 502 `ai_unavailable`. The page explains each one.
- **Prompts:** `PHILOSOPHY` (selective; start from strengths; hobby analogies only if accurate), `KIDS_NODE_RULES(age)` and `RESEARCHER_NODE_RULES`, plus separate map and expand system prompts.

## Run locally

- **Start:** double-click `Start Explorer.command`, or run `npm start` in the project folder, then open http://localhost:8787. Check: `curl localhost:8787/api/health` should return `{"ai":true,"model":"claude-haiku-5-5"}`.
- **URL options for recording:** `?mode=researcher|kids`, `?kids=garden|tree`, `?theme=gold|blue`, `?speed=slow`, `?sample=1`, `?light=all` or `?light=q1,q2`, `?open=q2`, `?tour=1`, `?explore=1`.

## Test tools (`Guidance/tools/`, run `npm install` there once; uses local Chrome)

| Script | Use |
|---|---|
| `review.js <outDir> [researcher\|kids]` | Full walkthrough with screenshots and network logging. Defaults to http://localhost:8787; set `BASE=https://explorer-mindflow.netlify.app/` to check the live site (uses its AI credits) |
| `grow.js <down\|file\|port\|build> <outDir>` | Checks the build button from file://, from another port, and with the server down |
| `byok.js <outDir> [baseUrl]` | Own-key flow; best against a keyless server (`env -u ANTHROPIC_API_KEY PORT=8788 node server.mjs`). Reads the real key from `.env` and never prints it |
| `mobile.js <outDir>` | Phone-size check (390×844) |
| `netlify-check.mjs` | Calls the Netlify function handlers directly (`node --env-file=.env Guidance/tools/netlify-check.mjs`) |
| `repro.mjs <payload.json> [runs]` | Repeats `startMap` locally; `sample-map-payload.json` is a researcher payload |
| `make-script.js <out.docx>` | Regenerates `Video_script.docx` (close it in Word first) |
| `funfact.js <outDir> [tree\|garden]` | Fun-fact fertilizer on the sample map (3 sprinkles, screenshots). `PHONE=1` for 390×844 |
| `opening.js <outDir>` | The new opening: intro zoom frames, the picture, both side panels, start, Back, samples, phone size |
| `journey.js <outDir> [kids\|researcher]` | Both intake journeys with screenshots at each stage; checks the plant/launch only happen after the last step and lists the map's first questions |
| `land-plant.js <outDir> [gold\|blue]` | New land shows samples → visit a sample → "Plant my seed" → build an AI map → it appears in the land → grow one flower → the land copy updates |
| `land-entry.js <outDir>` | Young explorer → signpost → join → visit → back → Plant a new seed → age step. `PHONE=1` for 390×844 |
| `groups.js <outDir>` | Two separate browsers (Mia, Leo): create land, share, join by code, visit, come back, take away. `PHONE=1` for 390×844 |
| `funfact-ai.js <outDir> ["Flower garden"\|"Growing tree"]` | Builds a real AI kids map, sprinkles facts, answers questions to check growth |
| `shoot.js` | Older multi-scenario screenshot script, for reference |

## Deploy (only when the user asks)

| Item | Value |
|---|---|
| Site | **explorer-mindflow**, https://explorer-mindflow.netlify.app |
| Site id, team | see the Netlify dashboard (Free plan) |
| Settings already changed | `sso_login` false (public); `built_with_badge_enabled` false |

1. **Install the CLI** in a temporary folder (not the project): `npm install netlify-cli@27.11.2`. The sign-in persists on this Mac; check with `netlify status`. If signed out: `netlify login --request "<msg>" --json` gives a URL for the user, then `netlify login --check <ticket>`.
2. **Deploy** from the project root: `netlify deploy --prod --message "…"`. Add `--skip-functions-cache` if function changes seem stale.
3. **Logs:** `netlify logs --function map --since 30m` (add `--json` for detail).
4. **Verify after deploying:** `curl …/api/health`, then a real map request, then a browser walkthrough (`review.js` with the live base URL).
5. **Credits:** about 15 per production deploy, out of 300 a month. Don't redeploy casually.

## Gotchas

- Visiting: `visiting` (app.js) overrides `mapData()`; your map waits in `home` as `exportMap()` (nodes + lit ids) and is restored with `loadMode(lit)` → `graph.lightInstant`. `endVisit()` runs before New topic, mode switch and Sample map.
- Fun facts are graph nodes of kind `fact` (`graph.addFact`, `graph.fertilize`, `FERT_SVG`), born lit with `d.lit = true`. Use `questionsOf(n)` in `app.js`, not `n.children`, when asking whether a node has questions.
- `.opt` is the **quiz option** class. Don't reuse it for anything else (it once faded all quiz buttons).
- Scene labels go through `wrap()` in `scene.js` (max 2 lines). Uses the CSS variables `--font-ui` (Inter), `--font-display` (Fraunces, researcher headings) and `--font-kids` (Fredoka).
- Kids colours (`--hill-a`, `--leaf`, …) are only defined in kids mode. Researcher-mode screens need explicit colours.
- Headless puppeteer needs real-time waits: virtual time froze CSS transitions.
- The Word lock file `~$deo_script.docx` appears while the docx is open in Word. Ignore it.
