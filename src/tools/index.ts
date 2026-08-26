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

/** 汇总构建全部工具。getModel 用于子调用工具读取当前模型（支持运行时切换）。 */
export function createAllTools(
  db: RecipeDB,
  models: Models,
  getModel: () => Model<any>,
): AgentTool<any>[] {
  return [
    ...createIngredientTools(db),
    ...createFavoriteTools(db),
    ...createHistoryTools(db),
    ...createPreferenceTools(db),
    ...createWorkoutTools(db),
    ...createBodyTools(db),
    ...createGoalTools(db),
    ...createHabitTools(db),
    createNutritionTool(models, getModel),
  ];
}
