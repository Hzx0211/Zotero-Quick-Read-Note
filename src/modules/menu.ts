import { completeNote } from "../services/LLMService";
import { createChildNote } from "../services/NoteService";
import { getPaperContent } from "../services/PDFTextService";
import { getSettings } from "../services/PreferenceService";
import { buildMessages } from "../services/PromptService";
import { getMetadata, validateSelection } from "../services/ZoteroItemService";

const activeItems = new Set<number>();

export function registerItemMenu(win: _ZoteroTypes.MainWindow): void {
  const popup = win.document.querySelector(
    "#zotero-itemmenu",
  ) as XUL.MenuPopup | null;
  if (!popup) return;
  if (win.document.getElementById("quickreadnote-generate")) return;
  ztoolkit.Menu.register(popup, {
    tag: "menuitem",
    id: "quickreadnote-generate",
    label: "快速添加粗读笔记",
    commandListener: () => {
      void generate(win);
    },
  });
}

async function generate(win: _ZoteroTypes.MainWindow): Promise<void> {
  const progress = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeTime: -1,
  })
    .createLine({ text: "正在生成粗读笔记……", type: "default" })
    .show();

  let itemID: number | undefined;
  try {
    const item = validateSelection(win.ZoteroPane.getSelectedItems());
    itemID = item.id;
    if (activeItems.has(itemID))
      throw new Error("这篇文献的笔记正在生成，请稍候。");
    activeItems.add(itemID);

    const settings = getSettings();
    if (!settings.analysisPrompt.trim())
      throw new Error("Analysis Prompt 不能为空。");
    if (!settings.noteTemplate.trim())
      throw new Error("Note Template 不能为空。");

    const metadata = getMetadata(item);
    const paper = await getPaperContent(item, metadata.abstractNote);
    if (paper.mode === "abstract") {
      progress.changeLine({ text: "未找到 PDF，正在使用摘要模式……" });
    }
    const messages = buildMessages(settings, metadata, paper);
    const markdown = await completeNote(settings, messages);
    await createChildNote(item, markdown);

    progress.changeLine({
      text: "粗读笔记已生成",
      type: "success",
      progress: 100,
    });
    progress.startCloseTimer(5000);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    progress.changeLine({ text: message, type: "fail", progress: 100 });
    progress.startCloseTimer(9000);
    Zotero.logError(new Error(`Quick Read Note: ${message}`));
  } finally {
    if (itemID !== undefined) activeItems.delete(itemID);
  }
}
