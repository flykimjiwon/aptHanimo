import type { ComplexId } from "./complexes";
import { type Peer, type PlayerState, serverMessageSchema } from "./protocol";
export type ConnectionStatus = "connecting" | "connected" | "offline" | "full";
export class Presence {
  id: string | null = null;
  private socket: WebSocket | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private active = true;
  private attempt = 0;
  private latest: PlayerState | null = null;
  private lastSent: string | null = null;
  constructor(
    private complex: ComplexId,
    private readonly onPeers: (peers: readonly Peer[]) => void,
    private readonly onStatus: (status: ConnectionStatus) => void,
  ) {
    this.connect();
  }
  private connect(): void {
    this.onStatus("connecting");
    const token = new URLSearchParams(location.hash.slice(1)).get("room") ?? "public";
    const room = `${this.complex}-${/^[\w-]{1,40}$/.test(token) ? token : "public"}`;
    const socket = new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/presence?room=${encodeURIComponent(room)}`,
    );
    this.socket = socket;
    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      let raw: unknown;
      try {
        raw = JSON.parse(event.data);
      } catch (error) {
        if (error instanceof SyntaxError) return;
        throw error;
      }
      const parsed = serverMessageSchema.safeParse(raw);
      if (!parsed.success) return;
      const message = parsed.data;
      switch (message.type) {
        case "welcome":
          this.id = message.id;
          this.lastSent = null;
          this.attempt = 0;
          this.onStatus("connected");
          this.onPeers(message.peers.filter((p) => p.id !== this.id));
          if (this.latest) this.send(this.latest);
          break;
        case "peers":
          this.onPeers(message.peers.filter((p) => p.id !== this.id));
          break;
        case "full":
          this.onStatus("full");
          this.active = false;
          break;
      }
    });
    socket.addEventListener("close", () => {
      if (this.socket !== socket) return;
      this.id = null;
      this.onPeers([]);
      if (this.active) {
        this.onStatus("offline");
        this.timer = setTimeout(
          () => this.connect(),
          Math.min(20000, 1000 * 2 ** Math.min(this.attempt++, 4)),
        );
      }
    });
    socket.addEventListener("error", () => this.onStatus("offline"));
  }
  send(player: PlayerState): void {
    this.latest = player;
    const payload = JSON.stringify({ type: "move", ...player });
    if (this.socket?.readyState === WebSocket.OPEN && payload !== this.lastSent) {
      this.socket.send(payload);
      this.lastSent = payload;
    }
  }
  setComplex(complex: ComplexId): void {
    this.dispose();
    this.complex = complex;
    this.active = true;
    this.latest = null;
    this.id = null;
    this.onPeers([]);
    this.connect();
  }
  dispose(): void {
    this.active = false;
    clearTimeout(this.timer);
    const socket = this.socket;
    this.socket = null;
    socket?.close();
  }
}
