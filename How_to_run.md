# How to run Miror

## On this Mac (full version, with AI)

1. Double-click **`Start Miror.command`** in this folder. The first time, macOS may ask whether to open it: choose **Open**.
2. A Terminal window starts the AI server, and the app opens in your browser at http://localhost:8787.
3. Keep that Terminal window open while you use Miror. Closing it stops the AI.

The AI key is read from `.env`, which stays on this computer. If the page is opened another way (double-clicking `demo/index.html`, or a VS Code preview), it moves to http://localhost:8787 by itself while the server is running.

**Without the server**, sample maps, the tour and the built-in answers still work. Pressing "Grow my map!" or "Build my map" then explains how to start the AI instead of doing nothing.

## Public link (for judges)

**https://explorer-mindflow.netlify.app**

- **Live since 22 Oct 2026** on Netlify's free plan, under the project `explorer-mindflow` (team "Yiming Yang's team").
- **Tested on the live site:** a kids map in a real browser, and a researcher map in 12 s.
- **How it's built:** `netlify.toml` publishes `demo/`. The AI code runs as four functions on Netlify's servers (`/api/health`, `/api/map`, `/api/expand`, `/api/ask`).

**Updating the live site after a change:** ask Claude to "redeploy". Or, from this folder with the Netlify tool signed in, run `netlify deploy --prod`. Netlify's drag-and-drop upload does **not** run the AI functions, so don't use it.

**Who pays for the AI on the public link:**
- **By default, your Netlify account does.** Netlify's "AI Gateway" gives the site its own Claude access, so your Anthropic key is **not** on Netlify. Usage comes out of your free Netlify credits: 300 a month, with each $1 of AI usage costing 180 credits, so about 0.3 credits per map. Each live deploy costs about 15 credits.
- **The catch:** the free plan's AI Gateway allows only about 10 AI requests a minute, shared by all visitors.
- **Recommended before judging:** let the site use your own Anthropic account instead.
  1. In Netlify, open the project **explorer-mindflow** → **Project configuration** → **Environment variables** → **Add a variable**.
  2. Set the key to `ANTHROPIC_API_KEY` and the value to your API key. Tick "Contains secret values", and limit the scope to Functions.
  3. Ask Claude to "redeploy".

  The site then calls Anthropic directly: no Netlify credits for AI, and your own rate limits. Your key's spending limit caps the cost. Delete the variable after judging.

**Visitors' own keys (researcher mode):** anyone can paste their own Anthropic API key into ⚙ Settings → "Your own API key".
- Miror checks the key first, then uses it for that visitor's research maps, layers and questions.
- The key stays in the visitor's browser: for the open tab only, or remembered if they tick the box. It goes straight to Anthropic with each request and is never stored on the server.
- Kids mode always uses the site's own access.

**Upload limit:** hosted uploads are limited to 4 MB per map (Netlify's request limit), versus 10 MB locally.
