import type { TextContent } from "@earendil-works/pi-ai";

/** 构造一段纯文本 content block，供工具返回给模型。 */
export function text(s: string): TextContent {
  return { type: "text", text: s };
}

/** 本地时区的 YYYY-MM-DD。 */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
