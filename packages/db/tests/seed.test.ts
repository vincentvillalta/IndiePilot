import { describe, expect, it } from "vitest";
import { buildSeedData, SEED_DEVELOPERS_COUNT, SEED_USERS_COUNT } from "../seed/seed";

describe("FOUND-02: seed populates expected counts", () => {
  it("seeds exactly 5 developers (CONTEXT lock: ~5 fake developers)", () => {
    const data = buildSeedData();
    expect(SEED_DEVELOPERS_COUNT).toBe(5);
    expect(data.developers.length).toBe(SEED_DEVELOPERS_COUNT);
  });

  it("seeds exactly 10 users (CONTEXT lock: ~10 placeholder rows; apps table doesn't exist in Phase 1, so the count maps to users)", () => {
    const data = buildSeedData();
    expect(SEED_USERS_COUNT).toBe(10);
    expect(data.users.length).toBe(SEED_USERS_COUNT);
  });

  it("seed is deterministic (faker.seed(42) → same emails on every run)", () => {
    const a = buildSeedData();
    const b = buildSeedData();
    expect(a.developers).toEqual(b.developers);
    expect(a.users).toEqual(b.users);
  });

  it("all generated emails are lowercased", () => {
    const data = buildSeedData();
    for (const dev of data.developers) {
      expect(dev.email).toBe(dev.email.toLowerCase());
    }
    for (const user of data.users) {
      expect(user.email).toBe(user.email.toLowerCase());
    }
  });
});
