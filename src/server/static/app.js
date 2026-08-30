const messages = document.getElementById("messages");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send-btn");
const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const preview = document.getElementById("preview");
const previewImg = document.getElementById("preview-img");
const clearImg = document.getElementById("clear-img");
const conversationList = document.getElementById("conversation-list");
const newConvBtn = document.getElementById("new-conv-btn");
const appStatus = document.getElementById("app-status");

let pendingImage = null; // { base64, mimeType, dataUrl }
let currentConversationId = null;
let conversations = [];
// 收到定时任务提醒但还没打开过的会话，用于列表红点
const reminderConversations = new Set();

// ---- 主题切换 ----
const THEME_KEY = "health_theme";

/* 按分类映射的统一风格食物 SVG 插画（受信任静态字符串，用 innerHTML 渲染） */
const FOOD_ICON_SVG = {
  蔬菜: '<svg viewBox="0 0 24 24"><path d="M7 21c4 0 8-3 9-10 .5-2.5-.5-5-2-7s-4.5-2.5-7-2C6 6 4 11 4 14c0 4 1.5 7 3 7z"/><path d="M12 3v6"/></svg>',
  水果: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 5c1-2 3-3 5-2"/><path d="M12 9v8"/></svg>',
  肉类: '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="3"/><path d="M4 12h16"/></svg>',
  蛋奶: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="13" rx="8" ry="6"/><path d="M12 7V3"/><path d="M8 3h8"/></svg>',
  水产: '<svg viewBox="0 0 24 24"><path d="M6.5 12c0-3 3.5-5.5 7.5-5.5S20 9 20 12s-2.5 6-6 6-7.5-2.5-7.5-6z"/><circle cx="16" cy="10" r="1"/></svg>',
  主食: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="13" rx="9" ry="6"/><path d="M3 13h18"/></svg>',
  豆制品: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="6" y1="10" x2="18" y2="10"/><line x1="6" y1="15" x2="18" y2="15"/></svg>',
  菌菇: '<svg viewBox="0 0 24 24"><path d="M12 3c-4 0-7 3-7 7 0 4 3 8 7 11 4-3 7-7 7-11 0-4-3-7-7z"/><path d="M9 14l2 3 4-5"/></svg>',
  调味: '<svg viewBox="0 0 24 24"><path d="M17 3l4 4-9 9a3 3 0 0 1-1.5.8L7 19l-2-2 2.2-3.5A3 3 0 0 1 8 12l9-9z"/><path d="M3 21l4-4"/></svg>',
  坚果: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4v3"/><path d="M12 17v3"/><path d="M4 12h3"/><path d="M17 12h3"/></svg>',
  其他: '<svg viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 17,14 19,22 12,17 5,22 7,14 2,9 9,9"/></svg>',
};

function getFoodIcon(category) {
  return FOOD_ICON_SVG[category] || FOOD_ICON_SVG["其他"];
}

/* 分类 -> 分类标签图（仅作标签用） */
const FOOD_IMAGES = {
  "": "food-images/all.png",
  蔬菜: "food-images/veg.png",
  水果: "food-images/fruit.png",
  肉类: "food-images/meat.png",
  蛋奶: "food-images/dairy.png",
  水产: "food-images/seafood.png",
  主食: "food-images/staple.png",
  豆制品: "food-images/soy.png",
  菌菇: "food-images/mushroom.png",
  调味: "food-images/sauce.png",
  坚果: "food-images/nuts.png",
  其他: "food-images/other.png",
};

/* 食材名 -> 代表性真实照片（约50张覆盖190种食材，同类不同食材拿不同图） */
const FOOD_IMAGE_BY_NAME = {
  // 蔬菜（12张代表图）
  番茄: "foods/tomato.png", 土豆: "foods/potato.png", 胡萝卜: "foods/carrot.png", 白萝卜: "foods/carrot.png",
  黄瓜: "foods/cucumber.png", 茄子: "foods/eggplant.png", 西兰花: "foods/broccoli.png", 花菜: "foods/cauliflower.png",
  白菜: "foods/cabbage.png", 菠菜: "foods/spinach.png", 生菜: "foods/spinach.png", 油菜: "foods/cabbage.png",
  芹菜: "foods/spinach.png", 韭菜: "foods/scallion.png", 香菜: "foods/scallion.png", 葱: "foods/scallion.png",
  姜: "foods/ginger.png", 蒜: "foods/garlic.png", 洋葱: "foods/onion.png", 青椒: "foods/bell-pepper.png",
  红椒: "foods/chili.png", 小米椒: "foods/chili.png", 南瓜: "foods/pumpkin.png", 冬瓜: "foods/cucumber.png",
  丝瓜: "foods/cucumber.png", 苦瓜: "foods/cucumber.png", 玉米: "foods/corn.png", 山药: "foods/potato.png",
  莲藕: "foods/potato.png", 豆角: "foods/bell-pepper.png", 四季豆: "foods/bell-pepper.png", 荷兰豆: "foods/bell-pepper.png",
  芦笋: "foods/spinach.png", 莴笋: "foods/spinach.png",
  // 水果（10张）
  苹果: "foods/apple.png", 香蕉: "foods/banana.png", 橙子: "foods/orange.png", 橘子: "foods/orange.png",
  柠檬: "foods/lemon.png", 葡萄: "foods/grape.png", 草莓: "foods/strawberry.png", 蓝莓: "foods/blueberry.png",
  桃子: "foods/apple.png", 樱桃: "foods/cherry.png", 菠萝: "foods/pineapple.png", 芒果: "foods/mango.png",
  猕猴桃: "foods/kiwi.png", 西瓜: "foods/watermelon.png", 哈密瓜: "foods/watermelon.png", 梨: "foods/apple.png",
  火龙果: "foods/dragonfruit.png", 石榴: "foods/pomegranate.png", 牛油果: "foods/avocado.png", 柚子: "foods/grapefruit.png",
  // 肉类（6张）
  猪肉: "foods/pork.png", 猪里脊: "foods/pork.png", 五花肉: "foods/pork.png", 排骨: "foods/pork.png",
  牛肉: "foods/beef.png", 牛腩: "foods/beef.png", 牛排: "foods/beef.png", 羊肉: "foods/lamb.png",
  鸡胸肉: "foods/chicken-breast.png", 鸡腿: "foods/chicken-leg.png", 鸡翅: "foods/chicken-leg.png", 鸡爪: "foods/chicken-leg.png",
  鸭肉: "foods/chicken-breast.png", 培根: "foods/pork.png", 火腿: "foods/pork.png", 香肠: "foods/pork.png", 午餐肉: "foods/pork.png",
  // 蛋奶（2张）
  鸡蛋: "foods/egg.png", 鸭蛋: "foods/egg.png", 鹌鹑蛋: "foods/egg.png", 牛奶: "foods/milk.png",
  酸奶: "foods/milk.png", 奶酪: "foods/milk.png", 黄油: "foods/milk.png", 奶油: "foods/milk.png",
  // 水产（6张）
  三文鱼: "foods/salmon.png", 鲈鱼: "foods/fish.png", 鲫鱼: "foods/fish.png", 带鱼: "foods/fish.png",
  龙利鱼: "foods/fish.png", 鳕鱼: "foods/fish.png", 虾: "foods/shrimp.png", 虾仁: "foods/shrimp.png",
  螃蟹: "foods/crab.png", 扇贝: "foods/scallop.png", 蛤蜊: "foods/clam.png", 鱿鱼: "foods/squid.png",
  章鱼: "foods/octopus.png", 海带: "foods/seaweed.png", 紫菜: "foods/seaweed.png",
  // 主食（5张）
  大米: "foods/rice.png", 糙米: "foods/rice.png", 小米: "foods/rice.png", 燕麦: "foods/rice.png",
  面粉: "foods/rice.png", 面条: "foods/noodle.png", 挂面: "foods/noodle.png", 方便面: "foods/noodle.png",
  粉丝: "foods/noodle.png", 面包: "foods/bread.png", 吐司: "foods/bread.png", 馒头: "foods/bun.png",
  饺子: "foods/bun.png", 包子: "foods/bun.png", 红薯: "foods/sweet-potato.png", 紫薯: "foods/sweet-potato.png", 藜麦: "foods/rice.png",
  // 豆制品（1张）
  豆腐: "foods/tofu.png", 嫩豆腐: "foods/tofu.png", 豆干: "foods/tofu.png", 腐竹: "foods/tofu.png",
  豆浆: "foods/milk.png", 黄豆: "foods/tofu.png", 绿豆: "foods/tofu.png", 红豆: "foods/tofu.png", 黑豆: "foods/tofu.png", 鹰嘴豆: "foods/tofu.png",
  // 菌菇（3张）
  香菇: "foods/shiitake.png", 金针菇: "foods/enoki.png", 杏鲍菇: "foods/shiitake.png", 平菇: "foods/shiitake.png",
  木耳: "foods/wood-ear.png", 银耳: "foods/wood-ear.png", 口蘑: "foods/shiitake.png",
  // 调味（3张）
  盐: "foods/soy-sauce.png", 糖: "foods/soy-sauce.png", 生抽: "foods/soy-sauce.png", 老抽: "foods/soy-sauce.png",
  醋: "foods/soy-sauce.png", 料酒: "foods/soy-sauce.png", 蚝油: "foods/soy-sauce.png", 豆瓣酱: "foods/soy-sauce.png",
  辣椒酱: "foods/chili.png", 番茄酱: "foods/tomato.png", 酱油: "foods/soy-sauce.png", 食用油: "foods/olive-oil.png",
  橄榄油: "foods/olive-oil.png", 芝麻油: "foods/olive-oil.png",   花椒: "foods/chili.png", 八角: "foods/spices.png",
  桂皮: "foods/spices.png", 黑胡椒: "foods/spices.png", 孜然: "foods/spices.png", 蜂蜜: "foods/honey.png", 咖喱: "foods/spices.png",
  // 坚果（2张）
  核桃: "foods/mixed-nuts.png", 杏仁: "foods/mixed-nuts.png", 花生: "foods/peanut.png", 腰果: "foods/mixed-nuts.png",
  开心果: "foods/mixed-nuts.png", 瓜子: "foods/sunflower-seed.png", 芝麻: "foods/sesame.png",
  // 其他（2张）
  枸杞: "foods/goji.png", 红枣: "foods/red-date.png", 桂圆: "foods/red-date.png", 莲子: "foods/lotus-seed.png",
  百合: "foods/lotus-seed.png", 蛋白粉: "foods/milk.png", 麦片: "foods/rice.png", 咖啡: "foods/coffee.png", 茶叶: "foods/tea.png",
};

function foodImage(nameOrCategory, isName) {
  if (isName && FOOD_IMAGE_BY_NAME[nameOrCategory]) {
    return FOOD_IMAGE_BY_NAME[nameOrCategory];
  }
  return FOOD_IMAGES[nameOrCategory] || FOOD_IMAGES["其他"];
}

/* 各类食材冷藏/冷冻的参考保质期（天），用于保鲜估算 */
const SHELF_FRIDGE = { 蔬菜: 5, 水果: 7, 肉类: 3, 蛋奶: 12, 水产: 2, 主食: 30, 豆制品: 5, 菌菇: 5, 调味: 180, 坚果: 120, 其他: 30 };
const FREEZER_MULT = 8;

function shelfLifeDays(category, zone, fridgeTemp, freezerTemp) {
  const base = SHELF_FRIDGE[category] != null ? SHELF_FRIDGE[category] : 14;
  let days = zone === "freezer" ? Math.round(base * FREEZER_MULT) : base;
  if (zone === "freezer") {
    if (freezerTemp > -12) days = Math.round(days * 0.8);
    else if (freezerTemp < -22) days = Math.round(days * 1.1);
  } else {
    if (fridgeTemp > 6) days = Math.round(days * 0.7);
    else if (fridgeTemp < 2) days = Math.round(days * 1.1);
  }
  return Math.max(1, days);
}

function freshnessStatus(daysIn, life) {
  if (daysIn >= life) return "expired";
  if (daysIn >= life * 0.7) return "near";
  return "fresh";
}

function daysSince(addedAt) {
  if (!addedAt) return 0;
  const datePart = String(addedAt).slice(0, 10);
  const then = new Date(datePart + "T00:00:00");
  if (isNaN(then.getTime())) return 0;
  const diff = Date.now() - then.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark"; // aurora 等未识别值回退为深色
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(THEME_KEY, t);
  const sel = document.getElementById("theme-select");
  if (sel) sel.value = t;
}
(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === "light" ? "light" : "dark");
})();

// ---- 氛围效果（背景场景/粒子强度，按设备本地保存） ----
const AMBIENT_KEY = "health_ambient";
function applyAmbient(mode) {
  const m = ["standard", "reduced", "off"].includes(mode) ? mode : "standard";
  document.documentElement.dataset.ambient = m;
  const sel = document.getElementById("ambient-select");
  if (sel) sel.value = m;
}
applyAmbient(localStorage.getItem(AMBIENT_KEY));
// 将主题偏好同步到服务端，实现跨设备一致。
function syncThemeToServer(theme) {
  fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uiTheme: theme }) }).catch(() => {});
}

async function apiRequest(url, options) {
  const res = await fetch(url, options);
  let payload;
  try { payload = await res.json(); } catch { payload = null; }
  if (!res.ok || !payload || payload.ok === false) {
    const message = payload && payload.error && payload.error.message
      ? payload.error.message
      : `请求失败（${res.status}）`;
    throw new Error(message);
  }
  return payload.ok === true ? payload.data : payload;
}

let statusTimer = null;
function showAppStatus(message, ok = false) {
  if (!appStatus) return;
  clearTimeout(statusTimer);
  appStatus.textContent = message;
  appStatus.className = "app-status " + (ok ? "ok" : "err");
  statusTimer = setTimeout(() => appStatus.classList.add("hidden"), 4500);
}

function renderListError(container, msg = "加载失败，请刷新重试") {
  container.innerHTML = '<div class="list-empty">' + msg + "</div>";
}

let activeModal = null;
let modalReturnFocus = null;
const appShell = document.querySelector(".app");
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function openModal(modal, initialFocus) {
  modalReturnFocus = document.activeElement;
  activeModal = modal;
  modal.classList.remove("hidden");
  if (appShell) appShell.inert = true;
  requestAnimationFrame(() => (initialFocus || modal.querySelector(FOCUSABLE) || modal.querySelector(".modal-content")).focus());
}

function closeModal(modal) {
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  if (activeModal === modal) activeModal = null;
  if (appShell) appShell.inert = false;
  if (modalReturnFocus && typeof modalReturnFocus.focus === "function") modalReturnFocus.focus();
  modalReturnFocus = null;
}

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("mousedown", (event) => { if (event.target === modal) closeModal(modal); });
});

