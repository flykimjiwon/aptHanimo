import { z } from "zod";
import { openCommunityStore } from "../src/server/community-runtime";

const [command, id, ...words] = process.argv.slice(2);
const store = openCommunityStore();
try {
  switch (command) {
    case "list":
      console.info(
        JSON.stringify(
          store.queue(id ? z.coerce.number().int().positive().parse(id) : undefined),
          null,
          2,
        ),
      );
      break;
    case "backup": {
      const destination = z.string().min(1).parse(id);
      if (await Bun.file(destination).exists())
        throw new RangeError("Backup destination already exists");
      store.db.run("VACUUM INTO ?", [destination]);
      console.info("Consistent database backup created. Keep this file private.");
      break;
    }
    case "reports":
      console.info(
        JSON.stringify(
          store.db
            .query("SELECT post,reason,createdAt FROM reports ORDER BY createdAt DESC LIMIT 100")
            .all(),
          null,
          2,
        ),
      );
      break;
    case "photo": {
      const postId = z.uuid().parse(id),
        destination = z.string().min(1).parse(words[0]);
      if (await Bun.file(destination).exists())
        throw new RangeError("Photo destination already exists");
      const row = z
        .object({ image: z.instanceof(Uint8Array) })
        .parse(
          store.db.query("SELECT image FROM posts WHERE id=? AND image IS NOT NULL").get(postId),
        );
      await Bun.write(destination, row.image);
      console.info("Normalized review photo exported.");
      break;
    }
    case "approve":
    case "reject":
    case "resolve": {
      const postId = z.uuid().parse(id);
      const note = z.string().trim().min(5).max(1000).parse(words.join(" "));
      const status = { approve: "published", reject: "rejected", resolve: "resolved" } as const;
      if (!store.moderate(postId, status[command], note))
        throw new RangeError("Unknown submission");
      console.info(`${command}: ${postId}`);
      break;
    }
    default:
      console.info(
        "Usage: bun scripts/community-moderate.ts list [before-cursor] | reports | backup <new-file.sqlite> | photo <id> <new-file.webp> | approve|reject|resolve <id> <review note>",
      );
      process.exitCode = 1;
  }
} finally {
  store.close();
}
