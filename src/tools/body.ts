import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text, todayISO } from "./helpers";

const LogBodyMetricSchema = Type.Object({
  weight_kg: Type.Number(),
  body_fat_pct: Type.Optional(Type.Number()),
  note: Type.Optional(Type.String()),
  date: Type.Optional(Type.String()),
});

export function createBodyTools(db: RecipeDB): AgentTool<any>[] {
  return [
    {
      name: "log_body_metric",
      label: "记录身体数据",
      description: "记录体重/体脂等身体数据。用户说「我体重70kg」等时调用。",
      parameters: LogBodyMetricSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof LogBodyMetricSchema>;
        db.addBodyMetric(p.date ?? todayISO(), p.weight_kg, p.body_fat_pct ?? null, p.note ?? "");
        return { content: [text(`已记录体重 ${p.weight_kg}kg`)], details: p };
      },
    },
    {
      name: "get_body_metrics",
      label: "查看身体数据",
      description: "列出体重/体脂的历史记录，用于追踪变化趋势。",
      parameters: Type.Object({}),
      execute: async () => {
        const items = db.getBodyMetrics();
        const content = items.length
          ? `身体数据记录：\n` +
            items
              .map(
                (b) =>
                  `- ${b.date} ${b.weight_kg}kg${b.body_fat_pct != null ? "，体脂 " + b.body_fat_pct + "%" : ""}`,
              )
              .join("\n")
          : "还没有身体数据记录。";
        return { content: [text(content)], details: items };
      },
    },
  ];
}