document.addEventListener("keydown", (event) => {
  if (!activeModal) return;
  if (event.key === "Escape") { event.preventDefault(); closeModal(activeModal); return; }
  if (event.key !== "Tab") return;
  const focusable = [...activeModal.querySelectorAll(FOCUSABLE)].filter((el) => !el.closest(".hidden"));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

const TOOL_LABELS = {
  save_ingredients: "保存食材中…",
  list_ingredients: "读取冰箱…",
  clear_ingredients: "清空食材…",
  save_favorite: "收藏中…",
  list_favorites: "读取收藏…",
  delete_favorite: "删除收藏…",
  save_recipe_history: "保存历史…",
  get_history: "读取历史…",
  get_preferences: "读取偏好…",
  update_preferences: "更新偏好…",
  analyze_nutrition: "营养分析中…",
  log_workout: "记录训练…",
  get_workouts: "读取训练…",
  log_body_metric: "记录身体数据…",
  get_body_metrics: "读取身体数据…",
  set_goal: "设置目标…",
  get_goals: "读取目标…",
  update_goal_status: "更新目标状态…",
  log_habit: "记录习惯…",
  get_habits: "读取习惯…",
  create_schedule: "创建定时任务…",
  list_schedules: "读取定时任务…",
  delete_schedule: "删除定时任务…",
};

const ACTION_LABELS = {
  save_ingredients: "保存食材",
  clear_ingredients: "清空食材",
  save_favorite: "收藏菜谱",
  delete_favorite: "删除收藏",
  save_recipe_history: "保存历史",
  update_preferences: "更新偏好",
  log_workout: "记录训练",
  log_body_metric: "记录身体数据",
  set_goal: "设置目标",
  update_goal_status: "更新目标状态",
  log_habit: "习惯打卡",
};

function summarizeAction(action) {
  const type = action.action_type;
  const p = action.payload || {};
  switch (type) {
    case "save_ingredients": {
      const list = Array.isArray(p.ingredients) ? p.ingredients : [];
      const names = list.map((i) => i && i.name).filter(Boolean);
      return `保存 ${names.length} 种食材${names.length ? "：" + names.join("、") : ""}`;
    }
    case "clear_ingredients":
      return "清空冰箱所有食材";
    case "save_favorite":
      return `收藏「${p.recipe_name || ""}」`;
    case "delete_favorite":
      return `删除收藏「${p.recipe_name || ""}」（不可撤销）`;
    case "save_recipe_history":
      return `保存历史「${p.title || ""}」`;
    case "update_preferences":
      return "更新口味 / 人数 / 忌口等偏好";
    case "log_workout":
      return `记录训练：${p.activity_type || ""}${p.duration_min ? " " + p.duration_min + " 分钟" : ""}`;
    case "log_body_metric":
      return `记录体重 ${p.weight_kg ?? ""}kg`;
    case "set_goal":
      return `设置目标「${p.name || ""}」`;
    case "update_goal_status":
      return `目标「${p.name || ""}」→ ${p.status || ""}`;
    case "log_habit":
      return `记录「${p.habit || ""}」：${p.value || ""}`;
    default:
      return "执行操作";
  }
}

function scrollBottom() {
  messages.scrollTop = messages.scrollHeight;
}

// SQLite 的 CURRENT_TIMESTAMP 是 UTC「YYYY-MM-DD HH:MM:SS」，按 UTC 解析、本地展示。
function parseDbTime(value) {
  const s = String(value || "");
  if (!s) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s) ? s.replace(" ", "T") + "Z" : s;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function formatTime(value) {
  const d = value instanceof Date ? value : parseDbTime(value) || new Date(value);
  if (!d || isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return `${hh}:${mm}`;
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${hh}:${mm}`;
}

function addBubble(role, timeValue) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + role;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  wrap.appendChild(bubble);
  appendMsgMeta(wrap, bubble, role, timeValue);
  messages.appendChild(wrap);
  scrollBottom();
  return bubble;
}

// 气泡下方的辅助信息：时间戳；助手消息额外提供「复制」。
function appendMsgMeta(wrap, bubble, role, timeValue) {
  const time = document.createElement("div");
  time.className = "msg-time";
  time.textContent = formatTime(timeValue || new Date());
  wrap.appendChild(time);
  if (role !== "assistant") return;
  const actions = document.createElement("div");
  actions.className = "msg-actions";
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "msg-copy";
  copyBtn.textContent = "复制";
  copyBtn.addEventListener("click", async () => {
    const raw = bubble.dataset.raw || bubble.textContent || "";
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
      copyBtn.textContent = "已复制";
      setTimeout(() => { copyBtn.textContent = "复制"; }, 1600);
    } catch { /* 剪贴板不可用时静默 */ }
  });
  actions.appendChild(copyBtn);
  wrap.appendChild(actions);
}

function addImage(dataUrl) {
  const wrap = document.createElement("div");
  wrap.className = "msg user";
  const img = document.createElement("img");
  img.className = "msg-img";
  img.src = dataUrl;
  wrap.appendChild(img);
  const time = document.createElement("div");
  time.className = "msg-time";
  time.textContent = formatTime(new Date());
  wrap.appendChild(time);
  messages.appendChild(wrap);
  scrollBottom();
}

// ---- 工具调用轨迹：随助手消息持续可见，替代原先一闪而过的状态行 ----
function getToolTrace(wrap) {
  let trace = wrap.querySelector(".tool-trace");
  if (!trace) {
    trace = document.createElement("div");
    trace.className = "tool-trace";
    wrap.insertBefore(trace, wrap.querySelector(".bubble"));
  }
  return trace;
}

function beginToolTraceItem(trace, name) {
  const running = [...trace.querySelectorAll('.tool-trace-item[data-tool]')].find(
    (el) => el.dataset.tool === name && !el.classList.contains("done")
  );
  if (running) return;
  const item = document.createElement("div");
  item.className = "tool-trace-item";
  item.dataset.tool = name;
  item.dataset.started = String(Date.now());
  const spin = document.createElement("span");
  spin.className = "tool-trace-spin";
  const label = document.createElement("span");
  label.textContent = TOOL_LABELS[name] || `正在执行 ${name}…`;
  item.appendChild(spin);
  item.appendChild(label);
  trace.appendChild(item);
}

function finishToolTraceItem(trace, evt) {
  const items = [...trace.querySelectorAll(".tool-trace-item[data-tool]")];
  const item = items.reverse().find((el) => el.dataset.tool === evt.name && !el.classList.contains("done"));
  if (!item) return;
  item.classList.add("done");
  if (evt.isError) item.classList.add("error");
  const dur = Date.now() - (Number(item.dataset.started) || Date.now());
  const label = item.querySelector("span:last-child");
  const base = (TOOL_LABELS[evt.name] || evt.name).replace(/…$/, "");
  label.textContent = `${base} · ${(dur / 1000).toFixed(1)}s${evt.isError ? " · 出错" : ""}`;
}

// 数据被写入（确认提案 / 撤销 / 会话结束）后，刷新受影响的结构化视图。
async function refreshAfterDataChange() {
  try { await refreshFridgeItems(); } catch { /* 冰箱数据不可用时静默 */ }
  if (document.body.dataset.view === "board" && typeof renderBoard === "function") renderBoard();
}

function renderActionCard(action) {
  const card = document.createElement("div");
  card.className = "action-card";
  card.dataset.actionId = action.id;

  const title = document.createElement("div");
  title.className = "action-card-title";
  title.textContent = "待确认：" + (ACTION_LABELS[action.action_type] || action.action_type);

  const summary = document.createElement("div");
  summary.className = "action-card-summary";
  summary.textContent = summarizeAction(action);

  const actions = document.createElement("div");
  actions.className = "action-card-actions";

  const confirmBtn = document.createElement("button");
  confirmBtn.className = "action-confirm";
  confirmBtn.textContent = "确认";
  confirmBtn.addEventListener("click", () => resolveAction(action.id, "confirm", card, actions));

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "action-cancel";
  cancelBtn.textContent = "取消";
  cancelBtn.addEventListener("click", () => resolveAction(action.id, "cancel", card, actions));

  actions.appendChild(confirmBtn);
  actions.appendChild(cancelBtn);
  card.appendChild(title);
  card.appendChild(summary);
  card.appendChild(actions);
  messages.appendChild(card);
  scrollBottom();
  enforceProposalLimit();
  setTimeout(() => {
    if (!card.classList.contains("confirmed") && !card.classList.contains("cancelled") && !card.classList.contains("expired")) {
      card.classList.add("expired");
      actions.textContent = "已过期，请重新发起该操作";
    }
  }, 10 * 60 * 1000);
  return card;
}

// 限制同一会话内的待确认提案数量，避免长对话中卡片无限堆积。
function enforceProposalLimit() {
  const cards = messages.querySelectorAll(".action-card");
  const MAX = 12;
  if (cards.length > MAX) {
    for (let i = 0; i < cards.length - MAX; i++) cards[i].remove();
  }
}

async function resolveAction(id, transition, card, actions) {
  const buttons = actions.querySelectorAll("button");
  for (const b of buttons) b.disabled = true;
  try {
    const result = await apiRequest(`/api/v1/actions/${id}/${transition}`, { method: "POST" });
    if (transition === "confirm") {
      card.classList.add("confirmed");
      actions.textContent = "";
      const state = document.createElement("span");
      state.textContent = "已确认 ✓";
      actions.appendChild(state);
      if (result && result.undo_available) {
        const undoBtn = document.createElement("button");
        undoBtn.type = "button";
        undoBtn.className = "action-undo";
        undoBtn.textContent = "撤销";
        undoBtn.setAttribute("aria-label", "撤销已确认的操作");
        undoBtn.addEventListener("click", () => resolveAction(id, "undo", card, actions));
        actions.appendChild(undoBtn);
      }
    } else if (transition === "undo") {
      card.classList.add("undone");
      actions.textContent = "已撤销";
    } else {
      card.classList.add("cancelled");
      actions.textContent = "已取消";
    }
    refreshAfterDataChange();
  } catch (e) {
    actions.textContent = "操作失败：" + e.message;
    for (const b of buttons) b.disabled = false;
  }
}

attachBtn.addEventListener("click", () => fileInput.click());

function loadImageFile(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result);
    pendingImage = {
      base64: dataUrl.split(",")[1],
      mimeType: file.type || "image/jpeg",
      dataUrl,
    };
    previewImg.src = dataUrl;
    preview.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

fileInput.addEventListener("change", () => {
  loadImageFile(fileInput.files && fileInput.files[0]);
});

clearImg.addEventListener("click", () => {
  pendingImage = null;
  preview.classList.add("hidden");
  fileInput.value = "";
});

// 粘贴 / 拖拽图片：与文件选择共用同一预览与发送链路。
input.addEventListener("paste", (e) => {
  const items = (e.clipboardData && e.clipboardData.items) || [];
  for (const item of items) {
    if (item.type && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) { e.preventDefault(); loadImageFile(file); }
      return;
    }
  }
});

const composerEl = document.querySelector(".composer");
if (composerEl) {
  composerEl.addEventListener("dragover", (e) => {
    if (!(e.dataTransfer && [...e.dataTransfer.types].includes("Files"))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    composerEl.classList.add("drag-over");
  });
  composerEl.addEventListener("dragleave", (e) => {
    if (composerEl.contains(e.relatedTarget)) return;
    composerEl.classList.remove("drag-over");
  });
  composerEl.addEventListener("drop", (e) => {
    composerEl.classList.remove("drag-over");
    const files = (e.dataTransfer && e.dataTransfer.files) || [];
    const image = [...files].find((f) => f.type && f.type.startsWith("image/"));
    if (!image) return;
    e.preventDefault();
    loadImageFile(image);
  });
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMarkdownFallback(text) {
  let html = escapeHtml(text);
  // 标题
  html = html.replace(/^#{2}\s+(.*)$/gm, '<h3 class="chat-md-h">$1</h3>');
  html = html.replace(/^#{3,4}\s+(.*)$/gm, '<h4 class="chat-md-h2">$1</h4>');
  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="chat-md-bold">$1</strong>');
  // 列表项
  html = html.replace(/^\s*[-*•]\s+(.*)$/gm, '<div class="chat-md-li">$1</div>');
  // 分割线
  html = html.replace(/^---+/gm, '<hr class="chat-md-hr">');
  // 空行 → 段落分隔
  html = html.replace(/\n{2,}/g, '\n\n');
  // 把非空行合并成段落（不在块级标签内的行）
  const lines = html.split('\n');
  const out = [];
  let buf = [];
  function flushBuf() {
    if (!buf.length) return;
    out.push('<p class="chat-md-p">' + buf.join('<br>') + '</p>');
    buf = [];
  }
  for (const line of lines) {
    if (!line.trim()) {
      flushBuf();
      continue;
    }
    if (/^<[^>]+>/.test(line)) {
      flushBuf();
      out.push(line);
    } else {
      buf.push(line);
    }
  }
  flushBuf();
  return out.join('');
}

// 优先使用 marked（支持表格 / 代码块 / 有序列表 / 链接），并对输入做 HTML 转义以防 XSS；
// 当 marked 未加载或解析失败时回退到内置轻量渲染。
function renderMarkdownToHtml(text) {
  if (text == null) return "";
  if (typeof marked !== "undefined") {
    try {
      const escaped = escapeHtml(text);
      return marked.parse(escaped, { gfm: true, breaks: true });
    } catch (e) { /* 回退到内置渲染 */ }
  }
  return renderMarkdownFallback(text);
}

function handleEvent(evt, bubble) {
  if (evt.type === "delta") {
    if (bubble.classList.contains("typing")) {
      bubble.classList.remove("typing");
      bubble.innerHTML = "";
    }
    const raw = (bubble.dataset.raw || "") + evt.text;
    bubble.dataset.raw = raw;
    bubble.innerHTML = renderMarkdownToHtml(raw);
    bubble.classList.add("streaming");
    scrollBottom();
  } else if (evt.type === "tool_status") {
    const wrap = bubble.closest(".msg");
    if (!wrap) return;
    const trace = getToolTrace(wrap);
    if (evt.phase === "end") finishToolTraceItem(trace, evt);
    else { beginToolTraceItem(trace, evt.name); scrollBottom(); }
  } else if (evt.type === "action_proposed") {
    renderActionCard(evt.action);
    if (window.__umamiPet) window.__umamiPet.setState("waiting");
  } else if (evt.type === "action_committed") {
    refreshAfterDataChange();
    if (window.__umamiPet) window.__umamiPet.setState("jumping");
    spawnSuccessRipple();
  } else if (evt.type === "agent_state") {
    // AI 开始/结束一轮运行：驱动呼吸极光与宠物的工作状态
    document.body.dataset.aiState = evt.active ? "thinking" : "idle";
    if (evt.active) { if (window.__umamiPet) window.__umamiPet.setState("running"); }
    else if (window.__umamiPet) window.__umamiPet.setState("waving", { once: true });
  } else if (evt.type === "done") {
    bubble.classList.remove("streaming");
    const wrap = bubble.closest(".msg");
    if (wrap && evt.usage && evt.usage.totalTokens) {
      const time = wrap.querySelector(".msg-time");
      const usageEl = document.createElement("div");
      usageEl.className = "msg-usage";
      const parts = [`↑${evt.usage.input}`, `↓${evt.usage.output}`];
      if (evt.usage.cacheRead > 0) parts.push(`缓存${evt.usage.cacheRead}`);
      usageEl.textContent = parts.join(" · ");
      usageEl.title = `本轮 token 用量：输入 ${evt.usage.input}、输出 ${evt.usage.output}` +
        (evt.usage.cacheRead > 0 ? `、缓存命中 ${evt.usage.cacheRead}` : "") +
        `，共 ${evt.usage.totalTokens}`;
      if (time) wrap.insertBefore(usageEl, time);
      else wrap.appendChild(usageEl);
    }
  } else if (evt.type === "error") {
    bubble.classList.remove("streaming");
    bubble.classList.remove("typing");
    bubble.textContent = "出错：" + evt.message;
    addRetryButton(bubble.closest(".msg"), true);
    if (window.__umamiPet) window.__umamiPet.setState("failed");
  }
  // start / done：气泡本身已承载内容，无需额外 UI
}

// 失败重试：重发上一条用户消息（不重复渲染用户气泡，复用原助手气泡位置）。
function addRetryButton(wrap, clearBubble) {
  if (!wrap) return;
  const bubble = wrap.querySelector(".bubble");
  if (clearBubble && bubble) bubble.dataset.raw = "";
  const row = wrap.querySelector(".msg-actions");
  if (!row || row.querySelector(".msg-retry")) return;
  const payload = lastSendPayload;
  if (!payload) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "msg-retry";
  btn.textContent = "重试";
  btn.addEventListener("click", () => {
    if (sending) return;
    wrap.remove();
    sendMessage(payload.text, payload.image, { echoUser: false });
  });
  row.appendChild(btn);
  row.classList.add("has-retry");
}

let sending = false;
let currentAbortController = null;
let lastSendPayload = null; // 最近一次发送的 { text, image }，供失败重试

function setSendingUI(on) {
  sendBtn.textContent = on ? "停止" : "发送";
  sendBtn.classList.toggle("is-stop", on);
  sendBtn.setAttribute("aria-label", on ? "停止生成" : "发送消息");
  attachBtn.disabled = on;
}

async function send() {
  const text = input.value.trim();
  const imagePayload = pendingImage;
  if ((!text && !imagePayload) || sending) return;
  if (currentConversationId == null) return;
  input.value = "";
  pendingImage = null;
  preview.classList.add("hidden");
  fileInput.value = "";
  await sendMessage(text, imagePayload, { echoUser: true });
}

async function sendMessage(text, imagePayload, opts = {}) {
  if (sending) return;
  if (currentConversationId == null) return;
  sending = true;
  setSendingUI(true);
  lastSendPayload = { text, image: imagePayload };
  const controller = new AbortController();
  currentAbortController = controller;
  const wasEmpty = !!messages.querySelector(".welcome-state");
  const welcome = messages.querySelector(".welcome-state");
  if (welcome) welcome.remove();

  if (opts.echoUser !== false) {
    ensureDayDivider();
    if (imagePayload) addImage(imagePayload.dataUrl);
    if (text) {
      const b = addBubble("user");
      b.textContent = text;
    }
  }

  const bubble = addBubble("assistant");
  bubble.classList.add("typing");
  bubble.innerHTML = '<span class="typing-dots" role="status" aria-label="AI 正在思考"><i></i><i></i><i></i></span>';

  try {
    const res = await fetch(`/api/v1/conversations/${currentConversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        text,
        imageBase64: imagePayload ? imagePayload.base64 : undefined,
        mimeType: imagePayload ? imagePayload.mimeType : undefined,
      }),
    });
    if (!res.ok || !res.body) {
      let msg = "请求失败：" + res.status;
      try {
        const data = await res.json();
        if (data && data.error && data.error.message) msg = data.error.message;
      } catch {
        /* 保留默认错误信息 */
      }
      throw new Error(msg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              handleEvent(JSON.parse(line.slice(6)), bubble);
            } catch {
              /* 忽略坏块 */
            }
          }
        }
      }
    }
    // 会话第一条消息发送成功后，用消息内容自动命名。
    if (wasEmpty && text) autoTitleConversation(currentConversationId, text);
  } catch (e) {
    bubble.classList.remove("typing", "streaming");
    if (controller.signal.aborted) {
      const note = document.createElement("div");
      note.className = "msg-stopped";
      note.textContent = "已停止生成";
      bubble.appendChild(note);
    } else {
      bubble.textContent = "出错：" + e.message;
      addRetryButton(bubble.closest(".msg"), false);
    }
  } finally {
    sending = false;
    currentAbortController = null;
    setSendingUI(false);
    scrollBottom();
    refreshAfterDataChange();
  }
}

// 首条消息即会话标题：截取前 20 字，仅当标题仍是默认「新对话」时生效。
async function autoTitleConversation(id, text) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv || (conv.title && conv.title !== "新对话")) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  const title = trimmed.slice(0, 20) + (trimmed.length > 20 ? "…" : "");
  try {
    await apiRequest(`/api/v1/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    conv.title = title;
    renderConversationList();
  } catch { /* 保持默认标题 */ }
}

sendBtn.addEventListener("click", () => {
  if (sending) {
    if (currentAbortController) currentAbortController.abort();
    return;
  }
  send();
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sending) send();
  }
});

// 输入框随内容自动增高（多行输入不被裁切，移动端两行占位可完整显示）
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
});

// 输入区快捷条：填入常用指令（不自动发送，方便用户补全）
document.querySelectorAll(".quick-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (!input || sending) return;
    input.value = chip.getAttribute("data-prompt") || "";
    input.focus();
  });
});

// ---- 会话管理 ----
const conversationSearch = document.getElementById("conversation-search");
let conversationFilter = "";
if (conversationSearch) conversationSearch.addEventListener("input", () => {
  conversationFilter = conversationSearch.value.trim().toLowerCase();
  renderConversationList();
});

// created_at/updated_at 为 UTC "YYYY-MM-DD HH:MM:SS"；复用上方 parseDbTime（返回 Date）
function dbTimeMs(value) {
  const d = parseDbTime(value);
  return d ? d.getTime() : null;
}

function relativeTime(value) {
  const t = dbTimeMs(value);
  if (t == null) return "";
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  if (min < 1440) return `${Math.floor(min / 60)} 小时前`;
  if (min < 10080) return `${Math.floor(min / 1440)} 天前`;
  return String(value).slice(0, 10);
}

function conversationGroup(value) {
  const t = dbTimeMs(value);
  if (t == null) return "更早";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (t >= startOfToday) return "今天";
  if (t >= startOfToday - 86400000) return "昨天";
  if (t >= startOfToday - 6 * 86400000) return "本周";
  return "更早";
}

function renderConversationList() {
  if (!conversationList) return;
  conversationList.innerHTML = "";
  const groups = [["今天", []], ["昨天", []], ["本周", []], ["更早", []]];
  for (const c of conversations) {
    if (conversationFilter && !`${c.title || ""} ${c.last_message || ""}`.toLowerCase().includes(conversationFilter)) continue;
    const bucket = groups.find(([name]) => name === conversationGroup(c.updated_at || c.created_at));
    bucket[1].push(c);
  }
  let rendered = 0;
  for (const [name, list] of groups) {
    if (!list.length) continue;
    const header = document.createElement("div");
    header.className = "conversation-group";
    header.textContent = name;
    conversationList.appendChild(header);
    for (const c of list) {
      rendered += 1;
      const item = document.createElement("div");
      item.className = "conversation-item" + (c.id === currentConversationId ? " active" : "");
      if (reminderConversations.has(c.id)) item.classList.add("has-reminder");
      item.dataset.id = c.id;
      // 键盘可达：会话项可聚焦、回车/空格切换，重命名有独立按钮（不再只靠双击）
      const isActive = c.id === currentConversationId;
      item.setAttribute("role", "button");
      item.tabIndex = 0;
      item.setAttribute("aria-label", `${isActive ? "当前会话" : "切换到会话"}：${c.title || "新对话"}`);
      if (isActive) item.setAttribute("aria-current", "true");
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectConversation(c.id);
        }
      });

      const avatar = document.createElement("span");
      avatar.className = "conversation-avatar";
      avatar.setAttribute("aria-hidden", "true");

      const body = document.createElement("div");
      body.className = "conversation-body";
      const titleRow = document.createElement("div");
      titleRow.className = "conversation-title-row";
      const title = document.createElement("span");
      title.className = "conversation-title";
      title.textContent = c.title || "新对话";
      title.addEventListener("dblclick", () => startRenameConversation(c.id, title));
      const time = document.createElement("span");
      time.className = "conversation-time";
      time.textContent = relativeTime(c.updated_at || c.created_at);
      titleRow.appendChild(title);
      titleRow.appendChild(time);

      const preview = document.createElement("div");
      preview.className = "conversation-preview";
      const previewText = String(c.last_message || "").replace(/\s+/g, " ").trim();
      preview.textContent = previewText || "还没有消息";
      if (reminderConversations.has(c.id)) preview.classList.add("unread");

      body.appendChild(titleRow);
      body.appendChild(preview);

      const rename = document.createElement("button");
      rename.className = "conversation-rename";
      rename.textContent = "✎";
      rename.title = "重命名会话";
      rename.setAttribute("aria-label", `重命名会话：${c.title || "新对话"}`);
      rename.addEventListener("click", (e) => {
        e.stopPropagation();
        startRenameConversation(c.id, title);
      });

      const del = document.createElement("button");
      del.className = "conversation-delete";
      del.textContent = "✕";
      del.title = "删除会话";
      del.setAttribute("aria-label", `删除会话：${c.title || "新对话"}`);
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteConversation(c.id);
      });

      item.appendChild(avatar);
      item.appendChild(body);
      item.appendChild(rename);
      item.appendChild(del);
      item.addEventListener("click", () => selectConversation(c.id));
      conversationList.appendChild(item);
    }
  }
  if (!rendered) conversationList.innerHTML = '<div class="fh-empty">' + (conversationFilter ? "没有匹配的会话" : "还没有会话") + "</div>";
}

async function createConversation() {
  try {
    const conversation = await apiRequest("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新对话" }),
    });
    if (conversation) {
      conversations.unshift(conversation);
      renderConversationList();
      return conversation;
    }
  } catch (error) {
    showAppStatus("新建会话失败：" + error.message);
  }
  return null;
}

async function deleteConversation(id) {
  try {
    await apiRequest(`/api/v1/conversations/${id}`, { method: "DELETE" });
  } catch (error) {
    showAppStatus("删除会话失败：" + error.message);
    return;
  }
  conversations = conversations.filter((c) => c.id !== id);
  if (currentConversationId === id) {
    localStorage.removeItem("currentConversationId");
    await loadConversations();
  } else {
    renderConversationList();
  }
}

async function startRenameConversation(id, titleEl) {
  const input = document.createElement("input");
  input.className = "conversation-title-edit";
  input.value = titleEl.textContent || "新对话";
  titleEl.replaceWith(input);
  input.focus();
  input.select();
  const save = async () => {
    const newName = input.value.trim() || "新对话";
    try {
      await apiRequest(`/api/v1/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newName }) });
      const conv = conversations.find((c) => c.id === id);
      if (conv) conv.title = newName;
      renderConversationList();
    } catch { /* 保持原标题 */ }
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") { renderConversationList(); }
  });
  input.addEventListener("blur", save);
}

