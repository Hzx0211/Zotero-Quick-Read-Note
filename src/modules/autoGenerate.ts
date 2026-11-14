import { generateImportedItem } from "./menu";
import { hasChildQuickReadNote } from "../services/NoteService";
import { getSettings } from "../services/PreferenceService";

const SETTLE_DELAY_MS = 3000;
const MAX_ACTIVE_ITEMS = 2;

const newItems = new Set<number>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const queuedItems = new Set<number>();
const processingItems = new Set<number>();
const queue: number[] = [];
let observerID: string | undefined;
let activeCount = 0;
let stopped = false;

function schedule(itemID: number): void {
  if (processingItems.has(itemID)) return;
  const timer = timers.get(itemID);
  if (timer) clearTimeout(timer);
  if (queuedItems.delete(itemID)) {
    const index = queue.indexOf(itemID);
    if (index !== -1) queue.splice(index, 1);
  }
  timers.set(
    itemID,
    setTimeout(() => {
      timers.delete(itemID);
      if (
        stopped ||
        !newItems.has(itemID) ||
        queuedItems.has(itemID) ||
        processingItems.has(itemID)
      )
        return;
      queuedItems.add(itemID);
      queue.push(itemID);
      drainQueue();
    }, SETTLE_DELAY_MS),
  );
}

async function processItem(itemID: number): Promise<void> {
  if (!getSettings().autoGenerate || stopped) return;
  const item = await Zotero.Items.getAsync(itemID);
  if (!item || !item.isRegularItem() || item.deleted) return;
  if (hasChildQuickReadNote(item)) return;
  await generateImportedItem(item);
}

function drainQueue(): void {
  while (!stopped && activeCount < MAX_ACTIVE_ITEMS && queue.length) {
    const itemID = queue.shift()!;
    queuedItems.delete(itemID);
    processingItems.add(itemID);
    activeCount++;
    void processItem(itemID)
      .catch((error) => Zotero.logError(error))
      .finally(() => {
        activeCount--;
        processingItems.delete(itemID);
        newItems.delete(itemID);
        drainQueue();
      });
  }
}

export function registerAutoGeneration(): void {
  if (observerID) return;
  stopped = false;
  observerID = Zotero.Notifier.registerObserver(
    {
      notify(event, type, ids) {
        if (event !== "add" || type !== "item" || !getSettings().autoGenerate)
          return;
        for (const rawID of ids) {
          const itemID = Number(rawID);
          if (!Number.isInteger(itemID)) continue;
          const item = Zotero.Items.get(itemID);
          if (!item || item.deleted) continue;
          if (item.isRegularItem()) {
            newItems.add(itemID);
            schedule(itemID);
          } else if (
            item.isAttachment() &&
            item.attachmentContentType === "application/pdf" &&
            item.parentItemID &&
            newItems.has(item.parentItemID)
          ) {
            schedule(item.parentItemID);
          }
        }
      },
    },
    ["item"],
    "quickreadnote-auto-generate",
  );
}

export function unregisterAutoGeneration(): void {
  stopped = true;
  if (observerID) Zotero.Notifier.unregisterObserver(observerID);
  observerID = undefined;
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  queue.length = 0;
  queuedItems.clear();
  newItems.clear();
}
