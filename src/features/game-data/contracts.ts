export interface CatalogStatus {
  available: boolean;
  activeSnapshotId?: string;
  snapshots: { id: string; game: "poe1"; patch: string | null; verified: boolean }[];
}

/** Main-owned repository boundary. No SQL, filenames, or native handles cross it. */
export interface CatalogRepository {
  status(): Promise<CatalogStatus>;
  close(): Promise<void>;
}
