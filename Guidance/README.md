# Guidance: start here

This folder condenses everything needed to continue the Explorer hackathon project in a **new conversation window**, without the long history.

**To resume, tell Claude:** *"Read `Guidance/README.md` and the files it lists, then continue with the next step."*

## Read in this order

| File | What it holds |
|---|---|
| `01_Project_brief.md` | Who you are, the story, the core idea, ambitions, the two modes, highlights |
| `02_Status_and_history.md` | What's built, decisions and pivots, to-do progress, barriers and lessons learned |
| `03_Technical_guide.md` | Architecture, file map, API, how to run, test and deploy, gotchas |
| `04_Next_steps.md` | **The pending task** (new opening page, designed but not started), today's checklist, roadmap |
| `tools/` | Test scripts (browser walkthroughs, API checks) and the video-script generator |

## Snapshot (Thu 22 Oct 2026, 15:10, deadline 19:00)

- **Live link:** https://explorer-mindflow.netlify.app. It works in both modes; the AI runs through Netlify's AI Gateway.
- **Local:** double-click `Start Explorer.command`, then open http://localhost:8787. The local copy and the live site run the same code.
- **Deliverables ready:**
  - `Video_script.docx` (4-minute narration, labelled by section)
  - `Project_review.md` (evaluation, to-do progress, your story, video plan)
  - `Conclusion_outline.md` (the pitch)
  - `How_to_run.md`
- **Done since (Thu 15:20–17:15) and DEPLOYED Thu 17:22, live-tested (AI, fun facts, Our land storage, opening, both journeys):** fun-fact fertilizer, Our land (group lands), new intake journeys, the new opening picture with side panels, "12+". See `02_Status_and_history.md`.
- **Pending (you):**
  - remove the API key from line 12 of `Intact_drive_undecorated.md`
  - record and edit the video
  - submit by about 18:30

## Standing rules

1. **Never edit `Intact_drive_undecorated.md`.** It's the user's raw notes, updated by hand only. Claude's revisions go in other files.
2. **Local first.** Apply and test every change on this Mac (http://localhost:8787). **Change the live Netlify site only when the user explicitly asks** ("redeploy"). That covers deploys, site settings and environment variables.
3. **Never print, copy or store the API key.** It lives only in `.env` (mode 600, gitignored). Tests read it from `.env` without displaying it. A safety check blocks Claude from writing it to Netlify's secret store; the user does that themselves.
4. **Roles:** the user isn't a programmer. They own the interface, the experience and the video; Claude writes the code. Explain things in plain language and give recommendations, not surveys.
5. Use **they/them** for the user in written material.
6. Answer in plain English and keep replies focused. The user prefers to be told what was done, verified, and what's next.