async function selectConversation(id) {
  currentConversationId = id;
  localStorage.setItem("currentConversationId", String(id));
  if (reminderConversations.delete(id)) renderConversationList();
  await renderMessages(id);
}

const MSG_PAGE_SIZE = 30;

async function renderMessages(id) {
  messages.innerHTML = "";
  messages.dataset.lastDay = "";
  try {
    const list = await apiRequest(`/api/v1/conversations/${id}/messages?limit=${MSG_PAGE_SIZE}`);
    const items = Array.isArray(list) ? list : [];
    if (!items.length) {
      renderWelcomeState();
      return;
    }
    appendHistoryMessages(items);
    if (items.length >= MSG_PAGE_SIZE) insertLoadEarlier(id, items[0].id);
    scrollBottom();
  } catch {
    renderListError(messages, "加载历史消息失败，请刷新重试");
  }
}

function createMessageNode(m) {
  if (m.role !== "user" && m.role !== "assistant") return null;
  const meta = m.metadata && typeof m.metadata === "object" && !Array.isArray(m.metadata) ? m.metadata : null;
  const wrap = document.createElement("div");
  wrap.className = "msg " + m.role + (meta && meta.scheduled ? " scheduled" : "");
  if (m.id !== undefined) wrap.dataset.msgId = String(m.id);
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  wrap.appendChild(bubble);
  appendMsgMeta(wrap, bubble, m.role, m.created_at);
  if (m.role === "assistant") {
    bubble.dataset.raw = m.content || "";
    bubble.innerHTML = renderMarkdownToHtml(m.content || "");
  } else {
    bubble.textContent = m.content || "";
  }
  return wrap;
}

// 日期分隔：同一天的消息只插一枚「今天/昨天/M月D日」胶囊
function localDayString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabelFromLocal(day) {
  const now = new Date();
  if (day === localDayString(now)) return "今天";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === localDayString(yesterday)) return "昨天";
  const [year, month, dateNum] = day.split("-").map(Number);
  if (year === now.getFullYear()) return `${month} 月 ${dateNum} 日`;
  return day;
}

function localDayFromDbTime(value) {
  const t = parseDbTime(value);
  return t == null ? null : localDayString(new Date(t));
}

function ensureDayDivider(dbTime) {
  const day = dbTime ? localDayFromDbTime(dbTime) : localDayString();
  if (!day || messages.dataset.lastDay === day) return;
  messages.dataset.lastDay = day;
  const divider = document.createElement("div");
  divider.className = "day-divider";
  divider.textContent = dayLabelFromLocal(day);
  messages.appendChild(divider);
}

function appendHistoryMessages(items) {
  for (const m of items) {
    ensureDayDivider(m.created_at);
    const node = createMessageNode(m);
    if (node) messages.appendChild(node);
  }
}

// 更早的消息分页加载：插入顶部并保持当前滚动位置不跳。
function insertLoadEarlier(conversationId, beforeId) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "load-earlier";
  btn.textContent = "加载更早消息";
  btn.dataset.before = String(beforeId);
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "加载中…";
    try {
      const list = await apiRequest(`/api/v1/conversations/${conversationId}/messages?limit=${MSG_PAGE_SIZE}&before=${btn.dataset.before}`);
      const items = Array.isArray(list) ? list : [];
      if (items.length) {
        btn.dataset.before = String(items[0].id);
        const prevHeight = messages.scrollHeight;
        const prevTop = messages.scrollTop;
        const frag = document.createDocumentFragment();
        for (const m of items) {
          const node = createMessageNode(m);
          if (node) frag.appendChild(node);
        }
        messages.insertBefore(frag, messages.firstChild);
        messages.scrollTop = prevTop + (messages.scrollHeight - prevHeight);
      }
      if (items.length < MSG_PAGE_SIZE) btn.remove();
      else { btn.disabled = false; btn.textContent = "加载更早消息"; }
    } catch (e) {
      showAppStatus("加载更早消息失败：" + e.message);
      btn.disabled = false;
      btn.textContent = "加载更早消息";
    }
  });
  messages.insertBefore(btn, messages.firstChild);
}

function renderWelcomeState() {
  const wrap = document.createElement("div");
  wrap.className = "welcome-state";
  wrap.innerHTML =
    '<div class="pet-hero" aria-hidden="true"></div>' +
    '<h2 class="welcome-title">你好，我是膳待家</h2>' +
    '<p class="welcome-subtitle">膳食、待在家、管家——我在你家掌管吃与练：规划饮食、记录运动、分析营养，还能根据冰箱里的食材推荐菜谱。试试问我点什么？</p>' +
    '<div class="welcome-chips">' +
      '<button class="welcome-chip" data-prompt="帮我规划一周的健康食谱">📋 规划一周食谱</button>' +
      '<button class="welcome-chip" data-prompt="今天适合做什么运动？">💪 推荐今日运动</button>' +
      '<button class="welcome-chip" data-prompt="看看我的冰箱能做什么菜">🧊 冰箱食材做菜</button>' +
      '<button class="welcome-chip" data-prompt="分析一下我最近的饮食习惯">📊 饮食习惯分析</button>' +
    "</div>";
  messages.appendChild(wrap);
  // 欢迎页的大团团（不可拖拽，只播 idle 呼吸）
  const heroEl = wrap.querySelector(".pet-hero");
  if (heroEl && window.UmamiPet) window.UmamiPet.create(heroEl, { draggable: false });
  // 绑定快捷提问
  wrap.querySelectorAll(".welcome-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt") || "";
      if (prompt && input) { input.value = prompt; send(); }
    });
  });
}

async function loadConversations() {
  try {
    const res = await fetch("/api/v1/conversations");
    const data = await res.json();
    conversations = data.ok ? (data.data || []) : [];
  } catch {
    conversations = [];
  }
  renderConversationList();

  const savedId = localStorage.getItem("currentConversationId");
  const saved = savedId ? Number(savedId) : null;
  let target = conversations.find((c) => c.id === saved) || conversations[0];
  if (!target) target = await createConversation();
  if (target) await selectConversation(target.id);
  else currentConversationId = null;
}

if (newConvBtn) newConvBtn.addEventListener("click", async () => {
  const conv = await createConversation();
  if (conv) await selectConversation(conv.id);
});

// ---- 技能中心 ----
const skillsBtn = document.getElementById("skills-btn");
const skillsModal = document.getElementById("skills-modal");
const skillsClose = document.getElementById("skills-close");
const skillsList = document.getElementById("skills-list");
const skillsStatus = document.getElementById("skills-status");

let currentEnabledSkills = [];

if (skillsBtn) skillsBtn.addEventListener("click", () => { openModal(skillsModal); loadSkills(); });
if (skillsClose) skillsClose.addEventListener("click", () => closeModal(skillsModal));

async function loadSkills() {
  try {
    const res = await fetch("/api/v1/skills");
    const data = await res.json();
    if (!data.ok || !data.data) return;
    const { skills, enabled } = data.data;
    currentEnabledSkills = enabled || [];
    renderSkillsList(skills);
  } catch {
    if (skillsStatus) skillsStatus.textContent = "加载技能列表失败";
  }
}

function renderSkillsList(skills) {
  if (!skillsList) return;
  skillsList.innerHTML = "";
  for (const s of skills) {
    const card = document.createElement("div");
    card.className = "skill-card";
    const isOn = currentEnabledSkills.includes(s.id);

    const iconEl = document.createElement("div");
    iconEl.className = "skill-card-icon";
    iconEl.innerHTML = s.icon;

    const body = document.createElement("div");
    body.className = "skill-card-body";
    const nameEl = document.createElement("div");
    nameEl.className = "skill-card-name";
    nameEl.textContent = s.name;
    const descEl = document.createElement("div");
    descEl.className = "skill-card-desc";
    descEl.textContent = s.description;
    body.appendChild(nameEl);
    body.appendChild(descEl);

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "skill-toggle";
    toggle.checked = isOn;
    toggle.setAttribute("aria-label", s.name + (isOn ? "（已启用）" : "（未启用）"));
    toggle.addEventListener("change", () => saveSkillToggle(s.id, toggle.checked));

    card.appendChild(iconEl);
    card.appendChild(body);
    card.appendChild(toggle);
    skillsList.appendChild(card);
  }
}

async function saveSkillToggle(skillId, enabled) {
  try {
    const next = enabled
      ? [...currentEnabledSkills, skillId]
      : currentEnabledSkills.filter((id) => id !== skillId);
    const res = await apiRequest("/api/v1/skills/enabled", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (res && res.ok !== false) {
      currentEnabledSkills = next;
      if (skillsStatus) { skillsStatus.textContent = "已保存"; skillsStatus.className = "settings-status ok"; }
    } else {
      // 回滚 UI 状态
      loadSkills();
    }
  } catch {
    if (skillsStatus) { skillsStatus.textContent = "保存失败"; skillsStatus.className = "settings-status err"; }
  }
}

// 初始化背景装饰（v3.1 设计收敛：移除悬浮装饰层）

// ---- 厨房台面剪影场景（融入极光底部，随晨昏变灯光） ----
(function initBgScene() {
  if (document.documentElement.dataset.ambient === "off") return;
  const scene = document.querySelector(".bg-scene");
  if (!scene) return;
  scene.innerHTML = [
    '<svg viewBox="0 0 1440 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true">',
    // 吊灯：白天熄灭，晚间亮起暖光
    '<line x1="1150" y1="0" x2="1150" y2="34" stroke="var(--scene-ink)" stroke-width="3"/>',
    '<path d="M1126 34 L1174 34 L1186 62 L1114 62 Z" fill="var(--scene-ink)"/>',
    '<circle cx="1150" cy="74" r="30" fill="var(--scene-glow)"/>',
    // 汤锅
    '<g fill="var(--scene-ink)"><path d="M225 80 q15 -12 30 0 l-4 8 q-11 -8 -22 0 Z"/><rect x="170" y="86" width="140" height="18" rx="9"/><ellipse cx="240" cy="112" rx="70" ry="22"/><rect x="306" y="92" width="54" height="9" rx="4.5"/></g>',
    // 调料瓶罐
    '<g fill="var(--scene-ink)"><rect x="482" y="46" width="14" height="12" rx="4"/><rect x="476" y="56" width="26" height="62" rx="8"/><rect x="522" y="60" width="8" height="10" rx="3"/><rect x="514" y="68" width="24" height="50" rx="8"/><rect x="552" y="72" width="30" height="46" rx="9"/></g>',
    // 砧板与蔬果
    '<g fill="var(--scene-ink)"><circle cx="742" cy="78" r="15"/><path d="M782 64 a13 13 0 1 0 0.1 0 Z"/><rect x="700" y="86" width="124" height="34" rx="8"/></g>',
    // 绿植
    '<g fill="var(--scene-ink)"><path d="M1082 120 l8 -28 h32 l8 28 Z"/><path d="M1102 92 C1088 66 1066 62 1054 70 C1066 86 1086 92 1102 92 Z"/><path d="M1102 92 C1116 64 1140 60 1152 68 C1140 86 1118 92 1102 92 Z"/><path d="M1100 92 C1096 64 1104 46 1114 38 C1124 56 1118 78 1100 92 Z"/></g>',
    // 台面
    '<rect x="0" y="118" width="1440" height="42" rx="4" fill="var(--scene-ink)"/>',
    "</svg>",
  ].join("");
})();

// ---- 蒸汽与光尘粒子（纯 CSS 动画，随机相位） ----
(function initAmbientParticles() {
  const mode = document.documentElement.dataset.ambient;
  if (mode === "off" || mode === "reduced") return;
  const steam = document.querySelector(".bg-steam");
  if (steam) {
    for (let i = 0; i < 7; i++) {
      const s = document.createElement("span");
      s.className = "steam-item";
      s.style.left = 6 + Math.random() * 88 + "%";
      s.style.setProperty("--size", 16 + Math.random() * 22 + "px");
      s.style.setProperty("--dur", 10 + Math.random() * 9 + "s");
      s.style.setProperty("--delay", -Math.random() * 16 + "s");
      s.style.setProperty("--drift", Math.round(Math.random() * 60 - 30) + "px");
      steam.appendChild(s);
    }
  }
  const dust = document.querySelector(".bg-dust");
  if (dust) {
    for (let i = 0; i < 14; i++) {
      const d = document.createElement("span");
      d.className = "dust-item";
      d.style.left = Math.random() * 100 + "%";
      d.style.top = 30 + Math.random() * 68 + "%";
      d.style.setProperty("--size", 2 + Math.random() * 2.5 + "px");
      d.style.setProperty("--dur", 14 + Math.random() * 14 + "s");
      d.style.setProperty("--delay", -Math.random() * 22 + "s");
      d.style.setProperty("--drift", Math.round(Math.random() * 50 - 25) + "px");
      d.style.setProperty("--peak", 0.18 + Math.random() * 0.25);
      dust.appendChild(d);
    }
  }
})();

loadConversations();
bindFridgeTempControls();
bindFridgeAIButton();

// ---- 工作台（自由画布卡片） ----
const board = document.getElementById("board");
const boardCanvas = document.getElementById("board-canvas");
const sidebarEl = document.querySelector(".sidebar");
const footerEl = document.getElementById("footer");
const fridgeView = document.getElementById("fridge");
const fitnessView = document.getElementById("fitness");
const dietView = document.getElementById("diet");
const profileView = document.getElementById("profile");
let boardInner = null;

const BOARD_POS_KEY = "health_board_positions_v1";
const BOARD_HIDDEN_KEY = "health_board_hidden_v1";
const restoreBoardBtn = document.getElementById("restore-board-btn");

const ICONS = {
  leaf: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/></svg>',
  target: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>',
  bowl: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M12 3v3"/><path d="M9 6l3-3 3 3"/></svg>',
  snow: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M4.5 7l15 10M19.5 7l-15 10"/><path d="M12 6l-2.5-2.5M12 6l2.5-2.5M12 18l-2.5 2.5M12 18l2.5 2.5M5.5 9.5l-3.5.5M5.5 9.5l-.5-3.5M18.5 9.5l3.5.5M18.5 9.5l.5-3.5M5.5 14.5l-3.5-.5M5.5 14.5l-.5 3.5M18.5 14.5l3.5-.5M18.5 14.5l.5 3.5"/></svg>',
};

const CARD_TYPES = [
  { key: "ingredients", label: "食材", icon: ICONS.leaf, endpoint: "/api/v1/ingredients", fields: (i) => ({ title: i.name, sub: [i.quantity, i.category].filter(Boolean).join(" / ") }) },
  { key: "workouts", label: "健身", icon: ICONS.dumbbell, endpoint: "/api/v1/workouts", fields: (w) => ({ title: w.activity_type, sub: [(w.duration_min ? w.duration_min + " 分钟" : ""), w.date].filter(Boolean).join(" / ") }) },
  { key: "goals", label: "目标", icon: ICONS.target, endpoint: "/api/v1/goals", fields: (g) => ({ title: g.name, sub: [(g.target ? g.target + (g.unit || "") : ""), g.status].filter(Boolean).join(" / ") }) },
  { key: "habits", label: "习惯", icon: ICONS.heart, endpoint: "/api/v1/habits", fields: (h) => ({ title: h.habit, sub: [h.value, h.date].filter(Boolean).join(" / ") }) },
];

function loadBoardPositions() {
  try { return JSON.parse(localStorage.getItem(BOARD_POS_KEY)) || {}; } catch { return {}; }
}

function saveBoardPosition(key, x, y) {
  const pos = loadBoardPositions();
  pos[key] = { x, y };
  localStorage.setItem(BOARD_POS_KEY, JSON.stringify(pos));
}

function loadHiddenBoardCards() {
  try { return new Set(JSON.parse(localStorage.getItem(BOARD_HIDDEN_KEY)) || []); } catch { return new Set(); }
}

function saveHiddenBoardCards(cards) {
  localStorage.setItem(BOARD_HIDDEN_KEY, JSON.stringify([...cards]));
  restoreBoardBtn.classList.toggle("hidden", cards.size === 0);
}

// v3.1：未拖拽过的卡片不再按固定列坐标摆放（窄屏会溢出/叠压），
// 改为按画布宽度分列的瀑布流：每次放到当前最矮的一列。
// 用户拖拽过的卡片仍保留 localStorage 里的自由位置。
function createBoardFlow() {
  const CELL_W = 300, PAD = 40, GAP_Y = 24, TOP = 40;
  let colHeights = [];
  const cols = () => Math.max(1, Math.floor(((boardCanvas.clientWidth || 1200) - PAD) / CELL_W));
  return {
    place(card) {
      const n = cols();
      if (colHeights.length !== n) colHeights = new Array(n).fill(TOP);
      let c = 0;
      for (let i = 1; i < n; i++) if (colHeights[i] < colHeights[c]) c = i;
      card.style.left = (PAD + c * CELL_W) + "px";
      card.style.top = colHeights[c] + "px";
      colHeights[c] += card.offsetHeight + GAP_Y;
    },
  };
}

function makeDraggable(cardEl, key) {
  cardEl.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest(".board-card-del, .board-card-action")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origLeft = cardEl.offsetLeft;
    const origTop = cardEl.offsetTop;
    cardEl.classList.add("dragging");
    cardEl.setPointerCapture(e.pointerId);

    const onMove = (ev) => {
      cardEl.style.left = (origLeft + ev.clientX - startX) + "px";
      cardEl.style.top = (origTop + ev.clientY - startY) + "px";
    };
    const onUp = () => {
      cardEl.classList.remove("dragging");
      const host = boardInner || boardCanvas;
      const maxX = Math.max(0, host.clientWidth - cardEl.offsetWidth);
      const maxY = Math.max(0, host.clientHeight - cardEl.offsetHeight);
      const x = Math.round(Math.max(0, Math.min(cardEl.offsetLeft, maxX)));
      const y = Math.round(Math.max(0, Math.min(cardEl.offsetTop, maxY)));
      cardEl.style.left = x + "px";
      cardEl.style.top = y + "px";
      saveBoardPosition(key, x, y);
      cardEl.removeEventListener("pointermove", onMove);
      cardEl.removeEventListener("pointerup", onUp);
      cardEl.removeEventListener("pointercancel", onUp);
    };
    cardEl.addEventListener("pointermove", onMove);
    cardEl.addEventListener("pointerup", onUp);
    cardEl.addEventListener("pointercancel", onUp);
  });
}

