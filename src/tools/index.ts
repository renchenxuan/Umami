import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { Models, Model } from "@earendil-works/pi-ai";
import type { RecipeDB } from "../db/database";
import { createIngredientTools } from "./ingredients";
import { createFavoriteTools } from "./favorites";
import { createHistoryTools } from "./history";
import { createPreferenceTools } from "./preferences";
import { createNutritionTool } from "./nutrition";
import { createWorkoutTools } from "./workout";
import { createBodyTools } from "./body";
import { createGoalTools } from "./goals";
import { createHabitTools } from "./habits";
import { createDietTools } from "./diet";
import { createFoodTools } from "./foods";
import { createScheduleTools } from "./schedules";

/** 汇总构建全部工具。getModel 用于子调用工具读取当前模型（支持运行时切换）。 */
export function createAllTools(
  db: RecipeDB,
  models: Models,
  getModel: () => Model<any>,
  options: { conversationId?: number; onProposal?: (proposal: import("../db/database").AgentActionProposal) => void } = {},
): AgentTool<any>[] {
  const tools = [
    ...createIngredientTools(db),
    ...createFavoriteTools(db),
    ...createHistoryTools(db),
    ...createPreferenceTools(db),
    ...createWorkoutTools(db),
    ...createBodyTools(db),
    ...createGoalTools(db),
    ...createHabitTools(db),
    ...createDietTools(db),
    ...createFoodTools(db),
    ...createScheduleTools(db, options.conversationId),
    createNutritionTool(models, getModel),
  ];
  if (options.conversationId === undefined) return tools;
  return wrapWriteToolsWithConfirmation(tools, db, options.conversationId, options.onProposal);
}

/** 轻量记录 / 生成类写入：直接落库，与结构化页面（健身/饮食/资料）体验一致，降低高频记录摩擦。 */
export const AUTO_WRITE_TOOLS = new Set([
  "save_ingredients",
  "save_favorite",
  "save_recipe_history",
  "log_workout",
  "log_body_metric",
  "set_goal",
  "update_goal_status",
  "log_habit",
  "log_diet",
]);

/** 高风险 / 不可逆 / 影响后续推荐的写入：先生成待确认提案，用户确认后才生效。 */
export const CONFIRM_WRITE_TOOLS = new Set([
  "clear_ingredients",
  "delete_favorite",
  "update_preferences",
  "delete_schedule",
]);

/**
 * Keep the existing tools intact for direct/unit use.
 * 轻量记录类工具直接执行；高风险工具替换为「先提案、后确认」。
 */
export function wrapWriteToolsWithConfirmation(
  tools: AgentTool<any>[],
  db: RecipeDB,
  conversationId: number,
  onProposal?: (proposal: import("../db/database").AgentActionProposal) => void,
): AgentTool<any>[] {
  return tools.map((tool) => {
    if (AUTO_WRITE_TOOLS.has(tool.name)) return tool;
    if (!CONFIRM_WRITE_TOOLS.has(tool.name)) return tool;
    return {
      ...tool,
      description: `${tool.description} 此操作会先生成待确认提案，只有用户确认后才会写入。`,
      execute: async (_toolCallId, params) => {
        const proposal = db.createAgentAction(conversationId, tool.name, params);
        onProposal?.(proposal);
        return {
          content: [{ type: "text", text: `已创建待确认操作 #${proposal.id}（${tool.label}），尚未修改任何数据。` }],
          details: { actionProposal: proposal },
        };
      },
    } satisfies AgentTool<any>;
  });
}
