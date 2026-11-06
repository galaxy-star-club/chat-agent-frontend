import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const directory = new URL("../src/generated/contracts/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", directory), "utf8"));
assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/);
assert.equal(manifest.sourceRepository, "backend");
assert.deepEqual(Object.keys(manifest.files), [
  "api.ts",
  "auth.ts",
  "content.ts",
  "database-readiness.ts",
  "health.ts",
  "json.ts",
  "pagination.ts",
  "run.ts",
  "tools.ts",
  "trace.ts",
]);
for (const [file, expectedHash] of Object.entries(manifest.files)) {
  const source = await readFile(new URL(file, directory), "utf8");
  assert.equal(createHash("sha256").update(source).digest("hex"), expectedHash,
    "Generated contracts changed. Regenerate from the pinned backend revision; do not edit snapshots.");
}
const healthSource = await readFile(new URL("health.ts", directory), "utf8");
assert.ok(healthSource.includes(`CONTRACT_VERSION = "${manifest.schemaVersion}"`));
console.log(`Contracts verified: ${manifest.schemaVersion} from ${manifest.sourceRevision}`);
