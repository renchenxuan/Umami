import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text, todayISO } from "./helpers";

const FoodItemSchema = Type.Object({
  name: Type.String(),
  quantity: Type.Optional(Type.String()),
});

const LogDietSchema = Type.Object({
  meal_type: Type.Optional(Type.String()),
  foods: Type.Array(FoodItemSchema),
  note: Type.Optional(Type.String()),
  date: Type.Optional(Type.String()),
});

export function createDietTools(db: RecipeDB): AgentTool<any>[] {
  return [
    {
      name: "log_diet",
      label: "记录饮食",
      description: "记录用户某餐吃了什么（早餐/午餐/晚餐/加餐），用于每日/每周健康分析。用户说「我今天吃了X」「早餐吃了Y」时调用。",
      parameters: LogDietSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof LogDietSchema>;
        const foods = p.foods ?? [];
        db.addDietLog(p.date ?? todayISO(), p.meal_type ?? "早餐", foods, p.note ?? "");
        const names = foods.map((f) => f.name).filter(Boolean).join("、");
        return { content: [text(`已记录${p.meal_type ?? "早餐"}：${names || "无具体食物"}。`)], details: p };
      },
    },
    {
      name: "get_diet",
      label: "查看饮食",
      description: "列出最近的饮食记录。",
      parameters: Type.Object({}),
      execute: async () => {
        const items = db.getDietLogs();
        const content = items.length
          ? `最近饮食记录：\n` +
            items
              .map((d) => {
                const names = Array.isArray(d.foods) ? (d.foods as Array<{ name?: string }>).map((f) => f?.name).filter(Boolean).join("、") : "";
                return `- ${d.date} ${d.meal_type}：${names || "无"}${d.note ? "（" + d.note + "）" : ""}`;
              })
              .join("\n")
          : "还没有饮食记录。";
        return { content: [text(content)], details: items };
      },
    },
  ];
}
