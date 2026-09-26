pref("baseURL", "https://api.openai.com/v1");
pref("apiKey", "");
pref("model", "");
pref(
  "analysisPrompt",
  "你是一名科研论文阅读助手。\n请根据提供的论文 Metadata 和论文正文生成一份科研粗读笔记。\n1. 所有论文事实必须来自提供的文献内容。\n2. 不允许根据常识补充论文中不存在的信息。\n3. 如果论文没有明确说明某项内容，请说明论文未明确说明。\n4. 优先提取研究问题、研究方法、实验设计、样本、变量、结果与主要贡献。\n5. 输出应适合作为博士研究阶段的文献粗读笔记。\n6. 输出严格遵循提供的 Note Template，不增加额外一级章节。",
);
pref("researchContext", "");
pref(
  "noteTemplate",
  "# 一句话概述\n\n# 题目中文翻译\n\n# 关键词\n\n# 研究背景\n\n# 研究问题\n\n# 研究方法\n\n# 研究内容\n\n# 主要发现\n\n# 研究贡献\n\n# 局限性\n\n# 与我的研究方向相关\n\n# 值得进一步阅读的内容",
);
