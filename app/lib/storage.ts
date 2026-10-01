"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_EVENT = "sms-music-storage";
const memory = new Map<string, string>();

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memory.delete(event.key);
    else memory.clear();
    callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function read(key: string) {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    // The app remains usable when storage is blocked or its quota is exhausted.
    return memory.get(key) ?? null;
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useStoredValue<T>(key: string, fallback: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const value = useMemo(() => parse(raw, fallback), [raw, fallback]);
  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = parse(read(key), fallback);
      const updated =
        typeof next === "function"
          ? (next as (previous: T) => T)(previous)
          : next;
      const serialized = JSON.stringify(updated);
      try {
        window.localStorage.setItem(key, serialized);
        memory.delete(key);
      } catch {
        // Fall back to session memory instead of interrupting playback.
        memory.set(key, serialized);
      }
      window.dispatchEvent(new Event(STORAGE_EVENT));
    },
    [key, fallback],
  );
  return [value, setValue] as const;
}
