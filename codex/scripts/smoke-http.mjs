import assert from "node:assert/strict";
import { join } from "node:path";

export async function verifyHttp(base, root) {
  const dist = join(root, "dist");
  const files = [...new Bun.Glob("**/*").scanSync({ cwd: dist, onlyFiles: true })]
    .filter((file) => !file.endsWith(".gz"))
    .sort();
  for (const required of ["index.html", "style-lab.html", "island.html"])
    assert(files.includes(required), `Missing build entry: ${required}; run bun run build`);

  let checks = 0;
  const request = (path, options = {}) =>
    fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(5000) });
  for (const file of files) {
    const response = await request(file === "index.html" ? "/" : `/${file}`, {
      headers: { "Accept-Encoding": "identity" },
    });
    assert.equal(response.status, 200, file);
    assert.deepEqual(
      new Uint8Array(await response.arrayBuffer()),
      new Uint8Array(await Bun.file(join(dist, file)).arrayBuffer()),
      `Response differs from built file: ${file}`,
    );
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", file);
    if (file.startsWith("assets/"))
      assert.match(response.headers.get("cache-control") ?? "", /immutable/, file);
    checks++;
  }

  const rootResponse = await request("/", { headers: { "Accept-Encoding": "identity" } });
  const etag = rootResponse.headers.get("etag");
  assert(etag, "Missing ETag");
  await rootResponse.arrayBuffer();
  const cached = await request("/", { headers: { "If-None-Match": etag } });
  assert.equal(cached.status, 304);
  assert.equal((await cached.arrayBuffer()).byteLength, 0);
  checks++;

  for (const encoding of ["gzip", "gzip;q=0"]) {
    const response = await request("/", {
      method: "HEAD",
      headers: { "Accept-Encoding": encoding },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-encoding"), encoding === "gzip" ? "gzip" : null);
    assert.equal(response.headers.get("vary"), "Accept-Encoding");
    assert.equal((await response.arrayBuffer()).byteLength, 0);
    checks++;
  }
  const compressed = await request("/", { headers: { "Accept-Encoding": "gzip" } });
  assert.equal(compressed.headers.get("content-encoding"), "gzip");
  assert.equal(await compressed.text(), await Bun.file(join(dist, "index.html")).text());
  checks++;

  const failures = [
    { path: "/smoke-missing-file", status: 404 },
    { path: "/%E0%A4%A", status: 400 },
    { path: "/%2e%2e%2fserver.ts", status: 403 },
    { path: "/", method: "POST", status: 405 },
    { path: "/presence", status: 426 },
    { path: "/presence?room=bad%2Froom", status: 400 },
    { path: "/presence", headers: { Origin: "https://foreign.example" }, status: 403 },
  ];
  for (const { path, status, ...options } of failures) {
    const response = await request(path, options);
    assert.equal(response.status, status, `${options.method ?? "GET"} ${path}`);
    await response.arrayBuffer();
    checks++;
  }
  return { checks, staticFiles: files.length, entries: 3 };
}
