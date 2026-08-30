import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text } from "./helpers";

const TutorialIngredientSchema = Type.Object({
  name: Type.String({ description: "食材名，如 番茄" }),
  amount: Type.String({ description: "具体用量，如 400g（约2个）、15ml、3 瓣" }),
  note: Type.Optional(Type.String({ description: "备注，如 需购买 / 可用 X 替代，没有则省略" })),
});

const SaveTutorialSchema = Type.Object({
  title: Type.String({ description: "菜名，如 番茄炒蛋" }),
  servings: Type.Integer({ minimum: 1, maximum: 20, description: "份量（几人份）" }),
  total_minutes: Type.Optional(Type.Integer({ minimum: 1, maximum: 600, description: "总耗时（分钟，含准备）" })),
  ingredients: Type.Array(TutorialIngredientSchema, { minItems: 1, maxItems: 40, description: "食材准备清单（含具体用量）" }),
  prep: Type.Array(Type.String(), { maxItems: 30, description: "切配与预处理步骤，按顺序" }),
  cook: Type.Array(Type.String(), { minItems: 1, maxItems: 30, description: "烹饪步骤，按顺序，写清火候与状态判断" }),
  tips: Type.Optional(Type.String({ description: "小贴士与常见失败点，最多 800 字" })),
});

/** 教学菜谱的 steps 列存储结构（JSON 存入 recipes.steps）。 */
export interface TutorialSteps {
  servings: number;
  total_minutes: number | null;
  prep: string[];
  cook: string[];
  tips: string;
}

export function createTutorialTools(db: RecipeDB): AgentTool<any>[] {
  return [
    {
      name: "save_tutorial",
      label: "保存教学菜谱",
      description:
        "把一份完整的教学菜谱（食材准备含克数、切配、烹饪步骤、小贴士）保存到「菜谱教授」页。教用户做菜并在生成完整教程后调用。",
      parameters: SaveTutorialSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof SaveTutorialSchema>;
        const title = p.title.trim();
        if (!title) return { content: [text("保存失败：教程缺少菜名。")], details: { saved: false } };
        const steps: TutorialSteps = {
          servings: p.servings,
          total_minutes: p.total_minutes ?? null,
          prep: p.prep.map((s) => s.trim()).filter(Boolean),
          cook: p.cook.map((s) => s.trim()).filter(Boolean),
          tips: (p.tips ?? "").trim(),
        };
        const id = db.createRecipe({
          title,
          ingredients: p.ingredients.map((i) => ({ name: i.name.trim(), amount: i.amount.trim(), note: (i.note ?? "").trim() })),
          steps,
          source: "tutorial",
        });
        return {
          content: [text(`已保存教学菜谱《${title}》（${p.servings} 人份）到「菜谱教授」页，用户可随时回看。`)],
          details: { saved: true, id },
        };
      },
    },
  ];
}
