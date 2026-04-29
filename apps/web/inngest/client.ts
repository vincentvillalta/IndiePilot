import { Inngest } from "inngest";

/**
 * Single shared Inngest client. Phase 5+ functions all import from here.
 * The `id` is the canonical app identifier in Inngest Cloud — do not change it
 * after first deploy without coordinating a manual app rename in the dashboard.
 */
export const inngest = new Inngest({ id: "indiepilot" });
