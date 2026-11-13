import {
  InputRunner,
  planMotion,
  type InputDriver,
  type MotionSettings,
  type Point,
} from "../../input";
import {
  createFixture,
  fixtureTargets,
  applyFixtureAction,
  configureFixture,
  type FixturePlacement,
} from "../domain/fixture";
import { assertItemContext, type ItemContext } from "../../inventory";
import type { ObservedEvent, TestbedState, TraceEntry } from "../contracts";

export interface TestbedEnvironment {
  driver: InputDriver;
  viewport(): { width: number; height: number };
  capture(): { token: string; cursor: Point };
  now(): number;
  later(ms: number, callback: () => void): () => void;
  publish(state: TestbedState): void;
}
interface Pending {
  context: ItemContext;
  runId: number;
  epoch: number;
  sequence: number;
  targetId: string;
  button: "primary" | "secondary";
  shift: boolean;
  applied: boolean;
  cancelled: boolean;
  finish(result: string): void;
}

export class TestbedSession {
  private fixture = createFixture(1);
  private trace: TraceEntry[] = [];
  private runner: InputRunner;
  private pending?: Pending;
  private nextRun = 0;
  private activeRun = 0;
  private status = "Ready — synthetic fixture";
  private fault: TestbedState["fault"] = "none";
  private timers = new Set<() => void>();
  private runContext?: ItemContext;

