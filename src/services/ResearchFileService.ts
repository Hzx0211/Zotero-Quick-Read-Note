const MAX_FILES = 5;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_DOCX_XML_BYTES = 8 * 1024 * 1024;
const MAX_PDF_PAGES = 20;
const MAX_FILE_CHARS = 10_000;
const MAX_TOTAL_CHARS = 40_000;
const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

type PDFWorker = {
  _enqueue<T>(work: () => Promise<T>, priority: boolean): Promise<T>;
  _query(
    action: string,
    data: { buf: ArrayBuffer; maxPages: number },
    transfer: ArrayBuffer[],
  ): Promise<{ text: string; extractedPages: number; totalPages: number }>;
};

export type ResearchFilesText = {
  text: string;
  truncated: boolean;
};

async function readPDF(
  path: string,
): Promise<{ text: string; truncated: boolean }> {
  // Zotero's PDF worker uses its bundled PDF.js and accepts in-memory bytes.
  // Its queue initializes the worker without creating a library attachment.
  const worker = (Zotero as unknown as { PDFWorker: PDFWorker }).PDFWorker;
  if (!worker?._enqueue || !worker?._query) {
    throw new Error("当前 Zotero 版本不支持本地 PDF 文字提取。");
  }
  const bytes = await IOUtils.read(path);
  const buffer = new Uint8Array(bytes).buffer;
  try {
    const result = await worker._enqueue(
      () =>
        worker._query(
          "pdf.getFulltext",
          { buf: buffer, maxPages: MAX_PDF_PAGES },
          [buffer],
        ),
      true,
    );
    return {
      text: result.text,
      truncated: result.totalPages > result.extractedPages,
    };
  } catch {
    throw new Error("PDF 无法读取；请检查文件是否损坏、加密或需要 OCR。");
  }
}

function readDOCX(path: string): string {
  const reader = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(
    Ci.nsIZipReader,
  );
  let opened = false;
  try {
    reader.open(Zotero.File.pathToFile(path));
    opened = true;
    if (!reader.hasEntry("word/document.xml")) {
      throw new Error("DOCX 文件缺少文档正文。");
    }
    const entry = reader.getEntry("word/document.xml");
    if (entry.realSize > MAX_DOCX_XML_BYTES) {
      throw new Error("DOCX 正文过大，请选择较短的文件。");
    }
    const stream = reader.getInputStream("word/document.xml");
    const input = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(
      Ci.nsIScriptableInputStream,
    );
    let bytes: string;
    try {
      input.init(stream);
      bytes = input.readBytes(entry.realSize);
    } finally {
      input.close();
      stream.close();
    }
    const xml = new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(bytes, (character) => character.charCodeAt(0)),
    );
    if (/<!DOCTYPE/i.test(xml)) throw new Error("DOCX 包含不支持的 XML 声明。");
    const document = new DOMParser().parseFromString(xml, "application/xml");
    if (document.querySelector("parsererror")) {
      throw new Error("DOCX 正文 XML 无法解析。");
    }
    return Array.from(document.getElementsByTagNameNS(WORD_NS, "p"))
      .map((paragraph) =>
        Array.from(paragraph.getElementsByTagNameNS(WORD_NS, "t"))
          .map((node) => node.textContent ?? "")
          .join(""),
      )
      .join("\n");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("DOCX")) throw error;
    throw new Error("DOCX 无法读取；请检查文件是否损坏或加密。");
  } finally {
    if (opened) reader.close();
  }
}

export async function extractResearchFiles(
  paths: readonly string[],
): Promise<ResearchFilesText> {
  if (!paths.length || paths.length > MAX_FILES) {
    throw new Error(`请选择 1～${MAX_FILES} 份文件。`);
  }
  const sections: string[] = [];
  let totalLength = 0;
  let truncated = false;
  for (const [index, path] of paths.entries()) {
    if (totalLength >= MAX_TOTAL_CHARS) {
      truncated = true;
      break;
    }
    const extension = path.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
    if (!extension || !["pdf", "docx", "txt"].includes(extension)) {
      throw new Error("仅支持 PDF、DOCX 和 UTF-8 TXT 文件。");
    }
    let file: nsIFile;
    try {
      file = Zotero.File.pathToFile(path);
    } catch {
      throw new Error(`第 ${index + 1} 份文件无法访问。`);
    }
    if (!file.exists() || !file.isFile()) {
      throw new Error(`第 ${index + 1} 份文件无法访问。`);
    }
    if (file.fileSize > MAX_FILE_BYTES) {
      throw new Error(`第 ${index + 1} 份文件超过 20 MB。`);
    }
    let result: { text: string; truncated: boolean };
    if (extension === "pdf") {
      result = await readPDF(path);
    } else if (extension === "docx") {
      result = { text: readDOCX(path), truncated: false };
    } else {
      let text: string;
      try {
        text = await IOUtils.readUTF8(path);
      } catch {
        throw new Error("TXT 文件无法按 UTF-8 读取。");
      }
      result = { text, truncated: false };
    }
    const clean = result.text.trim();
    if (!clean) {
      throw new Error(
        `第 ${index + 1} 份文件没有可提取的文字；扫描版 PDF 需要 OCR。`,
      );
    }
    const header = `文件 ${index + 1}（${extension.toUpperCase()}）:\n`;
    const separator = sections.length ? "\n\n" : "";
    const available = Math.min(
      MAX_FILE_CHARS,
      Math.max(
        0,
        MAX_TOTAL_CHARS - totalLength - header.length - separator.length,
      ),
    );
    const excerpt = clean.slice(0, available);
    if (clean.length > excerpt.length || result.truncated) truncated = true;
    if (!excerpt) break;
    sections.push(`${header}${excerpt}`);
    totalLength += separator.length + header.length + excerpt.length;
  }
  return { text: sections.join("\n\n"), truncated };
}
