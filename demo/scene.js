/* Miror: the opening scene and the intake "journey" (needs D3 v7).
 *
 * Kids:       a seed (garden) or bud (tree) on a grassy hill → click → each answer prepares the ground:
 *             dig a hole (age), loosen and water the soil (what you love), pick a seed from the bag and
 *             plant it (topic). The plant only grows once you've finished, while the map is built.
 * Researcher: people on Earth's horizon looking up at the night sky → click → the camera flies up to
 *             Earth and a dock where each answer builds part of the spaceship (materials, hull, engines,
 *             course, fuel). Once you've finished it launches, circles Earth, and dark stars appear:
 *             directions waiting to light up, always including Principles and Applications.
 *
 *   const scene = ExplorerScene.create(svgElement)
 *   scene.choose({ intro, onPick })        the opening picture: sky = research extension, land = interest
 *                                          exploration; with intro, stars spin into a spinning Earth first
 *   scene.begin()                          zoom in at once (after choosing, or planting from a group land)
 *   scene.show(mode, kidsWorld, onBegin, onLand)   opening picture; clicking it zooms in and calls onBegin.
 *                                          Kids: a signpost to "Our land" (everyone's gardens) calls onLand
 *   scene.setProgress(items)               items: [{ key, label, parts? }] for answered steps
 *   scene.building(items)                  final items while the map is being built
 *   scene.finish()                         zoom into the start of the real map; resolves when done
 *   scene.hide()
 */
