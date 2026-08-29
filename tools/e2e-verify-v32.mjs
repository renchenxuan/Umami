/**
 * v3.2 E2E 验证：新背景场景、会话列表卡片、聊天页改造、饮食页热量汇总。
 * 用法：node tools/e2e-verify-v32.mjs <port>
 */
import { chromium } from "playwright";
import { resolve } from "node:path";

const port = process.argv[2] ?? "3211";
const base = `http://127.0.0.1:${port}`;
const shotDir = resolve(".pet-run/qa");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
await page.goto(base, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// 1. 欢迎页：背景场景 + 粒子 + 快捷条 + 会话卡片
await page.screenshot({ path: resolve(shotDir, "v32-chat.png") });
const checks = {};
checks.sceneSvg = await page.evaluate(() => !!document.querySelector(".bg-scene svg"));
checks.steamItems = await page.locator(".steam-item").count();
checks.dustItems = await page.locator(".dust-item").count();
checks.quickChips = await page.locator(".quick-chip").count();

// 2. 会话卡片结构
checks.convCards = await page.locator(".conversation-item .conversation-avatar").count();
checks.convGroups = await page.evaluate(() => [...document.querySelectorAll(".conversation-group")].map((el) => el.textContent));

// 3. 通过 UI 记一餐饮食 → 验证热量汇总
await page.click("#tab-diet");
await page.waitForTimeout(600);
await page.fill("#d-foods", "米饭,鸡胸肉,西兰花");
await page.fill("#d-note", "E2E 验证餐");
await page.click("#d-add");
await page.waitForTimeout(1200);
await page.screenshot({ path: resolve(shotDir, "v32-diet.png") });
const summary = await page.evaluate(async () => {
  const r = await fetch("/api/v1/diet-summary");
  return (await r.json()).data;
});
checks.summaryKcal = summary.today.total.kcal;
checks.summaryTarget = summary.target?.kcal ?? null;
checks.summaryItems = summary.today.items.length;
checks.ringVisible = await page.evaluate(() => !document.getElementById("diet-summary").classList.contains("hidden"));

// 4. 聊天页：发一条消息验证打字指示/日期分隔/流式光标（模型未配置会走 error 路径，但 UI 结构可见）
await page.click("#tab-chat");
await page.waitForTimeout(400);
await page.fill("#input", "今天吃了米饭和鸡胸肉");
await page.click("#send-btn");
await page.waitForTimeout(700);
checks.typingOrError = await page.evaluate(() => {
  const bubble = document.querySelector(".msg.assistant .bubble");
  return bubble ? { typing: bubble.classList.contains("typing"), hasDots: !!bubble.querySelector(".typing-dots") } : null;
});
checks.dayDivider = await page.evaluate(() => {
  const divs = [...document.querySelectorAll(".day-divider")].map((el) => el.textContent);
  return divs;
});
await page.waitForTimeout(2500);
await page.screenshot({ path: resolve(shotDir, "v32-chat-message.png") });

console.log(JSON.stringify(checks, null, 2));
await browser.close();