function buildCard(type, item, key, pos) {
  const { title, sub } = type.fields(item);
  const el = document.createElement("div");
  el.className = "board-card card-" + type.key;
  el.style.left = pos.x + "px";
  el.style.top = pos.y + "px";

  const head = document.createElement("div");
  head.className = "board-card-head";

  const icon = document.createElement("span");
  icon.className = "board-card-icon";
  icon.innerHTML = type.icon;

  const badge = document.createElement("span");
  badge.className = "board-card-badge";
  badge.textContent = type.label;

  const del = document.createElement("button");
  del.className = "board-card-del";
  del.title = "从面板移除（不会删除记录）";
  del.setAttribute("aria-label", `从面板移除${type.label}卡片：${title || "未命名"}`);
  del.innerHTML = ICONS.x;
  del.addEventListener("click", (e) => {
    e.stopPropagation();
    hideBoardCard(key, el);
  });

  head.appendChild(icon);
  head.appendChild(badge);
  head.appendChild(del);

  const titleEl = document.createElement("div");
  titleEl.className = "board-card-title";
  titleEl.textContent = title || "未命名";

  el.appendChild(head);
  el.appendChild(titleEl);

  if (sub) {
    const subEl = document.createElement("div");
    subEl.className = "board-card-sub";
    subEl.textContent = sub;
    el.appendChild(subEl);
  }

  if (type.key === "goals" || type.key === "habits") {
    const act = document.createElement("button");
    act.type = "button";
    act.className = "board-card-action";
    act.textContent = type.key === "goals" ? "管理目标 →" : "管理习惯 →";
    act.addEventListener("click", (e) => {
      e.stopPropagation();
      if (type.key === "goals") openGoalsModal();
      else openHabitsModal();
    });
    el.appendChild(act);
  }

  makeDraggable(el, key);
  return el;
}

function hideBoardCard(key, el) {
  el.classList.add("removing");
  const hidden = loadHiddenBoardCards();
  hidden.add(key);
  saveHiddenBoardCards(hidden);
  const pos = loadBoardPositions();
  delete pos[key];
  localStorage.setItem(BOARD_POS_KEY, JSON.stringify(pos));
  setTimeout(() => { el.remove(); layoutBoardInner(); }, 220);
}

// 卡片直接挂在 #board-canvas（position:relative）下即可正常拖拽。
// 不再额外套一层可滚动容器：那种 position:absolute + overflow:auto 的包裹层
// 会拦截卡片的指针/拖拽手势，导致“点不动/拖不动”，所以这里直接复用 boardCanvas。
function ensureBoardInner() {
  boardInner = null;
  return boardCanvas;
}

function layoutBoardInner() {
  if (!boardInner) return;
  let maxX = boardCanvas.clientWidth || 1000;
  let maxY = boardCanvas.clientHeight || 800;
  boardInner.querySelectorAll(".board-card").forEach((c) => {
    maxX = Math.max(maxX, c.offsetLeft + c.offsetWidth + 40);
    maxY = Math.max(maxY, c.offsetTop + c.offsetHeight + 40);
  });
  boardInner.style.minWidth = maxX + "px";
  boardInner.style.minHeight = maxY + "px";
}

function makeCardShell(key, extraClass, pos) {
  const el = document.createElement("div");
  el.className = "board-card " + (extraClass || "");
  el.style.left = pos.x + "px";
  el.style.top = pos.y + "px";
  const head = document.createElement("div");
  head.className = "board-card-head";
  const icon = document.createElement("span");
  icon.className = "board-card-icon";
  const badge = document.createElement("span");
  badge.className = "board-card-badge";
  const del = document.createElement("button");
  del.className = "board-card-del";
  del.title = "从面板移除（不会删除记录）";
  del.setAttribute("aria-label", "从面板移除卡片");
  del.innerHTML = ICONS.x;
  del.addEventListener("click", (e) => { e.stopPropagation(); hideBoardCard(key, el); });
  head.appendChild(icon);
  head.appendChild(badge);
  head.appendChild(del);
  el.appendChild(head);
  makeDraggable(el, key);
  return { el, head, icon, badge };
}

async function buildRecipeCard(pos) {
  const key = "recipe:board";
  const shell = makeCardShell(key, "card-recipe", pos);
  shell.icon.innerHTML = ICONS.bowl;
  shell.badge.textContent = "菜谱历史";
  const titleEl = document.createElement("div");
  titleEl.className = "board-card-title";
  shell.el.appendChild(titleEl);
  try {
    const res = await fetch("/api/v1/recipe-history");
    const data = await res.json();
    const list = data.ok ? (data.data || []) : [];
    if (!list.length) {
      titleEl.textContent = "暂无保存的菜谱";
      const hint = document.createElement("div");
      hint.className = "board-card-snippet";
      hint.textContent = "让 AI 推荐菜谱后，会自动保存到此处。";
      shell.el.appendChild(hint);
    } else {
      titleEl.textContent = `已保存 ${list.length} 份菜谱`;
      const snippet = document.createElement("div");
      snippet.className = "board-card-snippet";
      snippet.textContent = list.slice(0, 3).map((r) => `${String(r.created_at || "").slice(0, 10)}  ${r.title}`).join("\n");
      shell.el.appendChild(snippet);
    }
  } catch {
    titleEl.textContent = "读取历史失败";
  }
  const act = document.createElement("button");
  act.type = "button";
  act.className = "board-card-action";
  act.textContent = "查看全部 →";
  act.addEventListener("click", (e) => { e.stopPropagation(); openFavoritesModal("history"); });
  shell.el.appendChild(act);
  return shell.el;
}

async function buildFavoritesCard(pos) {
  const key = "favorites:board";
  const shell = makeCardShell(key, "card-fav", pos);
  shell.icon.innerHTML = ICONS.heart;
  shell.badge.textContent = "我的收藏";
  const titleEl = document.createElement("div");
  titleEl.className = "board-card-title";
  shell.el.appendChild(titleEl);
  try {
    const res = await fetch("/api/v1/favorites");
    const data = await res.json();
    const list = data.ok ? (data.data || []) : [];
    titleEl.textContent = list.length ? `已收藏 ${list.length} 个菜谱` : "还没有收藏";
    const snippet = document.createElement("div");
    snippet.className = "board-card-snippet";
    snippet.textContent = list.length ? list.slice(0, 3).map((f) => f.recipe_name).join("\n") : "在对话里让 AI 推荐菜谱后，对它说「收藏这个」即可。";
    shell.el.appendChild(snippet);
  } catch {
    titleEl.textContent = "读取收藏失败";
  }
  const act = document.createElement("button");
  act.type = "button";
  act.className = "board-card-action";
  act.textContent = "查看收藏 →";
  act.addEventListener("click", (e) => { e.stopPropagation(); openFavoritesModal("favorites"); });
  shell.el.appendChild(act);
  return shell.el;
}

async function buildFridgeCard(pos) {
  const key = "fridge:board";
  const shell = makeCardShell(key, "card-fridge", pos);
  shell.icon.innerHTML = ICONS.snow;
  shell.badge.textContent = "冰箱状态";
  const titleEl = document.createElement("div");
  titleEl.className = "board-card-title";
  shell.el.appendChild(titleEl);
  try {
    const sres = await fetch("/api/v1/fridge-settings");
    const sd = await sres.json();
    const settings = sd.ok && sd.data ? sd.data : { freezerTemp: -18, fridgeTemp: 4 };
    const ires = await fetch("/api/v1/ingredients");
    const idata = await ires.json();
    const items = idata.ok ? (idata.data || []) : [];
    let near = 0, expired = 0;
    for (const it of items) {
      const zone = it.zone || "fridge";
      const daysIn = daysSince(it.added_at);
      const life = shelfLifeDays(it.category, zone, settings.fridgeTemp, settings.freezerTemp);
      const st = freshnessStatus(daysIn, life);
      if (st === "near") near++;
      else if (st === "expired") expired++;
    }
    titleEl.textContent = `共 ${items.length} 样 · 临期 ${near} · 过期 ${expired}`;
    const snippet = document.createElement("div");
    snippet.className = "board-card-snippet";
    snippet.textContent = expired ? "有食材已过期，建议尽快处理。" : near ? "有食材临近保鲜期，优先食用。" : "冰箱状态良好。";
    shell.el.appendChild(snippet);
    const act = document.createElement("button");
    act.type = "button";
    act.className = "board-card-action";
    act.textContent = "查看冰箱 →";
    act.addEventListener("click", (e) => { e.stopPropagation(); showView("fridge"); });
    shell.el.appendChild(act);
  } catch {
    titleEl.textContent = "读取冰箱失败";
  }
  return shell.el;
}

async function buildDietCard(pos) {
  const key = "diet:board";
  const shell = makeCardShell(key, "card-diet", pos);
  shell.icon.innerHTML = ICONS.bowl;
  shell.badge.textContent = "今日饮食";
  const titleEl = document.createElement("div");
  titleEl.className = "board-card-title";
  shell.el.appendChild(titleEl);
  try {
    const res = await fetch("/api/v1/diet-logs");
    const data = await res.json();
    const list = data.ok ? (data.data || []) : [];
    const today = todayISO();
    const todayItems = list.filter((d) => d.date === today);
    if (!todayItems.length) {
      titleEl.textContent = "今日暂无记录";
      const hint = document.createElement("div");
      hint.className = "board-card-snippet";
      hint.textContent = "去「饮食」页记一笔，或告诉 AI「我中午吃了番茄炒蛋」。";
      shell.el.appendChild(hint);
    } else {
      titleEl.textContent = `今日 ${todayItems.length} 餐`;
      const snippet = document.createElement("div");
      snippet.className = "board-card-snippet";
      snippet.textContent = todayItems.map((d) => `${d.meal_type}：${Array.isArray(d.foods) ? d.foods.map((f) => f.name).filter(Boolean).join("、") : "无"}`).join("\n");
      shell.el.appendChild(snippet);
    }
    const act = document.createElement("button");
    act.type = "button";
    act.className = "board-card-action";
    act.textContent = "记一笔 →";
    act.addEventListener("click", (e) => { e.stopPropagation(); showView("diet"); });
    shell.el.appendChild(act);
  } catch {
    titleEl.textContent = "读取饮食失败";
  }
  return shell.el;
}

async function renderBoard() {
  const positions = loadBoardPositions();
  const hidden = loadHiddenBoardCards();
  restoreBoardBtn.classList.toggle("hidden", hidden.size === 0);
  const inner = ensureBoardInner();
  inner.innerHTML = "";
  const flow = createBoardFlow();
  // 有已保存位置（用户拖过）的卡片用原坐标，否则交给瀑布流自动排布
  const place = (card, key, fallbackPos) => {
    inner.appendChild(card);
    const saved = positions[key];
    if (saved) {
      card.style.left = saved.x + "px";
      card.style.top = saved.y + "px";
    } else {
      flow.place(card);
    }
  };
  let order = 0;

  if (!hidden.has("recipe:board")) {
    const card = await buildRecipeCard({ x: 0, y: 0 });
    card.style.animationDelay = (order * 35) + "ms";
    place(card, "recipe:board");
    order++;
  }
  if (!hidden.has("favorites:board")) {
    const card = await buildFavoritesCard({ x: 0, y: 0 });
    card.style.animationDelay = (order * 35) + "ms";
    place(card, "favorites:board");
    order++;
  }
  if (!hidden.has("fridge:board")) {
    const card = await buildFridgeCard({ x: 0, y: 0 });
    card.style.animationDelay = (order * 35) + "ms";
    place(card, "fridge:board");
    order++;
  }
  if (!hidden.has("diet:board")) {
    const card = await buildDietCard({ x: 0, y: 0 });
    card.style.animationDelay = (order * 35) + "ms";
    place(card, "diet:board");
    order++;
  }

  for (const type of CARD_TYPES) {
    let items = [];
    try {
      const res = await fetch(type.endpoint);
      const data = await res.json();
      items = data.ok ? (data.data || []) : [];
    } catch { /* 忽略 */ }
    items.forEach((item, index) => {
      const key = type.key + ":" + item.id;
      if (hidden.has(key)) return;
      const card = buildCard(type, item, key, { x: 0, y: 0 });
      card.style.animationDelay = (order * 35) + "ms";
      place(card, key);
      order++;
    });
  }
  layoutBoardInner();
  if (inner.children.length === 0) {
    const hint = document.createElement("div");
    hint.className = "board-empty";
    hint.textContent = "还没有卡片。点右上角「添加」，或去「对话」里记录，它们会出现在这里，然后拖拽整理。";
    inner.appendChild(hint);
  }
}

restoreBoardBtn.addEventListener("click", () => {
  saveHiddenBoardCards(new Set());
  renderBoard();
});

function showView(view) {
  const isChat = view === "chat";
  document.body.dataset.view = view;
  sidebarEl.classList.toggle("hidden", !isChat);
  messages.classList.toggle("hidden", !isChat);
  footerEl.classList.toggle("hidden", !isChat);
  board.classList.toggle("hidden", view !== "board");
  fridgeView.classList.toggle("hidden", view !== "fridge");
  fitnessView.classList.toggle("hidden", view !== "fitness");
  dietView.classList.toggle("hidden", view !== "diet");
  profileView.classList.toggle("hidden", view !== "profile");
  document.querySelectorAll(".nav-btn").forEach((b) => {
    const active = b.dataset.view === view;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
    b.tabIndex = active ? 0 : -1;
  });
  if (view === "fridge") loadFridgePage();
  if (view === "board") renderBoard();
  if (view === "fitness") loadFitness();
  if (view === "diet") loadDiet();
  if (view === "profile") loadProfile();
  const shown = view === "chat" ? messages
    : view === "board" ? board
    : { fridge: fridgeView, fitness: fitnessView, diet: dietView, profile: profileView }[view];
  if (shown && !shown.classList.contains("hidden")) {
    shown.style.animation = "none";
    void shown.offsetWidth;
    shown.style.animation = "viewIn 0.34s var(--ease) both";
  }
}

const navButtons = [...document.querySelectorAll(".nav-btn")];
navButtons.forEach((b, index) => {
  b.addEventListener("click", () => showView(b.dataset.view));
  b.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? navButtons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + navButtons.length) % navButtons.length;
    navButtons[nextIndex].focus();
    showView(navButtons[nextIndex].dataset.view);
  });
});

// ---- 冰箱 / 食材大全 ----
const foodSearch = document.getElementById("food-search");
const foodCategories = document.getElementById("food-categories");
const foodGrid = document.getElementById("food-grid");
const fridgeList = document.getElementById("fridge-list");
const fridgeCount = document.getElementById("fridge-count");

let selectedCategory = "";

async function loadFoodCategories() {
  try {
    const res = await fetch("/api/v1/food-categories");
    const data = await res.json();
    const cats = data.ok ? (data.data || []) : [];
    foodCategories.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.className = "food-cat" + (selectedCategory === "" ? " active" : "");
    const allImg = document.createElement("img");
    allImg.className = "food-cat-img";
    allImg.src = "food-images/all.png";
    allImg.alt = "";
    allBtn.appendChild(allImg);
    allBtn.appendChild(document.createTextNode("全部"));
    allBtn.addEventListener("click", () => { selectedCategory = ""; loadFoodCategories(); searchFoods(); });
    foodCategories.appendChild(allBtn);
    for (const c of cats) {
      const btn = document.createElement("button");
      btn.className = "food-cat" + (selectedCategory === c ? " active" : "");
      const img = document.createElement("img");
      img.className = "food-cat-img";
      img.src = foodImage(c);
      img.alt = "";
      btn.appendChild(img);
      btn.appendChild(document.createTextNode(c));
      btn.addEventListener("click", () => { selectedCategory = c; loadFoodCategories(); searchFoods(); });
      foodCategories.appendChild(btn);
    }
  } catch {}
}

async function searchFoods() {
  try {
    const params = new URLSearchParams();
    const q = foodSearch.value.trim();
    if (q) params.set("q", q);
    if (selectedCategory) params.set("category", selectedCategory);
    const res = await fetch("/api/v1/foods?" + params.toString());
    const data = await res.json();
    renderFoodGrid(data.ok ? (data.data || []) : []);
  } catch { foodGrid.innerHTML = '<div class="food-empty">加载失败，请刷新重试</div>'; }
}

let currentFoods = [];

function renderFoodGrid(foods) {
  currentFoods = foods;
  foodGrid.innerHTML = "";
  if (!foods.length) {
    foodGrid.innerHTML = '<div class="food-empty">没有找到相关食材</div>';
    return;
  }
  for (const f of foods) {
    const item = document.createElement("button");
    item.className = "food-item";
    item.type = "button";
    item.title = "点击加入冰箱，或直接拖入右侧冰箱分区";
    item.draggable = true;
    item.dataset.foodName = f.name;

    const thumb = document.createElement("img");
    thumb.className = "food-thumb";
    thumb.src = foodImage(f.name, true);
    thumb.alt = f.category;
    thumb.loading = "lazy";
    thumb.draggable = false;
    thumb.addEventListener("error", () => { thumb.src = "food-images/other.png"; });
    item.appendChild(thumb);

    const name = document.createElement("span");
    name.className = "food-name";
    name.textContent = f.name;
    item.appendChild(name);

    const cat = document.createElement("span");
    cat.className = "food-cat-tag";
    cat.textContent = f.category;
    item.appendChild(cat);

    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", f.name);
      e.dataTransfer.effectAllowed = "copy";
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => item.classList.remove("dragging"));
    item.addEventListener("click", () => openFoodModal(f));
    foodGrid.appendChild(item);
  }
}

function bindFridgeDropZones() {
  const zones = document.querySelectorAll(".fridge-zone");
  for (const zone of zones) {
    if (zone.dataset.dropBound === "1") continue;
    zone.dataset.dropBound = "1";
    const zoneName = zone.dataset.zone === "freezer" ? "冷冻层" : "冷藏层";
    zone.addEventListener("dragover", (e) => {
      if (![...e.dataTransfer.types].includes("text/plain")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", (e) => {
      if (zone.contains(e.relatedTarget)) return;
      zone.classList.remove("drag-over");
    });
    zone.addEventListener("drop", async (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const name = e.dataTransfer.getData("text/plain");
      const food = currentFoods.find((x) => x.name === name);
      if (!food) return;
      await addToFridge(food, "", zone.dataset.zone);
    });
  }
}
bindFridgeDropZones();

async function addToFridge(food, quantity, zone) {
  try {
    await apiRequest("/api/v1/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: food.name, category: food.category, quantity: quantity || undefined, zone: zone || undefined }),
    });
    await refreshFridgeItems();
    const zoneLabel = zone === "freezer" ? "冷冻层" : "冷藏层";
    showAppStatus(`已将“${food.name}”加入${zoneLabel}`, true);
  } catch (error) { showAppStatus("加入冰箱失败：" + error.message); }
}

// ---- 加入冰箱：数量 / 单位 ----
const foodModal = document.getElementById("food-modal");
const foodModalClose = document.getElementById("food-modal-close");
const foodModalTitle = document.getElementById("food-modal-title");
const foodQty = document.getElementById("food-qty");
const foodUnit = document.getElementById("food-unit");
const foodAddBtn = document.getElementById("food-add-btn");
let pendingFood = null;

const FOOD_UNITS = ["份", "个", "袋", "kg", "斤", "盒", "瓶", "把", "颗", "根", "块", "条", "片", "朵", "只", "串", "罐", "毫升", "克"];

function populateFoodUnits(unit) {
  foodUnit.innerHTML = "";
  for (const u of FOOD_UNITS) {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    foodUnit.appendChild(opt);
  }
  foodUnit.value = unit || "份";
}

function defaultZoneForCategory(category) {
  return ["肉类", "水产"].includes(category) ? "freezer" : "fridge";
}

function setModalZone(zone) {
  const row = document.getElementById("food-zone-row");
  if (!row) return;
  for (const btn of row.querySelectorAll(".zone-btn")) {
    btn.classList.toggle("active", btn.dataset.zone === zone);
  }
}

function getModalZone() {
  const active = document.querySelector("#food-zone-row .zone-btn.active");
  return active ? active.dataset.zone : "fridge";
}

function openFoodModal(food) {
  pendingFood = food;
  foodModalTitle.textContent = "加入冰箱：" + food.name;
  foodQty.value = "";
  populateFoodUnits(food.unit);
  setModalZone(defaultZoneForCategory(food.category));
  openModal(foodModal, foodQty);
}

