// v3.2 全量视觉验收：开小灶（列表/详情/编辑器）+ 设置双页签 + 训练页横幅 + 移动端
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:3000";
const OUT = new URL("../.v32-screens/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const browser = await chromium.launch();

async function shoot(viewport, name, actions) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await actions(page);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await context.close();
  console.log("shot:", name);
}

// 桌面：开小灶列表（36 道预设 + 筛选 chips + 自己写一个）
await shoot({ width: 1440, height: 900 }, "desktop-kitchen-list", async (page) => {
  await page.click("#tab-tutorials");
});
// 筛选：早餐
await shoot({ width: 1440, height: 900 }, "desktop-kitchen-filter", async (page) => {
  await page.click("#tab-tutorials");
  await page.click('.tutorial-filter[data-meal="早餐"]');
});
// 详情（含 收起 ✕ / 编辑 按钮）
await shoot({ width: 1440, height: 900 }, "desktop-kitchen-detail", async (page) => {
  await page.click("#tab-tutorials");
  await page.click(".tutorial-row >> nth=0");
});
// 编辑器弹窗
await shoot({ width: 1440, height: 900 }, "desktop-kitchen-editor", async (page) => {
  await page.click("#tab-tutorials");
  await page.click(".tutorial-row >> nth=0");
  await page.click(".tutorial-actions button >> nth=0");
});
// 设置中心 · 外部服务页签
await shoot({ width: 1440, height: 900 }, "desktop-services-tab", async (page) => {
  await page.click("#tab-fitness");
  await page.click("#maps-connect-btn");
  await page.waitForTimeout(600);
  await page.click('.settings-tab[data-settings-tab="services"]');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const modal = document.querySelector("#settings-modal .modal-content");
    if (modal) modal.scrollTop = 260;
  });
});
// 训练页横幅
await shoot({ width: 1440, height: 900 }, "desktop-fitness-maps", async (page) => {
  await page.click("#tab-fitness");
});

// 移动端
await shoot({ width: 390, height: 844 }, "mobile-kitchen", async (page) => {
  await page.click("#tab-tutorials");
});
await shoot({ width: 390, height: 844 }, "mobile-chat", async () => {});

await browser.close();
console.log("done ->", OUT);
