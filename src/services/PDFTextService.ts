import { getPDFAttachment } from "./ZoteroItemService";

// Character limit is conservative across OpenAI-compatible models. The PDF
// extraction boundary lives here so a future chunking strategy can replace it.
export const MAX_PDF_CHARS = 80000;

export type PaperContent = {
  mode: "pdf" | "abstract";
  text: string;
  truncated: boolean;
};

export async function getPaperContent(
  item: Zotero.Item,
  abstractNote: string,
): Promise<PaperContent> {
  const pdf = getPDFAttachment(item);
  if (!pdf) {
    return { mode: "abstract", text: abstractNote, truncated: false };
  }

  try {
    const path = await pdf.getFilePathAsync();
    if (!path) throw new Error("PDF 文件在本机不可用。");

    const cacheFile = Zotero.FullText.getItemCacheFile(pdf);
    const state = await Zotero.FullText.getIndexedState(pdf);
    if (
      !cacheFile.exists() ||
      state === Zotero.FullText.INDEX_STATE_UNINDEXED ||
      state === Zotero.FullText.INDEX_STATE_PARTIAL
    ) {
      await Zotero.FullText.indexItems([pdf.id], { complete: true });
    }
    if (!cacheFile.exists()) throw new Error("Zotero 未能提取 PDF 文本。");

    const extracted = await Zotero.File.getContentsAsync(
      cacheFile,
      "utf-8",
      MAX_PDF_CHARS + 1,
    );
    const text = String(extracted || "").trim();
    if (!text) throw new Error("PDF 没有可读取的文本，可能是扫描件。");
    return {
      mode: "pdf",
      text: text.slice(0, MAX_PDF_CHARS),
      truncated: text.length > MAX_PDF_CHARS,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`PDF 文本读取失败：${message}`);
  }
}
