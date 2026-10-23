// AES-GCM for the offline copy. The key is non-extractable and lives in IndexedDB, so the stored text is useless without this browser profile.
export type KeyStore = { get(): Promise<CryptoKey | undefined>; put(k: CryptoKey): Promise<void>; clear(): Promise<void> };

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function getKey(ks: KeyStore): Promise<CryptoKey> {
  const have = await ks.get();
  if (have) return have;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await ks.put(key);
  return key;
}

export async function seal(key: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(value))));
  return b64(iv) + "." + b64(ct);
}

// Any failure (wrong key, tampered or old plain text) returns the fallback, so the caller just refetches.
export async function open<T>(key: CryptoKey, text: string | null, fallback: T): Promise<T> {
  try {
    const [iv, ct] = (text ?? "").split(".");
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ct)))) as T;
  } catch { return fallback; }
}

const DB = "plenum-offline";
const withStore = <T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore("k");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const r = run(open.result.transaction("k", mode).objectStore("k"));
      r.onsuccess = () => { open.result.close(); resolve(r.result); };
      r.onerror = () => reject(r.error);
    };
  });

export const idbKeyStore: KeyStore = {
  get: () => withStore<CryptoKey | undefined>("readonly", (s) => s.get("key")),
  put: async (k) => void (await withStore("readwrite", (s) => s.put(k, "key"))),
  clear: async () => void (await withStore("readwrite", (s) => s.clear())),
};

export const browserVault = async () => ({ s: localStorage, key: await getKey(idbKeyStore) });
