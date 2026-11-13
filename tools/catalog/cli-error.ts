export function reportCatalogFailure(error: unknown) {
  const issues =
    error && typeof error === "object" && "issues" in error && Array.isArray(error.issues)
      ? error.issues
      : undefined;
  const message = issues
    ? JSON.stringify(issues.slice(0, 5))
    : error instanceof Error
      ? error.message
      : String(error);
  console.error(`Catalog command failed: ${message.slice(0, 2500)}`);
  process.exitCode = 1;
}
