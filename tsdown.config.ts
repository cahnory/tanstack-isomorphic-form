import { defineConfig } from "tsdown";

const packageDirs = ["libs/core", "libs/react"] as const;

export default defineConfig(
  packageDirs.map((cwd) => ({
    clean: true,
    cwd,
    deps: {
      skipNodeModulesBundle: true,
    },
    exports: {
      devExports: true,
    },
    format: [...(["cjs", "esm"] as const)],
    legacy: true,
    platform: "neutral" as const,
  })),
);
