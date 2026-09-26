import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({ html: false, linkify: false, breaks: false });

export function markdownToNoteHTML(source: string): string {
  const rendered = markdown.render(source.trim());
  if (!rendered.trim()) throw new Error("模型返回为空。");
  return `<div data-schema-version="9">${rendered}</div>`;
}

export async function createChildNote(
  parent: Zotero.Item,
  markdownSource: string,
): Promise<Zotero.Item> {
  const note = new Zotero.Item("note");
  note.libraryID = parent.libraryID;
  note.parentItemID = parent.id;
  note.setNote(markdownToNoteHTML(markdownSource));
  await note.saveTx();
  return note;
}
