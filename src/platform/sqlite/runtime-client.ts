import type { Worker } from "node:worker_threads";
import type { CatalogRepository, CatalogStatus } from "../../features/game-data/contracts";

export interface SqliteProbeResult {
  previous: string | null;
  stored: string;
  sqlite: string;
  node: string;
  electron: string | null;
  threadId: number;
}

/** Bounded RPC over a Node worker; callers never provide SQL. */
export class SqliteRuntimeClient implements CatalogRepository {
  private nextId = 0;
  private closed = false;
  private termination?: Promise<number>;
  private closing?: Promise<void>;
  private pending = new Map<
    number,
    {
      resolve(value: unknown): void;
      reject(error: Error): void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(
    private readonly worker: Worker,
    private readonly deadline = 5000,
  ) {
    if (!Number.isFinite(deadline) || deadline <= 0 || deadline > 30000)
      throw new Error("Invalid worker deadline");
    worker.on(
      "message",
      (message: { id: number; ok: boolean; value?: unknown; error?: string }) => {
        const pending = this.pending.get(message?.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.ok) pending.resolve(message.value);
        else pending.reject(new Error(message.error ?? "Catalog worker failed"));
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
  private request(kind: "status" | "probe" | "close", token?: string): Promise<unknown> {
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
        this.worker.postMessage({ id, kind, token });
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
