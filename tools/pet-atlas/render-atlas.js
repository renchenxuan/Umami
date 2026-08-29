/**
 * Playwright 渲染：打开 generate-atlas-page.mjs 产出的 HTML 图集页，
 * 以 1:1 像素、透明背景截图，得到 1536×1872 的原始图集 PNG。
 * 用法：bun tools/pet-atlas/render-atlas.js [htmlPath] [outPng]
 */
import { chromium } from "playwright";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const htmlPath = resolve(process.argv[2] ?? ".pet-run/atlas-page.html");
const outPng = resolve(process.argv[3] ?? ".pet-run/atlas-raw.png");

if (!existsSync(htmlPath)) {
  console.error(`未找到图集页：${htmlPath}（先运行 generate-atlas-page.mjs）`);
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1536, height: 1872 }, deviceScaleFactor: 1 });
await page.goto("file://" + htmlPath.replace(/\\/g, "/"));
await page.waitForTimeout(300); // 字体/SVG 稳定
const el = page.locator("#atlas");
await el.screenshot({ path: outPng, omitBackground: true });
await browser.close();
console.log(`atlas rendered: ${outPng}`);
