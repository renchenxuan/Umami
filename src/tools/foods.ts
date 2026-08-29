import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text } from "./helpers";

const SearchFoodsSchema = Type.Object({
  query: Type.Optional(Type.String()),
  category: Type.Optional(Type.String()),
});

export function createFoodTools(db: RecipeDB): AgentTool<any>[] {
  return [
    {
      name: "search_foods",
      label: "查食材",
      description: "在食材大全中按名称关键词或分类搜索，返回名称、分类、emoji 与每 100g 营养（kcal/蛋白质/脂肪/碳水，克）。推荐菜谱或估算热量前可先用它查食材营养。",
      parameters: SearchFoodsSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof SearchFoodsSchema>;
        const foods = db.searchFoods(p.query ?? "", p.category);
        const content = foods.length
          ? `找到 ${foods.length} 种食材：` + foods.slice(0, 20).map((f) => {
              const kcal = f.kcal != null ? `，约 ${f.kcal}kcal/100g` : "";
              return `${f.emoji}${f.name}（${f.category}${kcal}）`;
            }).join("、")
          : "没有找到相关食材。";
        return { content: [text(content)], details: foods };
      },
    },
  ];
}
