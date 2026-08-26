import { Type, type Static } from "@earendil-works/pi-ai";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { RecipeDB } from "../db/database";
import { text, todayISO } from "./helpers";

const LogHabitSchema = Type.Object({
  habit: Type.String(),
  value: Type.String(),
  date: Type.Optional(Type.String()),
});

export function createHabitTools(db: RecipeDB): AgentTool<any>[] {
  return [
    {
      name: "log_habit",
      label: "习惯打卡",
      description: "记录一次日常习惯（睡眠、饮水、心态等）。用户说「睡了7小时」「喝水打卡」等时调用。",
      parameters: LogHabitSchema,
      execute: async (_id, params) => {
        const p = params as Static<typeof LogHabitSchema>;
        db.addHabit(p.date ?? todayISO(), p.habit, p.value);
        return { content: [text(`已记录「${p.habit}」：${p.value}`)], details: p };
      },
    },
    {
      name: "get_habits",
      label: "查看习惯",
      description: "列出习惯打卡记录。",
      parameters: Type.Object({}),
      execute: async () => {
        const items = db.getHabits();
        const content = items.length
          ? `习惯记录：\n` + items.map((h) => `- ${h.date} ${h.habit}：${h.value}`).join("\n")
          : "还没有习惯打卡记录。";
        return { content: [text(content)], details: items };
      },
    },
  ];
}
