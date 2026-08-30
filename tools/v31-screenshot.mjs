// v3.1 改版视觉验收截图：桌面 1440×900 + 移动 390×844
// 用法：先启动隔离实例（PORT=3477 DATABASE_PATH=.v31-visual.db bun src/index.ts），再 node tools/v31-screenshot.mjs
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:3477";
const OUT = new URL("../.v31-screens/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const browser = await chromium.launch();

async function shoot(viewport, name, actions) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  await actions(page);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}${name}.png` });
  await context.close();
  console.log("shot:", name);
}

// 桌面
await shoot({ width: 1440, height: 900 }, "desktop-chat", async () => {});
await shoot({ width: 1440, height: 900 }, "desktop-fridge", async (page) => {
  await page.click("#tab-fridge");
});
await shoot({ width: 1440, height: 900 }, "desktop-board", async (page) => {
  await page.click("#tab-board");
});
await shoot({ width: 1440, height: 900 }, "desktop-recommend-modal", async (page) => {
  await page.click("#tab-board");
  await page.click("#recommend-btn");
});
await shoot({ width: 1440, height: 900 }, "desktop-analysis-modal", async (page) => {
  await page.click("#tab-board");
  await page.click("#analysis-btn");
});

// 移动
await shoot({ width: 390, height: 844 }, "mobile-chat", async () => {});
await shoot({ width: 390, height: 844 }, "mobile-fridge", async (page) => {
  await page.click("#tab-fridge");
});
await shoot({ width: 390, height: 844 }, "mobile-board", async (page) => {
  await page.click("#tab-board");
});
await shoot({ width: 390, height: 844 }, "mobile-sidebar", async (page) => {
  await page.click("#menu-btn");
});
await shoot({ width: 390, height: 844 }, "mobile-diet", async (page) => {
  await page.click("#tab-diet");
});

await browser.close();
console.log("done ->", OUT);
