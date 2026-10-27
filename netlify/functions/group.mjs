// Netlify version of /api/group (same logic as the local server); gardens live in Netlify Blobs.
import { getStore } from "@netlify/blobs";
import { groupAction, blobStore } from "../../api/groups.mjs";

export default async (req) => {
  if (req.method !== "POST") return Response.json({ error: "POST only" }, { status: 405 });
  try {
    const text = await req.text();
    if (text.length > 256 * 1024) return Response.json({ error: "too_large" }, { status: 413 });
    const store = blobStore(getStore({ name: "explorer-groups", consistency: "strong" }));
    const r = await groupAction(store, JSON.parse(text || "{}"));
    return Response.json(r.body, { status: r.status });
  } catch (e) {
    console.error("group failed:", e.message);
    return Response.json({ error: "unavailable" }, { status: 500 });
  }
};

export const config = { path: "/api/group" };
