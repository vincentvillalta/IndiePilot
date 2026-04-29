import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// logger.ts reads env at import time, so each test that exercises a different
// env shape must reset modules + dynamically re-import.

const ORIGINAL_ENV = { ...process.env };

describe("FOUND-04: logger redaction", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AXIOM_TOKEN;
    process.env.LOG_LEVEL = "debug";
    process.env.LOG_HASH_SALT = "test-salt-aaaaaaaaaaaaaaaa";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("redacts top-level p8/privateKey/jwt/password to [redacted]", async () => {
    const lines: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((c: string | Uint8Array) => {
        lines.push(typeof c === "string" ? c : Buffer.from(c).toString());
        return true;
      });
    const { logger } = await import("../logger");
    logger.info({
      p8: "FAKE_P8_BLOB_DO_NOT_LOG",
      privateKey: "FAKE_PEM",
      jwt: "eyJhbGciOiJIUzI1NiJ9.fake.payload",
      password: "hunter2",
    });
    const blob = lines.join("");
    writeSpy.mockRestore();

    expect(blob).toMatch(/\[redacted\]/);
    expect(blob).not.toContain("FAKE_P8_BLOB_DO_NOT_LOG");
    expect(blob).not.toContain("FAKE_PEM");
    expect(blob).not.toContain("eyJhbGciOiJIUzI1NiJ9.fake.payload");
    expect(blob).not.toContain("hunter2");
  });

  it("redacts nested *.p8 / *.privateKey / *.jwt", async () => {
    const lines: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((c: string | Uint8Array) => {
        lines.push(typeof c === "string" ? c : Buffer.from(c).toString());
        return true;
      });
    const { logger } = await import("../logger");
    logger.info({
      context: {
        p8: "NESTED_P8",
        privateKey: "NESTED_PEM",
        jwt: "NESTED_JWT",
      },
    });
    const blob = lines.join("");
    writeSpy.mockRestore();

    expect(blob).not.toContain("NESTED_P8");
    expect(blob).not.toContain("NESTED_PEM");
    expect(blob).not.toContain("NESTED_JWT");
  });

  it("redacts ASC token shapes: *.ascToken, *.ascAccessToken, *.ascRefreshToken", async () => {
    const lines: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((c: string | Uint8Array) => {
        lines.push(typeof c === "string" ? c : Buffer.from(c).toString());
        return true;
      });
    const { logger } = await import("../logger");
    logger.info({
      asc: {
        ascToken: "RAW_ASC_TOKEN",
        ascAccessToken: "RAW_ACCESS",
        ascRefreshToken: "RAW_REFRESH",
      },
    });
    const blob = lines.join("");
    writeSpy.mockRestore();

    expect(blob).not.toContain("RAW_ASC_TOKEN");
    expect(blob).not.toContain("RAW_ACCESS");
    expect(blob).not.toContain("RAW_REFRESH");
  });

  it("redacts req.headers.cookie and req.headers.authorization", async () => {
    const lines: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((c: string | Uint8Array) => {
        lines.push(typeof c === "string" ? c : Buffer.from(c).toString());
        return true;
      });
    const { logger } = await import("../logger");
    logger.info({
      req: {
        headers: {
          cookie: "session=secret-cookie-value",
          authorization: "Bearer fake-bearer-token",
          "user-agent": "Mozilla/5.0 (test)",
        },
      },
    });
    const blob = lines.join("");
    writeSpy.mockRestore();

    expect(blob).not.toContain("secret-cookie-value");
    expect(blob).not.toContain("fake-bearer-token");
    expect(blob).toContain("Mozilla/5.0 (test)");
  });

  it("redacts event.data.password and *.payload.p8 (Inngest event shapes)", async () => {
    const lines: string[] = [];
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((c: string | Uint8Array) => {
        lines.push(typeof c === "string" ? c : Buffer.from(c).toString());
        return true;
      });
    const { logger } = await import("../logger");
    logger.info({
      event: { data: { password: "INNGEST_PASS" } },
      step: { payload: { p8: "INNGEST_P8" } },
    });
    const blob = lines.join("");
    writeSpy.mockRestore();

    expect(blob).not.toContain("INNGEST_PASS");
    expect(blob).not.toContain("INNGEST_P8");
  });
});

describe("FOUND-04: hashEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AXIOM_TOKEN;
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns the same hash for the same email + salt across calls", async () => {
    process.env.LOG_HASH_SALT = "salt-aaaaaaaaaaaaaaaa";
    const { hashEmail } = await import("../logger");
    expect(hashEmail("foo@bar.com")).toBe(hashEmail("foo@bar.com"));
  });

  it("returns different hashes when the salt rotates", async () => {
    process.env.LOG_HASH_SALT = "salt-aaaaaaaaaaaaaaaa";
    const a = (await import("../logger")).hashEmail("foo@bar.com");
    vi.resetModules();
    process.env.LOG_HASH_SALT = "salt-bbbbbbbbbbbbbbbb";
    const b = (await import("../logger")).hashEmail("foo@bar.com");
    expect(a).not.toBe(b);
  });

  it("normalizes case and whitespace before hashing", async () => {
    process.env.LOG_HASH_SALT = "salt-aaaaaaaaaaaaaaaa";
    const { hashEmail } = await import("../logger");
    expect(hashEmail("Foo@Bar.com")).toBe(hashEmail("foo@bar.com"));
    expect(hashEmail("  foo@bar.com  ")).toBe(hashEmail("foo@bar.com"));
  });
});

describe("FOUND-04: transport fallback", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("does not throw when AXIOM_TOKEN is unset (falls back to stdout)", async () => {
    delete process.env.AXIOM_TOKEN;
    process.env.LOG_HASH_SALT = "salt-aaaaaaaaaaaaaaaa";
    await expect(import("../logger")).resolves.toBeDefined();
  });
});

describe("FOUND-04: per-environment log levels", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AXIOM_TOKEN;
    process.env.LOG_HASH_SALT = "salt-aaaaaaaaaaaaaaaa";
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("LOG_LEVEL override wins over env detection", async () => {
    process.env.LOG_LEVEL = "info";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const { logger } = await import("../logger");
    expect(logger.level).toBe("info");
  });

  it("production resolves to warn when no override", async () => {
    delete process.env.LOG_LEVEL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.VERCEL_ENV;
    const { logger } = await import("../logger");
    expect(logger.level).toBe("warn");
  });

  it("preview resolves to info when no override", async () => {
    delete process.env.LOG_LEVEL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production"; // Vercel sets NODE_ENV=production for previews too
    process.env.VERCEL_ENV = "preview";
    const { logger } = await import("../logger");
    expect(logger.level).toBe("info");
  });

  it("local dev resolves to debug when no override", async () => {
    delete process.env.LOG_LEVEL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.VERCEL_ENV;
    const { logger } = await import("../logger");
    expect(logger.level).toBe("debug");
  });
});
