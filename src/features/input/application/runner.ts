import type { InputDriver, InputExecution, InputResult } from "../contracts";

/** Delivery only. Observation confirmation belongs to the action's consumer. */
export class InputRunner {
  private controller?: AbortController;
  constructor(private readonly driver: InputDriver) {}
  get busy() {
    return Boolean(this.controller);
  }
  cancel() {
    this.controller?.abort();
  }

  async run(execution: InputExecution): Promise<InputResult> {
    if (this.busy) return { status: "rejected", reason: "busy" };
    const controller = new AbortController();
    this.controller = controller;
    let buttonOwned = false,
      shiftOwned = false;
    let result: InputResult = { status: "delivered" };
    const check = () => {
      if (controller.signal.aborted) throw new Error("cancelled");
      this.driver.assertTarget(execution.token);
    };
    const emit = (operation: () => number) => {
      check();
      if (operation() !== 1) throw new Error("partial-delivery");
    };
    try {
      check();
      if (this.driver.held()) return { status: "rejected", reason: "physical-input-held" };
      const started = this.driver.now();
      for (const point of execution.plan.points) {
        await this.driver.sleep(
          Math.max(0, started + point.at - this.driver.now()),
          controller.signal,
        );
        emit(() => this.driver.move(point));
      }
      if (execution.shift) {
        emit(() => this.driver.shift(true));
        shiftOwned = true;
      }
      emit(() => this.driver.button(execution.button, true));
      buttonOwned = true;
      await this.driver.sleep(execution.plan.hold, controller.signal);
      emit(() => this.driver.button(execution.button, false));
      buttonOwned = false;
      if (shiftOwned) {
        emit(() => this.driver.shift(false));
        shiftOwned = false;
      }
    } catch (error) {
      result = {
        status: controller.signal.aborted ? "stopped" : "failed",
        reason: error instanceof Error ? error.message : String(error),
      };
    } finally {
      let cleanupFailed = false;
      for (const release of [
        ...(buttonOwned ? [() => this.driver.button(execution.button, false)] : []),
        ...(shiftOwned ? [() => this.driver.shift(false)] : []),
      ]) {
        try {
          if (release() !== 1) cleanupFailed = true;
        } catch {
          cleanupFailed = true;
        }
      }
      if (cleanupFailed)
        result = { status: "failed", reason: "cleanup-failed", cleanupFailed: true };
      this.controller = undefined;
    }
    return result;
  }
}
