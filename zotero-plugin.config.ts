import { defineConfig } from "zotero-plugin-scaffold";
import { createServer } from "node:http";
import pkg from "./package.json";

const mockChatServer = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    const payload = JSON.parse(body);
    const valid =
      request.url === "/v1/chat/completions" &&
      request.headers.authorization === "Bearer test-key" &&
      payload.model === "test-model";
    response.writeHead(valid ? 200 : 400, {
      "Content-Type": "application/json",
    });
    response.end(
      valid
        ? JSON.stringify({
            choices: [{ message: { content: "# Mock note\n\n**Result**" } }],
          })
        : JSON.stringify({
            error: { message: "Unexpected Chat Completions request" },
          }),
    );
  });
});

export default defineConfig({
  source: ["src", "addon"],
  dist: ".scaffold/build",
  name: pkg.config.addonName,
  id: pkg.config.addonID,
  namespace: pkg.config.addonRef,
  // Zotero 10 requires this field even for a manually distributed XPI.
  updateURL: "https://example.invalid/quickread/update.json",

  build: {
    assets: ["addon/**/*.*"],
    define: {
      ...pkg.config,
      author: pkg.author,
      description: pkg.description,
      homepage: pkg.homepage,
      buildVersion: pkg.version,
      buildTime: "{{buildTime}}",
    },
    prefs: {
      prefix: pkg.config.prefsPrefix,
    },
    esbuildOptions: [
      {
        entryPoints: ["src/index.ts"],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
        },
        bundle: true,
        target: "firefox115",
        outfile: `.scaffold/build/addon/content/scripts/${pkg.config.addonRef}.js`,
      },
    ],
  },

  server: {
    devtools: false,
  },

  test: {
    waitForPlugin: `() => Zotero.${pkg.config.addonInstance}.data.initialized`,
    watch: false,
    prefs: {
      "extensions.zotero.quickreadnote.testFixturePath": `${process.cwd()}/test/fixtures/sample.pdf`,
    },
    hooks: {
      "test:init": async () => {
        await new Promise<void>((resolve) =>
          mockChatServer.listen(31337, "127.0.0.1", resolve),
        );
      },
      "test:exit": () => mockChatServer.close(),
    },
  },

  // If you need to see a more detailed log, uncomment the following line:
  // logLevel: "trace",
});
