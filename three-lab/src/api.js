import {
  MOCK_IMPRESSIONS,
  MOCK_QUESTIONS,
} from "./content.js";

const configuredApiBase = String(
  import.meta.env.VITE_API_BASE_URL ?? "",
).replace(/\/$/, "");
const useMockApi = !configuredApiBase && import.meta.env.DEV;
export const API_BASE = configuredApiBase || window.location.origin;

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `ray-${Date.now()}`;
}

async function apiRequest(path, options = {}) {
  if (useMockApi) {
    throw new Error("API_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`API_${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function normalizeKeyword(item) {
  const count = Number(item.count);
  if (!item?.id || !item?.label || !Number.isFinite(count) || count < 1) {
    return null;
  }
  return {
    id: String(item.id),
    label: String(item.label).slice(0, 12),
    count: Math.round(count),
  };
}

export async function getImpressions() {
  if (useMockApi) {
    return { data: MOCK_IMPRESSIONS, source: "mock" };
  }

  const payload = await apiRequest("/api/v1/impressions");
  const items = Array.isArray(payload?.items)
    ? payload.items.map(normalizeKeyword).filter(Boolean)
    : [];
  return { data: items, source: "api" };
}

export async function getPublishedQuestions() {
  if (useMockApi) {
    return { data: MOCK_QUESTIONS, source: "mock" };
  }

  const payload = await apiRequest(
    "/api/v1/questions?visibility=published",
  );
  const items = Array.isArray(payload?.items)
    ? payload.items.filter(
        (item) => item?.id && item?.question && item?.answer,
      )
    : [];
  return { data: items, source: "api" };
}

export async function submitQuestion(values) {
  if (useMockApi) {
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    return {
      id: createRequestId(),
      status: "pending",
      source: "mock",
    };
  }

  return apiRequest("/api/v1/questions", {
    method: "POST",
    body: JSON.stringify({
      ...values,
      requestId: createRequestId(),
    }),
  });
}

export async function submitInterview(values) {
  if (useMockApi) {
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    return {
      id: createRequestId(),
      status: "pending",
      source: "mock",
    };
  }

  return apiRequest("/api/v1/interviews", {
    method: "POST",
    body: JSON.stringify({
      ...values,
      requestId: createRequestId(),
    }),
  });
}
