import type { Point, Rectangle } from "../calibration";

export type { Point, Rectangle } from "../calibration";
export interface MotionSettings {
  durationMin: number;
  durationMax: number;
  holdMin: number;
  holdMax: number;
  steps: number;
  inset: number;
}
export interface MotionRequest {
  seed: number;
  start: Point;
  target: Rectangle;
  viewport: { width: number; height: number };
  enabled: boolean;
  settings?: Partial<MotionSettings>;
}
export interface MotionPlan {
  version: 1;
  seed: number;
  points: (Point & { at: number })[];
  click: Point;
  hold: number;
}
export type InputButton = "primary" | "secondary";
export interface InputDriver {
  assertTarget(token: string): void;
  held(): boolean;
  move(point: Point): number;
  button(button: InputButton, down: boolean): number;
  shift(down: boolean): number;
  now(): number;
  sleep(milliseconds: number, signal: AbortSignal): Promise<void>;
}
export interface InputExecution {
  plan: MotionPlan;
  token: string;
  button: InputButton;
  shift: boolean;
}
export type InputResult =
  | { status: "delivered" }
  | { status: "rejected" | "stopped" | "failed"; reason: string; cleanupFailed?: boolean };
