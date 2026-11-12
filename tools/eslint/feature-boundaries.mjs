import { isBuiltin } from "node:module";
import { dirname, relative, resolve } from "node:path";
import { cwd } from "node:process";

const normalize = (value) => value.replaceAll("\\", "/");
const featureOf = (value) => /^src\/features\/([^/]+)\//.exec(value)?.[1];

export default {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      boundary:
        "{{reason}} Import a declared public entry point or move this dependency to its platform adapter.",
    },
  },
  create(context) {
    const root = context.cwd ?? cwd();
    const filename = context.filename ?? context.getFilename();
    const source = normalize(relative(root, filename));
    if (!source.startsWith("src/")) return {};
    const feature = featureOf(source);
    const pure =
      /^src\/features\/[^/]+\/(?:domain|application)\//.test(source) ||
      /^src\/features\/[^/]+\/(?:index|contracts)\.ts$/.test(source);
    const renderer =
      source.startsWith("src/renderer/") || /^src\/features\/[^/]+\/ui\//.test(source);
    const adapterOwner = /^src\/platform\/electron\/([^/]+)\//.exec(source)?.[1];
    const main = source.startsWith("src/main/");

    function check(node) {
      const specifier = node?.value;
      if (typeof specifier !== "string") return;
      let reason;
      if (
        (pure || renderer) &&
        (specifier === "electron" || specifier.startsWith("electron/") || isBuiltin(specifier))
      ) {
        reason = "Pure feature logic and renderer code cannot import platform APIs.";
      }
      if (
        specifier.startsWith(".") ||
        specifier.startsWith("/") ||
        /^[A-Za-z]:[\\/]/.test(specifier)
      ) {
        const target = normalize(relative(root, resolve(dirname(filename), specifier)));
        const targetFeature = featureOf(target);
        const entry = targetFeature
          ? target
              .slice(`src/features/${targetFeature}/`.length)
              .replace(/\.ts$/, "")
              .replace(/\/index$/, "")
          : undefined;
        if ((pure || renderer) && target.startsWith("src/platform/")) {
          reason = "Pure feature logic and renderer code cannot import platform adapters.";
        } else if (
          pure &&
          (target.startsWith("src/main/") ||
            target.startsWith("src/preload/") ||
            target.startsWith("src/renderer/") ||
            /^src\/features\/[^/]+\/ui(?:\/|$)/.test(target))
        ) {
          reason = "Pure feature logic cannot import process composition or UI.";
        } else if (
          renderer &&
          (target.startsWith("src/main/") || target.startsWith("src/preload/"))
        ) {
          reason = "Renderer code cannot import privileged process composition.";
        } else if (targetFeature && targetFeature !== feature) {
          const publicPure = entry === "index" || entry === "contracts";
          const publicApplication =
            entry === "application" && (main || adapterOwner === targetFeature);
          const publicUi = entry === "ui" && source.startsWith("src/renderer/");
          if (!publicPure && !publicApplication && !publicUi) {
            reason = `Feature '${targetFeature}' exposes only declared public entry points to this consumer.`;
          }
        }
      }
      if (reason) context.report({ node, messageId: "boundary", data: { reason } });
    }

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
      TSImportType: (node) => check(node.source),
    };
  },
};
