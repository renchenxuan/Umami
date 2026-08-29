import type { RecipeDB, Schedule } from "../db/database";
import { utcStamp } from "../db/database";
import type { ConversationAgentManager } from "./conversations";
import { broadcastServerEvent } from "./events";

export interface SchedulerOptions {
  /** tick 间隔（毫秒），默认 20s；到期判定精确到分钟，间隔只影响触发延迟上限。 */
  intervalMs?: number;
}

/**
 * 定时任务调度器：扫描 schedules 表中到期任务，把提醒写入目标会话并让 Agent 回应，
 * 然后通过全局事件流广播 schedule_fired。markScheduleFired 在运行前先推进 next_fire_at，
 * 避免模型回复期间被下一次 tick 重复触发。
 */
export function startScheduler(db: RecipeDB, conversations: ConversationAgentManager, options: SchedulerOptions = {}): () => void {
  let ticking = false;
  const tick = async () => {
    if (ticking) return;
    ticking = true;
    try {
      const due = db.dueSchedules(utcStamp(new Date()));
      for (const schedule of due) {
        await fireSchedule(schedule);
      }
    } catch (error) {
      console.error("调度器 tick 失败：", error);
    } finally {
      ticking = false;
    }
  };
  const fireSchedule = async (schedule: Schedule) => {
    // 目标会话被归档/删除时，落到一个新会话，保证提醒始终有落点。
    let conversationId = schedule.conversation_id;
    if (!db.getConversation(conversationId)) conversationId = db.createConversation(schedule.title || "定时提醒");
    db.markScheduleFired(schedule.id, new Date());
    const enabled = db.getSchedule(schedule.id)?.enabled;
    if (!enabled) console.log(`⏰ 定时任务「${schedule.title}」已完成全部触发，已自动停用。`);
    try {
      const result = await conversations.runScheduled(conversationId, { id: schedule.id, title: schedule.title, message: schedule.message });
      if (result.modelError) console.warn(`⏰ 定时任务「${schedule.title}」：${result.modelError}`);
    } catch (error) {
      console.error(`⏰ 定时任务「${schedule.title}」执行失败：`, error);
    }
    broadcastServerEvent({ type: "schedule_fired", scheduleId: schedule.id, conversationId, title: schedule.title });
  };
  const timer = setInterval(() => void tick(), options.intervalMs ?? 20_000);
  return () => clearInterval(timer);
}
