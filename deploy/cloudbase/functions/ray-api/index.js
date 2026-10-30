import { createHash, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import cloudbase from "@cloudbase/node-sdk";

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
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5175",
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

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});

let db;

function database() {
  db ??= app.rdb({ schema: "public" });
  return db;
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Accept, Authorization, Content-Type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function sendJson(request, response, payload, status = 200) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    ...JSON_HEADERS,
    ...SECURITY_HEADERS,
    ...corsHeaders(request),
    "content-length": Buffer.byteLength(body),
  });
  response.end(body);
}

function sendError(request, response, message, status) {
  sendJson(request, response, { error: message }, status);
}

async function readJson(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > LIMITS.bodyBytes) return null;
    chunks.push(chunk);
  }
  if (!total) return null;
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function digest(value) {
  return createHash("sha256").update(value).digest();
}

function secureTextEqual(left, right) {
  const leftDigest = digest(String(left));
  const rightDigest = digest(String(right));
  return timingSafeEqual(leftDigest, rightDigest);
}

function isAuthorized(request) {
  const configured = String(process.env.ADMIN_TOKEN || "");
  if (configured.length < 12) return false;
  const authorization = String(request.headers.authorization || "");
  if (!authorization.startsWith("Bearer ")) return false;
  return secureTextEqual(authorization.slice(7).trim(), configured);
}

function requestIp(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return (
    forwarded ||
    String(request.headers["x-real-ip"] || "") ||
    String(request.socket.remoteAddress || "") ||
    "unknown"
  );
}

function clientHash(request) {
  return createHash("sha256")
    .update(`${requestIp(request)}:${process.env.ADMIN_TOKEN || "local"}`)
    .digest("hex");
}

