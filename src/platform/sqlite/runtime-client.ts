import type { Worker } from "node:worker_threads";
import { decodeBaseDimensions } from "../../features/game-data/index.ts";
import type {
  CatalogRepository,
  CatalogReader,
  CatalogStatus,
  CatalogDetail,
  CatalogQueryResult,
} from "../../features/game-data/contracts";
import type { CatalogQuery } from "../../features/game-data";

export interface SqliteProbeResult {
  previous: string | null;
  stored: string;
  sqlite: string;
  node: string;
  electron: string | null;
  threadId: number;
}

/** Bounded RPC over a Node worker; callers never provide SQL. */
export class SqliteRuntimeClient implements CatalogRepository, CatalogReader {
  private nextId = 0;
  private closed = false;
  private termination?: Promise<number>;
  private closing?: Promise<void>;
  private readonly worker: Worker;
  private readonly deadline: number;
  private pending = new Map<
    number,
    {
      resolve(value: unknown): void;
      reject(error: Error): void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(worker: Worker, deadline = 5000) {
    this.worker = worker;
    this.deadline = deadline;
    if (!Number.isFinite(deadline) || deadline <= 0 || deadline > 30000)
      throw new Error("Invalid worker deadline");
    worker.on(
      "message",
      (message: { id: number; ok: boolean; value?: unknown; error?: string; code?: string }) => {
        const pending = this.pending.get(message?.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.ok) pending.resolve(message.value);
        else
          pending.reject(
            Object.assign(new Error(message.error ?? "Catalog worker failed"), {
              code: message.code,
            }),
          );
      },
    );
    worker.on("error", (error) => this.fail(error));
    worker.on("exit", (code) => {
      if (!this.closed) this.fail(new Error(`Catalog worker exited (${code})`));
    });
  }
  private fail(error: Error) {
    this.closed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
  private request(
    kind: "status" | "probe" | "close" | "import" | "query" | "detail" | "activate",
    token?: string,
    payload?: unknown,
  ): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error("Catalog worker is closed"));
    if (this.pending.size >= 16) return Promise.reject(new Error("Catalog worker queue is full"));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.fail(new Error("Catalog worker deadline exceeded"));
        this.termination = this.worker.terminate();
      }, this.deadline);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.worker.postMessage({ id, kind, token, payload });
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }
  async status(): Promise<CatalogStatus> {
    return (await this.request("status")) as CatalogStatus;
  }
  async probe(token: string): Promise<SqliteProbeResult> {
    return (await this.request("probe", token)) as SqliteProbeResult;
  }
  async importDirectory(directory: string): Promise<CatalogStatus> {
    return (await this.request("import", undefined, { directory })) as CatalogStatus;
  }
  async query(query: CatalogQuery): Promise<CatalogQueryResult> {
    return (await this.request("query", undefined, query)) as CatalogQueryResult;
  }
  async detail(kind: "base" | "mod", id: string, snapshotId?: string): Promise<CatalogDetail> {
    return (await this.request("detail", undefined, { kind, id, snapshotId })) as CatalogDetail;
  }
  async activate(snapshotId: string): Promise<CatalogStatus> {
    return (await this.request("activate", undefined, { snapshotId })) as CatalogStatus;
  }
  async dimensions(baseId: string, snapshotId?: string) {
    const detail = await this.detail("base", baseId, snapshotId);
    return decodeBaseDimensions(String(detail.record.id), detail.snapshotId, detail.record.raw);
  }
  async close(): Promise<void> {
    if (this.closing) return this.closing;
    this.closing = (async () => {
      try {
        if (!this.closed && this.pending.size < 16) await this.request("close");
      } finally {
        this.fail(new Error("Catalog worker is closed"));
        this.termination ??= this.worker.terminate();
        await this.termination;
      }
    })();
    return this.closing;
  }
}
