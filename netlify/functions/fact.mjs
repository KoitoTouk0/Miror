// Netlify version of /api/fact (same logic as the local server).
import { funFact, withKey } from "../../api/explorer-ai.mjs";
import { KEY_HEADER, keyFrom, failure } from "../../api/http.mjs";

export default async (req) => {
  if (req.method !== "POST") return Response.json({ error: "POST only" }, { status: 405 });
  try {
    const body = await req.json();
    return Response.json(await withKey(keyFrom(req.headers.get(KEY_HEADER)), () => funFact(body)));
  } catch (e) {
    console.error("fact failed:", e.message);
    const f = failure(e);
    return Response.json({ error: f.error }, { status: f.status });
  }
};

export const config = { path: "/api/fact" };
