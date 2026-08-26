import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text } from "./helpers";

const IngredientSchema = Type.Object({
  name: Type.String(),
  quantity: Type.Optional(Type.String()),
  category: Type.Optional(Type.String()),
});

const SaveIngredientsSchema = Type.Object({
  ingredients: Type.Array(IngredientSchema),
});

export function createIngredientTools(db: RecipeDB): AgentTool<any>[] {
  return [
    {
      name: "save_ingredients",
      label: "保存食材",
      description:
        "把识别出来或用户提到的食材保存到冰箱清单（数据库）。图片识别出食材后、或用户手动补充食材时调用。",
      parameters: SaveIngredientsSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof SaveIngredientsSchema>;
        const saved: { name: string; quantity: string; category: string }[] = [];
        for (const ing of p.ingredients) {
          const name = ing.name.trim();
          if (!name) continue;
          const quantity = ing.quantity ?? "若干";
          const category = ing.category ?? "其他";
          db.addIngredient(name, quantity, category, "agent");
          saved.push({ name, quantity, category });
        }
        return {
          content: [
            text(
              saved.length
                ? `已保存 ${saved.length} 种食材：${saved.map((s) => s.name).join("、")}`
                : "没有可保存的食材",
            ),
          ],
          details: saved,
        };
      },
    },
    {
      name: "list_ingredients",
      label: "查看食材",
      description: "列出冰箱里当前保存的所有食材。",
      parameters: Type.Object({}),
      execute: async () => {
        const items = db.getIngredients();
        const content = items.length
          ? `当前冰箱有 ${items.length} 种食材：\n` +
            items.map((i) => `- ${i.name}（${i.quantity || "若干"}，${i.category || "其他"}）`).join("\n")
          : "冰箱还是空的，还没有保存任何食材。";
        return { content: [text(content)], details: items };
      },
    },
    {
      name: "clear_ingredients",
      label: "清空食材",
      description: "清空冰箱里的所有食材。",
      parameters: Type.Object({}),
      execute: async () => {
        db.clearIngredients();
        return { content: [text("已清空所有食材。")], details: null };
      },
    },
  ];
}
