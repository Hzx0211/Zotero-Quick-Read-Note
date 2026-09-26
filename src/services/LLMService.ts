import type { ChatMessage } from "./PromptService";
import type { Settings } from "./PreferenceService";

export async function completeNote(
  settings: Settings,
  messages: ChatMessage[],
): Promise<string> {
  if (!settings.apiKey.trim())
    throw new Error("API Key 未配置，请在插件 Preferences 中填写。");
  if (!settings.model.trim())
    throw new Error("Model 未配置，请在插件 Preferences 中填写。");
  if (!settings.baseURL.trim()) throw new Error("API Base URL 未配置。");

  let url: URL;
  try {
    url = new URL(settings.baseURL.replace(/\/+$/, "") + "/chat/completions");
  } catch {
    throw new Error("API Base URL 格式无效。");
  }
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  ) {
    throw new Error(
      "API Base URL 必须使用 HTTPS；本机 localhost 可使用 HTTP。",
    );
  }

  let response: XMLHttpRequest;
  try {
    response = await Zotero.HTTP.request("POST", url.href, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey.trim()}`,
      },
      body: JSON.stringify({ model: settings.model.trim(), messages }),
      timeout: 120000,
      successCodes: false,
      errorDelayMax: 0,
      logBodyLength: 0,
      debug: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`API 请求失败：${message}`);
  }

  if (response.status === 0) {
    throw new Error("API 请求失败：无法连接到服务器，请检查地址和网络连接。");
  }
  if (response.status < 200 || response.status >= 300) {
    let detail = "";
    try {
      detail = JSON.parse(response.responseText || "")?.error?.message || "";
    } catch {
      // The endpoint may return plain text or HTML.
    }
    throw new Error(
      `API 请求失败（HTTP ${response.status}）${detail ? `：${detail}` : ""}`,
    );
  }

  let content: unknown;
  try {
    content = JSON.parse(response.responseText || "")?.choices?.[0]?.message
      ?.content;
  } catch {
    throw new Error("API 返回了无效的 JSON。");
  }
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("模型返回为空。");
  }
  return content
    .trim()
    .replace(/^```(?:markdown|md)?\s*\n/i, "")
    .replace(/\n```\s*$/, "")
    .trim();
}
