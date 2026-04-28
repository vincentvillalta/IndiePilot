import { describe, it } from "vitest";

describe("FOUND-04: no-raw-log rule", () => {
  it.todo("flags `logger.info(req.body)` as error");
  it.todo("flags `logger.error(err)` as error");
  it.todo("allows `logger.info({ event: 'name', ...safeFields })`");
  it.todo("allows `requestLogger.info({ ... })` (any identifier ending in `Logger`)");
});
