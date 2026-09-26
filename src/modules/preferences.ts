import {
  getSettings,
  setSetting,
  type SettingKey,
} from "../services/PreferenceService";

const fields: SettingKey[] = [
  "baseURL",
  "apiKey",
  "model",
  "analysisPrompt",
  "researchContext",
  "noteTemplate",
];

export async function registerPreferences(): Promise<void> {
  await Zotero.PreferencePanes.register({
    pluginID: addon.data.config.addonID,
    src: rootURI + "content/preferences.xhtml",
    label: addon.data.config.addonName,
    image: `chrome://${addon.data.config.addonRef}/content/icons/logo.png`,
  });
}

export function bindPreferenceInputs(win: Window): void {
  const values = getSettings();
  for (const field of fields) {
    const element = win.document.getElementById(`quickread-${field}`) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (!element) continue;
    element.value = values[field];
    element.addEventListener("change", () => setSetting(field, element.value));
  }
}
