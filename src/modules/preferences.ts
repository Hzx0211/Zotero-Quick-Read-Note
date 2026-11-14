import {
  getSettings,
  setAutoGenerate,
  setCustomProtocol,
  setNoteStyle,
  setProvider,
  setSetting,
  type ApiProtocol,
  type NoteStyle,
  type ProviderId,
  type TextSettingKey,
} from "../services/PreferenceService";
import { FilePickerHelper } from "zotero-plugin-toolkit";
import { inferResearchContext, testConnection } from "../services/LLMService";
import { extractResearchFiles } from "../services/ResearchFileService";

const fields: TextSettingKey[] = [
  "analysisPrompt",
  "researchContext",
  "noteTemplate",
];

export async function registerPreferences(): Promise<void> {
  await Zotero.PreferencePanes.register({
    pluginID: addon.data.config.addonID,
    src: rootURI + "content/preferences.xhtml",
    label: addon.data.config.addonName,
    image: `chrome://${addon.data.config.addonRef}/content/icons/logo.png`,
  });
}

export function bindPreferenceInputs(win: Window): void {
  const document = win.document;
  const values = getSettings();
  for (const field of fields) {
    const element = document.getElementById(`quickread-${field}`) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (!element) continue;
    element.value = values[field];
    element.addEventListener("change", () => setSetting(field, element.value));
  }
  const provider = document.getElementById(
    "quickread-providerId",
  ) as XUL.MenuList | null;
  const protocol = document.getElementById(
    "quickread-protocol",
  ) as XUL.MenuList | null;
  const protocolLabel = document.getElementById(
    "quickread-protocol-label",
  ) as HTMLElement | null;
  const baseURL = document.getElementById(
    "quickread-baseURL",
  ) as HTMLInputElement | null;
  const apiKey = document.getElementById(
    "quickread-apiKey",
  ) as HTMLInputElement | null;
  const model = document.getElementById(
    "quickread-model",
  ) as HTMLInputElement | null;
  const testButton = document.getElementById(
    "quickread-testConnection",
  ) as HTMLButtonElement | null;
  const testStatus = document.getElementById("quickread-testStatus");
  const noteStyle = document.getElementById(
    "quickread-noteStyle",
  ) as XUL.MenuList | null;
  const analysisToggle = document.getElementById(
    "quickread-analysisToggle",
  ) as HTMLButtonElement | null;
  const analysisPanel = document.getElementById(
    "quickread-analysisPanel",
  ) as HTMLElement | null;
  const analysisPrompt = document.getElementById(
    "quickread-analysisPrompt",
  ) as HTMLTextAreaElement | null;
  const researchContext = document.getElementById(
    "quickread-researchContext",
  ) as HTMLTextAreaElement | null;
  const inferButton = document.getElementById(
    "quickread-inferContext",
  ) as HTMLButtonElement | null;
  const contextStatus = document.getElementById("quickread-contextStatus");
  const previewPanel = document.getElementById(
    "quickread-contextPreviewPanel",
  ) as HTMLElement | null;
  const contextPreview = document.getElementById(
    "quickread-contextPreview",
  ) as HTMLTextAreaElement | null;
  const applyContext = document.getElementById(
    "quickread-applyContext",
  ) as HTMLButtonElement | null;
  const cancelContext = document.getElementById(
    "quickread-cancelContext",
  ) as HTMLButtonElement | null;

  function saveActiveProfile() {
    if (baseURL) setSetting("baseURL", baseURL.value);
    if (apiKey) setSetting("apiKey", apiKey.value);
    if (model) setSetting("model", model.value);
  }

  function renderProfile() {
    const settings = getSettings();
    if (provider) provider.value = settings.providerId;
    if (protocol) {
      protocol.value = settings.protocol;
      protocol.style.display = settings.providerId === "custom" ? "" : "none";
    }
    if (protocolLabel) {
      protocolLabel.style.display =
        settings.providerId === "custom" ? "" : "none";
    }
    if (baseURL) baseURL.value = settings.baseURL;
    if (apiKey) apiKey.value = settings.apiKey;
    if (model) model.value = settings.model;
    if (testStatus) testStatus.textContent = "";
  }

  for (const [key, input] of [
    ["baseURL", baseURL],
    ["apiKey", apiKey],
    ["model", model],
  ] as const) {
    input?.addEventListener("change", () => setSetting(key, input.value));
  }
  provider?.addEventListener("command", () => {
    saveActiveProfile();
    setProvider(provider.value as ProviderId);
    renderProfile();
  });
  protocol?.addEventListener("command", () => {
    setCustomProtocol(protocol.value as ApiProtocol);
    if (testStatus) testStatus.textContent = "";
  });
  testButton?.addEventListener("click", () => {
    void (async () => {
      saveActiveProfile();
      if (testStatus) testStatus.textContent = "正在测试连接……";
      testButton.disabled = true;
      try {
        await testConnection(getSettings());
        if (testStatus) testStatus.textContent = "连接成功，模型已返回文本。";
      } catch (error) {
        if (testStatus) {
          testStatus.textContent =
            error instanceof Error ? error.message : String(error);
        }
      } finally {
        testButton.disabled = false;
      }
    })();
  });
  renderProfile();

  analysisToggle?.addEventListener("click", () => {
    if (!analysisPanel) return;
    const expanding = analysisPanel.hidden;
    if (!expanding && analysisPrompt) {
      setSetting("analysisPrompt", analysisPrompt.value);
    }
    analysisPanel.hidden = !expanding;
    analysisToggle.setAttribute("aria-expanded", String(expanding));
    analysisToggle.textContent = expanding ? "收起" : "展开并自定义";
  });

  inferButton?.addEventListener("click", () => {
    void (async () => {
      if (inferButton.disabled) return;
      inferButton.disabled = true;
      try {
        const paths = await new FilePickerHelper(
          "选择简历或研究材料",
          "multiple",
          [["PDF、DOCX、TXT", "*.pdf;*.docx;*.txt"]],
          undefined,
          win,
        ).open();
        if (!paths) return;
        saveActiveProfile();
        const settings = getSettings();
        if (previewPanel) previewPanel.hidden = true;
        if (contextPreview) contextPreview.value = "";
        if (contextStatus) contextStatus.textContent = "正在读取文件文字……";
        const source = await extractResearchFiles(paths);
        if (contextStatus) contextStatus.textContent = "正在推断研究领域……";
        const draft = await inferResearchContext(settings, source.text);
        if (contextPreview) contextPreview.value = draft;
        if (previewPanel) previewPanel.hidden = false;
        if (contextStatus) {
          contextStatus.textContent = source.truncated
            ? "推断完成。部分文件文字已按长度限制截断，请检查预览。"
            : "推断完成。检查预览后点击应用。";
        }
      } catch (error) {
        if (contextStatus) {
          const message = error instanceof Error ? error.message : "推断失败。";
          const status = message.match(/HTTP \d{3}/)?.[0];
          contextStatus.textContent = status
            ? `推断失败（${status}），请检查 API 设置。`
            : /^(第 \d+ 份文件|仅支持|请选择|PDF |DOCX |TXT |当前 Zotero)/.test(
                  message,
                )
              ? message
              : "推断失败，请检查文件和 API 设置。";
        }
      } finally {
        inferButton.disabled = false;
      }
    })();
  });

  applyContext?.addEventListener("click", () => {
    const value = contextPreview?.value.trim();
    if (!value || !researchContext) {
      if (contextStatus) contextStatus.textContent = "预览为空，无法应用。";
      return;
    }
    researchContext.value = value;
    setSetting("researchContext", value);
    if (previewPanel) previewPanel.hidden = true;
    if (contextStatus)
      contextStatus.textContent = "已应用到 Research Context。";
  });
  cancelContext?.addEventListener("click", () => {
    if (previewPanel) previewPanel.hidden = true;
    if (contextPreview) contextPreview.value = "";
    if (contextStatus) contextStatus.textContent = "已取消，原内容未更改。";
  });

  if (noteStyle) {
    noteStyle.value = values.noteStyle;
    noteStyle.addEventListener("command", () =>
      setNoteStyle(noteStyle.value as NoteStyle),
    );
  }

  const checkbox = document.getElementById(
    "quickread-autoGenerate",
  ) as HTMLInputElement | null;
  if (checkbox) {
    checkbox.checked = values.autoGenerate;
    checkbox.addEventListener("change", () =>
      setAutoGenerate(checkbox.checked),
    );
  }
}
