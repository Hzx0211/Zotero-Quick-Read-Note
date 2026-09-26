export type PaperMetadata = {
  title: string;
  creators: string[];
  publicationTitle: string;
  date: string;
  year: string;
  DOI: string;
  abstractNote: string;
  tags: string[];
  itemType: string;
};

function field(item: Zotero.Item, name: string): string {
  try {
    return item.getField(name) || "";
  } catch {
    return "";
  }
}

export function validateSelection(items: Zotero.Item[]): Zotero.Item {
  if (items.length !== 1) {
    throw new Error(items.length ? "请只选择一篇文献。" : "请先选择一篇文献。");
  }
  const item = items[0];
  if (!item.isRegularItem()) {
    throw new Error("请选择文献条目，不能选择附件或笔记。");
  }
  return item;
}

export function getMetadata(item: Zotero.Item): PaperMetadata {
  const date = field(item, "date");
  return {
    title: field(item, "title"),
    creators: item
      .getCreatorsJSON()
      .map(
        (creator) =>
          creator.name ||
          [creator.firstName, creator.lastName].filter(Boolean).join(" "),
      ),
    publicationTitle: field(item, "publicationTitle"),
    date,
    year: date.match(/\b\d{4}\b/)?.[0] || "",
    DOI: field(item, "DOI"),
    abstractNote: field(item, "abstractNote"),
    tags: item.getTags().map((tag) => tag.tag),
    itemType: item.itemType,
  };
}

export function getPDFAttachment(item: Zotero.Item): Zotero.Item | undefined {
  return Zotero.Items.get(item.getAttachments()).find(
    (attachment) => attachment.attachmentContentType === "application/pdf",
  );
}
