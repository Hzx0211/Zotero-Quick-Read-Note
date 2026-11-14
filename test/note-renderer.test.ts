import { assert } from "chai";
import { markdownToNoteHTML } from "../src/services/NoteService";

describe("Note renderer", function () {
  it("renders a method card and adds an icon only when needed", function () {
    const plain = markdownToNoteHTML("# 研究方法\n\n中文内容");
    assert.include(plain, "quickread-card-method");
    assert.include(plain, "<h2>🧪 研究方法</h2>");
    assert.include(plain, "<p>中文内容</p>");

    const withIcon = markdownToNoteHTML("# 🧪 研究方法\n\n内容");
    assert.include(withIcon, "<h2>🧪 研究方法</h2>");
    assert.notInclude(withIcon, "🧪 🧪");
  });

  it("recognizes every card type and keeps unknown headings", function () {
    for (const [heading, type] of [
      ["Overview", "summary"],
      ["Research Questions and Goals", "question"],
      ["研究背景", "background"],
      ["Methodology", "method"],
      ["Key Findings", "findings"],
      ["研究局限", "limitation"],
      ["与我的研究方向相关", "relevance"],
      ["Implications", "insight"],
      ["关键词", "keywords"],
      ["一个新的章节", "default"],
    ]) {
      const html = markdownToNoteHTML(`# ${heading}\n\n内容`);
      assert.include(html, `quickread-card-${type}`, heading);
      assert.include(html, heading);
    }
  });

  it("splits only at top-level H1 and preserves nested headings, lists, and tables", function () {
    const html = markdownToNoteHTML(
      "# 一句话概述\n\nA\n\n# 研究方法\n\n## Study 1\n\n### Participants\n\n- 甲\n- 乙\n\n1. Step A\n2. Step B\n\n| 维度 | 内容 |\n|---|---|\n| 样本 | 14 人 |\n\n# 主要发现\n\nC",
    );
    assert.equal((html.match(/class="quickread-card /g) ?? []).length, 3);
    assert.include(html, "<h3>Study 1</h3>");
    assert.include(html, "<h4>Participants</h4>");
    assert.include(html, "<li>甲</li>");
    assert.include(html, "<li>Step A</li>");
    assert.include(html, "<table>");
    assert.include(html, "<td>14 人</td>");
  });

  it("keeps code fences and quoted headings inside their card", function () {
    const html = markdownToNoteHTML(
      "# 研究方法\n\n```python\n# This is code\nprint('hi')\n```\n\n> # Quoted heading\n> 文本",
    );
    assert.equal((html.match(/class="quickread-card /g) ?? []).length, 1);
    assert.include(html, "# This is code");
    assert.include(html, "<blockquote>");
    assert.include(html, "Quoted heading");
  });

  it("keeps text before H1 and handles documents without H1", function () {
    const prelude = markdownToNoteHTML("前言\n\n# 研究方法\n\n内容");
    assert.equal((prelude.match(/class="quickread-card /g) ?? []).length, 2);
    assert.include(prelude, "<p>前言</p>");
    assert.include(prelude, "quickread-card-default");
    assert.include(prelude, "quickread-card-method");

    const noHeading = markdownToNoteHTML("普通正文");
    assert.include(noHeading, "quickread-card-default");
    assert.include(noHeading, "<p>普通正文</p>");
  });

  it("escapes raw HTML and preserves Classic output", function () {
    const source = "# 研究方法\n\n<script>alert(1)</script>";
    const cards = markdownToNoteHTML(source);
    assert.notInclude(cards, "<script>");
    assert.include(cards, "&lt;script&gt;");

    const classic = markdownToNoteHTML(source, "classic");
    assert.equal(
      classic,
      '<div data-schema-version="9" data-quickreadnote="true"><h1>研究方法</h1>\n<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>\n</div>',
    );
    assert.notInclude(classic, "quickread-card");
  });

  it("renders a long note locally without pathological slowdown", function () {
    const section =
      "# 研究方法\n\n## Study 1\n\n" +
      "中文段落说明研究方法和结果。\n\n- 项目 A\n- 项目 B\n\n".repeat(45);
    const source = section.repeat(16);
    const start = performance.now();
    const html = markdownToNoteHTML(source);
    const elapsed = performance.now() - start;
    assert.equal((html.match(/class="quickread-card /g) ?? []).length, 16);
    assert.isAbove(html.length, source.length);
    assert.isBelow(elapsed, 3000, `Cards render took ${elapsed.toFixed(1)} ms`);
  });
});
