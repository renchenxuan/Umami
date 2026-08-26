import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text } from "./helpers";

const SaveHistorySchema = Type.Object({
  title: Type.String(),
  content: Type.String(),
});

export function createHistoryTools(db: RecipeDB): AgentTool<any>[] {
  return [
    {
      name: "save_recipe_history",
      label: "保存菜谱历史",
      description: "把刚生成的菜谱计划保存到历史记录。生成一周/多天菜谱后调用。",
      parameters: SaveHistorySchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof SaveHistorySchema>;
        db.addRecipeHistory(p.title, "agent", p.content);
        return { content: [text(`已保存历史记录：${p.title}`)], details: p };
      },
    },
    {
      name: "get_history",
      label: "查看历史",
      description: "列出历史生成过的菜谱记录。",
      parameters: Type.Object({}),
      execute: async () => {
        const items = db.getRecipeHistory();
        const content = items.length
          ? `历史共 ${items.length} 条：\n` +
            items.map((i) => `- ${i.title}（${i.created_at}）`).join("\n")
          : "还没有历史记录。";
        return { content: [text(content)], details: items };
      },
    },
  ];
}
