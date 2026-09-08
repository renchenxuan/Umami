import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { Models, Model } from "@earendil-works/pi-ai";
import type { RecipeDB } from "../db/database";
import type { SettingsStore } from "../settings";
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
import { createTutorialTools } from "./tutorials";
import { createMapTools } from "./map-tools";

/** 汇总构建全部工具。getModel 用于子调用工具读取当前模型（支持运行时切换）。 */
export function createAllTools(
  db: RecipeDB,
  models: Models,
  getModel: () => Model<any>,
  options: { conversationId?: number; settings?: SettingsStore; onProposal?: (proposal: import("../db/database").AgentActionProposal) => void; onCommit?: (action: import("../db/database").AgentActionProposal) => void } = {},
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
    ...createTutorialTools(db),
    ...(options.settings ? createMapTools(options.settings) : []),
    createNutritionTool(models, getModel, options.settings),
  ];
  if (options.conversationId === undefined) return tools;
  return wrapWriteToolsWithConfirmation(tools, db, options.conversationId, options.onProposal, options.onCommit);
}

/** 轻量记录 / 生成类写入：直接落库，与结构化页面（健身/饮食/资料）体验一致，降低高频记录摩擦。 */
export const AUTO_WRITE_TOOLS = new Set([
  "save_ingredients",
  "save_favorite",
  "save_recipe_history",
  "save_tutorial",
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
  onCommit?: (action: import("../db/database").AgentActionProposal) => void,
): AgentTool<any>[] {
  return tools.map((tool) => {
    if (AUTO_WRITE_TOOLS.has(tool.name)) {
      return {
        ...tool,
        execute: async (toolCallId: string, params: unknown) => {
          const previousGoals = tool.name === "update_goal_status" ? db.getGoals().filter((goal) => goal.name === String((params as Record<string, unknown>).name ?? "")) : [];
          const result = await tool.execute(toolCallId, params);
          const details = result.details as any;
          const outcome = autoActionOutcome(tool.name, details, previousGoals);
          const action = db.recordCommittedAgentAction(conversationId, tool.name, params, outcome.result, outcome.undo, outcome.undoAvailable);
          onCommit?.(action);
          return { ...result, content: [{ type: "text", text: `已记录：${tool.label}${action.undo_available ? "，可撤销" : ""}` }, ...result.content.slice(1)], details: { original: details, actionCommitted: action } };
        },
      } satisfies AgentTool<any>;
    }
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

function autoActionOutcome(type: string, details: any, previousGoals: Array<{ id: number; status: string }>) {
  if (type === "save_ingredients") return { result: { ids: details?.ids ?? [], count: details?.ids?.length ?? 0 }, undo: { ids: details?.ids ?? [] }, undoAvailable: true };
  if (type === "update_goal_status") return { result: { ids: details?.ids ?? [] }, undo: { goals: previousGoals.map((goal) => ({ id: goal.id, status: goal.status })) }, undoAvailable: previousGoals.length > 0 };
  const id = Number(details?.id);
  if (Number.isSafeInteger(id) && id > 0) return { result: details, undo: { id }, undoAvailable: true };
  return { result: details ?? null, undo: null, undoAvailable: false };
}
