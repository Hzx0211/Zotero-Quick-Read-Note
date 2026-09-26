import { getPref, setPref } from "../utils/prefs";

export type Settings = {
  baseURL: string;
  apiKey: string;
  model: string;
  analysisPrompt: string;
  researchContext: string;
  noteTemplate: string;
};

export type SettingKey = keyof Settings;

export function getSettings(): Settings {
  return {
    baseURL: getPref("baseURL"),
    apiKey: getPref("apiKey"),
    model: getPref("model"),
    analysisPrompt: getPref("analysisPrompt"),
    researchContext: getPref("researchContext"),
    noteTemplate: getPref("noteTemplate"),
  };
}

export function setSetting(key: SettingKey, value: string): void {
  setPref(key, value);
}
