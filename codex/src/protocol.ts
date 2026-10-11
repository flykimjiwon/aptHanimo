import { z } from "zod";
export const positionSchema = z.object({
  heading: z.number().finite().min(-100).max(100).optional(),
  seq: z.number().int().nonnegative().optional(),
  x: z.number().finite().min(-5000).max(5000),
  y: z.number().finite().min(-500).max(500),
  z: z.number().finite().min(-5000).max(5000),
  mode: z.enum(["walk", "stroller", "bike", "car"]),
  party: z.enum(["solo", "couple", "family"]),
  layer: z.enum(["ground", "community", "parking"]),
});
export const peerSchema = positionSchema.extend({ id: z.string().max(60) });
export const incomingSchema = positionSchema.extend({ type: z.literal("move") });
export const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("welcome"), id: z.string(), peers: z.array(peerSchema).max(16) }),
  z.object({ type: z.literal("peers"), peers: z.array(peerSchema).max(16) }),
  z.object({ type: z.literal("full") }),
]);
export type PlayerState = z.infer<typeof positionSchema>;
export type Peer = z.infer<typeof peerSchema>;
