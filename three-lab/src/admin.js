import { API_BASE } from "./api.js";

const tokenKey = "ray-notes-admin-token";
const loginPanel = document.querySelector("#login-panel");
const loginForm = document.querySelector("#login-form");
const tokenInput = document.querySelector("#admin-token");
const loginStatus = document.querySelector("#login-status");
const dashboard = document.querySelector("#dashboard");
const adminStatus = document.querySelector("#admin-status");
const questionsRoot = document.querySelector("#admin-questions");
const interviewsRoot = document.querySelector("#admin-interviews");
const memoriesRoot = document.querySelector("#admin-memories");
const impressionsRoot = document.querySelector("#public-impressions");
const questionTotal = document.querySelector("#question-total");
const interviewTotal = document.querySelector("#interview-total");
const legacyMemoryTotal = document.querySelector("#legacy-memory-total");
let token = sessionStorage.getItem(tokenKey) || "";

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function authHeaders(json = false) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function authorizedFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      ...authHeaders(Boolean(options.body)),
      ...options.headers,
    },
  });
  if (response.status === 401) {
    sessionStorage.removeItem(tokenKey);
    token = "";
    showLogin("管理密码不正确。");
    throw new Error("UNAUTHORIZED");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "请求失败。");
  }
  return data;
}

function showLogin(message = "") {
  loginPanel.hidden = false;
  dashboard.hidden = true;
  setStatus(loginStatus, message, message ? "error" : "");
}

function showDashboard() {
  loginPanel.hidden = true;
  dashboard.hidden = false;
}

function renderQuestion(item) {
  const article = createElement("article", "record-card");
  const copy = createElement("div");
  copy.append(
    createElement(
      "p",
      "record-meta",
      `#${String(item.id).padStart(3, "0")} / ${formatDate(item.createdAt)}`,
    ),
    createElement("p", "record-question", item.content),
    createElement(
      "p",
      "record-author",
      item.name ? `FROM / ${item.name}` : "FROM / 匿名",
    ),
  );

  const editor = createElement("div", "record-editor");
  const answer = createElement("textarea");
  answer.placeholder = "写下回答…";
  answer.maxLength = 2000;
  answer.value = item.answer || "";
  const controls = createElement("div", "record-controls");
  const publicLabel = createElement("label");
  const publicInput = createElement("input");
  publicInput.type = "checkbox";
  publicInput.checked = Boolean(item.public);
  publicLabel.append(publicInput, document.createTextNode("公开展示这条问答"));
  const save = createElement("button", "record-save", "保存");
  save.type = "button";
  save.addEventListener("click", async () => {
    save.disabled = true;
    setStatus(adminStatus, "正在保存来信…");
    try {
      await authorizedFetch(`/api/questions/${item.id}/answer`, {
        method: "POST",
        body: JSON.stringify({
          answer: answer.value.trim(),
          public: publicInput.checked,
        }),
      });
      setStatus(adminStatus, "来信已保存。", "success");
      await loadPublicImpressions();
    } catch (error) {
      if (error.message !== "UNAUTHORIZED") {
        setStatus(adminStatus, error.message, "error");
      }
    } finally {
      save.disabled = false;
    }
  });
  controls.append(publicLabel, save);
  editor.append(answer, controls);
  article.append(copy, editor);
  return article;
}

const prompts = [
  "第一次注意到",
  "最能代表的细节",
  "一句印象",
];

function renderInterview(item) {
  const article = createElement("article", "record-card");
  const copy = createElement("div");
  const meta = createElement(
    "p",
    "record-meta",
    `#${String(item.id).padStart(3, "0")} / ${formatDate(item.createdAt)} / ${
      item.public ? "已公开关键词" : "待审核"
    }`,
  );
  copy.append(meta);
  item.answers.forEach((answer, index) => {
    const block = createElement("div", "interview-answer");
    block.append(
      createElement("span", null, `${String(index + 1).padStart(2, "0")} / ${prompts[index]}`),
      createElement("p", null, answer.text || "未填写"),
    );
    copy.append(block);
  });

  const editor = createElement("div", "record-editor");
  const keywordLabel = createElement("label", null, "审核后的关键词");
  const keywordInput = createElement("input");
  keywordInput.type = "text";
  keywordInput.placeholder = "温柔，安静，可靠";
  keywordInput.value = item.keywords.join("，");
  const controls = createElement("div", "record-controls");
  const publicLabel = createElement("label");
  const publicInput = createElement("input");
  publicInput.type = "checkbox";
  publicInput.checked = Boolean(item.public);
  publicLabel.append(publicInput, document.createTextNode("在主页公开"));
  const save = createElement("button", "record-save", "保存关键词");
  save.type = "button";
  save.addEventListener("click", async () => {
    save.disabled = true;
    setStatus(adminStatus, "正在保存采访关键词…");
    try {
      await authorizedFetch(`/api/v1/interviews/${item.id}/keywords`, {
        method: "POST",
        body: JSON.stringify({
          keywords: keywordInput.value,
          public: publicInput.checked,
        }),
      });
      setStatus(adminStatus, "采访关键词已保存。", "success");
      await Promise.all([loadInterviews(), loadPublicImpressions()]);
    } catch (error) {
      if (error.message !== "UNAUTHORIZED") {
        setStatus(adminStatus, error.message, "error");
      }
    } finally {
      save.disabled = false;
    }
  });
  controls.append(publicLabel, save);
  editor.append(keywordLabel, keywordInput, controls);
  article.append(copy, editor);
  return article;
}

