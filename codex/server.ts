import { resolve, sep } from "node:path";
import type { ServerWebSocket } from "bun";
import { incomingSchema, type Peer } from "./src/protocol";

type Session = { id: string; room: string; ip: string; last: number; peer: Peer };
const sessions = new Map<string, ServerWebSocket<Session>>();
const root = resolve(import.meta.dir, "dist");
function broadcast(room: string): void {
  const peers = [...sessions.values()].filter((s) => s.data.room === room).map((s) => s.data.peer);
  const payload = JSON.stringify({ type: "peers", peers });
  for (const socket of sessions.values()) if (socket.data.room === room) socket.send(payload);
}
const server = Bun.serve<Session>({
  hostname: "0.0.0.0",
  port: 5178,
  development: false,
  async fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname === "/presence") {
      const origin = request.headers.get("origin");
      if (origin && (!URL.canParse(origin) || new URL(origin).host !== url.host))
        return new Response("Origin mismatch", { status: 403 });
      const ip = server.requestIP(request)?.address ?? "unknown";
      const room = url.searchParams.get("room") ?? "haiver-public";
      if (!/^[a-zA-Z0-9_-]{1,60}$/.test(room)) return new Response("Invalid room", { status: 400 });
      const id = crypto.randomUUID();
      if (
        server.upgrade(request, {
          data: {
            id,
            room,
            ip,
            last: 0,
            peer: { id, x: 0, y: 0.75, z: 3, mode: "walk", party: "solo", layer: "ground" },
          },
        })
      )
        return;
      return new Response("WebSocket required", { status: 426 });
    }
    if (request.method !== "GET" && request.method !== "HEAD")
      return new Response("Method not allowed", { status: 405 });
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch (error) {
      if (error instanceof URIError) return new Response("Invalid path", { status: 400 });
      throw error;
    }
    const path = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (!path.startsWith(`${root}${sep}`)) return new Response("Forbidden", { status: 403 });
    const file = Bun.file(path);
    if (!(await file.exists())) return new Response("Not found", { status: 404 });
    const etag = `W/"${file.size}-${file.lastModified}"`;
    if (request.headers.get("if-none-match") === etag)
      return new Response(null, { status: 304, headers: { ETag: etag } });
    const compressed = Bun.file(`${path}.gz`);
    const gzipAllowed = (request.headers.get("accept-encoding") ?? "").split(",").some((part) => {
      const [encoding, quality] = part.trim().toLowerCase().split(";");
      return (
        encoding?.trim() === "gzip" &&
        (!quality || Number(quality.trim().replace(/^q\s*=\s*/, "")) > 0)
      );
    });
    const acceptsGzip = gzipAllowed && (await compressed.exists());
    return new Response(request.method === "HEAD" ? null : acceptsGzip ? compressed : file, {
      headers: {
        "Content-Type": file.type,
        ...(acceptsGzip ? { "Content-Encoding": "gzip" } : {}),
        Vary: "Accept-Encoding",
        ETag: etag,
        "Cache-Control": pathname.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : pathname.startsWith("/data/")
            ? "public, max-age=3600"
            : "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    });
  },
  websocket: {
    maxPayloadLength: 2048,
    idleTimeout: 30,
    sendPings: true,
    open(socket) {
      const peers = [...sessions.values()]
        .filter((s) => s.data.room === socket.data.room)
        .map((s) => s.data.peer);
      if (
        peers.length >= 16 ||
        sessions.size >= 64 ||
        [...sessions.values()].filter((s) => s.data.ip === socket.data.ip).length >= 16
      ) {
        socket.send(JSON.stringify({ type: "full" }));
        socket.close(1008, "Room full");
        return;
      }
      sessions.set(socket.data.id, socket);
      socket.send(JSON.stringify({ type: "welcome", id: socket.data.id, peers }));
      broadcast(socket.data.room);
    },
    message(socket, message) {
      const now = Date.now();
      if (now - socket.data.last < 50) return;
      socket.data.last = now;
      if (typeof message !== "string") return;
      let raw: unknown;
      try {
        raw = JSON.parse(message);
      } catch (error) {
        if (error instanceof SyntaxError) {
          socket.close(1007, "Invalid JSON");
          return;
        }
        throw error;
      }
      const parsed = incomingSchema.safeParse(raw);
      if (!parsed.success) {
        socket.close(1008, "Invalid position");
        return;
      }
      const { type: _, ...position } = parsed.data;
      socket.data.peer = { id: socket.data.id, ...position };
      broadcast(socket.data.room);
    },
    close(socket) {
      sessions.delete(socket.data.id);
      broadcast(socket.data.room);
    },
  },
});
console.info(`한바퀴 ready: http://localhost:${server.port} (LAN: port ${server.port})`);
