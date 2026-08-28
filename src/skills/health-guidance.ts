import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./health-guidance/SKILL.md", import.meta.url)), "utf8");

/** Bundled project skill shared by the conversational Agent and recommendation endpoint. */
export const HEALTH_GUIDANCE_SKILL = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
