import { startMap } from "../../api/explorer-ai.mjs";
import fs from "node:fs";
const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (let i = 1; i <= Number(process.argv[3] || 2); i++) {
  const t = Date.now();
  try {
    const r = await startMap(input);
    console.log(`run ${i}: ok in ${Date.now() - t} ms, safe=${r.safe}, nodes=${r.dataset ? r.dataset.nodes.length : 0}`);
  } catch (e) {
    console.log(`run ${i}: FAILED in ${Date.now() - t} ms: ${e.message.slice(0, 600)}`);
    if (e.cause) console.log("  cause:", String(e.cause).slice(0, 400));
    if (e.issues) console.log("  issues:", JSON.stringify(e.issues).slice(0, 800));
  }
}
