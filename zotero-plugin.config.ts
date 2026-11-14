import { defineConfig } from "zotero-plugin-scaffold";
import { createServer } from "node:http";
import pkg from "./package.json";

const mockChatServer = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    const payload = JSON.parse(body);
    const chatPaths = [
      "/v1/chat/completions",
      "/api/v3/chat/completions",
      "/chat/completions",
      "/api/paas/v4/chat/completions",
      "/compatible-mode/v1/chat/completions",
    ];
    const chat = chatPaths.includes(request.url || "");
    const claude = request.url === "/v1/messages";
    const gemini = request.url === "/v1beta/models/test-model:generateContent";
    const authorized = claude
      ? request.headers["x-api-key"] === "test-key" &&
        request.headers["anthropic-version"] === "2023-06-01"
      : gemini
        ? request.headers["x-goog-api-key"] === "test-key"
        : request.headers.authorization === "Bearer test-key";
    const validBody = claude
      ? payload.model === "test-model" &&
        payload.max_tokens > 0 &&
        Array.isArray(payload.messages)
      : gemini
        ? Array.isArray(payload.contents)
        : payload.model === "test-model" && Array.isArray(payload.messages);
    const inference = body.includes("科研方向分析助手");
    const answer = inference
      ? "我的研究聚焦人机交互与飞行安全，常用访谈和实验方法。"
      : "# Mock note\n\n**Result**";
    const status =
      !chat && !claude && !gemini
        ? 404
        : !authorized
          ? 401
          : !validBody
            ? 400
            : 200;
    response.writeHead(status, {
      "Content-Type": "application/json",
    });
    response.end(
      status === 200
        ? JSON.stringify(
            claude
              ? {
                  content: [{ type: "text", text: answer }],
                }
              : gemini
                ? {
                    candidates: [
                      {
                        content: {
                          parts: [
                            { text: "Internal thought", thought: true },
                            { text: answer },
                          ],
                        },
                      },
                    ],
                  }
                : {
                    choices: [{ message: { content: answer } }],
                  },
          )
        : JSON.stringify({
            error: {
              message:
                status === 404
                  ? `InvalidAction: ${request.url}`
                  : status === 401
                    ? "Invalid API Key"
                    : "Invalid model or request body",
            },
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
