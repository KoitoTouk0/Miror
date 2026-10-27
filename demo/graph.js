/* Miror: light-up knowledge graph engine (needs D3 v7).
 *
 * A node is "hidden", "open" (visible, waiting to be answered) or "lit".
 * Lighting a node plays a burst, then grows its children out of it.
 * Three skins share the same logic:
 *   constellation: researcher mode, your world on the left, new region growing right
 *   garden:        kids mode, buds bloom into flowers and the plant grows upward
 *   tree:          kids mode, sprouts grow into leafy branches with fruit, fanning out like a crown
 */
(function () {
  "use strict";

  const PETALS = ["#ff6fa3", "#ffb703", "#9d6bff", "#4cc9f0", "#ff8c42", "#ff5d7a", "#57cc99", "#f9c74f", "#6c8cff"];

  // Watering can with a "?" (body centred on 0,0; spout tip at 30,-12). Used for the kids' ask button too.
  const CAN_SVG =
    '<path class="can-handle" d="M-11,-13 C-11,-28 11,-28 11,-13"/>' +
    '<path class="can-spout" d="M14,4 L29,-11"/>' +
    '<ellipse class="can-rose" cx="30" cy="-12" rx="5" ry="3" transform="rotate(-45 30 -12)"/>' +
    '<rect class="can-body" x="-15" y="-13" width="30" height="27" rx="7"/>' +
    '<ellipse class="can-rim" cx="0" cy="-13" rx="15" ry="4"/>' +
    '<text class="can-q" x="0" y="7">?</text>';

  // Fun-fact fertilizer: a sack with a "?" label (centred on 0,0; mouth at 0,-20). Used for the kids' button too.
  const FERT_SVG =
    '<path class="fert-bag" d="M-13,-13 C-17,0 -19,12 -15,17 Q0,21 15,17 C19,12 17,0 13,-13Z"/>' +
    '<path class="fert-top" d="M-13,-13 L-10,-21 Q0,-17 10,-21 L13,-13 Q0,-10 -13,-13Z"/>' +
    '<circle class="fert-grain" cx="-4" cy="-22" r="1.8"/><circle class="fert-grain" cx="3" cy="-24" r="1.5"/>' +
    '<rect class="fert-label" x="-9.5" y="-6" width="19" height="17" rx="5"/>' +
    '<text class="fert-q" x="0" y="8.5">?</text>';

  // Little spaceship pointing along +x, centred on 0,0. It marks "you are here" in the constellation.
  const SHIP_SVG =
    '<g class="ship-flame"><path d="M-11,-3.6 L-23,0 L-11,3.6Z"/></g>' +
    '<path class="ship-fin" d="M-5,-5 L-12,-12 L-1,-5Z"/>' +
    '<path class="ship-fin" d="M-5,5 L-12,12 L-1,5Z"/>' +
    '<path class="ship-hull" d="M-11,-5 L5,-5 Q15,-4 18,0 Q15,4 5,5 L-11,5Z"/>' +
    '<circle class="ship-window" cx="6" cy="0" r="2.6"/>';

  function wrap(text, max) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      if (line && (line + " " + w).length > max) {
        lines.push(line);
        line = w;
      } else {
        line = line ? line + " " + w : w;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function starPath(R, r, points) {
    let p = "";
    for (let i = 0; i < points * 2; i++) {
      const a = (Math.PI / points) * i - Math.PI / 2;
      const rad = i % 2 ? r : R;
      p += (i ? "L" : "M") + (Math.cos(a) * rad).toFixed(2) + "," + (Math.sin(a) * rad).toFixed(2);
    }
    return p + "Z";
  }

  function create(svgEl, opts = {}) {
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    // ---------- defs ----------
    const defs = svg.append("defs");
    const glow = defs.append("filter").attr("id", "glow").attr("x", "-150%").attr("y", "-150%").attr("width", "400%").attr("height", "400%");
    glow.append("feGaussianBlur").attr("stdDeviation", 3.2).attr("result", "b");
    const gm = glow.append("feMerge");
    gm.append("feMergeNode").attr("in", "b");
    gm.append("feMergeNode").attr("in", "SourceGraphic");
    const soft = defs.append("filter").attr("id", "soft").attr("x", "-150%").attr("y", "-150%").attr("width", "400%").attr("height", "400%");
    soft.append("feGaussianBlur").attr("stdDeviation", 9);
    const home = defs.append("radialGradient").attr("id", "homeGlow");
    home.append("stop").attr("offset", "0%").attr("class", "home-stop-a");
    home.append("stop").attr("offset", "100%").attr("class", "home-stop-b");
    const earth = defs.append("radialGradient").attr("id", "earthGrad").attr("cx", "38%").attr("cy", "35%");
    [["0%", "#7cc4ff"], ["45%", "#2f74d0"], ["100%", "#0b2550"]].forEach(([o, c]) => earth.append("stop").attr("offset", o).attr("stop-color", c));
    const shade = defs.append("radialGradient").attr("id", "earthShade").attr("cx", "30%").attr("cy", "40%");
    shade.append("stop").attr("offset", "55%").attr("stop-color", "#000").attr("stop-opacity", 0);
    shade.append("stop").attr("offset", "100%").attr("stop-color", "#000").attr("stop-opacity", 0.5);
    const hill = defs.append("linearGradient").attr("id", "hill").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
    hill.append("stop").attr("offset", "0%").attr("class", "hill-a");
    hill.append("stop").attr("offset", "100%").attr("class", "hill-b");

    const viewport = svg.append("g").attr("class", "viewport");
    const L = {
      back: viewport.append("g").attr("class", "layer-back"),
      analogy: viewport.append("g").attr("class", "layer-analogy"),
      links: viewport.append("g").attr("class", "layer-links"),
      flows: viewport.append("g").attr("class", "layer-flows"),
      fxBelow: viewport.append("g").attr("class", "layer-fx-below"),
      nodes: viewport.append("g").attr("class", "layer-nodes"),
      fx: viewport.append("g").attr("class", "layer-fx"),
      ship: viewport.append("g").attr("class", "layer-ship")
    };

    // ---------- state ----------
    let skin = "constellation";
    let data = null;
    let byId = new Map();
    let treeLinks = [];
    let analogies = [];
    let speed = 1;
    let autoFit = true;
    let insets = { top: 0, right: 0, bottom: 0, left: 0 };
    let suggestedId = null;
    let selectedId = null;
    let hoverId = null;
    let lastLit = null;
    let userMovedAt = 0;
    let homeGlow = null, homeLabel = null, awayLabel = null;

    const zoom = d3.zoom()
      .scaleExtent([0.25, 2.6])
      .on("zoom", (e) => {
        viewport.attr("transform", e.transform);
        if (e.sourceEvent) userMovedAt = Date.now();
      });
    svg.call(zoom).on("dblclick.zoom", null);

    const sim = d3.forceSimulation()
      .velocityDecay(0.42)
      .alphaDecay(0.025)
      .on("tick", position);

    const drag = d3.drag()
      .clickDistance(5)
      .on("start", (e, d) => {
        if (!e.active) sim.alphaTarget(0.15).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (e, d) => {
        d.fx = e.x;
        d.fy = e.y;
        userMovedAt = Date.now();
      })
      .on("end", (e, d) => {
        if (!e.active) sim.alphaTarget(0);
        if (!d.pinned) {
          d.fx = null;
          d.fy = null;
        }
      });

    const ms = (t) => t * speed;
    const visible = () => [...byId.values()].filter((n) => n.state !== "hidden");
    const kindOf = (n) => n.kind;
    const isKids = () => skin === "garden" || skin === "tree";
    const colorOf = (n) => (isKids() ? n.color : `var(--k-${n.kind})`);

    // ---------- layout ----------
    function radius(n) {
      if (isKids()) return n.isRoot ? 34 : n.kind === "fact" ? 20 : 26;
      if (n.kind === "you") return 17;
      if (n.kind === "known") return 7.5;
      if (n.kind === "edge") return 14;
      return 10.5;
    }

    function targetX(n) {
      if (isKids()) return 0;
      if (n.kind === "you") return -170;
      if (n.kind === "known") return -390;
      return -170 + n.depth * 205;
    }

    function targetY(n) {
      if (isKids()) return -n.depth * 170;
      return 0;
    }

    // Small stable offset per node so the constellation doesn't look like an org chart.
    function jitter(id) {
      let h = 0;
      for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9973;
      return { x: ((h % 29) - 14), y: (((h >> 3) % 21) - 10) };
    }

    // Tidy-tree targets for every visible node, recomputed whenever the map grows,
    // so branches never cross and existing nodes glide aside to make room.
    function computeTargets() {
      const isVis = (c) => c.state !== "hidden";
      const rootN = [...byId.values()].find((n) => n.isRoot);
      if (!rootN) return;
      if (skin === "garden") {
        const h = d3.hierarchy(rootN, (n) => n.children.filter(isVis));
        d3.tree().nodeSize([182, 178]).separation((a, b) => (a.parent === b.parent ? 1 : 1.2))(h);
        h.each((t) => {
          t.data.tx = t.x;
          t.data.ty = -t.y;
        });
        return;
      }
      if (skin === "tree") {
        // Radial fan pointing up: branches spread out like a tree crown.
        const h = d3.hierarchy(rootN, (n) => n.children.filter(isVis));
        const span = Math.PI * 0.84;
        d3.tree().size([span, 1]).separation((a, b) => (a.parent === b.parent ? 1 : 1.5) / Math.max(1, a.depth))(h);
        h.each((t) => {
          if (!t.depth) {
            t.data.tx = 0;
            t.data.ty = 0;
            return;
          }
          const ang = -Math.PI / 2 - span / 2 + t.x;
          const r = t.depth * 190;
          t.data.tx = Math.cos(ang) * r * 1.08;
          t.data.ty = Math.sin(ang) * r * 0.92;
        });
        return;
      }
      const ox = rootN.fx, oy = rootN.fy;
      const known = rootN.children.filter((c) => c.kind === "known" && isVis(c));
      const span = Math.min(110, 36 * Math.max(0, known.length - 1));
      known.forEach((k, i) => {
        const deg = 180 - span / 2 + (known.length > 1 ? (span * i) / (known.length - 1) : 0);
        const a = (deg * Math.PI) / 180;
        k.tx = ox + Math.cos(a) * 215;
        k.ty = oy + Math.sin(a) * 215;
      });
      const h = d3.hierarchy(rootN, (n) => n.children.filter((c) => isVis(c) && c.kind !== "known"));
      d3.tree().nodeSize([98, 218]).separation((a, b) => (a.parent === b.parent ? 1 : 1.3))(h);
      h.each((t) => {
        const n = t.data;
        if (n === rootN) {
          n.tx = ox;
          n.ty = oy;
          return;
        }
        const j = jitter(n.id);
        n.tx = ox + t.y + j.x;
        n.ty = oy + t.x + j.y;
      });
    }

    function setupForces() {
      sim
        .force("collide", d3.forceCollide().radius((n) => (isKids() ? (n.kind === "fact" ? 44 : 60) : n.kind === "known" ? 34 : 44)).strength(0.6))
        .force("x", d3.forceX().strength(0.16))
        .force("y", d3.forceY().strength(0.16));
    }

    function syncSim(alpha) {
      computeTargets();
      sim.nodes(visible());
      sim.force("x").x((n) => (n.tx == null ? targetX(n) : n.tx));
      sim.force("y").y((n) => (n.ty == null ? targetY(n) : n.ty));
      if (alpha) sim.alpha(alpha).restart();
    }

    // ---------- load ----------
    function load(dataset, options = {}) {
      data = dataset;
      skin = options.skin || (dataset.mode === "kids" ? "garden" : "constellation");
      svg.attr("data-skin", skin);
      byId = new Map();
      treeLinks = [];
      analogies = [];
      lastLit = null;
      selectedId = null;
      if (ship) ship.timer.stop();
      ship = null;
      Object.values(L).forEach((g) => g.selectAll("*").remove());

      dataset.nodes.forEach((d, i) => {
        byId.set(d.id, {
          id: d.id,
          d,
          kind: d.kind || (isKids() ? "flower" : "core"),
          parent: d.parent || null,
          children: [],
          depth: 0,
          order: i,
          state: "hidden",
          color: d.color || PETALS[i % PETALS.length],
          isRoot: !d.parent,
          own: Boolean(d.own)
        });
      });
      for (const n of byId.values()) if (n.parent && byId.has(n.parent)) byId.get(n.parent).children.push(n);
      const setDepth = (n, depth) => {
        n.depth = depth;
        n.children.forEach((c) => setDepth(c, depth + 1));
      };
      for (const n of byId.values()) if (n.isRoot) setDepth(n, 0);

      for (const n of byId.values()) if (n.d.lit) n.state = "lit";
      for (const n of byId.values()) {
        if (n.state === "hidden" && (!n.parent || byId.get(n.parent).state === "lit")) n.state = "open";
      }

      for (const n of byId.values()) {
        if (n.isRoot) {
          n.pinned = true;
          n.fx = isKids() ? 0 : -170;
          n.fy = 0;
        }
        if (n.state !== "hidden" && n.parent) treeLinks.push(makeLink(byId.get(n.parent), n, 1));
      }
      computeTargets();
      for (const n of byId.values()) {
        n.x = (n.tx == null ? targetX(n) : n.tx) + (Math.random() - 0.5) * 20;
        n.y = (n.ty == null ? targetY(n) : n.ty) + (Math.random() - 0.5) * 20;
      }
      (dataset.links || []).forEach((l) => {
        const s = byId.get(l.source), t = byId.get(l.target);
        if (s && t) analogies.push({ id: `${l.source}~${l.target}`, source: s, target: t, label: l.label || "" });
      });

      buildBackdrop();
      setupForces();
      syncSim();
      sim.alpha(1);
      for (let i = 0; i < 260; i++) sim.tick();
      sim.alpha(0.05).restart();
      computeSuggested();
      render();
      position();
      buildShip();
      fit(0);
      emitChange();
    }

    // ---------- spaceship (constellation only) ----------
    // Docked: circles its current star. flyTo(id): flies a curved path to the next star,
    // leaving an exhaust trail, then settles into orbit there.
    let ship = null;
    const orbitR = (n) => radius(n) + 17;

    function buildShip() {
      if (skin !== "constellation") return;
      const home = [...byId.values()].find((n) => n.isRoot);
      const g = L.ship.append("g").attr("class", "ship");
      g.append("g").attr("transform", "scale(1.05)").html(SHIP_SVG);
      ship = { g, at: home, angle: -Math.PI / 2, flight: null, last: performance.now(), puffAt: 0 };
      ship.timer = d3.timer(stepShip);
    }

    function stepShip() {
      const now = performance.now();
      const dt = Math.min(64, now - ship.last);
      ship.last = now;
      let x, y, heading;
      const f = ship.flight;
      if (f) {
        const u = Math.min(1, (now - f.t0) / f.dur);
        const e = d3.easeCubicInOut(u);
        const ex = f.to.x + Math.cos(f.endAngle) * orbitR(f.to);
        const ey = f.to.y + Math.sin(f.endAngle) * orbitR(f.to);
        const cx = (f.sx + ex) / 2 + f.bend.x, cy = (f.sy + ey) / 2 + f.bend.y;
        const pt = (t) => [
          (1 - t) * (1 - t) * f.sx + 2 * (1 - t) * t * cx + t * t * ex,
          (1 - t) * (1 - t) * f.sy + 2 * (1 - t) * t * cy + t * t * ey
        ];
        [x, y] = pt(e);
        const [ax, ay] = pt(Math.max(0, e - 0.01)), [bx, by] = pt(Math.min(1, e + 0.01));
        heading = Math.atan2(by - ay, bx - ax);
        if (now - ship.puffAt > 28) {
          ship.puffAt = now;
          L.fxBelow.append("circle").attr("class", "puff").attr("cx", x).attr("cy", y).attr("r", 2.4).attr("opacity", 0.8)
            .transition().duration(ms(650)).ease(d3.easeCubicOut).attr("r", 6).attr("opacity", 0).remove();
        }
        if (u >= 1) {
          ship.at = f.to;
          // Join the orbit going the same way as the flight, so there's no sudden turn.
          ship.angle = f.endAngle;
          ship.flight = null;
          ship.g.classed("flying", false);
        }
      } else {
        ship.angle += (dt * 0.0011) / speed;
        const n = ship.at, r = orbitR(n);
        x = n.x + Math.cos(ship.angle) * r;
        y = n.y + Math.sin(ship.angle) * r;
        heading = ship.angle + Math.PI / 2;
      }
      ship.x = x;
      ship.y = y;
      ship.g.attr("transform", `translate(${x},${y}) rotate(${(heading * 180) / Math.PI})`);
    }

    function flyTo(id) {
      if (!ship) return;
      const to = byId.get(id);
      if (!to || (to === ship.at && !ship.flight)) return;
      const sx = ship.x == null ? ship.at.x : ship.x, sy = ship.y == null ? ship.at.y : ship.y;
      const dx = to.x - sx, dy = to.y - sy, len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(90, len * 0.25);
      ship.flight = {
        sx, sy, to,
        endAngle: Math.atan2(sy - to.y, sx - to.x),
        bend: { x: (-dy / len) * bend, y: (dx / len) * bend },
        t0: performance.now(),
        dur: ms(Math.min(1500, 650 + len * 1.3))
      };
      ship.g.classed("flying", true);
    }

    function makeLink(source, target, grow) {
      return { id: `${source.id}>${target.id}`, source, target, grow };
    }

    // ---------- backdrop ----------
    function buildBackdrop() {
      homeGlow = homeLabel = awayLabel = null;
      if (skin === "constellation") {
        homeGlow = L.back.append("circle").attr("class", "home-glow").attr("r", 220).attr("fill", "url(#homeGlow)");
        homeLabel = L.back.append("text").attr("class", "region-label").text((data.regions && data.regions.home) || "Your world");
        awayLabel = L.back.append("text").attr("class", "region-label away").text((data.regions && data.regions.away) || "New region");
      } else if (skin === "garden") {
        hills(36);
        L.back.append("path").attr("class", "vine root-stem").attr("d", "M0,26 C2,34 -2,40 0,48");
      } else {
        hills(150);
        const trunk = L.back.append("g").attr("class", "trunk-group");
        trunk.append("path").attr("class", "trunk").attr("d", "M-62,170 Q-44,160 -30,156 C-21,118 -16,60 -13,4 L13,4 C16,60 21,118 30,156 Q46,160 64,170 Q0,162 -62,170Z");
        trunk.append("path").attr("class", "trunk-shade").attr("d", "M5,8 C9,60 13,118 20,158 L30,156 C21,118 16,60 13,4Z");
        trunk.append("path").attr("class", "bark-line").attr("d", "M-6,40 q4,10 0,20 M4,96 q-4,8 1,16 M-10,128 q3,6 -1,12");
        trunk.append("ellipse").attr("class", "knot").attr("cx", -3).attr("cy", 84).attr("rx", 8).attr("ry", 11);
        trunk.append("text").attr("class", "owl").attr("x", -3).attr("y", 91).text("🦉");
      }
    }

    // Rolling hills with grass tufts; groundY is where the hill top meets the plant.
    function hills(groundY) {
      L.back.append("ellipse").attr("class", "hill hill-far").attr("cx", -700).attr("cy", groundY + 1024).attr("rx", 2400).attr("ry", 1000);
      L.back.append("ellipse").attr("class", "hill").attr("cx", 300).attr("cy", groundY + 1034).attr("rx", 2800).attr("ry", 1030).attr("fill", "url(#hill)");
      const tufts = L.back.append("g").attr("class", "tufts");
      for (let i = 0; i < 26; i++) {
        const x = -1300 + i * 100 + (i % 3) * 23;
        if (Math.abs(x) < 70) continue;
        const y = groundY + 16 + Math.pow(x / 1600, 2) * 340;
        tufts.append("path").attr("class", "tuft").attr("d", `M${x - 8},${y} Q${x - 6},${y - 16} ${x - 2},${y - 20} Q${x},${y - 8} ${x + 2},${y} Q${x + 4},${y - 14} ${x + 9},${y - 17} Q${x + 7},${y - 6} ${x + 9},${y}Z`);
      }
    }

    // ---------- render (data joins) ----------
    function render() {
      const nodes = visible();

      // tree links
      const ls = L.links.selectAll("path.link").data(treeLinks, (l) => l.id);
      ls.exit().remove();
      ls.enter().append("path")
        .attr("class", skin === "garden" ? "link vine" : skin === "tree" ? "link branch" : "link")
        .attr("pathLength", 1)
        .style("stroke-width", (l) => (skin === "tree" ? (l.target.kind === "fact" ? 4 : Math.max(6, 22 - l.target.depth * 5)) : null));
      L.links.selectAll("path.link")
        .classed("lit", (l) => l.source.state === "lit" && l.target.state === "lit");

      const fl = L.flows.selectAll("path.flow").data(treeLinks, (l) => l.id);
      fl.exit().remove();
      fl.enter().append("path").attr("class", "flow").attr("pathLength", 1);
      L.flows.selectAll("path.flow")
        .classed("on", (l) => l.source.state === "lit" && l.target.state === "lit" && l.grow >= 1);

      // Tree: a pair of leaves sprouts halfway along each fully grown branch.
      if (skin === "tree") {
        const tw = L.flows.selectAll("g.twig").data(treeLinks, (l) => l.id);
        tw.exit().remove();
        const te = tw.enter().append("g").attr("class", "twig").append("g").attr("class", "twig-in");
        te.append("path").attr("d", "M0,0 C4,-6 13,-7 18,-2 C13,2 5,3 0,0Z").attr("transform", "rotate(-58)");
        te.append("path").attr("d", "M0,0 C4,-6 13,-7 18,-2 C13,2 5,3 0,0Z").attr("transform", "rotate(58) scale(1,-1)");
        L.flows.selectAll("g.twig").classed("on", (l) => l.target.state === "lit" && l.grow >= 1);
      }

      // analogy arcs
      const shown = analogies.filter((a) => a.source.state !== "hidden" && a.target.state !== "hidden");
      const as = L.analogy.selectAll("g.analogy").data(shown, (a) => a.id);
      as.exit().remove();
      const ae = as.enter().append("g").attr("class", (a) => (a.type ? `analogy ${a.type}` : "analogy"));
      const fade = ae.append("g").attr("class", "fade").attr("opacity", 0);
      fade.append("path").attr("class", "arc");
      fade.append("text").attr("class", "arc-label").attr("dy", "-0.4em").text((a) => a.label);
      fade.transition().delay(ms(500)).duration(ms(900)).attr("opacity", 1);
      // A new bridge shows its label for a few seconds, then only on hover/selection.
      ae.classed("fresh", true).each(function () {
        const el = this;
        setTimeout(() => el.classList.remove("fresh"), ms(4200));
      });
      L.analogy.selectAll("g.analogy").classed("lit", (a) => a.source.state === "lit" && a.target.state === "lit");
      updateFocus();

      // nodes
      const ns = L.nodes.selectAll("g.node").data(nodes, (n) => n.id);
      ns.exit().remove();
      const ne = ns.enter().append("g")
        .attr("class", (n) => `node kind-${kindOf(n)}${n.isRoot ? " root" : ""}${n.own ? " own" : ""}`)
        .attr("tabindex", 0)
        .attr("role", "button")
        .on("click", (e, n) => opts.onNodeClick && opts.onNodeClick(n))
        .on("mouseenter", (e, n) => {
          hoverId = n.id;
          updateFocus();
        })
        .on("mouseleave", () => {
          hoverId = null;
          updateFocus();
        })
        .on("keydown", (e, n) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            opts.onNodeClick && opts.onNodeClick(n);
          }
        })
        .call(drag);
      const appear = ne.append("g").attr("class", "appear");
      const facts = appear.filter((n) => n.kind === "fact");
      const rest = appear.filter((n) => n.kind !== "fact");
      if (skin === "garden") buildFlower(rest);
      else if (skin === "tree") buildTreeNode(rest);
      else buildStar(rest);
      buildFact(facts);

      L.nodes.selectAll("g.node")
        .attr("aria-label", (n) => `${n.d.label}${n.state === "lit" ? " (done)" : ""}`)
        .classed("is-lit", (n) => n.state === "lit")
        .classed("is-open", (n) => n.state === "open")
        .classed("is-suggested", (n) => n.id === suggestedId)
        .classed("is-selected", (n) => n.id === selectedId);
    }

    function buildStar(sel) {
      const f = sel.append("g").attr("class", "float").style("animation-delay", () => `${(-Math.random() * 6).toFixed(2)}s`);
      f.append("circle").attr("class", "halo").attr("r", (n) => radius(n) * 2.6).style("--c", colorOf);
      f.append("circle").attr("class", "pulse").attr("r", (n) => radius(n) + 3).style("--c", colorOf);
      f.append("circle").attr("class", "ring").attr("r", (n) => radius(n) + 7).style("--c", colorOf);
      f.each(function (n) {
        const g = d3.select(this);
        if (n.kind === "you") return buildEarth(g, radius(n) + 4);
        if (n.kind === "edge") g.append("path").attr("class", "core").attr("d", starPath(15, 6.5, 5)).style("--c", colorOf(n));
        else g.append("circle").attr("class", "core").attr("r", radius(n)).style("--c", colorOf(n));
        if (["core", "bridge", "frontier"].includes(n.kind)) g.append("text").attr("class", "glyph").attr("dy", "0.36em").text("?").style("--c", colorOf(n));
      });
      const label = f.append("text").attr("class", "label").attr("y", (n) => radius(n) + 19);
      label.each(function (n) {
        const t = d3.select(this);
        wrap(n.d.label, n.kind === "known" ? 16 : 21).slice(0, 3).forEach((line, i) => {
          t.append("tspan").attr("x", 0).attr("dy", i ? "1.25em" : 0).text(line);
        });
      });
    }

    // "You" in the constellation is home: a small Earth (the spaceship starts here).
    function buildEarth(g, r) {
      g.append("circle").attr("class", "earth-atmo").attr("r", r + 7);
      g.append("circle").attr("class", "earth-globe").attr("r", r).attr("fill", "url(#earthGrad)");
      const land = g.append("g").attr("class", "earth-land").attr("transform", `scale(${r / 20})`);
      ["M-12,-8 C-8,-14 0,-13 2,-8 C4,-4 -2,-2 -4,2 C-6,6 -10,4 -12,0 Z", "M4,2 C8,0 13,3 12,8 C10,13 4,12 3,8 Z",
        "M2,-15 C6,-16 10,-13 8,-10 C6,-9 3,-11 2,-15Z", "M-15,6 C-12,8 -10,12 -13,13 C-16,12 -17,9 -15,6Z"]
        .forEach((d) => land.append("path").attr("d", d));
      g.append("circle").attr("r", r).attr("fill", "url(#earthShade)");
    }

    function buildFlower(sel) {
      const size = sel.append("g").attr("class", "size").attr("transform", (n) => (n.isRoot ? "scale(1.3)" : null));
      const sway = size.append("g").attr("class", "sway").style("animation-delay", () => `${(-Math.random() * 4).toFixed(2)}s`);
      sway.append("circle").attr("class", "aura").attr("r", 40).style("fill", (n) => n.color);
      sway.append("circle").attr("class", "pulse").attr("r", 30).style("stroke", (n) => n.color);
      sway.append("path").attr("class", "leaf").attr("d", "M0,14 C-10,8 -24,12 -28,24 C-16,28 -6,24 0,14Z");
      sway.append("path").attr("class", "leaf").attr("d", "M0,14 C10,8 24,12 28,24 C16,28 6,24 0,14Z");
      sway.append("path").attr("class", "stem").attr("d", "M0,8 L0,26");
      const bud = sway.append("g").attr("class", "bud");
      bud.append("path").attr("class", "bud-body").attr("d", "M0,-24 C14,-12 13,6 0,12 C-13,6 -14,-12 0,-24Z").style("fill", (n) => n.color);
      bud.append("path").attr("class", "bud-calyx").attr("d", "M-11,0 C-8,13 8,13 11,0 C5,7 2,2 0,8 C-2,2 -5,7 -11,0Z");
      const bloom = sway.append("g").attr("class", "bloom");
      const petals = bloom.append("g").attr("class", "petals");
      for (let i = 0; i < 8; i++) {
        petals.append("ellipse").attr("cx", 0).attr("cy", -17).attr("rx", 8.5).attr("ry", 15)
          .attr("transform", `rotate(${i * 45})`).style("fill", (n) => n.color);
      }
      bloom.append("circle").attr("class", "center").attr("r", 11.5);
      bloom.append("circle").attr("class", "eye").attr("cx", -4).attr("cy", -2.5).attr("r", 1.7);
      bloom.append("circle").attr("class", "eye").attr("cx", 4).attr("cy", -2.5).attr("r", 1.7);
      bloom.append("circle").attr("class", "cheek").attr("cx", -7).attr("cy", 2.5).attr("r", 2.2);
      bloom.append("circle").attr("class", "cheek").attr("cx", 7).attr("cy", 2.5).attr("r", 2.2);
      bloom.append("path").attr("class", "smile").attr("d", "M-4.5,2.5 Q0,7 4.5,2.5");
      addPill(size);
    }

    // Tree node: a sprout with a "?" until answered, then a leafy crown with a smiling fruit.
    function buildTreeNode(sel) {
      const size = sel.append("g").attr("class", "size").attr("transform", (n) => (n.isRoot ? "scale(1.25)" : null));
      const sway = size.append("g").attr("class", "sway").style("animation-delay", () => `${(-Math.random() * 4).toFixed(2)}s`);
      sway.append("circle").attr("class", "aura").attr("cy", -8).attr("r", 48).style("fill", (n) => n.color);
      sway.append("circle").attr("class", "pulse").attr("cy", -4).attr("r", 26).style("stroke", (n) => n.color);

      const sprout = sway.append("g").attr("class", "sprout");
      sprout.append("path").attr("class", "sprout-leaf").attr("d", "M0,4 C-3,-6 -15,-12 -22,-7 C-16,3 -7,6 0,4Z");
      sprout.append("path").attr("class", "sprout-leaf").attr("d", "M0,4 C3,-8 15,-15 23,-10 C17,1 7,6 0,4Z");
      sprout.append("circle").attr("class", "sprout-bud").attr("cy", -12).attr("r", 11).style("fill", (n) => n.color);
      sprout.append("text").attr("class", "sprout-q").attr("y", -12).attr("dy", "0.36em").text("?");

      const crown = sway.append("g").attr("class", "crown");
      [[-22, -20, 15, 2], [22, -18, 15, 2], [-10, -32, 16, 1], [12, -33, 15, 1], [0, -14, 22, 0],
        [-20, -2, 15, 0], [20, -1, 15, 0], [0, 4, 14, 1], [-28, -10, 10, 2], [29, -8, 10, 1]]
        .forEach(([x, y, r, tone]) => crown.append("circle").attr("class", `foliage f${tone}`).attr("cx", x).attr("cy", y).attr("r", r));

      const fruit = sway.append("g").attr("class", "fruit");
      fruit.append("circle").attr("class", "fruit-small").attr("cx", -15).attr("cy", -22).attr("r", 6).style("fill", (n) => n.color);
      fruit.append("path").attr("class", "fruit-stem").attr("d", "M5,-9 Q6,-14 9,-16");
      fruit.append("path").attr("class", "fruit-leaf").attr("d", "M7,-13 C11,-19 18,-18 19,-14 C15,-11 10,-11 7,-13Z");
      fruit.append("circle").attr("class", "fruit-body").attr("cx", 5).attr("cy", 1).attr("r", 10.5).style("fill", (n) => n.color);
      fruit.append("circle").attr("class", "fruit-shine").attr("cx", 1).attr("cy", -3.5).attr("r", 2.6);
      fruit.append("circle").attr("class", "eye").attr("cx", 2).attr("cy", 0.5).attr("r", 1.4);
      fruit.append("circle").attr("class", "eye").attr("cx", 8.5).attr("cy", 0.5).attr("r", 1.4);
      fruit.append("path").attr("class", "smile").attr("d", "M2.5,4.5 Q5.25,7.5 8,4.5");
      addPill(size);
    }

    // Kids' fun fact: a golden fruit hanging on the tree, or a small sparkling blossom in the garden.
    function buildFact(sel) {
      if (sel.empty()) return;
      const size = sel.append("g").attr("class", "size");
      const sway = size.append("g").attr("class", "sway").style("animation-delay", () => `${(-Math.random() * 4).toFixed(2)}s`);
      sway.append("circle").attr("class", "aura").attr("r", 34).style("fill", "#ffd447");
      const g = sway.append("g").attr("class", "fact-art");
      if (skin === "tree") {
        g.append("path").attr("class", "fruit-stem").attr("d", "M0,-24 Q1,-18 0,-13");
        g.append("path").attr("class", "fruit-leaf").attr("d", "M1,-20 C6,-27 14,-26 15,-21 C10,-17 5,-17 1,-20Z");
        g.append("circle").attr("class", "fact-fruit").attr("r", 14);
        g.append("circle").attr("class", "fruit-shine").attr("cx", -5).attr("cy", -5).attr("r", 3.4);
      } else {
        g.append("path").attr("class", "stem").attr("d", "M0,6 L0,24");
        for (let i = 0; i < 5; i++) {
          g.append("circle").attr("class", "fact-petal").attr("cx", 0).attr("cy", -11).attr("r", 8.5)
            .attr("transform", `rotate(${i * 72})`);
        }
        g.append("circle").attr("class", "center").attr("r", 8.5);
      }
      g.append("text").attr("class", "fact-mark").attr("dy", "0.36em").text("!");
      sway.append("text").attr("class", "fact-sparkle").attr("x", 15).attr("y", -15).text("✨");
      addPill(size);
    }

    // Name label under the node. The tree's root label becomes a wooden sign at the foot of the trunk.
    function addPill(size) {
      const pill = size.append("g").attr("class", "pill")
        .attr("transform", (n) => (skin === "tree" && n.isRoot ? "translate(0,150)" : n.kind === "fact" ? "translate(0,42)" : "translate(0,52)"));
      pill.append("rect").attr("class", "pill-bg").attr("rx", 13).style("stroke", (n) => n.color);
      const text = pill.append("text").attr("class", "pill-text");
      text.each(function (n) {
        const t = d3.select(this);
        const lines = wrap(`${n.d.emoji ? n.d.emoji + " " : ""}${n.d.label}`, 20).slice(0, 3);
        lines.forEach((line, i) => t.append("tspan").attr("x", 0).attr("dy", i ? "1.2em" : 0).text(line));
      });
      sizePills(pill);
    }

    function sizePills(sel) {
      (sel || L.nodes.selectAll("g.pill")).each(function () {
        const g = d3.select(this);
        const text = g.select("text").node();
        if (!text) return;
        const b = text.getBBox();
        const w = Math.max(60, b.width + 24), h = b.height + 12;
        g.select("rect").attr("x", -w / 2).attr("y", b.y - 6).attr("width", w).attr("height", h);
      });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => sizePills());

    // ---------- positions (every tick) ----------
    function linkPath(l) {
      const s = l.source, t = l.target;
      if (skin === "garden") {
        const sy = s.y - (s.isRoot ? 10 : 6), ty = t.y + 24;
        const my = (sy + ty) / 2;
        return `M${s.x},${sy} C${s.x},${my} ${t.x},${my} ${t.x},${ty}`;
      }
      if (skin === "tree") {
        const [p0, p1, p2, p3] = branchCurve(l);
        return `M${p0[0]},${p0[1]} C${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`;
      }
      return `M${s.x},${s.y} L${t.x},${t.y}`;
    }

    // A branch leaves its parent heading upward, then bends out toward the child.
    function branchCurve(l) {
      const s = l.source, t = l.target;
      const dx = t.x - s.x, dy = t.y - s.y;
      return [[s.x, s.y - 6], [s.x + dx * 0.1, s.y + dy * 0.55], [t.x - dx * 0.35, t.y - dy * 0.12], [t.x, t.y]];
    }

    function twigTransform(l) {
      const [p0, p1, p2, p3] = branchCurve(l);
      const u = 0.5, v = 1 - u;
      const pt = (i) => v * v * v * p0[i] + 3 * v * v * u * p1[i] + 3 * v * u * u * p2[i] + u * u * u * p3[i];
      const dt = (i) => 3 * v * v * (p1[i] - p0[i]) + 6 * v * u * (p2[i] - p1[i]) + 3 * u * u * (p3[i] - p2[i]);
      const angle = (Math.atan2(dt(1), dt(0)) * 180) / Math.PI;
      return `translate(${pt(0)},${pt(1)}) rotate(${angle})`;
    }

    function arcPath(a) {
      const s = a.source, t = a.target;
      const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
      const dx = t.x - s.x, dy = t.y - s.y;
      const len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(120, len * 0.22);
      const cx = mx + (dy / len) * bend, cy = my - (dx / len) * bend;
      // Label sits 70% along the curve, near the new-region end, so neighbours don't collide.
      const u = 0.7;
      a.mid = {
        x: (1 - u) * (1 - u) * s.x + 2 * (1 - u) * u * cx + u * u * t.x,
        y: (1 - u) * (1 - u) * s.y + 2 * (1 - u) * u * cy + u * u * t.y
      };
      return `M${s.x},${s.y} Q${cx},${cy} ${t.x},${t.y}`;
    }

    function positionLinks() {
      L.links.selectAll("path.link")
        .attr("d", linkPath)
        .style("stroke-dasharray", (l) => (l.grow < 1 ? `${l.grow} 2` : null));
      L.flows.selectAll("path.flow").attr("d", linkPath);
      if (skin === "tree") L.flows.selectAll("g.twig").attr("transform", twigTransform);
    }

    function position() {
      L.nodes.selectAll("g.node").attr("transform", (n) => `translate(${n.x},${n.y})`);
      positionLinks();
      L.analogy.selectAll("g.analogy").each(function (a) {
        const g = d3.select(this);
        g.select("path").attr("d", arcPath(a));
        g.select("text").attr("x", a.mid.x).attr("y", a.mid.y);
      });
      if (skin === "constellation" && homeGlow) {
        const homeNodes = visible().filter((n) => n.kind === "known" || n.kind === "you");
        const away = visible().filter((n) => n.kind !== "known" && n.kind !== "you");
        if (homeNodes.length) {
          const hx = d3.mean(homeNodes, (n) => n.x), hy = d3.mean(homeNodes, (n) => n.y);
          homeGlow.attr("cx", hx).attr("cy", hy);
          homeLabel.attr("x", hx).attr("y", d3.min(homeNodes, (n) => n.y) - 58);
        }
        if (away.length) {
          awayLabel.attr("x", d3.mean(away, (n) => n.x)).attr("y", d3.min(away, (n) => n.y) - 58)
            .style("opacity", away.length > 1 ? null : 0);
        }
      }
    }

    // ---------- effects ----------
    function burst(n) {
      const c = colorOf(n);
      const x = n.x, y = n.y;
      for (let k = 0; k < 2; k++) {
        L.fxBelow.append("circle").attr("class", "ripple").attr("cx", x).attr("cy", y).attr("r", radius(n))
          .style("stroke", c).attr("opacity", 0.9)
          .transition().delay(ms(k * 170)).duration(ms(1100)).ease(d3.easeCubicOut)
          .attr("r", radius(n) + 70 + k * 40).attr("opacity", 0).style("stroke-width", 0.4)
          .remove();
      }
      const kids = isKids();
      const count = kids ? 14 : 18;
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const dist = 45 + Math.random() * 55;
        let p;
        if (skin === "garden") {
          p = L.fx.append("ellipse").attr("class", "spark petal").attr("rx", 3.2).attr("ry", 6).style("fill", i % 3 ? n.color : "#ffe066");
        } else if (skin === "tree") {
          p = L.fx.append("ellipse").attr("class", "spark leafy").attr("rx", 3.4).attr("ry", 6.5).style("fill", i % 4 ? null : n.color);
        } else {
          p = L.fx.append("circle").attr("class", "spark").attr("r", 1.6 + Math.random() * 1.6).style("fill", c);
        }
        // Kids particles drift down a little, like falling petals or leaves.
        p.attr("transform", `translate(${x},${y}) rotate(${(a * 180) / Math.PI})`).attr("opacity", 1)
          .transition().duration(ms(800 + Math.random() * 500)).ease(d3.easeCubicOut)
          .attr("transform", `translate(${x + Math.cos(a) * dist},${y + Math.sin(a) * dist + (kids ? 18 : 0)}) rotate(${(a * 180) / Math.PI + 160})`)
          .attr("opacity", 0)
          .remove();
      }
      if (kids) {
        const critters = skin === "tree" ? ["🐦", "🐿️", "🦋", "🐝"] : ["🦋", "🐝", "✨", "🐞"];
        const critter = critters[n.order % 4];
        L.fx.append("text").attr("class", "critter").attr("x", x).attr("y", y - 20).text(critter).attr("opacity", 0)
          .transition().duration(ms(300)).attr("opacity", 1)
          .transition().duration(ms(1900)).ease(d3.easeSinInOut)
          .attr("x", x + (n.order % 2 ? 70 : -70)).attr("y", y - 120).attr("opacity", 0)
          .remove();
      }
    }

    // ---------- lighting ----------
    function light(id) {
      const n = byId.get(id);
      if (!n || n.state === "lit" || n.state === "hidden") return;
      n.state = "lit";
      lastLit = n;
      const kids = n.children.filter((c) => c.state === "hidden");
      if (kids.length) suggestedId = null;
      else computeSuggested();
      render();
      burst(n);
      emitChange();
      opts.onLit && opts.onLit(n);
      if (kids.length) setTimeout(() => reveal(n, kids), ms(420));
      else if (autoFit) fitLater(1500);
    }

    function reveal(parent, kids, { quiet = false } = {}) {
      if (!kids.length) return;
      kids.forEach((c, i) => {
        c.state = "open";
        const spread = (i - (kids.length - 1) / 2) * 0.7;
        if (isKids()) {
          c.x = parent.x + spread * 12;
          c.y = parent.y - 10;
        } else {
          c.x = parent.x + 10 * Math.cos(spread);
          c.y = parent.y + 10 * Math.sin(spread);
        }
        treeLinks.push(makeLink(parent, c, 0));
      });
      computeSuggested();
      render();
      L.nodes.selectAll("g.node").filter((n) => kids.includes(n)).select("g.appear").attr("transform", "scale(0)");
      syncSim(0.6);
      position();

      kids.forEach((c, i) => {
        const delay = ms(i * 150);
        const link = treeLinks.find((l) => l.target === c);
        L.links.selectAll("path.link").filter((l) => l === link)
          .transition().delay(delay).duration(ms(700)).ease(d3.easeCubicOut)
          .tween("grow", () => (t) => {
            link.grow = t;
            positionLinks();
          })
          .on("end", () => {
            link.grow = 1;
            render();
          });
        L.nodes.selectAll("g.node").filter((n) => n === c).select("g.appear")
          .transition().delay(delay + ms(380)).duration(ms(650)).ease(d3.easeBackOut.overshoot(2))
          .attr("transform", "scale(1)");
      });
      emitChange();
      if (!quiet && opts.onReveal) opts.onReveal(kids, parent);
      // Pull the camera back while the new nodes are still growing out.
      if (autoFit) fitLater(650 + kids.length * 120);
    }

    // ---------- the user's own questions ----------
    function addNode(spec, parentId, relatedIds = [], relatedLabel = "") {
      const parent = byId.get(parentId);
      if (!parent || byId.has(spec.id)) return null;
      const n = {
        id: spec.id,
        d: spec,
        kind: spec.kind || (isKids() ? "flower" : "core"),
        parent: parent.id,
        children: [],
        depth: parent.depth + 1,
        order: byId.size,
        state: "hidden",
        color: spec.color || PETALS[byId.size % PETALS.length],
        isRoot: false,
        own: true
      };
      byId.set(n.id, n);
      parent.children.push(n);
      relatedIds.forEach((rid) => {
        const r = byId.get(rid);
        if (r) analogies.push({ id: `${rid}~${n.id}`, source: r, target: n, label: relatedLabel, type: "related" });
      });
      reveal(parent, [n], { quiet: true });
      suggestedId = n.id;
      render();
      return n;
    }

    // Kids' fun fact: grows on its branch already "done", so it never counts as a question to answer.
    function addFact(spec, parentId) {
      const n = addNode(Object.assign({ kind: "fact", lit: true }, spec), parentId);
      if (!n) return null;
      n.own = false;
      n.state = "lit";
      suggestedId = null;
      computeSuggested();
      render();
      L.nodes.selectAll("g.node").filter((x) => x === n).classed("own", false);
      setTimeout(() => burst(n), ms(900));
      emitChange();
      return n;
    }

    // Generated children (custom maps). They stay hidden until their parent is lit;
    // if the parent is already lit (answer came back late), they grow in right away.
    function addChildren(parentId, specs) {
      const parent = byId.get(parentId);
      if (!parent) return [];
      const made = [];
      specs.forEach((spec) => {
        if (!spec || !spec.id || byId.has(spec.id)) return;
        const n = {
          id: spec.id,
          d: spec,
          kind: spec.kind || (isKids() ? "flower" : "core"),
          parent: parent.id,
          children: [],
          depth: parent.depth + 1,
          order: byId.size,
          state: "hidden",
          color: spec.color || PETALS[byId.size % PETALS.length],
          isRoot: false
        };
        byId.set(n.id, n);
        parent.children.push(n);
        made.push(n);
        const from = spec.analogy && byId.get(spec.analogy.from);
        if (from) analogies.push({ id: `${from.id}~${n.id}`, source: from, target: n, label: spec.analogy.label || "" });
      });
      if (made.length && parent.state === "lit") reveal(parent, made);
      else emitChange();
      return made;
    }

    // Grow a hidden node into view, together with any hidden nodes above it.
    function revealPath(id) {
      const chain = [];
      let c = byId.get(id);
      while (c && c.state === "hidden") {
        chain.unshift(c);
        c = byId.get(c.parent);
      }
      chain.forEach((node, i) => setTimeout(() => reveal(byId.get(node.parent), [node], { quiet: true }), ms(i * 650)));
      return ms(chain.length * 650);
    }

    // Kids: a watering can tilts over the node and pours droplets onto it.
    function water(id) {
      const n = byId.get(id);
      if (!n) return Promise.resolve();
      const s = 1.3, ang = 34;
      const cx = n.x - 66, cy = n.y - 100;
      const at = (r) => `translate(${cx},${cy}) scale(${s}) rotate(${r})`;
      L.fx.append("g").attr("class", "can-fx").html(CAN_SVG)
        .attr("transform", `translate(${cx},${cy - 40}) scale(${s}) rotate(0)`).attr("opacity", 0)
        .transition().duration(ms(450)).ease(d3.easeBackOut).attr("opacity", 1).attr("transform", at(0))
        .transition().duration(ms(450)).ease(d3.easeCubicInOut).attr("transform", at(ang))
        .transition().delay(ms(1100)).duration(ms(400)).attr("transform", at(0))
        .transition().duration(ms(350)).attr("opacity", 0)
        .remove();
      const r = (ang * Math.PI) / 180;
      const tx = cx + s * (30 * Math.cos(r) + 12 * Math.sin(r));
      const ty = cy + s * (30 * Math.sin(r) - 12 * Math.cos(r));
      for (let i = 0; i < 18; i++) {
        L.fx.append("path").attr("class", "drop").attr("d", "M0,-5 C2.5,-1 3,1.5 0,3.5 C-3,1.5 -2.5,-1 0,-5Z")
          .attr("transform", `translate(${tx},${ty})`).attr("opacity", 0)
          .transition().delay(ms(900 + i * 50)).duration(0).attr("opacity", 1)
          .transition().duration(ms(520)).ease(d3.easeQuadIn)
          .attr("transform", `translate(${n.x + (Math.random() - 0.5) * 36},${n.y - 20 + Math.random() * 16})`)
          .transition().duration(ms(150)).attr("opacity", 0)
          .remove();
      }
      return new Promise((res) => setTimeout(res, ms(1900)));
    }

    // Kids: the fun-fact fertilizer bag tips over the node and sprinkles golden grains and sparkles.
    function fertilize(id) {
      const n = byId.get(id);
      if (!n) return Promise.resolve();
      const s = 1.4, ang = 68;
      const cx = n.x - 58, cy = n.y - 96;
      const at = (r) => `translate(${cx},${cy}) scale(${s}) rotate(${r})`;
      L.fx.append("g").attr("class", "fert-fx").html(FERT_SVG)
        .attr("transform", `translate(${cx},${cy - 40}) scale(${s}) rotate(0)`).attr("opacity", 0)
        .transition().duration(ms(450)).ease(d3.easeBackOut).attr("opacity", 1).attr("transform", at(0))
        .transition().duration(ms(450)).ease(d3.easeCubicInOut).attr("transform", at(ang))
        .transition().duration(ms(180)).attr("transform", at(ang - 10))
        .transition().duration(ms(180)).attr("transform", at(ang + 6))
        .transition().duration(ms(180)).attr("transform", at(ang - 8))
        .transition().delay(ms(420)).duration(ms(400)).attr("transform", at(0))
        .transition().duration(ms(350)).attr("opacity", 0)
        .remove();
      const r = (ang * Math.PI) / 180;
      const tx = cx + s * 20 * Math.sin(r), ty = cy - s * 20 * Math.cos(r);
      for (let i = 0; i < 26; i++) {
        const sparkle = i % 4 === 0;
        const p = sparkle
          ? L.fx.append("text").attr("class", "fert-spark").text("✦")
          : L.fx.append("circle").attr("class", "fert-grain").attr("r", 1.6 + Math.random() * 1.4);
        p.attr("transform", `translate(${tx},${ty})`).attr("opacity", 0)
          .transition().delay(ms(900 + i * 40)).duration(0).attr("opacity", 1)
          .transition().duration(ms(560)).ease(d3.easeQuadIn)
          .attr("transform", `translate(${n.x + (Math.random() - 0.5) * 44},${n.y - 18 + Math.random() * 18})`)
          .transition().duration(ms(180)).attr("opacity", 0)
          .remove();
      }
      return new Promise((res) => setTimeout(res, ms(2100)));
    }

    // Researcher: a comet streaks in from the top-right and lands on the node.
    function comet(id) {
      const n = byId.get(id);
      if (!n) return Promise.resolve();
      const t = d3.zoomTransform(svgEl), a = safeArea();
      const sx = t.invertX(a.x + a.w + 80), sy = t.invertY(a.y - 60);
      const ex = n.x, ey = n.y;
      const cx = (sx + ex) / 2 + (ey - sy) * 0.3, cy = (sy + ey) / 2 - (ex - sx) * 0.08;
      const at = (u) => [
        (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * cx + u * u * ex,
        (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * cy + u * u * ey
      ];
      const parts = d3.range(16).map((i) => L.fx.append("circle")
        .attr("class", i ? "comet-tail" : "comet-head")
        .attr("r", i ? Math.max(0.9, 4.4 - i * 0.24) : 5.5)
        .attr("opacity", i ? 0.9 - i * 0.05 : 1)
        .attr("cx", sx).attr("cy", sy));
      const dur = ms(1200);
      return new Promise((res) => {
        const timer = d3.timer((el) => {
          const u = Math.min(1, el / dur);
          const e = d3.easeCubicIn(u);
          parts.forEach((p, i) => {
            const [x, y] = at(Math.max(0, e - i * 0.02));
            p.attr("cx", x).attr("cy", y);
          });
          if (u >= 1) {
            timer.stop();
            parts.forEach((p) => p.transition().duration(ms(250)).attr("opacity", 0).remove());
            burst(n);
            res();
          }
        });
      });
    }

    function lightInstant(ids) {
      const list = ids === "all" ? [...byId.keys()] : ids;
      let changed = true;
      while (changed) {
        changed = false;
        for (const id of list) {
          const n = byId.get(id);
          if (!n || n.state !== "open") continue;
          n.state = "lit";
          lastLit = n;
          changed = true;
          n.children.forEach((c) => {
            if (c.state !== "hidden") return;
            c.state = "open";
            c.x = n.x + (Math.random() - 0.5) * 40;
            c.y = n.y + (Math.random() - 0.5) * 40;
            treeLinks.push(makeLink(n, c, 1));
          });
        }
      }
      computeSuggested();
      syncSim();
      sim.alpha(1);
      for (let i = 0; i < 300; i++) sim.tick();
      sim.alpha(0.05).restart();
      render();
      position();
      fit(0);
      emitChange();
    }

    function computeSuggested() {
      const open = visible().filter((n) => n.state === "open");
      if (!open.length) {
        suggestedId = null;
        return;
      }
      const fromLast = lastLit ? open.filter((n) => n.parent === lastLit.id) : [];
      const pool = fromLast.length ? fromLast : open;
      pool.sort((a, b) => a.order - b.order);
      suggestedId = pool[0].id;
    }

    // ---------- camera ----------
    function safeArea() {
      const w = svgEl.clientWidth, h = svgEl.clientHeight;
      return {
        x: insets.left, y: insets.top,
        w: Math.max(100, w - insets.left - insets.right),
        h: Math.max(100, h - insets.top - insets.bottom)
      };
    }

    // Graph bounds in graph coordinates, padded for labels.
    function bounds() {
      const nodes = visible();
      if (!nodes.length) return null;
      const kids = isKids();
      const y1 = d3.max(nodes, (n) => n.y) + (kids ? 120 : 75);
      return {
        x0: d3.min(nodes, (n) => n.x) - (kids ? 100 : 90),
        x1: d3.max(nodes, (n) => n.x) + (kids ? 100 : 90),
        y0: d3.min(nodes, (n) => n.y) - (kids ? 75 : 80),
        // The tree's trunk and roots sit below the root node; keep them in frame.
        y1: skin === "tree" ? Math.max(y1, 240) : y1
      };
    }

    function fitTransform() {
      const b = bounds();
      if (!b) return null;
      const a = safeArea();
      const maxK = isKids() ? 1.25 : 1.35;
      const k = Math.max(0.3, Math.min(maxK, 0.94 * Math.min(a.w / (b.x1 - b.x0), a.h / (b.y1 - b.y0))));
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      return d3.zoomIdentity.translate(a.x + a.w / 2 - k * cx, a.y + a.h / 2 - k * cy).scale(k);
    }

    // Every camera move bumps camSeq, so a delayed fit can tell it has been overtaken.
    let camSeq = 0;

    function moveCamera(t, duration) {
      camSeq++;
      if (!duration) svg.interrupt("cam").call(zoom.transform, t);
      else svg.transition("cam").duration(ms(duration)).ease(d3.easeCubicInOut).call(zoom.transform, t);
    }

    function fit(duration = 800) {
      const t = fitTransform();
      if (t) moveCamera(t, duration);
    }

    function fitIfIdle() {
      if (Date.now() - userMovedAt > 4000) fit(1000);
    }

    function fitLater(delay) {
      const seq = camSeq;
      setTimeout(() => {
        if (seq === camSeq) fitIfIdle();
      }, ms(delay));
    }

    // Fly the camera in close to one node (d3 interpolates zoom and pan together).
    function zoomTo(id, duration = 1000) {
      const n = byId.get(id);
      if (!n) return;
      const a = safeArea();
      const k = isKids() ? 1.5 : 1.8;
      const x = n.tx == null ? n.x : n.tx;
      const y = (n.ty == null ? n.y : n.ty) + (isKids() ? 14 : 24);
      moveCamera(d3.zoomIdentity.translate(a.x + a.w / 2 - k * x, a.y + a.h / 2 - k * y).scale(k), duration);
    }

    // Keep the node (and ideally the whole map) clear of the panel.
    // Prefer fitting everything; fall back to panning when that would be too small.
    function focus(id, duration = 750) {
      const n = byId.get(id);
      if (!n) return;
      const t = d3.zoomTransform(svgEl);
      const a = safeArea();
      const b = bounds();
      const m = 40;
      const inside = (x, y) => x > a.x + m && x < a.x + a.w - m && y > a.y + m && y < a.y + a.h - m;
      const nodeIn = inside(t.applyX(n.x), t.applyY(n.y));
      const mapIn = inside(t.applyX(b.x0), t.applyY(b.y0)) && inside(t.applyX(b.x1), t.applyY(b.y1));
      if (nodeIn && mapIn) return;
      const ft = fitTransform();
      if (ft && ft.k >= 0.55) return moveCamera(ft, duration);
      if (nodeIn) return;
      const k = Math.max(t.k, 0.7);
      moveCamera(d3.zoomIdentity.translate(a.x + a.w / 2 - k * n.x, a.y + a.h / 2 - k * n.y).scale(k), duration);
    }

    function emitChange() {
      opts.onChange && opts.onChange();
    }

    // Researcher "interlink": gold lines from everything you already have to one strength star.
    function interlink(id) {
      analogies = analogies.filter((a) => a.type !== "interlink");
      const n = id && byId.get(id);
      if (n) {
        [...byId.values()].filter((k) => k.kind === "known" && k.state !== "hidden").forEach((k) => {
          if (!analogies.some((a) => a.source === k && a.target === n)) {
            analogies.push({ id: `il-${k.id}~${n.id}`, source: k, target: n, label: "", type: "interlink" });
          }
        });
      }
      L.analogy.classed("interlinking", Boolean(n));
      render();
    }

    function updateFocus() {
      const ids = [selectedId, hoverId].filter(Boolean);
      const arcs = L.analogy.selectAll("g.analogy").classed("focus", (a) => ids.includes(a.source.id) || ids.includes(a.target.id));
      L.analogy.classed("has-focus", !arcs.filter(".focus").empty());
    }

    return {
      load,
      light,
      lightInstant,
      fit,
      focus,
      zoomTo,
      flyTo,
      addNode,
      addChildren,
      revealPath,
      water,
      fertilize,
      addFact,
      interlink,
      comet,
      node: (id) => byId.get(id),
      nodes: () => [...byId.values()],
      suggested: () => suggestedId,
      analogiesOf: (id) => analogies
        .filter((a) => a.source.id === id || a.target.id === id)
        .map((a) => ({ other: a.source.id === id ? a.target : a.source, label: a.label })),
      select(id) {
        selectedId = id;
        L.nodes.selectAll("g.node").classed("is-selected", (n) => n.id === selectedId);
        updateFocus();
      },
      setInsets(next) {
        insets = Object.assign({ top: 0, right: 0, bottom: 0, left: 0 }, next);
      },
      setSpeed(k) {
        speed = k;
      },
      setAutoFit(on) {
        autoFit = on;
      },
      skin: () => skin
    };
  }

  window.ExplorerGraph = { create, CAN_SVG, FERT_SVG, SHIP_SVG };
})();
