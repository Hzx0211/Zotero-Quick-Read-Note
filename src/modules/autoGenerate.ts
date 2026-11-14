import { generateImportedItem } from "./menu";
import { hasChildQuickReadNote } from "../services/NoteService";
import { pdfFileAvailable } from "../services/PDFTextService";
import { getMetadata } from "../services/ZoteroItemService";
import { getSettings } from "../services/PreferenceService";

const SETTLE_DELAY_MS = 3000;
const PDF_POLL_INTERVAL_MS = 5000;
const MAX_ACTIVE_ITEMS = 2;

// itemID -> epoch ms after which we stop waiting for a PDF attachment
const deadlines = new Map<number, number>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const queuedItems = new Set<number>();
const processingItems = new Set<number>();
const queue: number[] = [];
let observerID: string | undefined;
let activeCount = 0;
let stopped = false;

function unwatch(itemID: number): void {
  deadlines.delete(itemID);
  const timer = timers.get(itemID);
  if (timer) {
    clearTimeout(timer);
    timers.delete(itemID);
  }
}

function schedule(itemID: number, delayMs: number): void {
  const previous = timers.get(itemID);
  if (previous) clearTimeout(previous);
  timers.set(
    itemID,
    setTimeout(() => {
      timers.delete(itemID);
      void checkItem(itemID);
    }, delayMs),
  );
}

function enqueue(itemID: number): void {
  unwatch(itemID);
  if (queuedItems.has(itemID) || processingItems.has(itemID)) return;
  queuedItems.add(itemID);
  queue.push(itemID);
  drainQueue();
}

async function checkItem(itemID: number): Promise<void> {
  if (stopped) return;
  const deadline = deadlines.get(itemID);
  if (
    deadline === undefined ||
    queuedItems.has(itemID) ||
    processingItems.has(itemID)
  )
    return;
  const item = await Zotero.Items.getAsync(itemID);
  if (
    !item ||
    !item.isRegularItem() ||
    item.deleted ||
    hasChildQuickReadNote(item)
  ) {
    unwatch(itemID);
    return;
  }
  if (await pdfFileAvailable(item)) {
    // The PDF is fully stored: generate now.
    enqueue(itemID);
    return;
  }
  if (Date.now() >= deadline) {
    // The PDF never arrived. Only fall back to abstract mode when there is
    // an abstract to work with; metadata-only notes are not worth the API
    // call, so the user can generate one manually later.
    if (getMetadata(item).abstractNote.trim()) {
      enqueue(itemID);
    } else {
      unwatch(itemID);
    }
    return;
  }
  schedule(itemID, PDF_POLL_INTERVAL_MS);
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
        const pdfWaitMinutes = getSettings().autoGeneratePdfWaitMinutes;
        for (const rawID of ids) {
          const itemID = Number(rawID);
          if (!Number.isInteger(itemID)) continue;
          const item = Zotero.Items.get(itemID);
          if (!item || item.deleted) continue;
          if (item.isRegularItem()) {
            deadlines.set(itemID, Date.now() + pdfWaitMinutes * 60 * 1000);
            schedule(itemID, SETTLE_DELAY_MS);
          } else if (
            item.isAttachment() &&
            item.attachmentContentType === "application/pdf" &&
            item.parentItemID &&
            deadlines.has(item.parentItemID)
          ) {
            // A PDF attachment showed up (or its file body finished
            // uploading): re-check shortly.
            schedule(item.parentItemID, SETTLE_DELAY_MS);
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
  deadlines.clear();
  queue.length = 0;
  queuedItems.clear();
  processingItems.clear();
}
