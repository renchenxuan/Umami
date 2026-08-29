/**
 * 团团精灵图帧生成器（参数化 SVG → HTML 图集页）
 *
 * 产出 .pet-run/atlas-page.html：8 列 × 9 行、每格 192×208 的透明画布，
 * 每格内嵌一个按帧参数生成的团团 SVG。随后由 render-atlas.cjs 用 Playwright
 * 截图（omitBackground 保留透明度），compose-atlas.py 校验并合成为最终 webp。
 *
 * 行契约与帧时长沿用 liyupi/dsh-kun-like-pet（MIT）文档化的 8×9 Codex 桌宠契约：
 *   row0 idle(6) row1 runRight(8) row2 runLeft(8) row3 waving(4) row4 jumping(5)
 *   row5 failed(8) row6 waiting(6) row7 working(6) row8 review(6)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(root, ".pet-run", "atlas-page.html");

const CW = 192, CH = 208;
// 每行使用的帧数（未用格保持全透明）
const ROW_FRAMES = [6, 8, 8, 4, 5, 8, 6, 6, 6];
const ROW_NAMES = ["idle", "runRight", "runLeft", "waving", "jumping", "failed", "waiting", "working", "review"];

const INK = "#2b4a3f";        // 轮廓深绿
const NORI = "#0b5c44";       // 海苔围巾
const BLUSH = "#34d399";      // emerald 腮红
const SHADOW = "#e6f1ea";     // 底部 cel 阴影
const TEAR = "#8fd0f0";

// ---------- 部件绘制 ----------

/** 圆润三角饭团身体（含底部阴影），squash: [scaleX, scaleY], lean: 旋转角度 */
function body({ squash = [1, 1], lean = 0, lift = 0 }) {
  const [sx, sy] = squash;
  return `<g transform="translate(96 ${178 + lift}) rotate(${lean}) scale(${sx} ${sy}) translate(-96 -178)">
    <path d="M96 52 C122 54 146 88 150 130 C152 156 138 172 96 172 C54 172 40 156 42 130 C46 88 70 54 96 52 Z"
      fill="#ffffff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M60 148 C74 158 118 158 132 148 C126 162 106 166 96 166 C86 166 66 162 60 148 Z" fill="${SHADOW}"/>
  </g>`;
}

/** 海苔围巾（缠在身体下沿，右侧打结），sway: 飘动角度 */
function scarf({ sway = 0, lift = 0 }) {
  return `<g transform="translate(0 ${lift})">
    <rect x="58" y="142" width="76" height="24" rx="9" fill="${NORI}"/>
    <path d="M128 148 L146 ${144 + sway} L138 160 Z" fill="${NORI}"/>
    <path d="M128 154 L143 ${156 + sway} L132 166 Z" fill="#094a37"/>
    <rect x="58" y="142" width="76" height="24" rx="9" fill="none" stroke="${INK}" stroke-width="4"/>
  </g>`;
}

/** 眼睛。style: dot(圆点) blink(闭眼) happy(^) sad(下垂) focus(半闭) */
function eyes({ style = "dot", dx = 0, dy = 0 }) {
  const eye = (cx) => {
    const x = cx + dx, y = 102 + dy;
    if (style === "blink") return `<path d="M${x - 6} ${y} q6 4 12 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    if (style === "happy") return `<path d="M${x - 6} ${y + 2} q6 -8 12 0" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    if (style === "sad") return `<path d="M${x - 6} ${y - 2} q6 7 12 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    if (style === "focus") return `<circle cx="${x}" cy="${y + 1}" r="4.5" fill="${INK}"/><path d="M${x - 6} ${y - 5} q6 -3 12 0" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    return `<circle cx="${x}" cy="${y}" r="5.2" fill="${INK}"/>`;
  };
  return eye(76) + eye(116);
}

