import { resolve } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Exercise the actual configuration and parsers, including Vue script blocks.
const eslint = new ESLint();
const ruleId = "architecture/feature-boundaries";
async function violations(file: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath: resolve(file) });
  expect(result.messages.filter((message) => message.fatal)).toEqual([]);
  return result.messages.filter((message) => message.ruleId === ruleId);
}

describe("feature dependency policy", () => {
  it.each([
    ["src/features/calibration/domain/check.ts", 'import { z } from "zod";'],
    ["src/features/input/domain/check.ts", 'import type { Point } from "../../calibration";'],
    [
      "src/features/input/domain/check.ts",
      'import type { DesktopState } from "../../calibration/contracts";',
    ],
    [
      "src/features/calibration/ui/check.ts",
      'import { pageIds } from "../domain/calibration-layout";',
    ],
    [
      "src/platform/electron/calibration/check.ts",
      'import { CalibrationService } from "../../../features/calibration/application";',
    ],
    [
      "src/main/check.ts",
      'import { CalibrationService } from "../features/calibration/application/index.ts";',
    ],
    ["src/renderer/src/check.ts", 'import { Overlay } from "../../features/calibration/ui";'],
    ["src/features/input/domain/check.ts", 'export { Point } from "../../calibration/index.ts";'],
    ["src/features/input/domain/check.ts", 'const x = import("../../calibration");'],
    [
      "src/features/calibration/ui/Check.vue",
      '<script setup lang="ts">import type { DesktopState } from "../contracts";</script><template><div /></template>',
    ],
  ])("allows a declared dependency: %s / %s", async (file, code) => {
    expect(await violations(file, code)).toEqual([]);
  });

  it.each([
    ["src/features/calibration/domain/check.ts", 'import { app } from "electron";'],
    ["src/features/calibration/application/check.ts", 'import fs from "node:fs";'],
    ["src/features/calibration/domain/check.ts", 'import fs from "fs/promises";'],
    ["src/features/calibration/contracts.ts", 'export * from "electron";'],
    ["src/features/calibration/index.ts", 'export * from "./ui";'],
    [
      "src/features/input/domain/check.ts",
      'import { x } from "../../calibration/domain/calibration-geometry";',
    ],
    [
      "src/features/input/domain/check.ts",
      'import { x } from "../../calibration/domain/../domain/calibration-layout.ts";',
    ],
    [
      "src/features/input/application/check.ts",
      'import { x } from "../../calibration/application";',
    ],
    [
      "src/features/calibration/domain/check.ts",
      'import { x } from "../../../platform/electron/calibration/desktop";',
    ],
    ["src/features/calibration/domain/check.ts", 'import { x } from "../../../main/index";'],
    [
      "src/features/input/index.ts",
      'export { x } from "../calibration/domain/calibration-layout";',
    ],
    ["src/features/input/index.ts", 'export * from "../calibration/domain/calibration-layout";'],
    [
      "src/features/input/domain/check.ts",
      'const x = import("../../calibration/domain/calibration-layout");',
    ],
    [
      "src/features/input/domain/check.ts",
      'type X = import("../../calibration/domain/calibration-layout").PageId;',
    ],
    [
      "src/platform/electron/input/check.ts",
      'import { x } from "../../../features/calibration/application";',
    ],
    ["src/renderer/src/check.ts", 'import fs from "path";'],
    [
      "src/renderer/src/check.ts",
      'import { x } from "../../platform/electron/calibration/desktop";',
    ],
    [
      "src/features/calibration/ui/Check.vue",
      '<script setup lang="ts">import fs from "node:fs";</script><template><div /></template>',
    ],
    [
      "src/features/input/ui/Check.vue",
      '<script setup lang="ts">export { x } from "../../calibration/domain/calibration-layout";</script><template><div /></template>',
    ],
  ])("rejects a boundary bypass: %s / %s", async (file, code) => {
    expect(await violations(file, code)).toHaveLength(1);
  });
});
