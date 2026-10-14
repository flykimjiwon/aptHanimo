import { Database } from "bun:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
  DEFAULT_FILTERS,
  type FeedFilters,
  postSchema,
  progressSchema,
  type Submission,
} from "../community/schema";

const rowSchema = z.object({
  id: z.string(),
  seq: z.number(),
  content: z.string(),
  status: postSchema.shape.status,
  createdAt: z.string(),
  updatedAt: z.string(),
  response: z.string(),
  photo: z.number(),
});
const columns = "id,seq,content,status,createdAt,updatedAt,response,image IS NOT NULL AS photo";
export class CommunityCapacityError extends Error {}
export class CommunityStore {
  readonly db: Database;
  private readonly salt: string;
  constructor(path: string) {
    this.db = new Database(path, { create: true, strict: true });
    this.db.run("PRAGMA journal_mode = WAL");
    this.db.run("PRAGMA busy_timeout = 5000");
    this.db.run(`CREATE TABLE IF NOT EXISTS posts (
      seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      owner TEXT NOT NULL, image BLOB, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      response TEXT NOT NULL DEFAULT '')`);
    this.db.run("CREATE INDEX IF NOT EXISTS posts_feed ON posts(status,seq)");
    this.db.run(
      "CREATE TABLE IF NOT EXISTS limits (actor TEXT PRIMARY KEY, count INTEGER NOT NULL, bucket INTEGER NOT NULL)",
    );
    this.db.run("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    this.db.run(
      "CREATE TABLE IF NOT EXISTS reports (post TEXT NOT NULL, actor TEXT NOT NULL, reason TEXT NOT NULL, createdAt TEXT NOT NULL, PRIMARY KEY(post,actor))",
    );
    this.db.run("INSERT OR IGNORE INTO meta VALUES ('salt',?)", [randomBytes(32).toString("hex")]);
    this.salt = z
      .object({ value: z.string() })
      .parse(this.db.query("SELECT value FROM meta WHERE key='salt'").get()).value;
  }
  private hash(value: string): string {
    return createHash("sha256").update(this.salt).update(value).digest("hex");
  }
  allow(address: string, now = Date.now()): boolean {
    return this.db.transaction(() => {
      const bucket = Math.floor(now / 3_600_000),
        actor = this.hash(address);
      this.db.run("DELETE FROM limits WHERE bucket < ?", [bucket]);
      this.db.run(
        "INSERT INTO limits VALUES (?,1,?) ON CONFLICT(actor) DO UPDATE SET count=count+1",
        [actor, bucket],
      );
      const row = z
        .object({ count: z.number() })
        .parse(this.db.query("SELECT count FROM limits WHERE actor=?").get(actor));
      return row.count <= 30;
    })();
  }
  create(input: Submission, image: Uint8Array | null) {
    return this.db.transaction(() => {
      const capacity = z
        .object({ count: z.number(), bytes: z.number() })
        .parse(
          this.db
            .query("SELECT count(*) AS count,coalesce(sum(length(image)),0) AS bytes FROM posts")
            .get(),
        );
      if (capacity.count >= 5000 || capacity.bytes + (image?.length ?? 0) > 128 * 1024 * 1024)
        throw new CommunityCapacityError(
          "접수 공간이 가득 찼어요. 운영자가 정리한 뒤 다시 시도해 주세요.",
        );
      const id = crypto.randomUUID(),
        token = randomBytes(32).toString("hex"),
        now = new Date().toISOString();
      const { consent: _, ...content } = input;
      this.db.run(
        "INSERT INTO posts (id,content,owner,image,createdAt,updatedAt) VALUES (?,?,?,?,?,?)",
        [id, JSON.stringify(content), this.hash(token), image, now, now],
      );
      return { id, token };
    })();
  }
  private decode(raw: unknown) {
    const row = rowSchema.parse(raw);
    return {
      seq: row.seq,
      post: postSchema.parse({ ...JSON.parse(row.content), ...row, photo: Boolean(row.photo) }),
    };
  }
  feed(complex: string, before = Number.MAX_SAFE_INTEGER, filters: FeedFilters = DEFAULT_FILTERS) {
    const scope = "status IN ('published','resolved') AND json_extract(content,'$.complex')=?";
    const selection = `${scope} AND (?='all' OR json_extract(content,'$.kind')=?) AND (?='all' OR json_extract(content,'$.topic')=?) AND (?='all' OR status=?)`;
    const values = [
      complex,
      filters.kind,
      filters.kind,
      filters.topic,
      filters.topic,
      filters.status,
      filters.status,
    ];
    const total = z
      .object({ total: z.number() })
      .parse(
        this.db.query(`SELECT count(*) AS total FROM posts WHERE ${selection}`).get(...values),
      ).total;
    const progress = progressSchema.parse(
      this.db
        .query(`SELECT
      count(CASE WHEN status='published' AND json_extract(content,'$.kind')='request' THEN 1 END) AS requests,
      count(CASE WHEN status='published' AND json_extract(content,'$.kind')='correction' THEN 1 END) AS corrections,
      count(CASE WHEN status='resolved' THEN 1 END) AS resolved
      FROM posts WHERE ${scope}`)
        .get(complex),
    );
    const rows = this.db
      .query(`SELECT ${columns} FROM posts WHERE ${selection} AND seq<? ORDER BY seq DESC LIMIT 21`)
      .all(...values, before)
      .map((r) => this.decode(r));
    const visible = rows.slice(0, 20);
    return {
      posts: visible.map((r) => r.post),
      next: rows.length > 20 ? (visible.at(-1)?.seq ?? null) : null,
      total,
      progress,
    };
  }
  mine(id: string, token: string) {
    const raw = this.db
      .query(`SELECT ${columns} FROM posts WHERE id=? AND owner=?`)
      .get(id, this.hash(token));
    return raw ? this.decode(raw).post : null;
  }
  withdraw(id: string, token: string): boolean {
    return this.db.transaction(() => {
      const result = this.db.run("DELETE FROM posts WHERE id=? AND owner=?", [
        id,
        this.hash(token),
      ]);
      if (result.changes) this.db.run("DELETE FROM reports WHERE post=?", [id]);
      return result.changes > 0;
    })();
  }
  photo(id: string): Uint8Array | null {
    const raw = this.db
      .query(
        "SELECT image FROM posts WHERE id=? AND status IN ('published','resolved') AND image IS NOT NULL",
      )
      .get(id);
    return raw ? z.object({ image: z.instanceof(Uint8Array) }).parse(raw).image : null;
  }
  report(id: string, address: string, reason: string): boolean {
    const found = this.db
      .query("SELECT id FROM posts WHERE id=? AND status IN ('published','resolved')")
      .get(id);
    if (!found) return false;
    this.db.run("INSERT OR IGNORE INTO reports VALUES (?,?,?,?)", [
      id,
      this.hash(address),
      reason,
      new Date().toISOString(),
    ]);
    return true;
  }
  moderate(id: string, status: "published" | "rejected" | "resolved", response: string): boolean {
    return (
      this.db.run("UPDATE posts SET status=?,response=?,updatedAt=? WHERE id=?", [
        status,
        response,
        new Date().toISOString(),
        id,
      ]).changes > 0
    );
  }
  queue(before = Number.MAX_SAFE_INTEGER) {
    return this.db
      .query(`SELECT ${columns} FROM posts WHERE seq < ? ORDER BY seq DESC LIMIT 100`)
      .all(before)
      .map((r) => {
        const row = this.decode(r);
        return { ...row.post, cursor: row.seq };
      });
  }
  close(): void {
    this.db.close();
  }
}
