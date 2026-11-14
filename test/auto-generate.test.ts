import { assert } from "chai";
import {
  getSettings,
  setAutoGenerate,
  setNoteStyle,
  setPdfWaitMinutes,
  setSetting,
  type Settings,
} from "../src/services/PreferenceService";

const FIXTURE_PREF = "extensions.zotero.quickreadnote.testFixturePath";

function fixturePath(): string {
  return Zotero.Prefs.get(FIXTURE_PREF, true) as string;
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) return false;
    await Zotero.Promise.delay(100);
  }
  return true;
}

async function importPdf(parentItemID: number): Promise<void> {
  await Zotero.Attachments.importFromFile({
    file: fixturePath(),
    parentItemID,
    contentType: "application/pdf",
  });
}

function configureAutoGeneration(): Settings {
  const original = getSettings();
  setSetting("baseURL", "http://127.0.0.1:31337/v1");
  setSetting("apiKey", "test-key");
  setSetting("model", "test-model");
  setSetting("analysisPrompt", "Use the provided paper only.");
  setSetting("noteTemplate", "# Mock note");
  setNoteStyle("classic");
  setAutoGenerate(true);
  return original;
}

function restoreSettings(original: Settings): void {
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
  setNoteStyle(original.noteStyle);
  setAutoGenerate(original.autoGenerate);
  setPdfWaitMinutes(original.autoGeneratePdfWaitMinutes);
}

describe("Auto generation waits for the PDF", function () {
  this.timeout(60000);

  it("holds generation back until the PDF arrives, then generates from it", async function () {
    const original = configureAutoGeneration();
    setPdfWaitMinutes(10);
    const item = new Zotero.Item("journalArticle");
    item.setField("title", "Late PDF auto generation test");
    item.setField("abstractNote", "An abstract to fall back to.");
    try {
      await item.saveTx();

      // The old behaviour generated a note after the 3s settle delay from
      // metadata alone; the watcher must keep waiting for the PDF instead.
      await Zotero.Promise.delay(4500);
      assert.equal(
        item.getNotes().length,
        0,
        "note was generated before the PDF arrived",
      );

      await importPdf(item.id);
      const generated = await waitFor(() => item.getNotes().length > 0, 12000);
      assert.isTrue(generated, "note was not generated after the PDF arrived");
      const note = Zotero.Items.get(item.getNotes()[0]);
      assert.equal(note.parentItemID, item.id);
      assert.include(note.getNote(), "<h1>Mock note</h1>");
      assert.include(note.getNote(), 'data-quickreadnote="true"');
    } finally {
      restoreSettings(original);
      if (item.id) await item.eraseTx();
    }
  });

  it("times out without a PDF and skips items that have no abstract", async function () {
    const original = configureAutoGeneration();
    setPdfWaitMinutes(0);
    const item = new Zotero.Item("journalArticle");
    item.setField("title", "No PDF no abstract auto generation test");
    try {
      await item.saveTx();
      const appeared = await waitFor(() => item.getNotes().length > 0, 6000);
      assert.isFalse(appeared, "metadata-only note was generated");
      assert.equal(item.getNotes().length, 0);
    } finally {
      restoreSettings(original);
      if (item.id) await item.eraseTx();
    }
  });

  it("times out without a PDF but still generates from the abstract", async function () {
    const original = configureAutoGeneration();
    setPdfWaitMinutes(0);
    const item = new Zotero.Item("journalArticle");
    item.setField("title", "Abstract fallback auto generation test");
    item.setField("abstractNote", "An abstract for the fallback note.");
    try {
      await item.saveTx();
      const generated = await waitFor(() => item.getNotes().length > 0, 12000);
      assert.isTrue(generated, "abstract fallback note was not generated");
      const note = Zotero.Items.get(item.getNotes()[0]);
      assert.include(note.getNote(), "<h1>Mock note</h1>");
    } finally {
      restoreSettings(original);
      if (item.id) await item.eraseTx();
    }
  });
});
