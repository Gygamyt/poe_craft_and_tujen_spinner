export interface Grid {
  columns: number;
  rows: number;
}
export interface ItemContext {
  instanceId: string;
  baseId: string;
  snapshotId: string;
  revision: number;
}
export interface Placement extends ItemContext {
  column: number;
  row: number;
  width: number;
  height: number;
}
