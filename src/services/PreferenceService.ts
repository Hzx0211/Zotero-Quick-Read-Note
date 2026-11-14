import { getPref, setPref } from "../utils/prefs";

export type ApiProtocol = "openai" | "claude" | "gemini";
export type NoteStyle = "cards" | "classic" | "flow";
export type ProviderId =
  | "custom"
  | "openai"
  | "volcengine"
  | "deepseek"
  | "zhipu"
  | "kimi"
  | "qwen"
  | "claude"
  | "gemini";

type ProviderProfile = { baseURL: string; apiKey: string; model: string };
type PresetId = Exclude<ProviderId, "custom">;

export const PROVIDER_PRESETS: Record<
  PresetId,
  { label: string; baseURL: string; protocol: ApiProtocol }
> = {
  openai: {
    label: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    protocol: "openai",
  },
  volcengine: {
    label: "火山方舟",
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    protocol: "openai",
  },
  deepseek: {
    label: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    protocol: "openai",
  },
  zhipu: {
    label: "智谱",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    protocol: "openai",
  },
  kimi: {
    label: "Kimi",
    baseURL: "https://api.moonshot.cn/v1",
    protocol: "openai",
  },
  qwen: {
    label: "通义千问",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    protocol: "openai",
  },
  claude: {
    label: "Claude",
    baseURL: "https://api.anthropic.com/v1",
    protocol: "claude",
  },
  gemini: {
    label: "Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    protocol: "gemini",
  },
};

export type Settings = ProviderProfile & {
  providerId: ProviderId;
  protocol: ApiProtocol;
  autoGenerate: boolean;
  noteStyle: NoteStyle;
  analysisPrompt: string;
  researchContext: string;
  noteTemplate: string;
};

export type TextSettingKey =
  | keyof ProviderProfile
  | "analysisPrompt"
  | "researchContext"
  | "noteTemplate";

function getProviderId(): ProviderId {
  const id = getPref("providerId");
  return id === "custom" || Object.hasOwn(PROVIDER_PRESETS, id)
    ? (id as ProviderId)
    : "custom";
}

function getProfiles(): Partial<Record<PresetId, ProviderProfile>> {
  try {
    const value: unknown = JSON.parse(getPref("providerProfiles"));
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<PresetId, ProviderProfile>>)
      : {};
  } catch {
    return {};
  }
}

function getProfile(id: ProviderId): ProviderProfile {
  if (id === "custom") {
    // Original preferences are the custom profile, retaining existing values.
    return {
      baseURL: getPref("baseURL"),
      apiKey: getPref("apiKey"),
      model: getPref("model"),
    };
  }
  const saved = getProfiles()[id];
  return {
    baseURL:
      typeof saved?.baseURL === "string"
        ? saved.baseURL
        : PROVIDER_PRESETS[id].baseURL,
    apiKey: typeof saved?.apiKey === "string" ? saved.apiKey : "",
    model: typeof saved?.model === "string" ? saved.model : "",
  };
}

export function getSettings(): Settings {
  const providerId = getProviderId();
  const customProtocol = getPref("customProtocol");
  return {
    providerId,
    protocol:
      providerId === "custom"
        ? (["openai", "claude", "gemini"] as string[]).includes(customProtocol)
          ? (customProtocol as ApiProtocol)
          : "openai"
        : PROVIDER_PRESETS[providerId].protocol,
    ...getProfile(providerId),
    autoGenerate: getPref("autoGenerate"),
    noteStyle:
      getPref("noteStyle") === "classic"
        ? "classic"
        : getPref("noteStyle") === "flow"
          ? "flow"
          : "cards",
    analysisPrompt: getPref("analysisPrompt"),
    researchContext: getPref("researchContext"),
    noteTemplate: getPref("noteTemplate"),
  };
}

export function setProvider(id: ProviderId): void {
  if (id !== "custom" && !Object.hasOwn(PROVIDER_PRESETS, id)) {
    throw new Error("未知的 API 服务商。");
  }
  setPref("providerId", id);
}

export function setCustomProtocol(protocol: ApiProtocol): void {
  if (!["openai", "claude", "gemini"].includes(protocol)) {
    throw new Error("未知的 API 协议。");
  }
  setPref("customProtocol", protocol);
}

export function setSetting(key: TextSettingKey, value: string): void {
  if (key === "baseURL" || key === "apiKey" || key === "model") {
    const providerId = getProviderId();
    if (providerId === "custom") {
      setPref(key, value);
    } else {
      const profiles = getProfiles();
      profiles[providerId] = { ...getProfile(providerId), [key]: value };
      setPref("providerProfiles", JSON.stringify(profiles));
    }
    return;
  }
  setPref(key, value);
}

export function setAutoGenerate(value: boolean): void {
  setPref("autoGenerate", value);
}

export function setNoteStyle(value: NoteStyle): void {
  setPref("noteStyle", value);
}
