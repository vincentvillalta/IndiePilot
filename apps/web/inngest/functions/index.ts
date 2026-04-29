import { healthCheck } from "./health";

/**
 * Functions array consumed by the /api/inngest route handler.
 * To register a new function: import it and append to this array.
 * Phase 5 will append asc.invite, waitlist.promo, etc. here.
 */
export const functions = [healthCheck] as const;
