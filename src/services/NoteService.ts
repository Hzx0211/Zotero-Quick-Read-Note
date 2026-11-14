import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import type { NoteStyle } from "./PreferenceService";

const markdown = new MarkdownIt({ html: false, linkify: false, breaks: false });
const NOTE_MARKER = 'data-quickreadnote="true"';
const FLOW_LINE = "rgba(96, 121, 148, 0.62)";
const FLOW_BORDER = "rgba(96, 121, 148, 0.3)";
const FLOW_BACKGROUND = "rgba(96, 121, 148, 0.08)";
const FLOW_HEADER_BACKGROUND = "rgba(96, 121, 148, 0.14)";
const FLOW_STRIPE_BACKGROUND = "rgba(96, 121, 148, 0.045)";

export type NoteSectionType =
  | "summary"
  | "background"
  | "question"
  | "method"
  | "findings"
  | "limitation"
  | "relevance"
  | "insight"
  | "keywords"
  | "default";

const CARD_RULES: ReadonlyArray<{
  type: NoteSectionType;
  icon: string;
  keywords: readonly string[];
}> = [
  {
    type: "summary",
    icon: "📌",
    keywords: [
      "一句话概述",
      "核心概述",
      "概述",
      "摘要",
      "summary",
      "overview",
      "tldr",
    ],
  },
  {
    type: "question",
    icon: "🔍",
    keywords: ["研究问题", "researchquestion", "rq"],
  },
  {
    type: "background",
    icon: "📚",
    keywords: ["研究背景", "背景", "background", "introduction"],
  },
  {
    type: "method",
    icon: "🧪",
    keywords: [
      "研究方法",
      "研究设计",
      "实验设计",
      "方法",
      "method",
      "methodology",
      "studydesign",
    ],
  },
  {
    type: "findings",
    icon: "📊",
    keywords: [
      "主要发现",
      "研究发现",
      "核心发现",
      "研究结果",
      "发现",
      "结果",
      "findings",
      "results",
    ],
  },
  {
    type: "limitation",
    icon: "⚠️",
    keywords: ["局限", "限制", "不足", "limitation"],
  },
  {
    type: "relevance",
    icon: "🔗",
    keywords: [
      "与我的研究相关",
      "与我的研究方向相关",
      "研究相关性",
      "researchrelevance",
      "relevance",
    ],
  },
  {
    type: "insight",
    icon: "💡",
    keywords: ["启发", "值得关注", "思考", "insight", "implication"],
  },
  { type: "keywords", icon: "🏷️", keywords: ["关键词", "keywords"] },
];

const ICON_PATTERN = /\p{Extended_Pictographic}/u;
const TITLE_SYMBOLS = /[^\p{L}\p{N}]+/gu;

function cardRule(title: string): (typeof CARD_RULES)[number] | undefined {
  const normalized = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(TITLE_SYMBOLS, "");
  return CARD_RULES.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );
}

function renderClassic(source: string): string {
  return markdown.render(source);
}

function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function renderFlowBlock(source: string): string | null {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const steps = lines.map((line) => line.split("|").map((part) => part.trim()));
  if (steps.some((parts) => parts.length > 3 || parts.some((part) => !part))) {
    return null;
  }

  const blocks = steps.map((parts) => {
    if (parts.length === 1) {
      return `<blockquote class="quickread-flow-step" style="background-color: ${FLOW_BACKGROUND}; border-left: 3px solid ${FLOW_LINE}; border-radius: 5px; padding: 0.35em 0.8em; margin: 0.45em 0;"><p><strong>${escapeHTML(parts[0])}</strong></p></blockquote>`;
    }
    const cells = parts
      .map(
        (part) =>
          `<td style="background-color: ${FLOW_BACKGROUND}; border: 1px solid ${FLOW_BORDER}; padding: 0.55em 0.7em; width: ${100 / parts.length}%;"><strong>${escapeHTML(part)}</strong></td>`,
      )
      .join("");
    return `<table class="quickread-flow-branches" style="border-collapse: collapse; width: 100%; margin: 0.45em 0;"><tbody><tr>${cells}</tr></tbody></table>`;
  });

  return `${blocks.join('<p style="text-align: center; margin: 0.2em 0;">↓</p>')}\n`;
}

