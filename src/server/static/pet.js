// =============================================================================
// 团团（Tuantuan）· 膳待家网页桌宠
// 改写自 liyupi/dsh-kun-like-pet（MIT License）的桌宠客户端引擎：
// 沿用其文档化的 8 列 × 9 行、192×208 单格精灵图契约与帧时长表，
// 去除 DSH 插件依赖，改为膳待家聊天界面的原生 JS 挂载 + 事件驱动状态。
//
// 交互：拖拽移动（按方向播跑步）、点击互动（挥手）、状态由 app.js 的聊天事件驱动。
// 无障碍：prefers-reduced-motion 时冻结为首帧，不播动画。
// =============================================================================
(function () {
  "use strict";

  const SPRITE_URL = "pet/spritesheet.webp";
  const CW = 192;
  const CH = 208;

  // 8×9 契约：每行一种动画（帧时长 ms）
  const ROWS = {
    idle: { row: 0, count: 6, frames: [280, 110, 110, 140, 140, 320] },
    runRight: { row: 1, count: 8, frames: [120, 120, 120, 120, 120, 120, 120, 220] },
    runLeft: { row: 2, count: 8, frames: [120, 120, 120, 120, 120, 120, 120, 220] },
    waving: { row: 3, count: 4, frames: [140, 140, 140, 280] },
    jumping: { row: 4, count: 5, frames: [140, 140, 140, 140, 280] },
    failed: { row: 5, count: 8, frames: [140, 140, 140, 140, 140, 140, 140, 240] },
    waiting: { row: 6, count: 6, frames: [150, 150, 150, 150, 150, 260] },
    running: { row: 7, count: 6, frames: [120, 120, 120, 120, 120, 220] },
    review: { row: 8, count: 6, frames: [150, 150, 150, 150, 150, 280] },
  };

  // 对外状态名 → 动画行
  const STATE_ANIM = {
    idle: "idle",
    running: "running",
    review: "review",
    waiting: "waiting",
    failed: "failed",
    waving: "waving",
    jumping: "jumping",
  };
  // 一次性状态：播完 N 轮后回到基础状态
  const ONCE_LOOPS = { waving: 1, jumping: 1, failed: 2 };

  const BUBBLES = {
    idle: "休息中~ 有事叫我",
    running: "努力工作中…",
    review: "让我想想…",
    waiting: "在等你确认哦~",
    failed: "呜…出错了 (._.)",
    waving: "嗨~ 我是团团！",
    jumping: "完成啦！",
    poke: "诶嘿~",
    dragging: "呜哇~ 别拽我！",
  };

  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const instances = [];

  class Tuantuan {
    /**
     * @param {HTMLElement} host 已有尺寸（CSS 决定宽高）的容器
     * @param {{bubble?: boolean, draggable?: boolean}} opts
     */
    constructor(host, opts = {}) {
      this.host = host;
      this.opts = { bubble: true, draggable: true, ...opts };
      this.base = "idle";
      this.anim = "idle";
      this.frame = 0;
      this.timer = null;
      this.dragData = null;
      this.bubbleTimer = null;

      const rect = host.getBoundingClientRect();
      this.w = rect.width || CW;
      this.h = rect.height || CH;

      host.classList.add("pet-sprite");
      host.style.backgroundImage = `url("${SPRITE_URL}")`;
      host.style.backgroundRepeat = "no-repeat";
      host.style.backgroundSize = `${this.w * 8}px ${this.h * 9}px`;
      host.style.backgroundPosition = "0 0";

      if (this.opts.bubble) {
        this.bubbleEl = document.createElement("div");
        this.bubbleEl.className = "pet-bubble hidden";
        host.appendChild(this.bubbleEl);
      }

      if (this.opts.draggable) this.bindDrag();
      this.play(this.base);
      instances.push(this);
    }

    /** 切换状态。opts.once=true 时播完回到基础状态。 */
    setState(name, opts = {}) {
      const anim = STATE_ANIM[name] || "idle";
      if (opts.once || ONCE_LOOPS[anim]) {
        this.playOnce(anim, ONCE_LOOPS[anim] || 1);
        if (BUBBLES[anim] && (anim === "failed" || anim === "jumping")) this.showBubble(BUBBLES[anim]);
      } else {
        this.base = anim;
        this.play(anim);
        if (this.opts.bubble && BUBBLES[anim] && (anim === "waiting" || anim === "running")) this.showBubble(BUBBLES[anim]);
      }
    }

    play(anim) {
      this.anim = anim;
      this.frame = 0;
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      this.draw();
      if (prefersReducedMotion) return; // 降动效：冻结首帧
      const spec = ROWS[anim];
      const step = (i) => {
        this.frame = i % spec.count;
        this.draw();
        this.timer = setTimeout(() => step(i + 1), spec.frames[i % spec.count]);
      };
      this.timer = setTimeout(() => step(1), spec.frames[0]);
    }

    playOnce(anim, loops) {
      this.anim = anim;
      this.frame = 0;
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      this.draw();
      if (prefersReducedMotion) { setTimeout(() => this.play(this.base), 900); return; }
      const spec = ROWS[anim];
      let loop = 0;
      let i = 0;
      const step = () => {
        this.frame = i;
        this.draw();
        const delay = spec.frames[i];
        i += 1;
        if (i >= spec.count) { i = 0; loop += 1; }
        if (loop >= loops) {
          this.timer = setTimeout(() => this.play(this.base), delay);
          return;
        }
        this.timer = setTimeout(step, delay);
      };
      this.timer = setTimeout(step, spec.frames[0]);
    }

    draw() {
      const spec = ROWS[this.anim];
      const col = this.frame % spec.count;
      this.host.style.backgroundPosition = `${-col * this.w}px ${-spec.row * this.h}px`;
    }

    showBubble(text, ms = 2200) {
      if (!this.bubbleEl) return;
      this.bubbleEl.textContent = text;
      this.bubbleEl.classList.remove("hidden");
      clearTimeout(this.bubbleTimer);
      this.bubbleTimer = setTimeout(() => this.bubbleEl.classList.add("hidden"), ms);
    }

    bindDrag() {
      const host = this.host;
      host.style.cursor = "grab";
      host.style.touchAction = "none";
      host.addEventListener("pointerdown", (e) => {
        if (typeof e.button === "number" && e.button !== 0) return;
        try { host.setPointerCapture(e.pointerId); } catch { /* 忽略 */ }
        const rect = host.getBoundingClientRect();
        this.dragData = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top, moved: false };
        host.style.cursor = "grabbing";
        this.showBubble(BUBBLES.dragging);
        e.preventDefault();
      });
      host.addEventListener("pointermove", (e) => {
        if (!this.dragData) return;
        const dx = e.clientX - this.dragData.x;
        const dy = e.clientY - this.dragData.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) this.dragData.moved = true;
        if (dx > 4) this.play("runRight");
        else if (dx < -4) this.play("runLeft");
        const maxX = window.innerWidth - this.w;
        const maxY = window.innerHeight - this.h;
        host.style.position = "fixed";
        host.style.left = `${Math.min(Math.max(this.dragData.left + dx, 0), maxX)}px`;
        host.style.top = `${Math.min(Math.max(this.dragData.top + dy, 0), maxY)}px`;
        host.style.right = "auto";
        host.style.bottom = "auto";
      });
      const end = () => {
        if (!this.dragData) return;
        const moved = this.dragData.moved;
        this.dragData = null;
        host.style.cursor = "grab";
        if (!moved) {
          this.showBubble(BUBBLES.poke);
          this.playOnce("waving", 1);
          return;
        }
        this.play(this.base);
      };
      host.addEventListener("pointerup", end);
      host.addEventListener("pointercancel", end);
    }
  }

  function mountCompanion() {
    if (prefersReducedMotion) return; // 降动效时不常驻
    if (document.getElementById("pet-companion")) return;
    const el = document.createElement("div");
    el.id = "pet-companion";
    el.className = "pet-companion";
    el.title = "团团 · 拖动移动，点击互动";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    new Tuantuan(el);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountCompanion);
  } else {
    mountCompanion();
  }

  // 供 app.js / 欢迎页调用
  window.UmamiPet = { create: (el, opts) => new Tuantuan(el, opts) };
  window.__umamiPet = {
    setState(name, opts) { for (const inst of instances) inst.setState(name, opts); },
  };
})();