foodModalClose.addEventListener("click", () => closeModal(foodModal));
const foodZoneRow = document.getElementById("food-zone-row");
if (foodZoneRow) {
  for (const btn of foodZoneRow.querySelectorAll(".zone-btn")) {
    btn.addEventListener("click", () => setModalZone(btn.dataset.zone));
  }
}
foodAddBtn.addEventListener("click", async () => {
  if (!pendingFood) return;
  const qty = foodQty.value.trim();
  const quantity = qty ? qty + foodUnit.value : "";
  await addToFridge(pendingFood, quantity, getModalZone());
  closeModal(foodModal);
});

let fridgeItemsCache = [];
let zoneModalZone = "fridge";
let allFoodsCache = null;

async function ensureAllFoods() {
  if (Array.isArray(allFoodsCache) && allFoodsCache.length) return allFoodsCache;
  const j = await apiRequest("/api/v1/foods");
  allFoodsCache = j.data || j || [];
  return allFoodsCache;
}

async function refreshFridgeItems() {
  try {
    const items = await apiRequest("/api/v1/ingredients");
    fridgeItemsCache = items || [];
    fridgeCount.textContent = items.length ? "(" + items.length + ")" : "";
    renderFridgeList(items);
    updateFridgeAlert(fridgeItemsCache);
    const zm = document.getElementById("zone-modal");
    if (zm && !zm.classList.contains("hidden")) {
      renderZoneModal();
    }
  } catch (error) { showAppStatus("读取冰箱失败：" + error.message); }
}

// 临期/过期汇总横幅 + 冰箱导航红点，随每次冰箱数据刷新更新。
function updateFridgeAlert(items) {
  let near = 0, expired = 0;
  for (const it of items) {
    const zone = it.zone || "fridge";
    const status = freshnessStatus(daysSince(it.added_at), shelfLifeDays(it.category, zone, fridgeSettings.fridgeTemp, fridgeSettings.freezerTemp));
    if (status === "near") near++;
    else if (status === "expired") expired++;
  }
  const alert = document.getElementById("fridge-alert");
  if (alert) {
    if (expired || near) {
      alert.textContent = expired
        ? `⚠️ 有 ${expired} 样食材已过期${near ? `、${near} 样临近保鲜期` : ""}，建议尽快处理。`
        : `⏳ 有 ${near} 样食材临近保鲜期，优先食用。`;
      alert.classList.remove("hidden");
    } else {
      alert.classList.add("hidden");
    }
  }
  const tab = document.getElementById("tab-fridge");
  if (tab) tab.classList.toggle("has-alert", expired > 0 || near > 0);
}

let fridgeSettings = { freezerTemp: -18, fridgeTemp: 4 };

function updateFridgeTempLabels() {
  const fl = document.getElementById("freezer-temp-label");
  const rl = document.getElementById("fridge-temp-label");
  if (fl) fl.textContent = `目标 ${fridgeSettings.freezerTemp}°C`;
  if (rl) rl.textContent = `目标 ${fridgeSettings.fridgeTemp}°C`;
}

async function loadFridgeSettingsUI() {
  try {
    const res = await fetch("/api/v1/fridge-settings");
    const data = await res.json();
    if (data.ok && data.data) fridgeSettings = data.data;
  } catch { /* 使用默认温度 */ }
  const ft = document.getElementById("freezer-temp");
  const rt = document.getElementById("fridge-temp");
  if (ft) ft.value = fridgeSettings.freezerTemp;
  if (rt) rt.value = fridgeSettings.fridgeTemp;
  updateFridgeTempLabels();
}

function bindFridgeTempControls() {
  const ft = document.getElementById("freezer-temp");
  const rt = document.getElementById("fridge-temp");
  const save = debounce(async () => {
    const freezerTemp = Number(ft && ft.value);
    const fridgeTemp = Number(rt && rt.value);
    if (!Number.isFinite(freezerTemp) || !Number.isFinite(fridgeTemp)) return;
    try {
      const res = await fetch("/api/v1/fridge-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freezerTemp, fridgeTemp }),
      });
      const data = await res.json();
      if (data.ok && data.data) { fridgeSettings = data.data; updateFridgeTempLabels(); refreshFridgeItems(); }
    } catch { /* 忽略保存失败 */ }
  }, 400);
  if (ft) ft.addEventListener("change", save);
  if (rt) rt.addEventListener("change", save);
}

function bindFridgeAIButton() {
  const btn = document.getElementById("fridge-ai-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const resultEl = document.getElementById("fridge-ai-result");
    btn.disabled = true;
    if (resultEl) { resultEl.classList.remove("hidden"); resultEl.textContent = "AI 正在生成保鲜建议…"; }
    try {
      const data = await apiRequest("/api/v1/fridge/ai-check", { method: "POST" });
      if (resultEl) {
        resultEl.textContent = data && data.text ? data.text : "暂无结果";
        resultEl.classList.remove("hidden");
      }
    } catch (e) {
      if (resultEl) {
        resultEl.textContent = "保鲜建议生成失败：" + (e && e.message ? e.message : "未知错误");
        resultEl.classList.remove("hidden");
      }
    } finally {
      btn.disabled = false;
    }
  });
}

function renderFridgeItem(it, container) {
  if (!container) return;
  const zone = it.zone || "fridge";
  const daysIn = daysSince(it.added_at);
  const life = shelfLifeDays(it.category, zone, fridgeSettings.fridgeTemp, fridgeSettings.freezerTemp);
  const status = freshnessStatus(daysIn, life);

  const item = document.createElement("div");
  item.className = "fridge-item" + (status === "expired" ? " is-expired" : "");
  item.title = "查看详情";

  const main = document.createElement("div");
  main.className = "fridge-item-main";
  const name = document.createElement("span");
  name.className = "fridge-item-name";
  name.textContent = it.name + (it.quantity ? " " + it.quantity : "");
  const meta = document.createElement("span");
  meta.className = "fridge-item-meta";
  meta.textContent = `已存放 ${daysIn} 天 · 建议 ${life} 天内` + ((it.note || "").trim() ? " · 📝" : "");
  main.appendChild(name);
  main.appendChild(meta);
  item.appendChild(main);

  const badge = document.createElement("span");
  badge.className = "fridge-badge " + status;
  badge.textContent = status === "fresh" ? "新鲜" : status === "near" ? "临期" : "过期";
  item.appendChild(badge);

  item.addEventListener("click", () => openIngredientModal(it.id));

  const del = document.createElement("button");
  del.className = "fridge-item-del";
  del.textContent = "✕";
  del.title = "移出冰箱";
  del.setAttribute("aria-label", `将${it.name}移出冰箱`);
  del.addEventListener("click", (e) => { e.stopPropagation(); removeFromFridge(it.id); });
  item.appendChild(del);

  container.appendChild(item);
}

function renderFridgeList(items) {
  const freezerEl = document.getElementById("fridge-freezer-items");
  const fridgeEl = document.getElementById("fridge-items");
  if (freezerEl) freezerEl.innerHTML = "";
  if (fridgeEl) fridgeEl.innerHTML = "";
  if (!items || !items.length) {
    if (fridgeEl) fridgeEl.innerHTML = '<div class="fridge-empty">冰箱还是空的，去左侧选食材吧</div>';
    return;
  }
  const freezer = items.filter((i) => (i.zone || "fridge") === "freezer");
  const fridge = items.filter((i) => (i.zone || "fridge") === "fridge");
  if (freezerEl) {
    if (!freezer.length) freezerEl.innerHTML = '<div class="fridge-empty">冷冻层暂无食材</div>';
    for (const it of freezer) renderFridgeItem(it, freezerEl);
  }
  if (fridgeEl) {
    if (!fridge.length) fridgeEl.innerHTML = '<div class="fridge-empty">冷藏层暂无食材</div>';
    for (const it of fridge) renderFridgeItem(it, fridgeEl);
  }
}

async function removeFromFridge(id) {
  try {
    await apiRequest("/api/v1/ingredients/" + id, { method: "DELETE" });
    await refreshFridgeItems();
  } catch (error) { showAppStatus("移出冰箱失败：" + error.message); }
}

// ---- 分区管理弹窗：查看 / 添加 / 操作某一层的食材 ----
const zoneModal = document.getElementById("zone-modal");
const zoneModalTitle = document.getElementById("zone-modal-title");
const zoneModalSub = document.getElementById("zone-modal-sub");
const zoneModalItems = document.getElementById("zone-modal-items");
const zoneModalFoods = document.getElementById("zone-modal-foods");
const zoneFoodSearch = document.getElementById("zone-food-search");

function zoneLabel(zone) { return zone === "freezer" ? "冷冻层" : "冷藏层"; }

function openZoneModal(zone) {
  zoneModalZone = zone === "freezer" ? "freezer" : "fridge";
  zoneModalTitle.textContent = zoneLabel(zoneModalZone) + " · 管理";
  zoneModalSub.textContent = `点击下方食材加入${zoneLabel(zoneModalZone)}；对已有食材可查看详情、移动或移出。`;
  zoneFoodSearch.value = "";
  renderZoneModal();
  renderZoneFoodOptionsAsync("");
  openModal(zoneModal, zoneFoodSearch);
}

async function renderZoneFoodOptionsAsync(query) {
  try {
    await ensureAllFoods();
  } catch { /* 忽略，下方用缓存渲染 */ }
  renderZoneFoodOptions(query);
}

function renderZoneModal() {
  const items = fridgeItemsCache.filter((i) => (i.zone || "fridge") === zoneModalZone);
  zoneModalItems.innerHTML = "";
  if (!items.length) {
    zoneModalItems.innerHTML = `<div class="fridge-empty">${zoneLabel(zoneModalZone)}还是空的，从下方添加吧</div>`;
    return;
  }
  for (const it of items) {
    const daysIn = daysSince(it.added_at);
    const life = shelfLifeDays(it.category, zoneModalZone, fridgeSettings.fridgeTemp, fridgeSettings.freezerTemp);
    const status = freshnessStatus(daysIn, life);
    const row = document.createElement("div");
    row.className = "fridge-item";
    row.title = "查看详情";
    const main = document.createElement("div");
    main.className = "fridge-item-main";
    const name = document.createElement("span");
    name.className = "fridge-item-name";
    name.textContent = it.name + (it.quantity ? " " + it.quantity : "");
    const meta = document.createElement("span");
    meta.className = "fridge-item-meta";
    meta.textContent = `已存放 ${daysIn} 天 · 建议 ${life} 天内` + ((it.note || "").trim() ? " · 📝" : "");
    main.appendChild(name);
    main.appendChild(meta);
    row.appendChild(main);
    const badge = document.createElement("span");
    badge.className = "fridge-badge " + status;
    badge.textContent = status === "fresh" ? "新鲜" : status === "near" ? "临期" : "过期";
    row.appendChild(badge);
    const del = document.createElement("button");
    del.className = "fridge-item-del";
    del.textContent = "✕";
    del.title = "移出冰箱";
    del.addEventListener("click", (e) => { e.stopPropagation(); removeFromFridge(it.id); });
    row.appendChild(del);
    row.addEventListener("click", () => { closeModal(zoneModal); openIngredientModal(it.id); });
    zoneModalItems.appendChild(row);
  }
}

function renderZoneFoodOptions(query) {
  const q = (query || "").trim().toLowerCase();
  const list = (allFoodsCache || []).filter((f) => !q || f.name.toLowerCase().includes(q));
  zoneModalFoods.innerHTML = "";
  if (!list.length) {
    zoneModalFoods.innerHTML = '<div class="fridge-empty">没有匹配的食材</div>';
    return;
  }
  for (const f of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "zone-food-chip";
    btn.innerHTML = `<span class="zone-food-name">${f.name}</span><span class="zone-food-cat">${f.category}</span>`;
    btn.addEventListener("click", async () => {
      await addToFridge(f, "", zoneModalZone);
      renderZoneModal();
    });
    zoneModalFoods.appendChild(btn);
  }
}

if (zoneModal) {
  document.getElementById("zone-modal-close").addEventListener("click", () => closeModal(zoneModal));
  for (const head of document.querySelectorAll(".fridge-zone-head")) {
    head.addEventListener("click", () => openZoneModal(head.dataset.zone));
  }
  zoneFoodSearch.addEventListener("input", debounce(() => renderZoneFoodOptions(zoneFoodSearch.value), 150));
}

// ---- 食材详情弹窗：图片 / 天数 / 备注 等 ----
const ingredientModal = document.getElementById("ingredient-modal");
let ingredientModalId = null;

function openIngredientModal(id) {
  const it = fridgeItemsCache.find((x) => x.id === id);
  if (!it) return;
  ingredientModalId = id;
  const zone = it.zone || "fridge";
  const daysIn = daysSince(it.added_at);
  const life = shelfLifeDays(it.category, zone, fridgeSettings.fridgeTemp, fridgeSettings.freezerTemp);
  const status = freshnessStatus(daysIn, life);

  document.getElementById("ingredient-modal-title").textContent = "食材详情：" + it.name;
  const img = document.getElementById("ingredient-img");
  img.src = foodImage(it.name, true);
  img.addEventListener("error", () => { img.src = "food-images/other.png"; }, { once: true });
  const badge = document.getElementById("ingredient-badge");
  badge.className = "fridge-badge " + status;
  badge.textContent = status === "fresh" ? "新鲜" : status === "near" ? "临期" : "过期";
  document.getElementById("ingredient-name").textContent = it.name;
  document.getElementById("ingredient-category").textContent = it.category || "-";
  document.getElementById("ingredient-zone").textContent = zoneLabel(zone);
  document.getElementById("ingredient-qty").textContent = it.quantity || "若干";
  document.getElementById("ingredient-added").textContent = String(it.added_at || "").slice(0, 10) || "-";
  document.getElementById("ingredient-days").textContent = daysIn + " 天";
  document.getElementById("ingredient-life").textContent = `建议 ${life} 天内食用`;
  document.getElementById("ingredient-note").value = it.note || "";
  const moveBtn = document.getElementById("ingredient-move-btn");
  moveBtn.textContent = `移到${zoneLabel(zone === "freezer" ? "fridge" : "freezer")}`;
  moveBtn.dataset.targetZone = zone === "freezer" ? "fridge" : "freezer";
  openModal(ingredientModal, document.getElementById("ingredient-note"));
}

if (ingredientModal) {
  document.getElementById("ingredient-modal-close").addEventListener("click", () => closeModal(ingredientModal));
  document.getElementById("ingredient-save-btn").addEventListener("click", async () => {
    if (!ingredientModalId) return;
    try {
      await apiRequest("/api/v1/ingredients/" + ingredientModalId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: document.getElementById("ingredient-note").value.trim() }),
      });
      showAppStatus("备注已保存", true);
      await refreshFridgeItems();
      closeModal(ingredientModal);
    } catch (error) { showAppStatus("保存失败：" + error.message); }
  });
  document.getElementById("ingredient-move-btn").addEventListener("click", async () => {
    if (!ingredientModalId) return;
    const target = document.getElementById("ingredient-move-btn").dataset.targetZone;
    try {
      await apiRequest("/api/v1/ingredients/" + ingredientModalId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone: target }),
      });
      showAppStatus(`已移到${zoneLabel(target)}`, true);
      await refreshFridgeItems();
      closeModal(ingredientModal);
    } catch (error) { showAppStatus("移动失败：" + error.message); }
  });
  document.getElementById("ingredient-del-btn").addEventListener("click", async () => {
    if (!ingredientModalId) return;
    await removeFromFridge(ingredientModalId);
    closeModal(ingredientModal);
  });
}

// ---- 购物清单 ----
const shoppingModal = document.getElementById("shopping-modal");
const shoppingList = document.getElementById("shopping-list");

function openShoppingModal() {
  openModal(shoppingModal, document.getElementById("shopping-name"));
  loadShopping();
}

async function loadShopping() {
  if (!shoppingList) return;
  shoppingList.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const list = await apiRequest("/api/v1/shopping-items");
    renderShopping(Array.isArray(list) ? list : []);
  } catch { shoppingList.innerHTML = '<div class="fh-empty">加载失败，请稍后重试</div>'; }
}

