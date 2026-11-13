import type { CatalogManifest, CatalogQuery } from "./domain/bundle.ts";
import type { BaseDimensions } from "./domain/dimensions.ts";

export const catalogChannels = {
  open: "catalog:open",
  status: "catalog:status",
  query: "catalog:query",
  detail: "catalog:detail",
  dimensions: "catalog:dimensions",
  activate: "catalog:activate",
  import: "catalog:import",
} as const;
export interface CatalogDesktopApi extends CatalogReader {
  open(): Promise<void>;
  status(): Promise<CatalogStatus>;
  chooseImport(): Promise<{ canceled: boolean; status?: CatalogStatus; importMs?: number }>;
}

export interface CatalogStatus {
  available: boolean;
  activeSnapshotId?: string;
  snapshots: { id: string; game: "poe1"; patch: string | null; verified: boolean }[];
  activeManifest?: CatalogManifest;
}

export interface CatalogQueryResult {
  snapshotId: string;
  total: number;
  rows: { id: string; name: string; domain: string; itemClass?: string; requiredLevel?: number }[];
}
export interface CatalogDetail {
  snapshotId: string;
  kind: "base" | "mod";
  record: Record<string, unknown>;
  coverage: string[];
  warnings: string[];
}

export interface CatalogReader {
  dimensions(baseId: string, snapshotId?: string): Promise<BaseDimensions>;
  query(query: CatalogQuery): Promise<CatalogQueryResult>;
  detail(kind: "base" | "mod", id: string, snapshotId?: string): Promise<CatalogDetail>;
  activate(snapshotId: string): Promise<CatalogStatus>;
}

/** Main-owned repository boundary. No SQL, filenames, or native handles cross it. */
export interface CatalogRepository {
  status(): Promise<CatalogStatus>;
  close(): Promise<void>;
}
