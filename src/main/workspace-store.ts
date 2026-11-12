import * as fs from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { workspaceSchema, type CalibrationWorkspace } from "../domain/calibration-workspace";

type FileSystem = Pick<
  typeof fs,
  "readFile" | "writeFile" | "mkdir" | "rename" | "unlink" | "copyFile"
>;

export class WorkspaceStore {
  private queue: Promise<unknown> = Promise.resolve();
  private loaded = false;
  private blocked = false;

  constructor(
    private readonly file: string,
    private readonly initial: CalibrationWorkspace,
    private readonly io: FileSystem = fs,
  ) {}

  async load(): Promise<CalibrationWorkspace> {
    try {
      const content = await this.io.readFile(this.file, "utf8");
      const workspace = workspaceSchema.parse(JSON.parse(content));
      this.loaded = true;
      this.blocked = false;
      return workspace;
    } catch (error) {
      this.loaded = true;
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.blocked = false;
        return structuredClone(this.initial);
      }
      this.blocked = true;
      throw new Error(
        "Cannot load calibration data. The original file is preserved; confirm Reset to recover.",
        { cause: error },
      );
    }
  }

  save(input: CalibrationWorkspace): Promise<void> {
    const workspace = workspaceSchema.parse(input);
    return this.enqueue(async () => {
      if (!this.loaded) throw new Error("Load calibration data before saving");
      if (this.blocked)
        throw new Error("Calibration file requires a confirmed reset before writing");
      await this.write(workspace);
    });
  }

  reset(confirmed: boolean): Promise<CalibrationWorkspace> {
    return this.enqueue(async () => {
      if (!confirmed) throw new Error("Reset requires confirmation");
      try {
        await this.io.copyFile(this.file, `${this.file}.recovery-${randomUUID()}.json`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      const workspace = structuredClone(this.initial);
      await this.write(workspace);
      this.loaded = true;
      this.blocked = false;
      return workspace;
    });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.then(operation);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async write(workspace: CalibrationWorkspace): Promise<void> {
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      await this.io.mkdir(dirname(this.file), { recursive: true });
      await this.io.writeFile(temporary, JSON.stringify(workspace, null, 2) + "\n", {
        encoding: "utf8",
        flag: "wx",
      });
      workspaceSchema.parse(JSON.parse(await this.io.readFile(temporary, "utf8")));
      await this.io.rename(temporary, this.file);
    } finally {
      await this.io.unlink(temporary).catch(() => undefined);
    }
  }
}