  constructor(private readonly env: TestbedEnvironment) {
    this.runner = new InputRunner({
      ...env.driver,
      assertTarget: (token) => {
        env.driver.assertTarget(token);
        if (this.runContext) assertItemContext(this.runContext, this.fixture.item.placement);
      },
    });
  }
  snapshot(): TestbedState {
    return structuredClone({
      fixture: this.fixture,
      trace: this.trace,
      targets: fixtureTargets(this.fixture, this.env.viewport()),
      viewport: this.env.viewport(),
      activeRun: this.activeRun,
      busy: this.activeRun !== 0,
      status: this.status,
      fault: this.fault,
    });
  }
  publish() {
    this.env.publish(this.snapshot());
  }
  record(phase: string, data: unknown, runId = this.activeRun, epoch = this.fixture.epoch) {
    this.trace.push({ phase, data: structuredClone(data), runId, epoch, at: this.env.now() });
    if (this.trace.length > 500) this.trace.splice(0, this.trace.length - 500);
  }
  stop(reason = "stopped") {
    if (this.pending) this.pending.cancelled = true;
    this.runner.cancel();
    this.pending?.finish(reason);
  }
  dispose() {
    this.stop("target-closed");
    for (const cancel of this.timers) cancel();
    this.timers.clear();
  }
  reset(seed: number) {
    this.stop("reset");
    this.fixture = createFixture(seed, this.fixture.epoch + 1);
    this.status = "Reset — synthetic fixture";
    this.publish();
  }
  configure(value: FixturePlacement) {
    const next = configureFixture(this.fixture, value);
    this.stop("placement-changed");
    this.fixture = next;
    this.status = "Placement changed — synthetic fixture";
    this.publish();
  }
  page(page: "general" | "atlas" | "league") {
    this.stop("page-changed");
    this.fixture.page = page;
    this.publish();
  }
  setFault(fault: TestbedState["fault"]) {
    this.fault = fault;
    this.publish();
  }
  toggle(targetId: string, enabled: boolean) {
    if (this.activeRun) throw new Error("busy");
    if (
      !fixtureTargets(this.fixture, this.env.viewport()).some(
        (target) => target.id === targetId && target.kind === "currency",
      )
    )
      throw new Error("unknown-slot");
    this.fixture.disabled = this.fixture.disabled.filter((id) => id !== targetId);
    if (!enabled) this.fixture.disabled.push(targetId);
    this.publish();
  }
  receive(event: ObservedEvent) {
    this.record("received", event, event.runId, event.epoch);
    if (event.key === "Escape" && event.type === "keydown") this.stop();
    const pending = this.pending;
    if (
      !pending ||
      pending.applied ||
      pending.cancelled ||
      event.type !== "pointerup" ||
      !event.trusted ||
      event.runId !== pending.runId ||
      event.epoch !== pending.epoch ||
      event.epoch !== this.fixture.epoch ||
      event.button !== (pending.button === "primary" ? 0 : 2) ||
      event.shift !== pending.shift
    ) {
      this.publish();
      return;
    }
    try {
      assertItemContext(pending.context, this.fixture.item.placement);
    } catch {
      pending.finish("stale-item-placement");
      return;
    }
    const target = fixtureTargets(this.fixture, this.env.viewport()).find(
      (item) => item.id === pending.targetId,
    );
    if (
      !target ||
      event.x < target.bounds.x ||
      event.y < target.bounds.y ||
      event.x >= target.bounds.x + target.bounds.width ||
      event.y >= target.bounds.y + target.bounds.height
    ) {
      this.publish();
      return;
    }
    pending.applied = true;
    try {
      const observation = applyFixtureAction(
        this.fixture,
        pending.targetId,
        pending.button,
        pending.shift,
      );
      const confirm = () => {
        this.record(
          "observation",
          { ...observation, targetId: pending.targetId },
          pending.runId,
          pending.epoch,
        );
        if (
          this.pending === pending &&
          observation.epoch === this.fixture.epoch &&
          observation.sequence > pending.sequence
        )
          pending.finish("confirmed");
        this.publish();
      };
      if (this.fault === "none") confirm();
      else if (this.fault === "delayed") {
        let cancel = () => {};
        cancel = this.env.later(1400, () => {
          this.timers.delete(cancel);
          confirm();
        });
        this.timers.add(cancel);
      }
    } catch (error) {
      pending.finish(`fixture-rejected: ${error instanceof Error ? error.message : error}`);
    }
    this.publish();
  }
  async run(
    request: { targetId: string; button: "primary" | "secondary"; shift: boolean; seed: number },
    settings?: Partial<MotionSettings>,
  ) {
    if (this.activeRun) throw new Error("busy");
    const target = fixtureTargets(this.fixture, this.env.viewport()).find(
      (item) => item.id === request.targetId,
    );
    if (!target || !target.enabled) throw new Error("disabled-or-inactive-target");
    const context = this.env.capture();
    const plan = planMotion({
      seed: request.seed,
      start: context.cursor,
      target: target.bounds,
      viewport: this.env.viewport(),
      enabled: target.enabled,
      settings,
    });
    const id = ++this.nextRun;
    this.activeRun = id;
    let acknowledged = false;
    let resolveObservation: (value: string) => void = () => {};
    const observation = new Promise<string>((resolve) => {
      resolveObservation = resolve;
    });
    const pending: Pending = {
      context: structuredClone(this.fixture.item.placement),
      ...request,
      runId: id,
      epoch: this.fixture.epoch,
      sequence: this.fixture.sequence,
      applied: false,
      cancelled: false,
      finish(value) {
        if (!acknowledged) {
          acknowledged = true;
          resolveObservation(value);
        }
      },
    };
    this.pending = pending;
    this.status = "Moving…";
    this.record("planned", {
      ...request,
      plan,
      token: context.token,
      itemContext: pending.context,
    });
    this.publish();
    let cancelDeadline = () => {};
    try {
      this.runContext = pending.context;
      const delivery = await this.runner.run({
        plan,
        token: context.token,
        button: request.button,
        shift: request.shift,
      });
      if (delivery.status === "delivered") {
        this.status = "Waiting for observation…";
        cancelDeadline = this.env.later(800, () => pending.finish("unconfirmed-timeout"));
        this.publish();
        this.status = await observation;
      } else {
        this.status = `${delivery.status}: ${delivery.reason}`;
      }
      this.record("result", this.status);
      return { status: this.status, runId: id };
    } finally {
      this.runContext = undefined;
      cancelDeadline();
      this.pending = undefined;
      this.activeRun = 0;
      this.publish();
    }
  }
}
