import "dotenv/config";
import type { Runtime } from "@prisma-next/sql-runtime";
import { db } from "../prisma/db";

/**
 * Lazily open one connection per server process and reuse it. `db.connect`
 * establishes the ambient connection that `db.orm.*` queries run against, so
 * server functions just `await getRuntime()` once before issuing queries.
 */
let runtimePromise: Promise<Runtime> | undefined;

export function getRuntime(): Promise<Runtime> {
  if (!runtimePromise) {
    const url = process.env["DATABASE_URL"];
    if (!url) {
      throw new Error("DATABASE_URL is not set — copy .env.example to .env");
    }
    runtimePromise = db.connect({ url }).catch((error) => {
      runtimePromise = undefined;
      throw error;
    });
  }
  return runtimePromise;
}

export async function closeRuntime(): Promise<void> {
  if (runtimePromise) {
    const runtime = await runtimePromise;
    await runtime.close();
    runtimePromise = undefined;
  }
}