function renderLegacyMemory(item) {
  const article = createElement("article", "record-card");
  const copy = createElement("div");
  copy.append(
    createElement(
      "p",
      "record-meta",
      `#${String(item.id).padStart(3, "0")} / ${formatDate(item.createdAt)} / ${
        item.approved ? "已公开" : "待审核"
      }`,
    ),
  );
  const words = createElement("div", "keyword-list");
  item.words.forEach((word) => {
    words.append(createElement("span", "keyword", word));
  });
  copy.append(words);

  const editor = createElement("div", "record-editor");
  const button = createElement(
    "button",
    "record-save",
    item.approved ? "撤回公开" : "通过并公开",
  );
  button.type = "button";
  button.addEventListener("click", async () => {
    button.disabled = true;
    setStatus(adminStatus, item.approved ? "正在撤回…" : "正在公开…");
    try {
      await authorizedFetch(`/api/memories/${item.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ approved: !item.approved }),
      });
      setStatus(adminStatus, "旧版记忆词已更新。", "success");
      await Promise.all([loadLegacyMemories(), loadPublicImpressions()]);
    } catch (error) {
      if (error.message !== "UNAUTHORIZED") {
        setStatus(adminStatus, error.message, "error");
      }
    } finally {
      button.disabled = false;
    }
  });
  editor.append(button);
  article.append(copy, editor);
  return article;
}

async function loadQuestions() {
  const data = await authorizedFetch("/api/questions/admin");
  const items = data.questions || [];
  questionTotal.textContent = String(items.length).padStart(2, "0");
  questionsRoot.replaceChildren();
  if (!items.length) {
    questionsRoot.append(createElement("p", "empty", "还没有收到来信。"));
    return;
  }
  items.forEach((item) => questionsRoot.append(renderQuestion(item)));
}

async function loadInterviews() {
  const data = await authorizedFetch("/api/v1/interviews/admin");
  const items = data.interviews || [];
  interviewTotal.textContent = String(items.length).padStart(2, "0");
  interviewsRoot.replaceChildren();
  if (!items.length) {
    interviewsRoot.append(createElement("p", "empty", "还没有收到采访。"));
    return;
  }
  items.forEach((item) => interviewsRoot.append(renderInterview(item)));
}

async function loadLegacyMemories() {
  const data = await authorizedFetch("/api/memories/admin");
  const items = data.memories || [];
  legacyMemoryTotal.textContent = String(items.length).padStart(2, "0");
  memoriesRoot.replaceChildren();
  if (!items.length) {
    memoriesRoot.append(createElement("p", "empty", "没有旧版记忆词。"));
    return;
  }
  items.forEach((item) => memoriesRoot.append(renderLegacyMemory(item)));
}

async function loadPublicImpressions() {
  const response = await fetch(`${API_BASE}/api/v1/impressions`, {
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  impressionsRoot.replaceChildren();
  (data.items || []).forEach((item) => {
    const chip = createElement("span", "keyword", item.label);
    chip.append(createElement("span", null, item.count));
    impressionsRoot.append(chip);
  });
  if (!impressionsRoot.children.length) {
    impressionsRoot.append(createElement("p", "empty", "暂时没有公开印象。"));
  }
}

async function loadAll() {
  if (!token) {
    showLogin();
    return;
  }
  setStatus(adminStatus, "正在读取后台…");
  try {
    await Promise.all([
      loadQuestions(),
      loadInterviews(),
      loadLegacyMemories(),
      loadPublicImpressions(),
    ]);
    showDashboard();
    setStatus(adminStatus, "");
  } catch (error) {
    if (error.message !== "UNAUTHORIZED") {
      setStatus(adminStatus, error.message, "error");
    }
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  token = tokenInput.value.trim();
  sessionStorage.setItem(tokenKey, token);
  setStatus(loginStatus, "正在验证…");
  try {
    await authorizedFetch("/api/questions/admin");
    tokenInput.value = "";
    await loadAll();
  } catch (error) {
    if (error.message === "UNAUTHORIZED") {
      setStatus(loginStatus, "管理密码不正确。", "error");
    } else {
      setStatus(loginStatus, error.message, "error");
    }
  }
});

document.querySelector("#refresh-admin").addEventListener("click", loadAll);
document.querySelector("#logout-admin").addEventListener("click", () => {
  sessionStorage.removeItem(tokenKey);
  token = "";
  showLogin();
});

loadAll();
