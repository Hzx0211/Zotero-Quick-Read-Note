import { assert } from "chai";
import { config } from "../package.json";
import { createChildNote } from "../src/services/NoteService";
import { getPaperContent } from "../src/services/PDFTextService";
import {
  completeNote,
  resolveApiURL,
  testConnection,
} from "../src/services/LLMService";
import { buildMessages } from "../src/services/PromptService";
import {
  PROVIDER_PRESETS,
  getSettings,
  setAutoGenerate,
  setCustomProtocol,
  setNoteStyle,
  setProvider,
  setSetting,
} from "../src/services/PreferenceService";
import { getPref, setPref } from "../src/utils/prefs";

describe("Zotero 10 integration", function () {
  it("registers the menu and preferences pane", function () {
    const plugin = (Zotero as any)[config.addonInstance];
    assert.isTrue(plugin.data.initialized);
    assert.isNotNull(
      Zotero.getMainWindow().document.getElementById("quickreadnote-generate"),
    );
    assert.isTrue(
      Zotero.PreferencePanes.pluginPanes.some(
        (pane) => pane.pluginID === config.addonID,
      ),
    );
  });

  it("opens Preferences and persists an edited field", async function () {
    const pane = Zotero.PreferencePanes.pluginPanes.find(
      (candidate) => candidate.pluginID === config.addonID,
    );
    assert.isDefined(pane);
    const prefsWindow = Zotero.Utilities.Internal.openPreferences(pane!.id);
    assert.isNotNull(prefsWindow);
    const original = getSettings().researchContext;
    const originalAnalysis = getSettings().analysisPrompt;
    const originalAuto = getSettings().autoGenerate;
    const originalStyle = getSettings().noteStyle;
    try {
      let field: HTMLTextAreaElement | null = null;
      for (let attempt = 0; attempt < 50; attempt++) {
        field = prefsWindow!.document.getElementById(
          "quickread-researchContext",
        ) as HTMLTextAreaElement | null;
        if (field) break;
        await Zotero.Promise.delay(100);
      }
      assert.isNotNull(field);
      field!.value = "Integration test context";
      field!.dispatchEvent(new prefsWindow!.Event("change", { bubbles: true }));
      assert.equal(getSettings().researchContext, "Integration test context");
      const analysisPanel = prefsWindow!.document.getElementById(
        "quickread-analysisPanel",
      ) as HTMLElement;
      const analysisToggle = prefsWindow!.document.getElementById(
        "quickread-analysisToggle",
      ) as HTMLButtonElement;
      const analysisPrompt = prefsWindow!.document.getElementById(
        "quickread-analysisPrompt",
      ) as HTMLTextAreaElement;
      assert.isTrue(analysisPanel.hidden);
      assert.equal(analysisPrompt.value, originalAnalysis);
      analysisToggle.click();
      assert.isFalse(analysisPanel.hidden);
      analysisPrompt.value = "Integration test analysis";
      analysisToggle.click();
      assert.isTrue(analysisPanel.hidden);
      assert.equal(getSettings().analysisPrompt, "Integration test analysis");

      const previewPanel = prefsWindow!.document.getElementById(
        "quickread-contextPreviewPanel",
      ) as HTMLElement;
      const preview = prefsWindow!.document.getElementById(
        "quickread-contextPreview",
      ) as HTMLTextAreaElement;
      const apply = prefsWindow!.document.getElementById(
        "quickread-applyContext",
      ) as HTMLButtonElement;
      const cancel = prefsWindow!.document.getElementById(
        "quickread-cancelContext",
      ) as HTMLButtonElement;
      const infer = prefsWindow!.document.getElementById(
        "quickread-inferContext",
      ) as HTMLButtonElement;
      const status = prefsWindow!.document.getElementById(
        "quickread-contextStatus",
      ) as HTMLElement;
      const info = prefsWindow!.document.querySelector(
        ".quickread-context-info",
      ) as HTMLElement;
      assert.isTrue(previewPanel.hidden);
      assert.equal(prefsWindow!.getComputedStyle(previewPanel).display, "none");
      assert.equal(info.tabIndex, 0);
      assert.include(info.title, "仅提取文字");
      const fieldRect = field!.getBoundingClientRect();
      assert.closeTo(infer.getBoundingClientRect().left, fieldRect.left, 2);
      status.textContent = "正在推断研究领域……";
      assert.closeTo(status.getBoundingClientRect().left, fieldRect.left, 2);
      status.textContent = "";
      previewPanel.hidden = false;
      assert.equal(prefsWindow!.getComputedStyle(previewPanel).display, "grid");
      const previewRect = preview.getBoundingClientRect();
      assert.closeTo(previewRect.left, fieldRect.left, 2);
      assert.closeTo(previewRect.width, fieldRect.width, 2);
      assert.isAtLeast(apply.getBoundingClientRect().left, fieldRect.left);
      assert.isAtMost(
        cancel.getBoundingClientRect().right,
        fieldRect.right + 2,
      );
      const grid = field!.closest(".quickread-grid") as HTMLElement;
      const originalWidth = grid.style.width;
      grid.style.width = "520px";
      assert.closeTo(
        preview.getBoundingClientRect().left,
        field!.getBoundingClientRect().left,
        2,
      );
      assert.isAtMost(
        preview.getBoundingClientRect().right,
        grid.getBoundingClientRect().right + 2,
      );
      grid.style.width = originalWidth;
      preview.value = "推断并编辑后的研究方向";
      assert.equal(getSettings().researchContext, "Integration test context");
      apply.click();
      assert.equal(getSettings().researchContext, "推断并编辑后的研究方向");
      assert.isTrue(previewPanel.hidden);
      previewPanel.hidden = false;
      preview.value = "不应保存的草稿";
      cancel.click();
      assert.equal(getSettings().researchContext, "推断并编辑后的研究方向");
      const checkbox = prefsWindow!.document.getElementById(
        "quickread-autoGenerate",
      ) as HTMLInputElement | null;
      assert.isNotNull(checkbox);
      assert.equal(checkbox!.checked, originalAuto);
      checkbox!.checked = !originalAuto;
      checkbox!.dispatchEvent(
        new prefsWindow!.Event("change", { bubbles: true }),
      );
      assert.equal(getSettings().autoGenerate, !originalAuto);
      const noteStyle = prefsWindow!.document.getElementById(
        "quickread-noteStyle",
      ) as XUL.MenuList | null;
      assert.isNotNull(noteStyle);
      assert.equal(noteStyle!.itemCount, 3);
      noteStyle!.value = "flow";
      noteStyle!.dispatchEvent(
        new prefsWindow!.Event("command", { bubbles: true }),
      );
      assert.equal(getSettings().noteStyle, "flow");
      noteStyle!.value = originalStyle === "cards" ? "classic" : "cards";
      noteStyle!.dispatchEvent(
        new prefsWindow!.Event("command", { bubbles: true }),
      );
      assert.equal(getSettings().noteStyle, noteStyle!.value);
    } finally {
      setSetting("researchContext", original);
      setSetting("analysisPrompt", originalAnalysis);
      setAutoGenerate(originalAuto);
      setNoteStyle(originalStyle);
      prefsWindow?.close();
    }
  });

  it("switches providers and tests the connection from Preferences", async function () {
    const original = {
      providerId: getPref("providerId"),
      providerProfiles: getPref("providerProfiles"),
      customProtocol: getPref("customProtocol"),
    };
    setProvider("custom");
    const pane = Zotero.PreferencePanes.pluginPanes.find(
      (candidate) => candidate.pluginID === config.addonID,
    );
    const prefsWindow = Zotero.Utilities.Internal.openPreferences(pane!.id);
    assert.isNotNull(prefsWindow);
    try {
      let provider: XUL.MenuList | null = null;
      for (let attempt = 0; attempt < 50; attempt++) {
        provider = prefsWindow!.document.getElementById(
          "quickread-providerId",
        ) as XUL.MenuList | null;
        if (provider) break;
        await Zotero.Promise.delay(100);
      }
      assert.isNotNull(provider);
      assert.equal(provider!.itemCount, 9);
      const protocol = prefsWindow!.document.getElementById(
        "quickread-protocol",
      ) as XUL.MenuList;
      assert.equal(protocol.itemCount, 3);
      protocol.value = "claude";
      protocol.dispatchEvent(
        new prefsWindow!.Event("command", { bubbles: true }),
      );
      assert.equal(getSettings().protocol, "claude");
      protocol.value = "openai";
      protocol.dispatchEvent(
        new prefsWindow!.Event("command", { bubbles: true }),
      );
      provider!.value = "volcengine";
      provider!.dispatchEvent(
        new prefsWindow!.Event("command", { bubbles: true }),
      );
      const baseURL = prefsWindow!.document.getElementById(
        "quickread-baseURL",
      ) as HTMLInputElement;
      const apiKey = prefsWindow!.document.getElementById(
        "quickread-apiKey",
      ) as HTMLInputElement;
      const model = prefsWindow!.document.getElementById(
        "quickread-model",
      ) as HTMLInputElement;
      const button = prefsWindow!.document.getElementById(
        "quickread-testConnection",
      ) as HTMLButtonElement;
      const status = prefsWindow!.document.getElementById(
        "quickread-testStatus",
      );
      const addressLabel = prefsWindow!.document.querySelector(
        'label[for="quickread-baseURL"]',
      ) as HTMLElement;
      assert.equal(baseURL.value, PROVIDER_PRESETS.volcengine.baseURL);
      assert.equal(
        prefsWindow!.getComputedStyle(addressLabel).alignSelf,
        "center",
      );
      assert.isNotNull(button);
      assert.isNotNull(status);
      baseURL.value = "http://127.0.0.1:31337/api/v3";
      apiKey.value = "test-key";
      model.value = "test-model";
      button.click();
      for (let attempt = 0; attempt < 50; attempt++) {
        if (status!.textContent?.includes("连接成功")) break;
        await Zotero.Promise.delay(100);
      }
      assert.include(status!.textContent, "连接成功");
      assert.equal(getSettings().providerId, "volcengine");
      provider!.value = "custom";
      provider!.dispatchEvent(
        new prefsWindow!.Event("command", { bubbles: true }),
      );
      provider!.value = "volcengine";
      provider!.dispatchEvent(
        new prefsWindow!.Event("command", { bubbles: true }),
      );
      assert.equal(apiKey.value, "test-key");
      assert.equal(model.value, "test-model");
    } finally {
      setPref("providerId", original.providerId);
      setPref("providerProfiles", original.providerProfiles);
      setPref("customProtocol", original.customProtocol);
      prefsWindow?.close();
    }
  });

  it("uses abstract mode and creates formatted child notes", async function () {
    const item = new Zotero.Item("journalArticle");
    item.setField("title", "Quick Read integration test");
    await item.saveTx();
    try {
      const content = await getPaperContent(item, "A test abstract.");
      assert.equal(content.mode, "abstract");
      assert.equal(content.text, "A test abstract.");

      const note = await createChildNote(
        item,
        "# Heading\n\nA **bold** and *italic* paragraph.\n\n- First item",
        "classic",
      );
      assert.equal(note.parentItemID, item.id);
      assert.include(note.getNote(), "<h1>Heading</h1>");
      assert.include(note.getNote(), "<strong>bold</strong>");
      assert.include(note.getNote(), "<em>italic</em>");
      assert.include(note.getNote(), "<li>First item</li>");
    } finally {
      await item.eraseTx();
    }
  });

  it("persists card blocks, nested headings, and lists in a Zotero child note", async function () {
    const item = new Zotero.Item("journalArticle");
    item.setField("title", "Cards persistence test");
    await item.saveTx();
    try {
      const note = await createChildNote(
        item,
        "# 研究方法\n\n## Study 1\n\n- 样本 A\n\n> 原文引用",
        "cards",
      );
      const saved = Zotero.Items.get(note.id).getNote();
      assert.include(
        saved,
        '<blockquote class="quickread-card quickread-card-method"',
      );
      assert.include(saved, "<h2>🧪 研究方法</h2>");
      assert.include(saved, "<h3>Study 1</h3>");
      assert.include(saved, "<li>样本 A</li>");
      assert.include(saved, "<blockquote>\n<p>原文引用</p>");
    } finally {
      await item.eraseTx();
    }
  });

  it("persists editable flow steps and tables in a Zotero child note", async function () {
    const item = new Zotero.Item("journalArticle");
    item.setField("title", "Flow persistence test");
    await item.saveTx();
    try {
      const note = await createChildNote(
        item,
        "# 研究方法\n\n```quickread-flow\n研究问题\n访谈 | 实验\n综合分析\n```\n\n| 维度 | 内容 |\n|---|---|\n| 样本 | 14 人 |",
        "flow",
      );
      const saved = Zotero.Items.get(note.id).getNote();
      assert.include(saved, "<h1>研究方法</h1>");
      assert.include(saved, '<blockquote class="quickread-flow-step"');
      assert.include(saved, "访谈");
      assert.include(saved, "实验");
      assert.include(saved, "↓");
      assert.include(saved, '<table class="quickread-flow-branches"');
      assert.include(saved, '<table class="quickread-flow-table"');
      assert.include(saved, "14 人");
    } finally {
      await item.eraseTx();
    }
  });

  it("extracts text from a real PDF attachment with Zotero FullText", async function () {
    const item = new Zotero.Item("journalArticle");
    item.setField("title", "PDF extraction test");
    await item.saveTx();
    try {
      const fixturePath = Zotero.Prefs.get(
        "extensions.zotero.quickreadnote.testFixturePath",
        true,
      ) as string;
      await Zotero.Attachments.importFromFile({
        file: fixturePath,
        parentItemID: item.id,
        contentType: "application/pdf",
      });
      const content = await getPaperContent(item, "Fallback abstract");
      assert.equal(content.mode, "pdf");
      assert.include(content.text, "Quick Read PDF Integration Test");
      assert.include(content.text, "twelve fictional articles");
    } finally {
      await item.eraseTx();
    }
  });

  it("sends a Chat Completions request and reads its Markdown response", async function () {
    const settings = {
      providerId: "custom" as const,
      protocol: "openai" as const,
      baseURL: "http://127.0.0.1:31337/v1",
      apiKey: "test-key",
      model: "test-model",
      autoGenerate: false,
      noteStyle: "cards" as const,
      analysisPrompt: "Follow the source.",
      researchContext: "Notes research",
      noteTemplate: "# Mock note",
    };
    const messages = buildMessages(
      settings,
      {
        title: "Mock paper",
        creators: [],
        publicationTitle: "",
        date: "",
        year: "",
        DOI: "",
        abstractNote: "Abstract",
        tags: [],
        itemType: "journalArticle",
      },
      { mode: "abstract", text: "Abstract", truncated: false },
    );
    const result = await completeNote(settings, messages);
    assert.include(result, "# Mock note");
    assert.include(messages[1].content, "Notes research");
    assert.include(messages[1].content, "# Mock note");
  });

  it("resolves provider URLs without duplicating Chat Completions", function () {
    assert.equal(
      resolveApiURL(PROVIDER_PRESETS.volcengine.baseURL, "openai", "test-model")
        .href,
      "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    );
    for (const input of [
      "http://127.0.0.1:31337/api/v3",
      "http://127.0.0.1:31337/api/v3/",
      "http://127.0.0.1:31337/api/v3/chat/completions",
    ]) {
      assert.equal(
        resolveApiURL(input, "openai", "test-model").pathname,
        "/api/v3/chat/completions",
      );
    }
    assert.throws(
      () =>
        resolveApiURL(
          "http://127.0.0.1:31337/api/v3/chat/completions/chat/completions",
          "openai",
          "test-model",
        ),
      "重复",
    );
    for (const id of ["openai", "deepseek", "zhipu", "kimi", "qwen"] as const) {
      assert.match(
        resolveApiURL(PROVIDER_PRESETS[id].baseURL, "openai", "test-model")
          .pathname,
        /\/chat\/completions$/,
      );
    }
  });

  it("sends compatible requests for every Chat Completions preset", async function () {
    const messages = [{ role: "user" as const, content: "Summarize." }];
    for (const [id, path] of [
      ["openai", "/v1"],
      ["volcengine", "/api/v3"],
      ["deepseek", ""],
      ["zhipu", "/api/paas/v4"],
      ["kimi", "/v1"],
      ["qwen", "/compatible-mode/v1"],
    ] as const) {
      const result = await completeNote(
        {
          ...getSettings(),
          providerId: id,
          protocol: PROVIDER_PRESETS[id].protocol,
          baseURL: `http://127.0.0.1:31337${path}`,
          apiKey: "test-key",
          model: "test-model",
        },
        messages,
      );
      assert.include(result, "# Mock note", id);
    }
  });

  it("keeps independent provider profiles and the existing custom values", function () {
    const original = {
      providerId: getPref("providerId"),
      customProtocol: getPref("customProtocol"),
      providerProfiles: getPref("providerProfiles"),
      baseURL: getPref("baseURL"),
      apiKey: getPref("apiKey"),
      model: getPref("model"),
    };
    try {
      setProvider("custom");
      setCustomProtocol("openai");
      setSetting("baseURL", "http://127.0.0.1:31337/v1");
      setSetting("apiKey", "custom-key");
      setSetting("model", "custom-model");
      setProvider("volcengine");
      assert.equal(getSettings().baseURL, PROVIDER_PRESETS.volcengine.baseURL);
      setSetting("apiKey", "ark-key");
      setSetting("model", "ark-model");
      setProvider("deepseek");
      assert.notEqual(getSettings().apiKey, "ark-key");
      setProvider("volcengine");
      assert.equal(getSettings().apiKey, "ark-key");
      assert.equal(getSettings().model, "ark-model");
      setProvider("custom");
      assert.equal(getSettings().apiKey, "custom-key");
      assert.equal(getSettings().model, "custom-model");
    } finally {
      for (const [key, value] of Object.entries(original)) {
        setPref(key as keyof typeof original, value);
      }
    }
  });

  it("uses the Claude and Gemini native request formats", async function () {
    const settings = getSettings();
    const messages = [
      { role: "system" as const, content: "Follow the source." },
      { role: "user" as const, content: "Summarize this paper." },
    ];
    const claude = await completeNote(
      {
        ...settings,
        protocol: "claude",
        baseURL: "http://127.0.0.1:31337/v1",
        apiKey: "test-key",
        model: "test-model",
      },
      messages,
    );
    assert.include(claude, "# Mock note");
    await testConnection({
      ...settings,
      protocol: "claude",
      baseURL: "http://127.0.0.1:31337/v1",
      apiKey: "test-key",
      model: "test-model",
    });
    const gemini = await completeNote(
      {
        ...settings,
        protocol: "gemini",
        baseURL: "http://127.0.0.1:31337/v1beta",
        apiKey: "test-key",
        model: "test-model",
      },
      messages,
    );
    assert.include(gemini, "# Mock note");
    assert.notInclude(gemini, "Internal thought");
    await testConnection({
      ...settings,
      protocol: "gemini",
      baseURL: "http://127.0.0.1:31337/v1beta",
      apiKey: "test-key",
      model: "test-model",
    });
  });

  it("tests the connection and reports authorization, route, and model errors", async function () {
    const settings = {
      ...getSettings(),
      protocol: "openai" as const,
      baseURL: "http://127.0.0.1:31337/api/v3/chat/completions",
      apiKey: "test-key",
      model: "test-model",
    };
    await testConnection(settings);
    for (const [changes, detail] of [
      [{ apiKey: "bad-key" }, "HTTP 401"],
      [{ baseURL: "http://127.0.0.1:31337/missing" }, "HTTP 404"],
      [{ model: "unknown-model" }, "Invalid model"],
    ] as const) {
      try {
        await testConnection({ ...settings, ...changes });
        assert.fail("连接测试应返回错误");
      } catch (error) {
        assert.include(String(error), detail);
        assert.notInclude(String(error), "bad-key");
      }
    }
  });

  it("runs the full menu-to-PDF-to-LLM-to-child-note flow", async function () {
    const original = getSettings();
    const item = new Zotero.Item("journalArticle");
    item.setField("title", "Full workflow test");
    await item.saveTx();
    try {
      const fixturePath = Zotero.Prefs.get(
        "extensions.zotero.quickreadnote.testFixturePath",
        true,
      ) as string;
      await Zotero.Attachments.importFromFile({
        file: fixturePath,
        parentItemID: item.id,
        contentType: "application/pdf",
      });
      setSetting("baseURL", "http://127.0.0.1:31337/v1");
      setSetting("apiKey", "test-key");
      setSetting("model", "test-model");
      setSetting("analysisPrompt", "Use the provided paper only.");
      setSetting("noteTemplate", "# Mock note");
      setNoteStyle("cards");

      const win = Zotero.getMainWindow();
      win.ZoteroPane.selectItem(item.id, true);
      await Zotero.Promise.delay(100);
      const menu = win.document.getElementById(
        "quickreadnote-generate",
      ) as XUL.MenuItem | null;
      assert.isNotNull(menu);
      menu!.doCommand();

      let noteID: number | undefined;
      for (let attempt = 0; attempt < 100; attempt++) {
        noteID = item.getNotes()[0];
        if (noteID) break;
        await Zotero.Promise.delay(100);
      }
      assert.isNumber(noteID, "The menu did not create a child note");
      const note = Zotero.Items.get(noteID!);
      assert.equal(note.parentItemID, item.id);
      assert.include(note.getNote(), "quickread-card-default");
      assert.include(note.getNote(), "<h2>Mock note</h2>");
    } finally {
      for (const key of [
        "baseURL",
        "apiKey",
        "model",
        "analysisPrompt",
        "researchContext",
        "noteTemplate",
      ] as const) {
        setSetting(key, original[key]);
      }
      setAutoGenerate(original.autoGenerate);
      setNoteStyle(original.noteStyle);
      await item.eraseTx();
    }
  });

  it("auto-generates only one note for a newly added item", async function () {
    const original = getSettings();
    const item = new Zotero.Item("journalArticle");
    item.setField("title", "Automatic quick read test");
    try {
      setSetting("baseURL", "http://127.0.0.1:31337/v1");
      setSetting("apiKey", "test-key");
      setSetting("model", "test-model");
      setSetting("analysisPrompt", "Use the provided paper only.");
      setSetting("noteTemplate", "# Mock note");
      setNoteStyle("classic");
      setAutoGenerate(true);
      await item.saveTx();
      const fixturePath = Zotero.Prefs.get(
        "extensions.zotero.quickreadnote.testFixturePath",
        true,
      ) as string;
      await Zotero.Attachments.importFromFile({
        file: fixturePath,
        parentItemID: item.id,
        contentType: "application/pdf",
      });

      for (
        let attempt = 0;
        attempt < 100 && !item.getNotes().length;
        attempt++
      ) {
        await Zotero.Promise.delay(100);
      }
      assert.equal(item.getNotes().length, 1);
      const note = Zotero.Items.get(item.getNotes()[0]);
      assert.include(note.getNote(), "<h1>Mock note</h1>");
      assert.include(note.getNote(), 'data-quickreadnote="true"');

      await Zotero.Notifier.trigger("add", "item", item.id);
      await Zotero.Promise.delay(3500);
      assert.equal(item.getNotes().length, 1);
    } finally {
      setAutoGenerate(original.autoGenerate);
      setNoteStyle(original.noteStyle);
      for (const key of [
        "baseURL",
        "apiKey",
        "model",
        "analysisPrompt",
        "researchContext",
        "noteTemplate",
      ] as const) {
        setSetting(key, original[key]);
      }
      if (item.id) await item.eraseTx();
    }
  });
});