function renderShopping(items) {
  shoppingList.innerHTML = "";
  if (!items.length) {
    shoppingList.innerHTML = '<div class="fh-empty">清单还是空的，在上方添加需要买的食材。</div>';
    return;
  }
  for (const it of items) {
    const row = document.createElement("div");
    row.className = "manage-row shopping-row" + (it.checked ? " checked" : "");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "shopping-check";
    check.checked = !!it.checked;
    check.setAttribute("aria-label", `把「${it.name}」标记为${it.checked ? "未买" : "已买"}`);
    check.addEventListener("change", async () => {
      try {
        await apiRequest(`/api/v1/shopping-items/${it.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checked: check.checked }),
        });
        row.classList.toggle("checked", check.checked);
      } catch (e) {
        check.checked = !check.checked;
        showAppStatus("更新失败：" + e.message);
      }
    });

    const main = document.createElement("div");
    main.className = "manage-main";
    main.innerHTML = `<div class="manage-title">${escapeHtml(it.name || "")}</div>` +
      (it.quantity ? `<div class="manage-sub">${escapeHtml(it.quantity)}</div>` : "");

    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger-btn";
    del.textContent = "删除";
    del.setAttribute("aria-label", `删除清单项：${it.name || ""}`);
    del.addEventListener("click", async () => {
      try {
        await apiRequest(`/api/v1/shopping-items/${it.id}`, { method: "DELETE" });
        loadShopping();
      } catch (e) { showAppStatus("删除失败：" + e.message); }
    });

    row.appendChild(check);
    row.appendChild(main);
    row.appendChild(del);
    shoppingList.appendChild(row);
  }
}

const shoppingBtn = document.getElementById("shopping-btn");
if (shoppingBtn) shoppingBtn.addEventListener("click", openShoppingModal);
const shoppingClose = document.getElementById("shopping-close");
if (shoppingClose) shoppingClose.addEventListener("click", () => closeModal(shoppingModal));
const shoppingForm = document.getElementById("shopping-form");
if (shoppingForm) shoppingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("shopping-name");
  const qtyInput = document.getElementById("shopping-qty");
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  try {
    await apiRequest("/api/v1/shopping-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity: qtyInput.value.trim() || undefined }),
    });
    nameInput.value = "";
    qtyInput.value = "";
    loadShopping();
  } catch (e2) { showAppStatus("添加失败：" + e2.message); }
});

async function loadFridgePage() {
  loadFoodCategories();
  searchFoods();
  await loadFridgeSettingsUI();
  refreshFridgeItems();
}

// 用函数声明以便被顶部提前调用（bindFridgeTempControls 在脚本靠前位置就执行）。
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
foodSearch.addEventListener("input", debounce(searchFoods, 200));

// ---- 健身 ----
const wType = document.getElementById("w-type");
const wDuration = document.getElementById("w-duration");
const wDetail = document.getElementById("w-detail");
const wDate = document.getElementById("w-date");
const workoutSummary = document.getElementById("workout-summary");
const workoutList = document.getElementById("workout-list");

const WORKOUT_PRESETS = [
  { name: "慢跑", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="4" r="2"/><path d="M4 20l4-1 2-5 4 2 3 5M11 13l-2 7"/><path d="M17 11l3 3"/></svg>' },
  { name: "快走", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="4" r="2"/><path d="M4 20l3-1 2-6 4 2 3 5M10 13l-2 7"/><path d="M9 7l3-3 3 3"/></svg>' },
  { name: "骑行", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l4-7h5l3 7M10 10l2-3h3"/></svg>' },
  { name: "游泳", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 16c2 0 4-1 6-1s4 1 6 1 4-1 6-1"/><path d="M2 20c2 0 4-1 6-1s4 1 6 1 4-1 6-1"/><circle cx="16" cy="6" r="2"/><path d="M14 8l-3 4"/></svg>' },
  { name: "瑜伽", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v6m0 0l-4 6m4-6l4 6M5 11h14"/></svg>' },
  { name: "力量", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.4 14.4 9.6 9.6"/><path d="M18.66 21.49a2 2 0 1 1-2.83-2.83l-1.77 1.77a2 2 0 1 1-2.83-2.83l6.36-6.36a2 2 0 1 1 2.83 2.83l-1.77 1.77a2 2 0 1 1 2.83 2.83z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.4 12.77a2 2 0 1 1-2.83-2.83l1.77-1.77a2 2 0 1 1-2.83-2.83l2.83-2.83a2 2 0 1 1 2.83 2.83l1.77-1.77a2 2 0 1 1 2.83 2.83z"/></svg>' },
  { name: "跳绳", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4c0 4 10 4 10 8M17 4c0 4-10 4-10 8M8 12v4m8-4v4M6 16h12"/></svg>' },
  { name: "HIIT", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>' },
  { name: "爬山", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20l6-12 4 7 3-5 5 10z"/></svg>' },
  { name: "舞蹈", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v5m0 0l-5 8m5-8l5 8M7 12h10"/></svg>' },
  { name: "球类", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5 5c3 3 11 3 14 0M5 19c3-3 11-3 14 0"/></svg>' },
  { name: "椭圆机", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19a7 7 0 0 1 14 0M5 19a7 7 0 0 0 14 0M7 17l3-5 4 2 3-4"/></svg>' },
];

function renderWorkoutPresets() {
  const wrap = document.getElementById("workout-presets");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const p of WORKOUT_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "workout-preset";
    btn.setAttribute("aria-label", "选择健身类型：" + p.name);
    const icon = document.createElement("span");
    icon.className = "workout-preset-icon";
    icon.innerHTML = p.icon;
    const label = document.createElement("span");
    label.className = "workout-preset-label";
    label.textContent = p.name;
    btn.appendChild(icon);
    btn.appendChild(label);
    btn.addEventListener("click", () => {
      if (wType) wType.value = p.name;
      wrap.querySelectorAll(".workout-preset").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
    });
    wrap.appendChild(btn);
  }
}

async function loadFitness() {
  renderWorkoutPresets();
  if (!wDate.value) wDate.value = todayISO();
  try {
    const res = await fetch("/api/v1/workouts");
    const data = await res.json();
    renderWorkouts(data.ok ? (data.data || []) : []);
  } catch { renderListError(workoutList); }
}

function renderWorkouts(items) {
  const total = items.reduce((s, w) => s + (Number(w.duration_min) || 0), 0);
  workoutSummary.textContent = items.length
    ? `共 ${items.length} 次训练，累计 ${total} 分钟。`
    : "还没有训练记录。";
  workoutList.innerHTML = "";
  for (const w of items) {
    const row = document.createElement("div");
    row.className = "list-row";
    const main = document.createElement("div");
    main.className = "list-row-main";
    main.textContent = `${w.date} / ${w.activity_type}${w.duration_min ? " / " + w.duration_min + " 分钟" : ""}`;
    if (w.detail) {
      const sub = document.createElement("div");
      sub.className = "list-row-sub";
      sub.textContent = w.detail;
      main.appendChild(sub);
    }
    const del = document.createElement("button");
    del.className = "list-row-del";
    del.textContent = "✕";
    del.title = "删除";
    del.setAttribute("aria-label", `删除训练记录：${w.activity_type}`);
    del.addEventListener("click", () => removeWorkout(w.id));
    row.appendChild(main);
    row.appendChild(del);
    workoutList.appendChild(row);
  }
}

async function addWorkout() {
  const activity_type = wType.value.trim();
  if (!activity_type) return;
  try {
    await apiRequest("/api/v1/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: wDate.value || todayISO(),
        activity_type,
        duration_min: wDuration.value ? Number(wDuration.value) : 30,
        detail: wDetail.value.trim(),
      }),
    });
    wType.value = "";
    wDuration.value = "";
    wDetail.value = "";
    await loadFitness();
    showAppStatus("训练记录已保存", true);
  } catch (error) { showAppStatus("记录训练失败：" + error.message); }
}

async function removeWorkout(id) {
  try {
    await apiRequest("/api/v1/workouts/" + id, { method: "DELETE" });
    await loadFitness();
  } catch (error) { showAppStatus("删除训练失败：" + error.message); }
}

document.getElementById("workout-form").addEventListener("submit", (e) => { e.preventDefault(); addWorkout(); });

// ---- 饮食 ----
const dMeal = document.getElementById("d-meal");
const dFoods = document.getElementById("d-foods");
const dNote = document.getElementById("d-note");
const dDate = document.getElementById("d-date");
const dietList = document.getElementById("diet-list");

async function loadDiet() {
  if (!dDate.value) dDate.value = todayISO();
  try {
    const [logsRes, summaryRes] = await Promise.all([fetch("/api/v1/diet-logs"), fetch("/api/v1/diet-summary")]);
    const logsData = await logsRes.json();
    let summary = null;
    try { const s = await summaryRes.json(); if (s.ok) summary = s.data; } catch { /* 汇总失败不阻塞列表 */ }
    renderDietSummary(summary);
    renderDiet(logsData.ok ? (logsData.data || []) : []);
  } catch { renderListError(dietList); }
}

function renderDietSummary(summary) {
  const wrap = document.getElementById("diet-summary");
  if (!wrap) return;
  if (!summary) { wrap.classList.add("hidden"); return; }
  wrap.classList.remove("hidden");
  const { today, week, target } = summary;
  const targetKcal = target ? target.kcal : 2000;
  const pct = targetKcal ? Math.min(1, today.total.kcal / targetKcal) : 0;
  const ring = document.getElementById("diet-ring-fill");
  const circumference = 2 * Math.PI * 52;
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${circumference * (1 - pct)}`;
  ring.classList.toggle("over", today.total.kcal > targetKcal);
  document.getElementById("diet-kcal-now").textContent = String(Math.round(today.total.kcal));
  document.getElementById("diet-kcal-target").textContent = `/ ${targetKcal} 千卡` + (target && target.source === "auto" ? " · 估" : "");

  const mealBars = document.getElementById("diet-meal-bars");
  const mealOrder = ["早餐", "午餐", "晚餐", "加餐"];
  const maxMeal = Math.max(1, ...mealOrder.map((m) => (today.meals[m] ? today.meals[m].kcal : 0)));
  mealBars.innerHTML = "";
  for (const m of mealOrder) {
    const meal = today.meals[m];
    const kcal = meal ? meal.kcal : 0;
    const row = document.createElement("div");
    row.className = "diet-meal-bar-row";
    const label = document.createElement("span");
    label.className = "diet-meal-bar-label";
    label.textContent = m;
    const track = document.createElement("div");
    track.className = "diet-meal-bar-track";
    const fill = document.createElement("div");
    fill.className = "diet-meal-bar-fill";
    fill.style.width = `${Math.round((kcal / maxMeal) * 100)}%`;
    track.appendChild(fill);
    const val = document.createElement("span");
    val.className = "diet-meal-bar-val";
    val.textContent = kcal ? `${Math.round(kcal)} 千卡` : "—";
    row.append(label, track, val);
    mealBars.appendChild(row);
  }

  const macros = document.getElementById("diet-macros");
  macros.innerHTML = "";
  for (const [label, value, unit] of [["蛋白质", today.total.protein, "g"], ["脂肪", today.total.fat, "g"], ["碳水", today.total.carb, "g"]]) {
    const chip = document.createElement("span");
    chip.className = "diet-macro-chip";
    chip.textContent = `${label} ${Math.round(value * 10) / 10}${unit}`;
    macros.appendChild(chip);
  }

  const trend = document.getElementById("diet-trend");
  trend.innerHTML = "";
  const maxWeek = Math.max(1, ...week.map((d) => d.kcal));
  week.forEach((d, i) => {
    const col = document.createElement("div");
    col.className = "diet-trend-col";
    const bar = document.createElement("div");
    bar.className = "diet-trend-bar";
    bar.style.height = `${Math.max(4, Math.round((d.kcal / maxWeek) * 44))}px`;
    bar.title = `${d.date}：约 ${d.kcal} 千卡`;
    const label = document.createElement("span");
    label.textContent = i === week.length - 1 ? "今" : d.date.slice(8);
    col.append(bar, label);
    trend.appendChild(col);
  });
}

function renderDiet(items) {
  dietList.innerHTML = "";
  if (!items.length) {
    dietList.innerHTML = '<div class="list-empty">还没有饮食记录，先记一餐吧。</div>';
    return;
  }
  for (const d of items) {
    const row = document.createElement("div");
    row.className = "list-row";
    const main = document.createElement("div");
    main.className = "list-row-main";
    const names = Array.isArray(d.foods) ? d.foods.map((f) => f.name).filter(Boolean).join("、") : "";
    const head = document.createElement("div");
    head.className = "diet-row-head";
    const title = document.createElement("span");
    title.textContent = `${d.date} ${d.meal_type}：${names || "无"}`;
    head.appendChild(title);
    if (d.total_kcal != null) {
      const badge = document.createElement("span");
      badge.className = "kcal-badge";
      badge.textContent = `约 ${d.total_kcal} 千卡`;
      head.appendChild(badge);
    }
    main.appendChild(head);
    const detail = Array.isArray(d.foods)
      ? d.foods.filter((f) => f && f.kcal != null).map((f) => `${f.name}${f.quantity ? "(" + f.quantity + ")" : ""} ${f.kcal}千卡`).join(" · ")
      : "";
    if (detail) {
      const sub = document.createElement("div");
      sub.className = "list-row-sub";
      sub.textContent = detail;
      main.appendChild(sub);
    }
    if (d.note) {
      const sub = document.createElement("div");
      sub.className = "list-row-sub";
      sub.textContent = d.note;
      main.appendChild(sub);
    }
    const del = document.createElement("button");
    del.className = "list-row-del";
    del.textContent = "✕";
    del.title = "删除";
    del.setAttribute("aria-label", `删除${d.date}${d.meal_type}饮食记录`);
    del.addEventListener("click", () => removeDiet(d.id));
    row.appendChild(main);
    row.appendChild(del);
    dietList.appendChild(row);
  }
}

async function addDiet() {
  const foodsStr = dFoods.value.trim();
  if (!foodsStr) return;
  const foods = foodsStr.split(/[,，、]/).map((s) => s.trim()).filter(Boolean).map((name) => ({ name }));
  try {
    await apiRequest("/api/v1/diet-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dDate.value || todayISO(), meal_type: dMeal.value, foods, note: dNote.value.trim() }),
    });
    dFoods.value = "";
    dNote.value = "";
    await loadDiet();
    showAppStatus("饮食记录已保存", true);
  } catch (error) { showAppStatus("记录饮食失败：" + error.message); }
}

async function removeDiet(id) {
  try {
    await apiRequest("/api/v1/diet-logs/" + id, { method: "DELETE" });
    await loadDiet();
  } catch (error) { showAppStatus("删除饮食记录失败：" + error.message); }
}

document.getElementById("diet-form").addEventListener("submit", (e) => { e.preventDefault(); addDiet(); });

// ---- 个人资料 ----
const pHeight = document.getElementById("p-height");
const pAge = document.getElementById("p-age");
const pGender = document.getElementById("p-gender");
const pActivity = document.getElementById("p-activity");
const pTaste = document.getElementById("p-taste");
const pCuisine = document.getElementById("p-cuisine");
const pAllergies = document.getElementById("p-allergies");
const pPeople = document.getElementById("p-people");
const pDays = document.getElementById("p-days");
const profileStatus = document.getElementById("profile-status");
const pWeight = document.getElementById("p-weight");
const pBodyfat = document.getElementById("p-bodyfat");

async function loadProfile() {
  try {
    const res = await fetch("/api/v1/preferences");
    const data = await res.json();
    const p = data.ok ? data.data : data;
    pHeight.value = p.height_cm != null ? p.height_cm : "";
    pAge.value = p.age != null ? p.age : "";
    pGender.value = p.gender || "";
    pActivity.value = p.activity_level || "久坐";
    pTaste.value = p.taste_preference || "";
    pCuisine.value = p.cuisine_style || "";
    pAllergies.value = p.allergies || "";
    pPeople.value = p.people_count != null ? p.people_count : "";
    pDays.value = p.days != null ? p.days : "";
  } catch { showAppStatus("读取个人资料失败，请稍后重试"); }
  try {
    const [metrics, diets] = await Promise.all([
      apiRequest("/api/v1/body-metrics"),
      apiRequest("/api/v1/diet-logs"),
    ]);
    renderProfileDaily(metrics || [], diets || []);
  } catch { renderListError(document.getElementById("profile-daily")); }
}

// 体重趋势图：内联 SVG 折线（近 30 次记录），体脂以虚线叠加。
function renderWeightChart(metrics) {
  const container = document.getElementById("weight-chart");
  if (!container) return;
  const points = metrics
    .filter((m) => typeof m.weight_kg === "number")
    .slice(0, 30)
    .map((m) => ({ date: String(m.date || ""), value: m.weight_kg, fat: m.body_fat_pct }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (points.length < 2) {
    container.innerHTML = "";
    container.classList.add("hidden");
    return;
  }
  container.classList.remove("hidden");
  const W = 640, H = 150, PAD_L = 40, PAD_R = 14, PAD_T = 16, PAD_B = 22;
  const values = points.map((p) => p.value);
  const min = Math.min(...values), max = Math.max(...values);
  const span = Math.max(max - min, 0.8);
  const lo = min - span * 0.15, hi = max + span * 0.15;
  const x = (i) => PAD_L + (i / (points.length - 1)) * (W - PAD_L - PAD_R);
  const y = (v) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PAD_B} L${PAD_L},${H - PAD_B} Z`;
  const last = points[points.length - 1];
  const fatPoints = points.filter((p) => typeof p.fat === "number");
  const fatLine = fatPoints.length >= 2
    ? fatPoints.map((p, i) => `${i === 0 ? "M" : "L"}${x(points.indexOf(p)).toFixed(1)},${y(p.fat).toFixed(1)}`).join(" ")
    : "";
  container.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">` +
    '<defs><linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="var(--accent-body)" stop-opacity="0.26"/>' +
    '<stop offset="1" stop-color="var(--accent-body)" stop-opacity="0.02"/>' +
    "</linearGradient></defs>" +
    (fatLine ? `<path d="${fatLine}" fill="none" stroke="var(--accent-diet)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.85"/>` : "") +
    `<path d="${area}" fill="url(#weightFill)"/>` +
    `<path d="${line}" fill="none" stroke="var(--accent-body)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${x(points.length - 1).toFixed(1)}" cy="${y(last.value).toFixed(1)}" r="3.5" fill="var(--accent-body)"/>` +
    `<text class="wc-val" x="${(x(points.length - 1) - 8).toFixed(1)}" y="${(y(last.value) - 8).toFixed(1)}" text-anchor="end">${last.value}kg</text>` +
    `<text class="wc-minmax" x="${PAD_L - 8}" y="${(y(max) + 4).toFixed(1)}" text-anchor="end">${max}</text>` +
    `<text class="wc-minmax" x="${PAD_L - 8}" y="${(y(min) + 4).toFixed(1)}" text-anchor="end">${min}</text>` +
    `<text class="wc-label" x="${PAD_L}" y="${H - 6}">${escapeHtml(points[0].date.slice(5))}</text>` +
    `<text class="wc-label" x="${W - PAD_R}" y="${H - 6}" text-anchor="end">${escapeHtml(last.date.slice(5))}</text>` +
    "</svg>" +
    (fatPoints.length >= 2
      ? '<div class="wc-legend"><span><i class="wc-dot solid"></i>体重 kg</span><span><i class="wc-dot dash"></i>体脂 %</span></div>'
      : "");
}

function renderProfileDaily(metrics, diets) {
  renderWeightChart(metrics || []);
  const container = document.getElementById("profile-daily");
  const entries = [];
  for (const m of metrics.slice(0, 14)) {
    entries.push({ date: m.date, text: `体重 ${m.weight_kg}kg${m.body_fat_pct != null ? " / 体脂 " + m.body_fat_pct + "%" : ""}` });
  }
  for (const d of diets) {
    const names = Array.isArray(d.foods) ? d.foods.map((f) => f.name).filter(Boolean).join("、") : "";
    entries.push({ date: d.date, text: `${d.meal_type}：${names || "无"}` });
  }
  entries.sort((a, b) => (a.date < b.date ? 1 : -1));
  container.innerHTML = "";
  if (!entries.length) {
    container.innerHTML = '<div class="list-empty">还没有每日记录，去「饮食」页记一餐，或在这里记录体重。</div>';
    return;
  }
  for (const e of entries.slice(0, 20)) {
    const row = document.createElement("div");
    row.className = "list-row";
    const main = document.createElement("div");
    main.className = "list-row-main";
    main.textContent = e.text;
    const sub = document.createElement("div");
    sub.className = "list-row-sub";
    sub.textContent = e.date;
    main.appendChild(sub);
    row.appendChild(main);
    container.appendChild(row);
  }
}

document.getElementById("weight-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const w = pWeight.value.trim();
  if (!w) return;
  const payload = { date: todayISO(), weight_kg: Number(w) };
  if (pBodyfat && pBodyfat.value.trim()) payload.body_fat_pct = Number(pBodyfat.value.trim());
  try {
    await apiRequest("/api/v1/body-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    pWeight.value = "";
    if (pBodyfat) pBodyfat.value = "";
    showAppStatus("已记录体重" + (payload.body_fat_pct != null ? "与体脂" : ""), true);
    loadProfile();
  } catch (err) { showAppStatus("记录失败：" + err.message); }
});

document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    height_cm: pHeight.value ? Number(pHeight.value) : null,
    age: pAge.value ? Number(pAge.value) : null,
    gender: pGender.value,
    activity_level: pActivity.value,
    taste_preference: pTaste.value.trim(),
    cuisine_style: pCuisine.value.trim(),
    allergies: pAllergies.value.trim(),
    people_count: pPeople.value ? Number(pPeople.value) : undefined,
    days: pDays.value ? Number(pDays.value) : undefined,
  };
  try {
    await apiRequest("/api/v1/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    profileStatus.textContent = "已保存";
    profileStatus.className = "settings-status ok";
  } catch (err) {
    profileStatus.textContent = "保存失败：" + err.message;
    profileStatus.className = "settings-status err";
  }
});

// ---- 添加卡片 ----
const addCardModal = document.getElementById("add-card-modal");
const addCardClose = document.getElementById("add-card-close");
const addCardFields = document.getElementById("add-card-fields");
const addCardSubmit = document.getElementById("add-card-submit");
const addCardStatus = document.getElementById("add-card-status");

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ADD_FIELDS = {
  workouts: [
    { key: "activity_type", label: "类型", required: true, placeholder: "如 慢跑" },
    { key: "duration_min", label: "时长（分钟）", type: "number", placeholder: "如 30" },
    { key: "detail", label: "详情", placeholder: "如 配速 6'00" },
  ],
  goals: [
    { key: "name", label: "目标", required: true, placeholder: "如 减脂到 65kg" },
    { key: "target", label: "目标值", placeholder: "如 65" },
    { key: "unit", label: "单位", placeholder: "如 kg" },
  ],
  habits: [
    { key: "habit", label: "习惯", required: true, placeholder: "如 饮水" },
    { key: "value", label: "记录", required: true, placeholder: "如 2L" },
  ],
};

let addCardType = "workouts";

function renderAddFields() {
  addCardFields.innerHTML = "";
  for (const f of ADD_FIELDS[addCardType]) {
    const label = document.createElement("label");
    label.className = "field-label";
    label.textContent = f.label + (f.required ? " *" : "");
    const input = document.createElement("input");
    input.className = "field";
    input.id = "add-field-" + f.key;
    input.type = f.type || "text";
    input.placeholder = f.placeholder || "";
    addCardFields.appendChild(label);
    addCardFields.appendChild(input);
  }
}

// type 为目标/习惯管理弹窗跳转而来时直接预选对应类型。
function openAddCardWithType(type) {
  addCardType = type;
  document.querySelectorAll(".add-type").forEach((b) => b.classList.toggle("active", b.dataset.type === type));
  renderAddFields();
  addCardStatus.textContent = "";
  addCardStatus.className = "settings-status";
  openModal(addCardModal, addCardModal.querySelector(".add-type.active"));
}

function openAddCard() { openAddCardWithType("workouts"); }

document.querySelectorAll(".add-type").forEach((btn) => {
  btn.addEventListener("click", () => {
    addCardType = btn.dataset.type;
    document.querySelectorAll(".add-type").forEach((b) => b.classList.toggle("active", b.dataset.type === addCardType));
    renderAddFields();
  });
});

addCardClose.addEventListener("click", () => closeModal(addCardModal));
document.getElementById("add-card-btn").addEventListener("click", openAddCard);

addCardSubmit.addEventListener("click", async () => {
  const values = {};
  let valid = true;
  for (const f of ADD_FIELDS[addCardType]) {
    const input = document.getElementById("add-field-" + f.key);
    const v = input.value.trim();
    values[f.key] = v;
    if (f.required && !v) valid = false;
  }
  if (!valid) {
    addCardStatus.textContent = "请填写必填项";
    addCardStatus.className = "settings-status err";
    return;
  }
  const payload = { ...values };
  if (addCardType === "workouts") {
    payload.date = todayISO();
    payload.duration_min = values.duration_min ? Number(values.duration_min) : 30;
  }
  if (addCardType === "habits") payload.date = todayISO();
  if (addCardType === "goals") payload.category = "健康";

  addCardSubmit.disabled = true;
  try {
    await apiRequest("/api/v1/" + addCardType, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    closeModal(addCardModal);
    renderBoard();
  } catch (e) {
    addCardStatus.textContent = "添加失败：" + e.message;
    addCardStatus.className = "settings-status err";
  } finally {
    addCardSubmit.disabled = false;
  }
});

// ---- 个性化推荐 ----
const recommendModal = document.getElementById("recommend-modal");
const recommendClose = document.getElementById("recommend-close");
const recommendLoading = document.getElementById("recommend-loading");
const recommendResult = document.getElementById("recommend-result");
const recommendConsent = document.getElementById("recommend-consent");
const recommendConsentCheck = document.getElementById("recommend-consent-check");
const recommendGenerate = document.getElementById("recommend-generate");
const recommendProvider = document.getElementById("recommend-provider");

const FOOD_EMOJI = {
  番茄: "🍅", 土豆: "🥔", 胡萝卜: "🥕", 白萝卜: "🥕", 鸡蛋: "🥚", 鸡胸肉: "🍗", 鸡肉: "🍗", 鸡腿: "🍗", 鸡翅: "🍗",
  牛肉: "🥩", 猪肉: "🥩", 羊肉: "🥩", 排骨: "🍖", 五花肉: "🥓", 三文鱼: "🐟", 鲈鱼: "🐟", 龙利鱼: "🐟", 鳕鱼: "🐟", 虾: "🦐", 虾仁: "🦐",
  西兰花: "🥦", 花菜: "🥦", 白菜: "🥬", 菠菜: "🥬", 生菜: "🥬", 芹菜: "🥬", 黄瓜: "🥒", 茄子: "🍆", 玉米: "🌽", 南瓜: "🎃",
  豆腐: "🫛", 豆干: "🫛", 腐竹: "🫛", 香菇: "🍄", 金针菇: "🍄", 木耳: "🍄", 蘑菇: "🍄",
  燕麦: "🌾", 小米: "🌾", 糙米: "🍚", 米饭: "🍚", 面条: "🍜", 面包: "🍞", 馒头: "🥟", 饺子: "🥟", 红薯: "🍠", 紫薯: "🍠",
  牛奶: "🥛", 酸奶: "🥛", 奶酪: "🧀", 苹果: "🍎", 香蕉: "🍌", 橙子: "🍊", 草莓: "🍓", 蓝莓: "🫐", 牛油果: "🥑", 葡萄: "🍇",
  洋葱: "🧅", 蒜: "🧄", 姜: "🫚", 青椒: "🫑", 辣椒: "🌶️", 培根: "🥓", 香肠: "🌭", 午餐肉: "🥫", 蜂蜜: "🍯", 咖啡: "☕", 茶叶: "🍵",
};

const MEAL_EMOJI = { 早餐: "🍳", 午餐: "🥗", 晚餐: "🍲", 加餐: "🍎" };

function foodEmoji(name) {
  if (!name) return "🍽️";
  if (FOOD_EMOJI[name]) return FOOD_EMOJI[name];
  let best = "";
  for (const key of Object.keys(FOOD_EMOJI)) {
    if (name.includes(key) && key.length > best.length) best = key;
  }
  return best ? FOOD_EMOJI[best] : "🍽️";
}

function showRecommendError(msg) {
  recommendResult.innerHTML = "";
  const div = document.createElement("div");
  div.className = "recommend-error";
  div.textContent = msg;
  recommendResult.appendChild(div);
  recommendResult.classList.remove("hidden");
}

function renderRecSection(title, items, kind) {
  const section = document.createElement("div");
  section.className = "rec-section";
  const h = document.createElement("h3");
  h.textContent = title;
  section.appendChild(h);
  const grid = document.createElement("div");
  grid.className = "rec-grid";
  for (const item of items) grid.appendChild(renderRecCard(item, kind));
  section.appendChild(grid);
  return section;
}

function renderRecCard(item, kind) {
  const card = document.createElement("div");
  card.className = "rec-card";
  const head = document.createElement("div");
  head.className = "rec-card-head";
  const icon = document.createElement("span");
  icon.className = "rec-card-icon";
  const label = document.createElement("span");
  label.className = "rec-card-label";
  if (kind === "workout") {
    icon.innerHTML = ICONS.dumbbell;
    label.textContent = [item.day, item.type].filter(Boolean).join(" / ");
  } else {
    icon.textContent = MEAL_EMOJI[item.meal] || "🍽️";
    label.textContent = item.meal || item.day || "";
  }
  head.appendChild(icon);
  head.appendChild(label);
  card.appendChild(head);

  const list = kind === "workout" ? (item.items || []) : (item.foods || []);
  if (list.length) {
    const chips = document.createElement("div");
    chips.className = "rec-chips";
    for (const name of list) {
      const chip = document.createElement("span");
      chip.className = "rec-chip";
      chip.textContent = (kind === "workout" ? "- " : foodEmoji(name) + " ") + name;
      chips.appendChild(chip);
    }
    card.appendChild(chips);
  }
  if (item.note) {
    const note = document.createElement("div");
    note.className = "rec-note";
    note.textContent = item.note;
    card.appendChild(note);
  }
  return card;
}

function renderRecommendation(data) {
  recommendResult.innerHTML = "";
  // 诚实披露：区分「结合了档案的个性化推荐」与「无档案时的普适建议」
  if (data.hasProfile === false) {
    const badge = document.createElement("div");
    badge.className = "rec-profile-badge";
    badge.textContent = "未建立健康档案：以下为适合久坐人群的普适建议。到「健康档案」补全体重等信息后，推荐会更贴合你。";
    recommendResult.appendChild(badge);
  } else if (data.hasProfile === true) {
    const badge = document.createElement("div");
    badge.className = "rec-profile-badge personalized";
    badge.textContent = "已结合你的身体数据、目标与冰箱食材生成。";
    recommendResult.appendChild(badge);
  }
  if (data.raw && !data.daily.length && !data.weekly.length && !data.workout.length) {
    const sec = document.createElement("div");
    sec.className = "recommend-section";
    const h = document.createElement("h3");
    h.textContent = "推荐结果";
    const t = document.createElement("div");
    t.className = "recommend-text";
    t.textContent = data.raw;
    sec.appendChild(h);
    sec.appendChild(t);
    recommendResult.appendChild(sec);
  } else {
    if (data.daily.length) recommendResult.appendChild(renderRecSection("今日食谱", data.daily, "food"));
    if (data.weekly.length) recommendResult.appendChild(renderRecSection("每周食谱", data.weekly, "food"));
    if (data.workout.length) recommendResult.appendChild(renderRecSection("运动计划", data.workout, "workout"));
  }
  if (data.note) {
    const note = document.createElement("div");
    note.className = "rec-disclaimer";
    note.textContent = data.note;
    recommendResult.appendChild(note);
  }
  recommendResult.classList.remove("hidden");
}

async function openRecommendationConsent() {
  recommendConsent.classList.remove("hidden");
  recommendLoading.classList.add("hidden");
  recommendResult.classList.add("hidden");
  recommendResult.innerHTML = "";
  recommendConsentCheck.checked = false;
  recommendGenerate.disabled = true;
  recommendProvider.textContent = "当前已配置的模型提供商";
  openModal(recommendModal, recommendConsentCheck);
  try {
    const settings = await fetch("/api/settings").then((res) => res.json());
    recommendProvider.textContent = `${settings.modelName || "当前模型"} / ${settings.model || "默认模型"}`;
  } catch { recommendProvider.textContent = "当前已配置的模型提供商"; }
}

async function generateRecommendations() {
  if (!recommendConsentCheck.checked) return;
  recommendConsent.classList.add("hidden");
  recommendLoading.classList.remove("hidden");
  recommendResult.classList.add("hidden");
  recommendResult.innerHTML = "";
  try {
    const data = await apiRequest("/api/v1/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacyConsent: true }),
    });
    renderRecommendation(data);
  } catch (e) {
    showRecommendError("生成失败：" + e.message);
  } finally {
    recommendLoading.classList.add("hidden");
  }
}

recommendConsentCheck.addEventListener("change", () => { recommendGenerate.disabled = !recommendConsentCheck.checked; });
recommendGenerate.addEventListener("click", generateRecommendations);
recommendClose.addEventListener("click", () => closeModal(recommendModal));
document.getElementById("recommend-btn").addEventListener("click", openRecommendationConsent);

// ---- 健康分析 ----
const analysisModal = document.getElementById("analysis-modal");
const analysisClose = document.getElementById("analysis-close");
const analysisConsent = document.getElementById("analysis-consent");
const analysisConsentCheck = document.getElementById("analysis-consent-check");
const analysisGenerate = document.getElementById("analysis-generate");
const analysisProvider = document.getElementById("analysis-provider");
const analysisLoading = document.getElementById("analysis-loading");
const analysisResult = document.getElementById("analysis-result");

let analysisPeriod = "daily";

function renderAnalysisMarkdown(text) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bold = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return text
    .split("\n")
    .map((raw) => {
      const line = esc(raw);
      const h = line.match(/^(#{1,4})\s+(.*)/);
      if (h) return '<h3 class="analysis-h">' + bold(h[2]) + "</h3>";
      const li = line.match(/^\s*[-*•]\s+(.*)/);
      if (li) return '<div class="analysis-li">' + bold(li[1]) + "</div>";
      if (line.trim() === "") return '<div class="analysis-gap"></div>';
      return '<div class="analysis-p">' + bold(line) + "</div>";
    })
    .join("");
}

function openAnalysis() {
  analysisConsent.classList.remove("hidden");
  analysisLoading.classList.add("hidden");
  analysisResult.classList.add("hidden");
  analysisResult.innerHTML = "";
  analysisConsentCheck.checked = false;
  analysisGenerate.disabled = true;
  analysisProvider.textContent = "当前已配置的模型提供商";
  openModal(analysisModal, analysisConsentCheck);
  apiRequest("/api/settings")
    .then((s) => { analysisProvider.textContent = s.modelName || "当前模型"; })
    .catch(() => { analysisProvider.textContent = "当前已配置的模型提供商"; });
}

function selectAnalysisPeriod(period) {
  analysisPeriod = period;
  document.querySelectorAll(".analysis-tab").forEach((b) => b.classList.toggle("active", b.dataset.period === period));
  analysisResult.classList.add("hidden");
  analysisResult.innerHTML = "";
  analysisConsent.classList.remove("hidden");
}

async function generateAnalysis() {
  if (!analysisConsentCheck.checked) return;
  analysisConsent.classList.add("hidden");
  analysisLoading.classList.remove("hidden");
  analysisResult.classList.add("hidden");
  analysisResult.innerHTML = "";
  try {
    const data = await apiRequest("/api/v1/analysis?period=" + analysisPeriod, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privacyConsent: true }),
    });
    analysisResult.innerHTML = renderAnalysisMarkdown(data.text || "");
    analysisResult.classList.remove("hidden");
  } catch (e) {
    const err = document.createElement("div");
    err.className = "recommend-error";
    err.textContent = "生成失败：" + e.message;
    analysisResult.innerHTML = "";
    analysisResult.appendChild(err);
    analysisResult.classList.remove("hidden");
  } finally {
    analysisLoading.classList.add("hidden");
  }
}

document.querySelectorAll(".analysis-tab").forEach((b) => b.addEventListener("click", () => selectAnalysisPeriod(b.dataset.period)));
analysisConsentCheck.addEventListener("change", () => { analysisGenerate.disabled = !analysisConsentCheck.checked; });
analysisGenerate.addEventListener("click", generateAnalysis);
analysisClose.addEventListener("click", () => closeModal(analysisModal));
document.getElementById("analysis-btn").addEventListener("click", openAnalysis);

// ---- 设置中心 ----
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const settingsClose = document.getElementById("settings-close");
const providerSelect = document.getElementById("provider-select");
const apiKeyInput = document.getElementById("api-key-input");
const testBtn = document.getElementById("test-btn");
const saveBtn = document.getElementById("save-btn");
const settingsStatus = document.getElementById("settings-status");
const customFields = document.getElementById("custom-fields");
const baseUrlInput = document.getElementById("base-url-input");
const modelIdInput = document.getElementById("model-id-input");
const modelField = document.getElementById("model-field");
const modelSelect = document.getElementById("model-select");
let modelCatalog = null;

let currentSettings = null;

async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    currentSettings = await res.json();
    providerSelect.value = currentSettings.modelName;
    if (currentSettings.custom) {
      baseUrlInput.value = currentSettings.custom.baseUrl || "";
      modelIdInput.value = currentSettings.custom.model || "";
    }
    if (currentSettings.uiTheme) applyTheme(currentSettings.uiTheme);
    const thinkingSelect = document.getElementById("thinking-select");
    if (thinkingSelect && currentSettings.thinkingLevel) thinkingSelect.value = currentSettings.thinkingLevel;
    renderKeyHint();
    populateModelSelect();
    updateModelAvailability();
  } catch {
    /* 忽略 */
  }
}

