export { createFixture, fixtureTargets, applyFixtureAction } from "./domain/fixture";
export type { Fixture, FixtureTarget } from "./domain/fixture";
export { TestbedSession, type TestbedEnvironment } from "./application/session";
export { testbedCommandSchema, observedEventSchema } from "./validation";
export {
  configureFixture,
  fixturePlacements,
  fixtureInventoryArea,
  footprintPresets,
  inventoryGrid,
} from "./domain/fixture";
export type { FixturePlacement } from "./domain/fixture";
