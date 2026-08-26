const messages = document.getElementById("messages");
const pantry = document.getElementById("pantry");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send-btn");
const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const preview = document.getElementById("preview");
const previewImg = document.getElementById("preview-img");
const clearImg = document.getElementById("clear-img");

let pendingImage = null; // { base64, mimeType, dataUrl }

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
};

function scrollBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function addBubble(role) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + role;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  wrap.appendChild(bubble);
  messages.appendChild(wrap);
  scrollBottom();
  return bubble;
}

function addImage(dataUrl) {
  const wrap = document.createElement("div");
  wrap.className = "msg user";
  const img = document.createElement("img");
  img.className = "msg-img";
  img.src = dataUrl;
  wrap.appendChild(img);
  messages.appendChild(wrap);
  scrollBottom();
}

function addStatus() {
  const el = document.createElement("div");
  el.className = "status hidden";
  messages.appendChild(el);
  scrollBottom();
  return el;
}

function renderPantry(items) {
  pantry.innerHTML = "";
  const label = document.createElement("span");
  label.className = "pantry-label";
  label.textContent = "冰箱：";
  pantry.appendChild(label);
  if (!items || items.length === 0) {
    const empty = document.createElement("span");
    empty.className = "pantry-empty";
    empty.textContent = "暂无食材";
    pantry.appendChild(empty);
    return;
  }
  for (const it of items) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `${it.name}${it.quantity ? " " + it.quantity : ""}`;
    pantry.appendChild(chip);
  }
}

async function loadPantry() {
  try {
    const res = await fetch("/api/ingredients");
    const data = await res.json();
    renderPantry(data.ingredients);
  } catch {
    /* 忽略首屏加载失败 */
  }
}

attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
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
});

clearImg.addEventListener("click", () => {
  pendingImage = null;
  preview.classList.add("hidden");
  fileInput.value = "";
});

function handleEvent(evt, bubble, status) {
  if (evt.type === "delta") {
    bubble.textContent += evt.text;
    scrollBottom();
  } else if (evt.type === "tool_start") {
    status.textContent = TOOL_LABELS[evt.name] || `正在执行 ${evt.name}…`;
    status.classList.remove("hidden");
    scrollBottom();
  } else if (evt.type === "tool_end") {
    status.classList.add("hidden");
  } else if (evt.type === "error") {
    bubble.textContent = "出错：" + evt.message;
    status.classList.add("hidden");
  }
}

async function send() {
  const text = input.value.trim();
  if (!text && !pendingImage) return;
  input.value = "";

  if (pendingImage) addImage(pendingImage.dataUrl);
  if (text) {
    const b = addBubble("user");
    b.textContent = text;
  }

  const imagePayload = pendingImage;
  pendingImage = null;
  preview.classList.add("hidden");
  fileInput.value = "";

  const bubble = addBubble("assistant");
  const status = addStatus();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        imageBase64: imagePayload ? imagePayload.base64 : undefined,
        mimeType: imagePayload ? imagePayload.mimeType : undefined,
      }),
    });
    if (!res.ok || !res.body) throw new Error("请求失败：" + res.status);

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
              handleEvent(JSON.parse(line.slice(6)), bubble, status);
            } catch {
              /* 忽略坏块 */
            }
          }
        }
      }
    }
  } catch (e) {
    bubble.textContent = "出错：" + e.message;
  } finally {
    status.remove();
    scrollBottom();
    loadPantry();
  }
}

sendBtn.addEventListener("click", send);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

loadPantry();

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
    renderKeyHint();
  } catch {
    /* 忽略 */
  }
}

function renderKeyHint() {
  const p = providerSelect.value;
  const has = currentSettings && currentSettings.hasKey && currentSettings.hasKey[p];
  apiKeyInput.placeholder = has ? "已保存 key（留空则不修改）" : "请输入该模型的 API Key";
  customFields.classList.toggle("hidden", p !== "custom");
}

function showStatus(msg, ok) {
  settingsStatus.textContent = msg;
  settingsStatus.className = "settings-status" + (ok === true ? " ok" : ok === false ? " err" : "");
}

settingsBtn.addEventListener("click", () => {
  loadSettings();
  settingsModal.classList.remove("hidden");
});

settingsClose.addEventListener("click", () => settingsModal.classList.add("hidden"));
providerSelect.addEventListener("change", renderKeyHint);

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
    const body = { modelName, apiKey };
    if (modelName === "custom") {
      body.baseUrl = baseUrlInput.value.trim();
      body.modelId = modelIdInput.value.trim();
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
    }
  } catch (e) {
    showStatus("保存失败：" + e.message, false);
  }
});
