# Zotero Quick Read Note 使用说明

[English](USAGE.en.md) · [项目主页](../README.md)

## 安装

1. 下载 [GitHub Releases](https://github.com/Hzx0211/Zotero-Quick-Read-Note/releases/latest) 中的 `zotero-quick-read-note.xpi`。请下载 XPI 文件，不要下载 GitHub 自动生成的源码压缩包。
2. 打开 Zotero 10，进入 **工具 → 插件**，把 XPI 文件拖进插件窗口，按提示安装。
3. 如设置页没有立即出现，重启 Zotero。以后更新时，安装新版 XPI 即可。

## 配置

在 Zotero **设置**侧栏打开 **Zotero Quick Read Note**：

| 字段                   | 如何填写                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API Base URL           | OpenAI-compatible Chat Completions 服务根地址。例如 `https://api.openai.com/v1`。插件会追加 `/chat/completions`。远程地址必须是 HTTPS；本机 `localhost` 或 `127.0.0.1` 可使用 HTTP。 |
| API Key                | 服务商提供的密钥。                                                                                                                                                                   |
| Model                  | 服务商支持的模型名称，按其文档填写。                                                                                                                                                 |
| Analysis Prompt        | 对模型的分析要求，例如事实来源、写作风格和输出语言。                                                                                                                                 |
| Research Context       | 你的研究方向，可留空。                                                                                                                                                               |
| Markdown Note Template | 你希望笔记遵循的完整 Markdown 模板，可增删标题或调整层级。                                                                                                                           |

修改字段后离开该输入框，设置即保存在本机 Zotero 配置中。API Key 以本机 preference 明文保存，不会写入笔记；生成时，文献元数据、摘要及可用的 PDF 文本会发送到你配置的 API 地址。请使用你信任的服务商。

模板是提供给模型的格式要求，插件不会解析 `{{...}}` 之类的占位符。模型可能不完全遵循格式，请检查生成结果。

## 生成粗读笔记

1. 回到 Zotero 文献库，选中**一篇普通文献条目**，不要选 PDF 附件或已有笔记。
2. 右键选择 **快速添加粗读笔记**。
3. 等待状态提示从「正在生成粗读笔记……」变为「粗读笔记已生成」。
4. 展开原文献条目，查看新建的子笔记。标题、列表、粗体和斜体会按 Markdown 转成 Zotero 可显示的格式。

有 PDF 时，插件使用 Zotero 提取或索引出的 PDF 文本。没有 PDF 时，插件显示摘要模式提示，并用元数据和摘要生成笔记；若连摘要也没有，模型只能依据元数据。每次仅支持一篇文献；若有多个 PDF，使用第一个。

## 常见问题与限制

- **提示 API Key 或 Model 未配置：** 检查设置，填写对应字段并离开输入框以保存。
- **API 请求失败：** 检查 Base URL、模型名称、密钥、网络和服务商返回的 HTTP 错误。请求超时为 120 秒。
- **PDF 文本读取失败：** 确认 PDF 文件在本机可用。扫描件或无文本层的 PDF 可能无法被 Zotero 提取；插件不做 OCR。
- **笔记缺少论文后半部分：** 目前最多发送 PDF 前 80,000 个字符，超长时会告知模型已截断。较小上下文的模型仍可能无法处理全部输入。
- **模型返回为空或格式不对：** 检查服务是否提供 OpenAI-compatible Chat Completions 的文本响应，必要时调整 Analysis Prompt 与模板。

模型生成的事实和引用仍需人工核对。插件只适用于 Zotero 10，安装包目前通过手动下载和安装更新。
