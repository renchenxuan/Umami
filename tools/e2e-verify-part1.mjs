/**
 * E2E 验证第 1 步：打开页面 → 截图（宠物/欢迎页）→ 打开自动化中心 → 通过表单新建任务 → 截图列表。
 * 用法：node tools/e2e-verify-part1.mjs <port>
 */
import { chromium } from "playwright";
import { resolve } from "node:path";

const port = process.argv[2] ?? "3210";
const base = `http://127.0.0.1:${port}`;
const shotDir = resolve(".pet-run/qa");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
await page.goto(base, { waitUntil: "networkidle" });

// 1. 欢迎页 + 常驻宠物
await page.waitForSelector("#pet-companion", { timeout: 15000 });
await page.waitForSelector(".pet-hero", { timeout: 15000 });
await page.waitForTimeout(1200); // 等动画跑起来
await page.screenshot({ path: resolve(shotDir, "e2e-chat.png") });

// 2. 打开自动化中心，通过表单新建任务
await page.click("#schedules-btn");
await page.waitForSelector("#schedules-modal:not(.hidden)", { timeout: 5000 });
await page.fill("#schedule-title", "喝水提醒");
await page.fill("#schedule-message", "该喝一杯水啦，记得打卡。");
await page.fill("#schedule-time", "18:30");
await page.click("#schedule-submit");
await page.waitForSelector("#schedules-list .manage-row", { timeout: 5000 });
await page.waitForTimeout(400);
await page.screenshot({ path: resolve(shotDir, "e2e-schedules.png") });

// 3. 留下任务信息供第 2 步触发
const listText = await page.locator("#schedules-list").innerText();
console.log("SCHEDULE_LIST:", listText.replace(/\n/g, " | "));

await browser.close();
console.log("part1 done");
