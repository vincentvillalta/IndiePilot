import type { NextConfig } from "next";

export default {
  transpilePackages: ["@indiepilot/ui", "@indiepilot/db"],
  output: "standalone",
  outputFileTracingRoot: "../../",
} satisfies NextConfig;
