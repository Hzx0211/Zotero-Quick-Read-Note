import { assert } from "chai";
import { config } from "../package.json";
import { createChildNote } from "../src/services/NoteService";
import { getPaperContent } from "../src/services/PDFTextService";
import { completeNote } from "../src/services/LLMService";
import { buildMessages } from "../src/services/PromptService";
import { getSettings, setSetting } from "../src/services/PreferenceService";

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
    } finally {
      setSetting("researchContext", original);
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
      baseURL: "http://127.0.0.1:31337/v1",
      apiKey: "test-key",
      model: "test-model",
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
      assert.include(note.getNote(), "<h1>Mock note</h1>");
    } finally {
      for (const [key, value] of Object.entries(original)) {
        setSetting(key as keyof typeof original, value);
      }
      await item.eraseTx();
    }
  });
});
