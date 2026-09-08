/**
 * 前端渲染出口的回归守卫。
 * 运行时是浏览器（无 DOM 的 bun test 里跑不了 app.js），这里锁定三件事：
 * 1) 净化函数存在且两个渲染出口都被它包裹（marked 分支 + 内置回退分支）；
 * 2) URL 白名单正则真的挡住可执行协议；
 * 3) 页面不再引用公网脚本。
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/server/static/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../src/server/static/index.html", import.meta.url), "utf8");

const renderFn = /function renderMarkdownToHtml\(text\) \{[\s\S]*?\n\}/.exec(app)?.[0] ?? "";
const safeUrlMatch = /const SAFE_URL_PATTERN = \/(.+)\/([a-z]*);/.exec(app);

describe("聊天 Markdown 渲染净化", () => {
  test("存在净化函数，且 marked 与内置渲染两个出口都被包裹", () => {
    expect(app).toContain("function sanitizeRenderedHtml");
    expect(renderFn).not.toBe("");
    expect(renderFn.match(/sanitizeRenderedHtml\(/g) ?? []).toHaveLength(2);
    // 入口仍然先做 HTML 转义，净化只是第二道闸
    expect(renderFn).toContain("escapeHtml(text)");
  });

  test("URL 白名单只放行 http(s)/mailto/锚点/相对路径", () => {
    expect(safeUrlMatch).toBeTruthy();
    const pattern = new RegExp(safeUrlMatch![1]!, safeUrlMatch![2]!);
    for (const url of ["https://example.test", "http://example.test", "mailto:a@b.test", "#top", "/api/v1/export"]) {
      expect(pattern.test(url)).toBe(true);
    }
    for (const url of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>1</script>", "vbscript:msgbox(1)", "  javascript:alert(1)"]) {
      expect(pattern.test(url)).toBe(false);
    }
  });

  test("marked 已本地化，页面不再引用公网脚本", () => {
    expect(html).not.toContain("cdn.jsdelivr.net");
    expect(html).toContain('src="vendor/marked.min.js"');
  });
});
