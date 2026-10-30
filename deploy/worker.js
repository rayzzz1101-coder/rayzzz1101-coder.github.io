const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

const ALLOWED_ORIGINS = new Set([
  "https://rayzzz1101-coder.github.io",
]);

const LIMITS = {
  question: 500,
  name: 24,
  answer: 2000,
  interviewAnswer: 280,
  keywords: 6,
  keywordLength: 16,
  bodyBytes: 32768,
  rateCount: 5,
  rateWindowMs: 10 * 60 * 1000,
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...SECURITY_HEADERS },
  });
}

function errorResponse(message, status) {
  return jsonResponse({ error: message }, status);
}

function withCors(response, request) {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set(
    "access-control-allow-headers",
    "Accept, Authorization, Content-Type",
  );
  headers.set("access-control-max-age", "86400");
  headers.append("vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function readJson(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!contentLength || contentLength > LIMITS.bodyBytes) return null;
  const text = await request.text();
  if (text.length > LIMITS.bodyBytes) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

async function digest(value) {
  return new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    ),
  );
}

async function secureTextEqual(left, right) {
  const [leftDigest, rightDigest] = await Promise.all([
    digest(left),
    digest(right),
  ]);
  let difference = leftDigest.length ^ rightDigest.length;
  const length = Math.min(leftDigest.length, rightDigest.length);
  for (let index = 0; index < length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }
  return difference === 0;
}

async function isAuthorized(request, env) {
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 12) return false;
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return false;
  return secureTextEqual(
    authorization.slice(7).trim(),
    env.ADMIN_TOKEN,
  );
}

