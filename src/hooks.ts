import { registerItemMenu } from "./modules/menu";
import { registerPreferences } from "./modules/preferences";
import { bindPreferenceInputs } from "./modules/preferences";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  await registerPreferences();
  for (const win of Zotero.getMainWindows()) {
    await onMainWindowLoad(win);
  }
  addon.data.initialized = true;
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow) {
  registerItemMenu(win);
}

function onMainWindowUnload(_win: Window) {}

function onShutdown() {
  ztoolkit.unregisterAll();
  addon.data.alive = false;
  // @ts-expect-error The plugin instance is added dynamically by the bootstrap.
  delete Zotero[addon.data.config.addonInstance];
}

function onPrefsEvent(type: string, data: { window: Window }) {
  if (type === "load") bindPreferenceInputs(data.window);
}

export default {
  onStartup,
  onMainWindowLoad,
  onMainWindowUnload,
  onShutdown,
  onPrefsEvent,
};