async function checkRateLimit(request) {
  const now = new Date();
  const cutoff = new Date(
    now.getTime() - LIMITS.rateWindowMs,
  ).toISOString();
  const hash = clientHash(request);

  await database()
    .from("question_submission_events")
    .delete()
    .lt("created_at", cutoff);

  const recent = await database()
    .from("question_submission_events")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", hash)
    .gte("created_at", cutoff);
  if (recent.error) throw recent.error;
  if (Number(recent.count || 0) >= LIMITS.rateCount) {
    return { allowed: false };
  }

  const inserted = await database()
    .from("question_submission_events")
    .insert({ ip_hash: hash, created_at: now.toISOString() });
  if (inserted.error) throw inserted.error;
  return { allowed: true, nowIso: now.toISOString() };
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

async function selectRows(query) {
  const result = await query;
  if (result.error) throw result.error;
  return Array.isArray(result.data) ? result.data : [];
}

async function listPublishedQuestions() {
  const rows = await selectRows(
    database()
      .from("questions")
      .select("id, content, name, answer, created_at, answered_at")
      .eq("is_public", true)
      .neq("answer", "")
      .order("answered_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(50),
  );
  return rows.map(mapPublicQuestion);
}

async function listAdminQuestions() {
  const rows = await selectRows(
    database()
      .from("questions")
      .select("id, content, name, answer, is_public, created_at, answered_at")
      .order("id", { ascending: false }),
  );
  return rows.map(mapAdminQuestion);
}

async function listAdminInterviews() {
  const rows = await selectRows(
    database()
      .from("interview_submissions")
      .select(
        "id, answers, consent_to_keywords, keywords, is_public, created_at, reviewed_at",
      )
      .order("id", { ascending: false }),
  );
  return rows.map(mapInterview);
}

async function listPublicImpressions() {
  const [memoryRows, interviewRows] = await Promise.all([
    selectRows(
      database()
        .from("memories")
        .select("words")
        .eq("approved", true),
    ),
    selectRows(
      database()
        .from("interview_submissions")
        .select("keywords")
        .eq("is_public", true),
    ),
  ]);

  const counts = new Map();
  [...memoryRows, ...interviewRows].forEach((row) => {
    const words = parseJsonArray(row.words ?? row.keywords);
    new Set(words.map((word) => String(word).trim()).filter(Boolean))
      .forEach((word) => {
        counts.set(word, (counts.get(word) || 0) + 1);
      });
  });

  return [...counts.entries()]
    .map(([label, count], index) => ({
      id: `keyword-${index + 1}`,
      label,
      count,
    }))
    .sort((first, second) => second.count - first.count);
}

async function createQuestion(request, response) {
  const payload = await readJson(request);
  if (!payload) return sendError(request, response, "请求格式不正确。", 400);
  if (String(payload.website || "").trim()) {
    return sendJson(
      request,
      response,
      { data: { status: "pending" } },
      201,
    );
  }

  const content = String(payload.content ?? payload.question ?? "").trim();
  const name = String(payload.name ?? payload.displayName ?? "").trim();
  if (content.length < 2 || content.length > LIMITS.question) {
    return sendError(
      request,
      response,
      `问题需要 2 到 ${LIMITS.question} 个字符。`,
      400,
    );
  }
  if (name.length > LIMITS.name) {
    return sendError(
      request,
      response,
      `称呼不能超过 ${LIMITS.name} 个字符。`,
      400,
    );
  }

  const rate = await checkRateLimit(request);
  if (!rate.allowed) {
    return sendError(request, response, "提交得有点频繁，请稍后再试。", 429);
  }

  const result = await database()
    .from("questions")
    .insert({ content, name, created_at: rate.nowIso })
    .select("id")
    .single();
  if (result.error) throw result.error;
  return sendJson(
    request,
    response,
    { data: { id: result.data?.id || null, status: "pending" } },
    201,
  );
}

async function createInterview(request, response) {
  const payload = await readJson(request);
  if (!payload) return sendError(request, response, "请求格式不正确。", 400);
  if (String(payload.website || "").trim()) {
    return sendJson(
      request,
      response,
      { data: { status: "pending" } },
      201,
    );
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
    return sendError(request, response, "采访需要完整提交三道问题。", 400);
  }

  const rate = await checkRateLimit(request);
  if (!rate.allowed) {
    return sendError(request, response, "提交得有点频繁，请稍后再试。", 429);
  }

  const requestId = String(payload.requestId || "").slice(0, 80) || null;
  if (requestId) {
    const existing = await database()
      .from("interview_submissions")
      .select("id")
      .eq("request_id", requestId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.id) {
      return sendJson(request, response, {
        data: { id: existing.data.id, status: "pending" },
      });
    }
  }

  const inserted = await database()
    .from("interview_submissions")
    .insert({
      request_id: requestId,
      answers,
      consent_to_keywords: Boolean(payload.consentToKeywords),
      created_at: rate.nowIso,
    })
    .select("id")
    .single();
  if (inserted.error) throw inserted.error;
  return sendJson(
    request,
    response,
    { data: { id: inserted.data?.id || null, status: "pending" } },
    201,
  );
}

async function saveAnswer(request, response, questionId) {
  const payload = await readJson(request);
  if (!payload) return sendError(request, response, "请求格式不正确。", 400);
  const answer = String(payload.answer || "").trim();
  const isPublic = Boolean(payload.public);
  if (answer.length > LIMITS.answer) {
    return sendError(
      request,
      response,
      `回答不能超过 ${LIMITS.answer} 个字符。`,
      400,
    );
  }
  if (isPublic && !answer) {
    return sendError(request, response, "公开之前需要先填写回答。", 400);
  }

  const answeredAt = answer ? new Date().toISOString() : null;
  const result = await database()
    .from("questions")
    .update({ answer, is_public: isPublic, answered_at: answeredAt })
    .eq("id", questionId)
    .select("id");
  if (result.error) throw result.error;
  if (!result.data?.length) {
    return sendError(request, response, "没有找到这条问题。", 404);
  }
  return sendJson(request, response, {
    ok: true,
    id: questionId,
    public: isPublic,
    answeredAt,
  });
}

async function saveInterviewKeywords(request, response, interviewId) {
  const payload = await readJson(request);
  if (!payload) return sendError(request, response, "请求格式不正确。", 400);
  const isPublic = Boolean(payload.public);
  const keywords = normalizeKeywords(payload.keywords);
  if (isPublic && !keywords) {
    return sendError(
      request,
      response,
      `公开前需要填写 1 到 ${LIMITS.keywords} 个关键词。`,
      400,
    );
  }

  const reviewedAt = isPublic ? new Date().toISOString() : null;
  const result = await database()
    .from("interview_submissions")
    .update({
      keywords: keywords || [],
      is_public: isPublic,
      reviewed_at: reviewedAt,
    })
    .eq("id", interviewId)
    .select("id");
  if (result.error) throw result.error;
  if (!result.data?.length) {
    return sendError(request, response, "没有找到这份采访。", 404);
  }
  return sendJson(request, response, {
    ok: true,
    id: interviewId,
    public: isPublic,
    keywords: keywords || [],
    reviewedAt,
  });
}

async function updateMemoryApproval(request, response, memoryId) {
  const payload = await readJson(request);
  if (!payload) return sendError(request, response, "请求格式不正确。", 400);
  const approved = Boolean(payload.approved);
  const approvedAt = approved ? new Date().toISOString() : null;
  const result = await database()
    .from("memories")
    .update({ approved, approved_at: approvedAt })
    .eq("id", memoryId)
    .select("id");
  if (result.error) throw result.error;
  if (!result.data?.length) {
    return sendError(request, response, "没有找到这条记忆。", 404);
  }
  return sendJson(request, response, {
    ok: true,
    id: memoryId,
    approved,
    approvedAt,
  });
}

async function importSnapshot(request, response) {
  const payload = await readJson(request);
  if (!payload) return sendError(request, response, "请求格式不正确。", 400);

  const questions = Array.isArray(payload.questions)
    ? payload.questions
        .filter((item) => item?.id)
        .map((item) => ({
          id: Number(item.id),
          content: String(item.content || ""),
          name: String(item.name || ""),
          answer: String(item.answer || ""),
          is_public: Boolean(item.public),
          created_at: item.createdAt,
          answered_at: item.answeredAt || null,
        }))
    : [];
  const interviews = Array.isArray(payload.interviews)
    ? payload.interviews
        .filter((item) => item?.id)
        .map((item) => ({
          id: Number(item.id),
          answers: parseJsonArray(item.answers),
          consent_to_keywords: Boolean(item.consentToKeywords),
          keywords: parseJsonArray(item.keywords),
          is_public: Boolean(item.public),
          created_at: item.createdAt,
          reviewed_at: item.reviewedAt || null,
        }))
    : [];
  const memories = Array.isArray(payload.memories)
    ? payload.memories
        .filter((item) => item?.id)
        .map((item) => ({
          id: Number(item.id),
          words: parseJsonArray(item.words),
          created_at: item.createdAt,
          approved: Boolean(item.approved),
          approved_at: item.approvedAt || null,
        }))
    : [];

  for (const [table, rows] of [
    ["questions", questions],
    ["interview_submissions", interviews],
    ["memories", memories],
  ]) {
    if (!rows.length) continue;
    const result = await database()
      .from(table)
      .upsert(rows, { onConflict: "id" });
    if (result.error) throw result.error;
  }

  return sendJson(request, response, {
    ok: true,
    imported: {
      questions: questions.length,
      interviews: interviews.length,
      memories: memories.length,
    },
  });
}

async function route(request, response) {
  const url = new URL(request.url, "http://cloudbase.local");
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      ...SECURITY_HEADERS,
      ...corsHeaders(request),
    });
    return response.end();
  }
  if (path === "/api/health" && request.method === "GET") {
    return sendJson(request, response, { ok: true });
  }
  if (path === "/api/v1/impressions" && request.method === "GET") {
    return sendJson(request, response, {
      items: await listPublicImpressions(),
    });
  }
  if (
    (path === "/api/v1/questions" ||
      path === "/api/questions/public") &&
    request.method === "GET"
  ) {
    const questions = await listPublishedQuestions();
    return sendJson(
      request,
      response,
      path === "/api/questions/public"
        ? { questions }
        : { items: questions },
    );
  }
  if (
    (path === "/api/v1/questions" || path === "/api/questions") &&
    request.method === "POST"
  ) {
    return createQuestion(request, response);
  }
  if (path === "/api/v1/interviews" && request.method === "POST") {
    return createInterview(request, response);
  }
  if (path === "/api/memories/public" && request.method === "GET") {
    const rows = await selectRows(
      database()
        .from("memories")
        .select("id, words, created_at, approved_at")
        .eq("approved", true)
        .order("approved_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(100),
    );
    return sendJson(request, response, { memories: rows.map(mapMemory) });
  }

  const adminRoute =
    path === "/api/questions/admin" ||
    path === "/api/v1/admin/questions" ||
    path === "/api/interviews/admin" ||
    path === "/api/v1/interviews/admin" ||
    path === "/api/memories/admin" ||
    /^\/api\/(?:v1\/)?questions\/\d+\/answer$/.test(path) ||
    /^\/api\/v1\/interviews\/\d+\/keywords$/.test(path) ||
    /^\/api\/memories\/\d+\/approve$/.test(path) ||
    path === "/api/v1/admin/import";
  if (adminRoute && !isAuthorized(request)) {
    return sendError(request, response, "管理密码不正确。", 401);
  }

  if (
    (path === "/api/questions/admin" ||
      path === "/api/v1/admin/questions") &&
    request.method === "GET"
  ) {
    return sendJson(request, response, {
      questions: await listAdminQuestions(),
    });
  }
  if (
    (path === "/api/interviews/admin" ||
      path === "/api/v1/interviews/admin") &&
    request.method === "GET"
  ) {
    return sendJson(request, response, {
      interviews: await listAdminInterviews(),
    });
  }
  if (path === "/api/memories/admin" && request.method === "GET") {
    const rows = await selectRows(
      database()
        .from("memories")
        .select("id, words, created_at, approved, approved_at")
        .order("id", { ascending: false }),
    );
    return sendJson(request, response, { memories: rows.map(mapMemory) });
  }

  const answerMatch = path.match(
    /^\/api\/(?:v1\/)?questions\/(\d+)\/answer$/,
  );
  if (answerMatch && request.method === "POST") {
    return saveAnswer(request, response, Number(answerMatch[1]));
  }
  const interviewMatch = path.match(
    /^\/api\/v1\/interviews\/(\d+)\/keywords$/,
  );
  if (interviewMatch && request.method === "POST") {
    return saveInterviewKeywords(
      request,
      response,
      Number(interviewMatch[1]),
    );
  }
  const memoryMatch = path.match(/^\/api\/memories\/(\d+)\/approve$/);
  if (memoryMatch && request.method === "POST") {
    return updateMemoryApproval(request, response, Number(memoryMatch[1]));
  }
  if (path === "/api/v1/admin/import" && request.method === "POST") {
    return importSnapshot(request, response);
  }

  return sendError(request, response, "接口不存在。", 404);
}

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    console.error("CloudBase API request failed", error);
    if (!response.headersSent) {
      sendError(request, response, "服务器暂时不可用。", 500);
    } else {
      response.end();
    }
  }
});

server.listen(9000, "0.0.0.0", () => {
  console.log("Ray API listening on port 9000");
});
