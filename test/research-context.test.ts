import { assert } from "chai";
import { inferResearchContext } from "../src/services/LLMService";
import { getSettings } from "../src/services/PreferenceService";
import { extractResearchFiles } from "../src/services/ResearchFileService";

function fixture(name: string): string {
  const pdf = Zotero.Prefs.get(
    "extensions.zotero.quickreadnote.testFixturePath",
    true,
  ) as string;
  return pdf.replace(/sample\.pdf$/, name);
}

describe("Research Context inference", function () {
  for (const [name, expected] of [
    ["sample.pdf", "Quick Read PDF Integration Test"],
    ["research.docx", "人机交互与飞行安全"],
    ["research.txt", "飞行员对自动化系统的信任"],
  ]) {
    it(`extracts ${name} text without retaining the path`, async function () {
      const libraryID = Zotero.Libraries.userLibraryID;
      const before = (await Zotero.Items.getAll(libraryID)).length;
      const result = await extractResearchFiles([fixture(name)]);
      assert.include(result.text, expected);
      assert.notInclude(result.text, fixture(name));
      assert.isFalse(result.truncated);
      assert.equal((await Zotero.Items.getAll(libraryID)).length, before);
    });
  }

  it("combines multiple files and reports truncation", async function () {
    const files = Array(5).fill(fixture("long.txt"));
    const result = await extractResearchFiles(files);
    assert.isTrue(result.truncated);
    assert.isAtMost(result.text.length, 40_000);
    assert.include(result.text, "文件 1（TXT）");
  });

  it("rejects empty selections, unsupported formats, and too many files", async function () {
    for (const paths of [
      [],
      [fixture("research.txt").replace(/\.txt$/, ".csv")],
      Array(6).fill(fixture("research.txt")),
    ]) {
      try {
        await extractResearchFiles(paths);
        assert.fail("应拒绝无效文件选择");
      } catch (error) {
        assert.instanceOf(error, Error);
      }
    }
  });

  it("reports empty, broken, and missing files without exposing their paths", async function () {
    for (const [name, expected] of [
      ["empty.txt", "没有可提取的文字"],
      ["broken.pdf", "PDF 无法读取"],
      ["broken.docx", "DOCX 无法读取"],
      ["missing.txt", "无法访问"],
    ]) {
      try {
        await extractResearchFiles([fixture(name)]);
        assert.fail("应拒绝无效文件");
      } catch (error) {
        assert.include(String(error), expected);
        assert.notInclude(String(error), fixture(name));
      }
    }
  });

  it("infers Chinese context with all supported API protocols", async function () {
    const original = getSettings().researchContext;
    const source = await extractResearchFiles([fixture("research.txt")]);
    for (const [protocol, baseURL] of [
      ["openai", "http://127.0.0.1:31337/v1"],
      ["claude", "http://127.0.0.1:31337/v1"],
      ["gemini", "http://127.0.0.1:31337/v1beta"],
    ] as const) {
      const result = await inferResearchContext(
        {
          ...getSettings(),
          protocol,
          baseURL,
          apiKey: "test-key",
          model: "test-model",
        },
        source.text,
      );
      assert.include(result, "我的研究聚焦人机交互与飞行安全");
      assert.notInclude(result, "Mock note");
      assert.equal(getSettings().researchContext, original);
    }
  });

  it("reports API authorization errors without saving context or exposing the key", async function () {
    const original = getSettings().researchContext;
    try {
      await inferResearchContext(
        {
          ...getSettings(),
          protocol: "openai",
          baseURL: "http://127.0.0.1:31337/v1",
          apiKey: "bad-key",
          model: "test-model",
        },
        "研究材料：人机交互",
      );
      assert.fail("应返回鉴权错误");
    } catch (error) {
      assert.include(String(error), "HTTP 401");
      assert.notInclude(String(error), "bad-key");
      assert.equal(getSettings().researchContext, original);
    }
  });
});