// 根据当前模型是否已配置，控制引导条与依赖模型的按钮可用性。
function updateModelAvailability() {
  const configured = !!(currentSettings && currentSettings.modelConfigured);
  const banner = document.getElementById("model-guidance");
  if (banner) {
    const dismissed = sessionStorage.getItem("guidanceDismissed") === "1";
    banner.classList.toggle("hidden", configured || dismissed);
  }
  for (const id of ["recommend-btn", "analysis-btn", "fridge-ai-btn"]) {
    const b = document.getElementById(id);
    if (b) b.disabled = !configured;
  }
}

function renderKeyHint() {
  const p = providerSelect.value;
  const has = currentSettings && currentSettings.hasKey && currentSettings.hasKey[p];
  apiKeyInput.placeholder = has ? "已保存 key（留空则不修改）" : "请输入该模型的 API Key";
  const isCustom = p === "custom";
  customFields.classList.toggle("hidden", !isCustom);
  modelField.classList.toggle("hidden", isCustom);
}

async function populateModelSelect() {
  const provider = providerSelect.value;
  if (provider === "custom") { modelSelect.innerHTML = ""; return; }
  if (!modelCatalog) {
    try { modelCatalog = await apiRequest("/api/v1/model-catalog"); } catch { modelCatalog = {}; }
  }
  const list = (modelCatalog && modelCatalog[provider]) || [];
  modelSelect.innerHTML = "";
  for (const m of list) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name || m.id;
    modelSelect.appendChild(opt);
  }
  const current = currentSettings && currentSettings.model;
  if (current && list.some((m) => m.id === current)) modelSelect.value = current;
}

function showStatus(msg, ok) {
  settingsStatus.textContent = msg;
  settingsStatus.className = "settings-status" + (ok === true ? " ok" : ok === false ? " err" : "");
}

settingsBtn.addEventListener("click", () => {
  loadSettings();
  openModal(settingsModal, providerSelect);
});

settingsClose.addEventListener("click", () => closeModal(settingsModal));
document.getElementById("theme-select").addEventListener("change", (e) => { applyTheme(e.target.value); syncThemeToServer(e.target.value); });
document.getElementById("ambient-select").addEventListener("change", (e) => {
  applyAmbient(e.target.value);
  localStorage.setItem(AMBIENT_KEY, e.target.value);
  showAppStatus(e.target.value === "off" ? "氛围效果已关闭" : e.target.value === "reduced" ? "氛围效果已减弱" : "氛围效果已恢复标准", true);
});
providerSelect.addEventListener("change", () => { renderKeyHint(); populateModelSelect(); });

testBtn.addEventListener("click", async () => {
  const provider = providerSelect.value;
  const key = apiKeyInput.value.trim();
  showStatus("测试中…", null);
  try {
    const body = { provider, key };
    if (provider === "custom") {
      body.baseUrl = baseUrlInput.value.trim();
      body.modelId = modelIdInput.value.trim();
    }
    const res = await fetch("/api/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    showStatus(data.message, data.ok);
  } catch (e) {
    showStatus("测试失败：" + e.message, false);
  }
});

saveBtn.addEventListener("click", async () => {
  const modelName = providerSelect.value;
  const apiKey = apiKeyInput.value.trim();
  showStatus("保存中…", null);
  try {
    const body = { modelName, apiKey, uiTheme: document.getElementById("theme-select").value, thinkingLevel: (document.getElementById("thinking-select") || {}).value || "off" };
    if (modelName === "custom") {
      body.baseUrl = baseUrlInput.value.trim();
      body.modelId = modelIdInput.value.trim();
    } else {
      body.modelId = modelSelect.value;
    }
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    showStatus(data.ok ? "已保存并切换" : data.message, data.ok);
    if (data.ok) {
      currentSettings = data;
      apiKeyInput.value = "";
      renderKeyHint();
      updateModelAvailability();
      closeModal(settingsModal);
    }
  } catch (e) {
    showStatus("保存失败：" + e.message, false);
  }
});

// ---- 视觉增强：光标聚光 + 氛围层视差 + 按钮涟漪 ----
// --mx/--my 驱动聚光与蒸汽/光尘/台面的轻微鼠标视差
const rootEl = document.documentElement;
let glowX = window.innerWidth / 2, glowY = window.innerHeight / 2, glowRAF = null;
function applyGlow() {
  glowRAF = null;
  rootEl.style.setProperty("--mx", glowX + "px");
  rootEl.style.setProperty("--my", glowY + "px");
}
window.addEventListener("pointermove", (e) => {
  glowX = e.clientX;
  glowY = e.clientY;
  if (!document.body.classList.contains("has-cursor")) document.body.classList.add("has-cursor");
  if (glowRAF === null) glowRAF = requestAnimationFrame(applyGlow);
}, { passive: true });

document.addEventListener("pointerdown", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.width = ripple.style.height = size + "px";
  ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
  ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
  btn.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}, true);

// ====================== 新增：收藏/历史、目标/习惯管理、导出、引导、图片兜底 ======================

// 全局图片兜底：食物/食材图片加载失败时统一回退占位图，消除空白。
document.addEventListener("error", (e) => {
  const t = e.target;
  if (t && t.tagName === "IMG" && t.dataset.fallbackApplied !== "1") {
    const src = t.getAttribute("src") || "";
    if (/(\/foods?\/|\/food-images?\/)/.test(src)) {
      t.dataset.fallbackApplied = "1";
      t.src = "/food-images/other.png";
    }
  }
}, true);

// 首屏启动：拉取模型/主题配置，应用主题并刷新功能可用性。
(function bootstrapSettings() {
  fetch("/api/settings").then((r) => r.json()).then((s) => {
    currentSettings = s;
    if (s.uiTheme) applyTheme(s.uiTheme);
    updateModelAvailability();
  }).catch(() => {});
})();

