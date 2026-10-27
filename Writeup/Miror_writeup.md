# Miror

**Miror turns "I wonder…" into a knowledge graph that grows.** Instead of givng long, long , it asks you first, then builds a knowledge map that lights up as you explore: kids follow their own interests, and researchers stepping into a new field start from the strengths they already have. It began as a (late) birthday present for Ming, the cousin who never runs out of questions.

*Miror, ergo cogito, ergo sum.* (I wonder, therefore I think, therefore I am.) Let curiosity spark learning again.

[Figure 1: drop in fig1-opening.png]
*Figure 1. One picture, two journeys: the sky is Research extension, the land is Interest exploration.*

## Approach

Answers are now everywhere, instantly. What's scarce is a path through them, and the confidence to start from where you stand. I felt this when I moved from experimental materials science into a simulation-only PhD group. My groupmates came from physics, math and computer science, and we all forgot the strengths we brought. Think of a fishing team of $n$ people who each catch 5 fish. One more fisher raises the catch to $5(n+1)$, adding 5. A sashimi chef who makes every fish worth 30% more raises it to $1.3 \cdot 5n$, adding $1.5n$: that's the bigger gain once $n \ge 4$. Complementary strengths multiply.

How Miror works:

1. **It asks you first.** Kids give their age (5–12, or 12+), what they love and what they wonder about: no tests. Researchers give their level, expertise, skills and hobbies, a target field and, optionally, papers or notes. Each answer animates: a seed is dug in, watered and planted, or a spaceship is built and launched.
2. **The AI writes words; the visuals are designed.** Claude Haiku 5.5 returns text in a fixed JSON schema (structured outputs): questions, "Imagine…" moments, quick checks, a personal "Your path" (what to focus on, what to skip, which strengths help) and bridges from known skills. The animations and D3 map layouts are pre-built, so every map looks right and costs under a cent.
3. **The map grows as you explore.** Answering a question grows the next layer, prepared while you read (up to 6 layers). Your own questions, typed or spoken, are placed on the branch they fit best.
4. **Interest exploration (kids):** *fun-fact fertilizer* grows a true 1–3 sentence fact, tied to what the child loves, as a golden fruit on the most relevant branch. *Our land* lets a family or class share gardens with a 6-letter code: nickname only, opt-in sharing, text only.
5. **Research extension:** the first questions cover the field's **principles** and **applications**, plus a gold **interlink** star that lists the strengths you bring and draws lines from everything you already know into the new field.

Stack: vanilla JavaScript and D3, a small Node server, Netlify Functions and Blobs, and the Anthropic API. Built with Claude Code.

## Results

[Figure 2: drop in fig2-three-views.png]
*Figure 2. Left: a live "How do rainbows appear?" tree with a fun fact. Middle: visiting a cousin's tree in a shared family land. Right: the interlink view for an experimentalist learning DFT.*

- **It works on any topic, live.** A first map takes 8–13 s; new branches appear 1–4 s after an answer; a fun fact takes about 5–9 s including its animation. Each AI call costs about \$0.001–0.002.
- **It found my real strength.** For my own profile (thin films, XRD, annealing → DFT), the map opened with "Principle: how does DFT find the ground-state energy?", "Application: what can DFT predict for my films?" and the strength "calibrating simulations against measured data": the habit that actually helped me most.
- **What I found while building:**
  - The first fun facts drifted into analogies ("like a soccer ball…"). Requiring real facts, and having the model say whether a fact is truly about the child's interest, made "Picked for you because you love birds" honest.
  - Kids' follow-up questions were sometimes judged off topic ("Can cats see in the dark?" on a map about purring) until "the same subject" counted as on topic.
  - About 1 in 6 early maps had an invalid label or an empty layer; safe defaults plus one retry fixed this.
  - Limiting the AI to words, and designing every animation, kept the experience smooth, predictable and cheap.

## Next steps

- **Trust:** a "please verify" label and real citations (OpenAlex, Semantic Scholar).
- **Feed the map:** drop in a new paper and watch an existing map change.
- **Collaboration:** a collaborator view ("what they need from you") and team maps that show complementary strengths.
- **Smarter and safer:** duplicate questions detected by meaning, maps that stream in within about 2 s, and moderation tools for shared lands.
- **Ming's land:** grow it with his friends and see which questions they share.

**Links:** live app [explorer-mindflow.netlify.app](https://explorer-mindflow.netlify.app) · code [add repository link] · video [add video link]
