<p align="center">
  <img src="logo.png" alt="Zotero Quick Read Note logo" width="170" />
</p>

<h1 align="center">Zotero Quick Read Note</h1>

<p align="center">
  <strong>一篇论文，先有一张地图。</strong><br />
  在 Zotero 里右键文献，把 PDF 或摘要变成一份可继续修改的粗读子笔记。<br />
  <em>One right-click from a Zotero paper to an editable quick-read child note.</em>
</p>

<p align="center">
  <a href="https://github.com/Hzx0211/Zotero-Quick-Read-Note/releases/latest/download/zotero-quick-read-note.xpi">下载插件 XPI</a>
  · <a href="docs/USAGE.zh-CN.md">中文使用说明</a>
  · <a href="docs/USAGE.en.md">English user guide</a>
</p>

## 它做什么？

**选中一篇文献 → 右键「快速添加粗读笔记」→ 在原文献下得到一条子笔记。**

插件读取文献的标题、作者、摘要等信息，并优先使用 Zotero 已提取的 PDF 文本。然后，它把这些内容连同你设置的分析 Prompt、研究方向和 Markdown 模板发给所选 API，最后将模型返回的 Markdown 转成 Zotero 笔记可显示的格式。

| 你在 Zotero 中做什么         | 插件会做什么                                             |
| ---------------------------- | -------------------------------------------------------- |
| 设置 API、分析要求和笔记模板 | 保存设置，生成时按你的要求构造请求                       |
| 右键一篇文献                 | 读取元数据和 PDF 文本；没有 PDF 时使用摘要，并调用模型   |
| 等待生成完成                 | 把模型返回的 Markdown 转为格式化笔记，挂在原文献条目下面 |

设置页还可开启 **导入文献后自动生成粗读笔记**。默认关闭；开启后，新加入的文献条目会自动运行同一生成流程。插件会先等 PDF 附件就位（PaperHunter、Connector 等导入工具常先建条目、后下载 PDF），默认最多等 10 分钟、可在设置页调整；等到超时仍无 PDF 时，有摘要按摘要生成，无摘要则跳过。已有本插件笔记的条目不会重复自动生成。批量导入会排队处理，可能产生多次 API 请求和费用。

## 一分钟上手

1. 下载 [最新 XPI 安装包](https://github.com/Hzx0211/Zotero-Quick-Read-Note/releases/latest/download/zotero-quick-read-note.xpi)。在 **Zotero 10 → 工具 → 插件** 中拖入 XPI 安装。
2. 打开 Zotero 设置侧栏的 **Zotero Quick Read Note**，选择 API 服务商，填入 API Key 和 Model。也可编辑 API 地址，或选“自定义”并指定协议。建议先点 **测试连接**。按需修改 Analysis Prompt、Research Context 和 Markdown Note Template。
3. 回到文献库，右键**一篇普通文献条目**，选择 **快速添加粗读笔记**。等待完成后，展开文献即可看到子笔记。

详细操作、字段说明和排错方法见 [中文使用说明](docs/USAGE.zh-CN.md) / [English user guide](docs/USAGE.en.md)。

## 笔记的样子由你定

Markdown Note Template 是可编辑的。例如，你可以只保留自己关心的章节：

```markdown
# 研究问题

# 研究方法

# 主要发现

# 与我的研究方向相关
```

你也可以增删章节、改标题、调整标题层级。插件会把整个模板交给模型，要求它照此生成。模板目前是**格式指令**，不是 `{{...}}` 占位符替换语法；生成后仍建议检查模型是否遵循格式。

**Note Style** 默认为 **Cards**：插件在本地将每个 Markdown 一级标题及其正文渲染为一张信息卡片，二级及以下标题仍留在卡片内。无需在模板中编写 HTML；标题没有图标时，常见章节会自动补充图标。选择 **Classic** 可继续使用原来的标准 Markdown 富文本样式。选择 **Flow & Tables（流程图）** 会在适合的章节引导模型生成流程和 Markdown 表格，并在本地渲染成蓝灰学术风格的可编辑信息块。三个模式都只使用原有的一次笔记生成请求；Flow & Tables 不保证每章都有图表，也不会改变已有模板。

Analysis Prompt 默认收起，点击“展开并自定义”仍可编辑。Research Context 可手动填写，也可点击“从文件推断研究领域”，选择最多 5 份 PDF、DOCX 或 UTF-8 TXT。插件只在本地提取文字，将截取的文字发送给当前配置的 API；结果先显示为可编辑预览，点击“应用”后才替换原内容。此操作会单独调用一次模型，可能产生费用，不会增加普通笔记生成时的请求次数。

## 使用前知道这些

- **PDF 文本来自 Zotero。** 插件不做 OCR；扫描件或没有文本层的 PDF 可能无法读取。没有 PDF 时会提示摘要模式。
- **长文会截断。** 目前最多向模型发送 PDF 前 80,000 个字符，因此笔记可能不覆盖论文后半部分。
- **内容会发往你配置的 API。** API Key 以明文保存在本机 Zotero preferences 中；文献元数据、摘要和可用 PDF 文本会发给你选择的服务商。
- **粗读不是事实核查。** 请对照原文检查模型生成的事实与引用。
- **当前支持 Zotero 10。** 右键操作一次只处理一篇文献；自动生成可排队处理新增条目。支持 OpenAI 兼容、Claude Messages 与 Gemini GenerateContent 的文本响应；更新插件需手动安装新版 XPI。

<details>
<summary>开发者：项目结构、运行与构建</summary>

项目基于 [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template)，使用 TypeScript、`zotero-plugin-toolkit`、`zotero-types` 和 `markdown-it`。

```text
addon/                           Zotero manifest、bootstrap、偏好设置页面
src/modules/menu.ts              右键菜单、状态提示与生成流程
src/modules/preferences.ts       设置页注册与输入绑定
src/services/ZoteroItemService.ts 文献校验、元数据和 PDF 附件定位
src/services/PDFTextService.ts   Zotero PDF 文本读取与长度限制
src/services/PromptService.ts    Prompt 组合
src/services/LLMService.ts       Chat Completions 请求与响应校验
src/services/NoteService.ts      Markdown 转 Classic/Cards/Flow HTML、创建子笔记
src/services/PreferenceService.ts 本地设置读写
test/                           Zotero 10 集成测试与 PDF 样本
```

要求：Zotero 10、Node.js、npm。开发环境可按下列命令启动：

```bash
npm install --allow-git=all
cp .env.example .env
npm start
```

将 `.env` 中的 Zotero 可执行文件路径改为本机路径，并使用独立的开发 profile 和 data directory。`npm start` 会编译并在开发用 Zotero 中临时加载插件。npm 12 安装 Git 源依赖时需使用 `--allow-git=all`。

```bash
npm run lint:check
npm run build
```

构建产物：`.scaffold/build/zotero-quick-read-note.xpi`。`npm test` 使用独立的 Zotero 测试配置和本机模拟 LLM 服务。源码采用 [AGPL-3.0-or-later](LICENSE) 许可证。

</details>