function renderFlow(source: string): string {
  const env = {};
  const tokens = markdown.parse(source, env);
  let insideTableBody = false;
  let bodyRow = 0;

  for (const token of tokens) {
    if (token.type === "fence" && token.info.trim() === "quickread-flow") {
      const flow = renderFlowBlock(token.content);
      if (flow) {
        // html:false blocks source HTML. Only plugin-generated, escaped HTML is added.
        token.type = "html_block";
        token.content = flow;
      }
    } else if (token.type === "table_open") {
      token.attrSet("class", "quickread-flow-table");
      token.attrSet(
        "style",
        `border-collapse: collapse; width: 100%; margin: 1em 0; border: 1px solid ${FLOW_BORDER};`,
      );
    } else if (token.type === "tbody_open") {
      insideTableBody = true;
      bodyRow = 0;
    } else if (token.type === "tbody_close") {
      insideTableBody = false;
    } else if (token.type === "tr_open" && insideTableBody) {
      if (bodyRow % 2 === 1) {
        token.attrSet("style", `background-color: ${FLOW_STRIPE_BACKGROUND};`);
      }
      bodyRow++;
    } else if (token.type === "th_open") {
      token.attrSet(
        "style",
        `background-color: ${FLOW_HEADER_BACKGROUND}; border: 1px solid ${FLOW_BORDER}; padding: 0.5em 0.65em; text-align: left;`,
      );
    } else if (token.type === "td_open") {
      token.attrSet(
        "style",
        `border: 1px solid ${FLOW_BORDER}; padding: 0.45em 0.65em;`,
      );
    }
  }

  return markdown.renderer.render(tokens, markdown.options, env);
}

function renderCards(source: string): string {
  const env = {};
  const tokens = markdown.parse(source, env);
  const cards: string[] = [];
  let sectionStart = 0;
  let title: Token | null = null;

  function appendCard(end: number): void {
    const content = tokens.slice(sectionStart, end);
    if (!title && !content.length) return;
    if (title) {
      // The H1 becomes the card title. Preserve lower headings within the card.
      for (const token of content) {
        if (token.type === "heading_open" || token.type === "heading_close") {
          const level = Number(token.tag.slice(1));
          if (level >= 2 && level < 6) token.tag = `h${level + 1}`;
        }
      }
    }
    const body = markdown.renderer.render(content, markdown.options, env);
    const rawTitle = title?.content ?? "";
    const rule = cardRule(rawTitle);
    const type = rule?.type ?? "default";
    const heading = title
      ? `<h2>${rule && !ICON_PATTERN.test(rawTitle) ? `${rule.icon} ` : ""}${markdown.renderer.renderInline(title.children ?? [], markdown.options, env)}</h2>`
      : "";
    // Zotero understands blockquote if custom classes or styles are removed.
    // Transparent colors stay readable in light and dark themes.
    cards.push(
      `<blockquote class="quickread-card quickread-card-${type}" style="background-color: rgba(127, 127, 127, 0.07); border-left: 3px solid rgba(105, 125, 145, 0.6); border-radius: 5px; padding: 0.4em 0.9em; margin: 1.2em 0;">${heading}${body}</blockquote>`,
    );
  }

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (
      token.type !== "heading_open" ||
      token.tag !== "h1" ||
      token.level !== 0
    ) {
      continue;
    }
    appendCard(index);
    title = tokens[index + 1];
    sectionStart = index + 3;
    index += 2;
  }
  appendCard(tokens.length);
  return cards.join("");
}

export function markdownToNoteHTML(
  source: string,
  style: NoteStyle = "cards",
): string {
  const normalized = source.trim();
  if (!normalized) throw new Error("模型返回为空。");

  let rendered: string;
  if (style === "classic") {
    rendered = renderClassic(normalized);
  } else {
    try {
      rendered =
        style === "flow" ? renderFlow(normalized) : renderCards(normalized);
      if (!rendered.trim())
        throw new Error("Enhanced renderer produced no output");
    } catch {
      if (typeof Zotero !== "undefined") {
        Zotero.logError(
          new Error(
            "Enhanced rendering failed, falling back to classic rendering.",
          ),
        );
      }
      rendered = renderClassic(normalized);
    }
  }
  if (!rendered.trim()) throw new Error("模型返回为空。");
  return `<div data-schema-version="9" ${NOTE_MARKER}>${rendered}</div>`;
}

export function hasChildQuickReadNote(parent: Zotero.Item): boolean {
  return parent
    .getNotes()
    .some((id) => Zotero.Items.get(id)?.getNote().includes(NOTE_MARKER));
}

export async function createChildNote(
  parent: Zotero.Item,
  markdownSource: string,
  style: NoteStyle = "cards",
): Promise<Zotero.Item> {
  const note = new Zotero.Item("note");
  note.libraryID = parent.libraryID;
  note.parentItemID = parent.id;
  note.setNote(markdownToNoteHTML(markdownSource, style));
  await note.saveTx();
  return note;
}