/** 嘴巴。style: smile open frown o flat */
function mouth({ style = "smile", dy = 0 }) {
  const y = 116 + dy;
  if (style === "open") return `<path d="M89 ${y} q7 10 14 0 z" fill="${INK}"/>`;
  if (style === "frown") return `<path d="M89 ${y + 4} q7 -7 14 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if (style === "o") return `<circle cx="96" cy="${y + 2}" r="4" fill="${INK}"/>`;
  if (style === "flat") return `<path d="M90 ${y + 2} L102 ${y + 2}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  return `<path d="M89 ${y} q7 7 14 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

/** 腮红 */
function blush({ opacity = 0.5, dy = 0 }) {
  return `<ellipse cx="62" cy="${112 + dy}" rx="9" ry="6" fill="${BLUSH}" opacity="${opacity}"/>` +
    `<ellipse cx="130" cy="${112 + dy}" rx="9" ry="6" fill="${BLUSH}" opacity="${opacity}"/>`;
}

/** 小手臂（shoulder 为身体侧面的旋转支点） */
function arm({ side = "left", angle = 0, lift = 0 }) {
  const sx = side === "left" ? 52 : 140;
  const sy = 126 + lift;
  return `<ellipse cx="${sx}" cy="${sy}" rx="12" ry="9" fill="#ffffff" stroke="${INK}" stroke-width="4.5"
    transform="rotate(${side === "left" ? angle : -angle} ${sx} ${sy})"/>`;
}

/** 泪滴（贴在右眼角，attached；grow 0~1 控制大小） */
function tear({ grow = 1 }) {
  const s = Math.max(0.4, grow);
  return `<g transform="translate(122 104) scale(${s})">
    <path d="M0 0 Q5 8 0 12 Q-5 8 0 0 Z" fill="${TEAR}" stroke="#5aa8d0" stroke-width="1.5"/>
  </g>`;
}

/** 汗滴（专注工作时贴在右上额角） */
function sweat({ show = false }) {
  if (!show) return "";
  return `<g transform="translate(138 74)"><path d="M0 0 Q5 8 0 12 Q-5 8 0 0 Z" fill="${TEAR}" stroke="#5aa8d0" stroke-width="1.5"/></g>`;
}

function wrap(parts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}">${parts.join("")}</svg>`;
}

// ---------- 各状态帧参数 ----------