async function hashClientAddress(request, env) {
  const address =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const bytes = await digest(
    `${address}:${env.ADMIN_TOKEN || "local"}`,
  );
  return Array.from(
    bytes,
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function checkRateLimit(request, env) {
  const now = new Date();
  const cutoff = new Date(
    now.getTime() - LIMITS.rateWindowMs,
  ).toISOString();
  const clientHash = await hashClientAddress(request, env);
  await env.DB.prepare(
    "DELETE FROM question_submission_events WHERE created_at < ?",
  )
    .bind(cutoff)
    .run();
  const recent = await env.DB.prepare(
    `SELECT COUNT(*) AS count
     FROM question_submission_events
     WHERE ip_hash = ? AND created_at >= ?`,
  )
    .bind(clientHash, cutoff)
    .first();
  if (Number(recent?.count || 0) >= LIMITS.rateCount) {
    return { allowed: false };
  }
  await env.DB.prepare(
    `INSERT INTO question_submission_events (ip_hash, created_at)
     VALUES (?, ?)`,
  )
    .bind(clientHash, now.toISOString())
    .run();
  return { allowed: true, nowIso: now.toISOString() };
}

function normalizeKeywords(value) {
  const rawWords = Array.isArray(value)
    ? value
    : String(value || "").split(/[,，、;；\n]+/);
  const words = rawWords
    .map((word) => String(word || "").trim())
    .filter(Boolean)
    .filter((word, index, all) => all.indexOf(word) === index);
  if (
    !words.length ||
    words.length > LIMITS.keywords ||
    words.some((word) => word.length > LIMITS.keywordLength)
  ) {
    return null;
  }
  return words;
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapPublicQuestion(row) {
  return {
    id: row.id,
    question: row.content,
    answer: row.answer || "",
    askedAt: row.answered_at || row.created_at,
    displayName: row.name || "",
  };
}

function mapAdminQuestion(row) {
  return {
    id: row.id,
    content: row.content,
    name: row.name || "",
    answer: row.answer || "",
    public: Boolean(row.is_public),
    createdAt: row.created_at,
    answeredAt: row.answered_at || null,
  };
}

function mapMemory(row) {
  return {
    id: row.id,
    words: parseJsonArray(row.words),
    createdAt: row.created_at,
    approved: Boolean(row.approved),
    approvedAt: row.approved_at || null,
  };
}

function mapInterview(row) {
  return {
    id: row.id,
    answers: parseJsonArray(row.answers),
    consentToKeywords: Boolean(row.consent_to_keywords),
    keywords: parseJsonArray(row.keywords),
    public: Boolean(row.is_public),
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || null,
  };
}

async function listPublishedQuestions(env) {
  const result = await env.DB.prepare(
    `SELECT id, content, name, answer, created_at, answered_at
     FROM questions
     WHERE is_public = 1 AND answer <> ''
     ORDER BY answered_at DESC, id DESC
     LIMIT 50`,
  ).all();
  return (result.results || []).map(mapPublicQuestion);
}

async function listAdminQuestions(env) {
  const result = await env.DB.prepare(
    `SELECT id, content, name, answer, is_public, created_at, answered_at
     FROM questions
     ORDER BY id DESC`,
  ).all();
  return (result.results || []).map(mapAdminQuestion);
}

async function listPublicImpressions(env) {
  const [memories, interviews] = await Promise.all([
    env.DB.prepare(
      "SELECT words FROM memories WHERE approved = 1",
    ).all(),
    env.DB.prepare(
      `SELECT keywords FROM interview_submissions
       WHERE is_public = 1`,
    ).all(),
  ]);
  const counts = new Map();
  [...(memories.results || []), ...(interviews.results || [])].forEach(
    (row) => {
      const words = parseJsonArray(row.words ?? row.keywords);
      new Set(words.map((word) => String(word).trim()).filter(Boolean))
        .forEach((word) => {
          counts.set(word, (counts.get(word) || 0) + 1);
        });
    },
  );
  return [...counts.entries()]
    .map(([label, count], index) => ({
      id: `keyword-${index + 1}`,
      label,
      count,
    }))
    .sort((first, second) => second.count - first.count);
}

async function createQuestion(request, env) {
  const payload = await readJson(request);
  if (!payload) return errorResponse("请求格式不正确。", 400);
  if (String(payload.website || "").trim()) {
    return jsonResponse({ data: { status: "pending" } }, 201);
  }

  const content = String(payload.content ?? payload.question ?? "").trim();
  const name = String(payload.name ?? payload.displayName ?? "").trim();
  if (content.length < 2 || content.length > LIMITS.question) {
    return errorResponse(
      `问题需要 2 到 ${LIMITS.question} 个字符。`,
      400,
    );
  }
  if (name.length > LIMITS.name) {
    return errorResponse(`称呼不能超过 ${LIMITS.name} 个字符。`, 400);
  }

  const rate = await checkRateLimit(request, env);
  if (!rate.allowed) {
    return errorResponse("提交得有点频繁，请稍后再试。", 429);
  }
  const insert = await env.DB.prepare(
    `INSERT INTO questions (content, name, created_at)
     VALUES (?, ?, ?)`,
  )
    .bind(content, name, rate.nowIso)
    .run();
  return jsonResponse(
    {
      data: {
        id: insert.meta?.last_row_id || null,
        status: "pending",
      },
    },
    201,
  );
}

async function createInterview(request, env) {
  const payload = await readJson(request);
  if (!payload) return errorResponse("请求格式不正确。", 400);
  if (String(payload.website || "").trim()) {
    return jsonResponse({ data: { status: "pending" } }, 201);
  }

  const answers = Array.isArray(payload.answers)
    ? payload.answers
        .map((answer) => ({
          promptId: String(answer?.promptId || "").slice(0, 40),
          text: String(answer?.text || "").trim().slice(
            0,
            LIMITS.interviewAnswer,
          ),
        }))
        .filter((answer) => answer.promptId)
    : [];
  if (answers.length !== 3) {
    return errorResponse("采访需要完整提交三道问题。", 400);
  }

  const rate = await checkRateLimit(request, env);
  if (!rate.allowed) {
    return errorResponse("提交得有点频繁，请稍后再试。", 429);
  }
  const requestId = String(payload.requestId || "").slice(0, 80) || null;
  const existing = requestId
    ? await env.DB.prepare(
        "SELECT id FROM interview_submissions WHERE request_id = ?",
      )
        .bind(requestId)
        .first()
    : null;
  if (existing) {
    return jsonResponse({ data: { id: existing.id, status: "pending" } });
  }
  const insert = await env.DB.prepare(
    `INSERT INTO interview_submissions
      (request_id, answers, consent_to_keywords, created_at)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(
      requestId,
      JSON.stringify(answers),
      payload.consentToKeywords ? 1 : 0,
      rate.nowIso,
    )
    .run();
  return jsonResponse(
    {
      data: {
        id: insert.meta?.last_row_id || null,
        status: "pending",
      },
    },
    201,
  );
}

async function saveAnswer(request, env, questionId) {
  const payload = await readJson(request);
  if (!payload) return errorResponse("请求格式不正确。", 400);
  const answer = String(payload.answer || "").trim();
  const isPublic = Boolean(payload.public);
  if (answer.length > LIMITS.answer) {
    return errorResponse(`回答不能超过 ${LIMITS.answer} 个字符。`, 400);
  }
  if (isPublic && !answer) {
    return errorResponse("公开之前需要先填写回答。", 400);
  }
  const answeredAt = answer ? new Date().toISOString() : null;
  const result = await env.DB.prepare(
    `UPDATE questions
     SET answer = ?, is_public = ?, answered_at = ?
     WHERE id = ?`,
  )
    .bind(answer, isPublic ? 1 : 0, answeredAt, questionId)
    .run();
  if (!result.meta?.changes) {
    return errorResponse("没有找到这条问题。", 404);
  }
  return jsonResponse({
    ok: true,
    id: questionId,
    public: isPublic,
    answeredAt,
  });
}

async function listAdminInterviews(env) {
  const result = await env.DB.prepare(
    `SELECT id, answers, consent_to_keywords, keywords, is_public,
            created_at, reviewed_at
     FROM interview_submissions
     ORDER BY id DESC`,
  ).all();
  return (result.results || []).map(mapInterview);
}

async function saveInterviewKeywords(request, env, interviewId) {
  const payload = await readJson(request);
  if (!payload) return errorResponse("请求格式不正确。", 400);
  const isPublic = Boolean(payload.public);
  const keywords = normalizeKeywords(payload.keywords);
  if (isPublic && !keywords) {
    return errorResponse(
      `公开前需要填写 1 到 ${LIMITS.keywords} 个关键词。`,
      400,
    );
  }
  const reviewedAt = isPublic ? new Date().toISOString() : null;
  const result = await env.DB.prepare(
    `UPDATE interview_submissions
     SET keywords = ?, is_public = ?, reviewed_at = ?
     WHERE id = ?`,
  )
    .bind(
      JSON.stringify(keywords || []),
      isPublic ? 1 : 0,
      reviewedAt,
      interviewId,
    )
    .run();
  if (!result.meta?.changes) {
    return errorResponse("没有找到这份采访。", 404);
  }
  return jsonResponse({
    ok: true,
    id: interviewId,
    public: isPublic,
    keywords: keywords || [],
    reviewedAt,
  });
}

async function updateMemoryApproval(request, env, memoryId) {
  const payload = await readJson(request);
  if (!payload) return errorResponse("请求格式不正确。", 400);
  const approved = Boolean(payload.approved);
  const approvedAt = approved ? new Date().toISOString() : null;
  const result = await env.DB.prepare(
    `UPDATE memories
     SET approved = ?, approved_at = ?
     WHERE id = ?`,
  )
    .bind(approved ? 1 : 0, approvedAt, memoryId)
    .run();
  if (!result.meta?.changes) {
    return errorResponse("没有找到这条记忆。", 404);
  }
  return jsonResponse({
    ok: true,
    id: memoryId,
    approved,
    approvedAt,
  });
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/health" && request.method === "GET") {
    return jsonResponse({ ok: true });
  }
  if (path === "/api/v1/impressions" && request.method === "GET") {
    return jsonResponse({ items: await listPublicImpressions(env) });
  }
  if (
    (path === "/api/v1/questions" ||
      path === "/api/questions/public") &&
    request.method === "GET"
  ) {
    const questions = await listPublishedQuestions(env);
    return jsonResponse(
      path === "/api/questions/public"
        ? { questions }
        : { items: questions },
    );
  }
  if (
    (path === "/api/v1/questions" || path === "/api/questions") &&
    request.method === "POST"
  ) {
    return createQuestion(request, env);
  }
  if (path === "/api/v1/interviews" && request.method === "POST") {
    return createInterview(request, env);
  }
  if (path === "/api/memories/public" && request.method === "GET") {
    const result = await env.DB.prepare(
      `SELECT id, words, created_at, approved_at
       FROM memories
       WHERE approved = 1
       ORDER BY approved_at DESC, id DESC
       LIMIT 100`,
    ).all();
    return jsonResponse({
      memories: (result.results || []).map(mapMemory),
    });
  }

  if (
    (path === "/api/questions/admin" || path === "/api/v1/admin/questions") &&
    request.method === "GET"
  ) {
    if (!(await isAuthorized(request, env))) {
      return errorResponse("管理密码不正确。", 401);
    }
    return jsonResponse({ questions: await listAdminQuestions(env) });
  }
  if (
    (path === "/api/interviews/admin" ||
      path === "/api/v1/interviews/admin") &&
    request.method === "GET"
  ) {
    if (!(await isAuthorized(request, env))) {
      return errorResponse("管理密码不正确。", 401);
    }
    return jsonResponse({
      interviews: await listAdminInterviews(env),
    });
  }
  if (path === "/api/memories/admin" && request.method === "GET") {
    if (!(await isAuthorized(request, env))) {
      return errorResponse("管理密码不正确。", 401);
    }
    const result = await env.DB.prepare(
      `SELECT id, words, created_at, approved, approved_at
       FROM memories ORDER BY id DESC`,
    ).all();
    return jsonResponse({
      memories: (result.results || []).map(mapMemory),
    });
  }

  const answerMatch = path.match(
    /^\/api\/(?:v1\/)?questions\/(\d+)\/answer$/,
  );
  if (answerMatch && request.method === "POST") {
    if (!(await isAuthorized(request, env))) {
      return errorResponse("管理密码不正确。", 401);
    }
    return saveAnswer(request, env, Number(answerMatch[1]));
  }
  const interviewReviewMatch = path.match(
    /^\/api\/v1\/interviews\/(\d+)\/keywords$/,
  );
  if (interviewReviewMatch && request.method === "POST") {
    if (!(await isAuthorized(request, env))) {
      return errorResponse("管理密码不正确。", 401);
    }
    return saveInterviewKeywords(
      request,
      env,
      Number(interviewReviewMatch[1]),
    );
  }
  const legacyMemoryMatch = path.match(
    /^\/api\/memories\/(\d+)\/approve$/,
  );
  if (legacyMemoryMatch && request.method === "POST") {
    if (!(await isAuthorized(request, env))) {
      return errorResponse("管理密码不正确。", 401);
    }
    return updateMemoryApproval(
      request,
      env,
      Number(legacyMemoryMatch[1]),
    );
  }

  return errorResponse("接口不存在。", 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) {
        if (request.method === "OPTIONS") {
          return withCors(
            new Response(null, {
              status: 204,
              headers: SECURITY_HEADERS,
            }),
            request,
          );
        }
        return withCors(await handleApi(request, env), request);
      }
      return withSecurityHeaders(await env.ASSETS.fetch(request));
    } catch (error) {
      console.error("Worker request failed", error);
      if (url.pathname.startsWith("/api/")) {
        return withCors(
          errorResponse("服务器暂时不可用。", 500),
          request,
        );
      }
      return new Response("服务器暂时不可用。", {
        status: 500,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          ...SECURITY_HEADERS,
        },
      });
    }
  },
};
