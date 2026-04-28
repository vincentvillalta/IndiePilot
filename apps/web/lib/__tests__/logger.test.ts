import { describe, it } from "vitest";

describe("FOUND-04: logger redaction", () => {
  it.todo("redacts `.p8`, `.privateKey`, `.jwt`, `.password`, `*.ascToken` paths to `[redacted]`");
  it.todo(
    "`req.headers.cookie` and `req.headers.authorization` are redacted in nested request shapes",
  );
  it.todo(
    "redaction works for both top-level and `*.<key>` deeply nested shapes per Pino path syntax",
  );
});

describe("FOUND-04: hashEmail", () => {
  it.todo("returns the same hash for the same email + salt across calls");
  it.todo("returns different hashes for different salts (per-deploy unlinkability)");
  it.todo("normalizes case + whitespace before hashing");
});

describe("FOUND-04: transport fallback", () => {
  it.todo("does not throw when AXIOM_TOKEN is unset (falls back to stdout)");
});
