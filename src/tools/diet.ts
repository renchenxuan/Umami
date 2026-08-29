import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text, todayISO } from "./helpers";

const FoodItemSchema = Type.Object({
  name: Type.String(),
  quantity: Type.Optional(Type.String({ description: "份量，如「一碗」「2个」「200克」" })),
  kcal: Type.Optional(Type.Number({ description: "仅当食物不在营养库（log_diet 返回会标注）且你能给出可靠估算时提供，单位千卡" })),
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
      description: [
        "记录用户某餐吃了什么（早餐/午餐/晚餐/加餐），系统会用内置营养库自动计算热量（每100g均值 × 份量克数估算）。",
        "用户说「我今天吃了X」「早餐吃了Y」时调用。份量尽量带上（碗/个/克），没说份量按 1 份计。",
        "返回结果包含总热量与逐项明细；标注 source=estimate 的食物不在营养库，热量为估算值。",
      ].join(""),
      parameters: LogDietSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof LogDietSchema>;
        const foods = p.foods ?? [];
        const id = db.addDietLog(p.date ?? todayISO(), p.meal_type ?? "早餐", foods, p.note ?? "");
        const log = db.getDietLog(id);
        const names = foods.map((f) => f.name).filter(Boolean).join("、");
        const estimated = Array.isArray(log?.foods)
          ? (log!.foods as Array<{ name?: string; kcal?: number | null; source?: string }>).filter((f) => f.source === "estimate").map((f) => f.name)
          : [];
        const kcalText = log?.total_kcal != null ? `，约 ${log.total_kcal} 千卡` : "";
        const estimateNote = estimated.length ? `（其中 ${estimated.join("、")} 不在营养库，热量为估算）` : "";
        return { content: [text(`已记录${p.meal_type ?? "早餐"}：${names || "无具体食物"}${kcalText}${estimateNote}。`)], details: log };
      },
    },
    {
      name: "get_diet",
      label: "查看饮食",
      description: "列出最近的饮食记录（含每餐估算热量）。",
      parameters: Type.Object({}),
      execute: async () => {
        const items = db.getDietLogs();
        const content = items.length
          ? `最近饮食记录：\n` +
            items
              .map((d) => {
                const names = Array.isArray(d.foods) ? (d.foods as Array<{ name?: string }>).map((f) => f?.name).filter(Boolean).join("、") : "";
                const kcal = d.total_kcal != null ? `，约 ${d.total_kcal} 千卡` : "";
                return `- ${d.date} ${d.meal_type}：${names || "无"}${kcal}${d.note ? "（" + d.note + "）" : ""}`;
              })
              .join("\n")
          : "还没有饮食记录。";
        return { content: [text(content)], details: items };
      },
    },
  ];
}