(function () {
  "use strict";

  const W = 1440, H = 900;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const SEED = "M0,-26 C16,-14 18,10 0,20 C-18,10 -16,-14 0,-26Z";
  const BUD = "M0,-24 C14,-12 13,6 0,12 C-13,6 -14,-12 0,-24Z";
  const LEAF = "M0,0 C10,-12 30,-14 44,-4 C30,6 12,8 0,0Z";

  // Researcher journey: the ship is built at a dock beside Earth (the intake card sits on the right).
  const EARTH = { x: 210, y: 470, r: 66 };
  const DOCK = { x: 440, y: 450 };
  const STAGES = { level: "🧰 Materials", fields: "🔩 Hull", skills: "🛠️ Engines", topic: "🎯 Course", materials: "⛽ Fuel" };
  const TARGET = [770, 225];
  // After launch: directions waiting to be lit. Principles and Applications are always there.
  const DARK = [["Principles", 585, 160], ["Applications", 650, 600], ["", 330, 205], ["", 860, 440], ["", 770, 760]];

  function wrap(text, max) {
    const words = String(text).split(/\s+/), lines = [];
    let line = "";
    words.forEach((w) => {
      if (line && (line + " " + w).length > max) { lines.push(line); line = w; } else line = line ? line + " " + w : w;
    });
    if (line) lines.push(line);
    if (lines.length > 2) lines.splice(1, lines.length, lines.slice(1).join(" ").slice(0, max - 1) + "…");
    return lines;
  }

  function create(svgEl) {
    const svg = d3.select(svgEl).attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid slice");
    let mode = "researcher", world = "garden";
    let cam, opening, journey, routeLayer, starLayer, plant;
    let shown = [];
    let anchors = [];
    let ship = null, timer = null;
    let begun = false, onBegin = null, onLand = null;
    let dock = null, model = null, launched = false, lovesCount = 2;

    function defs() {
      const d = svg.append("defs");
      const blur = (id, sd) => d.append("filter").attr("id", id).attr("x", "-100%").attr("y", "-100%").attr("width", "300%").attr("height", "300%")
        .append("feGaussianBlur").attr("stdDeviation", sd);
      blur("sBlur", 4);
      blur("sBlurBig", 30);
      const glow = d.append("filter").attr("id", "sGlow").attr("x", "-200%").attr("y", "-200%").attr("width", "500%").attr("height", "500%");
      glow.append("feGaussianBlur").attr("stdDeviation", 4).attr("result", "b");
      const gm = glow.append("feMerge");
      gm.append("feMergeNode").attr("in", "b");
      gm.append("feMergeNode").attr("in", "SourceGraphic");
      const radial = (id, stops, cx = "50%", cy = "50%") => {
        const g = d.append("radialGradient").attr("id", id).attr("cx", cx).attr("cy", cy);
        stops.forEach(([o, c, a]) => g.append("stop").attr("offset", o).attr("stop-color", c).attr("stop-opacity", a == null ? 1 : a));
      };
      radial("sEarth", [["0%", "#7cc4ff"], ["45%", "#2f74d0"], ["100%", "#0b2550"]], "38%", "35%");
      radial("sEarthGlow", [["60%", "#4aa3ff", 0.45], ["100%", "#4aa3ff", 0]]);
      radial("sNight", [["55%", "#000", 0], ["100%", "#000", 0.55]], "30%", "40%");
      radial("sMilky", [["0%", "#cfd8ff", 0.5], ["60%", "#8f9fd6", 0.12], ["100%", "#8f9fd6", 0]]);
      radial("sStarGlow", [["0%", "#fff3c0", 0.55], ["100%", "#fff3c0", 0]]);
      const sky = d.append("linearGradient").attr("id", "sSky").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
      [["0%", "#01020a"], ["70%", "#071232"], ["100%", "#12285a"]].forEach(([o, c]) => sky.append("stop").attr("offset", o).attr("stop-color", c));
    }

    // ---------- opening pictures ----------
    function kidsOpening() {
      [[250, 170, 1.1], [1130, 130, 0.9], [880, 270, 0.6]].forEach(([x, y, s], i) => {
        const c = opening.append("g").attr("class", "s-cloud").attr("transform", `translate(${x},${y}) scale(${s})`)
          .append("g").style("animation-delay", `${-i * 7}s`);
        [[0, 0, 70, 30], [-50, 10, 45, 22], [55, 8, 50, 24], [10, -22, 45, 28]].forEach(([cx, cy, rx, ry]) =>
          c.append("ellipse").attr("cx", cx).attr("cy", cy).attr("rx", rx).attr("ry", ry));
      });
      opening.append("ellipse").attr("class", "s-hill-far").attr("cx", 300).attr("cy", 1500).attr("rx", 1300).attr("ry", 820);
      opening.append("ellipse").attr("class", "s-hill").attr("cx", 900).attr("cy", 1480).attr("rx", 1500).attr("ry", 800);
      tufts(opening, 690, 70);
      const g = opening.append("g").attr("class", "s-start").attr("transform", "translate(720,672)");
      g.append("circle").attr("class", "s-glow").attr("r", 80);
      g.append("circle").attr("class", "s-pulse").attr("r", 46);
      const bob = g.append("g").attr("class", "s-bob");
      if (world === "tree") {
        bob.append("path").attr("class", "s-stem").attr("d", "M0,14 C-3,0 3,-14 0,-30");
        bob.append("path").attr("class", "s-leaf").attr("d", LEAF).attr("transform", "translate(0,-8) rotate(-25) scale(0.8)");
        bob.append("path").attr("class", "s-leaf").attr("d", LEAF).attr("transform", "translate(0,-8) rotate(205) scale(0.8)");
        bob.append("path").attr("class", "s-bud").attr("d", BUD).attr("transform", "translate(0,-44) scale(1.4)");
      } else {
        bob.append("path").attr("class", "s-seed").attr("d", SEED).attr("transform", "scale(1.6)");
        bob.append("ellipse").attr("class", "s-seed-shine").attr("cx", -8).attr("cy", -12).attr("rx", 5).attr("ry", 10).attr("transform", "rotate(20)");
        bob.append("path").attr("class", "s-sprout").attr("d", "M0,-40 C2,-52 12,-58 18,-56");
      }
      ["✨", "✨", "⭐"].forEach((s, i) => g.append("text").attr("class", "s-sparkle").attr("x", [-70, 74, 40][i]).attr("y", [-50, -20, -80][i])
        .style("animation-delay", `${i * 0.6}s`).text(s));
      opening.append("text").attr("class", "s-caption").attr("transform", `translate(720,800) scale(${Math.min(1, (visibleWidth() - 30) / 480)})`)
        .text(world === "tree" ? "Tap the bud to grow your own tree 🌳" : "Tap the seed to plant your own 🌱");
      if (onLand) landSign();
    }

    // The picture is cropped to fill the screen; this is how much of its width shows.
    function visibleWidth() {
      return W * Math.min(1, (window.innerWidth / window.innerHeight) / (W / H));
    }

    // A wooden signpost on the hill: the way to "Our land", where family, friends or a class share gardens.
    function landSign() {
      // On a narrow (phone) screen the sign moves above the seed.
      const visW = visibleWidth();
      const fit = Math.min(1, (visW - 30) / 300);
      const at = visW < 1000 ? `translate(720,${600 - 210 * fit}) scale(${fit})` : "translate(1110,600)";
      const s = opening.append("g").attr("class", "s-sign").attr("transform", at)
        .attr("role", "button").attr("tabindex", 0).attr("aria-label", "Our land: visit your family's or class's gardens");
      s.append("rect").attr("class", "s-sign-post").attr("x", -7).attr("y", 0).attr("width", 14).attr("height", 110).attr("rx", 4);
      const board = s.append("g").attr("class", "s-sign-board");
      board.append("path").attr("class", "s-sign-wood").attr("d", "M-128,-62 L112,-62 L144,-21 L112,20 L-128,20 Q-138,20 -138,10 L-138,-52 Q-138,-62 -128,-62Z");
      board.append("text").attr("class", "s-sign-title").attr("x", -2).attr("y", -27).text("🏡 Our land");
      board.append("text").attr("class", "s-sign-sub").attr("x", -2).attr("y", 4).text("See everyone's gardens →");
      const go = (e) => {
        e.stopPropagation();
        if (!begun && onLand) onLand();
      };
      s.on("click", go).on("keydown", (e) => { if (e.key === "Enter" || e.key === " ") go(e); });
    }

    function spaceOpening() {
      opening.append("rect").attr("width", W).attr("height", H).attr("fill", "url(#sSky)");
      opening.append("ellipse").attr("class", "s-milky").attr("cx", 760).attr("cy", 300).attr("rx", 900).attr("ry", 130)
        .attr("transform", "rotate(-20 760 300)").attr("fill", "url(#sMilky)");
      starfield(opening, 260, 0, 700);
      // The bright star the person is pointing at, where the camera will fly.
      opening.append("circle").attr("cx", 900).attr("cy", 250).attr("r", 34).attr("fill", "url(#sStarGlow)");
      opening.append("circle").attr("class", "s-target").attr("cx", 900).attr("cy", 250).attr("r", 4);
      opening.append("circle").attr("class", "s-atmo-wide").attr("cx", 720).attr("cy", 2330).attr("r", 1650);
      opening.append("circle").attr("class", "s-atmo").attr("cx", 720).attr("cy", 2330).attr("r", 1650);
      opening.append("circle").attr("class", "s-horizon").attr("cx", 720).attr("cy", 2330).attr("r", 1648);
      // Two silhouettes on the horizon: an adult pointing up, a child looking up beside them.
      const p = opening.append("g").attr("class", "s-people").attr("transform", "translate(0,0)");
      p.append("circle").attr("cx", 726).attr("cy", 598).attr("r", 11).attr("class", "s-person");
      p.append("path").attr("class", "s-person").attr("d", "M714,612 Q709,640 712,662 L710,684 L718,684 L722,664 L726,684 L734,684 L732,662 Q735,640 730,612 Q722,606 714,612Z");
      p.append("path").attr("class", "s-person-arm").attr("d", "M729,620 L748,588 L760,560");
      p.append("path").attr("class", "s-person-arm").attr("d", "M716,622 L709,652");
      p.append("circle").attr("cx", 682).attr("cy", 637).attr("r", 8).attr("class", "s-person");
      p.append("path").attr("class", "s-person").attr("d", "M674,647 Q671,664 673,676 L672,684 L678,684 L681,672 L684,684 L690,684 L689,676 Q691,664 688,647 Q681,643 674,647Z");
      opening.append("text").attr("class", "s-caption").attr("x", 720).attr("y", 780).text("Click to begin your journey");
      opening.append("text").attr("class", "s-sub").attr("x", 720).attr("y", 815).text("Every exploration starts from where you stand.");
    }

    function starfield(g, count, y0, y1) {
      for (let i = 0; i < count; i++) {
        g.append("circle").attr("class", "s-star").attr("cx", rnd(0, W)).attr("cy", rnd(y0, y1)).attr("r", rnd(0.4, 1.6))
          .attr("opacity", rnd(0.3, 0.95)).style("animation-delay", `${rnd(-6, 0)}s`).style("--dur", `${rnd(3, 7)}s`);
      }
    }

    function tufts(g, baseY, spread) {
      for (let i = 0; i < 24; i++) {
        const x = 40 + i * 60 + rnd(-12, 12), y = baseY + rnd(0, spread) + Math.pow((x - 900) / 1500, 2) * 300;
        g.append("path").attr("class", "s-tuft")
          .attr("d", `M${x - 8},${y} Q${x - 6},${y - 16} ${x - 2},${y - 20} Q${x},${y - 8} ${x + 2},${y} Q${x + 4},${y - 14} ${x + 9},${y - 17} Q${x + 7},${y - 6} ${x + 9},${y}Z`);
      }
    }

    // ---------- the chooser: one picture. Sky = research extension, land = interest exploration ----------
    // choose({ intro, onPick(mode) }). With intro, stars spin and zoom in on a spinning Earth first.
    let meteorTimer = null, introTimers = [];
    const calm = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function chooserDefs() {
      const d = svg.select("defs");
      const sky = d.append("linearGradient").attr("id", "cSky").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
      [["0%", "#030a24"], ["40%", "#0a1f57"], ["62%", "#173f8f"], ["72%", "#2a5db0"]].forEach(([o, c]) => sky.append("stop").attr("offset", o).attr("stop-color", c));
      const tail = (id, c) => {
        const g = d.append("linearGradient").attr("id", id);
        g.append("stop").attr("offset", "0%").attr("stop-color", c).attr("stop-opacity", 1);
        g.append("stop").attr("offset", "100%").attr("stop-color", c).attr("stop-opacity", 0);
      };
      tail("cMeteor", "#ffffff");
      tail("cComet", "#bfe3ff");
    }

    // A tiny seeded random, so the flowers stand in the same places every time (handy for the video).
    function seeded(n) {
      let a = n;
      return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function constellation(g, pts, lines) {
      lines.forEach(([a, b]) => g.append("line").attr("class", "c-line")
        .attr("x1", pts[a][0]).attr("y1", pts[a][1]).attr("x2", pts[b][0]).attr("y2", pts[b][1]));
      pts.forEach(([x, y]) => g.append("circle").attr("class", "c-star").attr("cx", x).attr("cy", y).attr("r", 2.8));
    }

    function cartoonTree(g, x, y, k) {
      const t = g.append("g").attr("transform", `translate(${x},${y}) scale(${k})`);
      t.append("path").attr("class", "c-trunk").attr("d", "M-13,6 L-9,-95 Q0,-102 9,-95 L13,6Z");
      [[-48, -118, 46, 0], [44, -124, 48, 0], [0, -168, 56, 1], [0, -112, 52, 2], [-74, -88, 30, 1], [76, -90, 32, 1]]
        .forEach(([cx, cy, r, tone]) => t.append("circle").attr("class", `c-fol${tone}`).attr("cx", cx).attr("cy", cy).attr("r", r));
      [[-34, -128], [28, -152], [54, -104], [-58, -96], [6, -96]].forEach(([cx, cy]) => t.append("circle").attr("class", "c-fruit").attr("cx", cx).attr("cy", cy).attr("r", 7.5));
    }

    function flower(g, x, y, k, color, delay) {
      const outer = g.append("g").attr("transform", `translate(${x},${y}) scale(${k})`);
      const f = outer.append("g").attr("class", "c-sway").style("animation-delay", `${delay}s`);
      f.append("path").attr("class", "c-stem").attr("d", "M0,0 C-3,-14 3,-24 0,-36");
      f.append("path").attr("class", "c-leaf").attr("d", "M0,-14 C8,-22 18,-20 22,-14 C14,-8 6,-8 0,-14Z");
      for (let i = 0; i < 5; i++) {
        const a = (i * 72 * Math.PI) / 180;
        f.append("circle").attr("cx", Math.sin(a) * 9).attr("cy", -42 - Math.cos(a) * 9).attr("r", 8).style("fill", color);
      }
      f.append("circle").attr("class", "c-center").attr("cx", 0).attr("cy", -42).attr("r", 6);
    }

    function meteorLoop(layer, x0, x1) {
      if (calm()) return;
      const fire = () => {
        const comet = Math.random() < 0.25;
        const sx = rnd(x0 + 300, x1 + 120), sy = rnd(-30, 220);
        const m = layer.append("g").attr("transform", `translate(${sx},${sy})`).attr("opacity", 0);
        if (comet) {
          m.append("line").attr("class", "c-comet-tail").attr("x1", 0).attr("y1", 0).attr("x2", 260).attr("y2", -124);
          m.append("circle").attr("class", "c-comet-head").attr("r", 4.5);
        } else {
          m.append("line").attr("class", "c-meteor-tail").attr("x1", 0).attr("y1", 0).attr("x2", 150).attr("y2", -70);
        }
        const dur = comet ? rnd(3000, 4000) : rnd(700, 1100), dist = comet ? 520 : 440;
        m.transition().duration(dur * 0.15).attr("opacity", 1)
          .transition().duration(dur * 0.85).ease(d3.easeLinear)
          .attr("transform", `translate(${sx - dist},${sy + dist * 0.47})`).attr("opacity", 0).remove();
        meteorTimer = setTimeout(fire, rnd(1400, 3800));
      };
      meteorTimer = setTimeout(fire, 900);
    }

    function choose(o = {}) {
      stop();
      svg.selectAll("*").remove();
      defs();
      chooserDefs();
      begun = true;
      onBegin = null;
      svg.attr("data-scene", "chooser");
      svg.on("click", null);
      svgEl.onkeydown = null;
      svgEl.classList.remove("leaving", "clickable", "building");
      svgEl.classList.add("on");
      const vis = visibleWidth(), narrow = vis < 1000;
      const left = 720 - vis / 2, right = 720 + vis / 2;
      const pic = svg.append("g").attr("class", "c-pic");
      const pick = (mode) => {
        pic.selectAll(".c-side").classed("c-picked", false);
        pic.select(mode === "kids" ? ".c-land" : ".c-sky").classed("c-picked", true);
        if (o.onPick) o.onPick(mode);
      };
      const side = (cls, mode, label) => pic.append("g").attr("class", `c-side ${cls}`).attr("tabindex", 0).attr("role", "button").attr("aria-label", label)
        .on("click", (e) => { e.stopPropagation(); pick(mode); })
        .on("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(mode); } });

      // The sky: constellations, a bright star, the Milky Way and the odd meteor or comet.
      const sky = side("c-sky", "researcher", "Research extension: explore a new field from your own strengths");
      sky.append("rect").attr("width", W).attr("height", H).attr("fill", "url(#cSky)");
      sky.append("ellipse").attr("class", "s-milky").attr("cx", 820).attr("cy", 240).attr("rx", 900).attr("ry", 110)
        .attr("transform", "rotate(-14 820 240)").attr("fill", "url(#sMilky)").attr("opacity", 0.6);
      starfield(sky, 210, 0, 600);
      constellation(sky, [[935, 215], [1005, 168], [1080, 186], [1140, 132], [1222, 112], [1112, 262], [1040, 270]], [[0, 1], [1, 2], [2, 3], [3, 4], [2, 6], [6, 5], [5, 3]]);
      constellation(sky, [[150, 110], [228, 76], [300, 124], [262, 198], [176, 186], [384, 92]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [2, 5]]);
      sky.append("circle").attr("cx", 935).attr("cy", 215).attr("r", 40).attr("fill", "url(#sStarGlow)");
      sky.append("circle").attr("class", "s-target").attr("cx", 935).attr("cy", 215).attr("r", 4.5);
      const meteors = sky.append("g").attr("class", "c-meteors");
      const sx = narrow ? 720 : 430, sy = narrow ? 150 : 215;
      const skyText = sky.append("g").attr("class", "c-text").attr("transform", `translate(${sx},${sy}) scale(${narrow ? Math.min(1, (vis - 30) / 620) : 1})`);
      skyText.append("text").attr("class", "c-hint-sky").attr("y", -62).text("✦ Click the sky");
      skyText.append("text").attr("class", "c-title c-title-sky").text("Research extension");
      skyText.append("text").attr("class", "c-sub-sky").attr("y", 40).text("Find your strengths: move into a new field from what you already bring");

      // The land: hills, two cartoon trees, swaying flowers.
      const land = side("c-land", "kids", "Interest exploration: follow your curiosity and grow a garden of questions");
      land.append("ellipse").attr("class", "c-hill-back").attr("cx", 280).attr("cy", 1330).attr("rx", 1300).attr("ry", 760);
      land.append("ellipse").attr("class", "c-hill").attr("cx", 920).attr("cy", 1380).attr("rx", 1500).attr("ry", 780);
      cartoonTree(land, narrow ? 860 : 1190, 616, narrow ? 0.8 : 1.1);
      cartoonTree(land, narrow ? 585 : 205, 596, 0.75);
      tufts(land, 650, 200);
      const r = seeded(7), colors = ["#ff6fa3", "#ffd447", "#9d6bff", "#ffffff", "#ff8c42"];
      const hillY = (x) => 1380 - 780 * Math.sqrt(Math.max(0, 1 - ((x - 920) / 1500) ** 2));
      for (let i = 0; i < 26; i++) {
        const x = left + 40 + (i + r() * 0.8) * ((vis - 80) / 26);
        const y = hillY(x) + 40 + r() * 230;
        if (Math.abs(x - 720) < 340 && y > 700 && y < 840) continue;
        flower(land, x, y, 0.7 + r() * 0.5, colors[i % colors.length], -(r() * 4).toFixed(2));
      }
      for (let i = 0; i < 8; i++) {
        land.append("circle").attr("class", "c-firefly").attr("cx", left + r() * vis).attr("cy", 600 + r() * 260).attr("r", 2.6)
          .style("animation-delay", `${-(r() * 4).toFixed(2)}s`);
      }
      const landText = land.append("g").attr("class", "c-text").attr("transform", `translate(720,762) scale(${narrow ? Math.min(1, (vis - 30) / 760) : 1})`);
      landText.append("text").attr("class", "c-title c-title-land").text("Interest exploration");
      landText.append("text").attr("class", "c-sub-land").attr("y", 40).text("Follow your interests: grow a garden of questions · ages 5–12 and 12+");
      landText.append("text").attr("class", "c-hint-land").attr("y", 78).text("🌼 Tap the land");

      // A family on the hill, holding hands and looking out: dad, mum, a boy and a girl (feet at 0,0).
      const px = narrow ? 720 : 640, py = hillY(narrow ? 720 : 640) + 18;
      const p = pic.append("g").attr("class", "c-people").attr("transform", `translate(${px},${py}) scale(1.5)`);
      [
        "M-70,-44 Q-62,-48 -54,-44 L-53,-24 L-71,-24Z", "M-70,-25 L-69,0 L-63,0 L-62,-20 L-61,-20 L-60,0 L-54,0 L-54,-25Z",
        "M-37,-77 Q-22,-83 -7,-77 L-7,-40 L-37,-40Z", "M-37,-41 L-35,0 L-26,0 L-23,-32 L-21,-32 L-18,0 L-9,0 L-7,-41Z",
        "M3,-47 Q10,-51 17,-47 L23,-13 L-3,-13Z", "M4,-14 L4,0 L8,0 L8,-14Z M12,-14 L12,0 L16,0 L16,-14Z",
        "M32,-89 Q32,-99 42,-99 Q52,-99 52,-89 L54,-64 L30,-64Z", "M32,-73 Q42,-78 52,-73 L56,-40 L61,0 L23,0 L28,-40Z"
      ].forEach((d) => p.append("path").attr("class", "s-person").attr("d", d));
      [[-62, -52, 7], [-22, -89, 9.5], [10, -56, 7.5], [42, -86, 8.5]]
        .forEach(([cx, cy, r]) => p.append("circle").attr("class", "s-person").attr("cx", cx).attr("cy", cy).attr("r", r));
      ["M-55,-42 L-46,-31 L-37,-36", "M-36,-72 L-40,-50 L-37,-36", "M-8,-72 L-3,-50 L-1,-34 L5,-44",
        "M16,-44 L22,-36 L31,-46", "M33,-68 L30,-52 L31,-46", "M52,-68 L57,-48 L57,-38", "M-71,-42 L-74,-26"]
        .forEach((d) => p.append("path").attr("class", "s-person-arm c-arm").attr("d", d));

      const top = pic.append("text").attr("class", "c-header").attr("x", 720).attr("y", 44)
        .attr("transform", narrow ? `translate(720,0) scale(${Math.min(1, (vis - 30) / 640)}) translate(-720,0)` : null);
      top.append("tspan").attr("class", "c-brand").text("Miror  ");
      top.append("tspan").text("Information is everywhere. Miror finds your path through it.");

      if (!o.intro || calm()) {
        meteorLoop(meteors, left, right);
        return;
      }
      // Intro: the stars turn and rush past, a spinning Earth grows, then we drop down to the picture.
      pic.attr("opacity", 0);
      const intro = svg.append("g").attr("class", "c-intro");
      intro.append("rect").attr("width", W).attr("height", H).attr("fill", "#01030c");
      const field = intro.append("g").attr("transform", "translate(720,450) rotate(0) scale(0.55)");
      for (let i = 0; i < 320; i++) field.append("circle").attr("class", "c-star").attr("cx", rnd(-1300, 1300)).attr("cy", rnd(-1000, 1000)).attr("r", rnd(0.6, 2.4)).attr("opacity", rnd(0.35, 1));
      constellation(field, [[-420, -260], [-330, -300], [-250, -240], [-280, -160], [-380, -170]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]);
      constellation(field, [[300, 180], [380, 120], [470, 150], [520, 240], [430, 290]], [[0, 1], [1, 2], [2, 3], [3, 4]]);
      field.transition().duration(2800).ease(d3.easeCubicIn).attr("transform", "translate(720,450) rotate(75) scale(2.6)");
      const earth = intro.append("g").attr("transform", "translate(720,450) scale(0.06)");
      earth.append("circle").attr("r", 58).attr("fill", "url(#sEarthGlow)");
      earth.append("clipPath").attr("id", "cEarthClip").append("circle").attr("r", 40);
      const ball = earth.append("g").attr("clip-path", "url(#cEarthClip)");
      ball.append("circle").attr("r", 40).attr("fill", "url(#sEarth)");
      const spin = ball.append("g").attr("class", "c-spin");
      [-80, 0, 80].forEach((dx) => {
        const l = spin.append("g").attr("class", "s-land").attr("transform", `translate(${dx},0) scale(2)`);
        ["M-12,-8 C-8,-14 0,-13 2,-8 C4,-4 -2,-2 -4,2 C-6,6 -10,4 -12,0 Z", "M4,2 C8,0 13,3 12,8 C10,13 4,12 3,8 Z", "M2,-15 C6,-16 10,-13 8,-10 C6,-9 3,-11 2,-15Z", "M-15,6 C-12,8 -10,12 -13,13 C-16,12 -17,9 -15,6Z"]
          .forEach((dd) => l.append("path").attr("d", dd));
      });
      ball.append("circle").attr("r", 40).attr("fill", "url(#sNight)");
      earth.transition().duration(2800).ease(d3.easeCubicIn).attr("transform", "translate(720,450) scale(3)")
        .transition().duration(900).ease(d3.easeCubicIn).attr("transform", "translate(720,620) scale(40)");
      const end = () => {
        introTimers.forEach(clearTimeout);
        introTimers = [];
        if (intro.empty() || !intro.node().isConnected) return;
        intro.interrupt().selectAll("*").interrupt();
        intro.transition().duration(500).attr("opacity", 0).remove();
        pic.interrupt().transition().duration(700).attr("opacity", 1);
        meteorLoop(meteors, left, right);
      };
      introTimers.push(setTimeout(() => pic.transition().duration(900).attr("opacity", 1), 2900));
      introTimers.push(setTimeout(end, 3600));
      intro.on("click", end);
    }

    // ---------- show / begin ----------
    function show(m, kidsWorld, beginCb, landCb) {
      stop();
      svg.selectAll("*").remove();
      defs();
      mode = m;
      world = kidsWorld || "garden";
      shown = [];
      anchors = [];
      begun = false;
      onBegin = beginCb;
      onLand = landCb || null;
      svg.attr("data-scene", mode);
      cam = svg.append("g").attr("class", "cam");
      opening = cam.append("g").attr("class", "opening");
      if (mode === "kids") kidsOpening();
      else spaceOpening();
      journey = svg.append("g").attr("class", "journey").attr("opacity", 0);
      svgEl.classList.remove("leaving");
      svgEl.classList.add("on", "clickable");
      svg.on("click", begin);
      svgEl.setAttribute("tabindex", "0");
      svgEl.setAttribute("aria-label", mode === "kids" ? "Tap the seed to begin" : "Click to begin your journey");
      svgEl.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") begin(); };
    }

    function begin() {
      if (begun) return;
      begun = true;
      svg.on("click", null);
      svgEl.onkeydown = null;
      svgEl.classList.remove("clickable");
      const [fx, fy] = mode === "kids" ? [720, 660] : [900, 250];
      const k = mode === "kids" ? 7 : 9;
      cam.transition().duration(1400).ease(d3.easeCubicIn)
        .attr("transform", `translate(${W / 2 - k * fx},${H / 2 - k * fy}) scale(${k})`);
      opening.transition().delay(900).duration(500).attr("opacity", 0);
      setTimeout(() => {
        if (mode === "kids") kidsJourney();
        else spaceJourney();
        journey.transition().duration(800).attr("opacity", 1);
        if (onBegin) onBegin();
      }, 1300);
    }

    // ---------- kids journey: answers prepare the ground; the plant grows once you've finished ----------
    function kidsJourney() {
      journey.append("ellipse").attr("class", "s-hill-far").attr("cx", 200).attr("cy", 1440).attr("rx", 1200).attr("ry", 760);
      journey.append("ellipse").attr("class", "s-hill").attr("cx", 600).attr("cy", 1420).attr("rx", 1400).attr("ry", 760);
      tufts(journey, 680, 60);
      plant = journey.append("g").attr("class", "plant").attr("transform", "translate(470,0)");
      plant.append("ellipse").attr("class", "s-soil").attr("cx", 0).attr("cy", 684).attr("rx", 80).attr("ry", 17);
      pill(plant, 0, 735, world === "tree" ? "🌳 Your tree's spot" : "🌱 Your garden's spot", "start");
    }

    function pill(g, x, y, text, cls) {
      const p = g.append("g").attr("class", `s-pill ${cls || ""}`).attr("transform", `translate(${x},${y})`).attr("opacity", 0);
      const t = p.append("text").attr("dy", "0.35em").text(text);
      const w = Math.max(80, t.node().getComputedTextLength() + 30);
      p.insert("rect", "text").attr("x", -w / 2).attr("y", -19).attr("width", w).attr("height", 38).attr("rx", 19);
      p.transition().duration(500).attr("opacity", 1);
      return p;
    }

    function popIn(sel, delay, from) {
      sel.attr("transform", `${from} scale(0)`).transition().delay(delay).duration(650).ease(d3.easeBackOut.overshoot(2))
        .attr("transform", `${from} scale(1)`);
    }

    // A garden tool (emoji) that works for a moment, then fades.
    function tool(g, emoji, x, y, angles, delay = 0) {
      const t = g.append("text").attr("class", "s-tool").attr("x", 0).attr("y", 0).text(emoji)
        .attr("transform", `translate(${x},${y - 30})`).attr("opacity", 0);
      let tr = t.transition().delay(delay).duration(300).attr("opacity", 1).attr("transform", `translate(${x},${y})`);
      angles.forEach((a) => { tr = tr.transition().duration(240).attr("transform", `translate(${x},${y}) rotate(${a})`); });
      tr.transition().duration(300).attr("opacity", 0).remove();
    }

    function dirt(g, x, y, n, delay = 0) {
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        g.append("circle").attr("class", "s-dirt").attr("r", rnd(2.5, 4.5)).attr("cx", x).attr("cy", y).attr("opacity", 0)
          .transition().delay(delay + i * 70).duration(0).attr("opacity", 1)
          .transition().duration(380).ease(d3.easeQuadOut).attr("cx", x + side * rnd(25, 55)).attr("cy", y - rnd(25, 50))
          .transition().duration(320).ease(d3.easeQuadIn).attr("cy", y + 2).attr("opacity", 0).remove();
      }
    }

    // The watering can tips over the soil; the soil turns dark and wet.
    function waterSoil(g, delay) {
      const s = 1.7, ang = 34, cx = -100, cy = 610;
      const at = (r) => `translate(${cx},${cy}) scale(${s}) rotate(${r})`;
      g.append("g").attr("class", "can-fx").html(window.ExplorerGraph.CAN_SVG)
        .attr("transform", `translate(${cx},${cy - 40}) scale(${s})`).attr("opacity", 0)
        .transition().delay(delay).duration(400).attr("opacity", 1).attr("transform", at(0))
        .transition().duration(400).attr("transform", at(ang))
        .transition().delay(1000).duration(350).attr("transform", at(0))
        .transition().duration(300).attr("opacity", 0).remove();
      const r = (ang * Math.PI) / 180;
      const tx = cx + s * (30 * Math.cos(r) + 12 * Math.sin(r)), ty = cy + s * (30 * Math.sin(r) - 12 * Math.cos(r));
      for (let i = 0; i < 16; i++) {
        g.append("path").attr("class", "drop").attr("d", "M0,-5 C2.5,-1 3,1.5 0,3.5 C-3,1.5 -2.5,-1 0,-5Z")
          .attr("transform", `translate(${tx},${ty})`).attr("opacity", 0)
          .transition().delay(delay + 800 + i * 55).duration(0).attr("opacity", 1)
          .transition().duration(450).ease(d3.easeQuadIn).attr("transform", `translate(${rnd(-40, 40)},${rnd(674, 688)})`)
          .transition().duration(120).attr("opacity", 0).remove();
      }
      g.append("ellipse").attr("class", "s-wet").attr("cx", 0).attr("cy", 684).attr("rx", 70).attr("ry", 14).attr("opacity", 0)
        .transition().delay(delay + 1100).duration(900).attr("opacity", 0.55);
    }

    function addKidsItem(it) {
      const g = plant.append("g").attr("class", `item item-${it.key}`);
      if (it.key === "age") {
        // Dig the hole: the shovel digs, dirt flies onto two little piles.
        tool(g, "🪏", 46, 650, [-35, 15, -35, 15, -35]);
        dirt(g, 0, 678, 12, 250);
        g.append("ellipse").attr("class", "s-hole").attr("cx", 0).attr("cy", 683).attr("rx", 0).attr("ry", 0)
          .transition().delay(400).duration(800).attr("rx", 30).attr("ry", 9);
        [-62, 62].forEach((x, i) => popIn(g.append("g").append("path").attr("class", "s-pile").attr("d", "M-20,0 Q0,-18 20,0Z"), 700 + i * 200, `translate(${x},686)`));
        setTimeout(() => pill(g, -180, 640, `🎂 ${it.label}`), 900);
      } else if (it.key === "loves") {
        // Loosen the soil with the rake, then water it. The things you love float above.
        const rake = g.append("g").attr("class", "s-rake").attr("opacity", 0);
        rake.append("path").attr("d", "M0,0 L0,-70 M-16,0 L16,0 M-12,0 L-12,8 M-4,0 L-4,8 M4,0 L4,8 M12,0 L12,8");
        rake.attr("transform", "translate(-40,672)")
          .transition().duration(250).attr("opacity", 1)
          .transition().duration(350).attr("transform", "translate(35,672)")
          .transition().duration(350).attr("transform", "translate(-30,672)")
          .transition().duration(350).attr("transform", "translate(30,672)")
          .transition().duration(250).attr("opacity", 0).remove();
        [-48, -22, 4, 30].forEach((x, i) => g.append("path").attr("class", "s-furrow").attr("d", `M${x},678 l16,9`).attr("opacity", 0)
          .transition().delay(350 + i * 260).duration(300).attr("opacity", 1));
        waterSoil(g, 1500);
        const parts = (it.parts && it.parts.length ? it.parts : ["✨"]).slice(0, 6);
        lovesCount = Math.max(2, parts.length);
        parts.forEach((emoji, i) => {
          const side = i % 2 ? 1 : -1;
          const b = g.append("g").attr("class", "s-bubble");
          b.append("circle").attr("r", 22);
          b.append("text").attr("dy", "0.36em").text(emoji);
          popIn(b, 300 + i * 160, `translate(${side * (110 + (i >> 1) * 52)},${560 - (i >> 1) * 34})`);
        });
      } else if (it.key === "topic") {
        // Pick a seed from the bag: it hops into the hole, the hole is covered, and the spot gets its name.
        const bag = g.append("g").attr("class", "s-bag").attr("transform", "translate(120,600)");
        bag.append("path").attr("class", "s-bag-body").attr("d", "M-24,-26 L24,-26 L28,30 Q0,36 -28,30Z");
        bag.append("path").attr("class", "s-bag-top").attr("d", "M-24,-26 L-18,-38 L-8,-30 L0,-40 L8,-30 L18,-38 L24,-26Z");
        bag.append("text").attr("class", "s-bag-label").attr("y", 12).text("🌱");
        popIn(bag, 0, "translate(120,600)");
        bag.transition().delay(700).duration(450).attr("transform", "translate(120,600) rotate(-42)")
          .transition().delay(900).duration(400).attr("transform", "translate(120,600) rotate(0)")
          .transition().duration(400).attr("opacity", 0).remove();
        const seed = g.append("path").attr("class", "s-seed").attr("d", SEED).attr("opacity", 0);
        const [sx, sy, ex, ey] = [96, 570, 0, 676];
        seed.transition().delay(1100).duration(0).attr("opacity", 1).attr("transform", `translate(${sx},${sy}) scale(0.7)`)
          .transition().duration(800).ease(d3.easeQuadIn)
          .tween("hop", () => (t) => {
            const x = sx + (ex - sx) * t, y = sy + (ey - sy) * t - Math.sin(Math.PI * t) * 70;
            seed.attr("transform", `translate(${x},${y}) scale(0.7) rotate(${t * 200})`);
          })
          .transition().duration(400).attr("opacity", 0);
        g.append("ellipse").attr("class", "s-soil").attr("cx", 0).attr("cy", 683).attr("rx", 0).attr("ry", 0)
          .transition().delay(2200).duration(600).attr("rx", 34).attr("ry", 11);
        plant.select(".s-pill.start").transition().delay(1800).duration(300).attr("opacity", 0);
        setTimeout(() => pill(g, 0, 735, `🌱 ${it.label}`, "topic"), 2100);
      }
    }

    // Once you've finished: the plant finally grows out of the planted seed.
    function growPlant() {
      plant.selectAll(".grown").remove();
      const g = plant.append("g").attr("class", "grown");
      g.append("path").attr("class", "s-stem").attr("d", "M0,676 C-9,610 9,545 0,478").attr("pathLength", 1)
        .attr("stroke-dasharray", "1 1").attr("stroke-dashoffset", 1)
        .transition().duration(1300).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);
      for (let i = 0; i < lovesCount; i++) {
        const side = i % 2 ? 1 : -1, y = 630 - i * 24;
        popIn(g.append("g").append("path").attr("class", "s-leaf").attr("d", LEAF), 500 + i * 180, `translate(0,${y}) rotate(${side > 0 ? -18 : 198})`);
      }
      const bud = g.append("g").attr("class", "s-topic-bud");
      if (world === "tree") {
        [[-22, -10, 22], [20, -12, 20], [0, -30, 24], [0, 0, 22]].forEach(([x, y, r]) => bud.append("circle").attr("class", "s-crown").attr("cx", x).attr("cy", y).attr("r", r));
      }
      bud.append("path").attr("class", "s-bud").attr("d", BUD).attr("transform", world === "tree" ? "translate(0,-18) scale(1.3)" : "scale(1.9)");
      bud.append("path").attr("class", "s-calyx").attr("d", "M-11,0 C-8,13 8,13 11,0 C5,7 2,2 0,8 C-2,2 -5,7 -11,0Z").attr("transform", world === "tree" ? "translate(0,-18) scale(1.3)" : "scale(1.9)");
      popIn(bud, 1200 + lovesCount * 120, "translate(0,462)");
    }

    // ---------- researcher journey: build the ship at the dock, then launch it ----------
    function spaceJourney() {
      journey.append("rect").attr("width", W).attr("height", H).attr("fill", "url(#sSky)");
      journey.append("ellipse").attr("class", "s-milky").attr("cx", 700).attr("cy", 420).attr("rx", 900).attr("ry", 120)
        .attr("transform", "rotate(-12 700 420)").attr("fill", "url(#sMilky)").attr("opacity", 0.5);
      starfield(journey, 220, 0, H);
      const e = journey.append("g").attr("class", "s-earth").attr("transform", `translate(${EARTH.x},${EARTH.y})`);
      e.append("circle").attr("r", EARTH.r * 1.45).attr("fill", "url(#sEarthGlow)");
      e.append("circle").attr("r", EARTH.r).attr("fill", "url(#sEarth)");
      const land = e.append("g").attr("class", "s-land").attr("transform", `scale(${EARTH.r / 20})`);
      ["M-12,-8 C-8,-14 0,-13 2,-8 C4,-4 -2,-2 -4,2 C-6,6 -10,4 -12,0 Z", "M4,2 C8,0 13,3 12,8 C10,13 4,12 3,8 Z", "M2,-15 C6,-16 10,-13 8,-10 C6,-9 3,-11 2,-15Z", "M-15,6 C-12,8 -10,12 -13,13 C-16,12 -17,9 -15,6Z"]
        .forEach((dd) => land.append("path").attr("d", dd));
      e.append("path").attr("class", "s-clouds").attr("d", `M${-EARTH.r * 0.7},${-EARTH.r * 0.3} q30,-14 60,0 M${-EARTH.r * 0.2},${EARTH.r * 0.45} q26,-10 52,4`);
      e.append("circle").attr("r", EARTH.r).attr("fill", "url(#sNight)");
      journey.append("text").attr("class", "s-earth-label").attr("x", EARTH.x).attr("y", EARTH.y + EARTH.r + 46).text("You are here");
      routeLayer = journey.append("g");
      starLayer = journey.append("g");
      // The dock: a pad and scaffolding. The ship starts as a faint blueprint; each answer builds a part.
      launched = false;
      dock = journey.append("g").attr("class", "s-dock").attr("transform", `translate(${DOCK.x},${DOCK.y})`);
      dock.append("rect").attr("class", "s-pad").attr("x", -85).attr("y", 76).attr("width", 170).attr("height", 10).attr("rx", 4);
      [-60, 60].forEach((x) => dock.append("path").attr("class", "s-scaffold").attr("d", `M${x},76 L${x},-80 M${x},-40 L${x * 0.45},-40 M${x},20 L${x * 0.45},20`));
      model = dock.append("g").attr("class", "s-model");
      model.append("g").attr("transform", "rotate(-90) scale(3.4)").html(window.ExplorerGraph.SHIP_SVG);
      model.selectAll(".ship-hull").classed("part part-fields", true);
      model.selectAll(".ship-fin, .ship-window").classed("part part-skills", true);
      model.selectAll(".ship-flame").classed("part part-materials", true);
      dock.append("text").attr("class", "s-dock-label").attr("y", 112).text("Your ship · being built");
    }

    function stepShip() {
      const now = performance.now(), dt = Math.min(64, now - ship.last);
      ship.last = now;
      let x, y, heading;
      const f = ship.flight;
      if (f) {
        const u = Math.min(1, (now - f.t0) / f.dur), e = d3.easeCubicInOut(u);
        const pt = (t) => [(1 - t) * (1 - t) * f.sx + 2 * (1 - t) * t * f.cx + t * t * f.ex, (1 - t) * (1 - t) * f.sy + 2 * (1 - t) * t * f.cy + t * t * f.ey];
        [x, y] = pt(e);
        const [ax, ay] = pt(Math.max(0, e - 0.01)), [bx, by] = pt(Math.min(1, e + 0.01));
        heading = Math.atan2(by - ay, bx - ax);
        if (!ship.puffAt || now - ship.puffAt > 30) {
          ship.puffAt = now;
          routeLayer.append("circle").attr("class", "s-puff").attr("cx", x).attr("cy", y).attr("r", 3).attr("opacity", 0.8)
            .transition().duration(700).attr("r", 8).attr("opacity", 0).remove();
        }
        if (u >= 1) {
          ship.at = f.to;
          ship.angle = Math.atan2(y - f.to.y, x - f.to.x);
          ship.flight = null;
          if (f.done) f.done();
        }
      } else {
        ship.angle += (dt * (ship.fast ? 0.004 : 0.0013));
        x = ship.at.x + Math.cos(ship.angle) * ship.at.r;
        y = ship.at.y + Math.sin(ship.angle) * ship.at.r;
        heading = ship.angle + Math.PI / 2;
      }
      ship.x = x;
      ship.y = y;
      ship.g.attr("transform", `translate(${x},${y}) rotate(${(heading * 180) / Math.PI})`);
    }

    function flyTo(to, done) {
      const sx = ship.x, sy = ship.y;
      const ang = Math.atan2(sy - to.y, sx - to.x);
      const ex = to.x + Math.cos(ang) * to.r, ey = to.y + Math.sin(ang) * to.r;
      const len = Math.hypot(ex - sx, ey - sy) || 1;
      const bend = Math.min(80, len * 0.25);
      ship.flight = {
        sx, sy, ex, ey, to, done, t0: performance.now(),
        cx: (sx + ex) / 2 - ((ey - sy) / len) * bend, cy: (sy + ey) / 2 + ((ex - sx) / len) * bend,
        dur: Math.min(1600, 700 + len * 2)
      };
    }

    // Welding sparks while a part is fitted.
    function sparks(x, y) {
      for (let i = 0; i < 14; i++) {
        const a = rnd(0, Math.PI * 2), d = rnd(20, 60);
        starLayer.append("circle").attr("class", "s-spark").attr("r", rnd(1.2, 2.6)).attr("cx", x).attr("cy", y)
          .transition().delay(i * 25).duration(rnd(400, 700)).ease(d3.easeCubicOut)
          .attr("cx", x + Math.cos(a) * d).attr("cy", y + Math.sin(a) * d).attr("opacity", 0).remove();
      }
    }

    function addSpaceItem(it) {
      const i = Object.keys(STAGES).indexOf(it.key);
      if (i < 0) return;
      const g = starLayer.append("g").attr("class", `item item-${it.key}`);
      model.selectAll(`.part-${it.key}`).classed("on", true);
      sparks(DOCK.x + rnd(-20, 20), DOCK.y + rnd(-40, 30));
      if (it.key === "level") {
        [[-128, 50, 30], [-96, 50, 30], [-112, 22, 26]].forEach(([x, y, w], k) => {
          popIn(g.append("g").append("rect").attr("class", "s-crate").attr("x", -w / 2).attr("y", -w / 2).attr("width", w).attr("height", w).attr("rx", 3),
            k * 180, `translate(${DOCK.x + x},${DOCK.y + y + 10})`);
        });
      }
      if (it.key === "topic") {
        const [tx, ty] = TARGET;
        g.append("path").attr("class", "s-route").attr("pathLength", 1)
          .attr("d", `M${DOCK.x},${DOCK.y - 90} Q${(DOCK.x + tx) / 2},${ty - 60} ${tx},${ty}`)
          .attr("stroke-dasharray", "0.02 0.025").attr("opacity", 0).transition().duration(900).attr("opacity", 0.9);
        const s = g.append("g").attr("class", "s-node big").attr("transform", `translate(${tx},${ty})`);
        s.append("circle").attr("class", "s-node-glow").attr("r", 60).attr("fill", "url(#sStarGlow)");
        s.append("circle").attr("class", "s-node-core").attr("r", 0).transition().delay(500).duration(700).ease(d3.easeBackOut.overshoot(3)).attr("r", 13);
        const label = s.append("text").attr("class", "s-node-label").attr("y", 40).attr("opacity", 0);
        wrap(it.label, 22).forEach((line, k) => label.append("tspan").attr("x", 0).attr("dy", k ? "1.25em" : 0).text(line));
        label.transition().delay(800).duration(600).attr("opacity", 1);
      }
      const text = `${STAGES[it.key]}: ${it.label.length > 28 ? it.label.slice(0, 27) + "…" : it.label}`;
      pill(g, DOCK.x, DOCK.y + 160 + i * 44, text, "log");
    }

    function removeItem(key) {
      if (mode === "kids") {
        plant.selectAll(`.item-${key}`).transition().duration(300).attr("opacity", 0).remove();
        if (key === "topic") plant.select(".s-pill.start").transition().duration(300).attr("opacity", 1);
        return;
      }
      starLayer.selectAll(`.item-${key}`).transition().duration(300).attr("opacity", 0).remove();
      if (model) model.selectAll(`.part-${key}`).classed("on", false);
    }

    // Answered steps → what's drawn. Steps removed by going back fade away again.
    function setProgress(items) {
      if (!begun || !journey) return;
      const keys = items.map((i) => i.key);
      shown.filter((k) => !keys.includes(k)).forEach(removeItem);
      shown = shown.filter((k) => keys.includes(k));
      items.forEach((it) => {
        if (shown.includes(it.key)) return;
        shown.push(it.key);
        if (mode === "kids") addKidsItem(it);
        else addSpaceItem(it);
      });
    }

    // You've finished: the plant grows, or the ship counts down, launches and circles Earth.
    function building(items) {
      // The topic usually arrives with the build itself: let the seed land in the hole before it grows.
      const seedLanding = !shown.includes("topic");
      setProgress(items);
      svgEl.classList.add("building");
      if (mode === "kids") setTimeout(growPlant, seedLanding ? 3000 : 300);
      else launch();
    }

    function launch() {
      if (launched) {
        if (ship) ship.fast = true;
        return;
      }
      launched = true;
      model.selectAll(".part").classed("on", true);
      const cd = dock.append("text").attr("class", "s-countdown").attr("y", -120);
      ["3", "2", "1", "Launch! 🚀"].forEach((t, i) => setTimeout(() => cd.text(t), i * 550));
      setTimeout(() => {
        cd.remove();
        model.classed("lifting", true)
          .transition().duration(1400).ease(d3.easeCubicIn).attr("transform", "translate(0,-560)")
          .transition().duration(200).attr("opacity", 0);
        dock.select(".s-dock-label").text("Launched!");
        setTimeout(() => startOrbit(DOCK.x, DOCK.y - 200), 800);
        setTimeout(darkStars, 1500);
      }, 2200);
    }

    // The ship joins Earth's orbit (the same ship the map starts with).
    function startOrbit(x, y) {
      const sg = journey.append("g").attr("class", "s-ship");
      sg.append("g").attr("transform", "scale(1.5)").html(window.ExplorerGraph.SHIP_SVG);
      const earth = { key: "earth", x: EARTH.x, y: EARTH.y, r: EARTH.r + 26 };
      ship = { g: sg, at: earth, angle: -Math.PI / 2, flight: null, last: performance.now(), fast: false, x, y };
      timer = d3.timer(stepShip);
      flyTo(earth);
    }

    // Possible directions, still dark, waiting to be lit. Principles and Applications are always among them.
    function darkStars() {
      DARK.forEach(([label, x, y], i) => {
        routeLayer.append("path").attr("class", "s-dark-route").attr("d", `M${EARTH.x},${EARTH.y} L${x},${y}`)
          .attr("opacity", 0).transition().delay(i * 220).duration(700).attr("opacity", 0.5);
        const s = starLayer.append("g").attr("class", "s-dark").attr("transform", `translate(${x},${y})`).attr("opacity", 0);
        s.append("circle").attr("class", "s-dark-ring").attr("r", 18);
        s.append("circle").attr("class", "s-dark-core").attr("r", 9);
        s.append("text").attr("class", "s-dark-q").attr("dy", "0.36em").text("?");
        if (label) s.append("text").attr("class", "s-dark-label").attr("y", 40).text(label);
        s.transition().delay(i * 220).duration(700).attr("opacity", 1);
      });
    }

    function stopBuilding() {
      svgEl.classList.remove("building");
      if (ship) ship.fast = false;
    }

    // Zoom into where the real map begins (the bud, or Earth), then fade out.
    function finish() {
      return new Promise((resolve) => {
        stopBuilding();
        const [fx, fy, k] = mode === "kids" ? [470, 470, 3] : [EARTH.x, EARTH.y, 4];
        journey.transition().duration(1100).ease(d3.easeCubicIn)
          .attr("transform", `translate(${W / 2 - k * fx},${H / 2 - k * fy}) scale(${k})`);
        svgEl.classList.add("leaving");
        setTimeout(() => {
          hide();
          resolve();
        }, 1000);
      });
    }

    function stop() {
      if (timer) timer.stop();
      timer = null;
      ship = null;
      clearTimeout(meteorTimer);
      meteorTimer = null;
      introTimers.forEach(clearTimeout);
      introTimers = [];
    }

    function hide() {
      stop();
      svg.on("click", null);
      svgEl.onkeydown = null;
      svgEl.classList.remove("on", "clickable", "building", "leaving");
      svg.selectAll("*").remove();
    }

    return { show, choose, begin, setProgress, building, stopBuilding, finish, hide, setWorld: (w) => { world = w; }, isOn: () => svgEl.classList.contains("on") };
  }

  window.ExplorerScene = { create };
})();
