# Zotero Quick Read Note User Guide

[简体中文](USAGE.zh-CN.md) · [Project home](../README.md)

## Install

1. Download `zotero-quick-read-note.xpi` from [GitHub Releases](https://github.com/Hzx0211/Zotero-Quick-Read-Note/releases/latest). Choose the XPI, not GitHub's automatically generated source archive.
2. In Zotero 10, open **Tools → Add-ons** and drag the XPI into the Add-ons window. Follow the installation prompt.
3. Restart Zotero if the preference pane does not appear immediately. To update later, install the newer XPI.

## Configure

Open **Zotero Quick Read Note** in the Zotero **Settings** sidebar:

| Field                  | What to enter                                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API Base URL           | The root URL of an OpenAI-compatible Chat Completions service, such as `https://api.openai.com/v1`. The plugin appends `/chat/completions`. Remote URLs must use HTTPS; local `localhost` or `127.0.0.1` may use HTTP. |
| API Key                | The key issued by your API provider.                                                                                                                                                                                   |
| Model                  | A model name supported by your provider.                                                                                                                                                                               |
| Analysis Prompt        | Your instructions for the model, including evidence requirements, style, and output language.                                                                                                                          |
| Research Context       | Your research interests; optional.                                                                                                                                                                                     |
| Markdown Note Template | The complete Markdown structure for the note. You can add, remove, or reorganize headings.                                                                                                                             |

After editing a field, move focus away from it to save the value in local Zotero preferences. The API Key is stored as a plain-text local preference and is not added to notes. During generation, metadata, the abstract, and available PDF text are sent to the API URL you configured. Use a provider you trust.

The template is a formatting instruction for the model. The plugin does not substitute placeholders such as `{{...}}`. Review the output because the model may not follow the template perfectly.

## Generate a quick-read note

1. In the Zotero library, select **one regular bibliographic item**, not a PDF attachment or an existing note.
2. Right-click and choose **快速添加粗读笔记** (Quick Add Reading Note).
3. Wait for the progress message to change from **正在生成粗读笔记……** (Generating) to **粗读笔记已生成** (Note generated).
4. Expand the item to find its new child note. Markdown headings, lists, bold, and italic text are rendered as Zotero note formatting.

With a PDF, the plugin uses text extracted or indexed by Zotero. Without a PDF, it shows an abstract-mode message and generates from metadata and the abstract. If there is no abstract either, the model has only metadata. Only one item can be processed at a time; if an item has multiple PDFs, the first is used.

## Troubleshooting and limits

- **API Key or Model is missing:** Fill in the setting and move focus away from the field to save it.
- **API request failed:** Check the Base URL, model name, key, connection, and any HTTP error returned by the provider. The request timeout is 120 seconds.
- **PDF text could not be read:** Make sure the PDF is available locally. Scanned PDFs or files without a text layer may not yield text; the plugin does not perform OCR.
- **Later parts of the paper are missing:** At most the first 80,000 PDF characters are sent. The model is informed when text was truncated. Smaller-context models may still be unable to process all input.
- **Empty or malformed model response:** Confirm that the provider returns a text response in OpenAI-compatible Chat Completions format. Adjust the Analysis Prompt or template if needed.

Verify generated claims and citations against the paper. The plugin targets Zotero 10 and currently uses manual XPI updates.
