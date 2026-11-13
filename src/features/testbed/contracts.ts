import type { z } from "zod";
import type { Fixture, FixtureTarget } from "./domain/fixture";

export const testbedChannels = {
  open: "testbed:open",
  state: "testbed:state",
  command: "testbed:command",
  observed: "testbed:observed",
  changed: "testbed:changed",
} as const;
import type { testbedCommandSchema, observedEventSchema } from "./validation";
export type TestbedCommand = z.infer<typeof testbedCommandSchema>;
export type ObservedEvent = z.infer<typeof observedEventSchema>;
export interface TraceEntry {
  phase: string;
  runId: number;
  epoch: number;
  at: number;
  data: unknown;
}
export interface TestbedState {
  fixture: Fixture;
  targets: FixtureTarget[];
  viewport: { width: number; height: number };
  activeRun: number;
  busy: boolean;
  fault: "none" | "delayed" | "missing";
  status: string;
  trace: TraceEntry[];
}
export interface TestbedApi {
  open(): Promise<void>;
  getState(): Promise<TestbedState>;
  command(command: TestbedCommand): Promise<void>;
  observed(event: ObservedEvent): void;
  onState(listener: (state: TestbedState) => void): () => void;
}

export const probeChannels = {
  ready: "input-probe:ready",
  received: "input-probe:received",
  result: "input-probe:result",
} as const;

export interface ProbeEvent {
  type: string;
  button: number;
  x: number;
  y: number;
  trusted: boolean;
}

export interface InputProbeApi {
  ready(): Promise<void>;
  received(event: ProbeEvent): void;
  onResult(listener: (result: { ok: boolean; error?: string }) => void): () => void;
}
