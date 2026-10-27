import { MODEL } from "../../api/explorer-ai.mjs";

export default async () => Response.json({ ai: Boolean(process.env.ANTHROPIC_API_KEY), model: MODEL });

export const config = { path: "/api/health" };