const guidanceSettingsBtn = document.getElementById("guidance-settings-btn");
if (guidanceSettingsBtn) {
  guidanceSettingsBtn.addEventListener("click", () => { loadSettings(); openModal(settingsModal, providerSelect); });
}

const guidanceCloseBtn = document.getElementById("guidance-close");
if (guidanceCloseBtn) {
  guidanceCloseBtn.addEventListener("click", () => {
    const banner = document.getElementById("model-guidance");
    if (banner) banner.classList.add("hidden");
    sessionStorage.setItem("guidanceDismissed", "1");
  });
}

// ---- 收藏 / 历史 模态框 ----
const favoritesModal = document.getElementById("favorites-modal");
const fhList = document.getElementById("fh-list");
const fhDetail = document.getElementById("fh-detail");
let fhCurrentTab = "favorites";

function openFavoritesModal(tab) {
  fhCurrentTab = tab || "favorites";
  document.querySelectorAll(".fh-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === fhCurrentTab));
  openModal(favoritesModal);
  loadFavoritesOrHistory();
}

(function bindFhTabs() {
  document.querySelectorAll(".fh-tab").forEach((b) => {
    b.addEventListener("click", () => {
      fhCurrentTab = b.dataset.tab;
      document.querySelectorAll(".fh-tab").forEach((x) => x.classList.toggle("active", x === b));
      loadFavoritesOrHistory();
    });
  });
})();

async function loadFavoritesOrHistory() {
  fhList.innerHTML = '<div class="loading-spinner"></div>';
  fhDetail.innerHTML = '<div class="fh-empty">从左侧选择一条查看详情</div>';
  try {
    const url = fhCurrentTab === "favorites" ? "/api/v1/favorites" : "/api/v1/recipe-history";
    const res = await fetch(url);
    const data = await res.json();
    const list = data.ok ? (data.data || []) : [];
    if (!list.length) { fhList.innerHTML = '<div class="fh-empty">暂无内容</div>'; return; }
    fhList.innerHTML = "";
    list.forEach((item) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "fh-item";
      const title = item.recipe_name || item.title || ("#" + item.id);
      const meta = (item.created_at ? String(item.created_at).slice(0, 10) : "") + (item.meal_type ? " · " + item.meal_type : "");
      row.innerHTML = `<div class="fh-item-title">${escapeHtml(title)}</div><div class="fh-item-meta">${escapeHtml(meta)}</div>`;
      row.addEventListener("click", () => {
        document.querySelectorAll(".fh-item").forEach((x) => x.classList.remove("active"));
        row.classList.add("active");
        renderFhDetail(item);
      });
      fhList.appendChild(row);
    });
    const first = fhList.querySelector(".fh-item");
    if (first) first.click();
  } catch {
    fhList.innerHTML = '<div class="fh-empty">加载失败</div>';
  }
}

function renderFhDetail(item) {
  const md = item.week_plan || item.recipe_content || item.content || "";
  const ingredients = Array.isArray(item.ingredients) ? item.ingredients.map((i) => i && i.name).filter(Boolean).join("、") : "";
  let html = "";
  const name = item.recipe_name || item.title;
  if (name) html += `<h3 class="fh-detail-title">${escapeHtml(name)}</h3>`;
  if (ingredients) html += `<div class="fh-detail-section"><strong>食材：</strong>${escapeHtml(ingredients)}</div>`;
  if (item.steps && Array.isArray(item.steps) && item.steps.length) {
    html += `<div class="fh-detail-section"><strong>步骤：</strong></div><ol class="fh-steps">${item.steps.map((s) => `<li>${escapeHtml(typeof s === "string" ? s : (s && s.step || ""))}</li>`).join("")}</ol>`;
  }
  if (md) html += `<div class="fh-markdown">${renderMarkdownToHtml(md)}</div>`;
  fhDetail.innerHTML = html || '<div class="fh-empty">无详细内容</div>';
  if (fhCurrentTab === "favorites") {
    const del = document.createElement("button");
    del.type = "button";
    del.className = "danger-btn fh-del";
    del.textContent = "删除收藏";
    del.addEventListener("click", async () => {
      if (!confirm("确定删除该收藏？此操作不可撤销。")) return;
      try {
        await apiRequest(`/api/v1/favorites/${item.id}`, { method: "DELETE" });
        showAppStatus("已删除", true);
        loadFavoritesOrHistory();
        if (typeof renderBoard === "function") renderBoard();
      } catch (e) { showAppStatus("删除失败：" + e.message); }
    });
    fhDetail.appendChild(del);
  }
}

const fhClose = document.getElementById("favorites-close");
if (fhClose) fhClose.addEventListener("click", () => closeModal(favoritesModal));

// ---- 目标管理 ----
const goalsModal = document.getElementById("goals-modal");
const goalsList = document.getElementById("goals-list");
function openGoalsModal() { openModal(goalsModal); loadGoals(); }

async function loadGoals() {
  goalsList.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const res = await fetch("/api/v1/goals");
    const data = await res.json();
    const list = data.ok ? (data.data || []) : [];
    if (!list.length) { goalsList.innerHTML = '<div class="fh-empty">还没有目标，告诉 AI「帮我设定一个目标」即可。</div>'; return; }
    goalsList.innerHTML = "";
    list.forEach((g) => goalsList.appendChild(goalRow(g)));
  } catch { goalsList.innerHTML = '<div class="fh-empty">加载失败</div>'; }
}

function goalRow(g) {
  const row = document.createElement("div");
  row.className = "manage-row";
  const main = document.createElement("div");
  main.className = "manage-main";
  main.innerHTML = `<div class="manage-title">${escapeHtml(g.name || "")}</div><div class="manage-sub">${escapeHtml([g.target ? g.target + (g.unit || "") : "", g.frequency || ""].filter(Boolean).join(" · "))}</div>`;
  const ctrl = document.createElement("div");
  ctrl.className = "manage-ctrl";
  const sel = document.createElement("select");
  sel.className = "field";
  for (const s of ["进行中", "已完成", "已暂停", "已取消"]) {
    const o = document.createElement("option");
    o.value = s; o.textContent = s;
    if (g.status === s) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", async () => {
    try {
      await apiRequest(`/api/v1/goals/${g.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: sel.value }) });
      showAppStatus("目标状态已更新", true);
      loadGoals();
    } catch (e) { showAppStatus("更新失败：" + e.message); }
  });
  const del = document.createElement("button");
  del.className = "danger-btn"; del.textContent = "删除";
  del.addEventListener("click", async () => {
    if (!confirm("删除该目标？")) return;
    try {
      await apiRequest(`/api/v1/goals/${g.id}`, { method: "DELETE" });
      showAppStatus("已删除", true);
      loadGoals();
      if (typeof renderBoard === "function") renderBoard();
    } catch (e) { showAppStatus("删除失败：" + e.message); }
  });
  ctrl.appendChild(sel); ctrl.appendChild(del);
  row.appendChild(main); row.appendChild(ctrl);
  return row;
}

const goalsClose = document.getElementById("goals-close");
if (goalsClose) goalsClose.addEventListener("click", () => closeModal(goalsModal));
const goalsAdd = document.getElementById("goals-add");
if (goalsAdd) goalsAdd.addEventListener("click", () => {
  closeModal(goalsModal);
  openAddCardWithType("goals");
});

// ---- 习惯管理 ----
const habitsModal = document.getElementById("habits-modal");
const habitsList = document.getElementById("habits-list");
function openHabitsModal() { openModal(habitsModal); loadHabits(); }

async function loadHabits() {
  habitsList.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const res = await fetch("/api/v1/habits");
    const data = await res.json();
    const list = data.ok ? (data.data || []) : [];
    if (!list.length) { habitsList.innerHTML = '<div class="fh-empty">还没有习惯记录。</div>'; return; }
    habitsList.innerHTML = "";
    list.forEach((h) => {
      const row = document.createElement("div");
      row.className = "manage-row";
      row.innerHTML = `<div class="manage-main"><div class="manage-title">${escapeHtml(h.habit || "")}</div><div class="manage-sub">${escapeHtml([h.value != null ? String(h.value) : "", h.date].filter(Boolean).join(" · "))}</div></div>`;
      const ctrl = document.createElement("div");
      ctrl.className = "manage-ctrl";
      const del = document.createElement("button");
      del.className = "danger-btn"; del.textContent = "删除";
      del.addEventListener("click", async () => {
        if (!confirm("删除该习惯记录？")) return;
        try {
          await apiRequest(`/api/v1/habits/${h.id}`, { method: "DELETE" });
          showAppStatus("已删除", true);
          loadHabits();
          if (typeof renderBoard === "function") renderBoard();
        } catch (e) { showAppStatus("删除失败：" + e.message); }
      });
      ctrl.appendChild(del);
      row.appendChild(ctrl);
      habitsList.appendChild(row);
    });
  } catch { habitsList.innerHTML = '<div class="fh-empty">加载失败</div>'; }
}

const habitsClose = document.getElementById("habits-close");
if (habitsClose) habitsClose.addEventListener("click", () => closeModal(habitsModal));
const habitsAdd = document.getElementById("habits-add");
if (habitsAdd) habitsAdd.addEventListener("click", () => {
  closeModal(habitsModal);
  openAddCardWithType("habits");
});

// ---- 自动化中心（定时任务） ----
const schedulesModal = document.getElementById("schedules-modal");
const schedulesList = document.getElementById("schedules-list");
const schedulesStatus = document.getElementById("schedules-status");
const schedulesBtn = document.getElementById("schedules-btn");
const schedulesClose = document.getElementById("schedules-close");
const scheduleForm = document.getElementById("schedule-form");
const scheduleTypeSelect = document.getElementById("schedule-type");
const scheduleWeekdays = document.getElementById("schedule-weekdays");
const scheduleDateInput = document.getElementById("schedule-date");

const WEEKDAY_NAMES = { 1: "周一", 2: "周二", 3: "周三", 4: "周四", 5: "周五", 6: "周六", 7: "周日" };

// next_fire_at 是 UTC "YYYY-MM-DD HH:MM:SS"，转本地时间展示
function formatUtcStamp(stamp) {
  const d = new Date(String(stamp).replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return String(stamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function scheduleHint(s) {
  const time = s.time_of_day || "";
  if (s.schedule_type === "weekly") return `每周 ${(s.weekdays || []).map((d) => WEEKDAY_NAMES[d] || d).join("、")} ${time}`;
  if (s.schedule_type === "once") return `${s.fire_date || "今天"} ${time}（仅一次）`;
  return `每天 ${time}`;
}

function openSchedulesModal() { openModal(schedulesModal); loadSchedules(); }
if (schedulesBtn) schedulesBtn.addEventListener("click", openSchedulesModal);
if (schedulesClose) schedulesClose.addEventListener("click", () => closeModal(schedulesModal));

async function loadSchedules() {
  schedulesList.innerHTML = '<div class="loading-spinner"></div>';
  try {
    const list = await apiRequest("/api/v1/schedules");
    renderSchedules(Array.isArray(list) ? list : []);
  } catch (e) {
    schedulesList.innerHTML = '<div class="fh-empty">加载失败：' + escapeHtml(e.message) + "</div>";
  }
}

function renderSchedules(list) {
  schedulesList.innerHTML = "";
  if (!list.length) {
    schedulesList.innerHTML = '<div class="fh-empty">还没有定时任务。用下面的表单创建，或直接告诉 AI「每天晚上六点提醒我吃晚饭」。</div>';
    return;
  }
  for (const s of list) {
    const row = document.createElement("div");
    row.className = "manage-row" + (s.enabled ? "" : " is-off");
    const main = document.createElement("div");
    main.className = "manage-main";
    const title = document.createElement("div");
    title.className = "manage-title";
    title.textContent = s.title || "未命名任务";
    const sub = document.createElement("div");
    sub.className = "manage-sub";
    sub.textContent = [scheduleHint(s), s.next_fire_at ? `下次 ${formatUtcStamp(s.next_fire_at)}` : "已完成"].filter(Boolean).join(" · ");
    main.appendChild(title);
    main.appendChild(sub);

    const ctrl = document.createElement("div");
    ctrl.className = "manage-ctrl";
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "skill-toggle";
    toggle.checked = !!s.enabled;
    toggle.setAttribute("aria-label", `启用任务：${s.title || "未命名任务"}`);
    toggle.addEventListener("change", () => toggleSchedule(s, toggle));
    const del = document.createElement("button");
    del.className = "danger-btn";
    del.textContent = "删除";
    del.addEventListener("click", () => deleteSchedule(s));
    ctrl.appendChild(toggle);
    ctrl.appendChild(del);

    row.appendChild(main);
    row.appendChild(ctrl);
    schedulesList.appendChild(row);
  }
}

async function toggleSchedule(s, toggle) {
  try {
    await apiRequest(`/api/v1/schedules/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: toggle.checked ? 1 : 0 }),
    });
    showAppStatus(toggle.checked ? "任务已启用" : "任务已停用", true);
    loadSchedules();
  } catch (e) {
    showAppStatus("操作失败：" + e.message);
    toggle.checked = !toggle.checked;
  }
}

async function deleteSchedule(s) {
  if (!confirm(`删除定时任务「${s.title || "未命名任务"}」？`)) return;
  try {
    await apiRequest(`/api/v1/schedules/${s.id}`, { method: "DELETE" });
    showAppStatus("定时任务已删除", true);
    loadSchedules();
  } catch (e) {
    showAppStatus("删除失败：" + e.message);
  }
}

function setSchedulesStatus(message, ok) {
  if (!schedulesStatus) return;
  schedulesStatus.textContent = message;
  schedulesStatus.className = "settings-status " + (ok ? "ok" : "err");
}

function syncScheduleFormFields() {
  if (!scheduleTypeSelect) return;
  const type = scheduleTypeSelect.value;
  scheduleWeekdays.classList.toggle("hidden", type !== "weekly");
  scheduleDateInput.classList.toggle("hidden", type !== "once");
}
if (scheduleTypeSelect) scheduleTypeSelect.addEventListener("change", syncScheduleFormFields);
syncScheduleFormFields();
if (scheduleWeekdays) scheduleWeekdays.addEventListener("click", (e) => {
  const btn = e.target.closest(".weekday-btn");
  if (btn) btn.classList.toggle("active");
});

if (scheduleForm) scheduleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("schedule-title").value.trim();
  const message = document.getElementById("schedule-message").value.trim();
  const time = document.getElementById("schedule-time").value;
  const type = scheduleTypeSelect.value;
  const weekdays = [...scheduleWeekdays.querySelectorAll(".weekday-btn.active")].map((b) => Number(b.dataset.day));
  const fireDate = scheduleDateInput.value || null;
  if (!title || !message) return setSchedulesStatus("请填写任务名称与提醒内容");
  if (!time) return setSchedulesStatus("请选择触发时间");
  if (type === "weekly" && !weekdays.length) return setSchedulesStatus("每周任务请至少选择一个周几");
  if (type === "once" && !fireDate) return setSchedulesStatus("仅一次的任务请选择日期");
  try {
    await apiRequest("/api/v1/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        message,
        schedule_type: type,
        time_of_day: time,
        ...(type === "weekly" ? { weekdays } : {}),
        ...(type === "once" ? { fire_date: fireDate } : {}),
      }),
    });
    setSchedulesStatus("已创建", true);
    showAppStatus("定时任务已创建", true);
    scheduleForm.reset();
    document.getElementById("schedule-time").value = "18:00";
    scheduleWeekdays.querySelectorAll(".weekday-btn.active").forEach((b) => b.classList.remove("active"));
    syncScheduleFormFields();
    loadSchedules();
  } catch (err) {
    setSchedulesStatus("创建失败：" + err.message);
  }
});

// ---- 全局事件流：定时任务触发推送 ----
// 定时提醒到达当前会话时安静地追加新消息；其他会话只点亮红点。
async function appendNewScheduledMessages(conversationId) {
  if (conversationId !== currentConversationId) return;
  try {
    const list = await apiRequest(`/api/v1/conversations/${conversationId}/messages?limit=6`);
    const items = Array.isArray(list) ? list : [];
    const known = new Set([...messages.querySelectorAll(".msg")].map((el) => el.dataset.msgId).filter(Boolean));
    let appended = false;
    for (const m of items) {
      if (known.has(String(m.id))) continue;
      ensureDayDivider(m.created_at);
      const node = createMessageNode(m);
      if (node) { node.dataset.msgId = String(m.id); messages.appendChild(node); appended = true; }
    }
    if (appended) scrollBottom();
  } catch { /* 静默降级 */ }
}

function initScheduleEvents() {
  if (typeof EventSource === "undefined") return;
  try {
    const source = new EventSource("/api/v1/events");
    source.addEventListener("schedule_fired", (e) => {
      let payload = null;
      try { payload = JSON.parse(e.data); } catch { return; }
      if (!payload) return;
      showAppStatus(`⏰ ${payload.title || "定时提醒"} 已触发`, true);
      if (window.__umamiPet) window.__umamiPet.setState("waving");
      if (payload.conversationId && payload.conversationId !== currentConversationId) {
        reminderConversations.add(payload.conversationId);
        renderConversationList();
      } else if (payload.conversationId) {
        appendNewScheduledMessages(payload.conversationId);
      }
    });
  } catch { /* 事件流不可用时静默降级 */ }
}
initScheduleEvents();

// ---- 成功反馈涟漪：确认/保存成功时从操作点扩散一圈品牌绿 ----
function spawnSuccessRipple(x, y) {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const dot = document.createElement("span");
  dot.className = "success-ripple";
  dot.setAttribute("aria-hidden", "true");
  if (typeof x === "number" && typeof y === "number") { dot.style.left = x + "px"; dot.style.top = y + "px"; }
  else { dot.style.left = window.innerWidth / 2 + "px"; dot.style.top = window.innerHeight * 0.4 + "px"; }
  document.body.appendChild(dot);
  setTimeout(() => dot.remove(), 700);
}

// ---- 时段氛围色调：晨/午/晚/夜切换极光基色（只写 CSS 变量，零动画开销） ----
(function initDayPhase() {
  const phaseFor = (h) => (h >= 5 && h < 11 ? "morning" : h >= 11 && h < 18 ? "day" : h >= 18 && h < 23 ? "evening" : "night");
  const apply = () => document.documentElement.setAttribute("data-dayphase", phaseFor(new Date().getHours()));
  apply();
  setInterval(apply, 60_000);
})();

// ---- 数据导出 ----
const exportBtn = document.getElementById("export-btn");
if (exportBtn) exportBtn.addEventListener("click", async () => {
  const original = exportBtn.textContent;
  try {
    exportBtn.disabled = true; exportBtn.textContent = "导出中…";
    const res = await fetch("/api/v1/export");
    if (!res.ok) throw new Error("导出失败");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showAppStatus("数据已导出", true);
  } catch (e) { showAppStatus("导出失败：" + e.message); }
  finally { exportBtn.disabled = false; exportBtn.textContent = original; }
});

// 新模态框：点击遮罩或 Esc 关闭
[favoritesModal, goalsModal, habitsModal, shoppingModal].forEach((m) => {
  if (!m) return;
  m.addEventListener("click", (e) => { if (e.target === m) closeModal(m); });
});

// ---- 移动端：会话侧栏抽屉 ----
const menuBtn = document.getElementById("menu-btn");
if (menuBtn) {
  const setSidebar = (open) => {
    document.body.classList.toggle("sidebar-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  };
  menuBtn.addEventListener("click", () => setSidebar(!document.body.classList.contains("sidebar-open")));
  // 选中会话后自动收起抽屉
  conversationList.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest(".conversation-item")) setSidebar(false);
  });
  document.addEventListener("click", (e) => {
    if (!document.body.classList.contains("sidebar-open")) return;
    if (e.target instanceof Element && (e.target.closest(".sidebar") || e.target.closest("#menu-btn"))) return;
    setSidebar(false);
  });
}

