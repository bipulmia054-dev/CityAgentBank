let database;
let pending = Promise.resolve();
function openDatabase() {
  return database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('document-studio-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = null; reject(request.error); };
  });
}
async function transaction(username, value, remove = false) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', value === undefined && !remove ? 'readonly' : 'readwrite');
    const store = tx.objectStore('drafts');
    const key = username.toLowerCase();
    const request = remove ? store.delete(key) : value === undefined ? store.get(key) : store.put(value, key);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Draft save interrupted'));
  });
}
export const readDraft = username => transaction(username);
export function saveDraft(username, value) {
  const snapshot = structuredClone(value);
  pending = pending.catch(() => {}).then(() => transaction(username, snapshot));
  return pending;
}
export function deleteDraft(username) {
  pending = pending.catch(() => {}).then(() => transaction(username, undefined, true));
  return pending;
}
export const flushDraft = () => pending;

export function readPage(key, fallback) {
  const value = new URLSearchParams(location.hash.slice(1)).get(key);
  return value === null ? fallback : value;
}
export function writePage(key, value) {
  const hash = new URLSearchParams(location.hash.slice(1));
  hash.set(key, String(value));
  history.replaceState(null, '', `${location.pathname}${location.search}#${hash}`);
}
