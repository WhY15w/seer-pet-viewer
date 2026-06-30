import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    server: {
      deps: {
        inline: [/@arkntools\/.*/],
      },
    },
  },
  ssr: {
    noExternal: [/@arkntools\/.*/],
  },
});
