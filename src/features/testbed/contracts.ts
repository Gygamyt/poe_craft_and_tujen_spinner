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