/** 每个函数 (f, n) => parts[] */
const STATES = {
  idle: (f) => {
    // 呼吸：1→缩→胀循环；第 4-5 帧眨眼
    const cycle = [0, 0.6, 1, 0.4, 0, 0.3][f] ?? 0;
    const squash = [1 + cycle * 0.025, 1 - cycle * 0.03];
    const blink = f === 4 || f === 5;
    return [
      body({ squash }),
      scarf({}),
      arm({ side: "left", angle: -6 + cycle * 4 }),
      arm({ side: "right", angle: 6 - cycle * 4 }),
      blush({}),
      eyes({ style: blink ? "blink" : "dot" }),
      mouth({ style: "smile" }),
    ];
  },

  runRight: (f) => {
    // 向右滚动赶路：右倾 + 交替弹跳 + 手臂前后摆
    const bounce = [0, 6, 0, -4, 0, 6, 0, -4][f] ?? 0;
    const swing = f % 2 === 0 ? 24 : -14;
    return [
      body({ lean: 9, lift: -bounce }),
      scarf({ sway: 6, lift: -bounce }),
      arm({ side: "left", angle: swing, lift: -bounce }),
      arm({ side: "right", angle: -swing * 0.6, lift: -bounce }),
      blush({}),
      eyes({ style: "dot", dx: 3 }),
      mouth({ style: "open", dy: -bounce }),
    ];
  },

  runLeft: (f) => {
    const bounce = [0, 6, 0, -4, 0, 6, 0, -4][f] ?? 0;
    const swing = f % 2 === 0 ? 24 : -14;
    return [
      body({ lean: -9, lift: -bounce }),
      scarf({ sway: -6, lift: -bounce }),
      arm({ side: "left", angle: -swing * 0.6, lift: -bounce }),
      arm({ side: "right", angle: swing, lift: -bounce }),
      blush({}),
      eyes({ style: "dot", dx: -3 }),
      mouth({ style: "open", dy: -bounce }),
    ];
  },

  waving: (f) => {
    // 招手：起手→高举→高举→收回
    const angle = [18, 52, 40, 8][f] ?? 0;
    const lift = [0, -3, -3, 0][f] ?? 0;
    return [
      body({ lift }),
      scarf({ lift }),
      arm({ side: "left", angle: -8, lift }),
      arm({ side: "right", angle, lift }),
      blush({ opacity: 0.6 }),
      eyes({ style: "happy" }),
      mouth({ style: "open", dy: lift }),
    ];
  },

  jumping: (f) => {
    // 预备蹲→蹬起→腾空(手举高)→下落→站稳（幅度控制在格内，顶部留 2px 边距）
    const poses = [
      { squash: [1.08, 0.9], lift: 6, armAngle: 24 },
      { squash: [0.92, 1.1], lift: -18, armAngle: 58 },
      { squash: [0.9, 1.12], lift: -24, armAngle: 64 },
      { squash: [0.96, 1.04], lift: -8, armAngle: 40 },
      { squash: [1.05, 0.94], lift: 4, armAngle: 16 },
    ];
    const p = poses[f] ?? poses[0];
    return [
      body({ squash: p.squash, lift: p.lift }),
      scarf({ lift: p.lift }),
      arm({ side: "left", angle: -p.armAngle * 0.5, lift: p.lift }),
      arm({ side: "right", angle: p.armAngle, lift: p.lift }),
      blush({ opacity: 0.65 }),
      eyes({ style: "happy", dy: p.lift < -18 ? -3 : 0 }),
      mouth({ style: "open" }),
    ];
  },

  failed: (f) => {
    // 低落：耷拉 + 下垂眼 + 泪滴渐大
    const droop = [0, 1, 2, 2, 3, 3, 3, 3][f] ?? 0;
    const grow = [0.4, 0.55, 0.7, 0.8, 0.9, 1, 1, 1][f] ?? 1;
    return [
      body({ lean: droop, lift: droop * 1.5 }),
      scarf({ lift: droop * 1.5 }),
      arm({ side: "left", angle: -2, lift: droop * 1.5 }),
      arm({ side: "right", angle: 2, lift: droop * 1.5 }),
      blush({ opacity: 0.35 }),
      eyes({ style: "sad", dy: droop * 0.5 }),
      tear({ grow }),
      mouth({ style: "frown", dy: droop * 0.5 }),
    ];
  },

  waiting: (f) => {
    // 期待等待：身体前倾、手托腮、眼睛向上看、轻轻晃
    const sway = [0, 1, 2, 2, 1, 0][f] ?? 0;
    return [
      body({ lean: 4 + sway * 0.6 }),
      scarf({ sway: 3 }),
      arm({ side: "left", angle: -30 }),
      arm({ side: "right", angle: 46 }),
      blush({ opacity: 0.55 }),
      eyes({ style: "dot", dy: -4, dx: sway }),
      mouth({ style: "o" }),
    ];
  },

  working: (f) => {
    // 专注干活：前倾、双臂快速交替（敲键盘感）、偶发汗滴
    const alt = f % 2 === 0 ? 12 : -8;
    const alt2 = f % 2 === 0 ? -8 : 12;
    const bounce = [0, -2, 0, -1, 0, -2][f] ?? 0;
    return [
      body({ lean: 5, lift: bounce }),
      scarf({ lift: bounce }),
      arm({ side: "left", angle: 34 + alt, lift: bounce }),
      arm({ side: "right", angle: 34 + alt2, lift: bounce }),
      blush({ opacity: 0.4 }),
      eyes({ style: "focus", dx: 2, dy: 1 }),
      sweat({ show: f === 2 || f === 5 }),
      mouth({ style: "flat", dy: bounce }),
    ];
  },

  review: (f) => {
    // 审阅思考：眼珠左右扫 + 头微倾 + 一只手托下巴
    const look = [-3, 0, 3, 3, 0, -3][f] ?? 0;
    const tilt = [2, 2, 0, -2, -2, 0][f] ?? 0;
    return [
      body({ lean: tilt }),
      scarf({}),
      arm({ side: "left", angle: -10 }),
      arm({ side: "right", angle: 50 }),
      blush({ opacity: 0.45 }),
      eyes({ style: "dot", dx: look, dy: -2 }),
      mouth({ style: "flat" }),
    ];
  },
};

// ---------- 组装 HTML 图集页 ----------

const cells = [];
for (let row = 0; row < 9; row++) {
  for (let col = 0; col < 8; col++) {
    const used = col < ROW_FRAMES[row];
    const inner = used ? wrap(STATES[ROW_NAMES[row]](col)) : "";
    cells.push(
      `<div class="cell" style="left:${col * CW}px;top:${row * CH}px">${inner}</div>`,
    );
  }
}

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:transparent;}
  #atlas{position:relative;width:${CW * 8}px;height:${CH * 9}px;background:transparent;}
  .cell{position:absolute;width:${CW}px;height:${CH}px;overflow:hidden;}
  .cell svg{display:block;}
</style></head>
<body><div id="atlas">${cells.join("")}</div></body></html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log(`atlas page written: ${OUT}`);
console.log(`cells: ${cells.length} (used ${ROW_FRAMES.reduce((a, b) => a + b, 0)})`);
