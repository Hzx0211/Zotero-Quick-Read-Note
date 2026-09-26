# Zotero Quick Read Note

**使用说明 / User guides:** [简体中文](docs/USAGE.zh-CN.md) · [English](docs/USAGE.en.md)

用于 Zotero 10 的原生插件。在文献条目上右键选择「快速添加粗读笔记」，插件读取元数据和 PDF 的 Zotero 全文索引文本，调用 OpenAI-compatible Chat Completions API，然后把 Markdown 结果转换为 HTML，在原文献下创建 child note。

## 工程结构

```text
addon/                    Zotero bootstrap、manifest、默认偏好和 Preferences 页面
src/modules/menu.ts       右键菜单、状态提示、完整生成流程
src/modules/preferences.ts Preferences 注册与字段保存
src/services/ZoteroItemService.ts 选择校验、元数据、PDF 附件定位
src/services/PDFTextService.ts    Zotero PDF 全文缓存读取与长度限制
src/services/PromptService.ts     Analysis Prompt、研究方向、元数据、正文和模板组合
src/services/LLMService.ts        Chat Completions HTTP 请求与响应校验
src/services/NoteService.ts       Markdown 转 HTML、child note 创建
src/services/PreferenceService.ts 插件本地设置读取和写入
test/                    Zotero 10 集成测试及小型 PDF 样本
```

工程基于 [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template)，使用 TypeScript、`zotero-plugin-toolkit`、`zotero-types` 和 `markdown-it`。源码许可证为 AGPL-3.0-or-later。

## Preferences

在 Zotero 设置侧栏打开 **Zotero Quick Read Note**：

| 字段                   | 作用                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| API Base URL           | Chat Completions 的根地址，例如 `https://api.openai.com/v1`；插件追加 `/chat/completions`。远程地址必须使用 HTTPS，本机 `localhost` 可使用 HTTP。 |
| API Key                | Bearer 鉴权密钥。保存在本机 Zotero preferences 中，不写入源码或笔记。                                                                             |
| Model                  | 发送给 API 的模型名称。                                                                                                                           |
| Analysis Prompt        | 作为 system 指令，约束论文事实来源和写作方式。                                                                                                    |
| Research Context       | 你的研究方向，供模型填写相关性部分；可以留空。                                                                                                    |
| Markdown Note Template | 整个模板原样发送给模型，可自由增删标题和改变层级。                                                                                                |

API Key 是 Zotero 本地 preference 的明文值，不经过 Zotero 文献同步。请使用受信任的 API 地址和本机用户账户。文献元数据、摘要或 PDF 文本会发送到该地址。

## 开发与构建

要求：Zotero 10、Node.js、npm。本机已用 Zotero 10.0.3 验证加载；集成测试中运行的 Zotero 报告版本为 10.0.4。

```bash
npm install --allow-git=all
cp .env.example .env
npm start
```

模板依赖的 `zotero-types` 包含 Git 源依赖；npm 12 需显式使用 `--allow-git=all`。编辑 `.env` 中的 Zotero 可执行文件路径，并给开发用的 profile 和 data directory 使用独立路径。`npm start` 会编译并在开发 Zotero 实例中临时加载插件，修改源码后自动重载。首次启动可能需要等待 Zotero 初始化。

运行检查与生产构建：

```bash
npm run lint:check
npm run build
```

生成的可安装文件位于 `.scaffold/build/zotero-quick-read-note.xpi`。`npm test` 使用单独的 `.scaffold/test` Zotero 配置和本机模拟 LLM 服务；测试输出完成后可按 `Ctrl-C` 结束测试服务器。测试验证菜单、Preferences、摘要模式、真实 PDF 全文提取、Chat Completions 请求，以及从菜单到 child note 的完整模拟链路。

## 安装与验收

1. 在 Zotero 10 中打开 **工具 → 插件**，将 `.xpi` 拖入插件窗口安装。参见 [Zotero 插件安装说明](https://www.zotero.org/support/plugins)。
2. 打开 Zotero 设置，选择 **Zotero Quick Read Note**，填写 API Base URL、API Key、Model，并按需修改 Analysis Prompt、Research Context 和 Markdown Note Template。
3. 回到文献库，选择一篇带 PDF 的文献条目，右键点击「快速添加粗读笔记」。
4. 等待「正在生成粗读笔记……」变为「粗读笔记已生成」。展开文献条目，检查新建的 child note 及其标题、列表、粗体和斜体格式。
5. 可再选一篇无 PDF 但有摘要的文献验证摘要模式。插件会显示「未找到 PDF，正在使用摘要模式……」。

## 当前限制

- 每次仅处理一篇 bibliographic item；如有多个 PDF 附件，使用第一个。
- 使用 Zotero 的 PDF 文本提取和全文缓存，不做 OCR。扫描件可能无法产生文本。
- PDF 文本最多发送前 80,000 个字符，并在 Prompt 中声明截断。上下文较小的模型可能仍需调低 `src/services/PDFTextService.ts` 中的限制。
- 仅支持 OpenAI-compatible Chat Completions 文本响应。不同服务商可能有额外参数或不同的响应格式。
- 模型输出仍需人工核对论文事实。真实服务商请求需要用户填入自己的密钥后验收；自动测试使用本机模拟服务，不会联系外部 LLM。
- XPI 目前用于手动安装；清单中的更新地址是无效占位地址，不提供自动更新。
