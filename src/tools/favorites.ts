import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text } from "./helpers";

const SaveFavoriteSchema = Type.Object({
  recipe_name: Type.String(),
  ingredients: Type.Optional(Type.Array(Type.String())),
  steps: Type.Optional(Type.Array(Type.String())),
});

const DeleteFavoriteSchema = Type.Object({ recipe_name: Type.String() });

export function createFavoriteTools(db: RecipeDB): AgentTool<any>[] {
  return [
    {
      name: "save_favorite",
      label: "收藏菜谱",
      description: "把一道菜谱收藏到收藏夹。",
      parameters: SaveFavoriteSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof SaveFavoriteSchema>;
        db.addFavorite(p.recipe_name, p.ingredients ?? [], p.steps ?? []);
        return { content: [text(`已收藏：${p.recipe_name}`)], details: p };
      },
    },
    {
      name: "list_favorites",
      label: "查看收藏",
      description: "列出收藏夹里的所有菜谱。",
      parameters: Type.Object({}),
      execute: async () => {
        const favs = db.getFavorites();
        const content = favs.length
          ? `收藏夹共 ${favs.length} 道菜：\n` + favs.map((f) => `- ${f.recipe_name}`).join("\n")
          : "收藏夹还是空的。";
        return { content: [text(content)], details: favs };
      },
    },
    {
      name: "delete_favorite",
      label: "删除收藏",
      description: "按菜名从收藏夹删除一道菜。",
      parameters: DeleteFavoriteSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof DeleteFavoriteSchema>;
        const target = db.getFavorites().find((f) => f.recipe_name === p.recipe_name);
        if (!target) {
          return { content: [text(`收藏夹里没有找到「${p.recipe_name}」`)], details: null };
        }
        db.deleteFavorite(target.id);
        return { content: [text(`已删除收藏：${p.recipe_name}`)], details: target };
      },
    },
  ];
}
