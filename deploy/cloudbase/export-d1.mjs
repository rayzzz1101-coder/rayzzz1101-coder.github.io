import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const apiBase = String(
  process.env.D1_API_BASE ||
    "https://ray-question-box.ray-questionbox.workers.dev",
).replace(/\/$/, "");
const tokenFile = process.argv[2];
const outputFile = process.argv[3];

if (!tokenFile || !outputFile) {
  throw new Error("Usage: node export-d1.mjs <token-file> <output-file>");
}

const token = (await readFile(resolve(tokenFile), "utf8")).trim();
if (token.length < 12) {
  throw new Error("Admin token file is empty or invalid.");
}

async function fetchAdmin(path) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  return response.json();
}

const [questions, interviews, memories] = await Promise.all([
  fetchAdmin("/api/questions/admin"),
  fetchAdmin("/api/v1/interviews/admin"),
  fetchAdmin("/api/memories/admin"),
]);

const snapshot = {
  exportedAt: new Date().toISOString(),
  source: apiBase,
  questions: questions.questions || [],
  interviews: interviews.interviews || [],
  memories: memories.memories || [],
};

await mkdir(resolve(outputFile, ".."), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(snapshot, null, 2)}\n`, {
  mode: 0o600,
});

console.log(
  JSON.stringify({
    outputFile: resolve(outputFile),
    counts: {
      questions: snapshot.questions.length,
      interviews: snapshot.interviews.length,
      memories: snapshot.memories.length,
    },
  }),
);
