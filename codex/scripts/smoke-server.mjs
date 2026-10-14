import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyHttp } from "./smoke-http.mjs";
import { verifyPresence } from "./smoke-presence.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

async function readyPort(child) {
  const reader = child.stdout.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let timeout;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(
      () => reject(new assert.AssertionError({ message: "Server startup timed out" })),
      10000,
    );
  });
  try {
    while (text.length < 8192) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) {
        const error = await new Response(child.stderr).text();
        assert.fail(`Server exited before readiness: ${error.slice(0, 1200)}`);
      }
      text += decoder.decode(value, { stream: true });
      const match = text.match(/한바퀴 ready: http:\/\/localhost:(\d+)/);
      if (match) {
        const port = Number(match[1]);
        assert(port > 0 && port <= 65535, "Invalid ready port");
        assert.notEqual(port, 5178, "Smoke must use its own dynamic port");
        return port;
      }
    }
    assert.fail("Server did not emit its ready address");
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.info(
      "Usage: bun run smoke\nBuild first with bun run build. Starts and disposes an isolated HTTP/WebSocket test server; does not access a browser or user storage.",
    );
    return;
  }
  assert.equal(args.length, 0, "Unknown argument. Use --help.");
  for (const entry of ["index.html", "style-lab.html", "island.html"])
    assert(
      await Bun.file(`${root}/dist/${entry}`).exists(),
      `Missing dist/${entry}; run bun run build first`,
    );

  await using child = Bun.spawn([process.execPath, "server.ts"], {
    cwd: root,
    env: {
      ...process.env,
      HANBAKWI_PORT: "0",
      HANBAKWI_HOSTNAME: "127.0.0.1",
      HANBAKWI_DATA_DIR: mkdtempSync(join(tmpdir(), "hanbakwi-smoke-")),
      HANBAKWI_PUBLIC_ORIGIN: "",
    },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const port = await readyPort(child);
  const base = `http://127.0.0.1:${port}`;
  const http = await verifyHttp(base, root);
  const websocket = await verifyPresence(base);
  console.info(
    JSON.stringify(
      { status: "PASS", surface: "HTTP/WebSocket, not browser UI", http, websocket },
      null,
      2,
    ),
  );
}

try {
  await main();
} catch (error) {
  if (!(error instanceof Error)) throw error;
  console.error(`Smoke failed: ${error.message}`);
  process.exitCode = 1;
}
