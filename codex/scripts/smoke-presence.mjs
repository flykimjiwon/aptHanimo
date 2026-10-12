import assert from "node:assert/strict";
import { serverMessageSchema } from "../src/protocol.ts";

function connect(base, room) {
  const url = new URL("/presence", base);
  url.protocol = "ws:";
  url.searchParams.set("room", room);
  const socket = new WebSocket(url);
  const messages = [];
  const listeners = new Set();
  let failure = null;
  const closed = new Promise((resolve) =>
    socket.addEventListener("close", resolve, { once: true }),
  );
  socket.addEventListener("message", (event) => {
    try {
      messages.push(serverMessageSchema.parse(JSON.parse(event.data)));
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      failure = error;
    }
    for (const listener of listeners) listener();
  });
  socket.addEventListener("error", () => {
    failure = new assert.AssertionError({ message: "WebSocket connection failed" });
    for (const listener of listeners) listener();
  });
  function waitFor(predicate) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => finish(new assert.AssertionError({ message: "WebSocket event timed out" })),
        5000,
      );
      const finish = (error, value) => {
        clearTimeout(timeout);
        listeners.delete(check);
        if (error) reject(error);
        else resolve(value);
      };
      const check = () => {
        if (failure) return finish(failure);
        const match = messages.find(predicate);
        if (match) finish(null, match);
      };
      listeners.add(check);
      check();
    });
  }
  return { socket, messages, closed, waitFor };
}

async function closeCode(client) {
  let timeout;
  try {
    const event = await Promise.race([
      client.closed,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new assert.AssertionError({ message: "WebSocket close timed out" })),
          5000,
        );
      }),
    ]);
    return event.code;
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyPresence(base) {
  const clients = [];
  const room = `smoke-${crypto.randomUUID()}`;
  const open = async (suffix = "") => {
    const client = connect(base, room + suffix);
    clients.push(client);
    await client.waitFor((message) => message.type === "welcome");
    return client;
  };
  try {
    const first = await open();
    const second = await open();
    const other = await open("-other");
    await first.waitFor((message) => message.type === "peers" && message.peers.length === 2);
    first.socket.send(
      JSON.stringify({
        type: "move",
        x: 123,
        y: 7,
        z: 234,
        mode: "walk",
        party: "solo",
        layer: "ground",
        heading: 0.5,
      }),
    );
    await second.waitFor(
      (message) =>
        message.type === "peers" && message.peers.some((peer) => peer.x === 123 && peer.z === 234),
    );
    other.socket.send(
      JSON.stringify({
        type: "move",
        x: 456,
        y: 8,
        z: 789,
        mode: "bike",
        party: "solo",
        layer: "ground",
        heading: 1,
      }),
    );
    const isolated = await other.waitFor(
      (message) => message.type === "peers" && message.peers.some((peer) => peer.x === 456),
    );
    assert.equal(isolated.peers.length, 1, "Separate room leaked peers");
    assert(
      !second.messages.some(
        (message) => message.type === "peers" && message.peers.some((peer) => peer.x === 456),
      ),
    );

    second.socket.send(JSON.stringify({ type: "move", x: "invalid" }));
    assert.equal(await closeCode(second), 1008);
    await first.waitFor(
      (message) =>
        message.type === "peers" && message.peers.length === 1 && message.peers[0]?.x === 123,
    );
    const invalidJson = await open("-invalid");
    invalidJson.socket.send("{");
    assert.equal(await closeCode(invalidJson), 1007);
    return {
      checks: 6,
      sameRoomMovement: true,
      separateRoom: true,
      invalidPosition: 1008,
      invalidJson: 1007,
      leaveBroadcast: true,
    };
  } finally {
    for (const client of clients) client.socket.close();
    await Promise.all(clients.map(closeCode));
  }
}
