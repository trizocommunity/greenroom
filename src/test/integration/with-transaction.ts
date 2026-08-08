import { getDb } from "./setup";

export async function withTransaction(fn: (tx: any) => Promise<void>) {
  await getDb()
    .transaction(async (tx) => {
      try {
        await fn(tx);
      } finally {
        // throw inside the callback to roll back
        // biome-ignore lint/correctness/noUnsafeFinally: intentional rollback
        throw new Error("__rollback__");
      }
    })
    .catch((e) => {
      if (e instanceof Error && e.message !== "__rollback__") throw e;
    });
}
