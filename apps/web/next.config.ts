import path from "node:path";
import type { NextConfig } from "next";

export default {
  transpilePackages: ["@indiepilot/ui", "@indiepilot/db"],
  output: "standalone",
  // Resolve to absolute path — Next 16 warns on relative outputFileTracingRoot.
  outputFileTracingRoot: path.join(__dirname, "../../"),
} satisfies NextConfig;
