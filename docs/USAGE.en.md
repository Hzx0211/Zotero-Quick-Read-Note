# Zotero Quick Read Note User Guide

[简体中文](USAGE.zh-CN.md) · [Project home](../README.md)

## Install

1. Download `zotero-quick-read-note.xpi` from [GitHub Releases](https://github.com/Hzx0211/Zotero-Quick-Read-Note/releases/latest). Choose the XPI, not GitHub's automatically generated source archive.
2. In Zotero 10, open **Tools → Add-ons** and drag the XPI into the Add-ons window. Follow the installation prompt.
3. Restart Zotero if the preference pane does not appear immediately. To update later, install the newer XPI.

## Configure

Open **Zotero Quick Read Note** in the Zotero **Settings** sidebar:

| Field                  | What to enter                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API Provider           | Choose OpenAI, Volcengine Ark, DeepSeek, Zhipu, Kimi, Qwen, Claude, Gemini, or Custom. Each provider keeps its own URL, key, and model.                                                                                              |
| API Protocol           | For Custom only: OpenAI-compatible, Claude Messages, or Gemini GenerateContent.                                                                                                                                                      |
| API URL                | Presets provide an editable address. OpenAI-compatible services accept either a base URL or the full `/chat/completions` URL without duplicating the path. Remote URLs require HTTPS; local `localhost` or `127.0.0.1` may use HTTP. |
| API Key                | The key issued by the selected provider.                                                                                                                                                                                             |
| Model                  | A model name or endpoint ID supported by the selected provider.                                                                                                                                                                      |
| Analysis Prompt        | Your instructions for the model. It starts collapsed; select the expand button to edit it.                                                                                                                                           |
| Research Context       | Your research interests. Enter them manually or infer them from local files; a preview must be applied before replacing the saved value.                                                                                             |
| Markdown Note Template | The complete Markdown structure for the note. You can add, remove, or reorganize headings.                                                                                                                                           |
| Note Style             | Cards (default) displays each Markdown level-one section as a card. Classic keeps standard Markdown rich text. Flow & Tables renders suitable content as editable flows and tables.                                                  |

After editing a field, move focus away from it to save the value in local Zotero preferences. Existing URL, key, and model values remain under Custom after upgrading. API keys are stored as plain-text local preferences and are not added to notes. During generation, metadata, the abstract, and available PDF text are sent to the API URL you configured. Use a provider you trust.

**Test Connection** sends one short real request to check the URL, key, and model. It creates no note but may incur a small charge.

**Infer from files** accepts up to five local PDF, DOCX, or UTF-8 TXT files. The plugin extracts text locally and sends only that text to the selected API provider; it does not upload the original files or add them to the Zotero library. Each file is limited to 20 MB; PDF extraction covers the first 20 pages; text is limited to 10,000 characters per file and 40,000 in total. Truncation is reported. Scanned PDFs need OCR, and encrypted or textless files cannot be used. Inference makes one separate model request and may incur a charge. Its Chinese result appears in an editable preview and replaces the saved Research Context only when you select Apply. Later note generation uses the saved value.

**Auto-generate after import** is off by default. When enabled, each newly added bibliographic item calls your configured API and may incur a charge.

The template is a formatting instruction for the model. The plugin does not substitute placeholders such as `{{...}}`. Review the output because the model may not follow the template perfectly.

## Generate a quick-read note

1. In the Zotero library, select **one regular bibliographic item**, not a PDF attachment or an existing note.
2. Right-click and choose **快速添加粗读笔记** (Quick Add Reading Note).
3. Wait for the progress message to change from **正在生成粗读笔记……** (Generating) to **粗读笔记已生成** (Note generated).
4. Expand the item to find its new child note. Cards displays level-one sections as information blocks; Classic keeps standard Markdown rich text; Flow & Tables uses muted blue-gray steps, arrows, and tables where the source supports them. Lists, tables, code blocks, bold, and italic formatting remain available.

Card, flow, and table rendering run locally without an additional AI request. The template remains Markdown only; you do not need to write HTML. Flow & Tables guides the model to select diagrams where useful rather than forcing one in every section. A `quickread-flow` Markdown fence uses one step per line and `|` for parallel branches; this first version supports linear flows and one level of parallel branches. If enhanced rendering fails, the plugin saves the note with Classic formatting. Zotero may remove some background or corner styling when editing, but the steps, arrows, and native tables remain editable.

With a PDF, the plugin uses text extracted or indexed by Zotero. Without a PDF, it shows an abstract-mode message and generates from metadata and the abstract. If there is no abstract either, the model has only metadata. Each manual right-click processes one item; if an item has multiple PDFs, the first is used.

When auto-generation is enabled, newly added bibliographic items (including imports, Connector additions, and newly synced items) are processed after a short wait for PDF attachments. If no PDF is available then, the plugin uses abstract mode. Existing items are not backfilled. The plugin will not automatically create a second note if it already created one for that item. Batch imports are processed with limited concurrency. Turning the option off stops future additions from being processed. Manual generation remains available.

## Troubleshooting and limits

- **API Key or Model is missing:** Fill in the setting and move focus away from the field to save it.
- **API request failed:** Use Test Connection to see the HTTP status and provider message. For 404, check the URL; for 401/403, check the key and model access. The request timeout is 120 seconds.
- **PDF text could not be read:** Make sure the PDF is available locally. Scanned PDFs or files without a text layer may not yield text; the plugin does not perform OCR.
- **Later parts of the paper are missing:** At most the first 80,000 PDF characters are sent. The model is informed when text was truncated. Smaller-context models may still be unable to process all input.
- **Empty or malformed model response:** Check that the selected protocol matches the provider and the model supports text output. Adjust the Analysis Prompt or template if needed.

Verify generated claims and citations against the paper. The plugin targets Zotero 10 and currently uses manual XPI updates.
