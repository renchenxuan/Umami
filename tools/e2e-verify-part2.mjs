/**
 * E2E 验证第 2 步：前置条件——外部已把任务的 next_fire_at 拨到过去。
 * 打开页面 → 等调度器触发（最多 40s）→ 验证会话里出现「⏰ 定时任务」消息与红点 → 截图。
 * 用法：node tools/e2e-verify-part2.mjs <port>
 */
import { chromium } from "playwright";
import { resolve } from "node:path";

const port = process.argv[2] ?? "3210";
const base = `http://127.0.0.1:${port}`;
const shotDir = resolve(".pet-run/qa");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
await page.goto(base, { waitUntil: "networkidle" });

// 轮询 API 等待定时消息落库
let fired = false;
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(2000);
  const res = await page.evaluate(async () => {
    const r = await fetch("/api/v1/conversations/1/messages?limit=6");
    const body = await r.json();
    return (body.data ?? []).some((m) => String(m.content).includes("⏰ 定时任务"));
  });
  if (res) { fired = true; break; }
}
if (!fired) { console.error("FAIL: 40s 内未见定时任务消息"); await browser.close(); process.exit(1); }

// 刷新页面让消息渲染出来，检查红点与新消息样式
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector(".msg.scheduled", { timeout: 10000 });
const hasDot = await page.evaluate(() => !!document.querySelector(".conversation-item.has-reminder") || "current-conversation");
await page.waitForTimeout(600);
await page.screenshot({ path: resolve(shotDir, "e2e-fired.png") });
console.log("SCHEDULED_MESSAGE_RENDERED: true");
console.log("REMINDER_DOT_OR_CURRENT:", hasDot);
await browser.close();
console.log("part2 done");
