/* Miror: "ask your own question".
 * Decides where a user's question grows on the map:
 *   - already on the map (same question)  → point to that node
 *   - otherwise                            → a new node on the most relevant branch,
 *                                            with related links to other close matches
 * This offline matcher (keywords + synonyms + a small answer bank) stands in for the
 * LLM step: later, plan() can send the question and the map to a model instead.
 */
(function () {
  "use strict";

  const STOP = new Set(("a an the and or but if of to in on at by for with from into onto about as is are was were be been " +
    "do does did doing done can could would should will shall may might must have has had i me my we our you your it its " +
    "this that these those there here what why how when where who whom which whose so than then too very just really " +
    "get got make made thing things some any all more most much many way ways also not no yes up").split(" "));

  // Words that mean the same thing for matching. Each dataset can add its own.
  const BASE_SYNONYMS = {
    flying: "fly", flies: "fly", flight: "fly", flew: "fly", soar: "fly", float: "fly",
    airplane: "plane", aeroplane: "plane", jet: "plane", aircraft: "plane",
    wingspan: "wing",
    motor: "engine", propeller: "engine", fuel: "engine",
    height: "high", altitude: "high", tall: "high", sky: "high",
    rocket: "space", moon: "space", orbit: "space",
    pigeon: "bird", eagle: "bird", feather: "bird",
    wind: "air", breeze: "air",
    big: "heavy", giant: "heavy", huge: "heavy", jumbo: "heavy", weight: "heavy", heavier: "heavy",
    invent: "first", invented: "first", history: "first", wright: "first",
    curved: "curve", shape: "curve", bent: "curve",
    chopper: "helicopter", rotor: "helicopter",
    landing: "land", runway: "land", wheel: "land",
    speed: "fast", quick: "fast", faster: "fast",
    rain: "cloud", storm: "cloud",
    flip: "upside", loop: "upside",
    rudder: "tail"
  };

  function stem(w) {
    if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
    if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
    if (w.length > 4 && /(ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
    return w;
  }

  function tokens(text, syn) {
    const out = new Set();
    String(text || "").toLowerCase().replace(/[’']s\b/g, "").split(/[^a-z0-9-]+/).forEach((raw) => {
      raw.split("-").concat(raw.includes("-") ? [raw.replace(/-/g, "")] : []).forEach((w) => {
        if (!w || STOP.has(w)) return;
        const s = stem(w);
        out.add(syn[w] || syn[s] || s);
      });
    });
    return out;
  }

  function nodeText(n) {
    const d = n.d, t = d.task || {};
    return {
      label: d.label,
      question: d.question || "",
      rest: [d.why, d.bridge, d.life, t.prompt, t.explain].filter(Boolean).join(" ")
    };
  }

  // Score every node against the question; label hits count most.
  function rank(q, nodes, syn) {
    return nodes.map((n) => {
      const t = nodeText(n);
      const L = tokens(t.label, syn), Q = tokens(t.question, syn), R = tokens(t.rest, syn);
      let score = 0, core = 0;
      q.forEach((w) => {
        if (L.has(w)) { score += 3; core++; }
        else if (Q.has(w)) { score += 2; core++; }
        else if (R.has(w)) score += 0.7;
      });
      return { n, score, cover: q.size ? core / q.size : 0 };
    }).sort((a, b) => b.score - a.score || a.n.order - b.n.order);
  }

  function shorten(text, max) {
    const s = String(text).trim().replace(/\s+/g, " ");
    if (s.length <= max) return s;
    return s.slice(0, s.lastIndexOf(" ", max - 1) > 20 ? s.lastIndexOf(" ", max - 1) : max - 1) + "…";
  }

  function nearestVisible(graph, id) {
    let n = graph.node(id);
    while (n && n.state === "hidden") n = graph.node(n.parent);
    return n;
  }

  // Returns { type: "existing", id } or { type: "new", parentId, related, spec }.
  function plan(text, dataset, graph) {
    const kids = dataset.mode === "kids";
    const syn = Object.assign({}, BASE_SYNONYMS, dataset.synonyms || {});
    const q = tokens(text, syn);
    const all = graph.nodes();
    const ranked = rank(q, all.filter((n) => !n.d.lit || n.kind === "known"), syn);

    // Same question already on the map (even if not grown yet)?
    const top = ranked[0];
    if (top && q.size >= 2 && top.cover >= 0.75 && top.score >= 5) return { type: "existing", id: top.n.id };

    // Best answer from the bank, if any.
    let best = null, bestHits = 0;
    (dataset.bank || []).forEach((entry) => {
      const keys = new Set(entry.keys.map((k) => syn[k] || stem(k)));
      let hits = 0;
      q.forEach((w) => { if (keys.has(w)) hits++; });
      if (hits > bestHits) { best = entry; bestHits = hits; }
    });

    // Parent: the bank's suggested branch, else the best visible match. Known skills can't hold
    // new questions (they live in "your world"), so they become related links instead.
    const canParent = (n) => n && n.state !== "hidden" && n.kind !== "known";
    let parent = best && best.parent ? nearestVisible(graph, best.parent) : null;
    // Only a real hit (a word in a node's label or question) picks the branch; otherwise grow from the root.
    if (!canParent(parent)) {
      const hit = ranked.find((r) => r.score >= 2 && canParent(r.n));
      parent = hit ? hit.n : all.find((n) => n.isRoot);
    }

    const related = ranked
      .filter((r) => r.n !== parent && r.score >= 2 && r.n.kind !== "you")
      .slice(0, 2)
      .map((r) => r.n.id);
    (best && best.related || []).forEach((id) => {
      if (id !== parent.id && !related.includes(id) && graph.node(id)) related.push(id);
    });

    const id = `own-${Date.now().toString(36)}`;
    const asked = String(text).trim();
    let spec;
    if (best) {
      spec = Object.assign({}, best, { id, own: true, asked, label: shorten(best.label || asked, kids ? 34 : 46) });
      delete spec.keys;
      delete spec.parent;
      delete spec.related;
    } else if (kids) {
      spec = {
        id, own: true, asked, emoji: "💭",
        label: shorten(asked, 34),
        question: asked,
        life: "This is your very own wonder question! Miror's helper will look up the answer soon.",
        task: { type: "wonder", explain: "Asking questions is what real explorers do!" }
      };
    } else {
      spec = {
        id, own: true, asked, kind: "core",
        label: shorten(asked, 46),
        question: asked,
        why: "You added this question. In the full version, Miror researches it with an AI model and ties the answer to your background.",
        task: {
          type: "reflect",
          prompt: "What's your current guess, or why does this matter to you?",
          sample: "I think it matters for my first project with the group."
        }
      };
    }
    return { type: "new", parentId: parent.id, related: related.slice(0, 3), spec, fromBank: Boolean(best) };
  }

  window.ExplorerAsk = { plan, tokens };
})();
